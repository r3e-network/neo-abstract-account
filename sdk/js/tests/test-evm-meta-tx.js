const { rpc, sc, u, tx, wallet } = require('@cityofzion/neon-js');
const { ethers } = require('ethers');

function sanitizeHex(v) {
    return String(v || '').replace(/^0x/i, '').toLowerCase();
}

const aaHash = sanitizeHex(
    process.env.AA_HASH_TESTNET
    || process.env.VITE_AA_HASH_TESTNET
    || '49c095ce04d38642e39155f5481615c58227a498'
);

async function main() {
    const rpcUrl = 'https://testnet1.neo.coz.io:443';
    const rpcClient = new rpc.RPCClient(rpcUrl);

    console.log("Checking ExecuteMetaTx with valid EVM public key...");
    
    const evmWallet = ethers.Wallet.createRandom();
    const accountId = evmWallet.signingKey.publicKey.slice(2);
    const deployerWif = process.env.TEST_WIF;
    if (!deployerWif) {
        throw new Error('Missing TEST_WIF');
    }
    const deployerAccount = new wallet.Account(deployerWif);
    
    const targetContract = aaHash;
    const method = 'getNonceForAccount';
    
    const nonce = 0;
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const argsParam = [sc.ContractParam.byteArray(u.HexString.fromHex(accountId, true)), sc.ContractParam.hash160(deployerAccount.scriptHash)];
    
    const argsScript = sc.createScript({
        scriptHash: aaHash,
        operation: 'computeArgsHash',
        args: [
            { type: 'Array', value: argsParam }
        ]
    });
    const argsRes = await rpcClient.invokeScript(u.HexString.fromHex(argsScript), []);
    const argsHash = Buffer.from(argsRes.stack[0].value, 'base64').toString('hex');
    
    const version = await rpcClient.execute(new rpc.Query({ method: 'getversion' }));
    const chainId = version?.protocol?.network;
    if (!chainId) {
        throw new Error('Unable to resolve network magic');
    }

    const domain = {
        name: 'Neo N3 Abstract Account',
        version: '1',
        chainId,
        verifyingContract: '0x' + aaHash
    };

    const types = {
        MetaTransaction: [
            { name: 'accountId', type: 'bytes' },
            { name: 'targetContract', type: 'address' },
            { name: 'methodHash', type: 'bytes32' },
            { name: 'argsHash', type: 'bytes32' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
        ]
    };

    const message = {
        accountId: '0x' + accountId,
        targetContract: '0x' + targetContract,
        methodHash: ethers.keccak256(ethers.toUtf8Bytes(method)),
        argsHash: '0x' + argsHash,
        nonce: String(nonce),
        deadline: String(deadline)
    };
    
    const signatureWithRecovery = await evmWallet.signTypedData(domain, types, message);
    const pureSignature = signatureWithRecovery.slice(2, 130);
    
    const sb = new sc.ScriptBuilder();
    sb.emitAppCall(aaHash, 'createAccount', [
        sc.ContractParam.byteArray(u.HexString.fromHex(accountId, true)),
        { type: 'Array', value: [sc.ContractParam.hash160(deployerAccount.scriptHash), sc.ContractParam.hash160(evmWallet.address.slice(2))] }, // Admins
        sc.ContractParam.integer(1), // Admin Threshold
        { type: 'Array', value: [] }, // Manager
        sc.ContractParam.integer(0) // Manager Threshold
    ]);
    
    sb.emitAppCall(aaHash, 'executeMetaTx', [
        sc.ContractParam.byteArray(u.HexString.fromHex(accountId, true)),
        sc.ContractParam.byteArray(u.HexString.fromHex(accountId, true)), // uncompressedPubKey is same as accountId for EVM
        sc.ContractParam.hash160(targetContract),
        sc.ContractParam.string(method),
        { type: 'Array', value: argsParam },
        sc.ContractParam.byteArray(u.HexString.fromHex(argsHash, true)),
        sc.ContractParam.integer(nonce),
        sc.ContractParam.integer(deadline),
        sc.ContractParam.byteArray(u.HexString.fromHex(pureSignature, true))
    ]);
    
    const execRes = await rpcClient.invokeScript(u.HexString.fromHex(sb.build()), [{ account: deployerAccount.scriptHash, scopes: tx.WitnessScope.Global }]);
    console.log(JSON.stringify(execRes, null, 2));
}

main().catch(console.error);
