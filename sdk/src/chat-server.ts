/**
 * Beni Chat Server
 * A minimal HTTP proxy that calls Claude Haiku on behalf of the dashboard UI.
 * Keeps the API key server-side and adds CORS so the static app can reach it.
 *
 * Run with:  npx tsx src/chat-server.ts
 * Or:        npm run chat
 */
import http from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

// ── Load .env from the repo root if ANTHROPIC_API_KEY isn't already set ──────
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    const envPath = resolve(import.meta.dirname, "../../.env");
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const [k, ...vParts] = line.trim().split("=");
      if (k && vParts.length) process.env[k] = vParts.join("=").replace(/^["']|["']$/g, "");
    }
  } catch {
    // .env not present — rely on environment variable being set externally
  }
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("[Beni] ERROR: ANTHROPIC_API_KEY is not set.");
  console.error("  Create a .env file in the repo root with:  ANTHROPIC_API_KEY=sk-ant-...");
  process.exit(1);
}

const client = new Anthropic({ apiKey });

// ── Tiny bech32 encoder (for CIP-30 hex → bech32 conversion) ─────────────────
const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function bech32Polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= BECH32_GEN[i];
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const r: number[] = [];
  for (const c of hrp) r.push(c.charCodeAt(0) >> 5);
  r.push(0);
  for (const c of hrp) r.push(c.charCodeAt(0) & 31);
  return r;
}

function bech32BytesToWords(bytes: Buffer): number[] {
  let value = 0, bits = 0;
  const result: number[] = [];
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { bits -= 5; result.push((value >> bits) & 31); }
  }
  if (bits > 0) result.push((value << (5 - bits)) & 31);
  return result;
}

function bech32EncodeStr(hrp: string, words: number[]): string {
  const mod = bech32Polymod([...bech32HrpExpand(hrp), ...words, 0, 0, 0, 0, 0, 0]) ^ 1;
  const checksum = Array.from({ length: 6 }, (_, i) => (mod >> (5 * (5 - i))) & 31);
  return hrp + "1" + [...words, ...checksum].map((i) => BECH32_CHARSET[i]).join("");
}

function cardanoHexToBech32(hexAddr: string): string {
  let hex = hexAddr.toLowerCase().replace(/^0x/, "");
  const fb = parseInt(hex.slice(0, 2), 16);
  if (fb === 0x58) hex = hex.slice(4);
  else if (fb === 0x59) hex = hex.slice(6);
  const bytes = Buffer.from(hex, "hex");
  const networkId = bytes[0] & 0x0f;
  const hrp = networkId === 1 ? "addr" : "addr_test";
  return bech32EncodeStr(hrp, bech32BytesToWords(bytes));
}

// ── System prompt — wallet context matches the dashboard mock data ────────────
const SYSTEM = `\
You are Beni, a policy-aware AI assistant built into the Beni agent wallet dashboard.
You help operators understand their AI-agent spending, interpret rule decisions, and take action.

Current wallet context (atlas-trader-v2):
- Balance: ₳ 24,851.27 (≈ $11,439 USD)
- Daily cap: ₳ 2,500 — spent today: ₳ 1,830 (73% used, window resets in ~6h)
- Per-tx cap: ₳ 500
- Whitelist: 12 addresses (Genius Yield router, internal vault, treasury cold, DEX bridge, others)
- Approvals queue: 3 pending (₳ 720 yield-router, ₳ 1,200 atlas-trader, ₳ 4,500 vault-rebalancer)
- Recent rejection: yield-router tried ₳ 2,400 to addr1...x9aa — exceeded daily cap at block 11,402,308
- Other agents: vault-rebalancer (ok, 21%), yield-router (warn, 91%), research-bot (ok, 4%), payments-batch (paused)
- System: Epoch 524 · Block 11,402,318 · Validator v0.4.1 · 28ms median latency

Rules:
- per_tx_cap: ₳ 500 hard ceiling per transaction
- daily_cap_v2: ₳ 2,500 rolling 24h budget
- whitelist_routing: skip approval for 12 trusted addresses
- require_approval: pause for human sign-off on amounts ≥ ₳ 250
- new_address_hold: disabled

Respond concisely (2–4 sentences). Be direct and specific — reference actual amounts, addresses, and block numbers when relevant. If the user asks to take an action (freeze, approve, adjust cap), acknowledge it and explain what would happen on-chain.`;

// ── HTTP server ───────────────────────────────────────────────────────────────
const PORT = 3001;

const server = http.createServer(async (req, res) => {
  // CORS — allow the static app on any local port to call us
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // ── Blockfrost proxy (local dev) ───────────────────────────────────────────
  if (req.method === "GET" && req.url?.startsWith("/api/blockfrost")) {
    const bfKey = process.env.BLOCKFROST_PREVIEW_KEY;
    if (!bfKey) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "BLOCKFROST_PREVIEW_KEY not set in .env" }));
      return;
    }
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const action = url.searchParams.get("action");
    const addr = url.searchParams.get("addr");
    if (!addr) { res.writeHead(400); res.end(JSON.stringify({ error: "addr required" })); return; }

    let bech32Addr = addr;
    if (!addr.startsWith("addr")) {
      try { bech32Addr = cardanoHexToBech32(addr); }
      catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Address conversion failed: " + msg }));
        return;
      }
    }

    const BF_BASE = "https://cardano-preview.blockfrost.io/api/v0";
    const headers = { project_id: bfKey, "Content-Type": "application/json" };

    try {
      let bfUrl = "";
      if (action === "address") bfUrl = `${BF_BASE}/addresses/${bech32Addr}`;
      else if (action === "txs") bfUrl = `${BF_BASE}/addresses/${bech32Addr}/transactions?count=10&order=desc`;
      else { res.writeHead(400); res.end(JSON.stringify({ error: "unknown action" })); return; }

      const bfRes = await fetch(bfUrl, { headers });
      if (bfRes.status === 404) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(action === "txs"
          ? JSON.stringify([])
          : JSON.stringify({ address: bech32Addr, bech32: bech32Addr, amount: [], tx_count: 0 }));
        return;
      }
      const bfData = await bfRes.json() as unknown;
      res.writeHead(bfRes.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(action === "address" ? { ...(bfData as object), bech32: bech32Addr } : bfData));
      console.log(`[Beni] Blockfrost · ${action} · ${bech32Addr.slice(0, 20)}…`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: msg }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/chat") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { messages } = JSON.parse(body) as {
          messages: Array<{ role: "user" | "assistant"; content: string }>;
        };

        const response = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,          // keep costs low — enough for a crisp reply
          system: SYSTEM,
          messages,
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "";
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ text }));

        console.log(
          `[Beni] Chat · ${response.usage.input_tokens}in + ${response.usage.output_tokens}out tokens`,
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Beni] Chat error:", msg);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: msg }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`[Beni] Chat server ready → http://localhost:${PORT}/api/chat`);
  console.log(`[Beni] Model: claude-haiku-4-5-20251001 · max_tokens: 300`);
});
