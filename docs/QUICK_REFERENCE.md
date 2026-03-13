# Quick Reference

## Core local verification

```bash
./scripts/verify_repo.sh
```

## Frontend only

```bash
cd frontend && npm test
cd frontend && npm run build
```

## SDK only

```bash
cd sdk/js && npm test
```



## SDK API Reference

### Account Discovery

```javascript
// Find accounts by admin role
const accounts = await client.getAccountsByAdmin(address);

// Find accounts by manager role  
const accounts = await client.getAccountsByManager(address);
```

### Batch Account Creation

```javascript
// Create multiple accounts with shared governance
const payload = client.createAccountBatchPayload(
  accountIds,        // Array of account ID strings
  admins,           // Array of admin addresses (optional)
  adminThreshold,   // Required admin signatures
  managers,         // Array of manager addresses (optional)
  managerThreshold  // Required manager signatures
);
```

### Account Lifecycle

```javascript
// Create single account
const payload = client.createAccountPayload(accountId, admins, adminThreshold, managers, managerThreshold);

// Bind account to deterministic address
const payload = client.bindAccountAddressPayload(accountId, accountAddress);

// Get account info
const info = await client.getAccountInfo(accountId);
```

### Role Management

```javascript
// Get admins
const admins = await client.getAdmins(accountId);
const threshold = await client.getAdminThreshold(accountId);

// Get managers
const managers = await client.getManagers(accountId);
const threshold = await client.getManagerThreshold(accountId);
```

### Execution

```javascript
// Execute via account ID
const payload = client.executePayload(accountId, targetContract, method, args);

// Execute via account address
const payload = client.executeUnifiedByAddressPayload(accountAddress, targetContract, method, args);

// Execute meta-transaction
const payload = client.executeUnifiedByAddressPayload(accountAddress, evmPublicKey, targetContract, method, args, argsHash, nonce, deadline, signature);
```

## Canonical docs

- `docs/HOW_IT_WORKS.md`
- `docs/WORKFLOWS.md`
- `docs/DATA_FLOW.md`
- `docs/architecture.md`
