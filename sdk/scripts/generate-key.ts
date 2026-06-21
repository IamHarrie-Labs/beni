/**
 * Beni — Generate Agent Private Key
 *
 * Run ONCE to create a fresh private key and get the Preview testnet
 * address to fund from the faucet.
 *
 *   npx tsx sdk/scripts/generate-key.ts
 *
 * Copy the printed AGENT_PRIVATE_KEY into your .env file, then fund
 * the displayed address from:
 *   https://docs.cardano.org/cardano-testnets/tools/faucet/
 */

import { generatePrivateKey, getAddressDetails, Lucid, Blockfrost } from "@lucid-evolution/lucid";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT     = resolve(import.meta.dirname, "../../");
const ENV_PATH = resolve(ROOT, ".env");

// ── Load .env before anything else ────────────────────────────────────────────
let envContent = "";
try {
  envContent = readFileSync(ENV_PATH, "utf-8");
  const lines = envContent.split("\n");
  for (const line of lines) {
    const [k, ...vParts] = line.trim().split("=");
    if (k && vParts.length) process.env[k] = vParts.join("=").replace(/^["']|["']$/g, "");
  }
} catch { /* no .env yet */ }

async function main() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  Beni — Agent Key Generator");
  console.log("══════════════════════════════════════════════════\n");

  // Check if key already exists
  const existing = envContent.match(/^AGENT_PRIVATE_KEY=(.+)$/m)?.[1]?.trim();
  if (existing) {
    console.log("  ⚠  AGENT_PRIVATE_KEY is already set in .env");
    console.log("  Using existing key to show address.\n");

    // Initialize Lucid just to derive address
    const bfKey = process.env.BLOCKFROST_PREVIEW_KEY ?? "";
    const lucid = await Lucid(new Blockfrost("https://cardano-preview.blockfrost.io/api/v0", bfKey), "Preview");
    lucid.selectWallet.fromPrivateKey(existing);
    const address = await lucid.wallet().address();
    const details = getAddressDetails(address);
    const ownerPkh = details.paymentCredential?.hash ?? "";

    console.log("  Address (Preview testnet):");
    console.log(`  ${address}\n`);
    console.log(`  Owner PKH: ${ownerPkh}\n`);
    console.log("  Fund this address at:");
    console.log("  https://docs.cardano.org/cardano-testnets/tools/faucet/\n");
    return;
  }

  // Generate fresh private key
  const privateKey = generatePrivateKey();

  // Initialize Lucid to derive address from the key
  const bfKey = process.env.BLOCKFROST_PREVIEW_KEY ?? "";
  const lucid = await Lucid(new Blockfrost("https://cardano-preview.blockfrost.io/api/v0", bfKey), "Preview");
  lucid.selectWallet.fromPrivateKey(privateKey);
  const address = await lucid.wallet().address();
  const details = getAddressDetails(address);
  const ownerPkh = details.paymentCredential?.hash ?? "";

  console.log("  ✅ New private key generated\n");
  console.log("  ┌─────────────────────────────────────────────────┐");
  console.log(`  │  AGENT_PRIVATE_KEY=${privateKey}`);
  console.log(`  │  OWNER_PKH=${ownerPkh}`);
  console.log("  └─────────────────────────────────────────────────┘\n");
  console.log("  Preview testnet address:");
  console.log(`  ${address}\n`);

  // Write to .env
  const hasKey   = envContent.includes("AGENT_PRIVATE_KEY=");
  const hasOwner = envContent.includes("OWNER_PKH=");
  const hasAddr  = envContent.includes("AGENT_ADDRESS=");

  let newEnv = envContent;
  if (hasKey)   newEnv = newEnv.replace(/^AGENT_PRIVATE_KEY=.*$/m, `AGENT_PRIVATE_KEY=${privateKey}`);
  else          newEnv += `\nAGENT_PRIVATE_KEY=${privateKey}`;
  if (hasOwner) newEnv = newEnv.replace(/^OWNER_PKH=.*$/m, `OWNER_PKH=${ownerPkh}`);
  else          newEnv += `\nOWNER_PKH=${ownerPkh}`;
  if (hasAddr)  newEnv = newEnv.replace(/^AGENT_ADDRESS=.*$/m, `AGENT_ADDRESS=${address}`);
  else          newEnv += `\nAGENT_ADDRESS=${address}`;

  writeFileSync(ENV_PATH, newEnv.trim() + "\n");
  console.log("  ✅ Key saved to .env\n");
  console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  NEXT STEP: Fund the address from the testnet faucet");
  console.log("  https://docs.cardano.org/cardano-testnets/tools/faucet/");
  console.log("  Then run:  npx tsx sdk/scripts/deploy-wallet.ts");
  console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch(err => { console.error(err); process.exit(1); });
