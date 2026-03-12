const { rpc, wallet } = require('@cityofzion/neon-js');

const GAS_HASH = '0xd2a4cff31913016155e38e474a2c06d08be276cf';
const NEO_HASH = '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5';
const DEFAULT_RPC_URL = 'https://testnet1.neo.coz.io:443';

function trim(value) {
  return String(value || '').trim();
}

async function main() {
  const wif = trim(process.env.TEST_WIF);
  if (!wif) throw new Error('TEST_WIF is required');

  const rpcUrl = trim(process.env.TESTNET_RPC_URL || process.env.NEO_RPC_URL || DEFAULT_RPC_URL);
  const account = new wallet.Account(wif);
  const rpcClient = new rpc.RPCClient(rpcUrl);
  const result = await rpcClient.execute(new rpc.Query({
    method: 'getnep17balances',
    params: [account.address],
  }));
  const balances = Array.isArray(result?.balance) ? result.balance : [];

  const gas = balances.find((entry) => trim(entry?.assethash).toLowerCase() === GAS_HASH);
  const neo = balances.find((entry) => trim(entry?.assethash).toLowerCase() === NEO_HASH);

  const summary = {
    rpcUrl,
    address: account.address,
    scriptHash: account.scriptHash,
    gas: gas?.amount || '0',
    neo: neo?.amount || '0',
    tokenCount: balances.length,
  };

  console.log(JSON.stringify(summary, null, 2));

  const requireGas = trim(process.env.REQUIRE_TESTNET_GAS || '1') !== '0';
  const gasValue = Number(summary.gas || '0');
  if (requireGas && !(gasValue > 0)) {
    throw new Error(`No GAS balance detected for ${account.address} on ${rpcUrl}`);
  }
}

main().catch((error) => {
  console.error('[testnet_readiness] FAILED');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
