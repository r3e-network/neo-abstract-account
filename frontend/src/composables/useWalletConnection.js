import { computed } from 'vue';
import { useToast } from 'vue-toastification';
import { connectedAccount } from '@/utils/wallet';
import { walletService } from '@/services/walletService';
import { createI18nController } from '@/i18n';

export function useWalletConnection() {
  const toast = useToast();
  const { t } = createI18nController();

  const isConnected = computed(() => !!connectedAccount.value);
  const truncatedAddress = computed(() => {
    if (!connectedAccount.value) return '';
    const address = connectedAccount.value;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  });

  const availableWalletModes = computed(() => walletService.getAvailableWalletModes());

  async function connect() {
    try {
      const { address } = await walletService.connect();
      toast.success(`${t('nav.connect', 'Connect Wallet')}: ${address}`);
    } catch (err) {
      console.error(err);
      toast.error(`${t('nav.connect', 'Connect Wallet')} failed: ${err?.message || err}`);
    }
  }

  function disconnect() {
    walletService.disconnect();
    toast.info(`${t('nav.disconnect', 'Disconnect')}.`);
  }

  async function connectEvm() {
    try {
      const { address } = await walletService.connectEvm();
      toast.success(`${t('operations.connectEvmWallet', 'Connect EVM Wallet')}: ${address}`);
      return { address };
    } catch (err) {
      console.error(err);
      toast.error(`${t('operations.connectEvmWallet', 'Connect EVM Wallet')} failed: ${err?.message || err}`);
      throw err;
    }
  }

  return {
    isConnected,
    truncatedAddress,
    availableWalletModes,
    connect,
    connectEvm,
    disconnect
  };
}
