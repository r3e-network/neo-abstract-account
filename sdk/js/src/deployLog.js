const { u } = require('@cityofzion/neon-js');

/**
 * Decodes a contract hash from a ByteString stack item.
 *
 * @param {string} byteStringBase64 - Base64-encoded ByteString
 * @returns {string|null} Contract hash as hex string (with 0x prefix), or null
 */
function decodeContractHash(byteStringBase64) {
  if (!byteStringBase64) return null;
  const hex = Buffer.from(byteStringBase64, 'base64').toString('hex');
  if (!hex) return null;
  return `0x${u.reverseHex(hex)}`;
}

/**
 * Extracts the deployed contract hash from an application log.
 *
 * @param {Object} appLog - Application log from RPC response
 * @returns {string|null} Contract hash as hex string (with 0x prefix), or null
 */
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
