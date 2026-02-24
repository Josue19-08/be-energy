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
