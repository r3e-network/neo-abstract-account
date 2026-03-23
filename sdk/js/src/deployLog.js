const { u } = require('./neonCompat');

function decodeContractHash(byteStringBase64) {
  if (!byteStringBase64) return null;
  const hex = Buffer.from(byteStringBase64, 'base64').toString('hex');
  if (!hex) return null;
  return `0x${u.reverseHex(hex)}`;
}

function extractDeployedContractHash(appLog) {
  const execution = appLog?.executions?.[0];
  if (!execution) return null;

  const deployNotification = (execution.notifications || []).find(
    (notification) => notification?.eventname === 'Deploy'
      && Array.isArray(notification?.state?.value)
      && notification.state.value[0]?.type === 'ByteString'
  );

  if (deployNotification?.state?.value?.[0]?.value) {
    return decodeContractHash(deployNotification.state.value[0].value);
  }

  const deployedHashItem = execution.stack?.[0]?.value?.[2];
  if (deployedHashItem?.type === 'ByteString' && deployedHashItem.value) {
    return decodeContractHash(deployedHashItem.value);
  }

  return null;
}

module.exports = {
  extractDeployedContractHash,
};
