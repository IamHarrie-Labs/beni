import { Lucid, Blockfrost } from "@lucid-evolution/lucid";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(import.meta.dirname, "../.env");
const lines = readFileSync(envPath, "utf-8").split("\n");
const env: Record<string, string> = {};
for (const line of lines) {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k] = v.join("=");
}

const lucid = await Lucid(
  new Blockfrost("https://cardano-preview.blockfrost.io/api/v0", env.BLOCKFROST_PREVIEW_KEY),
  "Preview"
);
lucid.selectWallet.fromPrivateKey(env.AGENT_PRIVATE_KEY);
const utxos = await lucid.wallet().getUtxos();
const total = utxos.reduce((s, u) => s + (u.assets.lovelace ?? 0n), 0n);
console.log(`\n  Balance: ${(Number(total) / 1_000_000).toFixed(2)} tADA`);
console.log(`  UTxOs:   ${utxos.length}`);
console.log(`  Address: ${await lucid.wallet().address()}\n`);
if (Number(total) >= 8_000_000) {
  console.log("  Ready to deploy wallet.\n");
} else {
  console.log("  Need at least 8 tADA — fund from faucet first.\n");
}
