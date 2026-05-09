// ── Core config types ─────────────────────────────────────────────────────────

export type GuardrailConfig = {
  perTxCapLovelace: bigint;
  dailyCapLovelace: bigint;
  /** Raw payment credential hashes (hex) the agent may send to freely */
  allowedCredentialHashes: string[];
  /** Owner's payment credential hash (hex) */
  ownerPkh: string;
  /** POSIX milliseconds when the current 24h window started */
  lastWindowStart: bigint;
  /** Lovelace spent in the current window */
  windowSpent: bigint;
  isFrozen: boolean;
  /** Policy ID of the thread token NFT minted at wallet creation */
  threadTokenPolicyId: string;
};

export type BeniWallet = {
  scriptAddress: string;
  /** Compiled PlutusV3 validator CBOR (hex) — from aiken build → plutus.json */
  scriptCbor: string;
  /** Compiled thread token minting policy CBOR (hex) */
  threadTokenPolicyCbor: string;
  config: GuardrailConfig;
};

export type SpendResult = {
  txHash: string;
  /** Updated config reflecting new window state — persist this */
  newConfig: GuardrailConfig;
};

// ── Analytics types ───────────────────────────────────────────────────────────

export type DailyUsage = {
  spent: bigint;
  cap: bigint;
  remaining: bigint;
  percentUsed: number;
  windowResetAt: Date;
  isNewWindow: boolean;
};

export type TxRecord = {
  txHash: string;
  timestamp: Date;
  lovelaceSent: bigint;
  destination: string;
  type: "spend" | "owner_action" | "freeze" | "create";
};

export type WalletStatus = {
  balance: bigint;
  dailyUsage: DailyUsage;
  isFrozen: boolean;
  allowedAddresses: string[];
  perTxCap: bigint;
};

// ── SDK options ───────────────────────────────────────────────────────────────

export type BeniNetwork = "Preview" | "Preprod" | "Mainnet";

export type BeniSDKOptions = {
  network: BeniNetwork;
  blockfrostApiKey: string;
};

/**
 * Config fields the caller supplies when creating a new agent wallet.
 * The three derived fields (threadTokenPolicyId, lastWindowStart, windowSpent)
 * are computed by createAgentWallet and must not be provided up-front.
 */
export type CreateWalletConfig = Omit<
  GuardrailConfig,
  "threadTokenPolicyId" | "lastWindowStart" | "windowSpent"
>;
