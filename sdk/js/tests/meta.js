function bindMetaTxHelpers({
  buildMetaTransactionTypedData,
  invokeRead,
  cpArray,
  cpHash160,
  cpByteArray,
  cpByteArrayRaw,
  decodeByteStringToHex,
  sanitizeHex,
  reverseHex,
  sc,
}) {
  async function computeArgsHash(aaHash, args) {
    const res = await invokeRead(aaHash, 'computeArgsHash', [cpArray(args)]);
    const decoded = decodeByteStringToHex(res.stack?.[0]);
    if (!decoded) {
      throw new Error('computeArgsHash returned empty stack');
    }
    return decoded;
  }

  function buildTypedData(params) {
    return buildMetaTransactionTypedData(params);
  }

  function buildArgsHashCandidates(argsHashHex) {
    const sanitized = sanitizeHex(argsHashHex);
    const candidates = [sanitized];
    const reversedArgsHash = sanitizeHex(reverseHex(sanitized));
    if (reversedArgsHash && reversedArgsHash.length === 64 && reversedArgsHash !== sanitized) {
      candidates.push(reversedArgsHash);
    }
    return candidates;
  }

  function buildPubKeyCandidates(publicKeyHex) {
    const fullPubKey = sanitizeHex(publicKeyHex);
    if (fullPubKey.length === 130) {
      return [fullPubKey, fullPubKey.slice(2)];
    }
    if (fullPubKey.length === 128) {
      return [fullPubKey];
    }
    throw new Error(`Unsupported signer public key length: ${fullPubKey.length}`);
  }

  function buildExecuteMetaTxArgs({
    useAddress,
    accountIdHex,
    accountAddressHash,
    accountParam,
    pubKeyHexes,
    targetContract,
    method,
    methodArgs,
    argsHashHex,
    nonce,
    deadline,
    signatureHexes,
  }) {
    return [
      accountParam || (useAddress ? cpHash160(accountAddressHash) : cpByteArray(accountIdHex)),
      cpArray(pubKeyHexes.map((hex) => cpByteArrayRaw(hex))),
      cpHash160(targetContract),
      sc.ContractParam.string(method),
      cpArray(methodArgs),
      cpByteArrayRaw(argsHashHex),
      sc.ContractParam.integer(nonce),
      sc.ContractParam.integer(deadline),
      cpArray(signatureHexes.map((hex) => cpByteArrayRaw(hex))),
    ];
  }

  async function signTypedDataNoRecovery(signerWallet, typedData) {
    const signature = await signerWallet.signTypedData(typedData.domain, typedData.types, typedData.message);
    return sanitizeHex(signature).slice(0, 128);
  }

  return {
    buildArgsHashCandidates,
    buildExecuteMetaTxArgs,
    buildPubKeyCandidates,
    buildTypedData,
    computeArgsHash,
    signTypedDataNoRecovery,
  };
}

module.exports = {
  bindMetaTxHelpers,
};
