import { computed } from 'vue';
import { useToast } from 'vue-toastification';
import { connectedDidProfile } from '@/utils/did';
import { didService } from '@/services/didService';
import { createI18nController } from '@/i18n';

export function useDidConnection() {
  const toast = useToast();
  const { t } = createI18nController();

  const isConnected = computed(() => Boolean(connectedDidProfile.value?.did));
  const didProfile = computed(() => connectedDidProfile.value);
  const shortDid = computed(() => {
    const did = connectedDidProfile.value?.did || '';
    if (!did) return '';
    return did.length > 26 ? `${did.slice(0, 18)}...${did.slice(-6)}` : did;
  });
  const isConfigured = computed(() => didService.isConfigured);

  async function connectDid(options = {}) {
    try {
      const profile = await didService.connect(options);
      toast.success(`${t('nav.connectDid', 'Connect Web3Auth')}: ${profile.did}`);
      return profile;
    } catch (err) {
      console.error(err);
      toast.error(`${t('nav.connectDid', 'Connect Web3Auth')} failed: ${err?.message || err}`);
      throw err;
    }
  }

  async function disconnectDid() {
    await didService.disconnect();
    toast.info(`${t('nav.disconnectDid', 'Disconnect Web3Auth')}.`);
  }

  return {
    isConfigured,
    isConnected,
    didProfile,
    shortDid,
    connectDid,
    disconnectDid,
  };
}
