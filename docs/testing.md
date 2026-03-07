# 8. Testing — BeEnergy

Última actualización: **2026-03-07**
Red: **Stellar Testnet**

---

## Unit Tests (API Routes)

45 tests en 10 archivos. Se ejecutan con Vitest.

```bash
cd apps/web && pnpm test
```

| Archivo | Tests | Qué valida |
|---------|-------|------------|
| `cooperatives.test.ts` | 4 | CRUD cooperativas, validación de campos |
| `members.test.ts` | 4 | CRUD miembros, deduplicación por address |
| `meters.test.ts` | 5 | CRUD medidores, filtros por cooperativa y status |
| `readings.test.ts` | 4 | Lectura individual, backward compat (kwh_injected → kwh_generated) |
| `meters-readings.test.ts` | 6 | Ingesta bulk desde medidor, validación meter activo |
| `mint.test.ts` | 6 | Mint por reading_id (legacy) y por certificate_id (nuevo) |
| `certificates.test.ts` | 3 | CRUD certificados, filtros |
| `certificates-retire.test.ts` | 5 | Retiro (burn on-chain), validación buyer_purpose |
| `certificates-stats.test.ts` | 2 | Estadísticas de certificación, CO2 evitado |
| `prosumers.test.ts` | 6 | Legacy proxy, backward compat |

---

## Simulación Testnet (legacy)

> Nota: La simulación original (v0.2.0) usaba un flujo P2P con token HDROP, marketplace y offers. Ese flujo fue reemplazado por el modelo de certificación actual. El script `scripts/simulate-testnet.ts` queda como referencia histórica.

### Contratos deployados (Testnet, v0.2.0)

| Contrato | Address | Explorer |
|----------|---------|----------|
| ENERGY_TOKEN (HDROP) | `CAUH3NUZGCNRHHVJK5S3FLXIS244GCNPC2LDZDU2SVOK66G3IGAGBBL2` | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAUH3NUZGCNRHHVJK5S3FLXIS244GCNPC2LDZDU2SVOK66G3IGAGBBL2) |
| ENERGY_DISTRIBUTION | `CDXWZSWTM6DGYTDME3BEDE6U7JBHMG4YM7ZW237UZS2XTUWFVEEMIROR` | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDXWZSWTM6DGYTDME3BEDE6U7JBHMG4YM7ZW237UZS2XTUWFVEEMIROR) |
| COMMUNITY_GOVERNANCE | `CCH2EXXNSDW2BAKBIPFAG6CCZS6LV4VJFUP2CZZCW5LEY4JOAXBJD6YI` | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CCH2EXXNSDW2BAKBIPFAG6CCZS6LV4VJFUP2CZZCW5LEY4JOAXBJD6YI) |

Estos contratos se redesplegarán con los cambios de v0.3.0 (nombre parametrizable, cooperative_id, Pausable + Upgradeable).

---

## Smart Meter Mock

Simulador de medidores inteligentes para generar datos realistas.

```bash
# Generar 7 días de historial
COOPERATIVE_ID=<uuid> pnpm meter:mock:backfill

# Modo continuo (lectura cada 15 min)
COOPERATIVE_ID=<uuid> pnpm meter:mock
```

### Qué genera

- Curva solar gaussiana (pico a las 13:00, sigma ~3h)
- 0 kWh de noche
- Factor climático aleatorio 0.6–1.0
- Limitado por `capacity_kw` de cada medidor
- Envía a `POST /api/meters/readings` (bulk)

---

## Flujo de verificación actual (v0.3.0)

```
1. Registrar cooperativa
   POST /api/cooperatives
   { name, technology, admin_stellar_address }

2. Registrar miembros
   POST /api/members
   { stellar_address, cooperative_id }

3. Registrar medidores
   POST /api/meters
   { cooperative_id, member_stellar_address, device_type, technology, capacity_kw }

4. Cargar lecturas (medidor inteligente envía vía API)
   POST /api/readings                → lectura individual
   POST /api/meters/readings          → ingesta bulk

5. Crear proto-certificado
   POST /api/certificates
   { cooperative_id, generation_period_start, generation_period_end, total_kwh, technology }

6. Mintear on-chain
   POST /api/mint
   { certificate_id }
   → Soroban tx: mint_energy() → status: available

7. Retirar certificado (comprador externo)
   POST /api/certificates/retire
   { certificate_id, buyer_address, buyer_purpose }
   → Soroban tx: burn_energy() → status: retired

8. Ver estadísticas
   GET /api/certificates/stats
   → total_kwh_certified, total_kwh_retired, co2_avoided_kg
```

---

## Cómo correr los tests

### Unit tests

```bash
cd apps/web && pnpm test
```

### Contract tests (Soroban)

```bash
cd apps/contracts && cargo test
```

### Setup DB (primera vez o migración)

```bash
npx tsx scripts/setup-db.ts
```

Requiere `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `apps/web/.env.local`, y la función `exec_sql` creada en Supabase (ver script para detalle).

---

## Tablas en Supabase

| Tabla | Descripción |
|-------|-------------|
| `cooperatives` | Registro de cooperativas |
| `prosumers` | Miembros (legacy: prosumers, migrado con cooperative_id y role) |
| `meters` | Medidores/dispositivos por cooperativa |
| `readings` | Lecturas de generación (individual y bulk) |
| `certificates` | Proto-certificados de generación renovable |
| `retirements` | Retiros de certificados por compradores externos |
| `mint_log` | Log de transacciones on-chain (mint) |
