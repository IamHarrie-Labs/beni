import type { GuardrailConfig } from "./types.js";
import { GuardrailViolationError, WalletFrozenError } from "./errors.js";

const WINDOW_MS = 86_400_000n; // 24 hours in milliseconds

export type ValidationResult =
  | { ok: true }
  | { ok: false; rule: "per_tx_cap" | "daily_cap" | "frozen"; reason: string };

/**
 * Client-side mirror of the on-chain validator's Spend checks.
 * Run this before building any transaction to get a clear error
 * instead of a cryptic chain rejection.
 */
export function validateSpend(
  config: GuardrailConfig,
  toCredentialHash: string,
  lovelace: bigint,
  nowMs: bigint,
): ValidationResult {
  if (config.isFrozen) {
    return { ok: false, rule: "frozen", reason: "Wallet is frozen. Owner must unfreeze first." };
  }

  // Whitelisted addresses bypass both caps
  if (config.allowedCredentialHashes.includes(toCredentialHash)) {
    return { ok: true };
  }

  if (lovelace > config.perTxCapLovelace) {
    const adaSent = Number(lovelace) / 1_000_000;
    const adaCap = Number(config.perTxCapLovelace) / 1_000_000;
    return {
      ok: false,
      rule: "per_tx_cap",
      reason: `Per-tx cap exceeded: tried to send ${adaSent} ADA, cap is ${adaCap} ADA`,
    };
  }

  const inWindow = nowMs - config.lastWindowStart < WINDOW_MS;
  const effectiveSpent = inWindow ? config.windowSpent + lovelace : lovelace;

  if (effectiveSpent > config.dailyCapLovelace) {
    const adaEffective = Number(effectiveSpent) / 1_000_000;
    const adaDailyCap = Number(config.dailyCapLovelace) / 1_000_000;
    const adaRemaining = Number(config.dailyCapLovelace - (inWindow ? config.windowSpent : 0n)) / 1_000_000;
    return {
      ok: false,
      rule: "daily_cap",
      reason: `Daily cap exceeded: ${adaEffective} ADA would be spent, cap is ${adaDailyCap} ADA. Remaining today: ${adaRemaining} ADA`,
    };
  }

  return { ok: true };
}

/**
 * Throws a typed error if the spend violates any guardrail.
 * Use this inside SDK functions for clean error propagation.
 */
export function assertValidSpend(
  config: GuardrailConfig,
  toCredentialHash: string,
  lovelace: bigint,
  nowMs: bigint,
): void {
  const result = validateSpend(config, toCredentialHash, lovelace, nowMs);
  if (!result.ok) {
    if (result.rule === "frozen") throw new WalletFrozenError();
    throw new GuardrailViolationError(result.rule, result.reason);
  }
}

/**
 * Compute the new window state after a spend.
 * This must match the continuing output datum exactly, or the validator rejects the tx.
 */
export function computeNewWindowState(
  config: GuardrailConfig,
  lovelace: bigint,
  nowMs: bigint,
): Pick<GuardrailConfig, "lastWindowStart" | "windowSpent"> {
  const inWindow = nowMs - config.lastWindowStart < WINDOW_MS;
  return {
    lastWindowStart: inWindow ? config.lastWindowStart : nowMs,
    windowSpent: inWindow ? config.windowSpent + lovelace : lovelace,
  };
}

/**
 * Returns how many milliseconds until the 24h window resets.
 */
export function msUntilWindowReset(config: GuardrailConfig, nowMs: bigint): bigint {
  const elapsed = nowMs - config.lastWindowStart;
  if (elapsed >= WINDOW_MS) return 0n;
  return WINDOW_MS - elapsed;
}
