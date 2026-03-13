const fs = require('fs');
const path = '/home/neo/git/neo-abstract-account/frontend/src/features/studio/components/ManageGovernancePanel.vue';
let content = fs.readFileSync(path, 'utf8');

// Remove domeUnlocked block
content = content.replace(/            <div v-if="manageSnapshot\.domeUnlocked !== null">[\s\S]*?<\/div>\n/, '');

// Remove Dome Accounts and Dome Oracle sections
content = content.replace(/      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">\n        <!-- Dome Accounts -->[\s\S]*?<!-- Dome Oracle -->[\s\S]*?<\/div>\n      <\/div>/, '');

// Clean up script setup bindings
content = content.replace(/  validDomeAccounts,\n/, '');
content = content.replace(/  setDomeAccountsByAddress,\n/, '');
content = content.replace(/  setDomeOracleByAddress,\n/, '');
content = content.replace(/  requestDomeActivationByAddress\n/, '');

// Fix any dangling commas if needed (if last item was removed and previous had comma)
// requestDomeActivationByAddress was the last one, so setSignersByAddress might need its comma removed if it's now last.
content = content.replace(/  setSignersByAddress,\n} = studio;/, '  setSignersByAddress\n} = studio;');


fs.writeFileSync(path, content);