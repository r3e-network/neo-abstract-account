import code_Main from '@/contracts/AbstractAccount.cs?raw';
import code_AccountLifecycle from '@/contracts/AbstractAccount.AccountLifecycle.cs?raw';
import code_Admin from '@/contracts/AbstractAccount.Admin.cs?raw';
import code_ExecutionAndPermissions from '@/contracts/AbstractAccount.ExecutionAndPermissions.cs?raw';
import code_MetaTx from '@/contracts/AbstractAccount.MetaTx.cs?raw';
import code_Oracle from '@/contracts/AbstractAccount.Oracle.cs?raw';
import code_StorageAndContext from '@/contracts/AbstractAccount.StorageAndContext.cs?raw';
import code_Upgrade from '@/contracts/AbstractAccount.Upgrade.cs?raw';

export const CONTRACT_SOURCE_FILES = [
  { name: 'AbstractAccount.cs', content: code_Main },
  { name: 'AbstractAccount.AccountLifecycle.cs', content: code_AccountLifecycle },
  { name: 'AbstractAccount.Admin.cs', content: code_Admin },
  { name: 'AbstractAccount.ExecutionAndPermissions.cs', content: code_ExecutionAndPermissions },
  { name: 'AbstractAccount.MetaTx.cs', content: code_MetaTx },
  { name: 'AbstractAccount.Oracle.cs', content: code_Oracle },
  { name: 'AbstractAccount.StorageAndContext.cs', content: code_StorageAndContext },
  { name: 'AbstractAccount.Upgrade.cs', content: code_Upgrade }
];
