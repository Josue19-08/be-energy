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
