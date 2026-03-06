const CONTRACT_MANAGEMENT_HASH = '0xfffdc93764dbaddd97c48f252a53ea4643faa3fd';

function scriptHexToBase64(scriptHex) {
  return Buffer.from(scriptHex, 'hex').toString('base64');
}

function buildInvokeScriptQuery({ rpc, scriptHex, accountScriptHash }) {
  return new rpc.Query({
    method: 'invokescript',
    params: [
      scriptHexToBase64(scriptHex),
      [{ account: accountScriptHash, scopes: 'Global' }],
    ],
  });
}

function buildDeployArgs({ sc, nefByteArrayValue, manifestString }) {
  return [
    sc.ContractParam.byteArray(nefByteArrayValue),
    sc.ContractParam.string(manifestString),
    sc.ContractParam.any(null),
  ];
}

function buildDeployScript({ sc, nefBase64, manifestString }) {
  return sc.createScript({
    scriptHash: CONTRACT_MANAGEMENT_HASH,
    operation: 'deploy',
    args: buildDeployArgs({ sc, nefByteArrayValue: nefBase64, manifestString }),
  });
}

function buildSerializedDeployScript({ sc, u, nefHex, manifestString }) {
  const sb = new sc.ScriptBuilder();
  sb.emitAppCall(
    CONTRACT_MANAGEMENT_HASH.replace(/^0x/, ''),
    'deploy',
    buildDeployArgs({
      sc,
      nefByteArrayValue: u.HexString.fromHex(nefHex, true),
      manifestString,
    })
  );
  return sb.build();
}

module.exports = {
  CONTRACT_MANAGEMENT_HASH,
  buildDeployScript,
  buildInvokeScriptQuery,
  buildSerializedDeployScript,
  scriptHexToBase64,
};
