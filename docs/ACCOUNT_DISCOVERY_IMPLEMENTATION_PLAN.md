# Account Discovery & Batch Operations - Implementation Plan

## Phase 1: Contract Storage Layer

### Files to Modify:
- `contracts/AbstractAccount.StorageAndContext.cs`

### Changes:
1. Add reverse index storage prefixes:
   - `PREFIX_ADMIN_INDEX = 0x20` (address → accountId[])
   - `PREFIX_MANAGER_INDEX = 0x21` (address → accountId[])

2. Add helper methods:
   - `AddToAdminIndex(address, accountId)`
   - `RemoveFromAdminIndex(address, accountId)`
   - `AddToManagerIndex(address, accountId)`
   - `RemoveFromManagerIndex(address, accountId)`

## Phase 2: Contract Account Lifecycle

### Files to Modify:
- `contracts/AbstractAccount.AccountLifecycle.cs`

### Changes:
1. Modify `CreateAccount()`:
   - Add creator (Runtime.CallingScriptHash) as first admin
   - Update reverse indices

2. Add `CreateAccountBatch()`:
   - Loop through accountIds[]
   - Apply shared admins/managers/thresholds
   - Creator auto-added to each account
   - Atomic operation (all or nothing)


## Phase 3: Contract Query Interface

### Files to Modify:
- `contracts/AbstractAccount.cs` (main contract)

### New Public Methods:
```csharp
public static ByteString[] GetAccountsByAdmin(UInt160 address)
public static ByteString[] GetAccountsByManager(UInt160 address)
public static Map<ByteString, string[]> GetAccountRoles(UInt160 address)
```

## Phase 4: Contract Admin Management

### Files to Modify:
- `contracts/AbstractAccount.Admin.cs`

### Changes:
1. Modify `SetAdmins()`:
   - Update reverse indices when adding/removing admins
   - Call `AddToAdminIndex()` for new admins
   - Call `RemoveFromAdminIndex()` for removed admins

2. Modify `SetManagers()`:
   - Update reverse indices when adding/removing managers
   - Call `AddToManagerIndex()` for new managers
   - Call `RemoveFromManagerIndex()` for removed managers


## Phase 5: SDK Updates

### Files to Modify:
- `sdk/js/src/index.js`

### New Methods:
```javascript
// Query methods
async function getAccountsByAdmin(aaContractHash, address, rpcUrl)
async function getAccountsByManager(aaContractHash, address, rpcUrl)
async function getAccountRoles(aaContractHash, address, rpcUrl)

// Batch creation
async function createAccountBatch(
  aaContractHash, 
  accountIds, 
  admins, 
  adminThreshold, 
  managers, 
  managerThreshold,
  signerAccount,
  rpcUrl
)
```


## Phase 6: Frontend - Account Discovery UI

### Files to Modify:
- `frontend/src/features/operations/components/LoadAccountPanel.vue`

### New Features:
1. Add "Discover My Accounts" button
2. Display accounts where user is admin/manager
3. Show role badges (Admin/Manager) for each account
4. Click to load account into workspace

### New Component (Optional):
- `frontend/src/features/operations/components/AccountDiscoveryPanel.vue`

## Phase 7: Frontend - Batch Creation UI

### Files to Create:
- `frontend/src/features/operations/components/BatchCreatePanel.vue`

### Features:
1. Input field for multiple account IDs (comma-separated or array)
2. Admin addresses input (optional, creator auto-included)
3. Admin threshold input
4. Manager addresses input (optional)
5. Manager threshold input
6. Preview: show all accounts to be created
7. Submit button to execute batch creation


## Phase 8: Documentation Updates

### Files to Update:
1. `README.md` - Add account discovery and batch creation sections
2. `docs/HOW_IT_WORKS.md` - Explain reverse indices and discovery mechanism
3. `docs/WORKFLOWS.md` - Add batch creation workflow
4. `docs/API.md` (if exists) - Document new contract methods

## Implementation Priority

### Critical Path (Must implement first):
1. Phase 1: Storage layer (reverse indices)
2. Phase 2: Account lifecycle (creator default admin + batch creation)
3. Phase 4: Admin management (maintain indices)
4. Phase 3: Query interface

### Secondary (Can implement after core):
5. Phase 5: SDK methods
6. Phase 6: Frontend discovery UI
7. Phase 7: Frontend batch creation UI
8. Phase 8: Documentation

## Testing Strategy

### Contract Tests:
- Test creator auto-added as admin
- Test batch creation with shared config
- Test reverse index queries
- Test index maintenance on role changes

### Integration Tests:
- Test SDK query methods against deployed contract
- Test frontend account discovery
- Test frontend batch creation flow

