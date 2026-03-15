import { computed, onMounted, ref, watch } from 'vue';
import { createVerifyScript, deriveAccountIdHash, getAddressFromScriptHash, hash160, invokeReadFunction, reverseHex } from '@/utils/neo.js';
import { useToast } from 'vue-toastification';
import { connectedAccount } from '@/utils/wallet';
import { walletService, getAbstractAccountHash } from '@/services/walletService';
import { buildMatrixRegistrationInvocation, normalizeMatrixDomain, isMatrixDomain } from '@/services/matrixDomainService.js';
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

  const matrixCheckResult = ref(null);

  const createForm = ref(createCreateFormState());
  const manageForm = ref(createManageFormState());
  const permissionsForm = ref(createPermissionsFormState());

  const manageBusy = ref(createManageBusyState());
  const permissionsBusy = ref(createPermissionsBusyState());
  const manageSnapshot = ref(createManageSnapshotState());

  const autoLoadedAccounts = ref([]);

  const computedScriptHex = ref('');
  const computedAddress = ref('');


  const contractFiles = CONTRACT_SOURCE_FILES;

  const isEvmWallet = computed(() => walletService.provider === walletService.PROVIDERS.EVM_WALLET);
  const walletConnected = computed(() => !!connectedAccount.value);

  const canCreate = computed(() => {
    if (!walletConnected.value) return false;
    if (!createForm.value.accountId || !computedAddress.value) return false;
    if (!createForm.value.backupOwner) return false;
    if ((Number(createForm.value.escapeTimelockDays) || 0) <= 0) return false;
    return true;
  });

  const canManageTarget = computed(() => !!manageForm.value.accountAddress && walletConnected.value);
  const canManagePermissions = computed(() => !!permissionsForm.value.accountAddress && walletConnected.value);

  watch(connectedAccount, async () => {
    if (isEvmWallet.value && walletService.account?.pubKey) {
      createForm.value.accountId = walletService.account.pubKey;
    } else if (isEvmWallet.value) {
      const account = connectedAccount.value ? connectedAccount.value.toLowerCase() : '';
      const cached = account ? localStorage.getItem(`evm_pubkey_${account}`) : '';
      if (cached) createForm.value.accountId = cached;
    } else if (!createForm.value.accountId || createForm.value.accountId.length === 130) {
      createForm.value.accountId = createGeneratedAccountId();
    }
    if (walletConnected.value && !createForm.value.backupOwner) {
      createForm.value.backupOwner = walletService.address || connectedAccount.value || '';
    }
  }, { immediate: true });

  watch(() => createForm.value.accountId, computeAA);

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

      const accountSeedHex = normalizeAccountId(createForm.value.accountId, isEvmWallet.value);
      const accountIdHash = deriveAccountIdHash(accountSeedHex);
      const script = createVerifyScript(aaHash, accountIdHash);

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

  async function checkMatrixDomain() {
    if (!createForm.value.matrixDomain) return;
    try {
      const fullDomain = `${createForm.value.matrixDomain.replace(/\.matrix$/, '')}.matrix`;
      const owner = await invokeReadFunction(walletService.matrixContractHash, 'ownerOf', [
        { type: 'String', value: fullDomain }
      ]);
      const ownerHash = decodeStackByteStringHex(owner.stack?.[0]);
      if (ownerHash) {
        matrixCheckResult.value = { available: false, error: true, message: `Domain is already taken.` };
      } else {
        matrixCheckResult.value = { available: true, error: false, message: `Domain is available!` };
      }
    } catch (e) {
      console.warn('Matrix check error', e);
      matrixCheckResult.value = { available: true, error: false, message: `Domain appears available.` };
    }
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
      const accountHash = deriveAccountIdHash(normalizeAccountId(manageForm.value.accountAddress, false));

      const [
        verifierRes,
        hookRes,
        backupOwnerRes,
        escapeTimelockRes,
        escapeTriggeredAtRes,
        escapeActiveRes
      ] = await Promise.all([
        invokeReadOperation('getVerifier', [{ type: 'Hash160', value: accountHash }]),
        invokeReadOperation('getHook', [{ type: 'Hash160', value: accountHash }]),
        invokeReadOperation('getBackupOwner', [{ type: 'Hash160', value: accountHash }]),
        invokeReadOperation('getEscapeTimelock', [{ type: 'Hash160', value: accountHash }]),
        invokeReadOperation('getEscapeTriggeredAt', [{ type: 'Hash160', value: accountHash }]),
        invokeReadOperation('isEscapeActive', [{ type: 'Hash160', value: accountHash }]),
      ]);

      const verifier = decodeStackHash160(verifierRes?.stack?.[0]);
      const hook = decodeStackHash160(hookRes?.stack?.[0]);
      const backupOwner = decodeStackHash160(backupOwnerRes?.stack?.[0]);
      const escapeTimelock = decodeStackInteger(escapeTimelockRes?.stack?.[0]);
      const escapeTriggeredAt = decodeStackInteger(escapeTriggeredAtRes?.stack?.[0]);
      const escapeActive = decodeStackBoolean(escapeActiveRes?.stack?.[0]);

      manageForm.value.verifierContract = verifier ? `0x${verifier}` : '';
      manageForm.value.hookContract = hook ? `0x${hook}` : '';
      manageForm.value.backupOwner = backupOwner ? `0x${backupOwner}` : '';
      manageForm.value.escapeTimelock = String(escapeTimelock || 0);
      manageForm.value.escapeTriggeredAt = String(escapeTriggeredAt || 0);
      manageForm.value.escapeActive = escapeActive;
      permissionsForm.value.accountAddress = manageForm.value.accountAddress;

      manageSnapshot.value = {
        loadedAt: new Date().toLocaleString(),
        accountId: accountHash,
        verifier: manageForm.value.verifierContract,
        hook: manageForm.value.hookContract,
        backupOwner: manageForm.value.backupOwner,
        escapeTimelock,
        escapeTriggeredAt,
        escapeActive,
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
      const accountSeedHex = normalizeAccountId(createForm.value.accountId, isEvmWallet.value);
      const accountIdHash = deriveAccountIdHash(accountSeedHex);
      const verifierHash = createForm.value.verifierContract.trim()
        ? hash160Param(createForm.value.verifierContract)
        : '0000000000000000000000000000000000000000';
      const hookHash = createForm.value.hookContract.trim()
        ? hash160Param(createForm.value.hookContract)
        : '0000000000000000000000000000000000000000';
      const backupOwnerHash = hash160Param(createForm.value.backupOwner);
      const verifierParamsHex = sanitizeHex(createForm.value.verifierParams || '');
      const escapeTimelockSeconds = Math.max(1, Math.floor((Number(createForm.value.escapeTimelockDays) || 0) * 24 * 60 * 60));
      const createInvocation = {
        scriptHash: getAbstractAccountHash(),
        operation: 'registerAccount',
        args: [
          { type: 'Hash160', value: accountIdHash },
          { type: 'Hash160', value: verifierHash },
          { type: 'ByteArray', value: verifierParamsHex ? `0x${verifierParamsHex}` : '0x' },
          { type: 'Hash160', value: hookHash },
          { type: 'Hash160', value: backupOwnerHash },
          { type: 'Integer', value: escapeTimelockSeconds }
        ]
      };

      const baseDomain = createForm.value.matrixDomain.replace(/\.matrix$/, '');
      const matrixDomain = baseDomain ? `${baseDomain}.matrix` : '';
      if (matrixDomain) {
        if (!isMatrixDomain(matrixDomain)) {
          throw new Error('Matrix domain must end with .matrix');
        }
        const ownerAddress = connectedAccount.value;
        if (!ownerAddress) {
          throw new Error('Connect a Neo wallet before registering a .matrix domain.');
        }
        const matrixInvocation = buildMatrixRegistrationInvocation(matrixDomain, ownerAddress);
        const result = await walletService.invokeMultiple({
          invokeArgs: [createInvocation, matrixInvocation],
          signers: [{ account: connectedAccount.value, scopes: 1 }]
        });
        const txid = result?.txid || result?.transaction || '';
        if (!txid) throw new Error('No transaction ID returned by wallet provider.');
        pushTransaction(`Register V3 account + register ${matrixDomain}`, txid);
        toast.success(`Register V3 account + ${matrixDomain} registration submitted.`);
      } else {
        await invokeOperation('Register V3 account', 'registerAccount', createInvocation.args);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Creation failed: ${formatErrorMessage(err)}`);
    } finally {
      isCreating.value = false;
    }
  }

  async function updateVerifier() {
    if (!requireWallet() || !canManageTarget.value) return;
    manageBusy.value.verifier = true;
    try {
      const accountIdHash = deriveAccountIdHash(normalizeAccountId(manageForm.value.accountAddress, false));
      const verifierHash = manageForm.value.verifierContract.trim()
        ? hash160Param(manageForm.value.verifierContract)
        : '0000000000000000000000000000000000000000';
      const verifierParamsHex = sanitizeHex(manageForm.value.verifierParams || '');
      await invokeOperation('Update verifier', 'updateVerifier', [
        { type: 'Hash160', value: accountIdHash },
        { type: 'Hash160', value: verifierHash },
        { type: 'ByteArray', value: verifierParamsHex ? `0x${verifierParamsHex}` : '0x' }
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Verifier update failed: ${formatErrorMessage(err)}`);
    } finally {
      manageBusy.value.verifier = false;
    }
  }

  async function updateHook() {
    if (!requireWallet() || !canManageTarget.value) return;
    manageBusy.value.hook = true;
    try {
      const accountIdHash = deriveAccountIdHash(normalizeAccountId(manageForm.value.accountAddress, false));
      const hookHash = manageForm.value.hookContract.trim()
        ? hash160Param(manageForm.value.hookContract)
        : '0000000000000000000000000000000000000000';
      await invokeOperation('Update hook', 'updateHook', [
        { type: 'Hash160', value: accountIdHash },
        { type: 'Hash160', value: hookHash }
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Hook update failed: ${formatErrorMessage(err)}`);
    } finally {
      manageBusy.value.hook = false;
    }
  }

  async function initiateEscape() {
    if (!requireWallet() || !canManageTarget.value) return;
    manageBusy.value.initiateEscape = true;
    try {
      const accountIdHash = deriveAccountIdHash(normalizeAccountId(manageForm.value.accountAddress, false));
      await invokeOperation('Initiate escape', 'initiateEscape', [
        { type: 'Hash160', value: accountIdHash },
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Escape initiation failed: ${formatErrorMessage(err)}`);
    } finally {
      manageBusy.value.initiateEscape = false;
    }
  }

  async function finalizeEscape() {
    if (!requireWallet() || !canManageTarget.value) return;
    if (!manageForm.value.escapeNewVerifier) {
      toast.error('Provide the new verifier hash to finalize escape.');
      return;
    }
    manageBusy.value.finalizeEscape = true;
    try {
      const accountIdHash = deriveAccountIdHash(normalizeAccountId(manageForm.value.accountAddress, false));
      await invokeOperation('Finalize escape', 'finalizeEscape', [
        { type: 'Hash160', value: accountIdHash },
        { type: 'Hash160', value: hash160Param(manageForm.value.escapeNewVerifier) },
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Escape finalization failed: ${formatErrorMessage(err)}`);
    } finally {
      manageBusy.value.finalizeEscape = false;
    }
  }

  function parseTypedArgsJson(text) {
    const raw = String(text || '').trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Arguments JSON must be an array of Neo RPC params.');
    }
    return parsed;
  }

  async function callVerifier() {
    if (!requireWallet() || !canManagePermissions.value) return;
    if (!permissionsForm.value.verifierMethod.trim()) {
      toast.error('Provide a verifier method name.');
      return;
    }
    permissionsBusy.value.verifierCall = true;
    try {
      const accountIdHash = deriveAccountIdHash(normalizeAccountId(permissionsForm.value.accountAddress, false));
      await invokeOperation('Call verifier plugin', 'callVerifier', [
        { type: 'Hash160', value: accountIdHash },
        { type: 'String', value: permissionsForm.value.verifierMethod.trim() },
        { type: 'Array', value: parseTypedArgsJson(permissionsForm.value.verifierArgsJson) },
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Verifier call failed: ${formatErrorMessage(err)}`);
    } finally {
      permissionsBusy.value.verifierCall = false;
    }
  }

  async function callHook() {
    if (!requireWallet() || !canManagePermissions.value) return;
    if (!permissionsForm.value.hookMethod.trim()) {
      toast.error('Provide a hook method name.');
      return;
    }
    permissionsBusy.value.hookCall = true;
    try {
      const accountIdHash = deriveAccountIdHash(normalizeAccountId(permissionsForm.value.accountAddress, false));
      await invokeOperation('Call hook plugin', 'callHook', [
        { type: 'Hash160', value: accountIdHash },
        { type: 'String', value: permissionsForm.value.hookMethod.trim() },
        { type: 'Array', value: parseTypedArgsJson(permissionsForm.value.hookArgsJson) },
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Hook call failed: ${formatErrorMessage(err)}`);
    } finally {
      permissionsBusy.value.hookCall = false;
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
    autoLoadedAccounts,
    canCreate,
    canManageTarget,
    canManagePermissions,
    addRow,
    removeRow,
    generateUUID,
    computeAA,
    loadAccountConfiguration,
    createAccount,
    checkMatrixDomain,
    matrixCheckResult,
    updateVerifier,
    updateHook,
    initiateEscape,
    finalizeEscape,
    callVerifier,
    callHook,
    copyCode
  };
}
