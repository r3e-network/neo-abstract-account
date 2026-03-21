export function createVanityWorker() {
  return new Worker(new URL('./vanityGenerator.worker.js', import.meta.url), {
    type: 'module',
  });
}

export function startGeneration(worker, { contractHash, pattern, patternType, batchSize = 500 }) {
  worker.postMessage({
    type: 'start',
    contractHash,
    pattern,
    patternType,
    batchSize,
  });
}

export function stopGeneration(worker) {
  worker.postMessage({ type: 'stop' });
}

export function terminateWorker(worker) {
  if (worker) {
    try {
      worker.terminate();
    } catch (err) {
      if (import.meta.env.DEV) console.error('[vanityWorkerBridge] terminate failed:', err?.message);
    }
  }
}

export function onProgress(worker, callback) {
  worker.onmessage = (event) => {
    callback(event.data);
  };
}
