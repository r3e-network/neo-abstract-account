function bindMetaSearchHelpers({
  invokeRead,
  cpHash160,
  cpByteArray,
  cpByteArrayRaw,
  sanitizeHex,
  decodeInteger,
  decodeByteStringToHex,
  buildPubKeyCandidates,
  buildArgsHashCandidates,
  buildTypedData,
  computeArgsHash,
  signTypedDataNoRecovery,
  buildExecuteMetaTxArgs,
}) {
  async function buildMetaExecutionVariants({
    aaHash,
    useAddress,
    accountIdHex,
    accountAddressHash,
    signerWallet,
    magic,
    method,
    methodArgs,
    methodArgsBuilder,
    methodArgsAlternativeBuilders = [],
    deadlineSeconds = 7200,
    nowSeconds = () => Math.floor(Date.now() / 1000),
    targetContract = aaHash,
  }) {
    const buildMethodArgs = typeof methodArgsBuilder === 'function'
      ? methodArgsBuilder
      : () => (Array.isArray(methodArgs) ? [...methodArgs] : []);
    const allArgsBuilders = [buildMethodArgs, ...methodArgsAlternativeBuilders.filter((fn) => typeof fn === 'function')];

    const signerAddressHex = sanitizeHex(signerWallet.address);
    const nonceRes = await invokeRead(
      aaHash,
      useAddress ? 'getNonceForAddress' : 'getNonceForAccount',
      useAddress
        ? [cpHash160(accountAddressHash), cpHash160(signerAddressHex)]
        : [cpByteArrayRaw(accountIdHex), cpHash160(signerAddressHex)]
    );
    const nonce = decodeInteger(nonceRes.stack?.[0]);

    let accountIdForSignature = sanitizeHex(accountIdHex);
    if (accountAddressHash) {
      const idByAddressRes = await invokeRead(aaHash, 'getAccountIdByAddress', [cpHash160(accountAddressHash)]);
      const resolvedRawId = decodeByteStringToHex(idByAddressRes.stack?.[0]);
      if (resolvedRawId) {
        accountIdForSignature = resolvedRawId;
      }
    }

    const deadline = nowSeconds() + deadlineSeconds;
    const pubKeyCandidates = buildPubKeyCandidates(signerWallet.signingKey.publicKey);
    const attemptedArgsHashes = [];
    const variants = [];

    for (let builderIdx = 0; builderIdx < allArgsBuilders.length; builderIdx++) {
      const currentBuilder = allArgsBuilders[builderIdx];
      const argsForCall = currentBuilder();
      const argsHashHex = await computeArgsHash(aaHash, argsForCall);
      if (!argsHashHex || argsHashHex.length !== 64) {
        throw new Error(`Invalid args hash for ${method}: ${argsHashHex}`);
      }

      const argsHashCandidates = buildArgsHashCandidates(argsHashHex);
      attemptedArgsHashes.push(...argsHashCandidates);

      for (const candidateArgsHash of argsHashCandidates) {
        const typedData = buildTypedData({
          chainId: magic,
          verifyingContract: aaHash,
          accountAddressHash,
          accountIdHex: accountIdForSignature,
          targetContract,
          method,
          argsHashHex: candidateArgsHash,
          nonce,
          deadline,
        });
        const signatureHex = await signTypedDataNoRecovery(signerWallet, typedData);

        for (const candidatePubKey of pubKeyCandidates) {
          variants.push({
            args: buildExecuteMetaTxArgs({
              useAddress,
              accountIdHex,
              accountAddressHash,
              pubKeyHexes: [candidatePubKey],
              targetContract,
              method,
              methodArgs: argsForCall,
              argsHashHex: candidateArgsHash,
              nonce,
              deadline,
              signatureHexes: [signatureHex],
            }),
            argsHashHex: candidateArgsHash,
            argsVariant: builderIdx,
            pubKeyHex: candidatePubKey,
            nonce,
            deadline,
            signerAddressHex,
            accountIdForSignature,
            signatureHex,
          });
        }
      }
    }

    return {
      attemptedArgsHashes,
      variants,
    };
  }

  return {
    buildMetaExecutionVariants,
  };
}

module.exports = {
  bindMetaSearchHelpers,
};
