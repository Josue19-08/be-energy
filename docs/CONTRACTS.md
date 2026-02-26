# Soroban Contracts Reference

> BeEnergy v0.2.0 — Stellar Testnet

## Overview

Three Soroban smart contracts organized as a Rust workspace in `apps/contracts/`:

| Contract | Purpose | Lines | OZ Libraries |
|----------|---------|-------|--------------|
| `energy_token` | SEP-41 fungible token (HDROP) | 260 | stellar-tokens, stellar-access, stellar-macros |
| `energy_distribution` | Pro-rata distribution + privacy | 481 | stellar-access, stellar-macros, stellar-tokens |
| `community_governance` | Proposal creation (skeleton) | 58 | None |

**Dependencies:**
- `soroban-sdk` v23.1.0
- OpenZeppelin `stellar-contracts` v0.5.1 (git, tag-pinned)
- Rust toolchain: 1.89.0, target `wasm32v1-none`

**Deployed on Testnet:**
- Token: `CAUH3NUZGCNRHHVJK5S3FLXIS244GCNPC2LDZDU2SVOK66G3IGAGBBL2`
- Distribution: `CDXWZSWTM6DGYTDME3BEDE6U7JBHMG4YM7ZW237UZS2XTUWFVEEMIROR`
- Governance: `CCH2EXXNSDW2BAKBIPFAG6CCZS6LV4VJFUP2CZZCW5LEY4JOAXBJD6YI`

---

## 1. Energy Token (`energy_token`)

SEP-41 compliant fungible token representing solar energy. 1 token = 1 kWh.

**Metadata:** Name `HoneyDrop`, Symbol `HDROP`, Decimals `7`

Uses Protocol 22+ `__constructor` pattern (preferred).

### Functions

| Function | Parameters | Auth | Description |
|----------|-----------|------|-------------|
| `__constructor` | `admin: Address, distribution_contract: Address, initial_supply: i128` | Deploy-time | Sets metadata, grants MINTER role to distribution contract, mints initial supply to admin if > 0 |
| `mint_energy` | `to: Address, amount: i128, minter: Address` | `#[only_role(minter)]` | Mints tokens when energy is generated |
| `burn_energy` | `from: Address, amount: i128` | Internal via `Base::burn` | Burns tokens when energy is consumed |
| `grant_minter` | `new_minter: Address` | Admin (`require_auth`) | Grants MINTER role to an address |
| `revoke_minter` | `minter: Address` | Admin (`require_auth`) | Revokes MINTER role |
| `is_minter` | `account: Address` | View | Returns `bool` — checks MINTER role |
| `admin` | — | View | Returns admin `Address` |

Inherited SEP-41 functions via `#[default_impl]`: `transfer`, `balance`, `approve`, `total_supply`, `name`, `symbol`, `decimals`, `burn`.

### Tests (21)

| Category | Tests |
|----------|-------|
| Constructor | `test_initialize`, `test_initial_supply`, `test_zero_initial_supply_no_mint` |
| Minting | `test_mint_energy`, `test_mint_multiple_users`, `test_mint_accumulates_balance`, `test_mint_small_amount` |
| Burning | `test_burn_energy`, `test_burn_entire_balance`, `test_burn_more_than_balance_fails`, `test_burn_zero_balance_fails` |
| Transfers | `test_transfer_between_users`, `test_transfer_preserves_total_supply`, `test_transfer_more_than_balance_fails` |
| Access Control | `test_grant_and_revoke_minter`, `test_multiple_minters`, `test_non_minter_cannot_mint`, `test_revoked_minter_cannot_mint`, `test_is_minter_false_for_random_address` |
| Edge Cases | `test_balance_of_unknown_address_is_zero`, `test_mint_then_burn_then_mint` |

---

## 2. Energy Distribution (`energy_distribution`)

Manages pro-rata distribution of HDROP tokens among community members based on ownership percentages. Features multi-sig member registration and a privacy mode with commitment-based consumption tracking.

Uses older `initialize` function pattern (not `__constructor`).

### Types

```rust
pub struct Member {
    pub address: Address,
    pub percent: u32,   // ownership percentage (all must sum to 100)
}

pub enum DistributionError {
    NotEnoughApprovers = 1,
    MemberPercentMismatch = 2,
    PercentsMustSumTo100 = 3,
    MembersNotInitialized = 4,
    AlreadyInitialized = 5,
}
```

### Functions

| Function | Parameters | Auth | Description |
|----------|-----------|------|-------------|
| `initialize` | `admin: Address, token_contract: Address, required_approvals: u32` | Admin (`require_auth`) | Sets admin, token contract, required multisig approvals |
| `add_members_multisig` | `approvers: Vec<Address>, members: Vec<Address>, percents: Vec<u32>` | All approvers (`require_auth` each) | Registers members with ownership %. Validates: enough approvers, matching lengths, percents sum to 100 |
| `record_generation` | `kwh_generated: i128` | Admin (`require_auth`) | Distributes tokens proportionally: `(kwh * percent) / 100` per member. Calls `mint_energy` on token contract for each member |
| `enable_privacy` | — | Admin (`require_auth`) | Enables privacy mode flag |
| `record_private_consumption` | `user: Address, commitment: BytesN<32>` | User (`require_auth`) | Stores SHA256 commitment hash for private consumption tracking. User must be a member |
| `verify_private_consumption` | `user: Address, user_data: Bytes` | View | Verifies stored commitment against provided data. **Demo only** — production needs ZK-SNARKs |
| `generate_commitment_helper` | `user_address_bytes: BytesN<32>, consumed_kwh: i128, secret: BytesN<32>` | View | Helper: concatenates address+kwh+secret → SHA256. For testing/frontend |
| `is_member` | `address: Address` | View | Returns `bool` |
| `get_member_percent` | `address: Address` | View | Returns `Option<u32>` |
| `get_admin` | — | View | Returns `Option<Address>` |
| `get_token_contract` | — | View | Returns `Option<Address>` |
| `get_required_approvals` | — | View | Returns `Option<u32>` |
| `are_members_initialized` | — | View | Returns `bool` |
| `get_total_generated` | — | View | Returns `i128` |
| `get_member_list` | — | View | Returns `Vec<Address>` |

### Privacy Module (`privacy.rs`)

Commitment-based privacy simulation. Placeholder for ZK-SNARKs/Groth16.

| Function | Parameters | Description |
|----------|-----------|-------------|
| `generate_commitment` | `user_data: &Bytes` | SHA256 hash of user_data |
| `verify_commitment` | `commitment: &BytesN<32>, user_data: &Bytes` | Compares SHA256(user_data) vs stored commitment |
| `hash_consumption_data` | `user_address: &BytesN<32>, consumed_kwh: i128, secret: &BytesN<32>` | Builds 80-byte payload → SHA256 |

### Tests (26)

| Category | Tests |
|----------|-------|
| Initialization | `test_initialize`, `test_reinitialize_fails` |
| Multisig Members | `test_add_members_multisig_success`, `test_add_members_not_enough_approvers`, `test_add_members_percent_mismatch`, `test_add_members_percents_not_100`, `test_single_member_100_percent` |
| Record Generation | `test_record_generation_without_members_fails`, `test_total_generated_starts_at_zero` |
| Privacy | `test_enable_privacy`, `test_record_private_consumption_non_member_fails`, `test_record_private_consumption_member_succeeds`, `test_verify_private_consumption_valid`, `test_verify_private_consumption_invalid`, `test_verify_no_commitment_returns_false`, `test_commitment_overwrite` |
| View Functions | `test_is_member_false_for_non_member`, `test_get_member_percent_none_for_non_member`, `test_member_list_empty_before_init`, `test_views_before_initialize` |
| Privacy Module | `test_generate_commitment`, `test_verify_commitment_valid`, `test_verify_commitment_invalid`, `test_hash_consumption_data`, `test_same_data_same_commitment`, `test_different_data_different_commitment` |

---

## 3. Community Governance (`community_governance`)

Minimal skeleton for community decision-making. **Incomplete** — no voting mechanism exists.

### Types

```rust
pub struct Proposal {
    pub id: u32,
    pub title: String,
    pub proposer: Address,
    pub votes_for: u32,
    pub votes_against: u32,
}
```

### Functions

| Function | Parameters | Auth | Description |
|----------|-----------|------|-------------|
| `initialize` | `admin: Address` | Admin (`require_auth`) | Sets admin and proposal count to 0. Returns `Err(AlreadyInitialized)` if called twice |
| `create_proposal` | `proposer: Address, title: String` | Proposer (`require_auth`) | Creates proposal with 0/0 votes. Returns proposal ID |
| `get_proposal_count` | — | View | Returns total proposals created |
| `get_proposal` | `id: u32` | View | Returns `Option<Proposal>` |

**Missing:** `vote`, `execute_proposal`, quorum logic.

### Tests (10)

| Category | Tests |
|----------|-------|
| Initialization | `test_initialize`, `test_reinitialize_fails`, `test_reinitialize_with_different_admin_fails` |
| Proposals | `test_create_proposal`, `test_create_multiple_proposals`, `test_proposal_data_stored_correctly`, `test_different_proposers`, `test_get_nonexistent_proposal` |
| Edge Cases | `test_proposal_count_before_initialize`, `test_sequential_ids_never_skip` |

---

## 4. Network Architecture: Horizon vs Stellar RPC

The frontend uses **both** APIs:

### Stellar RPC (Soroban) — Primary, preferred
- **URL:** `https://soroban-testnet.stellar.org`
- **SDK:** `StellarSdk.rpc.Server`
- **Used for:** All contract interactions (simulate, prepare, send transactions)

| Hook | RPC Operations |
|------|---------------|
| `useEnergyToken` | `balance`, `transfer`, `is_minter`, `mint_energy`, `burn_energy` |
| `useEnergyDistribution` | `get_member_percent`, `get_total_generated`, `get_member_list`, `record_generation` |

### Horizon API — Legacy, limited use
- **URL:** `https://horizon-testnet.stellar.org`
- **SDK:** `Horizon.Server`
- **Used for:** Account data that isn't available via RPC

| Location | Horizon Operations |
|----------|--------------------|
| `packages/stellar/src/wallet.ts` | `fetchBalances()` — account balances (XLM, assets, LP shares) |
| `hooks/useHorizonPayments.ts` | REST fetch to `/accounts/{id}/payments` — payment history for Activity page |

**Recommendation:** Horizon usage is appropriate here. Account balances and payment history are Horizon-native queries with no Soroban RPC equivalent. No migration needed.

---

## 5. DeFindex / PaltaLabs Integration

**DeFindex** is a yield aggregation protocol built by [PaltaLabs](https://paltalabs.io). It provides vault infrastructure for Soroban tokens — users deposit tokens into vaults that generate yield via DeFi strategies.

### What it provides
- **Vault management:** Deposit/withdraw HDROP tokens into yield-bearing vaults
- **APY tracking:** Real-time yield percentages
- **Transaction building:** Returns unsigned XDR for deposit/withdraw (user signs client-side)

### SDK
- `@defindex/sdk` v0.1.2
- Server-side only (API key required: `DEFINDEX_API_KEY`)
- Base URL: `https://api.defindex.io`

### Architecture

```
Frontend (useDefindex hook)
  → Next.js API Routes (/api/defindex/*)
    → defindex-service.ts (server-side)
      → @defindex/sdk
        → DeFindex API (api.defindex.io)
          → Soroban vault contracts
```

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/defindex/health` | GET | SDK health check |
| `/api/defindex/vault/[address]` | GET | Vault metadata + total assets |
| `/api/defindex/stats/[vaultAddress]/[userAddress]` | GET | User balance, APY, daily/monthly interest |
| `/api/defindex/deposit` | POST | Generate unsigned deposit XDR |
| `/api/defindex/withdraw` | POST | Generate unsigned withdraw XDR |

### Service Functions (`lib/defindex-service.ts`)

| Function | Description |
|----------|-------------|
| `checkHealth()` | SDK connectivity check |
| `getFactoryAddress()` | DeFindex factory contract address |
| `getVaultInfo(vaultAddress)` | Vault metadata + total assets |
| `getVaultAPY(vaultAddress)` | Current vault APY |
| `getUserVaultBalance(vaultAddress, userAddress)` | Shares, assets, APY for a user |
| `generateDepositTransaction(params)` | Unsigned XDR for deposit |
| `generateWithdrawTransaction(params)` | Unsigned XDR for withdrawal |
| `calculateInterest(principal, apyPercent, days)` | Simple interest projection |
| `getUserYieldStats(vaultAddress, userAddress)` | Composite: balance + APY + daily/monthly yield |

### Dashboard UI
The dashboard (`app/dashboard/page.tsx`) shows a "DeFindex Yield" section with APY, daily interest, monthly interest, and vault balance.

---

## 6. Deprecated Patterns & Issues

Flagged against the `stellar-dev` skill (`common-pitfalls.md`, `contracts-soroban.md`):

### ~~CRITICAL: No TTL Management~~ — FIXED

All 3 contracts now call `extend_ttl()` on every state-changing function.
- Instance storage: threshold 50,000 / extend to 100,000 ledgers
- Persistent storage: threshold 50,000 / extend to 200,000 ledgers

### ~~HIGH: All Data in Instance Storage~~ — FIXED

Per-user data migrated to `persistent()` storage:
- `DataKey::Member(Address)`, `DataKey::MemberPercent(Address)`, `DataKey::UserCommitment(Address)` → persistent
- `DataKey::Proposal(u32)` → persistent
- Shared config (Admin, TokenContract, MemberList, etc.) remains in instance

### ~~HIGH: Missing Re-initialization Guards~~ — FIXED

Both `energy_distribution::initialize` and `community_governance::initialize` now return `Err(AlreadyInitialized)` if called after first initialization. Covered by tests.

### MEDIUM: Inconsistent Initialization Patterns

- `energy_token` uses Protocol 22+ `__constructor` (preferred)
- `energy_distribution` and `community_governance` use the older `initialize` pattern

Recommendation: Migrate to `__constructor` for consistency and built-in single-execution guarantee. This requires redeployment.

### MEDIUM: Privacy Module is a Simulation

The `verify_private_consumption` function requires revealing the original data to verify, which defeats the purpose of privacy. This is explicitly documented as a demo. Production requires ZK proofs:
- Groth16 (available via BLS12-381, CAP-0059)
- BN254 (CAP-0074, proposed)
- Poseidon hash (CAP-0075, proposed)

### LOW: Governance Contract is Skeletal

`community_governance` has no `vote` function. The `votes_for` and `votes_against` fields are initialized to 0 but can never be modified. No quorum logic, no proposal execution, no time bounds.

### LOW: No Deployment Scripts

No Makefile, shell scripts, or CI pipeline for building/deploying contracts. Deployment appears manual via `stellar contract deploy` CLI.

### INFO: Tests Use `mock_all_auths()`

All contract tests use `mock_all_auths()` which bypasses real authorization checks. This is standard for unit testing but means auth logic is not verified in tests. Consider adding integration tests with real auth flows.

---

## 7. Test Coverage Summary

**57 tests total, all passing.**

| Contract | Tests | Categories |
|----------|-------|-----------|
| `energy_token` | 21 | Constructor (3), Minting (4), Burning (4), Transfers (3), Access Control (5), Edge Cases (2) |
| `energy_distribution` | 26 | Init (2), Multisig (5), Generation (2), Privacy (7), Views (4), Privacy Module (6) |
| `community_governance` | 10 | Init (3), Proposals (5), Edge Cases (2) |

Run tests: `cd apps/contracts && cargo test`
