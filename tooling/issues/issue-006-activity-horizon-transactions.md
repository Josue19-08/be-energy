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
