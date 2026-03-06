function bindParamHelpers({ sc, u, sanitizeHex }) {
  return {
    cpHash160(hex) {
      return sc.ContractParam.hash160(sanitizeHex(hex));
    },
    cpByteArray(hex) {
      return sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(hex), false));
    },
    cpByteArrayRaw(hex) {
      return sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(hex), true));
    },
    cpArray(items = []) {
      return sc.ContractParam.array(...items);
    },
  };
}

module.exports = {
  bindParamHelpers,
};
