# BeEnergy — Plan de Producto

## Qué es

Infraestructura de certificación energética y dashboard de gestión para cooperativas eléctricas argentinas. Tokeniza la producción de energía renovable como proto-certificados verificables en Stellar, vendibles a compradores externos.

## Cómo gana plata BeEnergy

Dos fuentes de ingresos:

1. **Suscripción SaaS** — por el dashboard de gestión cooperativa
2. **Comisión sobre venta de certificados** — porcentaje sobre cada proto-certificado vendido a compradores externos

| Plan | Incluye |
|------|---------|
| Starter | Hasta 50 miembros, dashboard básico, 1 admin |
| Pro | Hasta 500 miembros, analytics, múltiples admins |
| Enterprise | Ilimitado, API, integración con medidores, soporte dedicado |

---

## Fase 1 — 1 cooperativa piloto

**Objetivo:** Una cooperativa real gestiona su generación con BeEnergy en Testnet. Proto-certificados emitidos y verificables on-chain.

**Contratos Soroban:**
- `energy_token` — SEP-41 parametrizable (nombre, símbolo, cooperative_id). 1 token = 1 kWh. Pausable + Upgradeable
- `energy_distribution` — Distribución proporcional por miembro, multisig. Pausable + Upgradeable
- `community_governance` — Propuestas (skeleton, votación WIP)

**API:**
- `POST /api/cooperatives` — Registrar cooperativa
- `POST /api/members` — Registrar miembro de cooperativa
- `POST /api/meters` — Registrar medidor
- `POST /api/readings` — Cargar lectura (manual desde el dashboard)
- `POST /api/meters/readings` — Ingesta bulk desde medidor
- `POST /api/mint` — Validar lectura o certificado → mintear on-chain
- `POST /api/certificates` — Crear proto-certificado
- `POST /api/certificates/retire` — Retirar certificado (burn on-chain)
- `GET /api/certificates/stats` — Estadísticas de certificación

**Dashboard:**
- Vista cooperativa (admin): medidores, lecturas, miembros, certificados, estadísticas
- Vista miembro: generación personal, certificados, historial
- Login con wallet Stellar

**Ingesta de datos (Fase 1):**
La cooperativa carga las lecturas manualmente a través del dashboard.

**Flujo:**
```
Medidor registra kWh → Cooperativa carga dato al dashboard → Se valida →
Se mintea proto-certificado on-chain → Comprador externo lo adquiere →
Se retira el certificado (burn) → Evita doble conteo
```

---

## Fase 2 — Medidores inteligentes + multi-cooperativa

**Objetivo:** Ingesta automática de datos. Cualquier cooperativa se suma.

**Contratos nuevos:**
- `cooperative_factory` — Despliega token + distribution + governance en 1 tx
- `cooperative_registry` — Directorio de cooperativas y sus contratos

**Cambios:**
- Ingesta automática: medidores inteligentes envían datos vía API (smart meter mock disponible)
- Auto-validación con reglas + revisión por excepción
- Onboarding de cooperativa via dashboard
- Selector de cooperativa en el frontend

---

## Fase 3 — Governance + analytics

**Contratos:**
- `community_governance` completo: `vote()`, quorum, finalización

**Frontend:**
- Propuestas y votación
- Analytics: generación por período, ranking, proyecciones
- Reportes exportables, alertas

---

## Fase 4 — Inter-cooperativa

> Requiere evolución regulatoria + consulta legal previa.

**Contrato nuevo:**
- `cooperative_swap` — Burn token A → mint token B, tasa bilateral

**Requisitos:**
- Dictamen legal favorable
- Al menos 2 cooperativas activas
- Acuerdo bilateral firmado

---

## Marco legal

- **Fase 1-3:** Legal bajo Ley 27.424 (intra-cooperativa). El token es un proto-certificado operativo, no un activo especulativo
- **Fase 4:** Requiere consulta legal (Decreto 450/25 abre camino)
- **PSAV:** No aplica en Fase 1-3
