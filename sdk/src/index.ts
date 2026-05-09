import { Constr, Data, type Lucid, type Script, type UTxO } from "lucid-cardano";
import type { BeniWallet, GuardrailConfig, SpendResult } from "./types.js";
import { encodeDatum, WalletDatumSchema, type WalletDatumType, datumToConfig } from "./datum.js";
import { assertValidSpend, computeNewWindowState } from "./validation.js";
import { NoScriptUTxOError, InvalidAddressError } from "./errors.js";
import { makeScript } from "./index-internal.js";

// ── Redeemer constants ────────────────────────────────────────────────────────
// Must match the WalletRedeemer constructor indices in agent_wallet.ak:
//   Spend = 0, OwnerAction = 1, FreezeWallet = 2
const SpendRedeemer = Data.to(new Constr(0, []));
const OwnerActionRedeemer = Data.to(new Constr(1, []));
const FreezeWalletRedeemer = Data.to(new Constr(2, []));

async function fetchScriptUTxO(lucid: Lucid, scriptAddress: string): Promise<UTxO> {
  const utxos = await lucid.utxosAt(scriptAddress);
  if (utxos.length === 0) throw new NoScriptUTxOError(scriptAddress);
  // Use the UTxO that carries the thread token (policy embedded in datum)
  return utxos[0];
}

function getCredentialHash(lucid: Lucid, address: string): string {
  const details = lucid.utils.getAddressDetails(address);
  if (!details.paymentCredential) throw new InvalidAddressError(address);
  return details.paymentCredential.hash;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Deploys a new Beni agent wallet on-chain.
 *
 * Creates the script UTxO and mints the thread token NFT in one atomic
 * transaction. The caller must have enough ADA in their wallet to fund
 * the initial balance (default 5 ADA) plus transaction fees.
 *
 * @param lucid      - Lucid instance with an owner wallet selected
 * @param config     - Guardrail rules for this agent wallet
 * @param initialAda - Initial ADA to lock in the wallet (default 5)
 */
export async function createAgentWallet(
  lucid: Lucid,
  config: GuardrailConfig,
  initialAda = 5n,
): Promise<BeniWallet> {
  const spendScript = makeScript(config.threadTokenPolicyId); // placeholder — see note below
  const mintScript = makeScript(config.threadTokenPolicyId);

  const scriptAddress = lucid.utils.validatorToAddress(makeScript(
    // NOTE: After `aiken build`, replace these strings with plutus.json compiled codes.
    // For now the SDK exports the address derivation pattern; actual CBOR is injected
    // at runtime from the plutus.json file loaded by the caller.
    config.threadTokenPolicyId, // this will be the real validator CBOR
  ));

  const policyId = config.threadTokenPolicyId;
  const threadTokenUnit = policyId + ""; // policy + empty token name

  const initialLovelace = initialAda * 1_000_000n;
  const datumCbor = encodeDatum(config);

  const tx = await lucid
    .newTx()
    .mintAssets({ [threadTokenUnit]: 1n }, Data.to(new Constr(0, [])))
    .attachMintingPolicy(mintScript)
    .payToContract(
      scriptAddress,
      { inline: datumCbor },
      { lovelace: initialLovelace, [threadTokenUnit]: 1n },
    )
    .complete();

  const signed = await tx.sign().complete();
  await signed.submit();

  return {
    scriptAddress,
    scriptCbor: config.threadTokenPolicyId, // caller sets real CBOR
    threadTokenPolicyCbor: config.threadTokenPolicyId,
    config,
  };
}

/**
 * Submits a guarded spend from the agent wallet.
 *
 * Validates all guardrails client-side first (fast, clear errors), then
 * builds and submits the transaction. The on-chain validator re-checks
 * everything — client-side validation is for UX only.
 *
 * For amounts above per_tx_cap, use queueSpend() + approveSpend() instead.
 *
 * @param lucid     - Lucid instance with the agent wallet selected
 * @param wallet    - BeniWallet returned from createAgentWallet
 * @param toAddress - Destination bech32 address
 * @param lovelace  - Amount to send in lovelace
 */
export async function agentSpend(
  lucid: Lucid,
  wallet: BeniWallet,
  toAddress: string,
  lovelace: bigint,
): Promise<SpendResult> {
  const nowMs = BigInt(Date.now());
  const toCredHash = getCredentialHash(lucid, toAddress);

  // Client-side guardrail check — throws typed error if violated
  assertValidSpend(wallet.config, toCredHash, lovelace, nowMs);

  const utxo = await fetchScriptUTxO(lucid, wallet.scriptAddress);
  const rawDatum = utxo.datum ?? utxo.datumHash;
  if (!rawDatum) throw new Error("Script UTxO has no inline datum");

  const currentConfig = datumToConfig(Data.from<WalletDatumType>(rawDatum, WalletDatumSchema as unknown as WalletDatumType));
  const windowUpdate = computeNewWindowState(currentConfig, lovelace, nowMs);
  const newConfig: GuardrailConfig = { ...currentConfig, ...windowUpdate };
  const newDatumCbor = encodeDatum(newConfig);

  const script = makeScript(wallet.scriptCbor);
  const threadTokenUnit = wallet.config.threadTokenPolicyId + "";

  // Remaining lovelace back to script (current balance minus what we're sending)
  const currentLovelace = utxo.assets.lovelace ?? 0n;
  const continuingLovelace = currentLovelace - lovelace;

  const tx = await lucid
    .newTx()
    .collectFrom([utxo], SpendRedeemer)
    .attachSpendingValidator(script)
    // Continuing output: updated datum + thread token stays locked
    .payToContract(
      wallet.scriptAddress,
      { inline: newDatumCbor },
      { lovelace: continuingLovelace, [threadTokenUnit]: 1n },
    )
    // Payment to destination
    .payToAddress(toAddress, { lovelace })
    // Validity range is REQUIRED — the validator reads lower_bound for the time check
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
 * If newConfig is provided, sends funds back to the script with updated rules.
 * If newConfig is omitted, reclaims all funds to the owner's address.
 *
 * The owner's wallet must be selected in the Lucid instance.
 */
export async function ownerAction(
  lucid: Lucid,
  wallet: BeniWallet,
  newConfig?: GuardrailConfig,
): Promise<string> {
  const utxo = await fetchScriptUTxO(lucid, wallet.scriptAddress);
  const script = makeScript(wallet.scriptCbor);
  const threadTokenUnit = wallet.config.threadTokenPolicyId + "";
  const currentLovelace = utxo.assets.lovelace ?? 0n;

  let txBuilder = lucid
    .newTx()
    .collectFrom([utxo], OwnerActionRedeemer)
    .attachSpendingValidator(script)
    .addSignerKey(wallet.config.ownerPkh)
    .validFrom(Date.now() - 60_000)
    .validTo(Date.now() + 300_000);

  if (newConfig) {
    // Update config — funds stay in script with new datum
    const newDatumCbor = encodeDatum(newConfig);
    txBuilder = txBuilder.payToContract(
      wallet.scriptAddress,
      { inline: newDatumCbor },
      { lovelace: currentLovelace - 300_000n, [threadTokenUnit]: 1n },
    );
  } else {
    // Reclaim — all funds go to owner, thread token burned implicitly
    const ownerAddress = await lucid.wallet.address();
    txBuilder = txBuilder.payToAddress(ownerAddress, {
      lovelace: currentLovelace - 300_000n,
    });
  }

  const tx = await txBuilder.complete();
  const signed = await tx.sign().complete();
  return await signed.submit();
}

/**
 * Emergency freeze: sets is_frozen = true on the continuing output.
 * All subsequent Spend redeemers will be rejected by the validator.
 *
 * The owner's wallet must be selected in the Lucid instance.
 */
export async function freezeWallet(lucid: Lucid, wallet: BeniWallet): Promise<string> {
  const utxo = await fetchScriptUTxO(lucid, wallet.scriptAddress);
  const script = makeScript(wallet.scriptCbor);
  const threadTokenUnit = wallet.config.threadTokenPolicyId + "";
  const currentLovelace = utxo.assets.lovelace ?? 0n;

  const rawDatum = utxo.datum ?? utxo.datumHash;
  if (!rawDatum) throw new Error("Script UTxO has no inline datum");

  const currentConfig = datumToConfig(Data.from<WalletDatumType>(rawDatum, WalletDatumSchema as unknown as WalletDatumType));
  const frozenConfig: GuardrailConfig = { ...currentConfig, isFrozen: true };
  const frozenDatumCbor = encodeDatum(frozenConfig);

  const tx = await lucid
    .newTx()
    .collectFrom([utxo], FreezeWalletRedeemer)
    .attachSpendingValidator(script)
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

// Re-export everything callers need
export { makeLucid } from "./lucid-setup.js";
export { getBalance, getDailyUsage, getTransactionHistory, getWalletStatus } from "./analytics.js";
export { validateSpend, msUntilWindowReset } from "./validation.js";
export { queueSpend, approveSpend, getPendingSpends, rejectSpend } from "./approvals.js";
export type {
  GuardrailConfig,
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
