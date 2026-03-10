# Account Discovery Guide

## Overview

Account discovery enables efficient querying of all accounts where an address holds admin or manager roles. This is implemented through reverse indices that provide O(1) lookups without scanning the entire account registry.

## Use Cases

### Portfolio Management
Users can discover all accounts they control across different roles.

### Organizational Oversight
Administrators can audit accounts under their authority.

### Access Verification
Verify role assignments for compliance or security audits.

## Technical Implementation

### Reverse Index Storage

The contract maintains two reverse index mappings:

- **AdminIndexPrefix (0x20):** Maps addresses to account IDs where they're admins
- **ManagerIndexPrefix (0x21):** Maps addresses to account IDs where they're managers

### Index Maintenance

Indices are automatically updated during role changes:

1. **Account Creation:** Creator added to admin index
2. **SetAdmins:** Old admins removed, new admins added
3. **SetManagers:** Old managers removed, new managers added

### Query Performance

- **Time Complexity:** O(1) for address lookup
- **Space Complexity:** O(n) where n is total role assignments
- **No Scanning:** Direct storage access without iteration

## SDK Integration

### Basic Queries

```javascript
const client = new AbstractAccountClient(rpcUrl, contractHash);

// Query by admin role
const adminAccounts = await client.getAccountsByAdmin(address);

// Query by manager role
const managerAccounts = await client.getAccountsByManager(address);
```

### Batch Account Creation

```javascript
// Create multiple accounts with shared governance
const accountIds = ['team-dev', 'team-staging', 'team-prod'];
const admins = [admin1, admin2];
const managers = [manager1];

const payload = client.createAccountBatchPayload(
  accountIds,
  admins,
  2, // admin threshold
  managers,
  1  // manager threshold
);

await walletService.sendTransaction(payload);
```

## Practical Examples

### Find All Controlled Accounts

```javascript
async function findAllMyAccounts(address) {
  const [adminAccounts, managerAccounts] = await Promise.all([
    client.getAccountsByAdmin(address),
    client.getAccountsByManager(address)
  ]);

  return {
    admin: adminAccounts,
    manager: managerAccounts,
    total: adminAccounts.length + managerAccounts.length
  };
}
```

### Batch Team Setup

```javascript
async function setupTeamAccounts(teamName, members) {
  const accountIds = members.map(m => `${teamName}-${m.id}`);
  const adminAddresses = members
    .filter(m => m.role === 'admin')
    .map(m => m.address);

  const payload = client.createAccountBatchPayload(
    accountIds,
    adminAddresses,
    Math.ceil(adminAddresses.length / 2),
    [],
    0
  );

  return await walletService.sendTransaction(payload);
}
```

## Best Practices

### Efficient Discovery
- Cache results when appropriate to reduce RPC calls
- Query only when role changes occur
- Use batch operations for multiple accounts

### Security Considerations
- Verify returned account IDs before operations
- Check current role status (indices may lag briefly during updates)
- Validate permissions before sensitive actions

### Performance Optimization
- Limit concurrent queries to avoid RPC throttling
- Implement pagination for large result sets
- Consider local caching strategies for frequently accessed data

## Related Documentation

- `docs/HOW_IT_WORKS.md` - System overview and mental model
- `docs/USER_GUIDE.md` - Practical usage steps
- `docs/QUICK_REFERENCE.md` - API reference
- `docs/architecture.md` - Technical architecture details
- `docs/WORKFLOWS.md` - Transaction lifecycle
