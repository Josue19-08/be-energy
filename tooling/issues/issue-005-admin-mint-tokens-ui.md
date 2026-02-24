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
