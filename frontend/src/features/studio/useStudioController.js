import { computed, onMounted, ref, watch } from 'vue';
import { createVerifyScript, getAddressFromScriptHash, hash160, invokeReadFunction, reverseHex } from '@/utils/neo.js';
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

  const validCreateSigners = computed(() => sanitizeList(createForm.value.signers));
  const validManageSigners = computed(() => sanitizeList(manageForm.value.signers));

  const canCreate = computed(() => {
    if (!walletConnected.value) return false;
    if (!createForm.value.accountId || !computedAddress.value) return false;
    
    const signerCount = validCreateSigners.value.length;
    
    if (signerCount === 0) return false; // Must have some role
    
    if (createForm.value.threshold < 1 || createForm.value.threshold > signerCount) return false;

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
    
    // Auto-set creator as first signer
    if (walletConnected.value && createForm.value.signers.length === 1 && !createForm.value.signers[0].value) {
      createForm.value.signers[0].value = isEvmWallet.value ? walletService.address : connectedAccount.value;
    }

    // Auto-load managed account if not set
    if (walletConnected.value) {
      try {
        const address = isEvmWallet.value ? walletService.address : connectedAccount.value;
        const res = await invokeReadOperation('getAccountAddressesBySigner', [{ type: 'Hash160', value: hash160Param(address) }]);
        const addresses = decodeStackHashArray(res.stack?.[0]);
        autoLoadedAccounts.value = addresses;
        
        if (addresses.length > 0 && !manageForm.value.accountAddress) {
          manageForm.value.accountAddress = addresses[0];
          permissionsForm.value.accountAddress = addresses[0];
          await loadAccountConfiguration();
        }
      } catch (e) {
        console.warn('Failed to auto-discover managed accounts', e);
      }
    }
  }, { immediate: true });

  watch(() => createForm.value.accountId, computeAA);
  watch(validCreateSigners, (signers) => {
    if (signers.length === 0) {
      createForm.value.threshold = 1;
      return;
    }
    if (createForm.value.threshold < 1) createForm.value.threshold = 1;
    if (createForm.value.threshold > signers.length) {
      createForm.value.threshold = signers.length;
    }
  });
  watch(validManageSigners, (signers) => {
    if (signers.length === 0) {
      manageForm.value.threshold = 1;
      return;
    }
    if (manageForm.value.threshold < 1) manageForm.value.threshold = 1;
    if (manageForm.value.threshold > signers.length) {
      manageForm.value.threshold = signers.length;
    }
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
      const accountHash = hash160Param(manageForm.value.accountAddress);

      const [
        signersRes,
        thresholdRes,
        lastActiveRes
      ] = await Promise.all([
        invokeReadOperation('getSignersByAddress', [{ type: 'Hash160', value: accountHash }]),
        invokeReadOperation('getThresholdByAddress', [{ type: 'Hash160', value: accountHash }]),
        invokeReadOperation('getLastActiveTimestampByAddress', [{ type: 'Hash160', value: accountHash }])
      ]);

      const signers = decodeStackHashArray(signersRes?.stack?.[0]);
      const threshold = decodeStackInteger(thresholdRes?.stack?.[0]);
      const lastActiveMs = decodeStackInteger(lastActiveRes?.stack?.[0]);

      manageForm.value.signers = signers.length > 0 ? signers.map((value) => `0x${value}`) : [''];
      manageForm.value.threshold = signers.length > 0
        ? normalizeThreshold(threshold, signers.length, 1)
        : 1;

      manageSnapshot.value = {
        loadedAt: new Date().toLocaleString(),
        lastActiveMs
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
      const createInvocation = {
        scriptHash: getAbstractAccountHash(),
        operation: 'createAccountWithAddress',
        args: [
          { type: 'ByteArray', value: accountIdHex },
          { type: 'Hash160', value: accountScriptHash },
          { type: 'Array', value: toHashArray(validCreateSigners.value) },
          { type: 'Integer', value: createForm.value.threshold }
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
        pushTransaction(`Create account + register ${matrixDomain}`, txid);
        toast.success(`Create account + ${matrixDomain} registration submitted.`);
      } else {
        await invokeOperation('Create account', 'createAccountWithAddress', createInvocation.args);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Creation failed: ${formatErrorMessage(err)}`);
    } finally {
      isCreating.value = false;
    }
  }

  async function setSignersByAddress() {
    if (!requireWallet() || !canManageTarget.value) return;
    if (validManageSigners.value.length === 0) {
      toast.error('Provide at least one signer address.');
      return;
    }

    manageBusy.value.signers = true;
    try {
      await invokeOperation('Set signers', 'setSignersByAddress', [
        { type: 'Hash160', value: hash160Param(manageForm.value.accountAddress) },
        { type: 'Array', value: toHashArray(validManageSigners.value) },
        { type: 'Integer', value: manageForm.value.threshold }
      ]);
    } catch (err) {
      console.error(err);
      toast.error(`Signers update failed: ${formatErrorMessage(err)}`);
    } finally {
      manageBusy.value.signers = false;
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
    validCreateSigners,
    validManageSigners,
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
    setSignersByAddress,
    setVerifierContractByAddress,
    setWhitelistModeByAddress,
    updateWhitelistByAddress,
    updateBlacklistByAddress,
    setMaxTransferByAddress,
    copyCode
  };
}