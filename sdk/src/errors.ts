export class GuardrailViolationError extends Error {
  constructor(
    public readonly rule: "per_tx_cap" | "daily_cap" | "whitelist" | "frozen",
    message: string,
  ) {
    super(message);
    this.name = "GuardrailViolationError";
  }
}

export class WalletFrozenError extends GuardrailViolationError {
  constructor() {
    super("frozen", "Agent wallet is frozen. Owner must unfreeze before spending.");
    this.name = "WalletFrozenError";
  }
}

export class NoScriptUTxOError extends Error {
  constructor(scriptAddress: string) {
    super(`No UTxOs found at script address: ${scriptAddress}`);
    this.name = "NoScriptUTxOError";
  }
}

export class DatumDecodeError extends Error {
  constructor(detail: string) {
    super(`Failed to decode wallet datum: ${detail}`);
    this.name = "DatumDecodeError";
  }
}

export class InvalidAddressError extends Error {
  constructor(address: string) {
    super(`Cannot parse address or extract payment credential: ${address}`);
    this.name = "InvalidAddressError";
  }
}
