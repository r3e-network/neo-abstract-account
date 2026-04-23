import { spawnSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const execFileAsync = promisify(execFile);

function hasCommand(command) {
  return spawnSync('bash', ['-lc', `command -v ${command} >/dev/null 2>&1`]).status === 0;
}

export function splitCommand(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function resolvePhalaCliCommand(env = process.env, hasCommandImpl = hasCommand) {
  const explicit = splitCommand(env.PHALA_CLI || '');
  if (explicit.length > 0) return explicit;
  if (hasCommandImpl('phala')) return ['phala'];
  if (hasCommandImpl('npx')) return ['npx', '--yes', 'phala'];
  return null;
}

export function parseLastJsonLine(stdout = '') {
  const lines = String(stdout || '')
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!line.startsWith('{')) continue;
    try {
      return JSON.parse(line);
    } catch {}
  }
  return null;
}

export async function runPhalaRemoteShell({
  apiToken,
  appId,
  shellScript,
  cliCommand = resolvePhalaCliCommand(process.env),
  maxBuffer = 10 * 1024 * 1024,
  retries = 3,
} = {}) {
  if (!apiToken) {
    throw new Error('Phala API token is required for remote paymaster fallback');
  }
  if (!appId) {
    throw new Error('Phala app id is required for remote paymaster fallback');
  }
  if (!cliCommand || cliCommand.length === 0) {
    throw new Error('phala CLI is required for remote paymaster fallback (global phala or npx phala)');
  }

  let lastError = null;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'aa-phala-remote-'));
  const localScriptPath = path.join(tempDir, 'remote.sh');
  await writeFile(localScriptPath, shellScript, { mode: 0o700 });

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const remoteScriptPath = `/tmp/aa-paymaster-${Date.now()}-${attempt}.sh`;
    try {
      await execFileAsync(
        cliCommand[0],
        [...cliCommand.slice(1), 'cp', '--api-token', apiToken, localScriptPath, `${appId}:${remoteScriptPath}`],
        { maxBuffer },
      );
      const result = await execFileAsync(
        cliCommand[0],
        [...cliCommand.slice(1), 'ssh', '--api-token', apiToken, appId, '--', 'sh', remoteScriptPath],
        { maxBuffer },
      );
      await execFileAsync(
        cliCommand[0],
        [...cliCommand.slice(1), 'ssh', '--api-token', apiToken, appId, '--', 'rm', '-f', remoteScriptPath],
        { maxBuffer },
      ).catch(() => {});
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
      return result;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }

  await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function callRemotePaymasterAuthorize({
  payload,
  apiToken,
  appId,
  remoteWorkerService = 'testnet-request-worker',
  cliCommand = resolvePhalaCliCommand(process.env),
  retries = 3,
} = {}) {
  const bodyBase64 = Buffer.from(JSON.stringify(payload || {}), 'utf8').toString('base64');
  const shellScript = `
set -e
WORKER_CONTAINER="$(docker ps --format '{{.Names}}' | awk '/request-worker/ { print; exit }')"
if [ -z "$WORKER_CONTAINER" ]; then
  echo "request-worker container not found" >&2
  exit 1
fi
docker exec -i "$WORKER_CONTAINER" node --input-type=module - <<'JS'
process.env.PHALA_API_TOKEN = process.env.PHALA_API_TOKEN || process.env.MORPHEUS_RUNTIME_TOKEN || process.env.PHALA_SHARED_SECRET || "";
const body = JSON.parse(Buffer.from('${bodyBase64}', 'base64').toString('utf8'));
const { default: handler } = await import('/app/workers/phala-worker/src/worker.js');
const req = new Request('http://local/paymaster/authorize', {
  method: 'POST',
  headers: { authorization: 'Bearer ' + process.env.PHALA_API_TOKEN, 'content-type': 'application/json' },
  body: JSON.stringify(body),
});
const res = await handler(req);
const text = await res.text();
let parsed;
try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
console.log(JSON.stringify({ status: res.status, body: parsed }));
JS
`;
  const { stdout } = await runPhalaRemoteShell({
    apiToken,
    appId,
    shellScript,
    cliCommand,
    retries,
  });
  const parsed = parseLastJsonLine(stdout);
  if (!parsed) {
    throw new Error(`unexpected paymaster remote output: ${String(stdout || '').trim()}`);
  }
  return parsed;
}
