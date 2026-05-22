import { Data } from "@lucid-evolution/lucid";
import type { GuardrailConfig } from "./types.js";

// Field order MUST match the Aiken WalletDatum declaration order exactly.
// Aiken encodes product types as Constr 0 [field0, field1, ...] in declaration order.
// Wrong order = silent garbage on-chain; the validator will reject every spend.
export const WalletDatumSchema = Data.Object({
  per_tx_cap: Data.Integer(),
  daily_cap: Data.Integer(),
  allowed_addresses: Data.Array(Data.Bytes()),
  owner_pkh: Data.Bytes(),
  last_window_start: Data.Integer(),
  window_spent: Data.Integer(),
  is_frozen: Data.Boolean(),
  thread_token_policy: Data.Bytes(),
});

export type WalletDatumType = Data.Static<typeof WalletDatumSchema>;

// Required Lucid pattern: cast schema to the inferred static type.
// Data.to / Data.from generics require `type` and `data` to share the same T.
const WalletDatum = WalletDatumSchema as unknown as WalletDatumType;

export function configToDatum(config: GuardrailConfig): WalletDatumType {
  return {
    per_tx_cap: config.perTxCapLovelace,
    daily_cap: config.dailyCapLovelace,
    allowed_addresses: config.allowedCredentialHashes,
    owner_pkh: config.ownerPkh,
    last_window_start: config.lastWindowStart,
    window_spent: config.windowSpent,
    is_frozen: config.isFrozen,
    thread_token_policy: config.threadTokenPolicyId,
  };
}

export function datumToConfig(datum: WalletDatumType): GuardrailConfig {
  return {
    perTxCapLovelace: datum.per_tx_cap,
    dailyCapLovelace: datum.daily_cap,
    allowedCredentialHashes: datum.allowed_addresses as string[],
    ownerPkh: datum.owner_pkh as string,
    lastWindowStart: datum.last_window_start,
    windowSpent: datum.window_spent,
    isFrozen: datum.is_frozen,
    threadTokenPolicyId: datum.thread_token_policy as string,
  };
}

export function encodeDatum(config: GuardrailConfig): string {
  return Data.to<WalletDatumType>(configToDatum(config), WalletDatum);
}

export function decodeDatum(cbor: string): GuardrailConfig {
  const datum = Data.from<WalletDatumType>(cbor, WalletDatum);
  return datumToConfig(datum);
}
