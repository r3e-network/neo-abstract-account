const fs = require('fs');
const path = require('path');

const NEF_RELATIVE_PATH = path.join('contracts', 'bin', 'sc', 'UnifiedSmartWalletV2.nef');
const MANIFEST_RELATIVE_PATH = path.join('contracts', 'bin', 'sc', 'UnifiedSmartWalletV2.manifest.json');

function resolveRepoRoot(fromDir = __dirname) {
  let currentDir = path.resolve(fromDir);

  while (true) {
    const nefPath = path.join(currentDir, NEF_RELATIVE_PATH);
    const manifestPath = path.join(currentDir, MANIFEST_RELATIVE_PATH);
    if (fs.existsSync(nefPath) && fs.existsSync(manifestPath)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(`Unable to locate repo root from ${fromDir}`);
    }
    currentDir = parentDir;
  }
}

function resolveContractArtifactPaths({ fromDir = __dirname } = {}) {
  const repoRoot = resolveRepoRoot(fromDir);
  return {
    repoRoot,
    nefPath: path.join(repoRoot, NEF_RELATIVE_PATH),
    manifestPath: path.join(repoRoot, MANIFEST_RELATIVE_PATH),
  };
}

function readContractArtifacts({ fromDir = __dirname } = {}) {
  const { repoRoot, nefPath, manifestPath } = resolveContractArtifactPaths({ fromDir });
  const nefBytes = fs.readFileSync(nefPath);
  const manifestString = fs.readFileSync(manifestPath, 'utf8');

  return {
    repoRoot,
    nefPath,
    manifestPath,
    nefBytes,
    nefBase64: nefBytes.toString('base64'),
    manifestString,
  };
}

module.exports = {
  readContractArtifacts,
  resolveContractArtifactPaths,
  resolveRepoRoot,
};
