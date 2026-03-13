const fs = require('fs');
const path = require('path');

const dir = 'contracts';

function replaceInFile(file, replacements) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const {from, to} of replacements) {
        content = content.replace(from, to);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
}

replaceInFile('AbstractAccount.cs', [
    { from: /private static readonly byte\[\] AdminsPrefix = new byte\[\] \{ 0x01 \};\n\s*private static readonly byte\[\] AdminThresholdPrefix = new byte\[\] \{ 0x02 \};\n\s*private static readonly byte\[\] ManagersPrefix = new byte\[\] \{ 0x03 \};\n\s*private static readonly byte\[\] ManagerThresholdPrefix = new byte\[\] \{ 0x04 \};/g, 
      to: 'private static readonly byte[] SignersPrefix = new byte[] { 0x01 };\n        private static readonly byte[] ThresholdPrefix = new byte[] { 0x02 };' },
    { from: /private static readonly byte\[\] AdminIndexPrefix = new byte\[\] \{ 0x20 \};\n\s*private static readonly byte\[\] ManagerIndexPrefix = new byte\[\] \{ 0x21 \};/g,
      to: 'private static readonly byte[] SignerIndexPrefix = new byte[] { 0x20 };' },
    { from: /"setAdminsByAddress",\n\s*"setAdmins",\n\s*"setManagersByAddress",\n\s*"setManagers",/g,
      to: '"setSignersByAddress",\n        "setSigners",' },
    { from: /"verifyAdmin",\n\s*"verifyAdminMetaTx",/g,
      to: '"verifySigner",\n        "verifySignerMetaTx",' }
]);

replaceInFile('AbstractAccount.Admin.cs', [
    // AssertIsAdmin -> AssertIsSigner
    { from: /AssertIsAdmin/g, to: 'AssertIsSigner' },
    { from: /GetAdmins/g, to: 'GetSigners' },
    { from: /GetAdminThreshold/g, to: 'GetThreshold' },
    { from: /SetAdmins/g, to: 'SetSigners' },
    { from: /AdminsPrefix/g, to: 'SignersPrefix' },
    { from: /AdminThresholdPrefix/g, to: 'ThresholdPrefix' },
    { from: /adminsMap/g, to: 'signersMap' },
    { from: /adminThreshold/g, to: 'threshold' },
    { from: /validatedAdmins/g, to: 'validatedSigners' },
    { from: /oldAdmins/g, to: 'oldSigners' },
    { from: /admins/g, to: 'signers' },
    { from: /verifyAdmin/g, to: 'verifySigner' },
    { from: /AdminIndex/g, to: 'SignerIndex' },
    
    // Remove Manager methods completely. We'll do this by matching the method blocks.
    { from: /\/\/\/ <summary>\s*\/\/\/ Replaces the manager signer set and threshold[\s\S]*?GetManagerThresholdByAddress\(UInt160 accountAddress\)\s*\{\s*ByteString accountId = ResolveAccountIdByAddress\(accountAddress\);\s*return GetManagerThreshold\(accountId\);\s*\}/g, to: '' },
    
    // Also remove the "managers" params where they leak. (None in this file except in removed methods)
]);

replaceInFile('AbstractAccount.StorageAndContext.cs', [
    { from: /AdminsPrefix/g, to: 'SignersPrefix' },
    { from: /AdminIndexPrefix/g, to: 'SignerIndexPrefix' },
    { from: /AdminIndex/g, to: 'SignerIndex' },
    { from: /GetAccountsByAdmin/g, to: 'GetAccountsBySigner' },
    { from: /GetAccountAddressesByAdmin/g, to: 'GetAccountAddressesBySigner' },
    
    // Remove Manager index logic
    { from: /private static void AddToManagerIndex[\s\S]*?public static Neo\.SmartContract\.Framework\.List<UInt160> GetAccountAddressesByManager\(UInt160 address\)\s*\{[\s\S]*?return addresses;\s*\}/g, to: '' },
    
    // CreateAccountInternal
    { from: /private static void CreateAccountInternal\(\s*ByteString accountId,\s*Neo\.SmartContract\.Framework\.List<UInt160>\? admins,\s*int adminThreshold,\s*Neo\.SmartContract\.Framework\.List<UInt160>\? managers,\s*int managerThreshold\)/g,
      to: 'private static void CreateAccountInternal(\n            ByteString accountId,\n            Neo.SmartContract.Framework.List<UInt160>? signers,\n            int threshold)' },
      
    { from: /AssertBootstrapAuthorization\(admins, adminThreshold, managers, managerThreshold\);/g,
      to: 'AssertBootstrapAuthorization(signers, threshold);' },
      
    { from: /Neo\.SmartContract\.Framework\.List<UInt160> finalAdmins;[\s\S]*?SetAdminsInternal\(accountId, finalAdmins, finalAdminThreshold\);\s*SetManagersInternal\(accountId, managers, managerThreshold\);/g,
      to: `Neo.SmartContract.Framework.List<UInt160> finalSigners;
            if (signers == null || signers.Count == 0)
            {
                finalSigners = new Neo.SmartContract.Framework.List<UInt160>();
                finalSigners.Add(creator);
            }
            else
            {
                finalSigners = signers;
            }

            int finalThreshold = (threshold > 0 && threshold <= finalSigners.Count) ? threshold : 1;

            SetSignersInternal(accountId, finalSigners, finalThreshold);` },
            
    // AssertBootstrapAuthorization
    { from: /private static void AssertBootstrapAuthorization\(\s*Neo\.SmartContract\.Framework\.List<UInt160>\? admins,\s*int adminThreshold,\s*Neo\.SmartContract\.Framework\.List<UInt160>\? managers,\s*int managerThreshold\)\s*\{[\s\S]*?\}/g,
      to: `private static void AssertBootstrapAuthorization(
            Neo.SmartContract.Framework.List<UInt160>? signers,
            int threshold)
        {
            if (signers != null && signers.Count > 0)
            {
                bool authorized = CheckNativeSignatures(signers, threshold);
                ExecutionEngine.Assert(authorized, "Unauthorized account initialization");
            }
        }` }
]);

replaceInFile('AbstractAccount.AccountLifecycle.cs', [
    { from: /public static void CreateAccount\(ByteString accountId, Neo\.SmartContract\.Framework\.List<UInt160> admins, int adminThreshold, Neo\.SmartContract\.Framework\.List<UInt160> managers, int managerThreshold\)/g,
      to: 'public static void CreateAccount(ByteString accountId, Neo.SmartContract.Framework.List<UInt160> signers, int threshold)' },
    { from: /CreateAccountInternal\(accountId, admins, adminThreshold, managers, managerThreshold\);/g,
      to: 'CreateAccountInternal(accountId, signers, threshold);' },
      
    { from: /public static void CreateAccountWithAddress\(\s*ByteString accountId,\s*UInt160 accountAddress,\s*Neo\.SmartContract\.Framework\.List<UInt160> admins,\s*int adminThreshold,\s*Neo\.SmartContract\.Framework\.List<UInt160> managers,\s*int managerThreshold\)/g,
      to: 'public static void CreateAccountWithAddress(\n            ByteString accountId,\n            UInt160 accountAddress,\n            Neo.SmartContract.Framework.List<UInt160> signers,\n            int threshold)' },
      
    { from: /public static void CreateAccountBatch\(\s*Neo\.SmartContract\.Framework\.List<ByteString> accountIds,\s*Neo\.SmartContract\.Framework\.List<UInt160>\? admins,\s*int adminThreshold,\s*Neo\.SmartContract\.Framework\.List<UInt160>\? managers,\s*int managerThreshold\)/g,
      to: 'public static void CreateAccountBatch(\n            Neo.SmartContract.Framework.List<ByteString> accountIds,\n            Neo.SmartContract.Framework.List<UInt160>? signers,\n            int threshold)' },
      
    { from: /CreateAccountInternal\(accountIds\[i\], admins, adminThreshold, managers, managerThreshold\);/g,
      to: 'CreateAccountInternal(accountIds[i], signers, threshold);' },
      
    { from: /bool isAdmin = CheckNativeSignatures\(GetAdmins\(accountId\), GetAdminThreshold\(accountId\)\);\s*if \(isAdmin\) return true;\s*\/\/\s*Check Manager signatures \(N3 only\)[\s\S]*?bool isManager = CheckNativeSignatures\(GetManagers\(accountId\), GetManagerThreshold\(accountId\)\);\s*if \(isManager\) return true;/g,
      to: 'bool isSigner = CheckNativeSignatures(GetSigners(accountId), GetThreshold(accountId));\n                if (isSigner) return true;' },
      
    { from: /GetAdmins/g, to: 'GetSigners' },
    { from: /GetAdminThreshold/g, to: 'GetThreshold' }
]);

replaceInFile('AbstractAccount.ExecutionAndPermissions.cs', [
    { from: /bool isAdmin = false;\s*bool bypassOperationalLimits = false;[\s\S]*?if \(customVerifier != null && customVerifier != UInt160.Zero\)[\s\S]*?EnforceRestrictions\(accountId, targetContract, method, args, bypassOperationalLimits\);/g,
      to: `bool isSigner = false;
            bool bypassOperationalLimits = false;

            UInt160 customVerifier = GetVerifierContract(accountId);
            if (customVerifier != null && customVerifier != UInt160.Zero)
            {
                bool isAuthorized = (bool)Contract.Call(
                    customVerifier,
                    "verifyExecution",
                    CallFlags.ReadOnly,
                    new object[] { accountId });
                ExecutionEngine.Assert(isAuthorized, "Unauthorized by custom verifier");
                UpdateLastActiveTimestamp(accountId);
            }
            else
            {
                int threshold = GetThreshold(accountId);
                isSigner = CheckNativeSignatures(GetSigners(accountId), threshold);
                
                if (isSigner && threshold > 0)
                {
                    bypassOperationalLimits = true;
                }

                if (isSigner)
                {
                    UpdateLastActiveTimestamp(accountId);
                }
                else
                {
                    bool isDome = CheckNativeSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId));
                    ExecutionEngine.Assert(isDome, "Unauthorized");

                    BigInteger timeout = GetDomeTimeout(accountId);
                    ExecutionEngine.Assert(timeout > 0, "Dome account not configured");

                    BigInteger lastActive = GetLastActiveTimestampForAuth(accountId);
                    ExecutionEngine.Assert(Runtime.Time >= lastActive + timeout, "Dome account not active yet");
                    ExecutionEngine.Assert(IsDomeOracleUnlocked(accountId), "Dome account not unlocked by oracle");
                    UpdateLastActiveTimestamp(accountId);
                }
            }
            EnforceRestrictions(accountId, targetContract, method, args, bypassOperationalLimits);` },
            
    // For CheckPermissionsAndExecute
    { from: /bool isAdmin = false;\s*bool bypassOperationalLimits = false;[\s\S]*?UInt160 customVerifier = GetVerifierContract\(accountId\);[\s\S]*?EnforceRestrictions\(accountId, targetContract, method, args, bypassOperationalLimits\);/g,
      to: `bool isSigner = false;
            bool bypassOperationalLimits = false;

            UInt160 customVerifier = GetVerifierContract(accountId);
            if (customVerifier != null && customVerifier != UInt160.Zero)
            {
                ExecutionEngine.Assert(verifiedSigners != null && verifiedSigners.Length > 0, "Missing verified signers");
                bool isAuthorized = (bool)Contract.Call(
                    customVerifier,
                    "verifyExecutionMetaTx",
                    CallFlags.ReadOnly,
                    new object[] { accountId, verifiedSigners! });
                ExecutionEngine.Assert(isAuthorized, "Unauthorized by custom verifier");
                UpdateLastActiveTimestamp(accountId);
            }
            else
            {
                int threshold = GetThreshold(accountId);
                isSigner = CheckMixedSignatures(GetSigners(accountId), threshold, verifiedSigners);
                
                if (isSigner && threshold > 0)
                {
                    bypassOperationalLimits = true;
                }

                if (isSigner)
                {
                    UpdateLastActiveTimestamp(accountId);
                }
                else
                {
                    bool isDome = CheckMixedSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId), verifiedSigners);
                    ExecutionEngine.Assert(isDome, "Unauthorized");

                    BigInteger timeout = GetDomeTimeout(accountId);
                    ExecutionEngine.Assert(timeout > 0, "Dome account not configured");

                    BigInteger lastActive = GetLastActiveTimestampForAuth(accountId);
                    ExecutionEngine.Assert(Runtime.Time >= lastActive + timeout, "Dome account not active yet");
                    ExecutionEngine.Assert(IsDomeOracleUnlocked(accountId), "Dome account not unlocked by oracle");
                    UpdateLastActiveTimestamp(accountId);
                }
            }
            EnforceRestrictions(accountId, targetContract, method, args, bypassOperationalLimits);` }
]);

// Wait, the regex replacement for CheckPermissionsAndExecuteNative and CheckPermissionsAndExecute will collide.
// The first one is CheckPermissionsAndExecuteNative and the second is CheckPermissionsAndExecute.
// I will adjust the script to do this safely.
