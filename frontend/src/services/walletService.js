import { connectedAccount, setConnectedAccount } from '@/utils/wallet';

const HARD_CODED_AA_HASH = '49c095ce04d38642e39155f5481615c58227a498';
const HARD_CODED_RPC_URL = 'https://testnet1.neo.coz.io:443';

function sanitizeHex(value) {
  return String(value || '').replace(/^0x/i, '').toLowerCase();
}

export function getAbstractAccountHash() {
  const value = sanitizeHex(HARD_CODED_AA_HASH);
  if (!/^[0-9a-f]{40}$/.test(value)) return '';
  return value;
}

class WalletService {
  constructor() {
    this.PROVIDERS = {
      NEO_WALLET: 'neo_wallet',
      EVM_WALLET: 'evm_wallet'
    };
    this.provider = this.PROVIDERS.NEO_WALLET;
    this.account = null;
    this.rpcUrl = HARD_CODED_RPC_URL;
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

  setConnected(address) {
    setConnectedAccount(address);
    this.account = address ? { address } : null;
    if (address) {
      window.localStorage.setItem('aa_connected_account', address);
    } else {
      window.localStorage.removeItem('aa_connected_account');
    }
  }

  async invoke(params) {
    if (!this.isConnected) {
      throw new Error('Wallet not connected. Connect a Neo wallet integration first.');
    }

    if (window.neo3Dapi?.invoke) {
      return window.neo3Dapi.invoke(params);
    }
    if (window.NEOLineN3?.invoke) {
      return window.NEOLineN3.invoke(params);
    }
    if (window.aaWallet?.invoke) {
      return window.aaWallet.invoke(params);
    }

    throw new Error('No browser wallet provider found (neo3Dapi / NEOLineN3 / aaWallet).');
  }
}

export const walletService = new WalletService();
