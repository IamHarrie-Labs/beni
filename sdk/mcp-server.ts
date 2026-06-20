/**
 * Beni MCP Server
 *
 * Exposes Beni guardrail tools to any MCP-compatible AI agent (Claude, etc.)
 * The agent never needs to know about Lucid, Aiken, or Blockfrost.
 *
 * Tools:
 *   check_limits   — validate a proposed spend offline, instant
 *   get_status     — current caps, daily usage, frozen state
 *   spend          — submit a guarded spend to chain
 *   freeze         — emergency freeze the wallet
 *   create_wallet  — deploy a new Beni wallet on Preview testnet
 *
 * Usage:
 *   npx tsx sdk/mcp-server.ts
 *
 * Claude Desktop config (see claude-desktop-config.example.json):
 *   "beni": { "command": "npx", "args": ["tsx", "<abs-path>/sdk/mcp-server.ts"] }
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { validateSpend, msUntilWindowReset } from "./src/validation.js";
import type { GuardrailConfig, BeniWallet } from "./src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = resolve(__dirname, "..");
const STATE_PATH = resolve(ROOT, "beni-wallet-state.json");
const ENV_PATH   = resolve(ROOT, ".env");

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function loadEnv() {
  if (!existsSync(ENV_PATH)) return;
  const lines = readFileSync(ENV_PATH, "utf-8").split("\n");
  for (const line of lines) {
    const [k, ...v] = line.trim().split("=");
    if (k && v.length && !process.env[k]) {
      process.env[k] = v.join("=").replace(/^["']|["']$/g, "");
    }
  }
}

loadEnv();

const BLOCKFROST_KEY = process.env.BLOCKFROST_PREVIEW_KEY ?? "";
const AGENT_KEY      = process.env.AGENT_PRIVATE_KEY      ?? "";

// ── State helpers ─────────────────────────────────────────────────────────────

type WalletState = { config: GuardrailConfig; scriptAddress: string; scriptCbor: string; threadTokenPolicyCbor: string };

function loadState(): WalletState | null {
  if (!existsSync(STATE_PATH)) return null;
  try {
    const raw = JSON.parse(readFileSync(STATE_PATH, "utf-8"));
    return {
      scriptAddress:        raw.scriptAddress,
      scriptCbor:           raw.scriptCbor,
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
  } catch {
    return null;
  }
}

const ada = (lovelace: bigint) => `₳ ${(Number(lovelace) / 1_000_000).toFixed(2)}`;

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  {
    name: "check_limits",
    description:
      "Check if a proposed ADA spend would be allowed by the Beni guardrails. " +
      "Runs offline instantly — no chain interaction. Use this before spend() to confirm the tx won't be rejected.",
    inputSchema: {
      type: "object" as const,
      properties: {
        amount_ada: { type: "number", description: "ADA to send (e.g. 1.5)" },
        to_address: { type: "string", description: "Destination Cardano address (optional — used to check whitelist)" },
      },
      required: ["amount_ada"],
    },
  },
  {
    name: "get_status",
    description:
      "Get current Beni wallet status: caps, how much has been spent today, frozen state, " +
      "and time until the 24h window resets.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "spend",
    description:
      "Submit a guarded spend from the Beni agent wallet. Guardrails are enforced on-chain — " +
      "will fail if amount exceeds per-tx cap, daily cap, or wallet is frozen. " +
      "Requires BLOCKFROST_PREVIEW_KEY + AGENT_PRIVATE_KEY.",
    inputSchema: {
      type: "object" as const,
      properties: {
        amount_ada: { type: "number", description: "ADA to send" },
        to_address: { type: "string", description: "Destination Cardano address" },
        reason:     { type: "string", description: "Reason for the spend (optional, logged locally)" },
      },
      required: ["amount_ada", "to_address"],
    },
  },
  {
    name: "freeze",
    description:
      "Emergency freeze the Beni agent wallet. No spends are possible until the owner unfreezes. " +
      "Use when suspicious activity is detected. Requires BLOCKFROST_PREVIEW_KEY + AGENT_PRIVATE_KEY.",
    inputSchema: {
      type: "object" as const,
      properties: {
        reason: { type: "string", description: "Reason for freezing (optional, logged locally)" },
      },
    },
  },
  {
    name: "create_wallet",
    description:
      "Deploy a new Beni guardrail wallet on Cardano Preview testnet. " +
      "Requires BLOCKFROST_PREVIEW_KEY + AGENT_PRIVATE_KEY and at least ₳ 8 in the agent address.",
    inputSchema: {
      type: "object" as const,
      properties: {
        per_tx_cap_ada: { type: "number", description: "Max ADA per single tx (e.g. 10)" },
        daily_cap_ada:  { type: "number", description: "Max ADA per 24h rolling window (e.g. 100)" },
        initial_ada:    { type: "number", description: "Initial ADA to lock in the wallet (min 5, default 5)" },
      },
      required: ["per_tx_cap_ada", "daily_cap_ada"],
    },
  },
];

// ── Handlers ──────────────────────────────────────────────────────────────────

function handleCheckLimits(args: { amount_ada: number; to_address?: string }) {
  const lovelace = BigInt(Math.round(args.amount_ada * 1_000_000));
  const nowMs    = BigInt(Date.now());
  const state    = loadState();

  const config: GuardrailConfig = state?.config ?? {
    perTxCapLovelace:        500_000_000n,
    dailyCapLovelace:      2_500_000_000n,
    allowedCredentialHashes: [],
    ownerPkh:                "00".repeat(28),
    lastWindowStart:         0n,
    windowSpent:             0n,
    isFrozen:                false,
    threadTokenPolicyId:     "demo",
  };

  // Simplified credential: use address as-is for whitelist check (full hash needs chain)
  const toCredHash = args.to_address ?? "";
  const result = validateSpend(config, toCredHash, lovelace, nowMs);
  const pctUsed = Number(config.windowSpent) / Number(config.dailyCapLovelace) * 100;
  const msLeft  = msUntilWindowReset(config, nowMs);

  return {
    allowed: result.ok,
    reason: result.ok
      ? `${ada(lovelace)} is within limits. Daily usage: ${ada(config.windowSpent)} / ${ada(config.dailyCapLovelace)} (${pctUsed.toFixed(1)}%). Window resets in ${(Number(msLeft) / 3_600_000).toFixed(1)}h.`
      : `Blocked: ${"reason" in result ? result.reason : "guardrail violation"}`,
    limits: {
      per_tx_cap:   ada(config.perTxCapLovelace),
      daily_cap:    ada(config.dailyCapLovelace),
      spent_today:  ada(config.windowSpent),
      is_frozen:    config.isFrozen,
    },
    mode: state ? "live" : "simulation (no wallet deployed)",
  };
}

function handleGetStatus() {
  const state = loadState();
  const nowMs = BigInt(Date.now());

  if (!state) {
    return {
      status: "no_wallet",
      message: "No Beni wallet deployed yet. Run create_wallet to deploy one on Preview testnet.",
      ready_to_deploy: !!(BLOCKFROST_KEY && AGENT_KEY),
    };
  }

  const msLeft  = msUntilWindowReset(state.config, nowMs);
  const pctUsed = Number(state.config.windowSpent) / Number(state.config.dailyCapLovelace) * 100;

  return {
    status:  state.config.isFrozen ? "frozen" : "active",
    wallet:  { script_address: state.scriptAddress, thread_token_policy: state.config.threadTokenPolicyId },
    guardrails: {
      per_tx_cap:        ada(state.config.perTxCapLovelace),
      daily_cap:         ada(state.config.dailyCapLovelace),
      spent_today:       ada(state.config.windowSpent),
      remaining_today:   ada(state.config.dailyCapLovelace - state.config.windowSpent),
      pct_used:          `${pctUsed.toFixed(1)}%`,
      window_resets_in:  `${(Number(msLeft) / 3_600_000).toFixed(1)}h`,
      is_frozen:         state.config.isFrozen,
      whitelist_entries: state.config.allowedCredentialHashes.length,
    },
    on_chain_ops_available: !!(BLOCKFROST_KEY && AGENT_KEY),
  };
}

async function handleSpend(args: { amount_ada: number; to_address: string; reason?: string }) {
  if (!BLOCKFROST_KEY || !AGENT_KEY) {
    return {
      success: false,
      error:   "On-chain spend requires BLOCKFROST_PREVIEW_KEY and AGENT_PRIVATE_KEY in your MCP env config.",
      tip:     "Use check_limits to validate amounts without keys.",
    };
  }

  const state = loadState();
  if (!state) return { success: false, error: "No wallet deployed. Run create_wallet first." };

  if (state.config.isFrozen) return { success: false, error: "Wallet is frozen. Owner must unfreeze first." };

  const lovelace = BigInt(Math.round(args.amount_ada * 1_000_000));

  try {
    const { makeLucid }  = await import("./src/lucid-setup.js");
    const { agentSpend } = await import("./src/index.js");

    const lucid = await makeLucid({ network: "Preview", blockfrostApiKey: BLOCKFROST_KEY });
    lucid.selectWallet.fromPrivateKey(AGENT_KEY);

    const wallet: BeniWallet = {
      scriptAddress:         state.scriptAddress,
      scriptCbor:            state.scriptCbor,
      threadTokenPolicyCbor: state.threadTokenPolicyCbor,
      config:                state.config,
    };

    const result = await agentSpend(lucid, wallet, args.to_address, lovelace);

    return {
      success:         true,
      tx_hash:         result.txHash,
      amount_sent:     ada(lovelace),
      to_address:      args.to_address,
      reason:          args.reason ?? null,
      new_window_spent: ada(result.newConfig.windowSpent),
      daily_cap:        ada(result.newConfig.dailyCapLovelace),
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function handleFreeze(args: { reason?: string }) {
  if (!BLOCKFROST_KEY || !AGENT_KEY) {
    return { success: false, error: "freeze requires BLOCKFROST_PREVIEW_KEY and AGENT_PRIVATE_KEY." };
  }

  const state = loadState();
  if (!state)              return { success: false, error: "No wallet deployed." };
  if (state.config.isFrozen) return { success: false, error: "Wallet is already frozen." };

  try {
    const { makeLucid }    = await import("./src/lucid-setup.js");
    const { freezeWallet } = await import("./src/index.js");

    const lucid = await makeLucid({ network: "Preview", blockfrostApiKey: BLOCKFROST_KEY });
    lucid.selectWallet.fromPrivateKey(AGENT_KEY);

    const wallet: BeniWallet = {
      scriptAddress:         state.scriptAddress,
      scriptCbor:            state.scriptCbor,
      threadTokenPolicyCbor: state.threadTokenPolicyCbor,
      config:                state.config,
    };

    const txHash = await freezeWallet(lucid, wallet);

    return {
      success:  true,
      tx_hash:  txHash,
      reason:   args.reason ?? null,
      message:  "Wallet frozen. No spends possible until owner unfreezes via ownerAction().",
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function handleCreateWallet(args: { per_tx_cap_ada: number; daily_cap_ada: number; initial_ada?: number }) {
  if (!BLOCKFROST_KEY || !AGENT_KEY) {
    return {
      success: false,
      error:   "create_wallet requires BLOCKFROST_PREVIEW_KEY and AGENT_PRIVATE_KEY.",
      tip:     "Add them to the env section in your claude_desktop_config.json for this server.",
    };
  }

  if (existsSync(STATE_PATH)) {
    const existing = JSON.parse(readFileSync(STATE_PATH, "utf-8"));
    return {
      success: false,
      error:   "A wallet is already deployed.",
      existing: { script_address: existing.scriptAddress, deployed_at: existing.deployedAt },
      tip:     "Delete beni-wallet-state.json to deploy a fresh wallet.",
    };
  }

  try {
    const { makeLucid }        = await import("./src/lucid-setup.js");
    const { createAgentWallet } = await import("./src/index.js");
    const { getAddressDetails } = await import("@lucid-evolution/lucid");

    const lucid = await makeLucid({ network: "Preview", blockfrostApiKey: BLOCKFROST_KEY });
    lucid.selectWallet.fromPrivateKey(AGENT_KEY);
    const address = await lucid.wallet().address();
    const ownerPkh = getAddressDetails(address).paymentCredential?.hash ?? "";

    const config = {
      perTxCapLovelace:        BigInt(Math.round(args.per_tx_cap_ada * 1_000_000)),
      dailyCapLovelace:        BigInt(Math.round(args.daily_cap_ada  * 1_000_000)),
      allowedCredentialHashes: [] as string[],
      ownerPkh,
      isFrozen: false,
    };

    const initialAda = BigInt(Math.round(args.initial_ada ?? 5));
    const wallet     = await createAgentWallet(lucid, config, initialAda);

    await new Promise(r => setTimeout(r, 2000));
    const scriptUtxos  = await lucid.utxosAt(wallet.scriptAddress);
    const deployTxHash = scriptUtxos[0]?.txHash ?? "pending-confirmation";

    const stateFile = {
      scriptAddress:         wallet.scriptAddress,
      scriptCbor:            wallet.scriptCbor,
      threadTokenPolicyCbor: wallet.threadTokenPolicyCbor,
      threadTokenPolicyId:   wallet.config.threadTokenPolicyId,
      ownerPkh:              wallet.config.ownerPkh,
      perTxCapLovelace:      wallet.config.perTxCapLovelace.toString(),
      dailyCapLovelace:      wallet.config.dailyCapLovelace.toString(),
      allowedCredentialHashes: [],
      lastWindowStart:       wallet.config.lastWindowStart.toString(),
      windowSpent:           "0",
      isFrozen:              false,
      deployTxHash,
      network:               "Preview",
      deployedAt:            new Date().toISOString(),
    };

    writeFileSync(STATE_PATH, JSON.stringify(stateFile, null, 2));

    return {
      success:           true,
      script_address:    wallet.scriptAddress,
      thread_token_policy: wallet.config.threadTokenPolicyId,
      guardrails: {
        per_tx_cap: ada(wallet.config.perTxCapLovelace),
        daily_cap:  ada(wallet.config.dailyCapLovelace),
      },
      deploy_tx: deployTxHash,
      message:   "Wallet deployed. State saved to beni-wallet-state.json.",
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Server ────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "beni", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    let result: unknown;
    if      (name === "check_limits")   result = handleCheckLimits(args as Parameters<typeof handleCheckLimits>[0]);
    else if (name === "get_status")     result = handleGetStatus();
    else if (name === "spend")          result = await handleSpend(args as Parameters<typeof handleSpend>[0]);
    else if (name === "freeze")         result = await handleFreeze(args as Parameters<typeof handleFreeze>[0]);
    else if (name === "create_wallet")  result = await handleCreateWallet(args as Parameters<typeof handleCreateWallet>[0]);
    else                                result = { error: `Unknown tool: ${name}` };

    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  } catch (err: unknown) {
    return {
      content:  [{ type: "text" as const, text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }) }],
      isError:  true,
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error("[Beni MCP] Ready. Tools: check_limits, get_status, spend, freeze, create_wallet");
}).catch(err => { console.error("[Beni MCP] Fatal:", err); process.exit(1); });
