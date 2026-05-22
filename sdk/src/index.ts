import {
  applyParamsToScript,
  Constr,
  Data,
  mintingPolicyToId,
  validatorToAddress,
  getAddressDetails,
  type LucidEvolution,
  type UTxO,
} from "@lucid-evolution/lucid";
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
const agentWalletScript = makeScript(AGENT_WALLET_CBOR);

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Build and apply the thread_token minting policy for a specific seed UTxO.
 * Returns the parameterized script and its policy ID.
 */
function buildThreadTokenPolicy(
  lucid: LucidEvolution,
  seedUtxo: UTxO,
): { script: ReturnType<typeof makeScript>; policyId: string; cbor: string } {
  const seedParam = new Constr(0, [
    seedUtxo.txHash,
    BigInt(seedUtxo.outputIndex),
  ]);
  const cbor = applyParamsToScript(THREAD_TOKEN_BASE_CBOR, [seedParam]);
  const script = makeScript(cbor);
  const policyId = mintingPolicyToId(script);
  return { script, policyId, cbor };
}

/**
 * Find the authoritative script UTxO — the one carrying the thread token.
 */
async function fetchScriptUTxO(lucid: LucidEvolution, wallet: BeniWallet): Promise<UTxO> {
  const utxos = await lucid.utxosAt(wallet.scriptAddress);
  if (utxos.length === 0) throw new NoScriptUTxOError(wallet.scriptAddress);

  const threadTokenUnit = wallet.config.threadTokenPolicyId;
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
function credentialHash(address: string): string {
  const details = getAddressDetails(address);
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
 */
export async function createAgentWallet(
  lucid: LucidEvolution,
  config: CreateWalletConfig,
  initialAda = 5n,
): Promise<BeniWallet> {
  const ownerUtxos = await lucid.wallet().getUtxos();
  if (ownerUtxos.length === 0) {
    throw new Error(
      "Owner wallet has no UTxOs. Fund it from the Preview testnet faucet first: " +
      "https://docs.cardano.org/cardano-testnets/tools/faucet/",
    );
  }
  const seedUtxo = ownerUtxos[0];

  const { script: threadTokenScript, policyId, cbor: threadTokenCbor } =
    buildThreadTokenPolicy(lucid, seedUtxo);
  const threadTokenUnit = policyId;

  const network = lucid.config().network ?? "Preview";
  const scriptAddress = validatorToAddress(network, agentWalletScript);

  const fullConfig: GuardrailConfig = {
    ...config,
    threadTokenPolicyId: policyId,
    lastWindowStart: BigInt(Date.now()),
    windowSpent: 0n,
  };
  const datumCbor = encodeDatum(fullConfig);

  const txSignBuilder = await lucid
    .newTx()
    .collectFrom([seedUtxo])
    .mintAssets({ [threadTokenUnit]: 1n }, Data.to(new Constr(0, [])))
    .attach.MintingPolicy(threadTokenScript)
    .pay.ToContract(
      scriptAddress,
      { kind: "inline", value: datumCbor },
      { lovelace: initialAda * 1_000_000n, [threadTokenUnit]: 1n },
    )
    .complete();

  const txSigned = await txSignBuilder.sign.withWallet().complete();
  const txHash  = await txSigned.submit();

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
 */
export async function agentSpend(
  lucid: LucidEvolution,
  wallet: BeniWallet,
  toAddress: string,
  lovelace: bigint,
): Promise<SpendResult> {
  const nowMs = BigInt(Date.now());
  const toCredHash = credentialHash(toAddress);

  assertValidSpend(wallet.config, toCredHash, lovelace, nowMs);

  const utxo = await fetchScriptUTxO(lucid, wallet);
  const currentConfig = readConfig(utxo);

  const windowUpdate = computeNewWindowState(currentConfig, lovelace, nowMs);
  const newConfig: GuardrailConfig = { ...currentConfig, ...windowUpdate };
  const newDatumCbor = encodeDatum(newConfig);

  const threadTokenUnit = wallet.config.threadTokenPolicyId;
  const currentLovelace = utxo.assets.lovelace ?? 0n;

  const txSignBuilder = await lucid
    .newTx()
    .collectFrom([utxo], SpendRedeemer)
    .attach.SpendingValidator(agentWalletScript)
    .pay.ToContract(
      wallet.scriptAddress,
      { kind: "inline", value: newDatumCbor },
      { lovelace: currentLovelace - lovelace, [threadTokenUnit]: 1n },
    )
    .pay.ToAddress(toAddress, { lovelace })
    .validFrom(Date.now() - 60_000)
    .validTo(Date.now() + 300_000)
    .complete();

  const txSigned = await txSignBuilder.sign.withWallet().complete();
  const txHash  = await txSigned.submit();

  return { txHash, newConfig };
}

/**
 * Owner action: reclaim funds or update the wallet config.
 */
export async function ownerAction(
  lucid: LucidEvolution,
  wallet: BeniWallet,
  newConfig?: GuardrailConfig,
): Promise<string> {
  const utxo = await fetchScriptUTxO(lucid, wallet);
  const threadTokenUnit = wallet.config.threadTokenPolicyId;
  const currentLovelace = utxo.assets.lovelace ?? 0n;

  let txBuilder = lucid
    .newTx()
    .collectFrom([utxo], OwnerActionRedeemer)
    .attach.SpendingValidator(agentWalletScript)
    .addSignerKey(wallet.config.ownerPkh)
    .validFrom(Date.now() - 60_000)
    .validTo(Date.now() + 300_000);

  if (newConfig) {
    const newDatumCbor = encodeDatum(newConfig);
    const RESERVE = 2_000_000n;
    txBuilder = txBuilder.pay.ToContract(
      wallet.scriptAddress,
      { kind: "inline", value: newDatumCbor },
      { lovelace: currentLovelace - RESERVE, [threadTokenUnit]: 1n },
    );
  } else {
    const ownerAddress = await lucid.wallet().address();
    txBuilder = txBuilder.pay.ToAddress(ownerAddress, {
      lovelace: currentLovelace - 300_000n,
      [threadTokenUnit]: 1n,
    });
  }

  const txSignBuilder = await txBuilder.complete();
  const txSigned = await txSignBuilder.sign.withWallet().complete();
  return await txSigned.submit();
}

/**
 * Emergency freeze: sets is_frozen = true on the continuing output datum.
 */
export async function freezeWallet(lucid: LucidEvolution, wallet: BeniWallet): Promise<string> {
  const utxo = await fetchScriptUTxO(lucid, wallet);
  const currentConfig = readConfig(utxo);

  const frozenConfig: GuardrailConfig = { ...currentConfig, isFrozen: true };
  const frozenDatumCbor = encodeDatum(frozenConfig);

  const threadTokenUnit = wallet.config.threadTokenPolicyId;
  const currentLovelace = utxo.assets.lovelace ?? 0n;

  const txSignBuilder = await lucid
    .newTx()
    .collectFrom([utxo], FreezeWalletRedeemer)
    .attach.SpendingValidator(agentWalletScript)
    .pay.ToContract(
      wallet.scriptAddress,
      { kind: "inline", value: frozenDatumCbor },
      { lovelace: currentLovelace - 300_000n, [threadTokenUnit]: 1n },
    )
    .addSignerKey(wallet.config.ownerPkh)
    .validFrom(Date.now() - 60_000)
    .validTo(Date.now() + 300_000)
    .complete();

  const txSigned = await txSignBuilder.sign.withWallet().complete();
  return await txSigned.submit();
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
