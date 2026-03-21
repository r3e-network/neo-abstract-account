import { ref, computed, watch, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { connectedAccount } from '@/utils/wallet';
import { walletService } from '@/services/walletService';
import { useI18n } from '@/i18n';
import { translateError } from '@/config/errorCodes.js';

export function useWalletConnection() {
  const toast = useToast();
  const { t } = useI18n();

  const isConnecting = ref(false);
  const isConnected = computed(() => !!connectedAccount.value);
  const truncatedAddress = computed(() => {
    if (!connectedAccount.value) return '';
    const address = connectedAccount.value;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  });

  const availableWalletModes = computed(() => walletService.getAvailableWalletModes());

  async function connect() {
    isConnecting.value = true;
    try {
      const { address } = await walletService.connect();
      toast.success(`${t('nav.connect', 'Connect Wallet')}: ${address}`);
    } catch (err) {
      toast.error(translateError(err?.message, t));
    } finally {
      isConnecting.value = false;
    }
  }

  function disconnect() {
    walletService.disconnect();
    toast.info(`${t('nav.disconnect', 'Disconnect')}.`);
  }

  // Auto-reconnect: persist connection state
  watch(connectedAccount, (addr) => {
    if (addr) {
      localStorage.setItem('aa_wallet_connected', 'true');
    } else {
      localStorage.removeItem('aa_wallet_connected');
    }
  });

  // Auto-reconnect on page load
  onMounted(async () => {
    if (localStorage.getItem('aa_wallet_connected') && !connectedAccount.value) {
      try {
        await walletService.connect();
      } catch (error) {
        if (import.meta.env.DEV) console.error('[useWalletConnection] Auto-reconnect failed:', error?.message);
        toast.error(t('nav.walletSessionExpired', 'Wallet session expired. Please reconnect.'));
        localStorage.removeItem('aa_wallet_connected');
      }
    }
  });

  async function connectEvm() {
    isConnecting.value = true;
    try {
      const { address } = await walletService.connectEvm();
      toast.success(`${t('operations.connectEvmWallet', 'Connect EVM Wallet')}: ${address}`);
      return { address };
    } catch (err) {
      toast.error(translateError(err?.message, t));
      throw err;
    } finally {
      isConnecting.value = false;
    }
  }

  return {
    isConnected,
    isConnecting,
    truncatedAddress,
    availableWalletModes,
    connect,
    connectEvm,
    disconnect
  };
}
