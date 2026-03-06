import { connectedAccount, setConnectedAccount } from '@/utils/wallet';
import { RUNTIME_CONFIG } from '@/config/runtimeConfig';

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

  getConnectProvider() {
    if (window.neo3Dapi?.getAccount) {
      return {
        name: 'neo3Dapi',
        getAccount: () => window.neo3Dapi.getAccount()
      };
    }

    if (window.NEOLineN3?.getAccount) {
      return {
        name: 'NEOLineN3',
        getAccount: () => window.NEOLineN3.getAccount()
      };
    }

    return null;
  }

  getInvokeProvider() {
    if (window.neo3Dapi?.invoke) {
      return {
        name: 'neo3Dapi',
        invoke: (params) => window.neo3Dapi.invoke(params)
      };
    }

    if (window.NEOLineN3?.invoke) {
      return {
        name: 'NEOLineN3',
        invoke: (params) => window.NEOLineN3.invoke(params)
      };
    }

    if (window.aaWallet?.invoke) {
      return {
        name: 'aaWallet',
        invoke: (params) => window.aaWallet.invoke(params)
      };
    }

    return null;
  }

  async connect() {
    const provider = this.getConnectProvider();
    if (!provider) {
      throw new Error('No supported Neo wallet provider detected in browser.');
    }

    const result = await provider.getAccount();
    const address = result?.address || result?.account?.address || '';
    if (!address) {
      throw new Error('Wallet did not return an account address.');
    }

    this.setConnected(address);
    return { provider: provider.name, address };
  }

  async invoke(params) {
    if (!this.isConnected) {
      throw new Error('Wallet not connected. Connect a Neo wallet integration first.');
    }

    const provider = this.getInvokeProvider();
    if (!provider) {
      throw new Error('No browser wallet provider found (neo3Dapi / NEOLineN3 / aaWallet).');
    }

    return provider.invoke(params);
  }
}

export const walletService = new WalletService();
