using System;
using System.ComponentModel;
using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    [DisplayName("UnifiedSmartWalletV2")]
    [ManifestExtra("Author", "R3E Network")]
    [ManifestExtra("Email", "jimmy@r3e.network")]
    [ManifestExtra("Description", "A global, unified permission-controlling programmable account gateway.")]
    [ContractPermission(
        "*",
        "transfer",
        "balanceOf",
        "symbol",
        "decimals",
        "totalSupply",
        "allowance",
        "approve",
        "getNonce",
        "getNonceForAccount",
        "getNonceForAddress",
        "setWhitelistByAddress",
        "setWhitelistModeByAddress",
        "setWhitelist",
        "setWhitelistMode",
        "setBlacklistByAddress",
        "setBlacklist",
        "setMaxTransferByAddress",
        "setMaxTransfer",
        "setAdminsByAddress",
        "setAdmins",
        "setManagersByAddress",
        "setManagers",
        "bindAccountAddress",
        "setDomeAccountsByAddress",
        "setDomeAccounts",
        "setDomeOracleByAddress",
        "setDomeOracle",
        "setVerifierContractByAddress",
        "setVerifierContract",
        "verify",
        "requestDomeActivationByAddress",
        "requestDomeActivation",
        "domeActivationCallback")]
    /// <summary>
    /// Global abstract-account gateway for Neo N3.
    /// </summary>
    /// <remarks>
    /// This contract stores per-account roles and policies under a logical <c>accountId</c>, optionally binds that
    /// account to a deterministic verify-proxy address, and routes every outbound call through one of two guarded
    /// execution paths: native Neo witnesses or EIP-712 meta-transactions. The implementation is split across partial
    /// files so each concern can be read independently: lifecycle, storage/context, execution, meta-tx, admin, oracle,
    /// and upgrade.
    /// </remarks>
    public partial class UnifiedSmartWallet : SmartContract
    {
        private static readonly byte[] DeployerKey = new byte[] { 0x00 };

        // Each prefix isolates one slice of per-account state. Prefixes are always combined with the canonical
        // storage key produced by GetStorageKey(accountId), which lets new deployments use stable key formats while
        // still resolving legacy accounts created before the canonical-key migration.
        private static readonly byte[] AdminsPrefix = new byte[] { 0x01 };
        private static readonly byte[] AdminThresholdPrefix = new byte[] { 0x02 };
        private static readonly byte[] ManagersPrefix = new byte[] { 0x03 };
        private static readonly byte[] ManagerThresholdPrefix = new byte[] { 0x04 };
        private static readonly byte[] WhitelistEnabledPrefix = new byte[] { 0x05 };
        private static readonly byte[] WhitelistPrefix = new byte[] { 0x06 };
        private static readonly byte[] BlacklistPrefix = new byte[] { 0x07 };
        private static readonly byte[] MaxTransferPrefix = new byte[] { 0x08 };
        private static readonly byte[] NoncePrefix = new byte[] { 0x09 };
        private static readonly byte[] VerifyContextPrefix = new byte[] { 0x0A };
        private static readonly byte[] AccountAddressToIdPrefix = new byte[] { 0x0B };
        private static readonly byte[] AccountIdToAddressPrefix = new byte[] { 0x0C };
        private static readonly byte[] ExecutionLockPrefix = new byte[] { 0x0D };
        private static readonly byte[] DomePrefix = new byte[] { 0x0E };
        private static readonly byte[] DomeThresholdPrefix = new byte[] { 0x0F };
        private static readonly byte[] DomeTimeoutPrefix = new byte[] { 0x10 };
        private static readonly byte[] LastActivePrefix = new byte[] { 0x11 };
        private static readonly byte[] VerifierContractPrefix = new byte[] { 0x12 };
        private static readonly byte[] ContractHashKey = new byte[] { 0x13 };
        private static readonly byte[] AdminIndexPrefix = new byte[] { 0x20 };
        private static readonly byte[] ManagerIndexPrefix = new byte[] { 0x21 };
        private static readonly byte[] GlobalExecutionLockKey = new byte[] { 0x14 };
        private static readonly byte[] MetaTxContextPrefix = new byte[] { 0xFF };

        // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
        private static readonly byte[] Eip712DomainTypeHash = new byte[]
        {
            0x8b, 0x73, 0xc3, 0xc6, 0x9b, 0xb8, 0xfe, 0x3d,
            0x51, 0x2e, 0xcc, 0x4c, 0xf7, 0x59, 0xcc, 0x79,
            0x23, 0x9f, 0x7b, 0x17, 0x9b, 0x0f, 0xfa, 0xca,
            0xa9, 0xa7, 0x5d, 0x52, 0x2b, 0x39, 0x40, 0x0f
        };

        // keccak256("Neo N3 Abstract Account")
        private static readonly byte[] Eip712NameHash = new byte[]
        {
            0x2e, 0x3d, 0x38, 0xea, 0x00, 0x55, 0xad, 0x99,
            0xb5, 0x57, 0x2e, 0x06, 0x66, 0x58, 0x43, 0x1f,
            0xf4, 0xc4, 0x0d, 0xba, 0xf3, 0xe1, 0x6e, 0x21,
            0x54, 0x63, 0x9d, 0xc6, 0xe2, 0x63, 0x48, 0x03
        };

        // keccak256("1")
        private static readonly byte[] Eip712VersionHash = new byte[]
        {
            0xc8, 0x9e, 0xfd, 0xaa, 0x54, 0xc0, 0xf2, 0x0c,
            0x7a, 0xdf, 0x61, 0x28, 0x82, 0xdf, 0x09, 0x50,
            0xf5, 0xa9, 0x51, 0x63, 0x7e, 0x03, 0x07, 0xcd,
            0xcb, 0x4c, 0x67, 0x2f, 0x29, 0x8b, 0x8b, 0xc6
        };

        // keccak256("MetaTransaction(bytes accountId,address targetContract,bytes32 methodHash,bytes32 argsHash,uint256 nonce,uint256 deadline)")
        private static readonly byte[] MetaTxTypeHash = new byte[]
        {
            0x10, 0xb8, 0xe9, 0xbd, 0x4b, 0x56, 0xf9, 0x22,
            0x33, 0xc6, 0x25, 0xdf, 0x47, 0xa4, 0xe8, 0x8a,
            0x4e, 0xee, 0xf4, 0x90, 0xa0, 0x1d, 0x3c, 0x1a,
            0xbd, 0x22, 0x1a, 0xcf, 0xdf, 0x51, 0x90, 0xb8
        };

        public delegate void OnExecuteEvent(ByteString accountId, UInt160 target, string method, object[] args);
        [DisplayName("Execute")]
        public static event OnExecuteEvent OnExecute = default!;

        public delegate void OnAccountCreatedEvent(ByteString accountId, UInt160 creator);
        [DisplayName("AccountCreated")]
        public static event OnAccountCreatedEvent OnAccountCreated = default!;

        public delegate void OnRoleUpdatedEvent(ByteString accountId, string role, Neo.SmartContract.Framework.List<UInt160> members, int threshold);
        [DisplayName("RoleUpdated")]
        public static event OnRoleUpdatedEvent OnRoleUpdated = default!;

        public delegate void OnPolicyUpdatedEvent(ByteString accountId, string policyType, UInt160 target, ByteString value);
        [DisplayName("PolicyUpdated")]
        public static event OnPolicyUpdatedEvent OnPolicyUpdated = default!;

        /// <summary>
        /// Stores the executing contract hash for deterministic proxy-script generation and records the original
        /// deployer on first deployment so upgrades can later be restricted to that address.
        /// </summary>
        public static void _deploy(object data, bool update)
        {
            Storage.Put(Storage.CurrentContext, ContractHashKey, Runtime.ExecutingScriptHash);
            if (update) return;
            var tx = (Transaction)Runtime.Transaction;
            Storage.Put(Storage.CurrentContext, DeployerKey, tx.Sender);
        }

        /// <summary>
        /// Rejects direct token pushes. Assets should move only through explicit AA-controlled execution paths so
        /// policy checks and accounting remain visible.
        /// </summary>
        public static void OnNEP17Payment(UInt160 from, BigInteger amount, object data)
        {
            ExecutionEngine.Abort();
        }

        /// <summary>
        /// Rejects direct NFT pushes for the same reason as NEP-17 payments: the account should only mutate through
        /// guarded entrypoints such as Execute, ExecuteByAddress, ExecuteMetaTx, or ExecuteMetaTxByAddress.
        /// </summary>
        public static void OnNEP11Payment(UInt160 from, BigInteger amount, ByteString tokenId, object data)
        {
            ExecutionEngine.Abort();
        }
    }
}
