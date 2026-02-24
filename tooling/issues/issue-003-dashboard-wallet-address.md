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
