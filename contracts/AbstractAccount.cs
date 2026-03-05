using System;
using System.ComponentModel;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    [DisplayName("UnifiedSmartWalletV2")]
    [ManifestExtra("Author", "R3E Neo Explorer")]
    [ManifestExtra("Email", "dev@neo.org")]
    [ManifestExtra("Description", "A global, unified permission-controlling abstract account gateway.")]
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
        "bindAccountAddress")]
    public partial class UnifiedSmartWallet : SmartContract
    {
        private static readonly byte[] DeployerKey = new byte[] { 0x00 };

        // Maps Prefixes
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

        public static void _deploy(object data, bool update)
        {
            if (update) return;
            var tx = (Transaction)Runtime.Transaction;
            Storage.Put(Storage.CurrentContext, DeployerKey, tx.Sender);
        }
    }
}
