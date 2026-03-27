import { BrowserProvider } from 'ethers';
import { connectedAccount, setConnectedAccount } from '@/utils/wallet';
import { RUNTIME_CONFIG } from '@/config/runtimeConfig';
import { EC } from '../config/errorCodes.js';

export function getAbstractAccountHash() {
  return RUNTIME_CONFIG.abstractAccountHash;
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

  setConnected(address) {
    setConnectedAccount(address);
    this.account = address ? { address } : null;
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

  getConnectProvider() {
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
    const provider = this.getConnectProvider();
    if (!provider) {
      throw new Error(EC.walletProviderMissing);
    }

    const result = await provider.getAccount();
    const address = result?.address || result?.account?.address || '';
    if (!address) {
      throw new Error(EC.walletAddressMissing);
    }

    this.setConnected(address);
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
