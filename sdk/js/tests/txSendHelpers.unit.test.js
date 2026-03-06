const test = require('node:test');
const assert = require('node:assert/strict');

const { sendTransaction } = require('./tx');

test('sendTransaction signs twice, applies network fee, and returns txid plus network fee', async () => {
  const constructed = [];
  class FakeTransaction {
    constructor(payload) {
      this.payload = payload;
      this.signCalls = [];
      constructed.push(this);
    }
    sign(account, magic) {
      this.signCalls.push({ account, magic });
    }
  }

  const rpcClient = {
    async calculateNetworkFee(transaction) {
      assert.equal(transaction, constructed[0]);
      return 42;
    },
    async sendRawTransaction(transaction) {
      assert.equal(transaction, constructed[1]);
      return '0xabc';
    },
  };

  const result = await sendTransaction({
    rpcClient,
    txModule: { Transaction: FakeTransaction },
    account: { label: 'acct' },
    magic: 123,
    signers: [{ account: '0x01', scopes: 1 }],
    validUntilBlock: 99,
    script: 'deadbeef',
    systemFee: '1000000',
    witnesses: [{ verificationScript: 'aa' }],
  });

  assert.equal(constructed.length, 2);
  assert.equal(constructed[0].payload.networkFee, undefined);
  assert.equal(constructed[1].payload.networkFee, 42);
  assert.deepEqual(constructed[0].signCalls, [{ account: { label: 'acct' }, magic: 123 }]);
  assert.deepEqual(constructed[1].signCalls, [{ account: { label: 'acct' }, magic: 123 }]);
  assert.equal(result.txid, '0xabc');
  assert.equal(result.networkFee, '42');
});

test('sendTransaction omits empty witnesses from the transaction payload', async () => {
  const constructed = [];
  class FakeTransaction {
    constructor(payload) {
      this.payload = payload;
      constructed.push(this);
    }
    sign() {}
  }

  const rpcClient = {
    async calculateNetworkFee() {
      return 7;
    },
    async sendRawTransaction() {
      return '0xdef';
    },
  };

  await sendTransaction({
    rpcClient,
    txModule: { Transaction: FakeTransaction },
    account: {},
    magic: 1,
    signers: [],
    validUntilBlock: 10,
    script: 'bead',
    systemFee: '1',
    witnesses: [],
  });

  assert.equal('witnesses' in constructed[0].payload, false);
  assert.equal('witnesses' in constructed[1].payload, false);
});
