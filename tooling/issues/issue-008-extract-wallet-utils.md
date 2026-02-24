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
