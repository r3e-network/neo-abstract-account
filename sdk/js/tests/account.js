function bindAccountHelpers({ crypto, u, wallet, sanitizeHex }) {
  function buildVerifyScript(aaHash, accountIdHex) {
    const contractHash = sanitizeHex(aaHash);
    const accountId = sanitizeHex(accountIdHex);
    const byteLength = accountId.length / 2;
    if (!Number.isInteger(byteLength) || byteLength < 0 || byteLength > 255) {
      throw new Error(`Invalid accountId hex length: ${accountId.length}`);
    }

    return [
      '0c',
      byteLength.toString(16).padStart(2, '0'),
      accountId,
      '11c01f0c06766572696679',
      '0c14',
      sanitizeHex(u.reverseHex(contractHash)),
      '41627d5b52',
    ].join('');
  }

  return {
    randomAccountIdHex(bytes = 16) {
      return crypto.randomBytes(bytes).toString('hex');
    },
    deriveAaAddressFromId(aaHash, accountIdHex) {
      const verificationScript = buildVerifyScript(aaHash, accountIdHex);
      const addressScriptHash = sanitizeHex(u.hash160(verificationScript));
      const signerScriptHash = sanitizeHex(u.reverseHex(addressScriptHash));
      return {
        verificationScript,
        addressScriptHash,
        signerScriptHash,
        address: wallet.getAddressFromScriptHash(addressScriptHash),
      };
    },
  };
}

module.exports = {
  bindAccountHelpers,
};
