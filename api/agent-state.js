/**
 * Vercel serverless function — live on-chain agent wallet state
 *
 * GET /api/agent-state
 *
 * Reads the script UTxO from Blockfrost, decodes the WalletDatum,
 * and returns the live guardrail rules + window state as JSON.
 * Falls back to "not deployed" if the env vars aren't set.
 */

const BF_BASE = "https://cardano-preview.blockfrost.io/api/v0";
const WINDOW_MS = 86_400_000; // 24h in ms

// ── Minimal CBOR / Plutus Data decoder ────────────────────────────────────────
// We decode the inline datum from Blockfrost's hex string without the full
// lucid-cardano package — just enough to pull out the 8 WalletDatum fields.

/**
 * Parse an integer from Plutus CBOR encoding.
 * Returns { value: bigint, bytesConsumed: number }
 */
function readCborInt(hex, offset) {
  const b = parseInt(hex.slice(offset, offset + 2), 16);
  const major = (b >> 5) & 0x7;
  const add    = b & 0x1f;
  if (major !== 0 && major !== 1) return null; // not an integer

  let value;
  let consumed;
  if (add <= 23) {
    value = BigInt(add);
    consumed = 2;
  } else if (add === 24) {
    value = BigInt(parseInt(hex.slice(offset + 2, offset + 4), 16));
    consumed = 4;
  } else if (add === 25) {
    value = BigInt(parseInt(hex.slice(offset + 2, offset + 6), 16));
    consumed = 6;
  } else if (add === 26) {
    value = BigInt(parseInt(hex.slice(offset + 2, offset + 10), 16));
    consumed = 10;
  } else if (add === 27) {
    value = BigInt(parseInt(hex.slice(offset + 2, offset + 18), 16), 16);
    consumed = 18;
  } else {
    return null;
  }
  return { value: major === 1 ? -(value + 1n) : value, consumed };
}

/**
 * Decode the WalletDatum from a Plutus Data CBOR hex string.
 * Field order must match the Aiken definition exactly:
 *   per_tx_cap, daily_cap, allowed_addresses, owner_pkh,
 *   last_window_start, window_spent, is_frozen, thread_token_policy
 *
 * Plutus encodes a product type as: d8799f[field0][field1]…ff
 * (Constr tag 0 = 0xd879, followed by indefinite-length array 0x9f…0xff)
 */
function decodeWalletDatum(datumCbor) {
  try {
    // The datum comes from Blockfrost already CBOR-decoded in some cases,
    // or as raw hex. We try to parse it.
    const hex = datumCbor.startsWith("d879") || datumCbor.startsWith("D879")
      ? datumCbor
      : datumCbor;

    // Quick sanity: must start with Constr(0) marker d87980 or d8799f...
    if (!hex.toLowerCase().startsWith("d879")) {
      return null;
    }

    // Use a simple positional parser for the 8 known fields.
    // We rely on lucid-cardano-style encoding (validated by SDK tests):
    // Constr(0) wraps all 8 fields. We scan forward finding each field type.

    let cursor = 0;
    const h = hex.toLowerCase();

    // Skip Constr tag (d87 = tag 121 encoding) and array header
    // d8799f = Constr 0 + indefinite array start
    // Move past the outer wrapper
    if (h.startsWith("d8799f")) {
      cursor = 6; // skip d87 9 9f
    } else if (h.startsWith("d87980")) {
      cursor = 6; // definite empty (shouldn't happen for 8 fields)
    } else {
      cursor = 4; // skip d879
      // skip next byte (array header)
      cursor += 2;
    }

    function readNextInt() {
      const r = readCborInt(h, cursor);
      if (!r) return null;
      cursor += r.consumed;
      return r.value;
    }

    function readNextBytes() {
      const b = parseInt(h.slice(cursor, cursor + 2), 16);
      const major = (b >> 5) & 0x7;
      if (major !== 2) return null; // not bytes
      const add = b & 0x1f;
      let len, headerLen;
      if (add <= 23) {
        len = add; headerLen = 1;
      } else if (add === 24) {
        len = parseInt(h.slice(cursor + 2, cursor + 4), 16); headerLen = 2;
      } else if (add === 25) {
        len = parseInt(h.slice(cursor + 2, cursor + 6), 16); headerLen = 3;
      } else {
        return null;
      }
      const start = cursor + headerLen * 2;
      const bytes = h.slice(start, start + len * 2);
      cursor = start + len * 2;
      return bytes;
    }

    function readNextList() {
      const b = parseInt(h.slice(cursor, cursor + 2), 16);
      const major = (b >> 5) & 0x7;
      if (major !== 4) return null; // not array
      const add = b & 0x1f;
      const items = [];
      if (add === 31) {
        // indefinite length
        cursor += 2;
        while (h.slice(cursor, cursor + 2) !== "ff") {
          const item = readNextBytes();
          if (item === null) break;
          items.push(item);
        }
        cursor += 2; // skip ff
      } else {
        cursor += 2;
        for (let i = 0; i < add; i++) {
          items.push(readNextBytes());
        }
      }
      return items;
    }

    function readNextBool() {
      // Plutus Bool: Constr(0) = False, Constr(1) = True
      // encoded as d87980 (False) or d87a80 (True)
      const tag = h.slice(cursor, cursor + 6);
      if (tag === "d87980") { cursor += 6; return false; }
      if (tag === "d87a80") { cursor += 6; return true; }
      return null;
    }

    const perTxCap      = readNextInt();
    const dailyCap      = readNextInt();
    const allowedAddrs  = readNextList();
    const ownerPkh      = readNextBytes();
    const lastWindowStart = readNextInt();
    const windowSpent   = readNextInt();
    const isFrozen      = readNextBool();
    const threadTokenPolicy = readNextBytes();

    if (perTxCap === null || dailyCap === null) return null;

    return {
      perTxCap, dailyCap, allowedAddrs, ownerPkh,
      lastWindowStart, windowSpent, isFrozen, threadTokenPolicy,
    };
  } catch {
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const scriptAddress = process.env.BENI_SCRIPT_ADDRESS;
  const bfKey         = process.env.BLOCKFROST_PREVIEW_KEY;

  if (!scriptAddress || !bfKey) {
    return res.status(200).json({
      deployed: false,
      message: "Agent wallet not yet deployed. Run: npx tsx sdk/scripts/deploy-wallet.ts",
    });
  }

  const headers = { project_id: bfKey, "Content-Type": "application/json" };

  try {
    // 1. Fetch all UTxOs at the script address
    const utxosRes = await fetch(`${BF_BASE}/addresses/${scriptAddress}/utxos`, { headers });
    if (!utxosRes.ok) {
      if (utxosRes.status === 404) {
        return res.status(200).json({ deployed: true, funded: false, scriptAddress });
      }
      throw new Error(`Blockfrost ${utxosRes.status}: ${await utxosRes.text()}`);
    }

    const utxos = await utxosRes.json();
    if (!utxos.length) {
      return res.status(200).json({ deployed: true, funded: false, scriptAddress });
    }

    // 2. Find the UTxO carrying the thread token (the authoritative state UTxO)
    const threadTokenPolicy = process.env.BENI_THREAD_TOKEN_POLICY ?? "";
    let stateUtxo = utxos.find(u =>
      u.amount?.some(a => a.unit === threadTokenPolicy)
    ) ?? utxos[0];

    // 3. Fetch inline datum from Blockfrost
    let datum = null;
    if (stateUtxo.inline_datum) {
      datum = decodeWalletDatum(stateUtxo.inline_datum);
    } else if (stateUtxo.data_hash) {
      const datumRes = await fetch(`${BF_BASE}/scripts/datum/${stateUtxo.data_hash}`, { headers });
      if (datumRes.ok) {
        const datumJson = await datumRes.json();
        datum = decodeWalletDatum(datumJson.cbor ?? "");
      }
    }

    // 4. Calculate balance
    const lovelace = stateUtxo.amount?.find(a => a.unit === "lovelace")?.quantity ?? "0";
    const balanceAda = Number(lovelace) / 1_000_000;

    // 5. Compute window state
    const nowMs = Date.now();
    let windowState = { windowSpentAda: 0, dailyCapAda: 0, perTxCapAda: 0, pctUsed: 0, isFrozen: false, windowResetMs: 0 };
    if (datum) {
      const spent = Number(datum.windowSpent) / 1_000_000;
      const dailyCap = Number(datum.dailyCap) / 1_000_000;
      const perTxCap = Number(datum.perTxCap) / 1_000_000;
      const lastStart = Number(datum.lastWindowStart);
      const inWindow = nowMs - lastStart < WINDOW_MS;
      const effectiveSpent = inWindow ? spent : 0;
      const windowResetMs = inWindow ? (lastStart + WINDOW_MS) : nowMs;

      windowState = {
        windowSpentAda: effectiveSpent,
        dailyCapAda: dailyCap,
        perTxCapAda: perTxCap,
        pctUsed: dailyCap > 0 ? Math.round((effectiveSpent / dailyCap) * 100) : 0,
        isFrozen: datum.isFrozen ?? false,
        windowResetMs,
        inWindow,
        allowedAddressCount: datum.allowedAddrs?.length ?? 0,
        ownerPkh: datum.ownerPkh ?? "",
        threadTokenPolicy: datum.threadTokenPolicy ?? threadTokenPolicy,
      };
    }

    // 6. Recent transactions at the script address
    const txsRes = await fetch(
      `${BF_BASE}/addresses/${scriptAddress}/transactions?count=10&order=desc`,
      { headers }
    );
    const txs = txsRes.ok ? await txsRes.json() : [];

    // 7. Operator wallet balance (the key that deployed the contract)
    let operatorBalanceAda = null;
    const agentAddress = process.env.AGENT_ADDRESS;
    if (agentAddress) {
      try {
        const opRes = await fetch(`${BF_BASE}/addresses/${agentAddress}`, { headers });
        if (opRes.ok) {
          const opData = await opRes.json();
          const opLovelace = opData.amount?.find(a => a.unit === "lovelace")?.quantity ?? "0";
          operatorBalanceAda = Number(opLovelace) / 1_000_000;
        }
      } catch { /* non-fatal */ }
    }

    return res.status(200).json({
      deployed: true,
      funded: true,
      scriptAddress,
      balanceAda,
      lovelace,
      operatorBalanceAda,
      operatorAddress: agentAddress ?? null,
      txCount: txs.length,
      recentTxs: txs.slice(0, 5),
      rules: datum ? windowState : null,
      rawDatum: stateUtxo.inline_datum ?? null,
      threadTokenPolicy,
    });

  } catch (err) {
    console.error("[Beni] agent-state error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
