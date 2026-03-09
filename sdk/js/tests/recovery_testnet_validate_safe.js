const { runBasicRecoveryValidation } = require('./recovery_validation_common');

runBasicRecoveryValidation({
  hashEnvVar: 'SAFE_RECOVERY_HASH_TESTNET',
  label: 'Safe Recovery Verifier Test',
  buildSetupArgs: ({ account, accountId, wallet, sc }) => {
    const guardians = [new wallet.Account(), new wallet.Account(), new wallet.Account()];
    console.log('Guardians:', guardians.map((guardian) => guardian.address));
    return [
      sc.ContractParam.hash160(accountId),
      sc.ContractParam.hash160(account.scriptHash),
      sc.ContractParam.array(...guardians.map((guardian) => sc.ContractParam.publicKey(guardian.publicKey))),
      sc.ContractParam.integer(2),
      sc.ContractParam.integer(86400000),
    ];
  },
}).catch((err) => {
  console.error('[Safe Recovery Testnet Validate] FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
