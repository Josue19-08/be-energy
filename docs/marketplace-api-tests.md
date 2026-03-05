# Marketplace Offers API — Pruebas verificadas

Pruebas ejecutadas contra producción (`https://be-energy-six.vercel.app`) el 2026-03-05.

## Endpoints

- `GET /api/offers` — listar ofertas activas
- `POST /api/offers` — crear oferta
- `PATCH /api/offers` — marcar oferta como vendida

---

## GET /api/offers

### Listar ofertas activas

```bash
curl -s https://be-energy-six.vercel.app/api/offers
```

**Status:** `200 OK`

**Response:**
```json
[
    {
        "id": "932b3828-3ae3-4cee-8cba-75e9d7a11857",
        "seller_address": "GBIUCGDMGXM2ZMNEOCPRVIGDPBPWZ73YANLK4KMOEVDDBXNS43UDWLYM",
        "seller_short": "GBIU...WLYM",
        "amount_kwh": 50,
        "price_per_kwh": 0.5,
        "total_xlm": 25,
        "status": "active",
        "tx_hash": null,
        "created_at": "2026-03-05T05:42:53.583827+00:00"
    },
    {
        "id": "9bb8b319-48f1-4cd6-b2a4-f890e19610e6",
        "seller_address": "GCSNZWMCCWX7O55W4PVBD4S7EOHG55JRNUNPDYW44TVV6GORLMY67LQZ",
        "seller_short": "GCSN...7LQZ",
        "amount_kwh": 50,
        "price_per_kwh": 0.5,
        "total_xlm": 25,
        "status": "active",
        "tx_hash": null,
        "created_at": "2026-03-05T05:42:09.707669+00:00"
    },
    {
        "id": "dac54e8c-950f-4018-b685-e0a5df06fc93",
        "seller_address": "GDEPRAQKNMTNGZCKL4GU5HGQ4UL6LZ4PS46LZ5HG44CSPBVZXQUL36B4",
        "seller_short": "GDEP...36B4",
        "amount_kwh": 1616,
        "price_per_kwh": 1.6,
        "total_xlm": 2585.6,
        "status": "active",
        "tx_hash": null,
        "created_at": "2026-03-05T05:37:16.996425+00:00"
    },
    {
        "id": "6fa0f654-969a-4c1d-9750-7b0366eb92ef",
        "seller_address": "GDEPRAQKNMTNGZCKL4GU5HGQ4UL6LZ4PS46LZ5HG44CSPBVZXQUL36B4",
        "seller_short": "GDEP...36B4",
        "amount_kwh": 50,
        "price_per_kwh": 0.5,
        "total_xlm": 25,
        "status": "active",
        "tx_hash": null,
        "created_at": "2026-03-05T04:50:51.612353+00:00"
    }
]
```

---

## POST /api/offers

### Crear oferta (happy path)

```bash
curl -s -X POST https://be-energy-six.vercel.app/api/offers \
  -H "Content-Type: application/json" \
  -d '{
    "seller_address": "GTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD",
    "amount_kwh": 10,
    "price_per_kwh": 0.3,
    "total_xlm": 3
  }'
```

**Status:** `201 Created`

**Response:**
```json
{
    "id": "7378cd45-8360-4aba-b8ee-77d338f20e8c",
    "seller_address": "GTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD",
    "seller_short": "GTES...ABCD",
    "amount_kwh": 10,
    "price_per_kwh": 0.3,
    "total_xlm": 3,
    "status": "active",
    "tx_hash": null,
    "created_at": "2026-03-05T15:25:40.590281+00:00"
}
```

> `seller_short` se computa server-side a partir de `seller_address` — el cliente no lo envía.

### Validación: campos faltantes

```bash
curl -s -X POST https://be-energy-six.vercel.app/api/offers \
  -H "Content-Type: application/json" \
  -d '{"seller_address": "GTEST"}'
```

**Status:** `400 Bad Request`

**Response:**
```json
{
    "error": "Missing required fields"
}
```

### Validación: números negativos

```bash
curl -s -X POST https://be-energy-six.vercel.app/api/offers \
  -H "Content-Type: application/json" \
  -d '{
    "seller_address": "GTEST",
    "amount_kwh": -5,
    "price_per_kwh": 0.3,
    "total_xlm": 3
  }'
```

**Status:** `400 Bad Request`

**Response:**
```json
{
    "error": "Numeric fields must be positive numbers"
}
```

---

## PATCH /api/offers

### Marcar como vendida (happy path)

```bash
curl -s -X PATCH https://be-energy-six.vercel.app/api/offers \
  -H "Content-Type: application/json" \
  -d '{
    "id": "7378cd45-8360-4aba-b8ee-77d338f20e8c",
    "status": "sold",
    "tx_hash": "test_tx_abc123"
  }'
```

**Status:** `200 OK`

**Response:**
```json
{
    "id": "7378cd45-8360-4aba-b8ee-77d338f20e8c",
    "seller_address": "GTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD",
    "seller_short": "GTES...ABCD",
    "amount_kwh": 10,
    "price_per_kwh": 0.3,
    "total_xlm": 3,
    "status": "sold",
    "tx_hash": "test_tx_abc123",
    "created_at": "2026-03-05T15:25:40.590281+00:00"
}
```

> Tras marcar como `sold`, la oferta ya no aparece en `GET /api/offers` (que solo devuelve `status: "active"`).

### Validación: sin id o status

```bash
curl -s -X PATCH https://be-energy-six.vercel.app/api/offers \
  -H "Content-Type: application/json" \
  -d '{"id": "abc"}'
```

**Status:** `400 Bad Request`

**Response:**
```json
{
    "error": "Missing required fields: id and status"
}
```

### Validación: status inválido

```bash
curl -s -X PATCH https://be-energy-six.vercel.app/api/offers \
  -H "Content-Type: application/json" \
  -d '{"id": "abc", "status": "deleted"}'
```

**Status:** `400 Bad Request`

**Response:**
```json
{
    "error": "Invalid status transition. Allowed: sold"
}
```

---

## Resumen

| # | Test | Endpoint | Status | Resultado |
|---|------|----------|--------|-----------|
| 1 | Listar ofertas activas | `GET` | `200` | 4 ofertas con status `active`, ordenadas por fecha desc |
| 2 | Crear oferta | `POST` | `201` | Oferta creada, `seller_short` computado server-side |
| 3 | Campos faltantes | `POST` | `400` | `Missing required fields` |
| 4 | Números negativos | `POST` | `400` | `Numeric fields must be positive numbers` |
| 5 | Marcar como vendida | `PATCH` | `200` | Status cambiado a `sold`, `tx_hash` guardado |
| 6 | Sin id/status | `PATCH` | `400` | `Missing required fields: id and status` |
| 7 | Status inválido | `PATCH` | `400` | `Invalid status transition. Allowed: sold` |
| 8 | Oferta vendida no aparece | `GET` | `200` | Confirmado: vuelve a 4 ofertas (la vendida se filtró) |

Todas las pruebas pasaron correctamente.
