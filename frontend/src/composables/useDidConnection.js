import { computed } from 'vue';
import { useToast } from 'vue-toastification';
import { connectedDidProfile } from '@/utils/did';
import { didService } from '@/services/didService';

export function useDidConnection() {
  const toast = useToast();

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
      toast.success(`DID connected: ${profile.did}`);
      return profile;
    } catch (err) {
      console.error(err);
      toast.error(`DID connect failed: ${err?.message || err}`);
      throw err;
    }
  }

  async function disconnectDid() {
    await didService.disconnect();
    toast.info('DID disconnected.');
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
