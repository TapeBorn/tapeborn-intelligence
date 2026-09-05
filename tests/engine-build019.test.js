// tests/engine-build019.test.js
// BUILD_019: Signal Expansion tests

const test = require('node:test');
const assert = require('node:assert');
const {
  detectContractInteractions,
  detectWalletBurst,
  detectTokenFlowAnomaly,
  detectAddressReactivation,
  createSignal
} = require('../src/signal/engine');

test('BUILD_019: detectContractInteractions returns signals for contract calls with data', () => {
  const block = {
    number: '0x12345',
    transactions: [
      { from: '0xa', to: '0xcontract', hash: '0x1', input: '0x123456' },
      { from: '0xb', to: '0xc', hash: '0x2', input: '0x' },
    ]
  };
  const signals = detectContractInteractions(block);
  assert.ok(signals.length === 1, 'should detect one contract interaction');
  assert.ok(signals[0].type === 'contract_interaction');
  assert.ok(signals[0].data.inputLength > 4);
});

test('BUILD_019: detectContractInteractions ignores empty input', () => {
  const block = {
    number: '0x12345',
    transactions: [
      { from: '0xa', to: '0xcontract', hash: '0x1', input: '0x' },
    ]
  };
  const signals = detectContractInteractions(block);
  assert.ok(signals.length === 0, 'should not detect empty input');
});

test('BUILD_019: detectWalletBurst returns signals for frequent sender', () => {
  const block = {
    number: '0x12345',
    transactions: [
      { from: '0xaaa', to: '0x1', hash: '0x1' },
      { from: '0xaaa', to: '0x2', hash: '0x2' },
      { from: '0xaaa', to: '0x3', hash: '0x3' },
      { from: '0xaaa', to: '0x4', hash: '0x4' },
      { from: '0xaaa', to: '0x5', hash: '0x5' },
      { from: '0xaaa', to: '0x6', hash: '0x6' },
    ]
  };
  const signals = detectWalletBurst(block, 5);
  assert.ok(signals.length === 1, 'should detect wallet burst');
  assert.ok(signals[0].type === 'wallet_burst');
  assert.ok(signals[0].data.txCount >= 5);
});

test('BUILD_019: detectWalletBurst ignores low-frequency senders', () => {
  const block = {
    number: '0x12345',
    transactions: [
      { from: '0xaaa', to: '0x1', hash: '0x1' },
      { from: '0xbbb', to: '0x2', hash: '0x2' },
    ]
  };
  const signals = detectWalletBurst(block, 5);
  assert.ok(signals.length === 0, 'should not detect burst with low frequency');
});

test('BUILD_019: detectTokenFlowAnomaly returns signals for large transfers', () => {
  const block = {
    number: '0x12345',
    transactions: [
      { from: '0xa', to: '0xb', value: '0x56bc75e2d63100000', hash: '0x1' }, // 100 USDC
      { from: '0xc', to: '0xd', value: '0x1', hash: '0x2' },
    ]
  };
  const signals = detectTokenFlowAnomaly(block, 50);
  assert.ok(signals.length === 1, 'should detect large transfer as anomaly');
  assert.ok(signals[0].type === 'token_flow_anomaly');
  assert.ok(signals[0].data.valueUsdc >= 50);
});

test('BUILD_019: detectTokenFlowAnomaly ignores small transfers', () => {
  const block = {
    number: '0x12345',
    transactions: [
      { from: '0xc', to: '0xd', value: '0x1', hash: '0x2' },
    ]
  };
  const signals = detectTokenFlowAnomaly(block, 50);
  assert.ok(signals.length === 0, 'should not detect small transfer as anomaly');
});

test('BUILD_019: detectAddressReactivation detects reactivated address', () => {
  // This test requires the lastSeenMap to be populated; we'll simulate by calling twice.
  const block1 = {
    number: '0x1',
    transactions: [{ from: '0xaaa', hash: '0x1' }]
  };
  const block2 = {
    number: '0x200', // far ahead
    transactions: [{ from: '0xaaa', hash: '0x2' }]
  };
  // First call populates map
  detectAddressReactivation(block1, 100);
  const signals = detectAddressReactivation(block2, 100);
  assert.ok(signals.length === 1, 'should detect reactivation after 100 blocks');
  assert.ok(signals[0].type === 'address_reactivation');
  assert.ok(signals[0].data.interval > 100);
});

test('BUILD_019: detectAddressReactivation ignores active addresses', () => {
  const block1 = {
    number: '0x1',
    transactions: [{ from: '0xaaa', hash: '0x1' }]
  };
  const block2 = {
    number: '0x2',
    transactions: [{ from: '0xaaa', hash: '0x2' }]
  };
  detectAddressReactivation(block1, 100);
  const signals = detectAddressReactivation(block2, 100);
  assert.ok(signals.length === 0, 'should not detect reactivation for active address');
});