// tests/engine.test.js
// Tests for Signal Engine (BUILD_013)

const test = require('node:test');
const assert = require('node:assert');
const { scanBlocks, detectLargeTransfers, detectContractCreations, detectHighFrequencyWallets, CONFIG } = require('../src/signal/engine');

test('Engine: detectLargeTransfers returns signals for large values', () => {
  const block = {
    number: '0x12345',
    transactions: [
      { from: '0xa', to: '0xb', value: '0x56bc75e2d63100000', hash: '0x1' }, // 100 USDC
      { from: '0xc', to: '0xd', value: '0x1', hash: '0x2' }, // very small
    ]
  };
  const signals = detectLargeTransfers(block, 50);
  assert.ok(signals.length === 1, 'should detect one large transfer');
  assert.ok(signals[0].type === 'large_transfer');
  assert.ok(signals[0].data.valueUsdc >= 50);
});

test('Engine: detectContractCreations returns signals for to=null', () => {
  const block = {
    number: '0x12345',
    transactions: [
      { from: '0xa', to: null, hash: '0x1', input: '0x1234' },
      { from: '0xb', to: '0xc', hash: '0x2' },
    ]
  };
  const signals = detectContractCreations(block);
  assert.ok(signals.length === 1, 'should detect one contract creation');
  assert.ok(signals[0].type === 'contract_creation');
  assert.ok(signals[0].data.inputLength === 2); // 0x1234 length minus 2
});

test('Engine: detectHighFrequencyWallets returns signals for frequent wallets', () => {
  const block = {
    number: '0x12345',
    transactions: [
      { from: '0xaaa', to: '0x1', hash: '0x1' },
      { from: '0xaaa', to: '0x2', hash: '0x2' },
      { from: '0xaaa', to: '0x3', hash: '0x3' },
      { from: '0xaaa', to: '0x4', hash: '0x4' },
      { from: '0xaaa', to: '0x5', hash: '0x5' },
      { from: '0xbbb', to: '0x6', hash: '0x6' },
    ]
  };
  const signals = detectHighFrequencyWallets(block, 5);
  assert.ok(signals.length === 1, 'should detect one high-frequency wallet');
  assert.ok(signals[0].type === 'high_frequency_wallet');
  assert.ok(signals[0].data.txCount >= 5);
});

test('Engine: scanBlocks returns signals for a range', async () => {
  const latest = await require('../src/orchestrator/arc').getBlockNumber();
  const from = Math.max(0, latest - 5);
  const signals = await scanBlocks(from, latest);
  assert.ok(Array.isArray(signals), 'should return array');
  // Just verify it doesn't throw
});

test('Engine: scanBlocks handles invalid range gracefully', async () => {
  const signals = await scanBlocks(1000, 999);
  assert.ok(Array.isArray(signals) && signals.length === 0, 'should return empty array for invalid range');
});