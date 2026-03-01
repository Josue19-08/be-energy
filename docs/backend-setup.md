# Backend Setup Guide

This guide explains how to set up the BeEnergy backend (Supabase + Soroban) for local development.

## Prerequisites

- Node.js >= 20
- pnpm
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli) (for key management)
- A Supabase project (free tier works)

## 1. Environment Variables

Copy the template and fill in your values:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Create `apps/web/.env.local` with these variables:

```env
# Stellar Network
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Smart Contracts (Testnet)
NEXT_PUBLIC_ENERGY_TOKEN_CONTRACT=<energy-token-contract-address>
NEXT_PUBLIC_ENERGY_DISTRIBUTION_CONTRACT=<distribution-contract-address>
NEXT_PUBLIC_COMMUNITY_GOVERNANCE_CONTRACT=<governance-contract-address>

# Admin
NEXT_PUBLIC_ADMIN_ADDRESS=<admin-stellar-public-key>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

# Minter (server-side only — NEVER expose this)
MINTER_SECRET_KEY=<stellar-secret-key-for-minter-account>

# Contract addresses (server-side overrides)
ENERGY_TOKEN_CONTRACT=<energy-token-contract-address>
STELLAR_NETWORK=testnet
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

### Where to find each value

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → `service_role` key (secret) |
| `MINTER_SECRET_KEY` | Run `stellar keys show <your-key-name>` or generate with `stellar keys generate backend-minter` |
| Contract addresses | Deployed contract IDs from `stellar contract deploy` |

## 2. Database Setup

The backend uses three tables in Supabase: `prosumers`, `readings`, and `mint_log`.

Go to your **Supabase Dashboard → SQL Editor** and run:

```sql
CREATE TABLE IF NOT EXISTS prosumers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stellar_address TEXT UNIQUE NOT NULL,
  name TEXT,
  hive_id TEXT DEFAULT 'hive-piloto',
  panel_capacity_kw REAL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosumer_id UUID NOT NULL REFERENCES prosumers(id),
  kwh_injected REAL NOT NULL,
  kwh_consumed REAL,
  reading_date DATE NOT NULL,
  source TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'pending',
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prosumer_id, reading_date)
);

CREATE TABLE IF NOT EXISTS mint_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id UUID REFERENCES readings(id),
  prosumer_address TEXT NOT NULL,
  amount_hdrop REAL NOT NULL,
  tx_hash TEXT NOT NULL,
  minted_at TIMESTAMPTZ DEFAULT now()
);
```

Alternatively, run `pnpm tsx scripts/setup-db.ts` from the repo root (it will print the SQL if the RPC method is unavailable).

## 3. Minter Account Setup

The minter account needs to:

1. **Exist on testnet** — fund it via Friendbot:
   ```bash
   stellar keys generate backend-minter --network testnet --fund
   ```
   Or if the key already exists:
   ```bash
   curl "https://friendbot.stellar.org/?addr=$(stellar keys address backend-minter)"
   ```

2. **Have the minter role** on the EnergyToken contract. The contract admin must call `add_minter` with this account's public key.

3. **Its secret key** goes into `MINTER_SECRET_KEY` in `.env.local`:
   ```bash
   stellar keys show backend-minter
   # Copy the output (starts with S...) into .env.local
   ```

## 4. Running the Backend

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm --filter @be-energy/web dev
```

The server runs at `http://localhost:3000`.

## 5. API Routes

### `POST /api/prosumers`
Register a new prosumer.
```json
{
  "stellar_address": "GABC...",
  "name": "Familia García",
  "panel_capacity_kw": 3.5
}
```

### `GET /api/prosumers`
List all registered prosumers.

### `POST /api/readings`
Submit a daily energy reading.
```json
{
  "stellar_address": "GABC...",
  "kwh_injected": 15.5,
  "kwh_consumed": 8.2,
  "reading_date": "2026-03-01"
}
```
Validations: prosumer must exist, `kwh_injected` must be > 0 and < 100, no duplicate reading for same prosumer+date.

### `POST /api/mint`
Mint HDROP tokens for a pending reading.
```json
{
  "reading_id": "uuid-of-the-reading"
}
```
This calls `mint_energy(to, amount, minter)` on the EnergyToken Soroban contract, signs server-side with `MINTER_SECRET_KEY`, and updates the reading status to `minted`.

## 6. Testing

```bash
# Run API unit tests (mocked, no external services)
pnpm --filter @be-energy/web test:api
```

## Flow Summary

```
Register prosumer → Submit daily reading (pending) → Mint HDROP tokens (minted)
       ↓                      ↓                              ↓
   prosumers table        readings table              mint_log table
                                                    + Soroban tx on-chain
```
