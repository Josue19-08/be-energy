# DeFindex — Setup y Configuración

> Guía para crear y configurar el vault de DeFindex en BeEnergy.

## Qué es DeFindex

[DeFindex](https://defindex.io) es un protocolo DeFi sobre Stellar (creado por [PaltaLabs](https://paltalabs.io)) que permite depositar tokens en **vaults** (bóvedas) que generan rendimiento automático. En BeEnergy, los usuarios pueden depositar HDROP en un vault y ganar interés pasivo.

## Arquitectura

```
Dashboard (useDefindex hook)
  → Next.js API Routes (/api/defindex/*)
    → lib/defindex-service.ts (server-side)
      → @defindex/sdk
        → DeFindex API (api.defindex.io)
          → Vault contract en Soroban
```

## Variables de entorno necesarias

Agregar en `apps/web/.env.local`:

```env
# API key de DeFindex (server-side, nunca exponer al client)
DEFINDEX_API_KEY=sk_tu_api_key_aqui

# Dirección del vault en Soroban
NEXT_PUBLIC_DEFINDEX_VAULT_ADDRESS=CBVJUQI5TOLZ47KGO5QFZ6W3ZGJKXJQD2HRJHFW3DVZEFMCIE4M3VYVA
```

**Sin estas variables, la sección DeFindex se oculta automáticamente en el dashboard.** No muestra datos fake.

## Cómo obtener la API key

1. Registrarse en https://api.defindex.io/register
2. Login en https://api.defindex.io/login
3. Generar API key en el dashboard (formato `sk_...`)

Docs de la API: https://api.defindex.io/docs

## Cómo crear un vault

### Requisitos previos
- API key activa
- Una cuenta Stellar con fondos en testnet (la cuenta firma la transacción de creación)

### Paso 1 — Pedir el XDR de creación a la API

```bash
CALLER="GBWTQUAH..."  # cuenta que firma y administra el vault
HDROP="CAUH3NUZGCNRHHVJK5S3FLXIS244GCNPC2LDZDU2SVOK66G3IGAGBBL2"

curl -X POST "https://api.defindex.io/factory/create-vault?network=testnet" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "roles": {
      "0": "'$CALLER'",
      "1": "'$CALLER'",
      "2": "'$CALLER'",
      "3": "'$CALLER'"
    },
    "vault_fee_bps": 0,
    "assets": [{
      "address": "'$HDROP'",
      "strategies": []
    }],
    "name_symbol": {
      "name": "BeEnergy HDROP Vault",
      "symbol": "beHDROP"
    },
    "upgradable": true,
    "caller": "'$CALLER'"
  }'
```

La respuesta incluye un `xdr` (transacción sin firmar) y `simulation_result: "SUCCESS"`.

**Roles del vault:**
| Rol | Nro | Función |
|-----|-----|---------|
| Emergency Manager | 0 | Rescate de fondos en emergencia |
| Fee Receiver | 1 | Recibe comisiones |
| Vault Manager | 2 | Administra el vault |
| Rebalance Manager | 3 | Rebalancea estrategias |

### Paso 2 — Firmar y enviar

El XDR debe firmarse con la secret key del `caller` y enviarse a Soroban RPC. Al confirmar, devuelve la **dirección del vault**.

### Nota sobre latencia de la API

La API de DeFindex tiene un **rate limit de 1 request/segundo** y los endpoints pueden devolver **403 Forbidden** temporalmente por latencia o rate limiting. Esto no significa que el vault no exista — se puede verificar directo en Soroban:

```bash
# Verificar que el vault existe on-chain
node -e "
const S = require('@stellar/stellar-sdk');
const server = new S.rpc.Server('https://soroban-testnet.stellar.org');
const contract = new S.Contract('VAULT_ADDRESS');
// ... llamar name(), symbol(), get_assets()
"
```

En nuestra experiencia, la API respondió 403 inicialmente pero comenzó a funcionar correctamente minutos después. Si esto pasa, esperar y reintentar.

## Vault actual (Testnet)

| Campo | Valor |
|-------|-------|
| Dirección | `CBVJUQI5TOLZ47KGO5QFZ6W3ZGJKXJQD2HRJHFW3DVZEFMCIE4M3VYVA` |
| Nombre | DeFindex-Vault-BeEnergy HDROP Vault |
| Symbol | beHDROP |
| Asset | HDROP (`CAUH3NUZGCNRHHVJK5S3FLXIS244GCNPC2LDZDU2SVOK66G3IGAGBBL2`) |
| APY | ~5-10% (variable, calculado por DeFindex) |
| Strategies | Ninguna (hodl) |
| Fee | 0% vault fee, 20% DeFindex fee |
| Manager | `GBWTQUAHJYBFWBIFAH5OEKGKFLDON7EYIU5FZELKZT3SYFZOBGS3YUQW` |
| Red | Stellar Testnet |
| Creado | 2026-03-05 |

## API Routes del frontend

| Route | Método | Descripción | Estado |
|-------|--------|-------------|--------|
| `/api/defindex/health` | GET | Health check del SDK | Funciona |
| `/api/defindex/vault/[address]` | GET | Info del vault (nombre, APY, assets) | Funciona |
| `/api/defindex/stats/[vault]/[user]` | GET | Balance y rendimiento del usuario | Requiere depósito previo |
| `/api/defindex/deposit` | POST | Genera XDR de depósito (usuario firma) | Funciona |
| `/api/defindex/withdraw` | POST | Genera XDR de retiro (usuario firma) | Funciona |

## Estado actual

- Vault creado y verificado on-chain
- API routes conectadas
- Dashboard muestra sección DeFindex cuando el vault está configurado
- **Pendiente**: nadie ha depositado HDROP en el vault todavía, por lo que las stats de usuario muestran error (esperado)
- **Pendiente**: el vault no tiene strategies activas (es un hodl vault), el APY que muestra DeFindex es un valor base de referencia

## Contacto PaltaLabs

- Demo: https://cal.com/devmonsterblock
- GitHub: https://github.com/paltalabs
- SDK: https://github.com/paltalabs/defindex-sdk
