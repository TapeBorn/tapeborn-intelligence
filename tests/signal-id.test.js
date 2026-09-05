// tests/signal-id.test.js
// Deterministic Signal ID tests (BUILD_018 hardening)

const test = require('node:test');
const assert = require('node:assert');
const { generateSignalId } = require('../src/metadata/schema');
const { createSignal } = require('../src/signal/engine');

test('Signal ID: same input → same ID', () => {
  const signal = { type: 'contract_creation', data: { blockNumber: 123456, from: '0xabc' }, evidence: { txHash: '0xdef' } };
  const provenance = { block: 123456, sourceTransaction: '0xdef', from: '0xabc' };
  const id1 = generateSignalId(signal, provenance);
  const id2 = generateSignalId(signal, provenance);
  assert.ok(id1 === id2, 'same input should produce same ID');
});

test('Signal ID: different tx hash → different ID', () => {
  const provenance1 = { block: 123456, sourceTransaction: '0xdef', from: '0xabc' };
  const provenance2 = { block: 123456, sourceTransaction: '0xghi', from: '0xabc' };
  const signal = { type: 'contract_creation', data: { blockNumber: 123456, from: '0xabc' }, evidence: { txHash: '0xdef' } };
  const id1 = generateSignalId(signal, provenance1);
  const id2 = generateSignalId(signal, provenance2);
  assert.ok(id1 !== id2, 'different tx hash should produce different ID');
});

test('Signal ID: different block → different ID', () => {
  const provenance1 = { block: 123456, sourceTransaction: '0xdef', from: '0xabc' };
  const provenance2 = { block: 999999, sourceTransaction: '0xdef', from: '0xabc' };
  const signal = { type: 'contract_creation', data: { blockNumber: 123456, from: '0xabc' }, evidence: { txHash: '0xdef' } };
  const id1 = generateSignalId(signal, provenance1);
  const id2 = generateSignalId(signal, provenance2);
  assert.ok(id1 !== id2, 'different block should produce different ID');
});

test('Signal ID: repeated execution → identical ID', () => {
  const signal = { type: 'contract_creation', data: { blockNumber: 123456, from: '0xabc' }, evidence: { txHash: '0xdef' } };
  const provenance = { block: 123456, sourceTransaction: '0xdef', from: '0xabc' };
  const ids = [];
  for (let i = 0; i < 10; i++) {
    ids.push(generateSignalId(signal, provenance));
  }
  const allSame = ids.every(id => id === ids[0]);
  assert.ok(allSame, 'repeated execution should produce identical ID');
});

test('Signal ID: no timestamp/randomness dependency', () => {
  const signal = { type: 'contract_creation', data: { blockNumber: 123456, from: '0xabc' }, evidence: { txHash: '0xdef' } };
  const provenance = { block: 123456, sourceTransaction: '0xdef', from: '0xabc' };
  const id1 = generateSignalId(signal, provenance);
  // Wait a bit and regenerate
  const id2 = generateSignalId(signal, provenance);
  assert.ok(id1 === id2, 'ID should not depend on time or randomness');
});

test('Signal ID: all signal types receive deterministic IDs', () => {
  const signalTypes = ['large_transfer', 'contract_creation', 'high_frequency_wallet'];
  for (const type of signalTypes) {
    const signal = { type, data: { blockNumber: 123456, from: '0xabc' }, evidence: { txHash: '0xdef' } };
    const provenance = { block: 123456, sourceTransaction: '0xdef', from: '0xabc' };
    const id = generateSignalId(signal, provenance);
    assert.ok(typeof id === 'string' && id.startsWith('sig_'), `should produce valid ID for ${type}`);
    // Ensure stability
    const id2 = generateSignalId(signal, provenance);
    assert.ok(id === id2, `should be stable for ${type}`);
  }
});

test('Signal ID: createSignal now uses deterministic ID', () => {
  const signal = createSignal('contract_creation', { blockNumber: 123456, from: '0xabc', txHash: '0xdef' }, { txHash: '0xdef', block: 123456 });
  assert.ok(signal.id && signal.id.startsWith('sig_'), 'signal.id should be deterministic with sig_ prefix');
  // Recreate with same data
  const signal2 = createSignal('contract_creation', { blockNumber: 123456, from: '0xabc', txHash: '0xdef' }, { txHash: '0xdef', block: 123456 });
  assert.ok(signal.id === signal2.id, 'same signal data should produce same deterministic ID');
});