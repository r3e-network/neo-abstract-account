const CONTRACT_SOURCE_DEFINITIONS = [
  { name: 'UnifiedSmartWallet.cs', loader: () => import('@repo/contracts/UnifiedSmartWallet.cs?raw') },
  { name: 'UnifiedSmartWallet.Models.cs', loader: () => import('@repo/contracts/UnifiedSmartWallet.Models.cs?raw') },
  { name: 'UnifiedSmartWallet.Internal.cs', loader: () => import('@repo/contracts/UnifiedSmartWallet.Internal.cs?raw') },
  { name: 'UnifiedSmartWallet.Accounts.cs', loader: () => import('@repo/contracts/UnifiedSmartWallet.Accounts.cs?raw') },
  { name: 'UnifiedSmartWallet.State.cs', loader: () => import('@repo/contracts/UnifiedSmartWallet.State.cs?raw') },
  { name: 'UnifiedSmartWallet.Execution.cs', loader: () => import('@repo/contracts/UnifiedSmartWallet.Execution.cs?raw') },
  { name: 'UnifiedSmartWallet.VerifyContext.cs', loader: () => import('@repo/contracts/UnifiedSmartWallet.VerifyContext.cs?raw') },
  { name: 'UnifiedSmartWallet.Escape.cs', loader: () => import('@repo/contracts/UnifiedSmartWallet.Escape.cs?raw') },
  { name: 'UnifiedSmartWallet.MarketEscrow.cs', loader: () => import('@repo/contracts/UnifiedSmartWallet.MarketEscrow.cs?raw') },
  { name: 'verifiers/Web3AuthVerifier.cs', loader: () => import('@repo/contracts/verifiers/Web3AuthVerifier.cs?raw') },
  { name: 'verifiers/TEEVerifier.cs', loader: () => import('@repo/contracts/verifiers/TEEVerifier.cs?raw') },
  { name: 'verifiers/SessionKeyVerifier.cs', loader: () => import('@repo/contracts/verifiers/SessionKeyVerifier.cs?raw') },
  { name: 'verifiers/WebAuthnVerifier.cs', loader: () => import('@repo/contracts/verifiers/WebAuthnVerifier.cs?raw') },
  { name: 'verifiers/ZKEmailVerifier.cs', loader: () => import('@repo/contracts/verifiers/ZKEmailVerifier.cs?raw') },
  { name: 'verifiers/ZkLoginVerifier.cs', loader: () => import('@repo/contracts/verifiers/ZkLoginVerifier.cs?raw') },
  { name: 'verifiers/MultiSigVerifier.cs', loader: () => import('@repo/contracts/verifiers/MultiSigVerifier.cs?raw') },
  { name: 'verifiers/SubscriptionVerifier.cs', loader: () => import('@repo/contracts/verifiers/SubscriptionVerifier.cs?raw') },
  { name: 'hooks/MultiHook.cs', loader: () => import('@repo/contracts/hooks/MultiHook.cs?raw') },
  { name: 'hooks/DailyLimitHook.cs', loader: () => import('@repo/contracts/hooks/DailyLimitHook.cs?raw') },
  { name: 'hooks/WhitelistHook.cs', loader: () => import('@repo/contracts/hooks/WhitelistHook.cs?raw') },
  { name: 'hooks/TokenRestrictedHook.cs', loader: () => import('@repo/contracts/hooks/TokenRestrictedHook.cs?raw') },
  { name: 'hooks/NeoDIDCredentialHook.cs', loader: () => import('@repo/contracts/hooks/NeoDIDCredentialHook.cs?raw') },
];

const contractSourceCache = new Map();

export async function loadContractSourceFiles() {
  return Promise.all(
    CONTRACT_SOURCE_DEFINITIONS.map(async ({ name, loader }) => {
      if (!contractSourceCache.has(name)) {
        contractSourceCache.set(
          name,
          Promise.resolve(loader()).then((module) => module?.default || module || ''),
        );
      }

      return {
        name,
        content: await contractSourceCache.get(name),
      };
    }),
  );
}
