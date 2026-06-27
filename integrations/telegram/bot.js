/**
 * Beni Telegram bot — control your AI agent's wallet from your phone.
 *
 * Flow:
 *   /pay <addr> <ada> [reason]  → if under the per-tx cap, spends immediately;
 *                                 if over, queues for owner approval.
 *   Owner gets an Approve / Reject prompt with inline buttons. Approving
 *   co-signs the spend on-chain; rejecting drops it with no chain effect.
 *
 * Every guardrail (per-tx cap, daily cap, freeze) is enforced on-chain by the
 * Aiken validator — the bot is just the human-in-the-loop control surface.
 */
import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import {
  agentSpend,
  queueSpend,
  approveSpend,
  rejectSpend,
  getPendingSpends,
  getBalance,
  getDailyUsage,
  freezeWallet,
} from "beni-sdk";
import { makeWalletContext, requireEnv } from "./wallet.js";

// ── Formatting helpers ──────────────────────────────────────────────────────
const ada = (lovelace) =>
  (Number(lovelace) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 });
const toLovelace = (s) => BigInt(Math.round(Number(s) * 1e6));
const explorer = (h) => `https://preview.cardanoscan.io/transaction/${h}`;
const shorten = (a) => (a.length > 20 ? `${a.slice(0, 12)}…${a.slice(-6)}` : a);

/** Turn raw chain/submission errors into something a human can act on. */
function friendly(m = "") {
  if (/BadInputsUTxO|TranslationLogicMissingInput|ValueNotConserved|MissingInput/.test(m))
    return "Your previous transaction is still settling on-chain. Wait ~30–60s and try again.";
  if (/GuardrailViolation|exceeds|cap/i.test(m)) return m;
  return m.length > 300 ? m.slice(0, 300) + "…" : m;
}

const approvalKeyboard = (id) => ({
  inline_keyboard: [[
    { text: "✅ Approve", callback_data: `approve:${id}` },
    { text: "❌ Reject", callback_data: `reject:${id}` },
  ]],
});

function helpText() {
  return [
    "*Beni — agent wallet guardrails*",
    "",
    "I let you watch and control your AI agent's on-chain wallet. Every rule is",
    "enforced by the smart contract, not by me.",
    "",
    "*/status* — balance, caps, and today's spend",
    "*/pay* `<address> <ada> [reason]` — spend; over the per-tx cap routes to approval",
    "*/pending* — list spends awaiting your approval",
    "*/freeze* — emergency freeze (halts every agent spend)",
    "",
    "Above-cap requests pop up here with Approve / Reject buttons.",
  ].join("\n");
}

const md = { parse_mode: "Markdown", disable_web_page_preview: true };

// ── Boot ────────────────────────────────────────────────────────────────────
const token = requireEnv("TELEGRAM_BOT_TOKEN");
const OWNER_CHAT_ID = process.env.BENI_OWNER_CHAT_ID?.trim() || null;

const bot = new TelegramBot(token, { polling: true });
const ctx = await makeWalletContext();
console.log(`[beni-bot] online · script ${ctx.wallet.scriptAddress}`);

// ── Commands ────────────────────────────────────────────────────────────────
bot.onText(/^\/(start|help)\b/, (msg) =>
  bot.sendMessage(msg.chat.id, helpText(), md),
);

bot.onText(/^\/status\b/, async (msg) => {
  try {
    const [bal, usage] = await Promise.all([
      getBalance(ctx.lucid, ctx.wallet),
      getDailyUsage(ctx.lucid, ctx.wallet),
    ]);
    await bot.sendMessage(
      msg.chat.id,
      [
        "*Beni agent wallet*",
        `Balance: *₳${ada(bal)}*`,
        `Per-tx cap: ₳${ada(ctx.wallet.config.perTxCapLovelace)}`,
        `Today: ₳${ada(usage.spent)} / ₳${ada(usage.cap)}  (₳${ada(usage.remaining)} left)`,
        `Window resets: ${usage.windowResetAt.toUTCString()}`,
      ].join("\n"),
      md,
    );
  } catch (e) {
    await bot.sendMessage(msg.chat.id, `⚠️ ${friendly(e.message)}`);
  }
});

bot.onText(/^\/pay\s+(\S+)\s+([\d.]+)(?:\s+([\s\S]+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const toAddress = match[1];
  const reason = (match[3] || "").trim() || "agent payment";
  try {
    const lovelace = toLovelace(match[2]);
    if (lovelace <= 0n) return bot.sendMessage(chatId, "❌ Amount must be greater than 0.");

    const bal = await getBalance(ctx.lucid, ctx.wallet);
    if (lovelace > bal)
      return bot.sendMessage(chatId, `❌ Insufficient balance (₳${ada(bal)} available).`);

    // Above the per-tx cap → human-in-the-loop approval.
    if (lovelace > ctx.wallet.config.perTxCapLovelace) {
      const pending = await queueSpend(ctx.wallet, toAddress, lovelace, reason);
      await bot.sendMessage(
        chatId,
        `🟡 *Above per-tx cap* — owner approval required.\n₳${ada(lovelace)} → \`${shorten(toAddress)}\`\n_${reason}_`,
        md,
      );
      await bot.sendMessage(
        OWNER_CHAT_ID || chatId,
        `🔔 *Approval needed*\n₳${ada(lovelace)} → \`${shorten(toAddress)}\`\n_${reason}_\nid \`${pending.id.slice(0, 8)}\``,
        { ...md, reply_markup: approvalKeyboard(pending.id) },
      );
      return;
    }

    // Within cap → spend straight away.
    await bot.sendMessage(chatId, `⏳ Sending ₳${ada(lovelace)}…`);
    const { txHash } = await agentSpend(ctx.lucid, ctx.wallet, toAddress, lovelace);
    await bot.sendMessage(chatId, `✅ Sent ₳${ada(lovelace)}\n[View transaction](${explorer(txHash)})`, md);
  } catch (e) {
    await bot.sendMessage(chatId, `⚠️ ${friendly(e.message)}`);
  }
});

bot.onText(/^\/pending\b/, async (msg) => {
  try {
    const pending = await getPendingSpends(ctx.wallet);
    if (pending.length === 0)
      return bot.sendMessage(msg.chat.id, "✅ No spends awaiting approval.");
    for (const p of pending) {
      await bot.sendMessage(
        msg.chat.id,
        `🟡 ₳${ada(p.lovelace)} → \`${shorten(p.toAddress)}\`\n_${p.reason}_`,
        { ...md, reply_markup: approvalKeyboard(p.id) },
      );
    }
  } catch (e) {
    await bot.sendMessage(msg.chat.id, `⚠️ ${friendly(e.message)}`);
  }
});

bot.onText(/^\/freeze\b/, async (msg) => {
  try {
    await bot.sendMessage(msg.chat.id, "🧊 Freezing wallet…");
    const txHash = await freezeWallet(ctx.lucid, ctx.wallet);
    await bot.sendMessage(
      msg.chat.id,
      `🧊 *Frozen.* Every agent spend is now halted on-chain.\n[View transaction](${explorer(txHash)})`,
      md,
    );
  } catch (e) {
    await bot.sendMessage(msg.chat.id, `⚠️ ${friendly(e.message)}`);
  }
});

// ── Approve / Reject buttons ────────────────────────────────────────────────
bot.on("callback_query", async (q) => {
  const [action, id] = (q.data || "").split(":");
  const chatId = q.message?.chat.id;
  const messageId = q.message?.message_id;
  try {
    if (action === "approve") {
      await bot.answerCallbackQuery(q.id, { text: "Co-signing on-chain…" });
      const txHash = await approveSpend(ctx.lucid, ctx.wallet, id);
      await bot.editMessageText(`✅ *Approved & sent*\n[View transaction](${explorer(txHash)})`, {
        chat_id: chatId,
        message_id: messageId,
        ...md,
      });
    } else if (action === "reject") {
      await rejectSpend(ctx.wallet, id);
      await bot.answerCallbackQuery(q.id, { text: "Rejected" });
      await bot.editMessageText("❌ *Rejected* — no on-chain effect.", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
      });
    }
  } catch (e) {
    await bot.answerCallbackQuery(q.id, { text: "Error — see chat" });
    await bot.sendMessage(chatId, `⚠️ ${friendly(e.message)}`);
  }
});

bot.on("polling_error", (e) => console.error("[beni-bot] polling error:", e.message));
