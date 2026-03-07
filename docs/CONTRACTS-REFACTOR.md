# 6. Contratos Soroban — Qué se queda y qué falta

> BeEnergy v0.2.0 → v0.3.0
> Objetivo: soporte multi-cooperativa

> **Estado: Fase 1 completada (marzo 2026).** Los contratos energy_token y energy_distribution fueron refactorizados con Pausable + Upgradeable (OZ v0.5.1). 65 tests pasando. El nombre/símbolo del token es parametrizable, se agregó cooperative_id, se eliminó el módulo de privacidad. Factory y Registry quedan para Fase 2.

---

## Contexto

HOW-IT-WORKS define que BeEnergy es dashboard de gestión + infraestructura de certificación para cooperativas. Cada cooperativa administra su propio sistema de proto-certificados energéticos. El objetivo es que cada cooperativa tenga su propio token y que eventualmente se pueda habilitar intercambio entre cooperativas.

Los contratos actuales fueron diseñados para una sola comunidad ("Hive"). Este documento analiza qué sirve, qué hay que cambiar y qué hay que crear.

---

## 1. Energy Token (`energy_token`) — SE QUEDA con cambios

### Qué funciona bien
- SEP-41 compliant via OpenZeppelin (`FungibleToken`, `FungibleBurnable`, `AccessControl`)
- Patrón `__constructor` (Protocol 22+) — el más moderno
- Rol MINTER con grant/revoke — correcto para que la cooperativa controle quién mintea
- `1 token = 1 kWh` — alineado con HOW-IT-WORKS
- TTL management — resuelto
- 21 tests pasando

### Qué hay que cambiar

| Cambio | Por qué | Esfuerzo |
|--------|---------|----------|
| Nombre/símbolo parametrizable en constructor | Hoy está hardcodeado como "HoneyDrop"/"HDROP". Cada cooperativa necesita su propio nombre (ej: "CoopNorte kWh", "CNKWH") | Bajo |
| Agregar `cooperative_id` al storage | Para que el Registry sepa a qué cooperativa pertenece este token | Bajo |
| Agregar `transfer_admin` | Hoy el admin no se puede cambiar. Si la cooperativa cambia de representante, no hay forma de rotar admin sin redesplegar | Bajo |

### Cambios concretos en el código

```rust
// Antes
pub fn __constructor(e: &Env, admin: Address, distribution_contract: Address, initial_supply: i128) {
    Base::set_metadata(e, 7, String::from_str(e, "HoneyDrop"), String::from_str(e, "HDROP"));
    // ...
}

// Después
pub fn __constructor(
    e: &Env,
    admin: Address,
    distribution_contract: Address,
    initial_supply: i128,
    name: String,        // NUEVO
    symbol: String,      // NUEVO
    cooperative_id: u32, // NUEVO
) {
    Base::set_metadata(e, 7, name, symbol);
    e.storage().instance().set(&DataKey::CooperativeId, &cooperative_id);
    // ...
}
```

---

## 2. Energy Distribution (`energy_distribution`) — SE QUEDA con cambios

### Qué funciona bien
- Distribución proporcional por porcentaje de propiedad — es exactamente lo que necesita cada cooperativa
- Registro multi-firma de miembros — bueno para gobernanza interna
- Cross-contract call a `mint_energy` — funciona
- Persistent storage para datos per-user — correcto
- TTL management — resuelto
- 26 tests pasando

### Qué hay que cambiar

| Cambio | Por qué | Esfuerzo |
|--------|---------|----------|
| Migrar a `__constructor` | Usa patrón `initialize` viejo. Constructor es más seguro (single-execution garantizada por el runtime) | Bajo |
| Agregar `cooperative_id` | Mismo que token — para vincular al Registry | Bajo |
| Agregar `update_members` o `remove_member` | Hoy `add_members_multisig` solo agrega, no permite actualizar ni remover. Una cooperativa real necesita poder cambiar la nómina | Medio |
| Agregar `transfer_admin` | Misma razón que en token | Bajo |

### Qué se puede sacar

| Módulo | Decisión | Por qué |
|--------|----------|---------|
| Privacy module (`privacy.rs`) | **SACAR** | Es una simulación SHA256, no privacidad real. Agrega complejidad sin valor. Si se necesita privacidad en el futuro, se implementa con ZK reales (Groth16/BLS12-381). HOW-IT-WORKS no menciona privacidad |
| `enable_privacy` | **SACAR** | Parte del módulo de privacidad |
| `record_private_consumption` | **SACAR** | Parte del módulo de privacidad |
| `verify_private_consumption` | **SACAR** | Parte del módulo de privacidad |
| `generate_commitment_helper` | **SACAR** | Parte del módulo de privacidad |

Sacar el módulo de privacidad elimina ~150 líneas de código y 7 tests que testean funcionalidad de demo.

---

## 3. Community Governance (`community_governance`) — SE QUEDA pero necesita completarse

### Estado actual
- Solo crea propuestas — no tiene `vote()`, ni quorum, ni ejecución
- 58 líneas de código + 10 tests
- No tiene relación con ningún otro contrato
- No usa OpenZeppelin

### Qué falta para ser funcional

| Función | Descripción | Esfuerzo |
|---------|-------------|----------|
| `vote(proposal_id, voter, in_favor)` | Voto por propuesta, verificar que sea miembro | Medio |
| `get_votes(proposal_id)` | Ver votos actuales | Bajo |
| `finalize_proposal(proposal_id)` | Cerrar votación, verificar quorum | Medio |
| Integración con Distribution | Verificar membresía contra el contrato de distribución (solo miembros votan) | Medio |
| `cooperative_id` | Para vincular al Registry | Bajo |
| Migrar a `__constructor` | Consistencia | Bajo |

### Decisión recomendada

Completar el governance es necesario pero no bloqueante para multi-cooperativa. Se puede hacer en paralelo.

---

## 4. Contratos NUEVOS necesarios

### 4.1 Cooperative Factory

**Propósito:** Despliega el set de contratos (token + distribution + governance) para cada cooperativa nueva con una sola llamada.

```
Factory.create_cooperative(admin, name, symbol, required_approvals)
  → despliega Energy Token (name, symbol, cooperative_id)
  → despliega Energy Distribution (token_address, cooperative_id)
  → despliega Community Governance (cooperative_id)
  → registra todo en el Registry
  → retorna { token_address, distribution_address, governance_address }
```

**Por qué:** Sin factory, crear una cooperativa requiere 3 despliegues manuales + configuración cruzada. Con factory es una sola transacción.

**Esfuerzo:** Alto — requiere `deployer::deploy_contract` de Soroban + pasar WASMs como parámetros o almacenarlos.

### 4.2 Cooperative Registry

**Propósito:** Registro central que sabe qué cooperativas existen, cuáles son sus contratos, y permite buscar/listar.

```rust
pub struct CooperativeInfo {
    pub id: u32,
    pub name: String,
    pub admin: Address,
    pub token_contract: Address,
    pub distribution_contract: Address,
    pub governance_contract: Address,
    pub created_at: u64,
    pub active: bool,
}
```

**Funciones principales:**
- `register_cooperative(info)` — Solo el Factory puede llamar
- `get_cooperative(id)` → `CooperativeInfo`
- `list_cooperatives()` → `Vec<CooperativeInfo>`
- `get_cooperative_by_token(token_address)` → `Option<CooperativeInfo>`
- `deactivate_cooperative(id)` — Admin global

**Por qué:** Sin registry, el frontend no tiene forma de descubrir cooperativas. Cada app instance tendría que hardcodear las addresses.

**Esfuerzo:** Medio

---

## 5. Intercambio entre cooperativas — FASE POSTERIOR

El intercambio cross-cooperativa (un usuario de CoopA compra créditos de CoopB) **no necesita DEX**.

### Opción recomendada: Swap administrado

Un contrato simple donde:
1. CoopA lista créditos disponibles para intercambio
2. CoopB solicita compra
3. Ambos admins aprueban
4. El contrato ejecuta: burn en token A + mint en token B (o transfer si hay equivalencia directa)

**Decisión:** Diferir a Fase 2/3. No es necesario para el lanzamiento multi-cooperativa. Las cooperativas primero necesitan funcionar individualmente.

---

## 6. Resumen de prioridades

### Fase 1 — Multi-cooperativa básica (v0.3.0)

| Tarea | Contrato | Tipo | Esfuerzo |
|-------|----------|------|----------|
| Parametrizar nombre/símbolo | `energy_token` | Modificar | Bajo |
| Agregar `cooperative_id` | `energy_token` | Modificar | Bajo |
| Agregar `transfer_admin` | `energy_token` | Modificar | Bajo |
| Migrar a `__constructor` | `energy_distribution` | Modificar | Bajo |
| Agregar `cooperative_id` | `energy_distribution` | Modificar | Bajo |
| Sacar módulo privacy | `energy_distribution` | Eliminar | Bajo |
| Crear Registry | **nuevo** | Crear | Medio |
| Crear Factory | **nuevo** | Crear | Alto |

### Fase 2 — Governance + operación (v0.4.0)

| Tarea | Contrato | Tipo | Esfuerzo |
|-------|----------|------|----------|
| Completar voting | `community_governance` | Modificar | Medio |
| Agregar `update_members` | `energy_distribution` | Modificar | Medio |
| Integrar governance con distribution | Ambos | Modificar | Medio |

### Fase 3 — Cross-cooperativa (v0.5.0)

| Tarea | Contrato | Tipo | Esfuerzo |
|-------|----------|------|----------|
| Swap administrado | **nuevo** | Crear | Medio |
| Dashboard multi-coop | Frontend | Crear | Alto |

---

## 7. Lo que NO cambia

- **soroban-sdk 23.1.0** — versión estable, no hay razón para cambiar
- **OpenZeppelin stellar-contracts v0.5.1** — seguir usando para tokens y access control
- **Rust toolchain 1.89.0 + wasm32v1-none** — target correcto
- **TTL management** — ya resuelto en los 3 contratos
- **Tests** — mantener todos los existentes, agregar nuevos para cambios
- **1 token = 1 kWh** — concepto central, no cambia
- **SEP-41 compliance** — estándar, no cambia

---

## 8. Impacto en el frontend

Los cambios en contratos requieren actualizar:

| Componente | Cambio |
|-----------|--------|
| `packages/stellar/src/stellar-config.ts` | Agregar addresses de Registry/Factory |
| `hooks/useEnergyToken.ts` | Constructor nuevo (name, symbol) |
| `hooks/useEnergyDistribution.ts` | Remover funciones de privacy |
| **NUEVO** `hooks/useCooperativeRegistry.ts` | Listar/buscar cooperativas |
| **NUEVO** `hooks/useCooperativeFactory.ts` | Crear cooperativas |
| Dashboard | Selector de cooperativa, multi-token display |
| DeFindex integration | Evaluar si tiene sentido por cooperativa o global |

---

## 9. Contratos deployados actualmente (Testnet)

Estos contratos se redesplegarán con los cambios:

| Contrato | Address | Estado |
|----------|---------|--------|
| Token (HDROP) | `CAUH3NUZ...GAGBBL2` | Reemplazar por instancia vía Factory |
| Distribution | `CDXWZSWT...EMIROR` | Reemplazar por instancia vía Factory |
| Governance | `CCH2EXXN...XBJD6YI` | Reemplazar por instancia vía Factory |

Los contratos actuales en testnet quedan obsoletos. No hay migración — se despliegan nuevos.
