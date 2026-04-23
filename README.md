# Beni

AI Agent Wallet Guardrails on Cardano.

Beni is a Cardano-native SDK and Aiken smart contract suite that gives AI agents their own wallets with spending rules enforced by the ledger — daily limits, per-tx caps, address whitelists, and purpose-locked funds.

Instead of trusting an app or backend to constrain an autonomous agent, the guardrails live in the script.

---

## What it does

- **Daily spending limits** — script refuses any tx that would exceed X ADA in a 24h window
- **Per-transaction caps** — no single tx above Y ADA without a human co-signer
- **Address whitelists** — agent can only send to pre-approved addresses
- **Purpose-locked funds** — separate pools for API costs, onchain actions, etc.
- **Auto top-up triggers** — request refill from parent wallet when balance drops below threshold

## Stack

- [Aiken](https://aiken-lang.org/) — smart contracts (validators)
- TypeScript SDK — drop-in library for agent developers
- Cardano Preview/Preprod testnet for development

## Project structure

```
beni/
├── validators/        # Aiken smart contract validators
├── lib/               # Aiken shared library functions
├── sdk/               # TypeScript SDK for agent developers
│   └── src/
├── tests/             # Contract and SDK tests
├── aiken.toml         # Aiken project config
└── README.md
```

## Hackathon

Built for the [Gimbalabs Piece of Pie 2026 Hackathon](https://www.gimbalabs.com/piece-of-pie).

Timeline: April 13 – July 5, 2026.

## Getting started

```bash
# Install Aiken
# https://aiken-lang.org/installation-instructions

# Build contracts
aiken build

# Install SDK dependencies
cd sdk && npm install
```

## Contact

iamharrie01@gmail.com

## License

MIT
