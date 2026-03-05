const { rpc, tx, wallet, sc, u } = require('@cityofzion/neon-js');
const fs = require('fs');
const path = require('path');

const deployerWif = process.env.ABSTRACT_ACCOUNT_DEPLOYER_WIF;

if (!deployerWif) {
  throw new Error('Missing deployer WIF. Set ABSTRACT_ACCOUNT_DEPLOYER_WIF');
}

const account = new wallet.Account(deployerWif);
const rpcUrl = 'https://mainnet1.neo.coz.io:443';
const rpcClient = new rpc.RPCClient(rpcUrl);

const nefPath = path.resolve(__dirname, '../../contracts/AbstractAccount/bin/sc/UnifiedSmartWalletV2.nef');
const manifestPath = path.resolve(__dirname, '../../contracts/AbstractAccount/bin/sc/UnifiedSmartWalletV2.manifest.json');

const nef = fs.readFileSync(nefPath);
const manifestStr = fs.readFileSync(manifestPath, 'utf8');

console.log('Account Address:', account.address);
console.log('Account ScriptHash:', account.scriptHash);

async function deployContract() {
  try {
    const contractManagementHash = "0xfffdc93764dbaddd97c48f252a53ea4643faa3fd";

    console.log("Creating transaction...");

    const script = sc.createScript({
      scriptHash: contractManagementHash,
      operation: 'deploy',
      args: [
        sc.ContractParam.byteArray(nef.toString('base64')),
        sc.ContractParam.string(manifestStr),
        sc.ContractParam.any(null)
      ]
    });

    const currentHeight = await rpcClient.getBlockCount();

    const transaction = new tx.Transaction({
      signers: [
        {
          account: account.scriptHash,
          scopes: tx.WitnessScope.Global
        }
      ],
      validUntilBlock: currentHeight + 1000,
      script: script,
      systemFee: 0,
      networkFee: 0,
    });

    // Get fees
    const b64Script = Buffer.from(script, 'hex').toString('base64');
    const feesRes = await rpcClient.execute(new rpc.Query({
       method: "invokescript",
       params: [
         b64Script, 
         [ { account: account.scriptHash, scopes: "Global" } ]
       ]
    }));

    if (feesRes && feesRes.state === 'FAULT') {
      console.error("Simulation failed:", feesRes.exception);
      return;
    }

    transaction.systemFee = u.BigInteger.fromNumber(feesRes.gasconsumed);
    console.log("System Fee:", Number(transaction.systemFee) / 100000000, "GAS");

    transaction.networkFee = await rpcClient.calculateNetworkFee(transaction);
    console.log("Network Fee (estimated):", Number(transaction.networkFee) / 100000000, "GAS");

    console.log("Signing...");
    const versionRes = await rpcClient.execute(new rpc.Query({ method: "getversion" }));
    const magic = versionRes.protocol.network;
    transaction.sign(account, magic);

    console.log("Broadcasting...");
    const result = await rpcClient.sendRawTransaction(transaction);
    console.log("Deployment TxId:", result);
    
    // Hash is derived from sender scripthash, nef checksum and contract name. Easiest way to get it is through getapplicationlog or the tx itself. Let's compute it.
    console.log("To get the contract hash, you can inspect the transaction application log after it is accepted.");
  } catch (err) {
    console.error("Error deploying:", err);
  }
}

deployContract();