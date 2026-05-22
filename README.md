# Beni

**AI agent wallet guardrails enforced by the Cardano ledger — not by trusting your app.**

Beni is an Aiken smart contract + TypeScript SDK that gives AI agents their own wallets with spending rules baked directly into the Plutus script. Per-transaction caps, 24h rolling limits, address whitelists, emergency freeze — all enforced on-chain. If the agent breaks a rule, the transaction is rejected at the ledger level. No app-layer trust required.

Built for the [Gimbalabs Piece of Pie 2026 Hackathon](https://www.gimbalabs.com/piece-of-pie) · April 13 – July 5, 2026.

**Live demo → [beni-wallet.vercel.app](https://beni-wallet.vercel.app)**

---

## The problem

AI agents that control wallets are a real risk. There is no standard way to say "this agent can spend up to 2 ADA per transaction, max 10 ADA per day, only to these addresses." Most solutions put guardrails in the application layer — which the agent itself can bypass. Beni puts them in the Plutus script, where nothing can bypass them.

---

## What it does

| Guardrail | How it works |
|---|---|
| **Per-transaction cap** | Script rejects any single spend above the configured lovelace limit |
| **24h rolling window** | Daily cap tracked on-chain with a self-updating datum; window resets automatically |
| **Address whitelist** | Agent can only send to pre-approved credential hashes |
| **Emergency freeze** | Owner halts all agent spending instantly with one transaction |
| **Thread token security** | A one-shot NFT minted at creation prevents attackers planting fake UTxOs with forged datums |
| **Human approval queue** | Above-cap spends queue for owner co-signature via CIP-30 wallet connect |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Beni Web App                        │
│                 beni-wallet.vercel.app                  │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Claude AI  │  │  Analytics   │  │   Approvals   │  │
│  │  Chatbot    │  │  Dashboard   │  │     Queue     │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         └────────────────┼───────────────────┘          │
│                          │                              │
│         ┌────────────────▼────────────────────┐         │
│         │         Beni SDK (TypeScript)        │         │
│         │  createAgentWallet · agentSpend      │         │
│         │  ownerAction · freezeWallet          │         │
│         │  queueSpend · approveSpend           │         │
│         └────────────────┬────────────────────┘         │
└──────────────────────────┼──────────────────────────────┘
                           │
        ┌──────────────────┼───────────────┐
        ▼                  ▼               ▼
  Cardano Ledger     Blockfrost API   Claude API
  (Aiken PlutusV3)   (chain queries)  (AI chatbot)
  Conway era
```

---

## Live demo

**[beni-wallet.vercel.app](https://beni-wallet.vercel.app)**

- Connect any CIP-30 wallet (Eternl, Nami, Lace, Flint, Vespr, Typhon) on **Cardano Preview testnet**
- The dashboard reads your real on-chain address, ADA balance, and transaction history from Blockfrost
- Ask the Claude AI assistant questions about your wallet in plain English
- The approvals queue, rules panel, whitelist, and monitoring tabs are all wired to the SDK
- Emergency freeze routes through a modal with real SDK code shown inline

---

## Quick start

```bash
# 1. Install Aiken
# https://aiken-lang.org/installation-instructions

# 2. Build and test the validators
aiken check   # runs all on-chain tests
aiken build   # compiles to plutus.json

# 3. Install SDK dependencies
cd sdk && npm install

# 4. Type-check the SDK
npm run typecheck

# 5. Run SDK unit tests (no network required)
npm test

# 6. Run the offline demo (all guardrail scenarios)
npx tsx examples/demo.ts
```

---

## SDK usage

```typescript
import { makeLucid, createAgentWallet, agentSpend, freezeWallet } from "beni-sdk";

// Connect to Preview testnet
const lucid = await makeLucid({
  network: "Preview",
  blockfrostApiKey: process.env.BLOCKFROST_PREVIEW_KEY,
});
lucid.selectWalletFromPrivateKey(process.env.AGENT_PRIVATE_KEY);

// Deploy a new agent wallet on-chain
const wallet = await createAgentWallet(lucid, {
  perTxCapLovelace:        2_000_000n,   // 2 ADA per-tx cap
  dailyCapLovelace:        10_000_000n,  // 10 ADA daily cap
  allowedCredentialHashes: [],           // empty = no whitelist restriction
  ownerPkh:                "your_owner_pkh_hex",
  isFrozen:                false,
});

// Agent spends — guardrails enforced on-chain
const result = await agentSpend(lucid, wallet, "addr_test1...", 1_000_000n);
console.log(result.txHash);

// Owner freezes the wallet instantly
await freezeWallet(lucid, wallet);
```

---

## Project structure

```
beni/
├── validators/
│   ├── agent_wallet.ak        # Guardrail enforcement — per-tx cap, daily window,
│   │                          # address whitelist, freeze, thread token auth
│   └── thread_token.ak        # One-shot minting policy (parameterised per wallet)
├── tests/
│   └── agent_wallet_test.ak   # Aiken on-chain tests
├── sdk/
│   └── src/
│       ├── index.ts           # createAgentWallet, agentSpend, ownerAction, freezeWallet
│       ├── index-internal.ts  # Internal helpers
│       ├── validators.ts      # Compiled CBOR from plutus.json
│       ├── types.ts           # GuardrailConfig, BeniWallet, CreateWalletConfig
│       ├── datum.ts           # WalletDatum encode/decode (field-order critical)
│       ├── validation.ts      # Client-side mirror of on-chain guardrail logic
│       ├── analytics.ts       # getDailyUsage, getTransactionHistory, getBalance
│       ├── approvals.ts       # Above-cap spend queue + CIP-30 owner approval
│       ├── lucid-setup.ts     # Blockfrost provider factory
│       ├── chat-server.ts     # Local dev chat proxy
│       └── errors.ts          # GuardrailViolationError, WalletFrozenError, etc.
├── app/
│   ├── index.html             # Entry point — loads all scripts + Google Fonts
│   ├── styles.css             # Design tokens + hand-drawn UI primitives
│   ├── components.jsx         # Shared primitives: Wordmark, BeniMark, TopNav,
│   │                          # Footer, WalletConnect, Icon set, Sketchbox, etc.
│   ├── landing.jsx            # Marketing landing page
│   ├── dashboard.jsx          # 6-tab wallet dashboard (overview, approvals,
│   │                          # rules, whitelist, transactions, monitor)
│   └── pages.jsx              # Docs site + brand book
├── api/
│   ├── chat.js                # Vercel serverless — Claude Haiku chatbot
│   ├── blockfrost.js          # Vercel serverless — Blockfrost proxy
│   └── agent-state.js         # Vercel serverless — agent state polling
├── plutus.json                # Compiled validators (aiken build output)
├── aiken.toml
├── vercel.json                # Deployment config
└── .github/workflows/ci.yml   # aiken check + build, tsc, SDK unit tests
```

---

## On-chain design

### Datum schema

```aiken
type WalletDatum {
  per_tx_cap:          Int,     // max lovelace per single spend
  daily_cap:           Int,     // max lovelace per 24h window
  allowed_addresses:   List<CredentialHash>,
  owner_pkh:           PubKeyHash,
  last_window_start:   Int,     // POSIX ms — window reset anchor
  window_spent:        Int,     // lovelace spent in current window
  is_frozen:           Bool,
  thread_token_policy: PolicyId,
}
```

### Redeemers

| Index | Name | Who calls it |
|---|---|---|
| 0 | `Spend` | AI agent — normal spend |
| 1 | `OwnerAction` | Wallet owner — update rules, unfreeze |
| 2 | `FreezeWallet` | Wallet owner — emergency halt |

### Thread token security

Cardano's eUTXO model means anyone can send a UTxO to the script address with a fake datum (e.g. `window_spent: 0` to reset the daily limit). Beni prevents this with a thread token — a unique NFT minted exactly once at wallet creation using a one-shot minting policy parameterised by the seed UTxO reference.

The `agent_wallet` validator checks on every spend that the continuing output carries exactly 1 thread token. An attacker's fake UTxO will not have it, so the validator rejects it.

---

## What has been built

### Smart contracts (Aiken / PlutusV3)
- `agent_wallet.ak` — full guardrail validator with all 5 rules
- `thread_token.ak` — one-shot minting policy
- Full test suite covering every guardrail scenario and edge case

### SDK (TypeScript)
- `createAgentWallet` — deploys a new wallet on-chain with thread token
- `agentSpend` — submits a spend transaction through the guardrail validator
- `ownerAction` — lets the owner update rules or unfreeze the wallet
- `freezeWallet` — emergency halt in one call
- `getDailyUsage` / `getTransactionHistory` / `getBalance` — analytics queries
- `queueSpend` / `approveSpend` — above-cap approval queue
- Client-side guardrail validation (mirrors on-chain logic for fast UX feedback)
- Full TypeScript types, error classes, Blockfrost provider factory

### Web app (React + Vercel)
- **Landing page** — hero diagram, feature walkthrough, SDK code section, final CTA
- **Dashboard** — 6 tabs:
  - Overview — live ADA balance, spend curve chart (deterministic, no flicker), daily limit gauge
  - Approvals — above-cap spend queue with approve/reject buttons
  - Rules — per-tx cap, daily cap, freeze toggle with on-chain SDK guidance
  - Whitelist — allowed address management
  - Transactions — full tx history from Blockfrost
  - Monitor — live agent activity feed
- **AI assistant** — Claude Haiku chatbot wired to the SDK, embedded in dashboard sidebar
- **Docs site** — 13 sections across Getting Started, On-chain, and SDK Reference
- **Brand book** — typographic system, colour palette, logo usage guidelines
- **Emergency freeze modal** — context-sensitive (freeze vs unfreeze), shows real SDK code inline

### Brand
- Typographic wordmark — "Beni" in DM Serif Display
- Terracotta dot (border-radius 50%, `rgb(201, 84, 60)`) at the baseline of the "i"
- Consistent across TopNav, Footer, brand book, docs, all logo contexts
- Live at [beni-wallet.vercel.app](https://beni-wallet.vercel.app)

---

## Vercel API routes

| Route | Purpose |
|---|---|
| `POST /api/chat` | Claude Haiku chatbot — system prompt + tool definitions |
| `GET /api/blockfrost` | Blockfrost proxy — address, balance, tx history |
| `GET /api/agent-state` | Agent state polling — active approvals, last activity |

---

## CI

Every push runs:
- `aiken check` — compiles validators and runs all Aiken tests
- `aiken build` — produces `plutus.json` artifact
- `tsc --noEmit` — type-checks the full SDK
- `npx tsx --test` — runs SDK unit tests (no network required)

---

## Stack

| Layer | Technology |
|---|---|
| Smart contracts | [Aiken](https://aiken-lang.org/) v1.1.x — PlutusV3 / Conway era |
| Transaction building | [@lucid-evolution/lucid](https://github.com/Anastasia-Labs/lucid-evolution) v0.4.31 |
| Chain queries | [Blockfrost](https://blockfrost.io/) Preview testnet |
| AI layer | [Claude API](https://www.anthropic.com/) — Haiku model |
| Frontend | React 18 UMD + Babel standalone (no build step) |
| Hosting | [Vercel](https://vercel.com/) serverless |
| Language | TypeScript + Node.js 22 |

---

## Roadmap

- [x] Aiken validators + full test suite
- [x] TypeScript SDK with all core functions
- [x] Blockfrost integration + CIP-30 wallet connect
- [x] Full dashboard UI (6 tabs, live chain data)
- [x] Claude AI assistant wired to SDK
- [x] Docs site (13 sections)
- [x] Emergency freeze modal with SDK guidance
- [x] Brand identity (typographic wordmark + terracotta dot)
- [x] Deployed to Vercel
- [ ] Approvals queue persistence (Vercel KV or Supabase)
- [ ] End-to-end on-chain demo (`npx tsx sdk/examples/demo.ts`)
- [ ] Multi-agent sidebar support
- [ ] Hackathon submission (video, pitch deck)

---

## Contact

iamharrie01@gmail.com · [GitHub](https://github.com/IamHarrie-Labs/beni)

---

## License

MIT
