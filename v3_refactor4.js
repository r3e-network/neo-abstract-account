const fs = require('fs');

let file = 'contracts/AbstractAccount.ExecutionAndPermissions.cs';
let content = fs.readFileSync(file, 'utf8');

// I am going to delete `ExecuteMetaTx` entirely from AbstractAccount.MetaTx.cs because we want a pure UserOp paradigm that routes to external verifiers.
// Actually, since I reverted the `MetaTx.cs` deletion earlier, I need to cleanly delete the file and remove it from the .csproj again.

// Wait, the user wants me to do an *incremental* rollout of the V3 vision since the Neo C# Compiler AST parser keeps throwing NullReferenceException on big structural swaps.

// Let's implement the 2D Nonce upgrade.
content = content.replace(/private static byte\[\] GetNonceKey\(ByteString accountId\)\s*\{\s*return Helper\.Concat\(NoncePrefix, GetStorageKey\(accountId\)\);\s*\}/g,
`private static byte[] GetNonceKey(ByteString accountId, BigInteger key)
        {
            return Helper.Concat(Helper.Concat(NoncePrefix, GetStorageKey(accountId)), (byte[])key);
        }`);

fs.writeFileSync(file, content);

file = 'contracts/AbstractAccount.MetaTx.cs';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/GetNonceForAccount\(accountId, UInt160\.Zero\)/g, 'GetNonceForAccount(accountId, 0)');
content = content.replace(/public static BigInteger GetNonce\(UInt160 signer\)\s*\{\s*return GetNonceForAccount\(\(ByteString\)signer, signer\);\s*\}/g, '');
content = content.replace(/public static BigInteger GetNonceForAccount\(ByteString accountId, UInt160 signer\)\s*\{\s*byte\[\] key = GetNonceKey\(accountId\);\s*ByteString\? data = Storage\.Get\(Storage\.CurrentContext, key\);\s*return data == null \? 0 : \(BigInteger\)data;\s*\}/g,
`public static BigInteger GetNonceForAccount(ByteString accountId, BigInteger key)
        {
            byte[] storageKey = GetNonceKey(accountId, key);
            ByteString? data = Storage.Get(Storage.CurrentContext, storageKey);
            return data == null ? 0 : (BigInteger)data;
        }`);
content = content.replace(/public static BigInteger GetNonceForAddress\(UInt160 accountAddress, UInt160 signer\)\s*\{\s*ByteString accountId = ResolveAccountIdByAddress\(accountAddress\);\s*return GetNonceForAccount\(accountId, signer\);\s*\}/g,
`public static BigInteger GetNonceForAddress(UInt160 accountAddress, BigInteger key)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetNonceForAccount(accountId, key);
        }`);
content = content.replace(/private static void IncrementNonce\(ByteString accountId\)\s*\{\s*byte\[\] key = GetNonceKey\(accountId\);\s*BigInteger current = GetNonceForAccount\(accountId, UInt160\.Zero\);\s*Storage\.Put\(Storage\.CurrentContext, key, current \+ 1\);\s*\}/g,
`private static void IncrementNonce(ByteString accountId, BigInteger key)
        {
            byte[] storageKey = GetNonceKey(accountId, key);
            BigInteger current = GetNonceForAccount(accountId, key);
            Storage.Put(Storage.CurrentContext, storageKey, current + 1);
        }`);

content = content.replace(/private static byte\[\] GetNonceKey\(ByteString accountId\)\s*\{\s*return Helper\.Concat\(NoncePrefix, GetStorageKey\(accountId\)\);\s*\}/g,
`private static byte[] GetNonceKey(ByteString accountId, BigInteger key)
        {
            return Helper.Concat(Helper.Concat(NoncePrefix, GetStorageKey(accountId)), (byte[])key);
        }`);

fs.writeFileSync(file, content);

