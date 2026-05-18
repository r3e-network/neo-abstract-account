import { BrowserProvider } from 'ethers';
import { connectedAccount, setConnectedAccount } from '@/utils/wallet';
import { RUNTIME_CONFIG } from '@/config/runtimeConfig';
import { EC } from '../config/errorCodes.js';
import { getScriptHashFromAddress } from '../utils/neo.js';

export function getAbstractAccountHash() {
  return RUNTIME_CONFIG.abstractAccountHash;
}

const MAINNET_MAGIC = 860833102;
const TESTNET_MAGIC = 894710606;

function isObject(value) {
  return Boolean(value) && typeof value === 'object';
}

function hasNep21Metadata(provider) {
  const version = String(provider?.dapiVersion ?? '').trim();
  const compatibility = Array.isArray(provider?.compatibility)
    ? provider.compatibility.some((entry) => String(entry).toUpperCase() === 'NEP-21')
    : false;
  return compatibility || version === '1.0' || version.startsWith('1.0.');
}

function hasUsableNep21Capability(provider) {
  return (
    typeof provider?.invoke === 'function'
    || typeof provider?.call === 'function'
    || typeof provider?.send === 'function'
    || typeof provider?.signMessage === 'function'
    || typeof provider?.authenticate === 'function'
    || typeof provider?.getBalance === 'function'
  );
}

function isNep21Provider(value) {
  return (
    isObject(value)
    && typeof value.getAccounts === 'function'
    && (hasNep21Metadata(value) || hasUsableNep21Capability(value))
  );
}

function registryCandidates(registry) {
  if (!registry || typeof registry !== 'object') return [];
  return Object.entries(registry).map(([key, provider]) => ({ key, provider }));
}

function getAuthenticationDomain() {
  if (typeof window === 'undefined') return 'localhost';
  return window.location.host || window.location.hostname || 'localhost';
}

function createNonce() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

function normalizeNep21Account(account) {
  if (!isObject(account)) return null;
  const nested = isObject(account.account) ? account.account : {};
  const address = String(
    account.address
    || account.Address
    || nested.address
    || nested.Address
    || account.hash
    || account.Hash
    || nested.hash
    || ''
  ).trim();
  const hash = String(
    account.hash
    || account.Hash
    || account.scriptHash
    || account.scripthash
    || nested.hash
    || nested.scriptHash
    || ''
  ).trim();
  return address || hash ? { address: address || hash, hash } : null;
}

function normalizeTxResult(result) {
  if (typeof result === 'string') return { txid: result };
  if (result && typeof result === 'object') {
    const txid = String(result.txid || result.tx || result.hash || '');
    return txid ? { ...result, txid } : result;
  }
  return {};
}

function normalizeSignerScope(scope) {
  const byNumber = {
    0: 'None',
    1: 'CalledByEntry',
    16: 'CustomContracts',
    32: 'CustomGroups',
    64: 'WitnessRules',
    128: 'Global',
  };
  const byName = {
    none: 'None',
    calledbyentry: 'CalledByEntry',
    customcontracts: 'CustomContracts',
    customgroups: 'CustomGroups',
    rules: 'WitnessRules',
    witnessrules: 'WitnessRules',
    global: 'Global',
  };
  if (typeof scope === 'number' && Number.isFinite(scope)) {
    if (byNumber[scope]) return byNumber[scope];
    const parts = Object.entries(byNumber)
      .filter(([bit]) => Number(bit) !== 0 && (scope & Number(bit)) === Number(bit))
      .map(([, name]) => name);
    return parts.length ? parts.join(', ') : 'CalledByEntry';
  }
  const raw = String(scope ?? '').trim();
  if (/^\d+$/.test(raw)) return normalizeSignerScope(parseInt(raw, 10));
  if (raw.includes(',')) {
    const parts = raw
      .split(',')
      .map((part) => byName[part.trim().toLowerCase()] ?? part.trim())
      .filter(Boolean);
    return parts.length ? parts.join(', ') : 'CalledByEntry';
  }
  return byName[raw.toLowerCase()] ?? (raw || 'CalledByEntry');
}

function normalizeHash160ForDapi(value, accountHash, currentAddress) {
  const raw = String(value ?? '').trim();
  if (accountHash && currentAddress && raw === currentAddress) return accountHash;
  if (raw.startsWith('N') && raw.length === 34) {
    try {
      return `0x${getScriptHashFromAddress(raw)}`;
    } catch (_error) {
      return raw;
    }
  }
  return raw;
}

function buildNep21Invocation(entry, accountHash, currentAddress) {
  return {
    hash: entry.hash || entry.scriptHash,
    operation: entry.operation,
    args: (entry.args || []).map((arg) => (
      String(arg?.type || '').toLowerCase() === 'hash160'
        ? { ...arg, value: normalizeHash160ForDapi(arg.value, accountHash, currentAddress) }
        : arg
    )),
    ...(entry.abortOnFail != null ? { abortOnFail: entry.abortOnFail } : {}),
  };
}

function buildNep21Signers(signers, accountHash, currentAddress) {
  return signers?.map((signer) => ({
    account: accountHash && currentAddress && signer.account === currentAddress
      ? accountHash
      : signer.account,
    scopes: normalizeSignerScope(signer.scopes),
    ...(signer.allowedContracts?.length ? { allowedContracts: signer.allowedContracts } : {}),
    ...(signer.allowedGroups?.length ? { allowedGroups: signer.allowedGroups } : {}),
    ...(signer.rules?.length ? { rules: signer.rules } : {}),
  }));
}

class WalletService {
  constructor() {
    this.PROVIDERS = {
      NEO_WALLET: 'neo_wallet',
      EVM_WALLET: 'evm_wallet'
    };
    this.provider = this.PROVIDERS.NEO_WALLET;
    this.account = null;
    this.rpcUrl = RUNTIME_CONFIG.rpcUrl;
    this.bootstrap();
  }

  bootstrap() {
    const cached = window.localStorage.getItem('aa_connected_account');
    if (cached) {
      setConnectedAccount(cached);
      this.account = { address: cached };
    }
  }

  get isConnected() {
    return !!connectedAccount.value;
  }

  get address() {
    return connectedAccount.value || '';
  }

  setConnected(address, metadata = {}) {
    setConnectedAccount(address);
    this.account = address ? { address, ...metadata } : null;
    if (address) {
      window.localStorage.setItem('aa_connected_account', address);
    } else {
      window.localStorage.removeItem('aa_connected_account');
    }
  }

  disconnect() {
    this.setConnected('');
  }

  getNeoLineProviderCandidates() {
    return [
      { name: 'NEOLineN3', api: window.NEOLineN3?.N3 },
      { name: 'NEOLineN3', api: window.NEOLineN3?.default?.N3 },
      { name: 'NEOLine', api: window.NEOLine?.NEO },
      { name: 'NEOLine', api: window.NEOLine?.default?.NEO },
      { name: 'NEOLine', api: window.NEOLine },
      { name: 'NEOLine', api: window.NEOLine?.default },
    ];
  }

  getNep21ProviderCandidates() {
    return [
      { name: 'NEP21Provider', api: window.NEP21Provider },
      ...registryCandidates(window.NEP21Providers).map(({ key, provider }) => ({
        name: key || provider?.name || 'NEP21Provider',
        api: provider,
      })),
      { name: 'OneGate', api: window.OneGateDapiProvider },
      { name: 'Neo.DapiProvider', api: window.Neo?.DapiProvider },
      { name: 'neoDapiProvider', api: window.neoDapiProvider },
      { name: 'neoDapi', api: window.neoDapi },
    ];
  }

  findNep21ProviderCandidate() {
    return this.getNep21ProviderCandidates().find((candidate) => isNep21Provider(candidate.api)) || null;
  }

  async waitForNep21Provider(timeoutMs = 2500) {
    const immediate = this.findNep21ProviderCandidate();
    if (immediate) return immediate;
    if (typeof window === 'undefined') return null;

    return new Promise((resolve) => {
      let settled = false;
      let timeout;
      const finish = (candidate) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        window.removeEventListener('Neo.DapiProvider.ready', onReady);
        resolve(candidate);
      };
      const onReady = (event) => {
        const detail = event?.detail;
        const provider = isNep21Provider(detail) ? detail : detail?.provider;
        if (!isNep21Provider(provider)) return;
        const name = provider.name || 'NEP21Provider';
        if (!window.NEP21Provider) window.NEP21Provider = provider;
        finish({ name, api: provider });
      };
      window.addEventListener('Neo.DapiProvider.ready', onReady);
      timeout = setTimeout(() => finish(null), timeoutMs);
      window.dispatchEvent(new CustomEvent('Neo.DapiProvider.request', { detail: { version: '1.0' } }));
    });
  }

  async resolveNep21Account(provider) {
    const accounts = await provider.getAccounts().catch(() => []);
    const selected = accounts.find((entry) => entry?.isDefault) || accounts[0];
    const normalized = normalizeNep21Account(selected);
    if (normalized?.address) return normalized;

    if (typeof provider.authenticate !== 'function') {
      throw new Error(EC.walletAddressMissing);
    }

    const authenticated = await provider.authenticate({
      action: 'Authentication',
      grant_type: 'Signature',
      allowed_algorithms: ['ECDSA-P256'],
      domain: getAuthenticationDomain(),
      networks: provider.supportedNetworks?.length
        ? provider.supportedNetworks
        : [TESTNET_MAGIC, MAINNET_MAGIC],
      nonce: createNonce(),
      timestamp: Date.now(),
    });
    const address = String(authenticated?.address || '').trim();
    if (!address) throw new Error(EC.walletAddressMissing);
    const refreshed = await provider.getAccounts().catch(() => []);
    const refreshedAccount = refreshed.find((entry) => normalizeNep21Account(entry)?.address === address) || refreshed[0];
    return { address, hash: normalizeNep21Account(refreshedAccount)?.hash || '' };
  }

  getConnectProvider() {
    const nep21 = this.findNep21ProviderCandidate();
    if (nep21) {
      return {
        name: nep21.name || nep21.api?.name || 'NEP-21',
        kind: 'nep21',
        getAccount: () => this.resolveNep21Account(nep21.api),
      };
    }

    if (window.neo3Dapi?.getAccount) {
      return {
        name: 'neo3Dapi',
        getAccount: () => window.neo3Dapi.getAccount(),
      };
    }

    for (const candidate of this.getNeoLineProviderCandidates()) {
      if (typeof candidate.api?.getAccount === 'function') {
        return {
          name: candidate.name,
          getAccount: () => candidate.api.getAccount(),
        };
      }
    }

    return null;
  }

  getBatchInvokeProvider() {
    const nep21 = this.findNep21ProviderCandidate();
    if (typeof nep21?.api?.invoke === 'function') {
      return {
        name: nep21.name || nep21.api?.name || 'NEP-21',
        kind: 'nep21',
        invokeMultiple: ({ invokeArgs = [], signers = [] } = {}) => nep21.api.invoke(
          invokeArgs.map((entry) => buildNep21Invocation(entry, this.account?.hash, this.address)),
          buildNep21Signers(signers, this.account?.hash, this.address),
        ).then(normalizeTxResult),
      };
    }

    if (window.neo3Dapi?.invokeMultiple || window.neo3Dapi?.invokeMulti) {
      return {
        name: 'neo3Dapi',
        invokeMultiple: (params) => (window.neo3Dapi.invokeMultiple || window.neo3Dapi.invokeMulti)(params),
      };
    }

    for (const candidate of this.getNeoLineProviderCandidates()) {
      if (typeof candidate.api?.invokeMultiple === 'function') {
        return {
          name: candidate.name,
          invokeMultiple: (params) => candidate.api.invokeMultiple(params),
        };
      }
      if (typeof candidate.api?.invokeMulti === 'function') {
        return {
          name: candidate.name,
          invokeMultiple: (params) => candidate.api.invokeMulti(params),
        };
      }
    }

    return null;
  }

  getInvokeProvider() {
    const nep21 = this.findNep21ProviderCandidate();
    if (typeof nep21?.api?.invoke === 'function') {
      return {
        name: nep21.name || nep21.api?.name || 'NEP-21',
        kind: 'nep21',
        invoke: (params) => nep21.api.invoke(
          [buildNep21Invocation(params, this.account?.hash, this.address)],
          buildNep21Signers(params.signers, this.account?.hash, this.address),
        ).then(normalizeTxResult),
      };
    }

    if (window.neo3Dapi?.invoke) {
      return {
        name: 'neo3Dapi',
        invoke: (params) => window.neo3Dapi.invoke(params),
      };
    }

    for (const candidate of this.getNeoLineProviderCandidates()) {
      if (typeof candidate.api?.invoke === 'function') {
        return {
          name: candidate.name,
          invoke: (params) => candidate.api.invoke(params),
        };
      }
    }

    if (window.aaWallet?.invoke) {
      return {
        name: 'aaWallet',
        invoke: (params) => window.aaWallet.invoke(params),
      };
    }

    return null;
  }

  async connect() {
    let provider = this.getConnectProvider();
    if (!provider) {
      const nep21 = await this.waitForNep21Provider();
      if (nep21) {
        provider = {
          name: nep21.name || nep21.api?.name || 'NEP-21',
          kind: 'nep21',
          getAccount: () => this.resolveNep21Account(nep21.api),
        };
      }
    }
    if (!provider) {
      throw new Error(EC.walletProviderMissing);
    }

    const result = await provider.getAccount();
    const address = result?.address || result?.account?.address || '';
    if (!address) {
      throw new Error(EC.walletAddressMissing);
    }

    this.setConnected(address, { hash: result?.hash || result?.account?.hash || '', provider: provider.name });
    return { provider: provider.name, address };
  }


  getEvmProvider() {
    return window.ethereum || null;
  }

  getAvailableWalletModes() {
    return {
      neo: Boolean(this.getConnectProvider()),
      evm: Boolean(this.getEvmProvider()),
    };
  }

  async connectEvm() {
    const provider = this.getEvmProvider();
    if (!provider) {
      throw new Error(EC.evmProviderMissing);
    }

    const browserProvider = new BrowserProvider(provider);
    await browserProvider.send('eth_requestAccounts', []);
    const signer = await browserProvider.getSigner();
    const address = await signer.getAddress();
    return { provider: 'ethereum', address };
  }

  async signTypedDataWithEvm({ domain, types, message }) {
    const provider = this.getEvmProvider();
    if (!provider) {
      throw new Error(EC.evmProviderMissing);
    }

    const browserProvider = new BrowserProvider(provider);
    await browserProvider.send('eth_requestAccounts', []);
    const signer = await browserProvider.getSigner();
    return signer.signTypedData(domain, types, message);
  }

  async relayTransaction(request = {}) {
    const { relayEndpoint, ...requestBody } = request || {};
    const response = await fetch(relayEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const responsePayload = await response.json();
    if (!response.ok || responsePayload?.error) {
      const err = new Error(EC.walletRequestFailed);
      err.rpcDetail = responsePayload?.message || responsePayload?.error || null;
      throw err;
    }
    return responsePayload;
  }

  async invokeMultiple({ invokeArgs = [], signers = [] } = {}) {
    if (!this.isConnected) {
      throw new Error(EC.walletNotConnected);
    }

    const provider = this.getBatchInvokeProvider();
    if (!provider) {
      throw new Error(EC.invokeMultipleUnsupported);
    }

    return provider.invokeMultiple({ invokeArgs, signers });
  }

  async invoke(params) {
    if (!this.isConnected) {
      throw new Error(EC.walletNotConnected);
    }

    const provider = this.getInvokeProvider();
    if (!provider) {
      throw new Error(EC.walletProviderMissing);
    }

    return provider.invoke(params);
  }
}

export const walletService = new WalletService();
