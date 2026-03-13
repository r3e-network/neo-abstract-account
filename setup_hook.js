const fs = require('fs');

const files = [
    'contracts/AbstractAccount.cs',
    'contracts/AbstractAccount.StorageAndContext.cs',
    'contracts/AbstractAccount.ExecutionAndPermissions.cs',
    'contracts/AbstractAccount.Admin.cs'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // AbstractAccount.cs - Hooks
    if (file === 'contracts/AbstractAccount.cs') {
        content = content.replace(/private static readonly byte\[\] MetaTxContextPrefix = new byte\[\] \{ 0xFF \};/g, 'private static readonly byte[] MetaTxContextPrefix = new byte[] { 0xFF };\n        private static readonly byte[] HookContractPrefix = new byte[] { 0x15 };');
    }

    // AbstractAccount.StorageAndContext.cs - Hook getters
    if (file === 'contracts/AbstractAccount.StorageAndContext.cs') {
        content = content.replace(/public static UInt160 GetVerifierContract\(ByteString accountId\)\s*\{\s*StorageMap map = new StorageMap\(Storage\.CurrentContext, VerifierContractPrefix\);\s*ByteString\? data = map\.Get\(GetStorageKey\(accountId\)\);\s*if \(data == null\) return UInt160\.Zero;\s*return \(UInt160\)data;\s*\}/g, 'public static UInt160 GetVerifierContract(ByteString accountId)\n        {\n            StorageMap map = new StorageMap(Storage.CurrentContext, VerifierContractPrefix);\n            ByteString? data = map.Get(GetStorageKey(accountId));\n            if (data == null) return UInt160.Zero;\n            return (UInt160)data;\n        }\n\n        [Safe]\n        public static UInt160 GetHookContract(ByteString accountId)\n        {\n            StorageMap map = new StorageMap(Storage.CurrentContext, HookContractPrefix);\n            ByteString? data = map.Get(GetStorageKey(accountId));\n            if (data == null) return UInt160.Zero;\n            return (UInt160)data;\n        }\n\n        private static void SetHookContractInternal(ByteString accountId, UInt160 hookContract)\n        {\n            StorageMap map = new StorageMap(Storage.CurrentContext, HookContractPrefix);\n            if (hookContract == null || hookContract == UInt160.Zero)\n            {\n                map.Delete(GetStorageKey(accountId));\n            }\n            else\n            {\n                map.Put(GetStorageKey(accountId), hookContract);\n            }\n        }');
    }

    // AbstractAccount.Admin.cs - Hook Setters
    if (file === 'contracts/AbstractAccount.Admin.cs') {
        content = content.replace(/public static void SetVerifierContract\(ByteString accountId, UInt160 verifierContract\)\s*\{\s*AssertIsSigner\(accountId\);\s*SetVerifierContractInternal\(accountId, verifierContract\);\s*\}/g, 'public static void SetVerifierContract(ByteString accountId, UInt160 verifierContract)\n        {\n            AssertIsSigner(accountId);\n            SetVerifierContractInternal(accountId, verifierContract);\n        }\n\n        public static void SetHookContract(ByteString accountId, UInt160 hookContract)\n        {\n            AssertIsSigner(accountId);\n            SetHookContractInternal(accountId, hookContract);\n        }');
    }
    
    // AbstractAccount.ExecutionAndPermissions.cs - Call Hook
    if (file === 'contracts/AbstractAccount.ExecutionAndPermissions.cs') {
        content = content.replace(/private static object ExecuteNativeInternal\(ByteString accountId, UInt160 targetContract, string method, object\[\] args\)\s*\{\s*CheckPermissionsAndExecuteNative\(accountId, targetContract, method, args\);\s*EnterExecution\(accountId\);\s*SetVerifyContext\(accountId, targetContract\);\s*try\s*\{\s*OnExecute\(accountId, targetContract, method, args\);\s*return DispatchContractCall\(targetContract, method, args\);\s*\}/g, 'private static object ExecuteNativeInternal(ByteString accountId, UInt160 targetContract, string method, object[] args)\n        {\n            CheckPermissionsAndExecuteNative(accountId, targetContract, method, args);\n            \n            UInt160 hookContract = GetHookContract(accountId);\n            if (hookContract != null && hookContract != UInt160.Zero)\n            {\n                bool canProceed = (bool)Contract.Call(hookContract, "beforeExecution", CallFlags.ReadOnly, new object[] { accountId, targetContract, method, args });\n                ExecutionEngine.Assert(canProceed, "Blocked by Hook");\n            }\n            \n            EnterExecution(accountId);\n            SetVerifyContext(accountId, targetContract);\n            try\n            {\n                OnExecute(accountId, targetContract, method, args);\n                return DispatchContractCall(targetContract, method, args);\n            }');
        content = content.replace(/private static object ExecuteMetaTxInternal\(ByteString accountId, UInt160 targetContract, string method, object\[\] args\)\s*\{\s*EnterExecution\(accountId\);\s*SetVerifyContext\(accountId, targetContract\);\s*try\s*\{\s*OnExecute\(accountId, targetContract, method, args\);\s*return DispatchContractCall\(targetContract, method, args\);\s*\}/g, 'private static object ExecuteMetaTxInternal(ByteString accountId, UInt160 targetContract, string method, object[] args)\n        {\n            UInt160 hookContract = GetHookContract(accountId);\n            if (hookContract != null && hookContract != UInt160.Zero)\n            {\n                bool canProceed = (bool)Contract.Call(hookContract, "beforeExecution", CallFlags.ReadOnly, new object[] { accountId, targetContract, method, args });\n                ExecutionEngine.Assert(canProceed, "Blocked by Hook");\n            }\n            \n            EnterExecution(accountId);\n            SetVerifyContext(accountId, targetContract);\n            try\n            {\n                OnExecute(accountId, targetContract, method, args);\n                return DispatchContractCall(targetContract, method, args);\n            }');
    }

    fs.writeFileSync(file, content);
}
