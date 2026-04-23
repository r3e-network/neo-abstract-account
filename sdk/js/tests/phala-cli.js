const { spawnSync } = require('node:child_process');

function hasCommand(command) {
  return spawnSync('bash', ['-lc', `command -v ${command} >/dev/null 2>&1`]).status === 0;
}

function splitCommand(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function resolvePhalaCliCommand(env = process.env, hasCommandImpl = hasCommand) {
  const explicit = splitCommand(env.PHALA_CLI || '');
  if (explicit.length > 0) return explicit;
  if (hasCommandImpl('phala')) return ['phala'];
  if (hasCommandImpl('npx')) return ['npx', '--yes', 'phala'];
  return null;
}

module.exports = {
  hasCommand,
  resolvePhalaCliCommand,
  splitCommand,
};
