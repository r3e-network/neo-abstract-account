const { existsSync } = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

function resolveLocalPaymasterHandlerPath(env = process.env, repoRoot = REPO_ROOT, exists = existsSync) {
  const explicit = String(env.MORPHEUS_LOCAL_PAYMASTER_HANDLER_PATH || '').trim();
  if (explicit) return explicit;

  const siblingPath = path.resolve(
    repoRoot,
    '..',
    'neo-morpheus-oracle',
    'workers',
    'phala-worker',
    'src',
    'worker.js',
  );
  return exists(siblingPath) ? siblingPath : '';
}

module.exports = {
  resolveLocalPaymasterHandlerPath,
};
