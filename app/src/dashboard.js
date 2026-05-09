// dashboard.js — plain JS module (no bundler needed for hackathon demo)
// Wires up the UI, polls on-chain data via the SDK, and delegates chat to chatbot.js

import { chat } from "./chatbot.js";

// ── Config ────────────────────────────────────────────────────────────────────
// In production these come from a wallet connect flow.
// For the demo, they can be injected via URL params or a setup modal.
const EXPLORER_BASE = "https://preview.cardanoscan.io";
const REFRESH_INTERVAL_MS = 30_000;

// ── State (populated after wallet loads) ─────────────────────────────────────
let walletState = null;  // { scriptAddress, config, perTxCap, dailyCap }

// ── DOM refs ──────────────────────────────────────────────────────────────────
const elBalance     = document.getElementById("wallet-balance");
const elAddress     = document.getElementById("wallet-address");
const elFreezeBadge = document.getElementById("freeze-badge");
const elGaugeFill   = document.getElementById("gauge-fill");
const elGaugeSpent  = document.getElementById("gauge-spent");
const elGaugeCap    = document.getElementById("gauge-cap");
const elWindowReset = document.getElementById("window-reset-label");
const elPerTxCap    = document.getElementById("per-tx-cap");
const elApprovalsCount = document.getElementById("approvals-count");
const elApprovalsList  = document.getElementById("approvals-list");
const elTxBody      = document.getElementById("tx-history-body");
const elChatMessages = document.getElementById("chat-messages");
const elChatInput   = document.getElementById("chat-input");
const elBtnSend     = document.getElementById("btn-send");
const elBtnFreeze   = document.getElementById("btn-freeze");
const elBtnRefresh  = document.getElementById("btn-refresh");

// ── Formatting helpers ────────────────────────────────────────────────────────
const ada = (lovelace) => (Number(lovelace) / 1_000_000).toFixed(2) + " ADA";
const shortAddr = (addr) => addr ? addr.slice(0, 12) + "…" + addr.slice(-6) : "—";
const timeAgo = (date) => {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};
const countdown = (ms) => {
  const s = Math.floor(Number(ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
};

// ── Dashboard render ──────────────────────────────────────────────────────────
function renderStatus(status) {
  elBalance.textContent = ada(status.balance);
  elFreezeBadge.textContent = status.isFrozen ? "Frozen" : "Active";
  elFreezeBadge.className = `badge ${status.isFrozen ? "badge-frozen" : "badge-active"}`;
  elPerTxCap.textContent = ada(status.perTxCap);

  const { spent, cap, remaining, percentUsed, windowResetAt } = status.dailyUsage;
  const pct = Math.min(percentUsed, 100);
  elGaugeFill.style.width = pct + "%";
  elGaugeFill.className = `gauge-fill${pct >= 80 ? " danger" : pct >= 60 ? " warn" : ""}`;
  elGaugeSpent.textContent = ada(spent) + " spent";
  elGaugeCap.textContent = "of " + ada(cap);

  const msLeft = BigInt(windowResetAt.getTime() - Date.now());
  elWindowReset.textContent = msLeft > 0n
    ? `Resets in ${countdown(msLeft)}`
    : "Window reset";
}

function renderAddress(scriptAddress) {
  elAddress.textContent = shortAddr(scriptAddress);
  elAddress.href = `${EXPLORER_BASE}/address/${scriptAddress}`;
}

function renderApprovals(pending) {
  elApprovalsCount.textContent = pending.length;
  elApprovalsCount.className = `badge ${pending.length > 0 ? "badge-count" : ""}`;

  if (pending.length === 0) {
    elApprovalsList.innerHTML = '<p class="empty-state">No pending approvals</p>';
    return;
  }

  elApprovalsList.innerHTML = pending.map((p) => `
    <div class="approval-item" data-id="${p.id}">
      <div class="approval-header">
        <span class="approval-amount">${ada(p.lovelace)}</span>
        <span class="approval-time">${timeAgo(new Date(p.requestedAt))}</span>
      </div>
      <div class="approval-reason">${escHtml(p.reason)}</div>
      <div class="approval-dest">${escHtml(p.toAddress)}</div>
      <div class="approval-actions">
        <button class="btn btn-success btn-sm" onclick="approvePending('${p.id}')">
          Approve
        </button>
        <button class="btn btn-danger btn-sm" onclick="rejectPending('${p.id}')">
          Reject
        </button>
      </div>
    </div>
  `).join("");
}

function renderHistory(txs) {
  if (!txs || txs.length === 0) {
    elTxBody.innerHTML = '<tr><td colspan="4" class="empty-state">No transactions yet</td></tr>';
    return;
  }
  elTxBody.innerHTML = txs.slice(0, 10).map((tx) => `
    <tr>
      <td>${timeAgo(new Date(tx.timestamp))}</td>
      <td>${ada(tx.lovelaceSent)}</td>
      <td title="${tx.destination}">${shortAddr(tx.destination)}</td>
      <td>
        <a class="tx-hash-link"
           href="${EXPLORER_BASE}/transaction/${tx.txHash}"
           target="_blank">
          ${tx.txHash.slice(0, 8)}…
        </a>
      </td>
    </tr>
  `).join("");
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Data fetching (calls backend API route) ────────────────────────────────
async function fetchDashboard() {
  // In a full implementation this would call /api/status, /api/approvals, /api/history
  // For the hackathon demo, we use mock data when no live wallet is configured.
  const mock = {
    status: {
      balance: 15_000_000n,
      isFrozen: false,
      perTxCap: 2_000_000n,
      dailyUsage: {
        spent: 6_500_000n,
        cap: 10_000_000n,
        remaining: 3_500_000n,
        percentUsed: 65,
        windowResetAt: new Date(Date.now() + 8 * 3600_000),
      },
    },
    pending: [],
    history: [],
  };

  renderStatus(mock.status);
  renderApprovals(mock.pending);
  renderHistory(mock.history);
}

// ── Chat ──────────────────────────────────────────────────────────────────────
function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<span class="chat-bubble">${escHtml(text)}</span>`;
  elChatMessages.appendChild(div);
  elChatMessages.scrollTop = elChatMessages.scrollHeight;
  return div;
}

function removeMsg(el) { el?.remove(); }

async function sendChat(text) {
  if (!text.trim()) return;
  elChatInput.value = "";
  appendMessage("user", text);

  const loadingEl = appendMessage("assistant loading", "Thinking…");
  elBtnSend.disabled = true;

  try {
    const reply = await chat(text, walletState);
    removeMsg(loadingEl);
    appendMessage("assistant", reply);
  } catch (err) {
    removeMsg(loadingEl);
    appendMessage("assistant", "Sorry, something went wrong. " + err.message);
  } finally {
    elBtnSend.disabled = false;
    elChatInput.focus();
  }
}

// ── Event wiring ──────────────────────────────────────────────────────────────
elBtnSend.addEventListener("click", () => sendChat(elChatInput.value));
elChatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(elChatInput.value); }
});

document.querySelectorAll(".suggestion").forEach((btn) => {
  btn.addEventListener("click", () => sendChat(btn.dataset.msg));
});

elBtnRefresh.addEventListener("click", fetchDashboard);

elBtnFreeze.addEventListener("click", async () => {
  if (!confirm("Emergency freeze the agent wallet? This will prevent all agent spending.")) return;
  appendMessage("assistant", "Sending freeze transaction… (connect owner wallet to sign)");
  // In production: call freezeWallet() from the SDK with CIP-30 wallet
});

// Approval handlers — exposed globally for inline onclick
window.approvePending = async (id) => {
  appendMessage("assistant", `Approving spend ${id.slice(0, 8)}… Connect owner wallet to sign.`);
  // In production: call approveSpend(lucid, wallet, id) after CIP-30 wallet connect
};

window.rejectPending = async (id) => {
  appendMessage("assistant", `Spend ${id.slice(0, 8)} rejected.`);
  // In production: call rejectSpend(wallet, id)
};

// ── Init ──────────────────────────────────────────────────────────────────────
fetchDashboard();
setInterval(fetchDashboard, REFRESH_INTERVAL_MS);
