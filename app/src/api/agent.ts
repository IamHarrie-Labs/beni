import Anthropic from "@anthropic-ai/sdk";
import type { BeniWallet } from "../../../sdk/src/types.js";

// Claude tool definitions — each tool maps to a Beni SDK function.
// The actual SDK calls happen in handleTool() below.
const tools: Anthropic.Tool[] = [
  {
    name: "get_wallet_status",
    description:
      "Get the full current status of the agent wallet: balance, daily spending usage, freeze state, guardrail limits, and whitelisted addresses.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_daily_usage",
    description:
      "Get how much ADA the agent has spent today, the remaining daily budget, and when the 24h window resets.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_transaction_history",
    description: "Get recent transactions from the agent wallet.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Number of transactions to return (default 10, max 50)" },
      },
      required: [],
    },
  },
  {
    name: "send_ada",
    description:
      "Send ADA from the agent wallet to an address. Will fail with a clear error if any guardrail is violated (per-tx cap, daily cap, frozen). For amounts above the per-tx cap, it queues the spend for owner approval instead.",
    input_schema: {
      type: "object" as const,
      properties: {
        to_address: { type: "string", description: "Cardano bech32 destination address" },
        lovelace: { type: "number", description: "Amount in lovelace (1 ADA = 1,000,000 lovelace)" },
        reason: { type: "string", description: "Human-readable reason for this spend" },
      },
      required: ["to_address", "lovelace"],
    },
  },
  {
    name: "get_pending_approvals",
    description:
      "Get all spend requests that are queued for owner approval (above-cap transactions).",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "freeze_wallet",
    description:
      "Emergency freeze the agent wallet. Requires owner confirmation. After freezing, all agent spend transactions are rejected on-chain.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
];

// Mock tool handler — in production, replace with real SDK calls
async function handleTool(
  name: string,
  input: Record<string, unknown>,
  wallet: BeniWallet | null,
): Promise<string> {
  // These are mock responses for the hackathon demo.
  // Wire up the real SDK functions once the wallet context is established.
  switch (name) {
    case "get_wallet_status":
      return JSON.stringify({
        balance: "15.00 ADA",
        isFrozen: false,
        perTxCap: "2.00 ADA",
        dailyCap: "10.00 ADA",
        dailyUsage: { spent: "6.50 ADA", remaining: "3.50 ADA", percentUsed: 65 },
        allowedAddresses: wallet?.config.allowedCredentialHashes ?? [],
      });

    case "get_daily_usage":
      return JSON.stringify({
        spent: "6.50 ADA",
        cap: "10.00 ADA",
        remaining: "3.50 ADA",
        percentUsed: 65,
        windowResetsAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
      });

    case "get_transaction_history":
      return JSON.stringify({ transactions: [], note: "No transactions yet on Preview testnet" });

    case "send_ada": {
      const lovelace = Number(input.lovelace ?? 0);
      const adaAmount = lovelace / 1_000_000;
      const perTxCapAda = 2;
      if (lovelace > perTxCapAda * 1_000_000) {
        return JSON.stringify({
          status: "queued",
          message: `${adaAmount} ADA exceeds the ${perTxCapAda} ADA per-tx cap. The request has been queued for owner approval.`,
        });
      }
      return JSON.stringify({
        status: "submitted",
        txHash: "mock_" + Math.random().toString(36).slice(2, 10),
        message: `${adaAmount} ADA sent to ${input.to_address}`,
      });
    }

    case "get_pending_approvals":
      return JSON.stringify({ pendingApprovals: [] });

    case "freeze_wallet":
      return JSON.stringify({
        status: "confirmation_required",
        message: "Owner wallet signature required to freeze. Connect your Nami/Eternl wallet and click Approve in the dashboard.",
      });

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

/**
 * Agentic chat loop using Claude with tool use.
 * Handles multi-turn tool calls until the model returns a final text response.
 */
export async function runChatAgent(
  userMessage: string,
  wallet: BeniWallet | null,
  apiKey: string,
): Promise<string> {
  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are Beni, an AI assistant that manages a Cardano agent wallet with spending guardrails.

Current wallet: ${wallet?.scriptAddress ?? "not configured — running in demo mode"}

Guardrail rules:
- Per-tx cap: ${wallet ? Number(wallet.config.perTxCapLovelace) / 1_000_000 + " ADA" : "2 ADA (demo)"}
- Daily cap: ${wallet ? Number(wallet.config.dailyCapLovelace) / 1_000_000 + " ADA" : "10 ADA (demo)"}
- Freeze state: ${wallet?.config.isFrozen ? "FROZEN" : "Active"}

Always explain guardrail violations clearly. For spend requests above the per-tx cap, queue them for owner approval — don't just refuse. Keep responses concise and actionable.`;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  // Agentic loop — continue until no more tool calls
  for (let i = 0; i < 5; i++) {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });

    // Collect any text blocks for the final response
    const textBlocks = response.content.filter((b) => b.type === "text");
    const toolBlocks = response.content.filter((b) => b.type === "tool_use");

    if (toolBlocks.length === 0 || response.stop_reason === "end_turn") {
      // No more tool calls — return the final text
      return textBlocks.map((b) => (b as Anthropic.TextBlock).text).join("\n") ||
        "Done.";
    }

    // Execute all tool calls and add results to the conversation
    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolBlocks.map(async (block) => {
        const tb = block as Anthropic.ToolUseBlock;
        const result = await handleTool(tb.name, tb.input as Record<string, unknown>, wallet);
        return {
          type: "tool_result" as const,
          tool_use_id: tb.id,
          content: result,
        };
      }),
    );

    messages.push({ role: "user", content: toolResults });
  }

  return "I've completed the requested operations.";
}
