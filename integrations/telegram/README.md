# Beni Telegram bot

Control your AI agent's on-chain wallet from Telegram. Watch the balance, send
guarded payments, approve above-cap spends with a tap, and freeze everything in
an emergency — all enforced on-chain by the Aiken validator.

The bot is a thin control surface over [`beni-sdk`](https://www.npmjs.com/package/beni-sdk).
It holds the agent key (same model as any autonomous agent) while Beni's smart
contract guarantees it can never move more than the rules allow.

## Why this is the demo that lands

"Guardrails for AI money" is abstract until you watch an agent try to overspend
and a phone buzzes asking you to approve. This turns the contract into a product:
the agent proposes, the chain constrains, and you decide — from your pocket.

## Commands

| Command | What it does |
| --- | --- |
| `/status` | Balance, per-tx cap, today's spend vs. the daily cap |
| `/pay <address> <ada> [reason]` | Spend. Under the per-tx cap it sends immediately; over it, the request is queued for approval |
| `/pending` | List spends awaiting your approval |
| `/freeze` | Emergency freeze — halts every agent spend in one block |

Above-cap requests appear with **✅ Approve / ❌ Reject** buttons. Approving
co-signs the transaction on-chain (`OwnerAction` redeemer); rejecting drops it
with no chain effect.

## Setup

1. **Create a bot.** Message [@BotFather](https://t.me/BotFather) → `/newbot` →
   copy the token.

2. **Configure.**
   ```bash
   cd integrations/telegram
   cp .env.example .env
   # fill in TELEGRAM_BOT_TOKEN, BLOCKFROST_PREVIEW_KEY, AGENT_PRIVATE_KEY
   ```
   The bot reads your deployed wallet from `../../beni-wallet-state.json` by
   default (written by the deploy script / dashboard). Point `BENI_STATE_PATH`
   elsewhere if needed.

3. **Run.**
   ```bash
   npm install
   npm start
   ```

4. In Telegram, open your bot and send `/status`.

## Try the full flow

With a wallet whose per-tx cap is 2 ₳:

```
/pay addr_test1qz...  1   coffee          → sent immediately (under cap)
/pay addr_test1qz...  5   server invoice  → queued, you get Approve / Reject
```

Tap **Approve** and the 5 ₳ spend co-signs and lands on-chain; the message
updates with a Cardanoscan link.

## Share the queue with the dashboard

Set `BENI_APPROVALS_API` to your deployed `/api/approvals` endpoint and the bot
and the web dashboard share one approval queue — request on the web, approve on
Telegram, or vice-versa.

## Notes

- **Testnet only.** This targets Cardano Preview. The agent key here is a hot key
  for a testnet wallet — never put a mainnet key with real funds in a `.env`.
- The bot uses long-polling, so it needs no public URL. Run it anywhere Node 18+
  runs.
- If a spend fails with "still settling," the agent's single change UTxO hasn't
  confirmed yet — wait ~30–60s and retry.
