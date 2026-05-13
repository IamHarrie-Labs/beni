# Beni

**AI agent wallet guardrails enforced by the Cardano ledger — not by trusting your app.**

Beni is an Aiken smart contract + TypeScript SDK that gives AI agents their own wallets with spending rules baked into the script itself. Per-transaction caps, 24h rolling limits, address whitelists, emergency freeze — all enforced on-chain. If the agent breaks a rule, the transaction is rejected at the ledger level.

Built for the [Gimbalabs Piece of Pie 2026 Hackathon](https://www.gimbalabs.com/piece-of-pie) · April 13 – July 5, 2026.

---

## The problem

AI agents that control wallets are a real risk. There's no standard way to say "this agent can spend up to 2 ADA per transaction, max 10 ADA per day, only to these addresses." Most solutions put guardrails in the app layer — which the agent itself can bypass. Beni puts them in the Plutus script, where nothing can bypass them.

---

## What it does

- **Per-transaction cap** — script rejects any single spend above the configured limit
- **24h rolling window** — daily cap tracked on-chain with a self-updating datum
- **Address whitelist** — agent can only send to pre-approved credential hashes
- **Emergency freeze** — owner halts all agent spending instantly with one tx
- **Thread token security** — a one-shot NFT minted at creation prevents attackers from planting fake UTxOs with forged datums
- **Human approval queue** — above-cap spends queue for owner co-signature via CIP-30 wallet connect

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Beni Web App                      │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Claude AI   │  │  Analytics   │  │ Approvals │  │
│  │  Chatbot    │  │  Dashboard   │  │   Queue   │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  │
│         └────────────────┼────────────────┘         │
│                          │                          │
│         ┌────────────────▼──────────────────┐       │
│         │         Beni SDK (TypeScript)      │       │
│         │  createAgentWallet · agentSpend   │       │
│         │  ownerAction · freezeWallet        │       │
│         │  queueSpend · approveSpend         │       │
│         └────────────────┬──────────────────┘       │
└──────────────────────────┼──────────────────────────┘
                           │
        ┌──────────────────┼──────────────┐
        ▼                  ▼              ▼
  Cardano Ledger     Blockfrost API  Claude API
  (Aiken PlutusV3)   (chain queries) (chatbot)
```

---

## Quick start

```bash
# 1. Install Aiken
# https://aiken-lang.org/installation-instructions

# 2. Build and test the validators
aiken check   # runs 14 on-chain tests
aiken build   # compiles to plutus.json

# 3. Install SDK dependencies
cd sdk && npm install

# 4. Type-check the SDK
npm run typecheck

# 5. Run SDK unit tests (14 tests, no network needed)
npm test

# 6. Run the offline demo (shows all guardrail scenarios)
npx tsx examples/demo.ts

# 7. Run the on-chain demo (Preview testnet)
cp examples/.env.example examples/.env
# Fill in BLOCKFROST_PREVIEW_KEY + AGENT_PRIVATE_KEY
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
  perTxCapLovelace: 2_000_000n,    // 2 ADA per-tx cap
  dailyCapLovelace: 10_000_000n,   // 10 ADA daily cap
  allowedCredentialHashes: [],      // no whitelist
  ownerPkh: "your_owner_pkh_hex",
  isFrozen: false,
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
│   │                          # address whitelist, freeze, thread token check
│   └── thread_token.ak        # One-shot minting policy (parameterized per wallet)
├── tests/
│   └── agent_wallet_test.ak   # 14 Aiken on-chain tests
├── sdk/
│   ├── src/
│   │   ├── index.ts           # createAgentWallet, agentSpend, ownerAction, freezeWallet
│   │   ├── validators.ts      # Compiled CBOR from plutus.json
│   │   ├── types.ts           # GuardrailConfig, BeniWallet, CreateWalletConfig
│   │   ├── datum.ts           # WalletDatum encode/decode (field-order critical)
│   │   ├── validation.ts      # Client-side mirror of on-chain guardrail logic
│   │   ├── analytics.ts       # getDailyUsage, getTransactionHistory, getBalance
│   │   ├── approvals.ts       # Above-cap spend queue + CIP-30 owner approval
│   │   ├── lucid-setup.ts     # Blockfrost provider factory
│   │   └── errors.ts          # GuardrailViolationError, WalletFrozenError, etc.
│   ├── examples/
│   │   ├── demo.ts            # Judges' one-click demo (offline + on-chain)
│   │   └── .env.example       # Environment variable template
│   ├── tsconfig.json
│   └── package.json
├── app/
│   ├── index.html             # Analytics dashboard + chatbot UI
│   ├── styles.css
│   └── src/
│       ├── dashboard.js       # Daily limit gauge, tx history, wallet status
│       ├── chatbot.js         # Claude AI natural language wallet control
│       └── api/agent.ts       # Claude tool definitions for all wallet operations
├── plutus.json                # Compiled validators (aiken build output)
├── aiken.toml
└── .github/workflows/ci.yml  # aiken check + build, tsc, 14 SDK unit tests
```

---

## How the thread token works

Cardano's eUTXO model means anyone can send a UTxO to the script address with a fake datum (e.g. claiming `window_spent: 0` to reset the daily limit). Beni prevents this with a thread token — a unique NFT minted exactly once at wallet creation using a one-shot minting policy parameterized by the seed UTxO reference.

The `agent_wallet` validator checks on every spend that the continuing output carries exactly 1 thread token. An attacker's fake UTxO won't have it, so the validator rejects it.

---

## CI

Every push runs:
- `aiken check` — compiles validators and runs all 14 Aiken tests
- `aiken build` — produces `plutus.json` artifact
- `tsc --noEmit` — type-checks the full SDK
- `npx tsx --test` — runs 14 SDK unit tests (no network required)

---

## Stack

- [Aiken](https://aiken-lang.org/) v1.1.13 — PlutusV3 smart contracts
- [Lucid Cardano](https://github.com/spacebudz/lucid) — transaction building + wallet integration
- [Blockfrost](https://blockfrost.io/) — chain queries
- [Claude API](https://www.anthropic.com/) — AI chatbot layer
- TypeScript + Node.js 22

---

## Contact

iamharrie01@gmail.com · [GitHub](https://github.com/IamHarrie-Labs/beni)

## License

MIT
