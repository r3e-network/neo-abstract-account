import { onUnmounted, ref } from 'vue';

export function useClipboard({ timeout = 1200 } = {}) {
  const copiedKey = ref('');
  let timer = null;

  function resetTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function markCopied(key) {
    copiedKey.value = key;
    resetTimer();
    timer = setTimeout(() => {
      copiedKey.value = '';
      timer = null;
    }, timeout);
  }

  async function copyText(text) {
    if (!text) return false;
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }

  onUnmounted(() => {
    resetTimer();
  });

  return { copiedKey, markCopied, copyText };
}
