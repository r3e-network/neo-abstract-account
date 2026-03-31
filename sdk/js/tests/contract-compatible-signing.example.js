/**
 * Example: Using the contract-compatible EIP-712 signing flow
 *
 * This demonstrates how to sign a UserOperation that will be verified
 * by the Web3AuthVerifier contract on Neo N3.
 */

const { ethers } = require('ethers');
const {
  buildContractCompatibleStructHash,
  buildContractCompatibleDomainSeparator,
  buildWeb3AuthSigningPayload,
} = require('../src/metaTx');

async function signUserOperation() {
  // 1. Create an EVM wallet (e.g., from Web3Auth)
  const evmWallet = new ethers.Wallet('YOUR_PRIVATE_KEY');
  console.log('EVM Address:', evmWallet.address);

  // 2. Define your UserOperation parameters
  const userOpParams = {
    chainId: 860833102, // Neo testnet magic
    verifierHash: '0xYOUR_VERIFIER_HASH_40_CHARS',
    accountIdHash: '0xYOUR_ACCOUNT_ID_40_CHARS',
    targetContract: '0xYOUR_TARGET_CONTRACT_40_CHARS',
    method: 'transfer',
    argsHash: '0xCOMPUTED_ARGS_HASH_64_CHARS',
    nonce: 0n,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
  };

  // 3. Compute the struct hash (matches contract's BuildMetaTxStructHash)
  const structHash = buildContractCompatibleStructHash(userOpParams);
  console.log('Struct hash:', structHash);

  // 4. Compute the domain separator (matches contract's BuildDomainSeparator)
  const domainSeparator = buildContractCompatibleDomainSeparator(
    userOpParams.chainId,
    userOpParams.verifierHash
  );
  console.log('Domain separator:', domainSeparator);

  // 5. Create the signing payload (0x1901 || domainSeparator || structHash)
  const signingPayload = buildWeb3AuthSigningPayload(userOpParams);
  console.log('Signing payload length:', signingPayload.length, 'bytes (expected: 66)');

  // 6. Sign using ethers.Wallet.signMessage
  // This applies the EIP-191 personal_sign wrapper: "\x19Ethereum Signed Message:\n" + len + payload
  const signature = evmWallet.signMessage(signingPayload);
  console.log('Signature:', signature);

  // 7. Create the final UserOperation
  const userOperation = {
    TargetContract: userOpParams.targetContract,
    Method: userOpParams.method,
    Args: [], // Your actual args here
    Nonce: userOpParams.nonce,
    Deadline: userOpParams.deadline,
    Signature: signature,
  };

  console.log('UserOperation:', userOperation);

  // 8. Submit to the contract
  // The contract will reconstruct the struct hash and verify the signature
  // using the stored EVM public key

  return userOperation;
}

// Key Differences from Standard EIP-712
console.log(`
=== Key Differences from Standard EIP-712 ===

1. Raw keccak256 of method string
   - Contract: keccak256(method_utf8_bytes)
   - Standard: keccak256(abiEncode(string))

2. Reversed bytes for accountId
   - Contract: bytes are reversed (little-endian style for 20-byte values)
   - Standard: bytes20 encoding does not reverse

3. Reversed+padding for targetContract
   - Contract: 12 zero bytes + reversed 20-byte address
   - Standard: address encoding uses padding but no reversal

4. Big-endian uint256 encoding
   - Contract: little-endian bytes are reversed to big-endian
   - Standard: uint256 is already big-endian

These differences exist because the contract was designed to
match Neo's byte order conventions, not Ethereum's.
`);

// Uncomment to run:
// signUserOperation().catch(console.error);

module.exports = { signUserOperation };
