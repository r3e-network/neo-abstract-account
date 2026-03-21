import { ref, computed, watch, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { connectedDidProfile } from '@/utils/did';
import { didService } from '@/services/didService';
import { useI18n } from '@/i18n';
import { translateError } from '@/config/errorCodes.js';

export function useDidConnection() {
  const toast = useToast();
  const { t } = useI18n();

  const isConnecting = ref(false);
  const isConnected = computed(() => Boolean(connectedDidProfile.value?.did));
  const didProfile = computed(() => connectedDidProfile.value);
  const shortDid = computed(() => {
    const did = connectedDidProfile.value?.did || '';
    if (!did) return '';
    return did.length > 26 ? `${did.slice(0, 18)}...${did.slice(-6)}` : did;
  });
  const isConfigured = computed(() => didService.isConfigured);

  async function connectDid(options = {}) {
    isConnecting.value = true;
    try {
      const profile = await didService.connect(options);
      toast.success(`${t('nav.connectDid', 'Connect Web3Auth')}: ${profile.did}`);
      return profile;
    } catch (err) {
      toast.error(translateError(err?.message, t));
      throw err;
    } finally {
      isConnecting.value = false;
    }
  }

  async function disconnectDid() {
    await didService.disconnect();
    toast.info(`${t('nav.disconnectDid', 'Disconnect Web3Auth')}.`);
  }

  // Auto-reconnect: persist DID connection state
  watch(isConnected, (connected) => {
    if (connected) {
      localStorage.setItem('aa_did_connected', 'true');
    } else {
      localStorage.removeItem('aa_did_connected');
    }
  });

  // Auto-reconnect on page load
  onMounted(async () => {
    if (localStorage.getItem('aa_did_connected') && !connectedDidProfile.value?.did && didService.isConfigured) {
      try {
        await didService.connect();
      } catch (error) {
        if (import.meta.env.DEV) console.error('[useDidConnection] Auto-reconnect failed:', error?.message);
        toast.error(t('nav.didSessionExpired', 'Web3Auth session expired. Please reconnect.'));
        localStorage.removeItem('aa_did_connected');
      }
    }
  });

  return {
    isConfigured,
    isConnected,
    isConnecting,
    didProfile,
    shortDid,
    connectDid,
    disconnectDid,
  };
}
