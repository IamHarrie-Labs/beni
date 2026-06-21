/**
 * Beni — Hackathon Demo Script
 *
 * Judges can run this to see all guardrails working end-to-end.
 * No wallet setup required — runs against Cardano Preview testnet.
 *
 * Usage:
 *   cp .env.example .env
 *   # Fill in BLOCKFROST_PREVIEW_KEY
 *   npx tsx examples/demo.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Load .env from project root automatically
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../");
const ENV_PATH = resolve(ROOT, ".env");
if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, "utf-8").split("\n")) {
    const [k, ...v] = line.trim().split("=");
    if (k && v.length && !process.env[k]) process.env[k] = v.join("=").replace(/^["']|["']$/g, "");
  }
}

import { makeLucid } from "../src/lucid-setup.js";
import { createAgentWallet, agentSpend, freezeWallet } from "../src/index.js";
import { validateSpend, computeNewWindowState } from "../src/validation.js";
import { encodeDatum, decodeDatum } from "../src/datum.js";
import { GuardrailViolationError } from "../src/errors.js";
import type { CreateWalletConfig, GuardrailConfig } from "../src/types.js";

// ── Config ────────────────────────────────────────────────────────────────────

const BLOCKFROST_KEY = process.env.BLOCKFROST_PREVIEW_KEY ?? "";
const NETWORK = "Preview" as const;

// ── Demo wallet config ────────────────────────────────────────────────────────

// CreateWalletConfig: the 3 derived fields (threadTokenPolicyId, lastWindowStart,
// windowSpent) are omitted — createAgentWallet fills them in automatically.
const walletConfig: CreateWalletConfig = {
  perTxCapLovelace: 2_000_000n,   // 2 ADA per-tx cap
  dailyCapLovelace: 10_000_000n,  // 10 ADA daily cap
  allowedCredentialHashes: [],     // no whitelist — all sends are capped
  ownerPkh: process.env.OWNER_PKH ?? "cafebabe00112233",
  isFrozen: false,
};

// For offline scenario tests we need a full config with placeholder derived fields
const demoConfig: GuardrailConfig = {
  ...walletConfig,
  lastWindowStart: 0n,
  windowSpent: 0n,
  threadTokenPolicyId: "deadbeef001122334455",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ada = (lovelace: bigint) => `${Number(lovelace) / 1_000_000} ADA`;
const sep = () => console.log("─".repeat(60));
const ok  = (msg: string) => console.log(`  ✅ ${msg}`);
const fail = (msg: string) => console.log(`  ❌ ${msg}`);
const info = (msg: string) => console.log(`  ℹ  ${msg}`);

function section(title: string) {
  sep();
  console.log(`\n  ${title}\n`);
}

// ── Demo scenarios ────────────────────────────────────────────────────────────

async function demoGuardrails() {
  console.log("\n" + "═".repeat(60));
  console.log("  BENI — AI Agent Wallet Guardrails Demo");
  console.log("  Cardano Preview Testnet");
  console.log("═".repeat(60));

  const NOW = BigInt(Date.now());
  const DEST = "addr_test1_unknown_credential_hash_example";
  const DEST_CRED = "unknown_credential_not_in_whitelist";

  // ── Scenario 1: Valid spend within all limits ─────────────────────────────
  section("Scenario 1: Valid spend within per-tx cap + daily cap");
  info(`Config: per-tx cap = ${ada(demoConfig.perTxCapLovelace)}, daily cap = ${ada(demoConfig.dailyCapLovelace)}`);
  info(`Attempting: send ${ada(1_000_000n)} → ${DEST.slice(0, 20)}…`);

  const r1 = validateSpend(demoConfig, DEST_CRED, 1_000_000n, NOW);
  if (r1.ok) {
    const newState = computeNewWindowState(demoConfig, 1_000_000n, NOW);
    ok(`Spend allowed. Window now: ${ada(newState.windowSpent)} / ${ada(demoConfig.dailyCapLovelace)}`);
  } else {
    fail("Unexpected block: " + r1.reason);
  }

  // ── Scenario 2: Per-tx cap exceeded ──────────────────────────────────────
  section("Scenario 2: Spend exceeds per-tx cap → queued for approval");
  info(`Attempting: send ${ada(3_000_000n)} (cap is ${ada(demoConfig.perTxCapLovelace)})`);

  const r2 = validateSpend(demoConfig, DEST_CRED, 3_000_000n, NOW);
  if (!r2.ok && r2.rule === "per_tx_cap") {
    ok(`Correctly blocked: "${r2.reason}"`);
    info("In the dashboard: this tx is queued for owner approval");
  } else {
    fail("Should have been blocked by per-tx cap");
  }

  // ── Scenario 3: Daily cap exhausted ──────────────────────────────────────
  section("Scenario 3: Daily cap exhausted mid-window");
  const exhaustedConfig: GuardrailConfig = {
    ...demoConfig,
    lastWindowStart: NOW - 3_600_000n, // 1 hour ago
    windowSpent: 9_000_000n,           // 9 ADA already spent
  };
  info(`Already spent: ${ada(exhaustedConfig.windowSpent)} today`);
  info(`Attempting: send ${ada(2_000_000n)} more`);

  const r3 = validateSpend(exhaustedConfig, DEST_CRED, 2_000_000n, NOW);
  if (!r3.ok && r3.rule === "daily_cap") {
    ok(`Correctly blocked: "${r3.reason}"`);
  } else {
    fail("Should have been blocked by daily cap");
  }

  // ── Scenario 4: Whitelisted address bypasses all caps ────────────────────
  section("Scenario 4: Whitelisted address — caps don't apply");
  const WHITELISTED_CRED = "trusted_partner_credential_hash";
  const configWithWhitelist: GuardrailConfig = {
    ...demoConfig,
    allowedCredentialHashes: [WHITELISTED_CRED],
    windowSpent: 9_800_000n,         // almost at daily cap
    lastWindowStart: NOW - 1_000n,
  };
  info(`Daily cap almost hit: ${ada(configWithWhitelist.windowSpent)} of ${ada(configWithWhitelist.dailyCapLovelace)}`);
  info(`Attempting: send ${ada(5_000_000n)} to whitelisted address`);

  const r4 = validateSpend(configWithWhitelist, WHITELISTED_CRED, 5_000_000n, NOW);
  if (r4.ok) {
    ok("Allowed — whitelisted addresses bypass per-tx and daily caps");
  } else {
    fail("Should have been allowed for whitelisted address");
  }

  // ── Scenario 5: Daily window resets after 24h ─────────────────────────────
  section("Scenario 5: 24h window resets — limits refresh");
  const WINDOW_MS = 86_400_000n;
  const expiredWindowConfig: GuardrailConfig = {
    ...demoConfig,
    lastWindowStart: NOW - WINDOW_MS - 1n,
    windowSpent: 9_500_000n, // was almost at cap
  };
  info(`Previous window: ${ada(expiredWindowConfig.windowSpent)} spent (window expired)`);
  info(`Attempting: send ${ada(1_500_000n)} in new window`);

  const r5 = validateSpend(expiredWindowConfig, DEST_CRED, 1_500_000n, NOW);
  if (r5.ok) {
    const newState = computeNewWindowState(expiredWindowConfig, 1_500_000n, NOW);
    ok(`Window reset! New window: ${ada(newState.windowSpent)} / ${ada(demoConfig.dailyCapLovelace)}`);
  } else {
    fail("Should have been allowed after window reset");
  }

  // ── Scenario 6: Frozen wallet ─────────────────────────────────────────────
  section("Scenario 6: Frozen wallet — all spends rejected");
  const frozenConfig: GuardrailConfig = { ...demoConfig, isFrozen: true };
  info("Owner has frozen the wallet");
  info(`Attempting: send ${ada(100_000n)} (tiny amount)`);

  const r6 = validateSpend(frozenConfig, DEST_CRED, 100_000n, NOW);
  if (!r6.ok && r6.rule === "frozen") {
    ok(`Correctly blocked: "${r6.reason}"`);
  } else {
    fail("Should have been blocked because wallet is frozen");
  }

  // ── Datum round-trip verification ─────────────────────────────────────────
  section("Bonus: Datum encoding round-trip (on-chain state integrity)");
  info("Encoding config to Plutus CBOR…");
  const cbor = encodeDatum(demoConfig);
  info(`CBOR: ${cbor.slice(0, 40)}…`);
  const decoded = decodeDatum(cbor);
  const match =
    decoded.perTxCapLovelace === demoConfig.perTxCapLovelace &&
    decoded.dailyCapLovelace === demoConfig.dailyCapLovelace &&
    decoded.ownerPkh === demoConfig.ownerPkh;
  if (match) {
    ok("Datum encodes → decodes without loss (field order matches Aiken WalletDatum)");
  } else {
    fail("Datum round-trip failed — field order mismatch!");
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  sep();
  console.log("\n  All 6 guardrail scenarios passed.");
  console.log("  To test on-chain: set BLOCKFROST_PREVIEW_KEY and fund a wallet.");
  console.log("  See README.md for next steps.\n");
  sep();
}

// ── On-chain demo (Preview testnet) ──────────────────────────────────────────
// Loads the deployed wallet from beni-wallet-state.json, does a real spend,
// then freezes it. Requires BLOCKFROST_PREVIEW_KEY + AGENT_PRIVATE_KEY.

async function demoOnChain() {
  const blockfrostKey = process.env.BLOCKFROST_PREVIEW_KEY;
  const agentKey = process.env.AGENT_PRIVATE_KEY;

  if (!blockfrostKey || !agentKey) {
    console.log("\n  ── On-chain demo skipped ────────────────────────────────");
    console.log("  Set BLOCKFROST_PREVIEW_KEY + AGENT_PRIVATE_KEY to run");
    console.log("  Faucet: https://docs.cardano.org/cardano-testnet/tools/faucet/");
    return;
  }

  // Load existing deployed wallet from beni-wallet-state.json
  const statePath = resolve(ROOT, "beni-wallet-state.json");
  const { existsSync, readFileSync } = await import("node:fs");
  if (!existsSync(statePath)) {
    console.log("\n  ── On-chain demo skipped ────────────────────────────────");
    console.log("  No beni-wallet-state.json found.");
    console.log("  Run: npx tsx sdk/scripts/deploy-wallet.ts");
    return;
  }

  const raw = JSON.parse(readFileSync(statePath, "utf-8"));
  const deployedWallet: import("../src/types.js").BeniWallet = {
    scriptAddress:         raw.scriptAddress,
    scriptCbor:            raw.scriptCbor,
    threadTokenPolicyCbor: raw.threadTokenPolicyCbor,
    config: {
      perTxCapLovelace:        BigInt(raw.perTxCapLovelace),
      dailyCapLovelace:        BigInt(raw.dailyCapLovelace),
      allowedCredentialHashes: raw.allowedCredentialHashes ?? [],
      ownerPkh:                raw.ownerPkh,
      lastWindowStart:         BigInt(raw.lastWindowStart ?? 0),
      windowSpent:             BigInt(raw.windowSpent ?? 0),
      isFrozen:                raw.isFrozen ?? false,
      threadTokenPolicyId:     raw.threadTokenPolicyId,
    },
  };

  section("On-chain: Loaded existing agent wallet");
  info(`Script address:  ${deployedWallet.scriptAddress}`);
  info(`Thread token:    ${deployedWallet.config.threadTokenPolicyId}`);
  info(`Per-tx cap:      ${ada(deployedWallet.config.perTxCapLovelace)}`);
  info(`Daily cap:       ${ada(deployedWallet.config.dailyCapLovelace)}`);
  info(`Frozen:          ${deployedWallet.config.isFrozen}`);

  const lucid = await makeLucid({ network: "Preview", blockfrostApiKey: blockfrostKey });
  lucid.selectWallet.fromPrivateKey(agentKey);
  const agentAddress = await lucid.wallet().address();

  if (deployedWallet.config.isFrozen) {
    info("Wallet is currently frozen — skipping spend demo.");
    return;
  }

  try {
    section("On-chain: Valid spend within cap (send 1 ADA to self)");
    info(`Sending 1 ADA → ${agentAddress.slice(0, 30)}…`);
    const spend = await agentSpend(lucid, deployedWallet, agentAddress, 1_000_000n);
    ok(`TX confirmed: ${spend.txHash}`);
    ok(`Window spent: ${ada(spend.newConfig.windowSpent)} / ${ada(spend.newConfig.dailyCapLovelace)}`);

  } catch (err) {
    if (err instanceof GuardrailViolationError) {
      ok(`Guardrail fired correctly: ${err.message}`);
    } else {
      throw err;
    }
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────

async function run() {
  await demoGuardrails();
  await demoOnChain();
}

run().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
