const fs = require('fs');
const path = require('path');

const operationsDir = '/home/neo/git/neo-abstract-account/frontend/src/features/operations';

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const {from, to} of replacements) {
        content = content.replace(from, to);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
}

// 1. AccountDiscoveryPanel.vue
const adpPath = path.join(operationsDir, 'components/AccountDiscoveryPanel.vue');
let adpContent = fs.readFileSync(adpPath, 'utf8');

adpContent = adpContent.replace('Find all accounts where you are an admin or manager', 'Find all accounts where you are a signer');

adpContent = adpContent.replace(
  /<div v-if="results\.adminAccounts\.length > 0"[\s\S]*?<\/div>\s*<\/div>/,
  `<div v-if="results.signerAccounts.length > 0" class="rounded-lg border border-ata-border bg-ata-panel p-4">
          <h3 class="text-sm font-mono font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2 tracking-widest">
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            Signer Accounts ({{ results.signerAccounts.length }})
          </h3>
          <div class="space-y-2">
            <button v-for="(account, idx) in results.signerAccounts" :key="idx" class="w-full text-left rounded-lg border border-ata-border bg-ata-panel px-3 py-2.5 hover:border-ata-green hover:bg-ata-green/10 transition-all group" @click="$emit('select', account)">
              <div class="flex items-center justify-between">
                <span class="font-mono text-sm text-white group-hover:text-ata-green">{{ account }}</span>
                <svg class="w-4 h-4 text-slate-400 group-hover:text-ata-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </div>
            </button>
          </div>
        </div>`
);

adpContent = adpContent.replace(
  /<div v-if="results\.managerAccounts\.length > 0"[\s\S]*?<\/div>\s*<\/div>/,
  ''
);

adpContent = adpContent.replace(
  'results.adminAccounts.length === 0 && results.managerAccounts.length === 0',
  'results.signerAccounts.length === 0'
);

adpContent = adpContent.replace(
  'This address is not an admin or manager of any accounts',
  'This address is not a signer of any accounts'
);

adpContent = adpContent.replace(
  '// const adminAccounts = await client.getAccountsByAdmin(searchAddress.value);\n    // const managerAccounts = await client.getAccountsByManager(searchAddress.value);',
  '// const signerAccounts = await client.getAccountsBySigner(searchAddress.value);'
);

adpContent = adpContent.replace(
  'adminAccounts: [],\n      managerAccounts: [],',
  'signerAccounts: [],'
);

fs.writeFileSync(adpPath, adpContent, 'utf8');
console.log('Updated AccountDiscoveryPanel.vue');


// 2. HomeOperationsWorkspace.vue
const howPath = path.join(operationsDir, 'components/HomeOperationsWorkspace.vue');
let howContent = fs.readFileSync(howPath, 'utf8');

howContent = howContent.replace(/const batchAdmins = ref\('\['\]'\);/g, "const batchSigners = ref('[]');");
howContent = howContent.replace(/const batchAdminThreshold = ref\('1'\);/g, "const batchThreshold = ref('1');");
howContent = howContent.replace(/const batchManagers = ref\('\['\]'\);\n/g, "");
howContent = howContent.replace(/const batchManagerThreshold = ref\('0'\);\n/g, "");
howContent = howContent.replace(/admins: batchAdmins\.value, adminThreshold: batchAdminThreshold\.value, managers: batchManagers\.value, managerThreshold: batchManagerThreshold\.value/g, "signers: batchSigners.value, threshold: batchThreshold.value");
howContent = howContent.replace(/:batch-admins="batchAdmins"/g, ':batch-signers="batchSigners"');
howContent = howContent.replace(/:batch-admin-threshold="batchAdminThreshold"/g, ':batch-threshold="batchThreshold"');
howContent = howContent.replace(/ :batch-managers="batchManagers" :batch-manager-threshold="batchManagerThreshold"/g, "");
howContent = howContent.replace(/@update:batch-admins="batchAdmins = \$event"/g, '@update:batch-signers="batchSigners = $event"');
howContent = howContent.replace(/@update:batch-admin-threshold="batchAdminThreshold = \$event"/g, '@update:batch-threshold="batchThreshold = $event"');
howContent = howContent.replace(/ @update:batch-managers="batchManagers = \$event" @update:batch-manager-threshold="batchManagerThreshold = \$event"/g, "");

fs.writeFileSync(howPath, howContent, 'utf8');
console.log('Updated HomeOperationsWorkspace.vue');


// 3. OperationComposerPanel.vue
const ocpPath = path.join(operationsDir, 'components/OperationComposerPanel.vue');
let ocpContent = fs.readFileSync(ocpPath, 'utf8');

ocpContent = ocpContent.replace(
  /All accounts will have the same admin and manager configuration\./g,
  'All accounts will have the same signer configuration.'
);
ocpContent = ocpContent.replace(/Admin Configuration/g, 'Signer Configuration');
ocpContent = ocpContent.replace(/Admin Addresses/g, 'Signer Addresses');
ocpContent = ocpContent.replace(/Admin Threshold/g, 'Signer Threshold');
ocpContent = ocpContent.replace(/batchAdmins/g, 'batchSigners');
ocpContent = ocpContent.replace(/batchAdminThreshold/g, 'batchThreshold');
ocpContent = ocpContent.replace(/batch-admins/g, 'batch-signers');
ocpContent = ocpContent.replace(/batch-admin-threshold/g, 'batch-threshold');

// Remove Manager Configuration block
ocpContent = ocpContent.replace(
  /      <div class="border-t border-ata-border pt-4">\s*<h3 class="text-sm font-mono font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2 tracking-widest">[\s\S]*?Manager Configuration[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
  ''
);

// Remove manager props
ocpContent = ocpContent.replace(/\s*batchManagers: \{ type: String, default: '\['\]' \},/g, '');
ocpContent = ocpContent.replace(/\s*batchManagerThreshold: \{ type: String, default: '0' \},/g, '');

// Remove manager emits
ocpContent = ocpContent.replace(/\s*'update:batchManagers',/g, '');
ocpContent = ocpContent.replace(/\s*'update:batchManagerThreshold',/g, '');

fs.writeFileSync(ocpPath, ocpContent, 'utf8');
console.log('Updated OperationComposerPanel.vue');


// 4. presets.js
const pPath = path.join(operationsDir, 'presets.js');
let pContent = fs.readFileSync(pPath, 'utf8');

pContent = pContent.replace(
  /const admins = \(parseJson\(batch\.admins \|\| '\['\]', \[\]\) \|\| \[\]\)\.map\(normalizeHash160\)\.filter\(Boolean\);\n    const managers = \(parseJson\(batch\.managers \|\| '\['\]', \[\]\) \|\| \[\]\)\.map\(normalizeHash160\)\.filter\(Boolean\);/,
  `const signers = (parseJson(batch.signers || '[]', []) || []).map(normalizeHash160).filter(Boolean);`
);

pContent = pContent.replace(
  /toArrayArg\(admins\.map\(h => `0x\$\{h\}`\), 'Hash160'\),\n        toIntegerArg\(batch\.adminThreshold \|\| 1\),\n        toArrayArg\(managers\.map\(h => `0x\$\{h\}`\), 'Hash160'\),\n        toIntegerArg\(batch\.managerThreshold \|\| 0\),/,
  `toArrayArg(signers.map(h => \`0x\${h}\`), 'Hash160'),\n        toIntegerArg(batch.threshold || 1),`
);

fs.writeFileSync(pPath, pContent, 'utf8');
console.log('Updated presets.js');


// 5. metaTx.js
const mtPath = path.join(operationsDir, 'metaTx.js');
let mtContent = fs.readFileSync(mtPath, 'utf8');

mtContent = mtContent.replace(/operation: 'getAdminThresholdByAddress',/g, "operation: 'getThresholdByAddress',");
mtContent = mtContent.replace(/getAdminThresholdByAddress fault:/g, "getThresholdByAddress fault:");

fs.writeFileSync(mtPath, mtContent, 'utf8');
console.log('Updated metaTx.js');
