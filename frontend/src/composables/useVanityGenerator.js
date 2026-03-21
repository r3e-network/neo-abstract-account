import { computed, onUnmounted, ref, shallowRef } from 'vue';
import { createVanityWorker, startGeneration, stopGeneration, terminateWorker, onProgress } from '@/utils/vanityWorkerBridge.js';
import { estimateDifficulty, validatePattern } from '@/utils/vanityDifficulty.js';
import { EC } from '@/config/errorCodes.js';

export function useVanityGenerator() {
  const running = ref(false);
  const found = ref(false);
  const attempts = ref(0);
  const elapsed = ref(0);
  const seed = ref('');
  const address = ref('');
  const accountIdHash = ref('');
  const error = ref('');
  const pattern = ref('');
  const patternType = ref('prefix');

  const worker = shallowRef(null);

  const difficulty = computed(() => {
    if (!pattern.value.trim()) return { attempts: 0, seconds: 0, level: 'easy' };
    return estimateDifficulty(pattern.value);
  });

  function start(contractHash, patternValue, patternTypeValue) {
    stop();

    const validationError = validatePattern(patternValue, patternTypeValue);
    if (validationError) {
      error.value = validationError;
      return;
    }

    error.value = '';
    found.value = false;
    attempts.value = 0;
    elapsed.value = 0;
    seed.value = '';
    address.value = '';
    accountIdHash.value = '';
    pattern.value = patternValue;
    patternType.value = patternTypeValue;

    const w = createVanityWorker();
    worker.value = w;
    running.value = true;

    onProgress(w, (msg) => {
      if (msg.type === 'progress') {
        attempts.value = msg.attempts;
        elapsed.value = msg.elapsed;
      } else if (msg.type === 'result' && msg.found) {
        found.value = true;
        running.value = false;
        seed.value = msg.seed;
        address.value = msg.address;
        accountIdHash.value = msg.accountIdHash;
        attempts.value = msg.attempts;
        elapsed.value = msg.elapsed;
        terminateWorker(w);
        worker.value = null;
      }
    });

    w.onerror = (err) => {
      if (import.meta.env.DEV) console.warn('[useVanityGenerator] Worker error:', err?.message);
      running.value = false;
      error.value = EC.vanityWorkerCrashed;
      terminateWorker(w);
      worker.value = null;
    };

    startGeneration(w, {
      contractHash,
      pattern: patternValue.trim(),
      patternType: patternTypeValue,
    });
  }

  function stop() {
    running.value = false;
    if (worker.value) {
      stopGeneration(worker.value);
      terminateWorker(worker.value);
      worker.value = null;
    }
  }

  function reset() {
    stop();
    found.value = false;
    attempts.value = 0;
    elapsed.value = 0;
    seed.value = '';
    address.value = '';
    accountIdHash.value = '';
    error.value = '';
    pattern.value = '';
  }

  onUnmounted(() => {
    stop();
  });

  return {
    running,
    found,
    attempts,
    elapsed,
    seed,
    address,
    accountIdHash,
    error,
    pattern,
    patternType,
    difficulty,
    start,
    stop,
    reset,
  };
}
