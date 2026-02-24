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
