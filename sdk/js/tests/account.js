function bindAccountHelpers({ crypto, sc, u, wallet, sanitizeHex, cpByteArray }) {
  const toByteArray = typeof cpByteArray === 'function'
    ? cpByteArray
    : (value) => sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(value), false));

  return {
    randomAccountIdHex(bytes = 16) {
      return crypto.randomBytes(bytes).toString('hex');
    },
    deriveAaAddressFromId(aaHash, accountIdHex) {
      const verificationScript = sc.createScript({
        scriptHash: aaHash,
        operation: 'verify',
        args: [toByteArray(accountIdHex)],
      });
      const addressScriptHash = sanitizeHex(u.reverseHex(u.hash160(verificationScript)));
      return {
        verificationScript,
        addressScriptHash,
        address: wallet.getAddressFromScriptHash(addressScriptHash),
      };
    },
  };
}

module.exports = {
  bindAccountHelpers,
};
