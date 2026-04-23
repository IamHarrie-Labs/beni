export type GuardrailConfig = {
  perTxCapLovelace: bigint;
  allowedAddresses: string[];
  ownerPkh: string;
};

export type BeniWallet = {
  scriptAddress: string;
  config: GuardrailConfig;
};

/// Creates a new Beni agent wallet with the given guardrail rules.
/// Returns the script address to fund and the config to store.
export async function createAgentWallet(
  config: GuardrailConfig
): Promise<BeniWallet> {
  // TODO: compile validator, derive script address, build creation tx
  throw new Error("Not implemented — wire up Lucid/Mesh here");
}

/// Submits a guarded spend from the agent wallet.
/// Will fail onchain if the rules in the datum are violated.
export async function agentSpend(
  wallet: BeniWallet,
  toAddress: string,
  lovelace: bigint
): Promise<string> {
  // TODO: build and submit tx, returns tx hash
  throw new Error("Not implemented — wire up Lucid/Mesh here");
}

/// Owner reclaims or updates the wallet.
export async function ownerAction(
  wallet: BeniWallet,
  newConfig?: GuardrailConfig
): Promise<string> {
  // TODO: build owner tx with co-signature
  throw new Error("Not implemented — wire up Lucid/Mesh here");
}
