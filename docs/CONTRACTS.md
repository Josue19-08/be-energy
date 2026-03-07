# 5. Soroban Contracts Reference

> BeEnergy v0.3.0

## Contratos actuales

3 contratos en `apps/contracts/`, compilados a WASM, desplegados en Stellar Testnet.

| Contrato | Propósito | OZ Libraries | Tests |
|----------|-----------|-------------|-------|
| `energy_token` | Token SEP-41 (1 token = 1 kWh) + Pausable + Upgradeable | stellar-tokens, stellar-access, stellar-macros, stellar-contract-utils | 36 |
| `energy_distribution` | Distribución proporcional + registro de lecturas + Pausable + Upgradeable | stellar-access, stellar-macros, stellar-contract-utils | 18 |
| `community_governance` | Propuestas (skeleton, sin votación) | Ninguna | 11 |

**65 tests, todos pasando.** `cd apps/contracts && cargo test`

**Dependencias:** soroban-sdk 23.1.0, OpenZeppelin stellar-contracts v0.5.1, Rust 1.89.0, target wasm32v1-none.

---

## 1. Energy Token

Token fungible SEP-41. Cada cooperativa tiene su propia instancia con nombre y símbolo propios. Incluye Pausable (freno de emergencia) y Upgradeable (actualización sin redeploy).

### Funciones

| Función | Auth | Guard | Descripción |
|---------|------|-------|-------------|
| `__constructor(admin, distribution_contract, name, symbol, cooperative_id)` | Deploy | — | Configura metadata, grants MINTER role a distribution_contract |
| `mint_energy(to, amount, minter)` | MINTER | `when_not_paused` | Mintea cuando la cooperativa valida una lectura |
| `burn_energy(from, amount)` | Holder | `when_not_paused` | Quema (retiro de certificado) |
| `grant_minter(new_minter)` | Admin | `when_not_paused` | Agrega minter |
| `revoke_minter(minter)` | Admin | `when_not_paused` | Revoca minter |
| `transfer(from, to, amount)` | SEP-41 | `when_not_paused` | Transferencia estándar |
| `transfer_from(spender, from, to, amount)` | SEP-41 | `when_not_paused` | Transferencia delegada |
| `burn(from, amount)` | SEP-41 | `when_not_paused` | Quema estándar |
| `burn_from(spender, from, amount)` | SEP-41 | `when_not_paused` | Quema delegada |
| `approve(owner, spender, amount, live_until_ledger)` | SEP-41 | — | Aprobación estándar |
| `total_supply()` | Público | — | Supply total |
| `balance(account)` | Público | — | Balance de cuenta |
| `allowance(owner, spender)` | Público | — | Allowance |
| `decimals()` | Público | — | Decimales (7) |
| `name()` | Público | — | Nombre del token |
| `symbol()` | Público | — | Símbolo del token |
| `is_minter(address)` | Público | — | Check rol minter |
| `admin()` | Público | — | Dirección del admin |
| `cooperative_id()` | Público | — | ID de la cooperativa |

### Pausable

| Función | Auth | Descripción |
|---------|------|-------------|
| `paused()` | Público | Retorna `true` si el contrato está pausado |
| `pause(caller)` | Admin | Pausa el contrato — bloquea operaciones state-changing |
| `unpause(caller)` | Admin | Despausa el contrato |

### Upgradeable

| Función | Auth | Descripción |
|---------|------|-------------|
| `upgrade(new_wasm_hash, operator)` | Admin | Actualiza el WASM del contrato |

---

## 2. Energy Distribution

Gestiona miembros de la cooperativa, valida lecturas y distribuye certificados proporcionalmente. Incluye Pausable y Upgradeable.

### Funciones

| Función | Auth | Guard | Descripción |
|---------|------|-------|-------------|
| `__constructor(admin, token_contract, cooperative_id, required_approvals)` | Deploy | — | Setup inicial |
| `add_members_multisig(approvers, members, percents)` | Multi-sig | `when_not_paused` | Registra miembros con % de participación |
| `record_generation(kwh_generated)` | Admin | `when_not_paused` | Valida lectura + mintea proporcional a cada miembro |
| `is_member(address)` | Público | — | Check membresía |
| `get_member_percent(address)` | Público | — | % de participación |
| `get_total_generated()` | Público | — | kWh totales generados |
| `get_admin()` | Público | — | Dirección del admin |

### Pausable

| Función | Auth | Descripción |
|---------|------|-------------|
| `paused()` | Público | Retorna `true` si el contrato está pausado |
| `pause(caller)` | Admin | Pausa el contrato |
| `unpause(caller)` | Admin | Despausa el contrato |

### Upgradeable

| Función | Auth | Descripción |
|---------|------|-------------|
| `upgrade(new_wasm_hash, operator)` | Admin | Actualiza el WASM del contrato |

---

## 3. Community Governance

Skeleton para gobernanza cooperativa. Solo crea propuestas, no tiene votación todavía.

| Función | Auth | Descripción |
|---------|------|-------------|
| `initialize(admin)` | Admin | Setup |
| `create_proposal(proposer, title)` | Autenticado | Crea propuesta |
| `get_proposal(id)` | Público | Lee propuesta |

**Cambios planificados:**
- Agregar `vote(proposal_id, voter, in_favor)`
- Agregar quorum y finalización
- Integrar con distribution (solo miembros votan)

---

## 4. Contratos futuros

### Cooperative Factory

Despliega token + distribution por cooperativa en 1 transacción.

```
Factory.create_cooperative(admin, name, symbol, required_approvals)
  → deploy energy_token(admin, name, symbol, cooperative_id)
  → deploy energy_distribution(admin, token_address, cooperative_id)
  → registra en Registry
  → retorna { token_address, distribution_address }
```

### Cooperative Registry

Registro central de cooperativas.

```rust
pub struct CooperativeInfo {
    pub id: u32,
    pub name: String,
    pub admin: Address,
    pub token_contract: Address,
    pub distribution_contract: Address,
    pub active: bool,
}
```

---

## 5. Tests

**65 tests, todos pasando.** `cd apps/contracts && cargo test`

| Contrato | Tests | Cobertura |
|----------|-------|-----------|
| energy_token | 36 | constructor, mint, burn, transfer, access control, pausable, upgradeable |
| energy_distribution | 18 | constructor, multisig, generation, views, pausable, upgradeable |
| community_governance | 11 | init, proposals, edge cases |

---

## 6. Testnet Deployments

| Contrato | Address |
|----------|---------|
| Token | [`CCYOVOFDJ5BVBSI6HADLWETTUF3BU423MEAWBSBWV2X5UVNKSJMRPBA6`](https://stellar.expert/explorer/testnet/contract/CCYOVOFDJ5BVBSI6HADLWETTUF3BU423MEAWBSBWV2X5UVNKSJMRPBA6) |
| Distribution | [`CBTDPLFNFGWVOD4HXDKW4EH5L3D2YGOY5CWTFCJM5TEWFL4VQTNX2UDZ`](https://stellar.expert/explorer/testnet/contract/CBTDPLFNFGWVOD4HXDKW4EH5L3D2YGOY5CWTFCJM5TEWFL4VQTNX2UDZ) |
| Governance | [`CCH2EXXNSDW2BAKBIPFAG6CCZS6LV4VJFUP2CZZCW5LEY4JOAXBJD6YI`](https://stellar.expert/explorer/testnet/contract/CCH2EXXNSDW2BAKBIPFAG6CCZS6LV4VJFUP2CZZCW5LEY4JOAXBJD6YI) |

Admin: `GCHCYTHV4JSIJNCN56EIEXZNTB6JUHYX25FTSYFOM4DDVGV7UXWOHLCW`

Constructor params:
- Token: `name="BeEnergy Piloto"`, `symbol="BEPIL"`, `cooperative_id="coop-piloto-001"`
- Distribution: `required_approvals=1`

---

## 7. Seguridad (OpenZeppelin)

Ambos contratos principales usan componentes auditados de OpenZeppelin Stellar v0.5.1:

| Componente | Qué hace |
|-----------|----------|
| **Pausable** | Freno de emergencia — admin puede pausar/despausar todas las operaciones state-changing |
| **Upgradeable** | Actualización de WASM sin redeploy — solo admin |
| **AccessControl** | Roles (admin, minter) con gestión segura |
| **`#[when_not_paused]`** | Guard macro que bloquea operaciones si el contrato está pausado |

Funciones protegidas por `when_not_paused`:
- `energy_token`: mint_energy, burn_energy, grant_minter, revoke_minter, transfer, transfer_from, burn, burn_from
- `energy_distribution`: add_members_multisig, record_generation
