import code_Main from '@repo/contracts/AbstractAccount.cs?raw';
import code_AccountLifecycle from '@repo/contracts/AbstractAccount.AccountLifecycle.cs?raw';
import code_Admin from '@repo/contracts/AbstractAccount.Admin.cs?raw';
import code_ExecutionAndPermissions from '@repo/contracts/AbstractAccount.ExecutionAndPermissions.cs?raw';
import code_MetaTx from '@repo/contracts/AbstractAccount.MetaTx.cs?raw';
import code_StorageAndContext from '@repo/contracts/AbstractAccount.StorageAndContext.cs?raw';
import code_Upgrade from '@repo/contracts/AbstractAccount.Upgrade.cs?raw';

export const CONTRACT_SOURCE_FILES = [
  { name: 'AbstractAccount.cs', content: code_Main },
  { name: 'AbstractAccount.AccountLifecycle.cs', content: code_AccountLifecycle },
  { name: 'AbstractAccount.Admin.cs', content: code_Admin },
  { name: 'AbstractAccount.ExecutionAndPermissions.cs', content: code_ExecutionAndPermissions },
  { name: 'AbstractAccount.MetaTx.cs', content: code_MetaTx },
  { name: 'AbstractAccount.StorageAndContext.cs', content: code_StorageAndContext },
  { name: 'AbstractAccount.Upgrade.cs', content: code_Upgrade }
];
