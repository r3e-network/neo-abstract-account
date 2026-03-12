import { ref } from 'vue';

export const connectedDidProfile = ref(null);

export function setConnectedDidProfile(profile) {
  connectedDidProfile.value = profile || null;
}
