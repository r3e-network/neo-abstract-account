const fs = require('node:fs');

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;

  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  }

  return out;
}

module.exports = {
  parseEnvFile,
};
