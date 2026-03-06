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

module.exports = {
  scriptHexToBase64,
  buildInvokeScriptQuery,
};
