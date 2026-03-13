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

## Account Discovery

### Finding accounts you control

Use account discovery to find all accounts where you hold admin or manager roles:

**Via SDK:**
```javascript
const client = new AbstractAccountClient(rpcUrl, masterContractHash);

// Find all accounts where you're an admin
const adminAccounts = await client.getAccountsByAdmin(yourAddress);

// Find all accounts where you're a manager
const managerAccounts = await client.getAccountsByManager(yourAddress);
```

**Via contract call:**
```javascript
// Direct RPC invocation
const script = sc.createScript({
  scriptHash: masterContractHash,
  operation: 'getAccountsByAdmin',
  args: [{ type: 'Hash160', value: addressScriptHash }]
});
```

**Use cases:**
- Portfolio management: view all accounts you control
- Organizational oversight: discover accounts under your authority
- Access audit: verify your role assignments across accounts

## Batch Account Creation

### Creating multiple accounts efficiently

Deploy multiple accounts with shared governance in a single transaction:

**Via SDK:**
```javascript
// Prepare account IDs
const accountIds = [
  'team-wallet-dev',
  'team-wallet-staging', 
  'team-wallet-prod'
];

// Shared admin configuration
const admins = [adminAddress1, adminAddress2];
const adminThreshold = 2;

// Optional manager configuration
const managers = [managerAddress1];
const managerThreshold = 1;

// Create batch payload
const payload = client.createAccountBatchPayload(
  accountIds,
  admins,
  adminThreshold,
  managers,
  managerThreshold
);

// Sign and broadcast
const txid = await walletService.sendTransaction(payload);
```

**Key behaviors:**
- Transaction sender automatically becomes default admin
- All accounts share the same admin/manager configuration
- Single transaction reduces gas costs
- Atomic operation: all accounts created or none

**Use cases:**
- Team onboarding: create accounts for multiple team members
- Project setup: deploy dev/staging/prod accounts together
- Organizational structure: establish department accounts with shared governance

## Recommended references

- `docs/HOW_IT_WORKS.md`
- `docs/WORKFLOWS.md`
- `docs/DATA_FLOW.md`
- `contracts/recovery/TESTNET_VALIDATION_2026-03-09.md`
- `docs/MORPHEUS_PRIVATE_ACTIONS.md`


## Loading by `.matrix`

If you remember your `.matrix` name more easily than an AA address, enter the domain in the load field. The frontend resolves the domain to the controlling wallet address and then looks up any bound AA addresses where that wallet is an admin or manager. If multiple AAs are found, you can choose the correct one from the returned list.
