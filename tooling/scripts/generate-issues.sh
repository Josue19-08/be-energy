#!/usr/bin/env bash
# Generate 8 simple, contributor-friendly GitHub issue markdown files for BeEnergy
# Run from repo root: ./tooling/scripts/generate-issues.sh

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ISSUES_DIR="${REPO_ROOT}/tooling/issues"
rm -rf "$ISSUES_DIR"
mkdir -p "$ISSUES_DIR"

# --- Issue 1: Dashboard balance from contract ---
cat > "${ISSUES_DIR}/issue-001-dashboard-balance-contract.md" << 'ISSUE1'
# Connect Dashboard Balance to Contract

## Description
Replace the hard-coded `mockUser.balance` on the dashboard with the real HDROP balance from the `energy_token` contract using the `useEnergyToken` hook.

## Acceptance Criteria
- [ ] Main balance card reads from `useEnergyToken().getBalance()` when wallet is connected
- [ ] No use of `mockUser.balance` for the primary balance display
- [ ] Works on testnet using `NEXT_PUBLIC_ENERGY_TOKEN_CONTRACT`

## Technical Hints
- `useEnergyToken` already handles RPC URL, network passphrase, and decimal conversion
- Use the wallet address from `useWallet()` as the default for `getBalance`

## Suggested Steps
1. Import and call `useEnergyToken` in `apps/web/app/dashboard/page.tsx`
2. Store the returned balance in local state and pass it to `BalanceDisplay`
3. Remove or gate `mockUser.balance` so it is not used for the main balance
ISSUE1

# --- Issue 2: Dashboard balance loading/error/retry ---
cat > "${ISSUES_DIR}/issue-002-dashboard-balance-states.md" << 'ISSUE2'
# Add Loading and Error States for Balance

## Description
Improve the dashboard balance card so it shows clear loading, error, and retry states when fetching the HDROP balance from the contract.

## Acceptance Criteria
- [ ] Loading state is visible while `useEnergyToken` is fetching
- [ ] Error message is shown when the balance request fails
- [ ] Retry action is available to trigger `getBalance` again

## Technical Hints
- Use `isLoading` and `error` from `useEnergyToken`
- A small wrapper component around `BalanceDisplay` can manage these states

## Suggested Steps
1. Read `isLoading` and `error` from `useEnergyToken` in the dashboard
2. Render loading UI when `isLoading` is true, error UI with a retry button when `error` is set
3. Wire the retry button to call `getBalance` again
ISSUE2

# --- Issue 3: Dashboard wallet address display ---
cat > "${ISSUES_DIR}/issue-003-dashboard-wallet-address.md" << 'ISSUE3'
# Show Connected Wallet Address on Dashboard

## Description
Replace the mock wallet address and short address on the dashboard with the real address from the wallet context.

## Acceptance Criteria
- [ ] Full and short wallet address come from `useWallet().address`
- [ ] Copy button copies the real wallet address to the clipboard
- [ ] UI behaves correctly when the wallet is disconnected

## Technical Hints
- Short form can be built as `${address.slice(0, 4)}...${address.slice(-4)}`
- Use `navigator.clipboard.writeText(address)` in the copy handler

## Suggested Steps
1. Read `address` from `useWallet` in `dashboard/page.tsx`
2. Replace uses of `mockUser.address` and `mockUser.shortAddress` with values derived from `address`
3. Update the copy handler to copy the real `address`
ISSUE3

# --- Issue 4: Marketplace P2P trading integration ---
cat > "${ISSUES_DIR}/issue-004-marketplace-p2p-trading.md" << 'ISSUE4'
# Marketplace P2P Trading Integration

## Description
Connect the marketplace page to the `energy_distribution` contract so users see contract-backed data instead of only mock offers, and prepare the flow for on-chain buys.

## Acceptance Criteria
- [ ] Marketplace reads at least one data point from `energy_distribution` (e.g. members or totals)
- [ ] Static `mockOffers` list is no longer the only data source
- [ ] Testnet contract ID is read from `NEXT_PUBLIC_ENERGY_DISTRIBUTION_CONTRACT`

## Technical Hints
- Extend `useEnergyDistribution` with a function that calls a read-only contract method
- Reuse the Soroban RPC pattern used in `useEnergyToken`

## Suggested Steps
1. Identify a read-only method in `energy_distribution` (e.g. member list or totals)
2. Add a helper in `useEnergyDistribution` to fetch that data using the contract ID from env
3. Display the fetched data on `apps/web/app/marketplace/page.tsx` alongside or instead of `mockOffers`
ISSUE4

# --- Issue 5: Admin token minting interface ---
cat > "${ISSUES_DIR}/issue-005-admin-mint-tokens-ui.md" << 'ISSUE5'
# Admin Token Minting Interface

## Description
Create an admin-only UI to mint HDROP tokens for testing by calling the `mint_energy` function on the `energy_token` contract.

## Acceptance Criteria
- [ ] New `MintTokens` component lets an admin enter recipient and amount and submit a mint
- [ ] `useEnergyToken` (or a dedicated helper) exposes a `mintEnergy(to, amount)` function
- [ ] Minting works on testnet when called from an authorized minter wallet

## Technical Hints
- Contract signature: `mint_energy(e, to: Address, amount: i128, minter: Address)`
- Convert human amount (kWh) to 7-decimal integer before sending

## Suggested Steps
1. Add a `mintEnergy` helper to `useEnergyToken` that builds and submits the `mint_energy` transaction
2. Create `apps/web/components/admin/MintTokens.tsx` with a small form and submit button
3. Optionally gate the UI behind an `ADMIN_ADDRESS` env check to limit access
ISSUE5

# --- Issue 6: Transaction history from Horizon API ---
cat > "${ISSUES_DIR}/issue-006-activity-horizon-transactions.md" << 'ISSUE6'
# Transaction History from Horizon API

## Description
Fetch and display the connected wallet's recent payments or transactions on the Activity page using the Horizon testnet API.

## Acceptance Criteria
- [ ] Activity view shows a list of recent payments or transactions for the connected account
- [ ] Uses Horizon testnet URL (from config or env) as the data source
- [ ] Handles loading, error, and empty states gracefully

## Technical Hints
- Use `@stellar/stellar-sdk` Server or `fetch` against `/accounts/{address}/payments`
- Reuse Horizon URL from existing Stellar config (`STELLAR_CONFIG.HORIZON_URL`)

## Suggested Steps
1. Create a small hook or helper to load payments for a given account from Horizon
2. In `apps/web/app/activity/page.tsx`, use the connected wallet address and the new helper to fetch data
3. Render a simple list including date, type, and amount, with loading and error handling
ISSUE6

# --- Issue 7: Extract contracts-config to shared package ---
cat > "${ISSUES_DIR}/issue-007-extract-contracts-config.md" << 'ISSUE7'
# Extract contracts-config to packages/stellar

## Description
Move the shared contract configuration from the web app into a new `packages/stellar` package so it can be reused across apps.

## Acceptance Criteria
- [ ] New `packages/stellar` package exports contract and network config
- [ ] `apps/web` imports config from the new package instead of `apps/web/lib/contracts-config`
- [ ] App still builds and runs against testnet contracts

## Technical Hints
- Start by moving `apps/web/lib/contracts-config.ts` into `packages/stellar/src/config.ts`
- Add a small `src/index.ts` that re-exports the config

## Suggested Steps
1. Create `packages/stellar` with `package.json`, `tsconfig.json`, and `src/` folder
2. Move contract config into `src/config.ts` and export it from `src/index.ts`
3. Update `apps/web` imports to use the new package and run `pnpm build` to verify
ISSUE7

# --- Issue 8: Extract wallet utilities to shared package ---
cat > "${ISSUES_DIR}/issue-008-extract-wallet-utils.md" << 'ISSUE8'
# Extract Wallet Utilities to packages/stellar

## Description
Move common Stellar wallet utilities from the web app into `packages/stellar` so wallet logic can be reused by other apps.

## Acceptance Criteria
- [ ] Wallet helper functions (e.g. connect, get address, network info) live in `packages/stellar`
- [ ] `apps/web` imports these helpers from `packages/stellar` instead of local files
- [ ] Existing wallet flows (connect, disconnect, read address) keep working

## Technical Hints
- Start from `apps/web/lib/stellar-wallet.ts` and related Stellar-specific helpers
- Re-export public helpers from `packages/stellar/src/index.ts`

## Suggested Steps
1. Move or copy wallet utilities into `packages/stellar/src/wallet.ts` and export them from `src/index.ts`
2. Update `apps/web` imports to use the new package entry points
3. Run `pnpm dev` and verify wallet connection still works in the browser
ISSUE8

echo "Generated 8 issue files in ${ISSUES_DIR}:"
ls -la "${ISSUES_DIR}"
