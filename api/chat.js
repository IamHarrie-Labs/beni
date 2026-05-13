/**
 * Vercel serverless function — Beni chat endpoint
 * POST /api/chat  →  { text: string }
 *
 * Keeps the Anthropic API key server-side.
 * Mirrors the logic in sdk/src/chat-server.ts but in Vercel handler format.
 */
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM = `\
You are Beni, a policy-aware AI assistant built into the Beni agent wallet dashboard.
You help operators understand their AI-agent spending, interpret rule decisions, and take action.

You are the guardian layer between AI agents and the Cardano blockchain.
Your rules engine enforces per-transaction caps, daily budgets, address whitelists, and human-approval thresholds before any UTxO is spent.

When a user connects their wallet, you can show them their real balance, pending approvals, active agents, and rule status.
Until then, respond helpfully about how Beni works, what the rules mean, and how to get started.

Key concepts:
- per_tx_cap: hard ceiling per transaction (default ₳ 500)
- daily_cap: rolling 24h budget (default ₳ 2,500)
- whitelist_routing: skip approval for trusted addresses
- require_approval: pause for human sign-off on amounts ≥ ₳ 250
- Thread token: one-shot minting policy that authenticates the state UTxO on-chain
- Epoch: ~5 days on Cardano mainnet; daily caps reset every 24h regardless of epoch

Respond concisely (2–4 sentences). Be direct and specific. If the user asks to take an action (freeze, approve, adjust cap), explain what would happen on-chain.`;

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(404).json({ error: "Not found" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[Beni] ANTHROPIC_API_KEY not set");
    return res.status(500).json({ error: "Server misconfigured — API key missing" });
  }

  try {
    const { messages } = req.body;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SYSTEM,
      messages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    console.log(
      `[Beni] Chat · ${response.usage.input_tokens}in + ${response.usage.output_tokens}out tokens`,
    );

    return res.status(200).json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Beni] Chat error:", msg);
    return res.status(500).json({ error: msg });
  }
}
