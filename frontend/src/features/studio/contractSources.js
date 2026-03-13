import code_UnifiedSmartWallet from '@repo/contracts/UnifiedSmartWallet.cs?raw';
import code_Web3AuthVerifier from '@repo/contracts/verifiers/Web3AuthVerifier.cs?raw';
import code_TEEVerifier from '@repo/contracts/verifiers/TEEVerifier.cs?raw';
import code_SessionKeyVerifier from '@repo/contracts/verifiers/SessionKeyVerifier.cs?raw';
import code_WebAuthnVerifier from '@repo/contracts/verifiers/WebAuthnVerifier.cs?raw';
import code_ZKEmailVerifier from '@repo/contracts/verifiers/ZKEmailVerifier.cs?raw';
import code_MultiSigVerifier from '@repo/contracts/verifiers/MultiSigVerifier.cs?raw';
import code_SubscriptionVerifier from '@repo/contracts/verifiers/SubscriptionVerifier.cs?raw';
import code_MultiHook from '@repo/contracts/hooks/MultiHook.cs?raw';
import code_DailyLimitHook from '@repo/contracts/hooks/DailyLimitHook.cs?raw';
import code_WhitelistHook from '@repo/contracts/hooks/WhitelistHook.cs?raw';
import code_TokenRestrictedHook from '@repo/contracts/hooks/TokenRestrictedHook.cs?raw';
import code_NeoDIDCredentialHook from '@repo/contracts/hooks/NeoDIDCredentialHook.cs?raw';

export const CONTRACT_SOURCE_FILES = [
  { name: 'UnifiedSmartWallet.cs', content: code_UnifiedSmartWallet },
  { name: 'verifiers/Web3AuthVerifier.cs', content: code_Web3AuthVerifier },
  { name: 'verifiers/TEEVerifier.cs', content: code_TEEVerifier },
  { name: 'verifiers/SessionKeyVerifier.cs', content: code_SessionKeyVerifier },
  { name: 'verifiers/WebAuthnVerifier.cs', content: code_WebAuthnVerifier },
  { name: 'verifiers/ZKEmailVerifier.cs', content: code_ZKEmailVerifier },
  { name: 'verifiers/MultiSigVerifier.cs', content: code_MultiSigVerifier },
  { name: 'verifiers/SubscriptionVerifier.cs', content: code_SubscriptionVerifier },
  { name: 'hooks/MultiHook.cs', content: code_MultiHook },
  { name: 'hooks/DailyLimitHook.cs', content: code_DailyLimitHook },
  { name: 'hooks/WhitelistHook.cs', content: code_WhitelistHook },
  { name: 'hooks/TokenRestrictedHook.cs', content: code_TokenRestrictedHook },
  { name: 'hooks/NeoDIDCredentialHook.cs', content: code_NeoDIDCredentialHook }
];