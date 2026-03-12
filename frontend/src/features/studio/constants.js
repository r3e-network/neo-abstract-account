export const STUDIO_TABS = [
  { key: 'operations', label: 'Operations Workspace' },
  { key: 'create', label: 'Create Account' },
  { key: 'manage', label: 'Manage Governance' },
  { key: 'permissions', label: 'Permissions & Limits' },
  { key: 'source', label: 'View Source' }
];

export const RECENT_TRANSACTIONS_STORAGE_KEY = 'aa_recent_transactions';
export const DEFAULT_RECENT_TRANSACTIONS_LIMIT = 8;

export function createCreateFormState() {
  return {
    accountId: '',
    matrixDomain: '',
    signers: [''],
    threshold: 1
  };
}

export function createManageFormState() {
  return {
    accountAddress: '',
    signers: [''],
    threshold: 1,
    domeAccounts: [],
    domeThreshold: 0,
    domeTimeoutHours: 0,
    domeOracleUrl: ''
  };
}

export function createPermissionsFormState() {
  return {
    accountAddress: '',
    verifierContract: '',
    whitelistMode: false,
    whitelistTarget: '',
    blacklistTarget: '',
    limitToken: '',
    limitAmount: ''
  };
}

export function createManageBusyState() {
  return {
    load: false,
    signers: false,
    domeAccounts: false,
    domeOracle: false,
    domeActivation: false
  };
}

export function createPermissionsBusyState() {
  return {
    verifier: false,
    whitelistMode: false,
    whitelist: false,
    blacklist: false,
    limit: false
  };
}

export function createManageSnapshotState() {
  return {
    loadedAt: '',
    lastActiveMs: 0,
    domeUnlocked: null
  };
}
