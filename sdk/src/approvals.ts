import { randomUUID } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import type { LucidEvolution as Lucid } from "@lucid-evolution/lucid";
import { Constr, Data } from "@lucid-evolution/lucid";
import type { BeniWallet } from "./types.js";
import { makeScript } from "./index-internal.js";
import { NoScriptUTxOError } from "./errors.js";
import { encodeDatum, WalletDatumSchema, type WalletDatumType, datumToConfig } from "./datum.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PendingSpend = {
  id: string;
  toAddress: string;
  lovelace: bigint;
  /** Human-readable context from the chatbot or calling code */
  reason: string;
  requestedAt: Date;
  status: "pending" | "approved" | "rejected";
};

// Serializable form for JSON storage (bigint → string)
type SerializedPendingSpend = Omit<PendingSpend, "lovelace" | "requestedAt"> & {
  lovelace: string;
  requestedAt: string;
};

// ── Persistence ───────────────────────────────────────────────────────────────
// Two backends:
//   1. Remote HTTP store — set BENI_APPROVALS_API to point at /api/approvals.
//      The Vercel function persists via @vercel/kv if KV is configured.
//      This is the production backend, shared with the web dashboard.
//   2. File store        — local JSON file, used for offline dev and tests.
//      Selected automatically when BENI_APPROVALS_API is not set.

const APPROVALS_API = process.env.BENI_APPROVALS_API;
const USE_REMOTE    = typeof APPROVALS_API === "string" && APPROVALS_API.length > 0;

function storePath(wallet: BeniWallet): string {
  return `.beni-approvals-${wallet.scriptAddress.slice(-8)}.json`;
}

function loadQueueFromFile(wallet: BeniWallet): PendingSpend[] {
  const path = storePath(wallet);
  if (!existsSync(path)) return [];
  const raw: SerializedPendingSpend[] = JSON.parse(readFileSync(path, "utf-8"));
  return raw.map((r) => ({
    ...r,
    lovelace: BigInt(r.lovelace),
    requestedAt: new Date(r.requestedAt),
  }));
}

function saveQueueToFile(wallet: BeniWallet, queue: PendingSpend[]): void {
  const serialized: SerializedPendingSpend[] = queue.map((p) => ({
    ...p,
    lovelace: p.lovelace.toString(),
    requestedAt: p.requestedAt.toISOString(),
  }));
  writeFileSync(storePath(wallet), JSON.stringify(serialized, null, 2));
}

// Remote entry shape (matches api/approvals.js)
type RemoteEntry = {
  id: string;
  toAddress: string;
  lovelace: string;
  ada: number;
  reason: string;
  requestedAt: number;
  status: "pending" | "approved" | "rejected";
  txHash?: string;
};

function fromRemote(r: RemoteEntry): PendingSpend {
  return {
    id:          r.id,
    toAddress:   r.toAddress,
    lovelace:    BigInt(r.lovelace),
    reason:      r.reason ?? "",
    requestedAt: new Date(r.requestedAt),
    status:      r.status,
  };
}

async function loadQueue(wallet: BeniWallet): Promise<PendingSpend[]> {
  if (!USE_REMOTE) return loadQueueFromFile(wallet);
  const res = await fetch(APPROVALS_API as string);
  if (!res.ok) throw new Error(`approvals API ${res.status}`);
  const data: { all: RemoteEntry[] } = await res.json();
  return (data.all ?? []).map(fromRemote);
}

async function postRemote(toAddress: string, lovelace: bigint, reason: string): Promise<PendingSpend> {
  const ada = Number(lovelace) / 1_000_000;
  const res = await fetch(APPROVALS_API as string, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ toAddress, lovelace: lovelace.toString(), ada, reason }),
  });
  if (!res.ok) throw new Error(`approvals API ${res.status}`);
  const { entry } = (await res.json()) as { entry: RemoteEntry };
  return fromRemote(entry);
}

async function patchRemote(id: string, status: "approved" | "rejected", txHash?: string): Promise<void> {
  const res = await fetch(`${APPROVALS_API}?id=${encodeURIComponent(id)}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ status, ...(txHash ? { txHash } : {}) }),
  });
  if (!res.ok) throw new Error(`approvals API ${res.status}`);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Queue a spend that exceeds the per-tx cap for owner approval.
 * The agent calls this instead of agentSpend() when lovelace > per_tx_cap.
 */
export async function queueSpend(
  wallet: BeniWallet,
  toAddress: string,
  lovelace: bigint,
  reason: string,
): Promise<PendingSpend> {
  if (USE_REMOTE) {
    return postRemote(toAddress, lovelace, reason);
  }
  const pending: PendingSpend = {
    id: randomUUID(),
    toAddress,
    lovelace,
    reason,
    requestedAt: new Date(),
    status: "pending",
  };

  const queue = loadQueueFromFile(wallet);
  queue.push(pending);
  saveQueueToFile(wallet, queue);

  return pending;
}

/**
 * Returns all pending spend requests for this wallet.
 */
export async function getPendingSpends(wallet: BeniWallet): Promise<PendingSpend[]> {
  const queue = await loadQueue(wallet);
  return queue.filter((p) => p.status === "pending");
}

/**
 * Owner approves a queued spend. Uses OwnerAction redeemer so the owner
 * co-signs the transaction — satisfying the above-cap co-signer requirement.
 *
 * @param lucid     - Lucid instance with the OWNER wallet selected
 * @param wallet    - BeniWallet
 * @param pendingId - ID of the pending spend to approve
 */
export async function approveSpend(
  lucid: Lucid,
  wallet: BeniWallet,
  pendingId: string,
): Promise<string> {
  const queue = await loadQueue(wallet);
  const pending = queue.find((p) => p.id === pendingId && p.status === "pending");
  if (!pending) throw new Error(`No pending spend with id ${pendingId}`);

  const utxos = await lucid.utxosAt(wallet.scriptAddress);
  if (utxos.length === 0) throw new NoScriptUTxOError(wallet.scriptAddress);

  const utxo = utxos[0];
  const rawDatum = utxo.datum ?? utxo.datumHash;
  if (!rawDatum) throw new Error("Script UTxO has no inline datum");

  const currentConfig = datumToConfig(Data.from<WalletDatumType>(rawDatum, WalletDatumSchema as unknown as WalletDatumType));
  const script = makeScript(wallet.scriptCbor);
  const threadTokenUnit = wallet.config.threadTokenPolicyId + "";
  const currentLovelace = utxo.assets.lovelace ?? 0n;
  const continuingLovelace = currentLovelace - pending.lovelace - 300_000n;

  // Keep config unchanged — owner action bypasses window tracking
  const newDatumCbor = encodeDatum(currentConfig);

  const OwnerActionRedeemer = Data.to(new Constr(1, []));

  const txSignBuilder = await lucid
    .newTx()
    .collectFrom([utxo], OwnerActionRedeemer)
    .attach.SpendingValidator(script)
    .pay.ToContract(
      wallet.scriptAddress,
      { kind: "inline", value: newDatumCbor },
      { lovelace: continuingLovelace, [threadTokenUnit]: 1n },
    )
    .pay.ToAddress(pending.toAddress, { lovelace: pending.lovelace })
    .addSignerKey(wallet.config.ownerPkh)
    .validFrom(Date.now() - 60_000)
    .validTo(Date.now() + 300_000)
    .complete();

  const txSigned = await txSignBuilder.sign.withWallet().complete();
  const txHash = await txSigned.submit();

  // Mark approved in the store
  if (USE_REMOTE) {
    await patchRemote(pendingId, "approved", txHash);
  } else {
    pending.status = "approved";
    saveQueueToFile(wallet, queue);
  }

  return txHash;
}

/**
 * Owner rejects a queued spend. No on-chain action — just marks the queue entry.
 */
export async function rejectSpend(wallet: BeniWallet, pendingId: string): Promise<void> {
  if (USE_REMOTE) {
    await patchRemote(pendingId, "rejected");
    return;
  }
  const queue = loadQueueFromFile(wallet);
  const pending = queue.find((p) => p.id === pendingId);
  if (pending) {
    pending.status = "rejected";
    saveQueueToFile(wallet, queue);
  }
}
