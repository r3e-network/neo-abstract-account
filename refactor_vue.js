const fs = require('fs');

function refactorCreate() {
  const p = 'frontend/src/features/studio/components/CreateAccountPanel.vue';
  let content = fs.readFileSync(p, 'utf8');

  // Replace variables
  content = content.replace(/createForm\.admins/g, 'createForm.signers');
  content = content.replace(/createForm\.adminThreshold/g, 'createForm.threshold');
  content = content.replace(/validCreateAdmins/g, 'validCreateSigners');
  content = content.replace(/create-admin-/g, 'create-signer-');
  content = content.replace(/\(admin,/g, '(signer,');

  // Remove validCreateManagers
  content = content.replace(/\s*validCreateManagers,\n/g, '\n');

  // Rename Admins header
  content = content.replace('<!-- Admins -->', '<!-- Signers -->');
  content = content.replace(/Admins\n\s*<\/h3>/g, 'Signers\n            </h3>');

  // Remove Managers section
  content = content.replace(/\s*<!-- Managers -->[\s\S]*?<\/div>\n      <\/div>\n\n      <div class="space-y-2">/, '\n      </div>\n\n      <div class="space-y-2">');

  fs.writeFileSync(p, content);
}

function refactorManage() {
  const p = 'frontend/src/features/studio/components/ManageGovernancePanel.vue';
  let content = fs.readFileSync(p, 'utf8');

  // Replace variables
  content = content.replace(/manageForm\.admins/g, 'manageForm.signers');
  content = content.replace(/manageForm\.adminThreshold/g, 'manageForm.threshold');
  content = content.replace(/validManageAdmins/g, 'validManageSigners');
  content = content.replace(/manageBusy\.admins/g, 'manageBusy.signers');
  content = content.replace(/setAdminsByAddress/g, 'setSignersByAddress');
  content = content.replace(/manage-admin-/g, 'manage-signer-');
  content = content.replace(/\(admin,/g, '(signer,');
  content = content.replace(/Update Admins/g, 'Update Signers');
  content = content.replace('Admin Set</h3>', 'Signer Set</h3>');
  content = content.replace('<!-- Update Admins -->', '<!-- Update Signers -->');

  // Remove variables
  content = content.replace(/\s*validManageManagers,\n/g, '\n');
  content = content.replace(/\s*setManagersByAddress,\n/g, '\n');

  // Remove Managers section
  content = content.replace(/\s*<!-- Update Managers -->[\s\S]*?<\/div>\n      <\/div>\n\n      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">/, '\n      </div>\n\n      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">');

  fs.writeFileSync(p, content);
}

refactorCreate();
refactorManage();
console.log("Refactoring complete.");
