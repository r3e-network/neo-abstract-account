const fs = require('fs');
const path = '/home/neo/git/neo-abstract-account/frontend/src/features/studio/useStudioController.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/  const validDomeAccounts = computed\(\(\) => sanitizeList\(manageForm\.value\.domeAccounts\)\);\n/, '');
content = content.replace(/  watch\(validDomeAccounts, \(domeAccounts\) => \{\n    if \(domeAccounts\.length === 0\) \{\n      manageForm\.value\.domeThreshold = 0;\n      return;\n    \}\n    if \(manageForm\.value\.domeThreshold < 1\) manageForm\.value\.domeThreshold = 1;\n    if \(manageForm\.value\.domeThreshold > domeAccounts\.length\) manageForm\.value\.domeThreshold = domeAccounts\.length;\n  \}\);\n/, '');

content = content.replace(/        invokeReadOperation\('getDomeAccountsByAddress', \[\{ type: 'Hash160', value: accountHash \}\]\),\n        invokeReadOperation\('getDomeThresholdByAddress', \[\{ type: 'Hash160', value: accountHash \}\]\),\n        invokeReadOperation\('getDomeTimeoutByAddress', \[\{ type: 'Hash160', value: accountHash \}\]\),\n/, '');
content = content.replace(/        invokeReadOperation\('isDomeOracleUnlockedByAddress', \[\{ type: 'Hash160', value: accountHash \}\]\)\n/, '');
content = content.replace(/,\n        invokeReadOperation\('isDomeOracleUnlockedByAddress'/g, '');
content = content.replace(/        lastActiveRes,\n        domeUnlockRes\n/g, '        lastActiveRes\n');

content = content.replace(/      const domeAccounts = decodeStackHashArray\(domeAccountsRes\?\.stack\?\.\[0\]\);\n\n/, '');
content = content.replace(/      const domeThreshold = decodeStackInteger\(domeThresholdRes\?\.stack\?\.\[0\]\);\n/, '');
content = content.replace(/      const domeTimeoutSeconds = decodeStackInteger\(domeTimeoutRes\?\.stack\?\.\[0\]\);\n/, '');
content = content.replace(/      manageForm\.value\.domeAccounts = domeAccounts\.length > 0 \? domeAccounts\.map\(\(value\) => \`0x\$\{value\}\`\) : \[\];\n      manageForm\.value\.domeThreshold = domeAccounts\.length > 0\n        \? normalizeThreshold\(domeThreshold, domeAccounts\.length, 0\)\n        : 0;\n      manageForm\.value\.domeTimeoutHours = domeTimeoutSeconds > 0\n        \? Number\(\(domeTimeoutSeconds \/ 3600\)\.toFixed\(2\)\)\n        : 0;\n\n/, '');
content = content.replace(/      const domeUnlocked = decodeStackBoolean\(domeUnlockRes\?\.stack\?\.\[0\]\);\n\n/, '');
content = content.replace(/,\n    domeUnlocked/g, '');

content = content.replace(/  async function setDomeAccountsByAddress\(\) \{[\s\S]*?\} finally \{\n      manageBusy\.value\.domeAccounts = false;\n    \}\n  \}\n\n/g, '');
content = content.replace(/  async function setDomeOracleByAddress\(\) \{[\s\S]*?\} finally \{\n      manageBusy\.value\.domeOracle = false;\n    \}\n  \}\n\n/g, '');
content = content.replace(/  async function requestDomeActivationByAddress\(\) \{[\s\S]*?\} finally \{\n      manageBusy\.value\.domeActivation = false;\n    \}\n  \}\n\n/g, '');

content = content.replace(/    validDomeAccounts,\n/g, '');
content = content.replace(/    setDomeAccountsByAddress,\n/g, '');
content = content.replace(/    setDomeOracleByAddress,\n/g, '');
content = content.replace(/    requestDomeActivationByAddress,\n/g, '');

fs.writeFileSync(path, content);
