const { rpc, tx, wallet, sc, u } = require('@cityofzion/neon-js');
const { readContractArtifacts } = require('../src/contractArtifacts');
const { buildDeployScript, buildInvokeScriptQuery } = require('./deployHelpers');

const deployerWif = process.env.ABSTRACT_ACCOUNT_DEPLOYER_WIF
  || process.env.RELAYER_WIF
  || process.env.SPONSORED_WIF;

if (!deployerWif) {
  throw new Error('Missing deployer WIF. Set ABSTRACT_ACCOUNT_DEPLOYER_WIF (or RELAYER_WIF/SPONSORED_WIF).');
}

const account = new wallet.Account(deployerWif);
const rpcUrl = 'https://testnet1.neo.coz.io:443';
const rpcClient = new rpc.RPCClient(rpcUrl);

const { nefBase64, manifestString } = readContractArtifacts({ fromDir: __dirname });

console.log('Account Address:', account.address);
console.log('Account ScriptHash:', account.scriptHash);

async function deployContract() {
  try {
    console.log('Creating transaction...');

    const script = buildDeployScript({ sc, nefBase64, manifestString });
    const currentHeight = await rpcClient.getBlockCount();

    const transaction = new tx.Transaction({
      signers: [
        {
          account: account.scriptHash,
          scopes: tx.WitnessScope.Global,
        },
      ],
      validUntilBlock: currentHeight + 1000,
      script,
      systemFee: 0,
      networkFee: 0,
    });

    const feesRes = await rpcClient.execute(buildInvokeScriptQuery({
      rpc,
      scriptHex: script,
      accountScriptHash: account.scriptHash,
    }));

    if (feesRes && feesRes.state === 'FAULT') {
      console.error('Simulation failed:', feesRes.exception);
      return;
    }

    transaction.systemFee = u.BigInteger.fromNumber(feesRes.gasconsumed);
    console.log('System Fee:', Number(transaction.systemFee) / 100000000, 'GAS');

    transaction.networkFee = u.BigInteger.fromNumber(5000000);
    console.log('Network Fee (estimated):', Number(transaction.networkFee) / 100000000, 'GAS');

    console.log('Signing...');
    const versionRes = await rpcClient.execute(new rpc.Query({ method: 'getversion' }));
    const magic = versionRes.protocol.network;
    transaction.sign(account, magic);

    console.log('Broadcasting...');
    const result = await rpcClient.sendRawTransaction(transaction);
    console.log('Deployment TxId:', result);
  } catch (err) {
    console.error('Error deploying:', err);
  }
}

deployContract();
