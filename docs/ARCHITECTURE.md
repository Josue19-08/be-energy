# 4. BeEnergy — Arquitectura

> v0.3.0 · Modelo cooperativo · Stellar Testnet

---

## System Architecture

```
┌──────────────┐
│  Medidor     │  Hardware del usuario-generador
│  inteligente │  Registra kWh generados
└──────┬───────┘
       │ dato de lectura (kWh, timestamp, meter_id)
       │
       │ Medidor inteligente envía lecturas vía API
       │ Fase 2: medidor inteligente envía automáticamente vía API
       ▼
┌──────────────┐
│  Cooperativa │  Admin con acceso al dashboard
│  (admin)     │  Valida y gestiona la operación
└──────┬───────┘
       │ POST /api/readings  →  POST /api/mint
       ▼
┌──────────────────────────────────────────────────┐
│  Backend BeEnergy (Next.js API Routes)           │
│                                                  │
│  /api/cooperatives  → Supabase (gestión coops)   │
│  /api/members       → Supabase (miembros)        │
│  /api/meters        → Supabase (medidores)       │
│  /api/readings      → Supabase (INSERT lectura)  │
│  /api/meters/readings → Bulk ingestion           │
│  /api/mint          → Soroban (mint_energy)      │
│  /api/certificates  → Supabase (proto-certs)     │
│  /api/certificates/retire → Soroban (burn)       │
│  /api/certificates/stats  → Estadísticas         │
│                                                  │
│  Supabase: cooperativas, medidores, lecturas,    │
│            certificados, retiros, logs           │
│  Soroban RPC: transacciones on-chain             │
└──────────────────┬───────────────────────────────┘
                   │ simulateTransaction → sendTransaction
                   ▼
┌──────────────────────────────────────────────────┐
│  Stellar Network (Soroban)                       │
│                                                  │
│  energy_token         mint / burn / balance      │
│  energy_distribution  registro + distribución    │
│  community_governance propuestas                 │
│                                                  │
│  Inmutable. Auditable. ~0.00001 XLM por tx.      │
└──────────────────┬───────────────────────────────┘
                   │ balance, historial
                   ▼
┌──────────────────────────────────────────────────┐
│  Dashboard (Next.js + React)                     │
│                                                  │
│  Vista cooperativa: medidores, lecturas,         │
│    miembros, certificados, estadísticas          │
│  Vista miembro: generación, certificados,        │
│    historial                                     │
│                                                  │
│  Wallet: Freighter (SEP-43) para firmar txs      │
│  El usuario no necesita saber qué es blockchain  │
└──────────────────────────────────────────────────┘
```

---

## Integración con medidores (Fase 2)

La infraestructura de medición remota ya existe en Argentina. BeEnergy no instala hardware — se conecta a lo que la cooperativa ya tiene o va a tener (plazo regulatorio: diciembre 2028).

### Fuentes de datos

```
Opción A: Inversor solar (API REST del fabricante)
┌──────────────┐     ┌─────────────────────────────┐
│  Inversor    │────▶│  API del fabricante          │
│  Fronius /   │     │                             │
│  Huawei /    │     │  Fronius: Solar API (JSON)   │
│  SMA         │     │  Huawei: OpenAPI             │
└──────────────┘     │  SMA: Sunny Portal API       │
                     │                             │
                     │  Dato: kWh generados,        │
                     │  kWh inyectados, potencia    │
                     │  Frecuencia: cada 1 min      │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                          POST /api/meters/readings

Opción B: Medidor bidireccional (vía sistema HES de la cooperativa)
┌──────────────┐     ┌─────────────────────────────┐
│  Medidor     │────▶│  HES / MDM cooperativa      │
│  bidireccional│     │                             │
│  (DLMS/COSEM)│     │  Protocolo: IEC 62056       │
│              │     │  Lectura cada 15 min         │
└──────────────┘     │  Energía activa/reactiva     │
                     │  Import + export (OBIS)      │
                     │                             │
                     │  Ej: DISCAR Mr.DiMS          │
                     │  (Justiniano Posse, Vicuña   │
                     │   Mackenna - Córdoba)         │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                          POST /api/meters/readings
```

### Qué cambia en BeEnergy para Fase 2

| Componente | Fase 1 (hoy) | Fase 2 |
|------------|-------------|--------|
| Ingesta de datos | Smart meter mock envía datos vía API | Integración directa con HES/MDM e inversores |
| Endpoint | `POST /api/meters/readings` (bulk) | Mismo endpoint, múltiples fuentes |
| Validación | Admin revisa y aprueba | Auto-validación con reglas + revisión por excepción |
| Frecuencia | Cada 15 min (mock) | Cada 15 min (medidor) o 1 min (inversor) |

No se necesita hardware nuevo. La cooperativa ya tiene medidores bidireccionales (obligatorios para generación distribuida) y muchas ya tienen lectura remota.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Blockchain | Stellar Testnet → Mainnet |
| Smart contracts | Soroban (Rust), soroban-sdk 23.1.0, OpenZeppelin v0.5.1 |
| Frontend | Next.js 16, React 19, Tailwind v4, shadcn/ui |
| Wallet | Stellar Wallets Kit (Freighter, SEP-43) |
| Backend | Next.js API Routes |
| Base de datos | Supabase (cooperativas, medidores, lecturas, certificados, retiros) |
| Deploy | Vercel (main branch) |

---

## Monorepo

```
be-energy/
├── apps/
│   ├── web/                          # Next.js 16 (@be-energy/web)
│   │   ├── app/
│   │   │   ├── dashboard/            # Dashboard cooperativa + miembro
│   │   │   ├── admin/                # Panel admin cooperativa
│   │   │   └── api/                  # API Routes
│   │   │       ├── cooperatives/     # Gestión cooperativas
│   │   │       ├── members/          # Gestión miembros
│   │   │       ├── meters/           # Medidores + bulk readings
│   │   │       ├── readings/         # Lecturas individuales
│   │   │       ├── mint/             # Mint on-chain
│   │   │       ├── certificates/     # Proto-certificados + retire + stats
│   │   │       └── defindex/         # DeFindex yield (intacto)
│   │   ├── components/ui/            # shadcn/ui
│   │   ├── hooks/                    # Contract hooks
│   │   ├── lib/                      # Contexts, config, supabase, types
│   │   └── __tests__/                # Vitest API tests
│   │
│   └── contracts/                    # Soroban (Rust)
│       ├── energy_token/             # Token SEP-41 por cooperativa
│       ├── energy_distribution/      # Distribución proporcional
│       └── community_governance/     # Propuestas (WIP)
│
├── packages/
│   └── stellar/                      # Shared wallet & config
│
├── scripts/
│   ├── setup-db.ts                   # Schema DB (migration-safe)
│   ├── smart-meter-mock.ts           # Simulador de medidores
│   └── simulate-testnet.ts           # Simulación testnet (legacy)
│
├── docs/                             # Documentación
└── vercel.json                       # Deploy config
```

---

## Contratos Soroban

```
┌─────────────────────────┐
│  Cooperative Factory     │  ← Fase 2
│  Despliega por coop     │
└────────────┬────────────┘
             │ deploy
             ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│  Energy Token            │     │  Cooperative Registry    │  ← Fase 2
│  SEP-41 (1 token = 1kWh)│◄────│  Directorio de coops    │
└────────────▲────────────┘     └─────────────────────────┘
             │
             │ mint_energy()
             │
┌────────────┴────────────┐
│  Energy Distribution     │
│  Distribución + lecturas │
└─────────────────────────┘

┌─────────────────────────┐
│  Community Governance    │  ← Fase 3
│  Votación (WIP)          │
└─────────────────────────┘
```

**Detalle de contratos:** ver `docs/CONTRACTS.md`

---

## API Routes

| Route | Method | Descripción |
|-------|--------|-------------|
| `/api/cooperatives` | GET, POST | Listar/registrar cooperativas |
| `/api/members` | GET, POST | Listar/registrar miembros |
| `/api/meters` | GET, POST | Listar/registrar medidores |
| `/api/readings` | POST | Cargar lectura individual (legacy + nuevo) |
| `/api/meters/readings` | POST | Ingesta bulk desde medidor |
| `/api/mint` | POST | Mintear proto-certificado on-chain (lectura o certificado) |
| `/api/certificates` | GET, POST | Listar/crear certificados |
| `/api/certificates/[id]` | GET | Detalle con proveniencia + Stellar Expert link |
| `/api/certificates/retire` | POST | Retirar certificado (burn on-chain) |
| `/api/certificates/stats` | GET | Estadísticas de certificación |
| `/api/prosumers` | GET, POST | Legacy proxy → members |

---

## Client Hooks

| Hook | Contrato | Funciones |
|------|----------|-----------|
| `useEnergyToken` | energy_token | `getBalance`, `transfer`, `mintEnergy`, `burnEnergy`, `checkIsMinter` |
| `useEnergyDistribution` | energy_distribution | `getMemberInfo`, `getTotalGenerated`, `getMemberList`, `recordGeneration` |

---

## Shared Package: @be-energy/stellar

| Módulo | Qué hace |
|--------|----------|
| `stellar-config.ts` | Endpoints RPC/Horizon, network passphrase |
| `wallet.ts` | Conexión wallet (Freighter), balance queries |
| `storage.ts` | localStorage tipado para wallet state |

---

## Environment Variables

### Públicas (client-side)

| Variable | Propósito |
|----------|----------|
| `NEXT_PUBLIC_STELLAR_NETWORK` | TESTNET / PUBLIC |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | Soroban RPC endpoint |
| `NEXT_PUBLIC_STELLAR_HORIZON_URL` | Horizon API endpoint |
| `NEXT_PUBLIC_ENERGY_TOKEN_CONTRACT` | Address del token |
| `NEXT_PUBLIC_ENERGY_DISTRIBUTION_CONTRACT` | Address de distribución |

### Secretas (server-side)

| Variable | Propósito |
|----------|----------|
| `MINTER_SECRET_KEY` | Clave del minter para firmar mints server-side |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key |

---

## Deploy

| | |
|---|---|
| **Plataforma** | Vercel |
| **Build** | `pnpm turbo build --filter=@be-energy/web` |
| **Output** | `apps/web/.next` |
| **Branch** | `main` |
| **Workflow** | `develop` → PR → `main` |
