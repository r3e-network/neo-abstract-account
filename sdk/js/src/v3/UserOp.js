const { ethers } = require('ethers');

// Helper to build V3 UserOperation payload for Neo N3 Smart Contract Execution
function buildV3UserOp({ targetContract, method, args, nonce, deadline }) {
  return {
    TargetContract: targetContract,
    Method: method,
    Args: args,
    Nonce: nonce,
    Deadline: deadline,
    Signature: ""
  };
}

function buildEIP712PayloadForWeb3AuthVerifier({ chainId, verifierHash, accountId, userOp }) {
  // Matches the Web3AuthVerifier struct hashing logic
  const domain = {
    name: "Neo N3 Abstract Account",
    version: "1",
    chainId: chainId,
    verifyingContract: verifierHash,
  };

  const types = {
    UserOperation: [
      { name: 'accountId', type: 'bytes20' }, // Actually UInt160 length, so 20 bytes
      { name: 'targetContract', type: 'address' },
      { name: 'method', type: 'string' },
      { name: 'argsHash', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
    ],
  };

  // Mock args hash - in reality this would serialize the Neo args array and keccak256 it
  const argsHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(userOp.Args)));

  const message = {
    accountId: `0x${accountId}`,
    targetContract: `0x${userOp.TargetContract}`,
    method: userOp.Method,
    argsHash: argsHash,
    nonce: userOp.Nonce,
    deadline: userOp.Deadline
  };

  return { domain, types, message };
}

module.exports = {
  buildV3UserOp,
  buildEIP712PayloadForWeb3AuthVerifier
};
