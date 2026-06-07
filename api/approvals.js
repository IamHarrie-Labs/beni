/**
 * Vercel serverless function — persistent approvals queue.
 *
 * Storage: Vercel KV (Upstash Redis) if KV_REST_API_URL + KV_REST_API_TOKEN
 * are set in env; otherwise falls back to an in-memory store (loses state
 * on cold start — fine for dev, not for production).
 *
 * Endpoints
 *   GET    /api/approvals                    → { pending: [...], all: [...] }
 *   POST   /api/approvals       body={...}   → create a new pending spend
 *   PATCH  /api/approvals?id=…  body={status} → update status (approved | rejected)
 *   DELETE /api/approvals?id=…               → remove an entry
 *
 * Queue entry shape:
 *   {
 *     id:          string  (uuid)
 *     toAddress:   string
 *     lovelace:    string  (bigint serialised)
 *     ada:         number
 *     reason:      string
 *     requestedAt: number  (unix ms)
 *     status:      "pending" | "approved" | "rejected"
 *     txHash?:     string  (set after approveSpend on-chain confirms)
 *   }
 */

const KV_KEY = "beni:approvals";

// ── KV adapter ────────────────────────────────────────────────────────────────
// Imports @vercel/kv only if the env vars are present, otherwise uses
// a module-level Map. Keeps the function deployable without KV configured.

let kvClient = null;
let memoryStore = []; // fallback only — module-scope = warm-invocation persistence

async function getKv() {
  if (kvClient !== null) return kvClient;
  const hasKv = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
  if (!hasKv) {
    kvClient = false; // sentinel: "no KV available"
    return false;
  }
  try {
    const mod = await import("@vercel/kv");
    kvClient = mod.kv;
    return kvClient;
  } catch {
    kvClient = false;
    return false;
  }
}

async function readQueue() {
  const kv = await getKv();
  if (!kv) return memoryStore;
  const raw = await kv.get(KV_KEY);
  return Array.isArray(raw) ? raw : [];
}

async function writeQueue(queue) {
  const kv = await getKv();
  if (!kv) { memoryStore = queue; return; }
  await kv.set(KV_KEY, queue);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uuid() {
  // Lightweight UUID v4-ish — fine for queue IDs, not for security tokens.
  const hex = [];
  for (let i = 0; i < 16; i++) hex.push(((Math.random() * 256) | 0).toString(16).padStart(2, "0"));
  hex[6] = (parseInt(hex[6], 16) & 0x0f | 0x40).toString(16).padStart(2, "0");
  hex[8] = (parseInt(hex[8], 16) & 0x3f | 0x80).toString(16).padStart(2, "0");
  return `${hex.slice(0,4).join("")}-${hex.slice(4,6).join("")}-${hex.slice(6,8).join("")}-${hex.slice(8,10).join("")}-${hex.slice(10,16).join("")}`;
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end",  () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const kv = await getKv();
    const persistent = Boolean(kv);

    // GET — list pending + all
    if (req.method === "GET") {
      const queue = await readQueue();
      return res.status(200).json({
        persistent,
        pending: queue.filter((q) => q.status === "pending"),
        all:     queue,
      });
    }

    // POST — create a new pending spend
    if (req.method === "POST") {
      const body = await readBody(req);
      const { toAddress, ada, lovelace, reason } = body || {};

      if (!toAddress || typeof toAddress !== "string") {
        return res.status(400).json({ error: "toAddress required" });
      }
      const adaNum = Number(ada);
      if (!Number.isFinite(adaNum) || adaNum <= 0) {
        return res.status(400).json({ error: "ada must be a positive number" });
      }

      const queue = await readQueue();
      const entry = {
        id:          uuid(),
        toAddress,
        ada:         adaNum,
        lovelace:    lovelace ?? String(Math.round(adaNum * 1_000_000)),
        reason:      typeof reason === "string" ? reason.slice(0, 280) : "",
        requestedAt: Date.now(),
        status:      "pending",
      };
      queue.unshift(entry); // newest first
      await writeQueue(queue.slice(0, 100)); // cap at 100 entries

      return res.status(201).json({ persistent, entry });
    }

    // PATCH — update status (approve / reject)
    if (req.method === "PATCH") {
      const id = req.query?.id ?? new URL(req.url, "http://x").searchParams.get("id");
      if (!id) return res.status(400).json({ error: "id query param required" });

      const body = await readBody(req);
      const status = body?.status;
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
      }

      const queue = await readQueue();
      const idx = queue.findIndex((q) => q.id === id);
      if (idx === -1) return res.status(404).json({ error: "entry not found" });

      queue[idx] = {
        ...queue[idx],
        status,
        ...(body?.txHash ? { txHash: body.txHash } : {}),
        decidedAt: Date.now(),
      };
      await writeQueue(queue);

      return res.status(200).json({ persistent, entry: queue[idx] });
    }

    // DELETE — remove an entry
    if (req.method === "DELETE") {
      const id = req.query?.id ?? new URL(req.url, "http://x").searchParams.get("id");
      if (!id) return res.status(400).json({ error: "id query param required" });

      const queue = await readQueue();
      const next = queue.filter((q) => q.id !== id);
      await writeQueue(next);
      return res.status(200).json({ persistent, removed: queue.length - next.length });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });

  } catch (err) {
    console.error("[Beni] approvals error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
