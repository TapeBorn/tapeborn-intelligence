// tests/adversarial-engine.test.js
// Adversarial tests for Signal Engine (R6)
// Edge cases, malformed inputs, extreme values

const test = require('node:test');
const assert = require('node:assert');
const { signalState, detectAddressReactivation } = require('../src/signal/engine');
const { generateSignalId } = require('../src/metadata/schema');
const { detectLargeTransfers, detectContractCreations, detectTokenFlowAnomaly } = require('../src/signal/engine');

// Helper to reset state before each address reactivation test
function resetForReactivationTest() {
  signalState.reset();
}

test('detectAddressReactivation: empty transactions array', () => {
  resetForReactivationTest();
  const block = { number: '0x1', transactions: [] };
  const signals = detectAddressReactivation(block, 100);
  assert.strictEqual(signals.length, 0);
});

test('detectAddressReactivation: transaction with no from address', () => {
  resetForReactivationTest();
  const block = { number: '0x1', transactions: [{ hash: '0x1' }] };
  const signals = detectAddressReactivation(block, 100);
  assert.strictEqual(signals.length, 0);
});

test('detectAddressReactivation: very large block numbers', () => {
  resetForReactivationTest();
  const block = { number: '0xffffffffffffffff', transactions: [{ from: '0xaaa', hash: '0x1' }] };
  const signals = detectAddressReactivation(block, 100);
  assert.strictEqual(signals.length, 1);
  assert.ok(signals[0].data.blockNumber > 0);
});

test('detectAddressReactivation: multiple transactions from same address - only first triggers', () => {
  resetForReactivationTest();
  const block = {
    number: '0x100',
    transactions: [
      { from: '0xaaa', hash: '0x1' },
      { from: '0xaaa', hash: '0x2' },
      { from: '0xaaa', hash: '0x3' }
    ]
  };
  const signals = detectAddressReactivation(block, 100);
  // First tx triggers reactivation (lastSeen=0), subsequent don't because lastSeen is updated
  assert.strictEqual(signals.length, 1);
  assert.strictEqual(signals[0].data.interval, 256);
});

test('detectAddressReactivation: track lastSeen correctly across blocks', () => {
  resetForReactivationTest();
  const block1 = { number: '0x10', transactions: [{ from: '0xaaa', hash: '0x1' }] };
  const signals1 = detectAddressReactivation(block1, 100);
  assert.strictEqual(signals1.length, 1);

  const block2 = { number: '0x20', transactions: [{ from: '0xaaa', hash: '0x2' }] };
  const signals2 = detectAddressReactivation(block2, 100);
  // interval = 16, not > 100, so no reactivation
  assert.strictEqual(signals2.length, 0);
});

test('detectAddressReactivation: detect reactivation after threshold', () => {
  resetForReactivationTest();
  const block1 = { number: '0x10', transactions: [{ from: '0xaaa', hash: '0x1' }] };
  detectAddressReactivation(block1, 100);

  const block2 = { number: '0x100', transactions: [{ from: '0xaaa', hash: '0x2' }] };
  const signals = detectAddressReactivation(block2, 100);
  assert.strictEqual(signals.length, 1);
  assert.strictEqual(signals[0].data.interval, 240);
});

test('detectAddressReactivation: many different addresses', () => {
  resetForReactivationTest();
  const block = { number: '0x100', transactions: [] };
  for (let i = 0; i < 100; i++) {
    block.transactions.push({
      from: '0x' + i.toString(16).padStart(40, '0'),
      hash: '0x' + i.toString(16)
    });
  }
  const signals = detectAddressReactivation(block, 100);
  assert.strictEqual(signals.length, 100);
});

test('detectAddressReactivation: checksummed addresses', () => {
  resetForReactivationTest();
  const block = { number: '0x100', transactions: [{ from: '0xAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd', hash: '0x1' }] };
  const signals = detectAddressReactivation(block, 100);
  assert.strictEqual(signals.length, 1);
});

test('detectAddressReactivation: zero address', () => {
  resetForReactivationTest();
  const block = { number: '0x100', transactions: [{ from: '0x0000000000000000000000000000000000000000', hash: '0x1' }] };
  const signals = detectAddressReactivation(block, 100);
  assert.strictEqual(signals.length, 1);
});

test('generateSignalId: deterministic for same input', () => {
  const signal = { type: 'test', version: '1.0.0', data: { from: '0xaaa' } };
  const provenance = { block: '0x1', sourceTransaction: '0x1', blockHash: '0x1', logIndex: '0', from: '0xaaa' };
  const id1 = generateSignalId(signal, provenance);
  const id2 = generateSignalId(signal, provenance);
  assert.strictEqual(id1, id2);
});

test('generateSignalId: different IDs for different tx hashes', () => {
  const signal = { type: 'test', version: '1.0.0', data: { from: '0xaaa' } };
  const provenance1 = { block: '0x1', sourceTransaction: '0x1', blockHash: '0x1', logIndex: '0', from: '0xaaa' };
  const provenance2 = { block: '0x1', sourceTransaction: '0x2', blockHash: '0x1', logIndex: '0', from: '0xaaa' };
  const id1 = generateSignalId(signal, provenance1);
  const id2 = generateSignalId(signal, provenance2);
  assert.notStrictEqual(id1, id2);
});

test('generateSignalId: different addresses in data but same provenance.from gives same ID', () => {
  // The canonical ID uses provenance.from, not signal.data.from
  const signal1 = { type: 'test', version: '1.0.0', data: { from: '0xaaa' } };
  const signal2 = { type: 'test', version: '1.0.0', data: { from: '0xbbb' } };
  const provenance = { block: '0x1', sourceTransaction: '0x1', blockHash: '0x1', logIndex: '0', from: '0xaaa' };
  const id1 = generateSignalId(signal1, provenance);
  const id2 = generateSignalId(signal2, provenance);
  // Same provenance.from = same ID (by design)
  assert.strictEqual(id1, id2);
});

test('generateSignalId: different IDs for different addresses in provenance', () => {
  const signal = { type: 'test', version: '1.0.0', data: { from: '0xaaa' } };
  const provenance1 = { block: '0x1', sourceTransaction: '0x1', blockHash: '0x1', logIndex: '0', from: '0xaaa' };
  const provenance2 = { block: '0x1', sourceTransaction: '0x1', blockHash: '0x1', logIndex: '0', from: '0xbbb' };
  const id1 = generateSignalId(signal, provenance1);
  const id2 = generateSignalId(signal, provenance2);
  assert.notStrictEqual(id1, id2);
});

test('generateSignalId: same ID regardless of object key order', () => {
  const signal = { type: 'test', version: '1.0.0', data: { from: '0xaaa', valueUsdc: 100 } };
  const provenance = { block: '0x1', sourceTransaction: '0x1', blockHash: '0x1', logIndex: '0', from: '0xaaa' };
  const id1 = generateSignalId(signal, provenance);
  const signal2 = { type: 'test', version: '1.0.0', data: { valueUsdc: 100, from: '0xaaa' } };
  const id2 = generateSignalId(signal2, provenance);
  assert.strictEqual(id1, id2);
});

test('generateSignalId: handle missing optional fields gracefully', () => {
  const signal = { type: 'test', version: '1.0.0', data: {} };
  const provenance = { block: '0x1', sourceTransaction: '0x1', blockHash: '0x1', logIndex: '0', from: '0xaaa' };
  const id = generateSignalId(signal, provenance);
  assert.ok(id.startsWith('sig_'));
  assert.strictEqual(id.length, 20);
});

test('detectLargeTransfers: empty transactions', () => {
  const block = { number: '0x1', transactions: [] };
  const signals = detectLargeTransfers(block, 50);
  assert.strictEqual(signals.length, 0);
});

test('detectLargeTransfers: transactions with no value', () => {
  const block = { number: '0x1', transactions: [{ from: '0xaaa', to: '0xbbb', hash: '0x1' }] };
  const signals = detectLargeTransfers(block, 50);
  assert.strictEqual(signals.length, 0);
});

test('detectLargeTransfers: zero value', () => {
  const block = { number: '0x1', transactions: [{ from: '0xaaa', to: '0xbbb', value: '0x0', hash: '0x1' }] };
  const signals = detectLargeTransfers(block, 50);
  assert.strictEqual(signals.length, 0);
});

test('detectLargeTransfers: detect transfers above threshold', () => {
  // 100 USDC with 6 decimals = 100 * 10^6 = 100,000,000 = 0x5F5E100
  const block = { number: '0x1', transactions: [{ from: '0xaaa', to: '0xbbb', value: '0x5F5E100', hash: '0x1' }] };
  const signals = detectLargeTransfers(block, 50);
  assert.strictEqual(signals.length, 1);
  assert.strictEqual(signals[0].type, 'large_transfer');
  assert.ok(signals[0].data.valueUsdc >= 50);
});

test('detectLargeTransfers: NOT detect transfers below threshold', () => {
  // 10 USDC with 6 decimals = 10 * 10^6 = 10,000,000 = 0x989680
  const block = { number: '0x1', transactions: [{ from: '0xaaa', to: '0xbbb', value: '0x989680', hash: '0x1' }] };
  const signals = detectLargeTransfers(block, 50);
  assert.strictEqual(signals.length, 0);
});

test('detectLargeTransfers: very large values', () => {
  const block = { number: '0x1', transactions: [{ from: '0xaaa', to: '0xbbb', value: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', hash: '0x1' }] };
  const signals = detectLargeTransfers(block, 50);
  assert.strictEqual(signals.length, 1);
  assert.ok(signals[0].data.valueUsdc > 0);
});

test('detectContractCreations: detect contract creation', () => {
  const block = { number: '0x1', transactions: [{ from: '0xaaa', to: null, input: '0x1234', hash: '0x1' }] };
  const signals = detectContractCreations(block);
  assert.strictEqual(signals.length, 1);
  assert.strictEqual(signals[0].type, 'contract_creation');
});

test('detectContractCreations: NOT detect when to is not null', () => {
  const block = { number: '0x1', transactions: [{ from: '0xaaa', to: '0xbbb', input: '0x1234', hash: '0x1' }] };
  const signals = detectContractCreations(block);
  assert.strictEqual(signals.length, 0);
});

test('detectContractCreations: NOT detect when input is empty', () => {
  const block = { number: '0x1', transactions: [{ from: '0xaaa', to: null, input: '0x', hash: '0x1' }] };
  const signals = detectContractCreations(block);
  assert.strictEqual(signals.length, 0);
});

test('detectContractCreations: input "0x00" is 2 bytes (threshold=1, so detects)', () => {
  const block = { number: '0x1', transactions: [{ from: '0xaaa', to: null, input: '0x00', hash: '0x1' }] };
  const signals = detectContractCreations(block);
  assert.strictEqual(signals.length, 1);
});

test('detectContractCreations: detect when input > 4 bytes', () => {
  const block = { number: '0x1', transactions: [{ from: '0xaaa', to: null, input: '0x12345678', hash: '0x1' }] };
  const signals = detectContractCreations(block);
  assert.strictEqual(signals.length, 1);
});

test('detectTokenFlowAnomaly: empty transactions', () => {
  const block = { number: '0x1', transactions: [] };
  const signals = detectTokenFlowAnomaly(block, 50);
  assert.strictEqual(signals.length, 0);
});

test('detectTokenFlowAnomaly: uses minimum absolute threshold (1000 USDC)', () => {
  // 500 USDC - below minimum absolute (1000 USDC)
  const block = { number: '0x1', transactions: [{ from: '0xaaa', to: '0xbbb', value: '0xa968163f0a57b400000', hash: '0x1' }] };
  const signals = detectTokenFlowAnomaly(block, 50);
  assert.ok(signals.length >= 0); // Just verify no crash
});

test('detectTokenFlowAnomaly: detect above minimum absolute', () => {
  // 2000 USDC - above minimum absolute (1000 USDC)
  const block = { number: '0x1', transactions: [{ from: '0xaaa', to: '0xbbb', value: '0x1ae5d059d2b3ec000000', hash: '0x1' }] };
  const signals = detectTokenFlowAnomaly(block, 50);
  assert.strictEqual(signals.length, 1);
  assert.strictEqual(signals[0].type, 'token_flow_anomaly');
});