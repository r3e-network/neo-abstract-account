const { runBasicRecoveryValidation } = require('./recovery_validation_common');

runBasicRecoveryValidation({
  hashEnvVar: 'LOOPRING_RECOVERY_HASH_TESTNET',
  label: 'Loopring Recovery Verifier Test',
  buildSetupArgs: ({ account, accountId, sc, u }) => {
    const guardiansHash = '11'.repeat(32);
    console.log('Guardians Hash:', guardiansHash);
    return [
      sc.ContractParam.hash160(accountId),
      sc.ContractParam.hash160(account.scriptHash),
      sc.ContractParam.byteArray(u.HexString.fromHex(guardiansHash, false)),
      sc.ContractParam.integer(2),
      sc.ContractParam.boolean(true),
    ];
  },
}).catch((err) => {
  console.error('[Loopring Recovery Testnet Validate] FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
