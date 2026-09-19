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
      // 1001 USDC in wei (18 decimals) = 1001 * 10^18 = 1001000000000000000000
      // = 0xde0b6b3a7640000 * 1001? No, 1001 * 10^18 = 1001000000000000000000
      // 1001 * 10^18 = 1001000000000000000000 = 0xde0b6b3a7640000 * 1001? Let's calculate:
      // 1000 * 10^18 = 1000000000000000000000 = 0x152d02c7e14af6800000
      // 1001 * 10^18 = 1001000000000000000000 = 0xde0b6b3a7640000 + 0x152d02c7e14af6800000? No.
      // 1 * 10^18 = 1000000000000000000 = 0xde0b6b3a7640000
      // So 1001 * 10^18 = 1001 * 0xde0b6b3a7640000 = 0xde0b6b3a7640000 * 1001
      // Let's just use 1001 * 10^18 in hex: 0xde0b6b3a7640000 * 1001 = ?
      // Actually simpler: 1001 * 10^18 = 1001000000000000000000 = 0xde0b6b3a7640000 * 1001
      // Let's use 2000 USDC = 2000 * 10^18 = 2000000000000000000000 = 0x1ae5d059d2b3ec000000
      // 1 USDC = 10^18 wei = 0xde0b6b3a7640000
      // 2000 USDC = 2000 * 10^18 = 0x1ae5d059d2b3ec000000
      { from: '0xa', to: '0xb', value: '0x1ae5d059d2b3ec000000', hash: '0x1' }, // 2000 USDC
      { from: '0xc', to: '0xd', value: '0x1', hash: '0x2' },
    ]
  };
  const signals = detectTokenFlowAnomaly(block, 50);
  assert.ok(signals.length === 1, 'should detect large transfer as anomaly');
  assert.ok(signals[0].type === 'token_flow_anomaly');
  assert.ok(signals[0].data.valueUsdc >= 1000); // minimum absolute is 1000 USDC per spec
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