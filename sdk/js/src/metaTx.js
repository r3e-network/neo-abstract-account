const { ethers } = require('ethers');

function sanitizeHex(value) {
  return String(value || '').replace(/^0x/i, '').toLowerCase();
}

function decodeByteStringStackHex(item) {
  if (!item || item.type !== 'ByteString' || !item.value) return '';
  return Buffer.from(item.value, 'base64').toString('hex').toLowerCase();
}

function buildMetaTransactionTypedData({
  chainId,
  verifyingContract,
  accountIdHex,
  targetContract,
  method,
  argsHashHex,
  nonce,
  deadline,
}) {
  return {
    domain: {
      name: 'Neo N3 Abstract Account',
      version: '1',
      chainId,
      verifyingContract: `0x${sanitizeHex(verifyingContract)}`,
    },
    types: {
      MetaTransaction: [
        { name: 'accountId', type: 'bytes' },
        { name: 'targetContract', type: 'address' },
        { name: 'methodHash', type: 'bytes32' },
        { name: 'argsHash', type: 'bytes32' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    message: {
      accountId: `0x${sanitizeHex(accountIdHex)}`,
      targetContract: `0x${sanitizeHex(targetContract)}`,
      methodHash: ethers.keccak256(ethers.toUtf8Bytes(String(method))),
      argsHash: `0x${sanitizeHex(argsHashHex)}`,
      nonce: String(nonce),
      deadline: String(deadline),
    },
  };
}

module.exports = {
  sanitizeHex,
  decodeByteStringStackHex,
  buildMetaTransactionTypedData,
};
