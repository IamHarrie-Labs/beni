import type { LucidEvolution as Lucid } from "@lucid-evolution/lucid";
import { Data } from "@lucid-evolution/lucid";
import type { BeniWallet, DailyUsage, TxRecord, WalletStatus } from "./types.js";
import { WalletDatumSchema, type WalletDatumType, datumToConfig } from "./datum.js";
import { msUntilWindowReset } from "./validation.js";
import { NoScriptUTxOError } from "./errors.js";

/**
 * Returns the current ADA balance locked at the script address.
 */
export async function getBalance(lucid: Lucid, wallet: BeniWallet): Promise<bigint> {
  const utxos = await lucid.utxosAt(wallet.scriptAddress);
  return utxos.reduce((sum, u) => sum + (u.assets.lovelace ?? 0n), 0n);
}

/**
 * Returns the daily spending window status, computed from the on-chain datum.
 */
export async function getDailyUsage(lucid: Lucid, wallet: BeniWallet): Promise<DailyUsage> {
  const utxos = await lucid.utxosAt(wallet.scriptAddress);
  if (utxos.length === 0) throw new NoScriptUTxOError(wallet.scriptAddress);

  const utxo = utxos[0];
  if (!utxo.datum) throw new Error("UTxO has no datum");

  const datum = Data.from<WalletDatumType>(utxo.datum, WalletDatumSchema as unknown as WalletDatumType);
  const config = datumToConfig(datum);

  const nowMs = BigInt(Date.now());
  const WINDOW_MS = 86_400_000n;
  const inWindow = nowMs - config.lastWindowStart < WINDOW_MS;

  const spent = inWindow ? config.windowSpent : 0n;
  const cap = config.dailyCapLovelace;
  const remaining = cap > spent ? cap - spent : 0n;
  const percentUsed = cap > 0n ? Number((spent * 100n) / cap) : 0;

  const msLeft = msUntilWindowReset(config, nowMs);
  const windowResetAt = new Date(Date.now() + Number(msLeft));

  return { spent, cap, remaining, percentUsed, windowResetAt, isNewWindow: !inWindow };
}

/**
 * Fetches recent transactions at the script address via Blockfrost.
 * Returns them sorted newest-first.
 */
export async function getTransactionHistory(
  lucid: Lucid,
  wallet: BeniWallet,
  limit = 20,
): Promise<TxRecord[]> {
  // Lucid doesn't expose a direct tx history API — we use the provider directly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider = (lucid as any).provider;
  if (!provider?.getTransactions) {
    // Fallback: return empty for non-Blockfrost providers (e.g., emulator)
    return [];
  }

  try {
    const txs = await provider.getTransactions({ address: wallet.scriptAddress });
    return txs.slice(0, limit).map((tx: { tx_hash: string; block_time: number }) => ({
      txHash: tx.tx_hash,
      timestamp: new Date(tx.block_time * 1000),
      lovelaceSent: 0n,       // detailed parsing requires fetching each tx
      destination: "",
      type: "spend" as const,
    }));
  } catch {
    return [];
  }
}

/**
 * Full wallet status snapshot — used by the dashboard and chatbot.
 */
export async function getWalletStatus(lucid: Lucid, wallet: BeniWallet): Promise<WalletStatus> {
  const [balance, dailyUsage] = await Promise.all([
    getBalance(lucid, wallet),
    getDailyUsage(lucid, wallet),
  ]);

  return {
    balance,
    dailyUsage,
    isFrozen: wallet.config.isFrozen,
    allowedAddresses: wallet.config.allowedCredentialHashes,
    perTxCap: wallet.config.perTxCapLovelace,
  };
}
