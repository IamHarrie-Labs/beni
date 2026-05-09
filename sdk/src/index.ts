import { applyParamsToScript, Constr, Data, type Lucid, type UTxO } from "lucid-cardano";
import type { BeniWallet, CreateWalletConfig, GuardrailConfig, SpendResult } from "./types.js";
import { encodeDatum, WalletDatumSchema, type WalletDatumType, datumToConfig } from "./datum.js";
import { assertValidSpend, computeNewWindowState } from "./validation.js";
import { NoScriptUTxOError, InvalidAddressError } from "./errors.js";
import { makeScript } from "./index-internal.js";
import { AGENT_WALLET_CBOR, THREAD_TOKEN_BASE_CBOR } from "./validators.js";

// ── Redeemer constants ────────────────────────────────────────────────────────
// Constructor indices must match WalletRedeemer in agent_wallet.ak:
//   Spend = 0  |  OwnerAction = 1  |  FreezeWallet = 2
const SpendRedeemer        = Data.to(new Constr(0, []));
const OwnerActionRedeemer  = Data.to(new Constr(1, []));
const FreezeWalletRedeemer = Data.to(new Constr(2, []));

// ── Shared validator ──────────────────────────────────────────────────────────
// The agent_wallet script is non-parameterized — one address for all Beni
// wallets. Individual wallets are differentiated by their thread token policy
// ID embedded in the datum.
const agentWalletScript = makeScript(AGENT_WALLET_CBOR);

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Build and apply the thread_token minting policy for a specific seed UTxO.
 * Returns the parameterized script and its policy ID.
 *
 * The one-shot minting policy is parameterized by an OutputReference:
 *   Constr(0, [transaction_id: ByteArray, output_index: Integer])
 * This matches the Aiken definition in cardano/transaction/OutputReference.
 */
function buildThreadTokenPolicy(
  lucid: Lucid,
  seedUtxo: UTxO,
): { script: ReturnType<typeof makeScript>; policyId: string; cbor: string } {
  const seedParam = new Constr(0, [
    seedUtxo.txHash,                 // transaction_id (hex ByteArray)
    BigInt(seedUtxo.outputIndex),    // output_index (Integer)
  ]);
  const cbor = applyParamsToScript(THREAD_TOKEN_BASE_CBOR, [seedParam]);
  const script = makeScript(cbor);
  const policyId = lucid.utils.mintingPolicyToId(script);
  return { script, policyId, cbor };
}

/**
 * Find the authoritative script UTxO — the one carrying the thread token.
 * The thread token proves this is the genuine Beni state UTxO (not an
 * attacker-planted UTxO with a fake datum).
 */
async function fetchScriptUTxO(lucid: Lucid, wallet: BeniWallet): Promise<UTxO> {
  const utxos = await lucid.utxosAt(wallet.scriptAddress);
  if (utxos.length === 0) throw new NoScriptUTxOError(wallet.scriptAddress);

  // Prefer the UTxO that carries exactly 1 thread token (the genuine state)
  const threadTokenUnit = wallet.config.threadTokenPolicyId; // empty token name → unit = policyId
  const authoritative = utxos.find(u => (u.assets[threadTokenUnit] ?? 0n) === 1n);
  return authoritative ?? utxos[0];
}

/**
 * Read and decode the current on-chain config from a script UTxO.
 */
function readConfig(utxo: UTxO): GuardrailConfig {
  const raw = utxo.datum;
  if (!raw) throw new Error("Script UTxO is missing an inline datum");
  const datum = Data.from<WalletDatumType>(raw, WalletDatumSchema as unknown as WalletDatumType);
  return datumToConfig(datum);
}

/**
 * Extract the payment credential hash from a bech32 address.
 */
function credentialHash(lucid: Lucid, address: string): string {
  const details = lucid.utils.getAddressDetails(address);
  if (!details.paymentCredential) throw new InvalidAddressError(address);
  return details.paymentCredential.hash;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Deploy a new Beni agent wallet on-chain.
 *
 * In one atomic transaction this function:
 *  1. Picks a seed UTxO from the owner's wallet to parameterize the minting policy
 *  2. Mints exactly 1 thread token NFT (one-shot, can never be minted again)
 *  3. Locks the initial ADA + thread token at the script address with the config datum
 *
 * The thread token is the on-chain proof-of-authenticity for the wallet's state
 * UTxO. The agent_wallet validator checks for it on every spend, preventing
 * an attacker from planting a fake UTxO with a forged datum.
 *
 * @param lucid      - Lucid instance with the owner's wallet selected
 * @param config     - Guardrail rules (caps, whitelist, owner key)
 * @param initialAda - ADA to lock in the wallet at creation (default 5)
 * @returns          - BeniWallet with script address, CBORs, and full config
 */
export async function createAgentWallet(
  lucid: Lucid,
  config: CreateWalletConfig,
  initialAda = 5n,
): Promise<BeniWallet> {
  // 1. Pick a UTxO from the owner's wallet as the one-shot seed.
  //    This UTxO's reference is baked into the thread token minting policy,
  //    making the resulting policy ID unique to this wallet.
  const ownerUtxos = await lucid.wallet.getUtxos();
  if (ownerUtxos.length === 0) {
    throw new Error(
      "Owner wallet has no UTxOs. Fund it from the Preview testnet faucet first: " +
      "https://docs.cardano.org/cardano-testnet/tools/faucet/",
    );
  }
  const seedUtxo = ownerUtxos[0];

  // 2. Build the parameterized thread token minting policy.
  const { script: threadTokenScript, policyId, cbor: threadTokenCbor } =
    buildThreadTokenPolicy(lucid, seedUtxo);
  const threadTokenUnit = policyId; // empty token name → unit is just the policy ID

  // 3. Derive the script address from the fixed agent_wallet validator.
  const scriptAddress = lucid.utils.validatorToAddress(agentWalletScript);

  // 4. Build the full config with the derived thread token policy ID.
  //    lastWindowStart is set to now; windowSpent starts at zero.
  const fullConfig: GuardrailConfig = {
    ...config,
    threadTokenPolicyId: policyId,
    lastWindowStart: BigInt(Date.now()),
    windowSpent: 0n,
  };
  const datumCbor = encodeDatum(fullConfig);

  // 5. Build the creation transaction:
  //    - collectFrom([seedUtxo]) forces the seed UTxO into tx.inputs
  //      so the one-shot minting policy can verify it is being consumed
  //    - mintAssets mints exactly 1 thread token (empty token name)
  //    - payToContract locks the initial balance + thread token at the script
  const tx = await lucid
    .newTx()
    .collectFrom([seedUtxo])
    .mintAssets({ [threadTokenUnit]: 1n }, Data.to(new Constr(0, [])))
    .attachMintingPolicy(threadTokenScript)
    .payToContract(
      scriptAddress,
      { inline: datumCbor },
      { lovelace: initialAda * 1_000_000n, [threadTokenUnit]: 1n },
    )
    .complete();

  const signed = await tx.sign().complete();
  const txHash = await signed.submit();

  console.log(`[Beni] Agent wallet created. TX: ${txHash}`);
  console.log(`[Beni] Script address: ${scriptAddress}`);
  console.log(`[Beni] Thread token policy: ${policyId}`);

  return {
    scriptAddress,
    scriptCbor: AGENT_WALLET_CBOR,
    threadTokenPolicyCbor: threadTokenCbor,
    config: fullConfig,
  };
}

/**
 * Submit a guarded spend from the agent wallet.
 *
 * Client-side guardrail checks run first for fast, readable errors. The
 * on-chain validator re-checks everything — client-side is UX only.
 *
 * For amounts above perTxCapLovelace, use queueSpend() + approveSpend()
 * instead — this function will throw a GuardrailViolationError.
 *
 * The validity range is MANDATORY: the validator reads tx.validity_range
 * lower_bound for its rolling window time check.
 *
 * @param lucid     - Lucid instance with the agent's signing key selected
 * @param wallet    - BeniWallet returned from createAgentWallet
 * @param toAddress - Destination bech32 address
 * @param lovelace  - Amount to send in lovelace
 * @returns         - TX hash + updated config (persist this for next call)
 */
export async function agentSpend(
  lucid: Lucid,
  wallet: BeniWallet,
  toAddress: string,
  lovelace: bigint,
): Promise<SpendResult> {
  const nowMs = BigInt(Date.now());
  const toCredHash = credentialHash(lucid, toAddress);

  // Client-side check: throws GuardrailViolationError or WalletFrozenError
  assertValidSpend(wallet.config, toCredHash, lovelace, nowMs);

  // Fetch the authoritative on-chain UTxO (the one with the thread token)
  const utxo = await fetchScriptUTxO(lucid, wallet);

  // Read the on-chain config — this is the canonical source of truth
  // (guards against the caller passing a stale wallet.config)
  const currentConfig = readConfig(utxo);

  // Compute the new window state to write into the continuing output datum.
  // This MUST match what the validator computes or the tx will be rejected.
  const windowUpdate = computeNewWindowState(currentConfig, lovelace, nowMs);
  const newConfig: GuardrailConfig = { ...currentConfig, ...windowUpdate };
  const newDatumCbor = encodeDatum(newConfig);

  const threadTokenUnit = wallet.config.threadTokenPolicyId;
  const currentLovelace = utxo.assets.lovelace ?? 0n;

  const tx = await lucid
    .newTx()
    .collectFrom([utxo], SpendRedeemer)
    .attachSpendingValidator(agentWalletScript)
    // Continuing output: updated datum + thread token stays locked
    .payToContract(
      wallet.scriptAddress,
      { inline: newDatumCbor },
      { lovelace: currentLovelace - lovelace, [threadTokenUnit]: 1n },
    )
    // Payment to the destination
    .payToAddress(toAddress, { lovelace })
    // Validity range REQUIRED — the validator reads lower_bound for time
    .validFrom(Date.now() - 60_000)
    .validTo(Date.now() + 300_000)
    .complete();

  const signed = await tx.sign().complete();
  const txHash = await signed.submit();

  return { txHash, newConfig };
}

/**
 * Owner action: reclaim funds or update the wallet config.
 *
 * - If newConfig is provided, sends funds back to the script with updated rules.
 * - If newConfig is omitted, reclaims all funds to the owner's address.
 *
 * The owner's signing key must be selected in the Lucid instance.
 * Returns the transaction hash.
 */
export async function ownerAction(
  lucid: Lucid,
  wallet: BeniWallet,
  newConfig?: GuardrailConfig,
): Promise<string> {
  const utxo = await fetchScriptUTxO(lucid, wallet);
  const threadTokenUnit = wallet.config.threadTokenPolicyId;
  const currentLovelace = utxo.assets.lovelace ?? 0n;

  let txBuilder = lucid
    .newTx()
    .collectFrom([utxo], OwnerActionRedeemer)
    .attachSpendingValidator(agentWalletScript)
    .addSignerKey(wallet.config.ownerPkh)
    .validFrom(Date.now() - 60_000)
    .validTo(Date.now() + 300_000);

  if (newConfig) {
    // Config update — funds stay in script under new rules
    const newDatumCbor = encodeDatum(newConfig);
    // Keep a small reserve for the min-ADA requirement on the continuing output
    const RESERVE = 2_000_000n;
    txBuilder = txBuilder.payToContract(
      wallet.scriptAddress,
      { inline: newDatumCbor },
      { lovelace: currentLovelace - RESERVE, [threadTokenUnit]: 1n },
    );
  } else {
    // Reclaim — send all value back to owner; thread token is unlocked with it
    const ownerAddress = await lucid.wallet.address();
    txBuilder = txBuilder.payToAddress(ownerAddress, {
      lovelace: currentLovelace - 300_000n,
      [threadTokenUnit]: 1n,
    });
  }

  const tx = await txBuilder.complete();
  const signed = await tx.sign().complete();
  return await signed.submit();
}

/**
 * Emergency freeze: sets is_frozen = true on the continuing output datum.
 *
 * After this transaction confirms, the agent_wallet validator will reject
 * ALL Spend redeemers. Only an OwnerAction can unfreeze (by passing a new
 * config with is_frozen: false via ownerAction(lucid, wallet, newConfig)).
 *
 * The owner's signing key must be selected in the Lucid instance.
 * Returns the transaction hash.
 */
export async function freezeWallet(lucid: Lucid, wallet: BeniWallet): Promise<string> {
  const utxo = await fetchScriptUTxO(lucid, wallet);
  const currentConfig = readConfig(utxo);

  const frozenConfig: GuardrailConfig = { ...currentConfig, isFrozen: true };
  const frozenDatumCbor = encodeDatum(frozenConfig);

  const threadTokenUnit = wallet.config.threadTokenPolicyId;
  const currentLovelace = utxo.assets.lovelace ?? 0n;

  const tx = await lucid
    .newTx()
    .collectFrom([utxo], FreezeWalletRedeemer)
    .attachSpendingValidator(agentWalletScript)
    .payToContract(
      wallet.scriptAddress,
      { inline: frozenDatumCbor },
      { lovelace: currentLovelace - 300_000n, [threadTokenUnit]: 1n },
    )
    .addSignerKey(wallet.config.ownerPkh)
    .validFrom(Date.now() - 60_000)
    .validTo(Date.now() + 300_000)
    .complete();

  const signed = await tx.sign().complete();
  return await signed.submit();
}

// ── Re-exports ────────────────────────────────────────────────────────────────

export { makeLucid } from "./lucid-setup.js";
export { getBalance, getDailyUsage, getTransactionHistory, getWalletStatus } from "./analytics.js";
export { validateSpend, msUntilWindowReset } from "./validation.js";
export { queueSpend, approveSpend, getPendingSpends, rejectSpend } from "./approvals.js";
export type {
  GuardrailConfig,
  CreateWalletConfig,
  BeniWallet,
  SpendResult,
  DailyUsage,
  TxRecord,
  WalletStatus,
  BeniSDKOptions,
  BeniNetwork,
} from "./types.js";
export {
  GuardrailViolationError,
  WalletFrozenError,
  NoScriptUTxOError,
  DatumDecodeError,
} from "./errors.js";
