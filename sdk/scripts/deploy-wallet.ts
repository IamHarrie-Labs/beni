/**
 * Beni — Deploy Agent Wallet to Preview Testnet
 *
 * Deploys the Beni guardrail contract on-chain. In a single atomic tx:
 *   1. Mints the one-shot thread token NFT (uniquely identifies this wallet)
 *   2. Locks initial ADA at the script address with the full rules datum
 *
 * Prerequisites:
 *   - AGENT_PRIVATE_KEY set in .env  (run generate-key.ts first)
 *   - BLOCKFROST_PREVIEW_KEY set in .env
 *   - Address funded with at least 10 tADA from the faucet
 *
 * Run:
 *   npx tsx sdk/scripts/deploy-wallet.ts
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { makeLucid } from "../src/lucid-setup.js";
import { createAgentWallet } from "../src/index.js";
import { getAddressDetails } from "@lucid-evolution/lucid";
import type { CreateWalletConfig } from "../src/types.js";

const ROOT       = resolve(import.meta.dirname, "../../");
const ENV_PATH   = resolve(ROOT, ".env");
const STATE_PATH = resolve(ROOT, "beni-wallet-state.json");

// ── Load .env ──────────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const lines = readFileSync(ENV_PATH, "utf-8").split("\n");
    for (const line of lines) {
      const [k, ...v] = line.trim().split("=");
      if (k && v.length) process.env[k] = v.join("=").replace(/^["']|["']$/g, "");
    }
  } catch { /* no .env */ }
}

loadEnv();

const BLOCKFROST_KEY = process.env.BLOCKFROST_PREVIEW_KEY ?? "";
const AGENT_KEY      = process.env.AGENT_PRIVATE_KEY ?? "";
const OWNER_PKH      = process.env.OWNER_PKH ?? "";

// ── Guardrail config ───────────────────────────────────────────────────────
// These become immutable on-chain once the wallet is deployed.
// Edit before first deploy — use ownerAction() to update afterwards.
const WALLET_CONFIG: CreateWalletConfig = {
  perTxCapLovelace:         500_000_000n,  // ₳ 500 per-tx hard ceiling
  dailyCapLovelace:       2_500_000_000n,  // ₳ 2,500 rolling 24h budget
  allowedCredentialHashes: [],             // whitelist — add hashes after deploy
  ownerPkh:               OWNER_PKH || "00".repeat(28), // fallback placeholder
  isFrozen:               false,
};

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  Beni — Deploy Agent Wallet");
  console.log("  Cardano Preview Testnet");
  console.log("══════════════════════════════════════════════════\n");

  if (!BLOCKFROST_KEY) {
    console.error("  ❌  BLOCKFROST_PREVIEW_KEY not set in .env");
    process.exit(1);
  }
  if (!AGENT_KEY) {
    console.error("  ❌  AGENT_PRIVATE_KEY not set. Run: npx tsx sdk/scripts/generate-key.ts");
    process.exit(1);
  }

  // Check if already deployed
  if (existsSync(STATE_PATH)) {
    const existing = JSON.parse(readFileSync(STATE_PATH, "utf-8"));
    console.log("  ⚠  Wallet already deployed. State loaded from beni-wallet-state.json\n");
    console.log(`  Script address:      ${existing.scriptAddress}`);
    console.log(`  Thread token policy: ${existing.threadTokenPolicyId}`);
    console.log(`  Deployed at tx:      ${existing.deployTxHash}\n`);
    console.log("  To redeploy with new config, delete beni-wallet-state.json first.");
    console.log("  To update rules on an existing wallet, use ownerAction().\n");
    return;
  }

  const lucid = await makeLucid({ network: "Preview", blockfrostApiKey: BLOCKFROST_KEY });
  lucid.selectWallet.fromPrivateKey(AGENT_KEY);
  const address = await lucid.wallet().address();

  // Check balance before deploying
  const utxos = await lucid.wallet().getUtxos();
  if (utxos.length === 0) {
    console.error("  ❌  Address has no UTxOs. Fund it first:");
    console.error(`  Address: ${address}`);
    console.error("  Faucet:  https://docs.cardano.org/cardano-testnet/tools/faucet/\n");
    process.exit(1);
  }

  const totalLovelace = utxos.reduce((s, u) => s + (u.assets.lovelace ?? 0n), 0n);
  const totalAda = Number(totalLovelace) / 1_000_000;
  console.log(`  Address: ${address}`);
  console.log(`  Balance: ₳ ${totalAda.toFixed(2)} (${utxos.length} UTxO${utxos.length === 1 ? "" : "s"})\n`);

  if (totalLovelace < 8_000_000n) {
    console.error("  ❌  Balance too low. Need at least ₳ 8 for deployment fees.");
    console.error("  Faucet: https://docs.cardano.org/cardano-testnet/tools/faucet/\n");
    process.exit(1);
  }

  // Use the owner PKH from the address if not set in env
  if (!WALLET_CONFIG.ownerPkh || WALLET_CONFIG.ownerPkh === "00".repeat(28)) {
    const details = getAddressDetails(address);
    WALLET_CONFIG.ownerPkh = details.paymentCredential?.hash ?? "";
  }

  console.log("  Deploying with config:");
  console.log(`    Per-tx cap:  ₳ ${Number(WALLET_CONFIG.perTxCapLovelace) / 1_000_000}`);
  console.log(`    Daily cap:   ₳ ${Number(WALLET_CONFIG.dailyCapLovelace) / 1_000_000}`);
  console.log(`    Whitelist:   ${WALLET_CONFIG.allowedCredentialHashes.length} addresses`);
  console.log(`    Owner PKH:   ${WALLET_CONFIG.ownerPkh.slice(0, 16)}…`);
  console.log(`    Initial ADA: ₳ 5\n`);
  console.log("  Submitting deployment transaction…\n");

  try {
    const wallet = await createAgentWallet(lucid, WALLET_CONFIG, 5n);

    // Wait a moment for TX to propagate
    await new Promise(r => setTimeout(r, 2000));

    // The createAgentWallet logs the txHash to console — capture state
    // We read it by checking the Blockfrost UTxOs at the script address
    const scriptUtxos = await lucid.utxosAt(wallet.scriptAddress);
    const deployTxHash = scriptUtxos[0]?.txHash ?? "pending-confirmation";

    const state = {
      scriptAddress:       wallet.scriptAddress,
      scriptCbor:          wallet.scriptCbor,
      threadTokenPolicyCbor: wallet.threadTokenPolicyCbor,
      threadTokenPolicyId: wallet.config.threadTokenPolicyId,
      ownerPkh:            wallet.config.ownerPkh,
      perTxCapLovelace:    wallet.config.perTxCapLovelace.toString(),
      dailyCapLovelace:    wallet.config.dailyCapLovelace.toString(),
      deployTxHash,
      network:             "Preview",
      deployedAt:          new Date().toISOString(),
    };

    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    console.log("\n  ✅  Wallet deployed!\n");
    console.log(`  Script address:      ${state.scriptAddress}`);
    console.log(`  Thread token policy: ${state.threadTokenPolicyId}`);
    console.log(`  State saved to:      beni-wallet-state.json\n`);
    console.log("  ─────────────────────────────────────────────────");
    console.log("  NEXT STEPS:");
    console.log("  1. Add these to your Vercel environment variables:");
    console.log(`     BENI_SCRIPT_ADDRESS=${state.scriptAddress}`);
    console.log(`     BENI_THREAD_TOKEN_POLICY=${state.threadTokenPolicyId}`);
    console.log("  2. Redeploy the Vercel app:  npx vercel --prod");
    console.log("  3. Run the demo:  npx tsx sdk/examples/demo.ts");
    console.log("  ─────────────────────────────────────────────────\n");

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("\n  ❌  Deployment failed:", msg);
    if (msg.includes("InputsExhausted") || msg.includes("ValueNotConserved")) {
      console.error("  Hint: Balance may be too low, or UTxOs are still locked.");
    }
    if (msg.includes("OutsideValidityInterval")) {
      console.error("  Hint: System clock skew detected. Check your local time.");
    }
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
