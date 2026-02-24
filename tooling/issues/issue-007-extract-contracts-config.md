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
