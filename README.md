# BeEnergy ⚡🐝

**Neighborhood solar energy marketplace on Stellar**

[![Deployed on Vercel](https://img.shields.io/badge/deployed-vercel-black)](https://be-energy-six.vercel.app)
[![Docs](https://img.shields.io/badge/docs-GitBook-blue)](https://marias-organization-50.gitbook.io/beenergy/)
[![Stellar Wave](https://img.shields.io/badge/Stellar-Wave%20%232-blueviolet)](https://www.drips.network/wave)
[![DoraHacks](https://img.shields.io/badge/DoraHacks-Featured-orange)](https://dorahacks.io/buidl/36793)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

BeEnergy turns solar surplus into digital credits that neighbors can sell, share, or save. The local electric cooperative validates generation and guarantees the process.

---

## The Problem

Communities worldwide are adopting solar panels, but:
- 🔴 Centralized utilities charge unpredictable rates
- 🔴 Zero transparency in energy distribution  
- 🔴 No way to monetize surplus generation
- 🔴 High fees for P2P energy sharing

## The Solution

BeEnergy creates **local energy marketplaces** where:
- ✅ Homes tokenize solar generation as **HoneyDrops (HDROP)** — 1 kWh = 1 token
- ✅ Neighbors trade energy directly using **Stellar blockchain**
- ✅ Smart contracts ensure **transparent, fair distribution**
- ✅ Communities gain **energy independence**

**Target:** Cooperative housing communities (3-10 homes per "Hive") in Argentina.

---

## 🏆 Recognition

- **Featured Project** at [Stellar Buenos Aires Hackathon 2025](https://dorahacks.io/buidl/36793)
- **Innovation Certificate** awarded by Stellar jury
- Validated by blockchain industry experts

---

## 🚀 Live Demo

**Frontend:** https://be-energy-six.vercel.app  
**Network:** Stellar Testnet

Connect with Freighter wallet to explore the dashboard, marketplace, and trading features.

---

## Architecture

### Smart Contracts (Soroban)

**Deployed on Stellar Testnet:**

| Contract | Address | Description |
|----------|---------|-------------|
| `energy_token` | `CD7W5YHA...T3ZL` | HDROP token (SEP-41) with mint/burn |
| `energy_distribution` | `CD3LXNS5...G6QK` | Multi-sig energy distribution |
| `community_governance` | `CBKUWQZ2...WPDM` | On-chain voting system |

Built with **OpenZeppelin Stellar** for security and **Soroban SDK 23.1.0**.

Full addresses in `.env.example`.

### Frontend

- **Framework:** Next.js 16 + React 19 + TypeScript
- **Wallet:** Freighter integration via Stellar Wallets Kit
- **UI:** Tailwind v4 + shadcn/ui (Radix primitives)
- **Deployment:** Vercel (automatic from `main` branch)

### Monorepo Structure

```
be-energy/
├── apps/
│   ├── contracts/      # Soroban smart contracts (Rust)
│   │   ├── energy_token/
│   │   ├── energy_distribution/
│   │   └── community_governance/
│   └── web/           # Next.js application
└── tooling/
    ├── issues/        # GitHub issue templates
    └── scripts/       # Automation scripts
```

Powered by **Turborepo** + **pnpm workspaces**.

---

## Quick Start

### Prerequisites

- **Node.js** v22+
- **pnpm** v10+ (install via `corepack enable`)
- **Rust** + Cargo (for contracts)
- **Windows only:** Visual Studio Build Tools with the **"Desktop development with C++"** workload
   Required to compile native Rust dependencies (e.g., to run `cargo test`).
   → [Download installer](https://aka.ms/vs/17/release/vs_BuildTools.exe) (~3-6 GB)
   After installing, restart your terminal before running any Rust commands.

### Installation

```bash
git clone https://github.com/BuenDia-Builders/be-energy.git
cd be-energy
pnpm install
```

### Run Development Server

```bash
pnpm dev
```

Frontend runs on: `http://localhost:3000`

### Build Contracts

```bash
cd apps/contracts
stellar contract build
```

Outputs: `target/wasm32v1-none/release/*.wasm`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Stellar (Soroban smart contracts) |
| Smart Contracts | Rust + OpenZeppelin Stellar |
| Frontend | Next.js 16 + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Wallet | Freighter + Stellar Wallets Kit |
| Deployment | Vercel |
| Monorepo | Turborepo + pnpm |

---

## Contributing

We welcome contributions from the community!

### How to Contribute

1. Browse [open issues](https://github.com/BuenDia-Builders/be-energy/issues)
2. Comment to claim an issue
3. Fork, code, and submit a PR to `develop`

### Development Workflow

```bash
# 1. Fork and clone
git clone https://github.com/YOUR-USERNAME/be-energy.git
cd be-energy

# 2. Create feature branch from develop
git checkout develop
git checkout -b feat/your-feature

# 3. Make changes and test
pnpm install
pnpm dev

# 4. Submit PR to develop branch
```

**Branch Structure:**
- `main` → Production (protected)
- `develop` → Active development

---

## Business Model

**Revenue:**
- 1-3% transaction fees on P2P energy trades
- Hardware partnerships (smart meter providers)

**User Savings:**
- 40-60% reduction in electrical bills
- Monetize surplus solar generation
- Energy independence from utilities

---

## Roadmap

**Q4 2025**
- ✅ Concept development and validation
- ✅ Stellar Buenos Aires Hackathon
- ✅ Innovation Certificate awarded
- ✅ Initial smart contracts deployed

**Q1 2026** _(Current)_
- ✅ Monorepo architecture upgrade
- ✅ Contracts refactored with OpenZeppelin Stellar
- ✅ Frontend deployed to production
- 🚧 Connect frontend to real contract data
- 🚧 Marketplace P2P trading integration

**Q2 2026**
- Deploy to Stellar mainnet
- Pilot with 1-2 cooperative communities
- Smart meter hardware integrations

**Q3 2026**
- Scale to 10+ communities
- Mobile app (React Native)
- Advanced analytics dashboard

---

## License

Apache-2.0 — See [LICENSE](LICENSE) for details.

---

**Built with ❤️ on Stellar | Código Alebrije 2026**
