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
    verifierContract: '',
    verifierParams: '',
    hookContract: '',
    backupOwner: '',
    escapeTimelockDays: 30,
  };
}

export function createManageFormState() {
  return {
    accountAddress: '',
    verifierContract: '',
    verifierParams: '',
    hookContract: '',
    backupOwner: '',
    escapeTimelock: '',
    escapeTriggeredAt: '',
    escapeActive: false,
    escapeNewVerifier: '',
  };
}

export function createPermissionsFormState() {
  return {
    accountAddress: '',
    verifierMethod: '',
    verifierArgsJson: '[]',
    hookMethod: '',
    hookArgsJson: '[]',
  };
}

export function createManageBusyState() {
  return {
    load: false,
    hook: false,
    verifier: false,
    initiateEscape: false,
    finalizeEscape: false,
  };
}

export function createPermissionsBusyState() {
  return {
    verifierCall: false,
    hookCall: false,
  };
}

export function createManageSnapshotState() {
  return {
    loadedAt: '',
  };
}
