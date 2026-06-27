/**
 * Wallet context for the Beni Telegram bot.
 *
 * Loads the deployment record (beni-wallet-state.json) produced by the deploy
 * script / dashboard, reconstructs the BeniWallet the SDK expects, and wires up
 * a Lucid instance with the agent key selected so the bot can sign on-chain.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { makeLucid } from "beni-sdk";

const here = dirname(fileURLToPath(import.meta.url));

// Default: the deployment record at the repo root (two levels up from here).
const STATE_PATH =
  process.env.BENI_STATE_PATH || join(here, "..", "..", "beni-wallet-state.json");

/** Read an env var, fail loudly if missing, and strip the Windows BOM/whitespace
 *  that quietly corrupts bech32 keys and addresses (learned the hard way). */
export function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v.replace(/﻿/g, "").trim();
}

export function loadWalletState() {
  if (process.env.BENI_STATE_JSON) return JSON.parse(process.env.BENI_STATE_JSON);
  return JSON.parse(readFileSync(STATE_PATH, "utf-8"));
}

/** Reconstruct the BeniWallet the SDK functions take. The spend/approve calls
 *  re-read live window state from chain, so the dynamic fields here are just
 *  sensible starting values. */
export function buildBeniWallet(state) {
  return {
    scriptAddress: state.scriptAddress,
    scriptCbor: state.scriptCbor,
    threadTokenPolicyCbor: state.threadTokenPolicyCbor,
    config: {
      perTxCapLovelace: BigInt(state.perTxCapLovelace),
      dailyCapLovelace: BigInt(state.dailyCapLovelace),
      allowedCredentialHashes: state.allowedCredentialHashes ?? [],
      ownerPkh: state.ownerPkh,
      lastWindowStart: BigInt(Date.now()),
      windowSpent: 0n,
      isFrozen: false,
      threadTokenPolicyId: state.threadTokenPolicyId,
    },
  };
}

/** One-time boot: load state, build the wallet, select the agent key. */
export async function makeWalletContext() {
  const state = loadWalletState();
  const wallet = buildBeniWallet(state);
  const lucid = await makeLucid({
    network: state.network ?? "Preview",
    blockfrostApiKey: requireEnv("BLOCKFROST_PREVIEW_KEY"),
  });
  lucid.selectWallet.fromPrivateKey(requireEnv("AGENT_PRIVATE_KEY"));
  return { lucid, wallet, state };
}
