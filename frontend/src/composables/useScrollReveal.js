import { onUnmounted } from 'vue';

export function useScrollReveal(options = {}) {
  const { threshold = 0.1, rootMargin = '0px 0px -40px 0px' } = options;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scroll-reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold, rootMargin }
  );

  function observe(el) {
    if (!el) return;
    observer.observe(el);
  }

  onUnmounted(() => {
    observer.disconnect();
  });

  return { observe };
}
