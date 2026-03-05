import { ref } from 'vue';

export const connectedAccount = ref('');

export function setConnectedAccount(account) {
  connectedAccount.value = account || '';
}
