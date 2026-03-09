# User Guide

This guide is a practical, user-first companion to `docs/HOW_IT_WORKS.md`.

## Who should read this

- Operators preparing transactions
- Signers reviewing and approving drafts
- Developers trying to understand the UI flow quickly

## Fast path

1. Open the home workspace
2. Load the abstract account
3. Choose a preset or compose a custom invocation
4. Persist the draft
5. Share the right scoped link
6. Collect signatures
7. Run relay preflight if needed
8. Broadcast via wallet or relay

## Roles

### Read-only reviewer
- Uses the public share link
- Can inspect the draft but cannot mutate it

### Collaborator / signer
- Uses the collaborator link
- Can add signatures or approvals
- Cannot perform operator-only relay or broadcast actions

### Operator
- Uses the operator link
- Can run relay checks, append receipts, rotate links, and submit transactions

## Recommended references

- `docs/HOW_IT_WORKS.md`
- `docs/WORKFLOWS.md`
- `docs/DATA_FLOW.md`
- `contracts/recovery/TESTNET_VALIDATION_2026-03-09.md`
