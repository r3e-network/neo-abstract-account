import { computed } from 'vue';
import { useToast } from 'vue-toastification';
import { connectedAccount } from '@/utils/wallet';
import { walletService } from '@/services/walletService';

export function useWalletConnection() {
  const toast = useToast();

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
      toast.success(`Connected: ${address}`);
    } catch (err) {
      console.error(err);
      toast.error(`Connect failed: ${err?.message || err}`);
    }
  }

  function disconnect() {
    walletService.disconnect();
    toast.info('Wallet disconnected.');
  }

  async function connectEvm() {
    try {
      const { address } = await walletService.connectEvm();
      toast.success(`EVM wallet connected: ${address}`);
      return { address };
    } catch (err) {
      console.error(err);
      toast.error(`EVM connect failed: ${err?.message || err}`);
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
