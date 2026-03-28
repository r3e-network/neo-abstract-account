using System.ComponentModel;
using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        private const string ModuleTypeVerifier = "verifier";
        private const string ModuleTypeHook = "hook";

        public delegate void AccountRegisteredDelegate(UInt160 accountId, UInt160 backupOwner, UInt160 verifier, UInt160 hookId);
        public delegate void HookUpdateDelegate(UInt160 accountId, UInt160 hookId);
        public delegate void VerifierUpdateDelegate(UInt160 accountId, UInt160 verifier);
        public delegate void AccountOnlyDelegate(UInt160 accountId);
        public delegate void ModuleLifecycleDelegate(UInt160 accountId, string moduleType, UInt160 moduleHash);
        public delegate void MetadataUriUpdatedDelegate(UInt160 accountId, string metadataUri);
        public delegate void UserOpExecutedDelegate(UInt160 accountId, UInt160 targetContract, string method, BigInteger nonce);
        public delegate void EscapeInitiatedDelegate(UInt160 accountId, UInt160 backupOwner);
        public delegate void MarketEscrowEnteredDelegate(UInt160 accountId, UInt160 marketContract, BigInteger listingId);
        public delegate void MarketEscrowSettledDelegate(UInt160 accountId, UInt160 newBackupOwner);

        [DisplayName("AccountRegistered")]
        public static event AccountRegisteredDelegate? OnAccountRegistered;

        [DisplayName("ModuleInstalled")]
        public static event ModuleLifecycleDelegate? OnModuleInstalled;

        [DisplayName("ModuleUpdateInitiated")]
        public static event ModuleLifecycleDelegate? OnModuleUpdateInitiated;

        [DisplayName("ModuleUpdateConfirmed")]
        public static event ModuleLifecycleDelegate? OnModuleUpdateConfirmed;

        [DisplayName("ModuleRemoved")]
        public static event ModuleLifecycleDelegate? OnModuleRemoved;

        [DisplayName("ModuleUpdateCancelled")]
        public static event ModuleLifecycleDelegate? OnModuleUpdateCancelled;

        [DisplayName("HookUpdateConfirmed")]
        public static event HookUpdateDelegate? OnHookUpdateConfirmed;

        [DisplayName("HookUpdateInitiated")]
        public static event HookUpdateDelegate? OnHookUpdateInitiated;

        [DisplayName("VerifierUpdateConfirmed")]
        public static event VerifierUpdateDelegate? OnVerifierUpdateConfirmed;

        [DisplayName("VerifierUpdateInitiated")]
        public static event VerifierUpdateDelegate? OnVerifierUpdateInitiated;

        [DisplayName("VerifierUpdateCancelled")]
        public static event AccountOnlyDelegate? OnVerifierUpdateCancelled;

        [DisplayName("HookUpdateCancelled")]
        public static event AccountOnlyDelegate? OnHookUpdateCancelled;

        [DisplayName("MetadataUriUpdated")]
        public static event MetadataUriUpdatedDelegate? OnMetadataUriUpdated;

        [DisplayName("EscapeCancelled")]
        public static event AccountOnlyDelegate? OnEscapeCancelled;

        [DisplayName("UserOpExecuted")]
        public static event UserOpExecutedDelegate? OnUserOpExecuted;

        [DisplayName("EscapeInitiated")]
        public static event EscapeInitiatedDelegate? OnEscapeInitiated;

        [DisplayName("EscapeFinalized")]
        public static event VerifierUpdateDelegate? OnEscapeFinalized;

        [DisplayName("MarketEscrowEntered")]
        public static event MarketEscrowEnteredDelegate? OnMarketEscrowEntered;

        [DisplayName("MarketEscrowCancelled")]
        public static event AccountOnlyDelegate? OnMarketEscrowCancelled;

        [DisplayName("MarketEscrowSettled")]
        public static event MarketEscrowSettledDelegate? OnMarketEscrowSettled;
    }
}
