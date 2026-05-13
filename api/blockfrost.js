/**
 * Vercel serverless function — Blockfrost proxy
 * Keeps the Blockfrost API key server-side and converts CIP-30 hex addresses to bech32.
 *
 * GET /api/blockfrost?action=address&addr=<hex-or-bech32>
 * GET /api/blockfrost?action=txs&addr=<hex-or-bech32>
 */

// ── Minimal embedded bech32 encoder (no extra deps) ───────────────────────────
const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function polymod(values) {
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}

function hrpExpand(hrp) {
  const r = [];
  for (const c of hrp) r.push(c.charCodeAt(0) >> 5);
  r.push(0);
  for (const c of hrp) r.push(c.charCodeAt(0) & 31);
  return r;
}

function createChecksum(hrp, data) {
  const mod = polymod([...hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0]) ^ 1;
  return Array.from({ length: 6 }, (_, i) => (mod >> (5 * (5 - i))) & 31);
}

function bytesToWords(bytes) {
  let value = 0, bits = 0;
  const result = [];
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result.push((value >> bits) & 31);
    }
  }
  if (bits > 0) result.push((value << (5 - bits)) & 31);
  return result;
}

function bech32Encode(hrp, words) {
  const combined = [...words, ...createChecksum(hrp, words)];
  return hrp + "1" + combined.map((i) => CHARSET[i]).join("");
}

/**
 * Convert a CIP-30 hex address to bech32.
 *
 * CIP-30 wallets return raw address bytes as hex (CIP-19 format).
 * Some wallets CBOR-wrap the bytes — we strip the wrapper if present.
 * Network bit (low nibble of header byte): 0 = testnet, 1 = mainnet.
 */
function hexToBech32(hexAddr) {
  let hex = hexAddr.toLowerCase().replace(/^0x/, "");

  // Strip CBOR byte-string wrapper if present (58 NN or 59 NNNN)
  const fb = parseInt(hex.slice(0, 2), 16);
  if (fb === 0x58) hex = hex.slice(4);
  else if (fb === 0x59) hex = hex.slice(6);

  const bytes = Buffer.from(hex, "hex");
  const networkId = bytes[0] & 0x0f;
  const hrp = networkId === 1 ? "addr" : "addr_test";
  return bech32Encode(hrp, bytesToWords(bytes));
}

// ── Handler ───────────────────────────────────────────────────────────────────
const BF_BASE = "https://cardano-preview.blockfrost.io/api/v0";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const apiKey = process.env.BLOCKFROST_PREVIEW_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "BLOCKFROST_PREVIEW_KEY not configured — add it in Vercel environment variables",
    });
  }

  const { action, addr } = req.query;
  if (!addr) return res.status(400).json({ error: "addr query param required" });

  // Convert CIP-30 hex → bech32 if needed
  let bech32Addr = addr;
  if (!addr.startsWith("addr")) {
    try {
      bech32Addr = hexToBech32(addr);
    } catch (e) {
      return res.status(400).json({ error: "Address conversion failed: " + e.message });
    }
  }

  const headers = { project_id: apiKey, "Content-Type": "application/json" };

  try {
    if (action === "address") {
      const r = await fetch(`${BF_BASE}/addresses/${bech32Addr}`, { headers });
      if (r.status === 404) {
        // New address — never used on chain yet
        return res.status(200).json({ address: bech32Addr, bech32: bech32Addr, amount: [], tx_count: 0 });
      }
      const data = await r.json();
      return res.status(r.status).json({ ...data, bech32: bech32Addr });
    }

    if (action === "txs") {
      const r = await fetch(
        `${BF_BASE}/addresses/${bech32Addr}/transactions?count=10&order=desc`,
        { headers },
      );
      if (r.status === 404) return res.status(200).json([]);
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error("[Beni] Blockfrost error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
