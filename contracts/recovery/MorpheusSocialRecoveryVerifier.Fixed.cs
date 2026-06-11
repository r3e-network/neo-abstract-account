using System;
using System.ComponentModel;
using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace Neo.SmartContract.Examples
{
    [ManifestExtra("Author", "R3E Network")]
    [ManifestExtra("Description", "Morpheus NeoDID-powered social recovery verifier for Neo Abstract Account")]
    [ManifestExtra("Version", "1.0.0")]
    [ContractPermission("*", "*")]
    [DisplayName("SocialRecoveryVerifier")]
    public partial class SocialRecoveryVerifier : Framework.SmartContract
    {
        private const byte PREFIX_OWNER = 0x01;
        private const byte PREFIX_AA_CONTRACT = 0x02;
        private const byte PREFIX_ACCOUNT_ADDRESS = 0x03;
        private const byte PREFIX_NETWORK = 0x04;
        private const byte PREFIX_ACCOUNT_ID_TEXT = 0x05;
        private const byte PREFIX_THRESHOLD = 0x06;
        private const byte PREFIX_TIMELOCK = 0x07;
        private const byte PREFIX_MORPHEUS_VERIFIER = 0x08;
        private const byte PREFIX_RECOVERY_NONCE = 0x09;
        private const byte PREFIX_FACTORS = 0x0A;
        private const byte PREFIX_USED_ACTION = 0x0B;
        private const byte PREFIX_APPROVAL = 0x0C;
        private const byte PREFIX_MORPHEUS_ORACLE = 0x0D;
        private const byte PREFIX_PENDING = 0x0E;
        private const byte PREFIX_ORACLE_REQUEST = 0x0F;
        private const byte PREFIX_SESSION_NONCE = 0x10;
        private const byte PREFIX_ACTIVE_SESSION = 0x11;
        private const byte PREFIX_ORACLE_ACTION_REQUEST = 0x12;
        private const byte PREFIX_PENDING_NEW_OWNER = 0x13;
        private const byte PREFIX_PENDING_NONCE = 0x14;
        private const byte PREFIX_PENDING_APPROVED = 0x15;
        private const byte PREFIX_PENDING_INITIATED = 0x16;
        private const byte PREFIX_PENDING_EXECUTABLE = 0x17;
        private const byte PREFIX_PENDING_ACTIVE = 0x18;
        private const byte PREFIX_CONTRACT_ADMIN = 0xF0;

        private const int MAX_TEXT_LENGTH = 255;
        private const int MAX_ENCRYPTED_PARAMS_LENGTH = 4096;
        private const int MAX_FACTORS = 16;
        private const int FIXED_HASH_LENGTH = 32;
        private const int FIXED_SIGNATURE_LENGTH = 64;
        private const int COMPACT_TICKET_VERSION = 3;
        private const int COMPACT_ACTION_VERSION = 3;

        // ASCII("neodid-recovery-v1")
        private static readonly byte[] RECOVERY_DOMAIN = new byte[]
        {
            110, 101, 111, 100, 105, 100, 45, 114, 101, 99, 111, 118, 101, 114, 121, 45, 118, 49
        };
        private static readonly byte[] ACTION_DOMAIN = new byte[]
        {
            110, 101, 111, 100, 105, 100, 45, 97, 99, 116, 105, 111, 110, 45, 118, 49
        };

        public class PendingRecovery
        {
            public UInt160 NewOwner = UInt160.Zero;
            public BigInteger RecoveryNonce;
            public BigInteger ApprovedCount;
            public ulong InitiatedAt;
            public ulong ExecutableAt;
            public bool Active;
        }

        public class OracleRecoveryRequest
        {
            public ByteString AccountId = (ByteString)"";
            public UInt160 NewOwner = UInt160.Zero;
            public string RecoveryNonceText = string.Empty;
            public string ExpiresAtText = string.Empty;
            public string ActionId = string.Empty;
        }

        public class OracleActionRequest
        {
            public ByteString AccountId = (ByteString)"";
            public UInt160 Executor = UInt160.Zero;
            public string ActionId = string.Empty;
            public ulong ExpiresAt;
        }

        public class ActiveSession
        {
            public UInt160 Executor = UInt160.Zero;
            public string ActionId = string.Empty;
            public ByteString ActionNullifier = (ByteString)"";
            public ulong ExpiresAt;
            public bool Active;
        }

        private class CompactRecoveryTicket
        {
            public ByteString MasterNullifier = (ByteString)"";
            public ByteString ActionNullifier = (ByteString)"";
            public ByteString Signature = (ByteString)"";
        }

        private class CompactActionTicket
        {
            public ByteString ActionNullifier = (ByteString)"";
            public ByteString Signature = (ByteString)"";
        }

        public delegate void RecoverySetupHandler(ByteString accountId, UInt160 owner, BigInteger threshold, ulong timelock, int factorCount);
        public delegate void RecoveryConfigUpdatedHandler(ByteString accountId, BigInteger threshold, ulong timelock, int factorCount);
        public delegate void RecoveryTicketAcceptedHandler(ByteString accountId, UInt160 newOwner, ByteString masterNullifier, ByteString actionNullifier, BigInteger approvedCount);
        public delegate void RecoveryReadyHandler(ByteString accountId, UInt160 newOwner, BigInteger recoveryNonce, ulong executableAt);
        public delegate void RecoveryCancelledHandler(ByteString accountId, BigInteger recoveryNonce);
        public delegate void RecoveryFinalizedHandler(ByteString accountId, UInt160 oldOwner, UInt160 newOwner, BigInteger nextRecoveryNonce);
        public delegate void ActionSessionRequestedHandler(ByteString accountId, UInt160 executor, string actionId, ulong expiresAt, BigInteger requestId);
        public delegate void ActionSessionActivatedHandler(ByteString accountId, UInt160 executor, string actionId, ByteString actionNullifier, ulong expiresAt);
        public delegate void ActionSessionRevokedHandler(ByteString accountId, UInt160 executor, string actionId);

        [DisplayName("RecoverySetup")]
        public static event RecoverySetupHandler OnRecoverySetup = default!;

        [DisplayName("RecoveryConfigUpdated")]
        public static event RecoveryConfigUpdatedHandler OnRecoveryConfigUpdated = default!;

        [DisplayName("RecoveryTicketAccepted")]
        public static event RecoveryTicketAcceptedHandler OnRecoveryTicketAccepted = default!;

        [DisplayName("RecoveryReady")]
        public static event RecoveryReadyHandler OnRecoveryReady = default!;

        [DisplayName("RecoveryCancelled")]
        public static event RecoveryCancelledHandler OnRecoveryCancelled = default!;

        [DisplayName("RecoveryFinalized")]
        public static event RecoveryFinalizedHandler OnRecoveryFinalized = default!;

        [DisplayName("ActionSessionRequested")]
        public static event ActionSessionRequestedHandler OnActionSessionRequested = default!;

        [DisplayName("ActionSessionActivated")]
        public static event ActionSessionActivatedHandler OnActionSessionActivated = default!;

        [DisplayName("ActionSessionRevoked")]
        public static event ActionSessionRevokedHandler OnActionSessionRevoked = default!;

        [Safe]
        public static string Version() => "1.0.0";

        public static void _deploy(object data, bool update)
        {
            if (update) return;
            if (Storage.Get(Storage.CurrentContext, new byte[] { PREFIX_CONTRACT_ADMIN }) != null) return;
            Storage.Put(Storage.CurrentContext, new byte[] { PREFIX_CONTRACT_ADMIN }, (ByteString)(byte[])Runtime.Transaction.Sender);
        }

        [Safe]
        public static UInt160 GetContractAdmin()
        {
            ByteString? admin = Storage.Get(Storage.CurrentContext, new byte[] { PREFIX_CONTRACT_ADMIN });
            return admin is null ? UInt160.Zero : (UInt160)admin;
        }

        public static void TransferAdmin(UInt160 newAdmin)
        {
            AssertContractAdmin();
            ValidateAddress(newAdmin, "newAdmin");
            Storage.Put(Storage.CurrentContext, new byte[] { PREFIX_CONTRACT_ADMIN }, (ByteString)(byte[])newAdmin);
        }

        public static void Update(ByteString nef, string manifest)
        {
            AssertContractAdmin();
            ContractManagement.Update(nef, manifest);
        }
    }
}
