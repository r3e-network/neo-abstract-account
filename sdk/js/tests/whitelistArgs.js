function bindWhitelistArgBuilders({ cpHash160, cpByteArray, cpByteArrayRaw, cpArray, sc }) {
  const selectorBuilders = {
    hash160: cpHash160,
    byteArray: cpByteArray,
    byteArrayRaw: cpByteArrayRaw,
  };

  const flagBuilders = {
    boolean: (value) => sc.ContractParam.boolean(!!value),
    integer: (value) => sc.ContractParam.integer(value ? 1 : 0),
  };

  function buildSelector(kind, value) {
    const builder = selectorBuilders[kind];
    if (!builder) {
      throw new Error(`Unsupported selector builder: ${kind}`);
    }
    return builder(value);
  }

  function buildFlag(kind, value) {
    const builder = flagBuilders[kind];
    if (!builder) {
      throw new Error(`Unsupported flag builder: ${kind}`);
    }
    return builder(value);
  }

  function finalizeArgs(args, wrapInArray = false) {
    return wrapInArray ? [cpArray(args)] : args;
  }

  function buildSetWhitelistByAddressArgs(accountAddressHash, targetContractHash, allowed, options = {}) {
    const {
      accountEncoding = 'hash160',
      targetEncoding = accountEncoding,
      flagEncoding = 'boolean',
      wrapInArray = false,
    } = options;

    return finalizeArgs([
      buildSelector(accountEncoding, accountAddressHash),
      buildSelector(targetEncoding, targetContractHash),
      buildFlag(flagEncoding, allowed),
    ], wrapInArray);
  }

  function buildSetWhitelistByAddressAlternativeBuilders(accountAddressHash, targetContractHash, allowed) {
    return [
      () => buildSetWhitelistByAddressArgs(accountAddressHash, targetContractHash, allowed, { accountEncoding: 'byteArrayRaw', targetEncoding: 'byteArrayRaw' }),
      () => buildSetWhitelistByAddressArgs(accountAddressHash, targetContractHash, allowed, { accountEncoding: 'byteArray', targetEncoding: 'byteArray' }),
      () => buildSetWhitelistByAddressArgs(accountAddressHash, targetContractHash, allowed, { flagEncoding: 'integer' }),
      () => buildSetWhitelistByAddressArgs(accountAddressHash, targetContractHash, allowed, { accountEncoding: 'byteArrayRaw', targetEncoding: 'byteArrayRaw', flagEncoding: 'integer' }),
      () => buildSetWhitelistByAddressArgs(accountAddressHash, targetContractHash, allowed, { accountEncoding: 'byteArray', targetEncoding: 'byteArray', flagEncoding: 'integer' }),
      () => buildSetWhitelistByAddressArgs(accountAddressHash, targetContractHash, allowed, { wrapInArray: true }),
      () => buildSetWhitelistByAddressArgs(accountAddressHash, targetContractHash, allowed, { accountEncoding: 'byteArrayRaw', targetEncoding: 'byteArrayRaw', wrapInArray: true }),
      () => buildSetWhitelistByAddressArgs(accountAddressHash, targetContractHash, allowed, { accountEncoding: 'byteArray', targetEncoding: 'byteArray', wrapInArray: true }),
    ];
  }

  function buildSetWhitelistModeByAddressArgs(accountAddressHash, enabled, options = {}) {
    const {
      accountEncoding = 'hash160',
      flagEncoding = 'boolean',
      wrapInArray = false,
    } = options;

    return finalizeArgs([
      buildSelector(accountEncoding, accountAddressHash),
      buildFlag(flagEncoding, enabled),
    ], wrapInArray);
  }

  function buildSetWhitelistModeByAddressAlternativeBuilders(accountAddressHash, enabled) {
    return [
      () => buildSetWhitelistModeByAddressArgs(accountAddressHash, enabled, { accountEncoding: 'byteArrayRaw' }),
      () => buildSetWhitelistModeByAddressArgs(accountAddressHash, enabled, { accountEncoding: 'byteArray' }),
      () => buildSetWhitelistModeByAddressArgs(accountAddressHash, enabled, { flagEncoding: 'integer' }),
      () => buildSetWhitelistModeByAddressArgs(accountAddressHash, enabled, { accountEncoding: 'byteArrayRaw', flagEncoding: 'integer' }),
      () => buildSetWhitelistModeByAddressArgs(accountAddressHash, enabled, { accountEncoding: 'byteArray', flagEncoding: 'integer' }),
      () => buildSetWhitelistModeByAddressArgs(accountAddressHash, enabled, { wrapInArray: true }),
      () => buildSetWhitelistModeByAddressArgs(accountAddressHash, enabled, { accountEncoding: 'byteArrayRaw', wrapInArray: true }),
      () => buildSetWhitelistModeByAddressArgs(accountAddressHash, enabled, { accountEncoding: 'byteArray', wrapInArray: true }),
    ];
  }

  function buildSetWhitelistModeByAccountIdArgs(accountIdHex, enabled, options = {}) {
    const {
      accountEncoding = 'byteArray',
      flagEncoding = 'boolean',
      wrapInArray = false,
    } = options;

    return finalizeArgs([
      buildSelector(accountEncoding, accountIdHex),
      buildFlag(flagEncoding, enabled),
    ], wrapInArray);
  }

  function buildSetWhitelistModeByAccountIdAlternativeBuilders(accountIdHex, enabled) {
    return [
      () => buildSetWhitelistModeByAccountIdArgs(accountIdHex, enabled, { accountEncoding: 'byteArrayRaw' }),
      () => buildSetWhitelistModeByAccountIdArgs(accountIdHex, enabled, { flagEncoding: 'integer' }),
      () => buildSetWhitelistModeByAccountIdArgs(accountIdHex, enabled, { wrapInArray: true }),
      () => buildSetWhitelistModeByAccountIdArgs(accountIdHex, enabled, { accountEncoding: 'byteArrayRaw', wrapInArray: true }),
    ];
  }

  return {
    buildSetWhitelistByAddressAlternativeBuilders,
    buildSetWhitelistByAddressArgs,
    buildSetWhitelistModeByAccountIdAlternativeBuilders,
    buildSetWhitelistModeByAccountIdArgs,
    buildSetWhitelistModeByAddressAlternativeBuilders,
    buildSetWhitelistModeByAddressArgs,
  };
}

module.exports = {
  bindWhitelistArgBuilders,
};
