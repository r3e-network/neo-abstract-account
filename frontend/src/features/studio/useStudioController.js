import { computed, onMounted, ref, watch } from 'vue';
import { createVerifyScript, getAddressFromScriptHash, hash160, invokeReadFunction, reverseHex } from '@/utils/neo.js';
import { useToast } from 'vue-toastification';
import { connectedAccount } from '@/utils/wallet';
import { walletService, getAbstractAccountHash } from '@/services/walletService';
import { CONTRACT_SOURCE_FILES } from './contractSources';
import {
  STUDIO_TABS,
  DEFAULT_RECENT_TRANSACTIONS_LIMIT,
  RECENT_TRANSACTIONS_STORAGE_KEY,
  createCreateFormState,
  createManageFormState,
  createPermissionsFormState,
  createManageBusyState,
  createPermissionsBusyState,
  createManageSnapshotState
} from './constants';
import {
  addListRow,
  createGeneratedAccountId,
  decodeStackBoolean,
  decodeStackByteStringHex,
  decodeStackHashArray,
  decodeStackInteger,
  formatErrorMessage,
  hash160Param,
  isPositiveNumber,
  normalizeAccountId,
  normalizeThreshold,
  parseRecentTransactions,
  removeListRow,
  resolveRpcUrl,
  sanitizeList,
  toHashArray
} from './helpers';

export function useStudioController() {
  const toast = useToast();

  const tabs = STUDIO_TABS;
  const activePanel = ref('operations');

  const isCreating = ref(false);
  const copied = ref(false);
  const activeFileIdx = ref(0);

  const recentTransactions = ref([]);

  const createForm = ref(createCreateFormState());
  const manageForm = ref(createManageFormState());
  const permissionsForm = ref(createPermissionsFormState());

  const manageBusy = ref(createManageBusyState());
  const permissionsBusy = ref(createPermissionsBusyState());
  const manageSnapshot = ref(createManageSnapshotState());

  const computedScriptHex = ref('');
  const computedAddress = ref('');


  const contractFiles = CONTRACT_SOURCE_FILES;

  const isEvmWallet = computed(() => walletService.provider === walletService.PROVIDERS.EVM_WALLET);
  const walletConnected = computed(() => !!connectedAccount.value);

  const validCreateAdmins = computed(() => sanitizeList(createForm.value.admins));
  const validCreateManagers = computed(() => sanitizeList(createForm.value.managers));
  const validManageAdmins = computed(() => sanitizeList(manageForm.value.admins));
  const validManageManagers = computed(() => sanitizeList(manageForm.value.managers));
  const validDomeAccounts = computed(() => sanitizeList(manageForm.value.domeAccounts));

  const canCreate = computed(() => {
    if (!walletConnected.value) return false;
    if (!createForm.value.accountId || !computedAddress.value) return false;
    if (validCreateAdmins.value.length === 0) return false;
    if (createForm.value.adminThreshold < 1 || createForm.value.adminThreshold > validCreateAdmins.value.length) return false;
    if (validCreateManagers.value.length === 0) {
      return createForm.value.managerThreshold === 0;
    }
    return createForm.value.managerThreshold > 0 && createForm.value.managerThreshold <= validCreateManagers.value.length;
  });

  const canManageTarget = computed(() => !!manageForm.value.accountAddress && walletConnected.value);
  const canManagePermissions = computed(() => !!permissionsForm.value.accountAddress && walletConnected.value);

  watch(connectedAccount, () => {
    if (isEvmWallet.value && walletService.account?.pubKey) {
      createForm.value.accountId = walletService.account.pubKey;
    } else if (isEvmWallet.value) {
      const account = connectedAccount.value ? connectedAccount.value.toLowerCase() : '';
      const cached = account ? localStorage.getItem(`evm_pubkey_${account}`) : '';
      if (cached) createForm.value.accountId = cached;
    } else if (!createForm.value.accountId || createForm.value.accountId.length === 130) {
      createForm.value.accountId = createGeneratedAccountId();
    }
  }, { immediate: true });

  watch(() => createForm.value.accountId, computeAA);
  watch(validCreateAdmins, (admins) => {
    if (admins.length === 0) createForm.value.adminThreshold = 1;
    if (createForm.value.adminThreshold > Math.max(1, admins.length)) {
      createForm.value.adminThreshold = Math.max(1, admins.length);
    }
  });
  watch(validCreateManagers, (managers) => {
    if (managers.length === 0) {
      createForm.value.managerThreshold = 0;
      return;
    }
    if (createForm.value.managerThreshold < 1) createForm.value.managerThreshold = 1;
    if (createForm.value.managerThreshold > managers.length) createForm.value.managerThreshold = managers.length;
  });
  watch(validManageAdmins, (admins) => {
    if (admins.length === 0) manageForm.value.adminThreshold = 1;
    if (manageForm.value.adminThreshold > Math.max(1, admins.length)) {
      manageForm.value.adminThreshold = Math.max(1, admins.length);
    }
  });
  watch(validManageManagers, (managers) => {
    if (managers.length === 0) {
      manageForm.value.managerThreshold = 0;
      return;
    }
    if (manageForm.value.managerThreshold < 1) manageForm.value.managerThreshold = 1;
    if (manageForm.value.managerThreshold > managers.length) manageForm.value.managerThreshold = managers.length;
  });
  watch(validDomeAccounts, (domeAccounts) => {
    if (domeAccounts.length === 0) {
      manageForm.value.domeThreshold = 0;
      return;
    }
    if (manageForm.value.domeThreshold < 1) manageForm.value.domeThreshold = 1;
    if (manageForm.value.domeThreshold > domeAccounts.length) manageForm.value.domeThreshold = domeAccounts.length;
  });

  onMounted(() => {
    restoreRecentTransactions();
    if (!isEvmWallet.value) {
      createForm.value.accountId = createGeneratedAccountId();
    }
    void computeAA();
  });

  function restoreRecentTransactions() {
    const raw = localStorage.getItem(RECENT_TRANSACTIONS_STORAGE_KEY);
    recentTransactions.value = parseRecentTransactions(raw, []);
  }

  function persistRecentTransactions() {
    localStorage.setItem(RECENT_TRANSACTIONS_STORAGE_KEY, JSON.stringify(recentTransactions.value));
  }

  function addRow(listRef) {
    addListRow(listRef);
  }

  function removeRow(listRef, index) {
    removeListRow(listRef, index);
  }

  function generateUUID() {
    createForm.value.accountId = createGeneratedAccountId();
  }


  async function invokeReadOperation(operation, args = []) {
    const aaHash = getAbstractAccountHash();
    if (!aaHash) {
      throw new Error('Master Abstract Account contract not found in environment config.');
    }

    const response = await invokeReadFunction(resolveRpcUrl(walletService), aaHash, operation, args);
    if (response?.state === 'FAULT') {
      throw new Error(`${operation} failed: ${response.exception || 'VM fault'}`);
    }
    return response;
  }

  function pushTransaction(label, txid) {
    recentTransactions.value = [
      {
        label,
        txid,
        when: new Date().toLocaleString()
      },
      ...recentTransactions.value
    ].slice(0, DEFAULT_RECENT_TRANSACTIONS_LIMIT);
    persistRecentTransactions();
  }

  async function computeAA() {
    if (!createForm.value.accountId) {
      computedScriptHex.value = '';
      computedAddress.value = '';
      return;
    }

    try {
      const aaHash = getAbstractAccountHash();
      if (!aaHash) return;

      const accountIdHex = normalizeAccountId(createForm.value.accountId, isEvmWallet.value);
      const script = createVerifyScript(aaHash, accountIdHex);

      computedScriptHex.value = script;
      const scriptHash = reverseHex(hash160(script));
      computedAddress.value = getAddressFromScriptHash(scriptHash);
    } catch (err) {
      console.error(err);
      computedScriptHex.value = '';
      computedAddress.value = '';
    }
  }

  function requireWallet() {
    if (!walletConnected.value || !walletService.isConnected) {
      toast.error('Please connect your wallet first.');
      return false;
    }
    return true;
  }

  async function invokeOperation(label, operation, args) {
    const aaHash = getAbstractAccountHash();
    if (!aaHash) {
      throw new Error('Master Abstract Account contract not found in environment config.');
    }

    const result = await walletService.invoke({
      scriptHash: aaHash,
      operation,
      args,
      signers: [{ account: connectedAccount.value, scopes: 1 }]
    });

    const txid = result?.txid || '';
    if (!txid) {
      throw new Error('No transaction ID returned by wallet provider.');
    }

    pushTransaction(label, txid);
    toast.success(`${label} transaction submitted.`);
  }

  async function loadAccountConfiguration() {
    if (!requireWallet() || !canManageTarget.value) return;

    manageBusy.value.load = true;
    try {
      const accountHash = hash160Param(manageForm.value.accountAddress);

      const [
        adminsRes,
        adminThresholdRes,
        managersRes,
        managerThresholdRes,
        domeAccountsRes,
        domeThresholdRes,
        domeTimeoutRes,
        lastActiveRes,
        accountIdRes
      ] = await Promise.all([
        invokeReadOperation('getAdminsByAddress', [{ type: 'Hash160', value: accountHash }]),
        invokeReadOperation('getAdminThresholdByAddress', [{ type: 'Hash160', value: accountHash }]),
        invokeReadOperation('getManagersByAddress', [{ type: 'Hash160', value: accountHash }]),
        invokeReadOperation('getManagerThresholdByAddress', [{ type: 'Hash160', value: accountHash }]),
        invokeReadOperation('getDomeAccountsByAddress', [{ type: 'Hash160', value: accountHash }]),
        invokeReadOperation('getDomeThresholdByAddress', [{ type: 'Hash160', value: accountHash }]),
        invokeReadOperation('getDomeTimeoutByAddress', [{ type: 'Hash160', value: accountHash }]),
        invokeReadOperation('getLastActiveTimestampByAddress', [{ type: 'Hash160', value: accountHash }]),
        invokeReadOperation('getAccountIdByAddress', [{ type: 'Hash160', value: accountHash }])
      ]);

      const admins = decodeStackHashArray(adminsRes?.stack?.[0]);
      const managers = decodeStackHashArray(managersRes?.stack?.[0]);
      const domeAccounts = decodeStackHashArray(domeAccountsRes?.stack?.[0]);

      const adminThreshold = decodeStackInteger(adminThresholdRes?.stack?.[0]);
      const managerThreshold = decodeStackInteger(managerThresholdRes?.stack?.[0]);
      const domeThreshold = decodeStackInteger(domeThresholdRes?.stack?.[0]);
      const domeTimeoutSeconds = decodeStackInteger(domeTimeoutRes?.stack?.[0]);
      const lastActiveMs = decodeStackInteger(lastActiveRes?.stack?.[0]);
      const accountIdHex = decodeStackByteStringHex(accountIdRes?.stack?.[0]);

      manageForm.value.admins = admins.length > 0 ? admins.map((value) => `0x${value}`) : [''];
      manageForm.value.adminThreshold = normalizeThreshold(adminThreshold, admins.length, 1);

      manageForm.value.managers = managers.length > 0 ? managers.map((value) => `0x${value}`) : [];
      manageForm.value.managerThreshold = managers.length > 0
        ? normalizeThreshold(managerThreshold, managers.length, 0)
        : 0;

      manageForm.value.domeAccounts = domeAccounts.length > 0 ? domeAccounts.map((value) => `0x${value}`) : [];
      manageForm.value.domeThreshold = domeAccounts.length > 0
        ? normalizeThreshold(domeThreshold, domeAccounts.length, 0)
        : 0;
      manageForm.value.domeTimeoutHours = domeTimeoutSeconds > 0
        ? Number((domeTimeoutSeconds / 3600).toFixed(2))
        : 0;

      let domeUnlocked = null;
      if (accountIdHex) {
        try {
          const domeUnlockRes = await invokeReadOperation('isDomeOracleUnlocked', [
            { type: 'ByteArray', value: accountIdHex }
          ]);
          domeUnlocked = decodeStackBoolean(domeUnlockRes?.stack?.[0]);
        } catch (_) {
          domeUnlocked = null;
        }
      }

      manageSnapshot.value = {
        loadedAt: new Date().toLocaleString(),
        accountIdHex: accountIdHex ? `0x${accountIdHex}` : '',
        lastActiveMs,
        domeUnlocked
      };

      toast.success('Current account configuration loaded.');
    } catch (err) {
      console.error(err);
      toast.error(`Load failed: ${formatErrorMessage(err)}`);
    } finally {
      manageBusy.value.load = false;
    }
  }

  async function createAccount() {
    if (!requireWallet()) return;
    if (!canCreate.value) {
      toast.error('Please complete required account configuration fields.');
      return;
    }

    isCreating.value = true;
    try {
      const accountIdHex = normalizeAccountId(createForm.value.accountId, isEvmWallet.value);
      const accountScriptHash = hash160Param(computedAddress.value);

      await invokeOperation('Create account', 'createAccountWithAddress', [
        { type: 'ByteArray', value: accountIdHex },
        { type: 'Hash160', value: accountScriptHash },
        { type: 'Array', value: toHashArray(validCreateAdmins.value) },
        { type: 'Integer', value: createForm.value.adminThreshold },
        { type: 'Array', value: toHashArray(validCreateManagers.value) },
        { type: 'Integer', value: createForm.value.managerThreshold }
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Creation failed: ${formatErrorMessage(err)}`);
    } finally {
      isCreating.value = false;
    }
  }

  async function setAdminsByAddress() {
    if (!requireWallet() || !canManageTarget.value) return;
    if (validManageAdmins.value.length === 0) {
      toast.error('Provide at least one admin address.');
      return;
    }

    manageBusy.value.admins = true;
    try {
      await invokeOperation('Set admins', 'setAdminsByAddress', [
        { type: 'Hash160', value: hash160Param(manageForm.value.accountAddress) },
        { type: 'Array', value: toHashArray(validManageAdmins.value) },
        { type: 'Integer', value: manageForm.value.adminThreshold }
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Admin update failed: ${formatErrorMessage(err)}`);
    } finally {
      manageBusy.value.admins = false;
    }
  }

  async function setManagersByAddress() {
    if (!requireWallet() || !canManageTarget.value) return;

    manageBusy.value.managers = true;
    try {
      await invokeOperation('Set managers', 'setManagersByAddress', [
        { type: 'Hash160', value: hash160Param(manageForm.value.accountAddress) },
        { type: 'Array', value: toHashArray(validManageManagers.value) },
        { type: 'Integer', value: manageForm.value.managerThreshold }
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Manager update failed: ${formatErrorMessage(err)}`);
    } finally {
      manageBusy.value.managers = false;
    }
  }

  async function setDomeAccountsByAddress() {
    if (!requireWallet() || !canManageTarget.value) return;

    const timeoutHours = Number(manageForm.value.domeTimeoutHours || 0);
    const timeoutSeconds = Math.floor(timeoutHours * 3600);

    if (validDomeAccounts.value.length > 0 && !isPositiveNumber(timeoutSeconds)) {
      toast.error('Dome timeout must be greater than 0 when dome accounts are configured.');
      return;
    }
    if (validDomeAccounts.value.length === 0 && (manageForm.value.domeThreshold !== 0 || timeoutSeconds !== 0)) {
      toast.error('Dome threshold/timeout must be 0 when no dome accounts are configured.');
      return;
    }

    manageBusy.value.domeAccounts = true;
    try {
      await invokeOperation('Set dome accounts', 'setDomeAccountsByAddress', [
        { type: 'Hash160', value: hash160Param(manageForm.value.accountAddress) },
        { type: 'Array', value: toHashArray(validDomeAccounts.value) },
        { type: 'Integer', value: manageForm.value.domeThreshold },
        { type: 'Integer', value: timeoutSeconds }
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Dome configuration failed: ${formatErrorMessage(err)}`);
    } finally {
      manageBusy.value.domeAccounts = false;
    }
  }

  async function setDomeOracleByAddress() {
    if (!requireWallet() || !canManageTarget.value) return;

    manageBusy.value.domeOracle = true;
    try {
      await invokeOperation('Set dome oracle', 'setDomeOracleByAddress', [
        { type: 'Hash160', value: hash160Param(manageForm.value.accountAddress) },
        { type: 'String', value: manageForm.value.domeOracleUrl.trim() }
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Oracle update failed: ${formatErrorMessage(err)}`);
    } finally {
      manageBusy.value.domeOracle = false;
    }
  }

  async function requestDomeActivationByAddress() {
    if (!requireWallet() || !canManageTarget.value) return;

    manageBusy.value.domeActivation = true;
    try {
      await invokeOperation('Request dome activation', 'requestDomeActivationByAddress', [
        { type: 'Hash160', value: hash160Param(manageForm.value.accountAddress) }
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Activation request failed: ${formatErrorMessage(err)}`);
    } finally {
      manageBusy.value.domeActivation = false;
    }
  }

  async function setVerifierContractByAddress() {
    if (!requireWallet() || !canManagePermissions.value) return;

    permissionsBusy.value.verifier = true;
    try {
      const verifierHash = permissionsForm.value.verifierContract.trim()
        ? hash160Param(permissionsForm.value.verifierContract)
        : '0000000000000000000000000000000000000000';

      await invokeOperation('Set verifier contract', 'setVerifierContractByAddress', [
        { type: 'Hash160', value: hash160Param(permissionsForm.value.accountAddress) },
        { type: 'Hash160', value: verifierHash }
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Verifier update failed: ${formatErrorMessage(err)}`);
    } finally {
      permissionsBusy.value.verifier = false;
    }
  }

  async function setWhitelistModeByAddress() {
    if (!requireWallet() || !canManagePermissions.value) return;

    permissionsBusy.value.whitelistMode = true;
    try {
      await invokeOperation('Set whitelist mode', 'setWhitelistModeByAddress', [
        { type: 'Hash160', value: hash160Param(permissionsForm.value.accountAddress) },
        { type: 'Boolean', value: permissionsForm.value.whitelistMode }
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Whitelist mode update failed: ${formatErrorMessage(err)}`);
    } finally {
      permissionsBusy.value.whitelistMode = false;
    }
  }

  async function updateWhitelistByAddress(isAdding) {
    if (!requireWallet() || !canManagePermissions.value) return;
    if (!permissionsForm.value.whitelistTarget) {
      toast.error('Please specify a target contract address for the whitelist.');
      return;
    }

    permissionsBusy.value.whitelist = true;
    try {
      await invokeOperation(isAdding ? 'Add to whitelist' : 'Remove from whitelist', 'setWhitelistByAddress', [
        { type: 'Hash160', value: hash160Param(permissionsForm.value.accountAddress) },
        { type: 'Hash160', value: hash160Param(permissionsForm.value.whitelistTarget) },
        { type: 'Boolean', value: isAdding }
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Whitelist update failed: ${formatErrorMessage(err)}`);
    } finally {
      permissionsBusy.value.whitelist = false;
    }
  }

  async function updateBlacklistByAddress(isAdding) {
    if (!requireWallet() || !canManagePermissions.value) return;
    if (!permissionsForm.value.blacklistTarget) {
      toast.error('Please specify a target contract address for the blacklist.');
      return;
    }

    permissionsBusy.value.blacklist = true;
    try {
      await invokeOperation(isAdding ? 'Add to blacklist' : 'Remove from blacklist', 'setBlacklistByAddress', [
        { type: 'Hash160', value: hash160Param(permissionsForm.value.accountAddress) },
        { type: 'Hash160', value: hash160Param(permissionsForm.value.blacklistTarget) },
        { type: 'Boolean', value: isAdding }
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Blacklist update failed: ${formatErrorMessage(err)}`);
    } finally {
      permissionsBusy.value.blacklist = false;
    }
  }

  async function setMaxTransferByAddress() {
    if (!requireWallet() || !canManagePermissions.value) return;
    if (!permissionsForm.value.limitToken) {
      toast.error('Please specify a token contract address.');
      return;
    }

    permissionsBusy.value.limit = true;
    try {
      const amount = Number(permissionsForm.value.limitAmount) || 0;

      await invokeOperation('Set token transfer limit', 'setMaxTransferByAddress', [
        { type: 'Hash160', value: hash160Param(permissionsForm.value.accountAddress) },
        { type: 'Hash160', value: hash160Param(permissionsForm.value.limitToken) },
        { type: 'Integer', value: amount }
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Transfer limit update failed: ${formatErrorMessage(err)}`);
    } finally {
      permissionsBusy.value.limit = false;
    }
  }

  function copyCode() {
    const content = contractFiles[activeFileIdx.value]?.content;
    if (!content) return;

    navigator.clipboard.writeText(content).then(() => {
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 1800);
    }).catch((err) => {
      console.error(err);
      toast.error('Failed to copy source to clipboard.');
    });
  }

  return {
    tabs,
    activePanel,
    isCreating,
    copied,
    activeFileIdx,
    recentTransactions,
    createForm,
    manageForm,
    permissionsForm,
    manageBusy,
    permissionsBusy,
    manageSnapshot,
    computedScriptHex,
    computedAddress,
    contractFiles,
    isEvmWallet,
    walletConnected,
    validCreateAdmins,
    validCreateManagers,
    validManageAdmins,
    validManageManagers,
    validDomeAccounts,
    canCreate,
    canManageTarget,
    canManagePermissions,
    addRow,
    removeRow,
    generateUUID,
    computeAA,
    loadAccountConfiguration,
    createAccount,
    setAdminsByAddress,
    setManagersByAddress,
    setDomeAccountsByAddress,
    setDomeOracleByAddress,
    requestDomeActivationByAddress,
    setVerifierContractByAddress,
    setWhitelistModeByAddress,
    updateWhitelistByAddress,
    updateBlacklistByAddress,
    setMaxTransferByAddress,
    copyCode
  };
}
