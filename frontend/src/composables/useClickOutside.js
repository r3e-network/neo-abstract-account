import { onMounted, onUnmounted } from 'vue';

export function useClickOutside(targetRef, callback) {
  function handler(event) {
    const el = targetRef.value;
    if (!el) return;
    if (el.contains(event.target)) return;
    callback(event);
  }

  function keyHandler(event) {
    if (event.key === 'Escape') {
      callback(event);
    }
  }

  onMounted(() => {
    document.addEventListener('click', handler, true);
    document.addEventListener('keydown', keyHandler);
  });

  onUnmounted(() => {
    document.removeEventListener('click', handler, true);
    document.removeEventListener('keydown', keyHandler);
  });
}
