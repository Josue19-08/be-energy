# BeEnergy

**Decentralized peer-to-peer solar energy marketplace on Stellar.**

BeEnergy enables solar prosumer communities to track energy generation, trade energy credits (HDROP tokens), and participate in community yield programs through DeFindex vaults.

## What is BeEnergy?

BeEnergy bridges the physical world of solar panels with the Stellar blockchain:

* **Physical layer:** Solar panels → Inverter → Smart meter → Power grid
* **Digital layer:** API → Soroban Smart Contracts → HDROP Tokens → Marketplace

Each **1 HDROP = 1 kWh** of solar energy generated and injected into the grid.

## Key Features

| Feature | Description |
| --- | --- |
| **HDROP Tokens** | 1 token = 1 kWh, SEP-41 standard, automatic minting |
| **P2P Marketplace** | Create and buy energy offers with XLM |
| **Community Distribution** | Automatic proportional token distribution via smart contract |
| **Yield Farming** | DeFindex vaults for yield on deposited tokens |
| **Governance** | Community proposals (in development) |

## Tech Stack

* **Frontend:** Next.js 16, React 19, Tailwind CSS 4
* **Blockchain:** Stellar Testnet, Soroban smart contracts (Rust)
* **Backend:** Supabase (PostgreSQL), Next.js API routes
* **Wallets:** Freighter, HotWallet (via Stellar Wallets Kit)
* **DeFi:** DeFindex SDK (PaltaLabs)

## Current Status

**v0.3.0** — Pre-production on Stellar Testnet. Backend API fully operational with Supabase persistence.

## Quick Links

* [Quickstart](getting-started/quickstart.md) — Get started in 5 minutes
* [Architecture](technology/architecture.md) — How it works under the hood
* [API Reference](marketplace/api-reference.md) — Marketplace endpoints
* [Smart Contracts](technology/smart-contracts.md) — Soroban contracts
