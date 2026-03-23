import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const marketViewPath = path.resolve('src/views/AddressMarketView.vue');
const marketServicePath = path.resolve('src/services/addressMarketService.js');
const marketDocPath = path.resolve('src/assets/docs/address-market.md');
const marketContractPath = path.resolve('..', 'contracts', 'market', 'AAAddressMarket.cs');

function readUnifiedSmartWalletSource() {
  const contractsDir = path.resolve('..', 'contracts');
  const files = fs.readdirSync(contractsDir)
    .filter((name) => name.startsWith('UnifiedSmartWallet') && name.endsWith('.cs'))
    .sort();
  return files.map((name) => fs.readFileSync(path.join(contractsDir, name), 'utf8')).join('\n\n');
}

test('address market UI and docs describe trustless escrow semantics', () => {
  const view = fs.readFileSync(marketViewPath, 'utf8');
  const service = fs.readFileSync(marketServicePath, 'utf8');
  const doc = fs.readFileSync(marketDocPath, 'utf8');

  assert.match(view, /Trustless escrow for AA address transfers/);
  assert.match(view, /Create Trustless Listing/);
  assert.match(view, /Buy With Escrow/);
  assert.match(view, /Refund Pending Payment/);
  assert.match(service, /invokeMultiple/);
  assert.match(service, /settleListing/);
  assert.match(service, /refundPendingPayment/);
  assert.match(doc, /atomic chain flow/i);
  assert.match(doc, /frozen|locked/i);
});

test('AA core and market contract expose escrow transfer primitives', () => {
  const core = readUnifiedSmartWalletSource();
  const market = fs.readFileSync(marketContractPath, 'utf8');

  assert.match(core, /EnterMarketEscrow/);
  assert.match(core, /CancelMarketEscrow/);
  assert.match(core, /SettleMarketEscrow/);
  assert.match(core, /AssertNoMarketEscrow/);
  assert.match(core, /Account locked in market escrow/);

  assert.match(market, /CreateListing/);
  assert.match(market, /SettleListing/);
  assert.match(market, /RefundPendingPayment/);
  assert.match(market, /Only GAS accepted/);
});
