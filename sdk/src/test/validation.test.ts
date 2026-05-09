import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateSpend, computeNewWindowState, msUntilWindowReset } from "../validation.js";
import { configToDatum, datumToConfig, encodeDatum, decodeDatum } from "../datum.js";
import type { GuardrailConfig } from "../types.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseConfig: GuardrailConfig = {
  perTxCapLovelace: 2_000_000n,
  dailyCapLovelace: 10_000_000n,
  allowedCredentialHashes: ["aabbccdd"],
  ownerPkh: "cafebabe",
  lastWindowStart: 0n,
  windowSpent: 0n,
  isFrozen: false,
  threadTokenPolicyId: "deadbeef",
};

const NOW = 1_000_000n; // 1000 POSIX seconds in ms

// ── validateSpend ─────────────────────────────────────────────────────────────

describe("validateSpend", () => {
  it("allows spend within per-tx cap", () => {
    const r = validateSpend(baseConfig, "unknown", 1_000_000n, NOW);
    assert.equal(r.ok, true);
  });

  it("blocks spend exceeding per-tx cap", () => {
    const r = validateSpend(baseConfig, "unknown", 3_000_000n, NOW);
    assert.equal(r.ok, false);
    assert.equal((r as { ok: false; rule: string }).rule, "per_tx_cap");
  });

  it("allows whitelisted address regardless of per-tx cap", () => {
    const r = validateSpend(baseConfig, "aabbccdd", 99_000_000n, NOW);
    assert.equal(r.ok, true);
  });

  it("blocks when daily cap exceeded within window", () => {
    const config: GuardrailConfig = {
      ...baseConfig,
      windowSpent: 9_000_000n,
      lastWindowStart: NOW - 1_000n,
    };
    const r = validateSpend(config, "unknown", 2_000_000n, NOW);
    assert.equal(r.ok, false);
    assert.equal((r as { ok: false; rule: string }).rule, "daily_cap");
  });

  it("allows spend after 24h window resets", () => {
    const config: GuardrailConfig = {
      ...baseConfig,
      windowSpent: 9_500_000n,
      lastWindowStart: NOW - 90_000_000n, // 25 hours ago
    };
    const r = validateSpend(config, "unknown", 1_500_000n, NOW);
    assert.equal(r.ok, true);
  });

  it("blocks frozen wallet", () => {
    const config: GuardrailConfig = { ...baseConfig, isFrozen: true };
    const r = validateSpend(config, "unknown", 100_000n, NOW);
    assert.equal(r.ok, false);
    assert.equal((r as { ok: false; rule: string }).rule, "frozen");
  });

  it("allows spend exactly at per-tx cap", () => {
    const r = validateSpend(baseConfig, "unknown", 2_000_000n, NOW);
    assert.equal(r.ok, true);
  });

  it("blocks spend of 1 lovelace over per-tx cap", () => {
    const r = validateSpend(baseConfig, "unknown", 2_000_001n, NOW);
    assert.equal(r.ok, false);
  });
});

// ── computeNewWindowState ─────────────────────────────────────────────────────

describe("computeNewWindowState", () => {
  it("accumulates spend within window", () => {
    const config: GuardrailConfig = {
      ...baseConfig,
      lastWindowStart: NOW - 3600_000n,
      windowSpent: 1_000_000n,
    };
    const result = computeNewWindowState(config, 500_000n, NOW);
    assert.equal(result.windowSpent, 1_500_000n);
    assert.equal(result.lastWindowStart, config.lastWindowStart);
  });

  it("resets window after 24h elapsed", () => {
    const config: GuardrailConfig = {
      ...baseConfig,
      lastWindowStart: 0n,
      windowSpent: 9_000_000n,
    };
    // 25 hours in ms — well past the 24h window from lastWindowStart 0n
    const twentyFiveHoursMs = 90_000_000n;
    const result = computeNewWindowState(config, 500_000n, twentyFiveHoursMs);
    assert.equal(result.windowSpent, 500_000n);
    assert.equal(result.lastWindowStart, twentyFiveHoursMs);
  });
});

// ── msUntilWindowReset ────────────────────────────────────────────────────────

describe("msUntilWindowReset", () => {
  it("returns remaining time in current window", () => {
    const config: GuardrailConfig = {
      ...baseConfig,
      lastWindowStart: NOW - 3_600_000n, // 1 hour ago
    };
    const ms = msUntilWindowReset(config, NOW);
    assert.equal(ms, 86_400_000n - 3_600_000n);
  });

  it("returns 0 when window has elapsed", () => {
    const config: GuardrailConfig = {
      ...baseConfig,
      lastWindowStart: NOW - 90_000_000n, // 25h ago
    };
    assert.equal(msUntilWindowReset(config, NOW), 0n);
  });
});

// ── Datum round-trip ──────────────────────────────────────────────────────────

describe("datum round-trip", () => {
  it("encodes and decodes config without loss", () => {
    const encoded = encodeDatum(baseConfig);
    assert.ok(typeof encoded === "string" && encoded.length > 0);

    const decoded = decodeDatum(encoded);
    assert.equal(decoded.perTxCapLovelace, baseConfig.perTxCapLovelace);
    assert.equal(decoded.dailyCapLovelace, baseConfig.dailyCapLovelace);
    assert.equal(decoded.ownerPkh, baseConfig.ownerPkh);
    assert.equal(decoded.lastWindowStart, baseConfig.lastWindowStart);
    assert.equal(decoded.windowSpent, baseConfig.windowSpent);
    assert.equal(decoded.isFrozen, baseConfig.isFrozen);
    assert.equal(decoded.threadTokenPolicyId, baseConfig.threadTokenPolicyId);
    assert.deepEqual(decoded.allowedCredentialHashes, baseConfig.allowedCredentialHashes);
  });

  it("configToDatum / datumToConfig are inverse operations", () => {
    const datum = configToDatum(baseConfig);
    const config = datumToConfig(datum);
    assert.equal(config.perTxCapLovelace, baseConfig.perTxCapLovelace);
    assert.equal(config.ownerPkh, baseConfig.ownerPkh);
    assert.equal(config.isFrozen, baseConfig.isFrozen);
  });
});
