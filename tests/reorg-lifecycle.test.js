// tests/reorg-lifecycle.test.js
// Complete reorg lifecycle tests

const test = require('node:test');
const assert = require('node:assert');
const { getSignalState, resetSignalState } = require('../src/signal/state');
const { 
  scanBlocks, 
  detectLargeTransfers, 
  detectContractCreations, 
  SIGNAL_TYPES 
} = require('../src/signal/engine');
const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, '..', '.data', 'test-signal-state.sqlite');

function cleanupTestDb() {
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
}

function createTestBlock(blockNumber, hash, transactions) {
  return {
    number: '0x' + blockNumber.toString(16),
    hash: hash,
    transactions: transactions
  };
}

test('Signal persistence: duplicate insertion is idempotent', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = {
    id: 'sig_test123',
    type: SIGNAL_TYPES.LARGE_TRANSFER,
    data: { blockNumber: 100, valueUsdc: 100, from: '0xaaa', to: '0xbbb', txHash: '0xtx1' },
    evidence: { txHash: '0xtx1', block: '0x64' },
    provenance: { chainId: 5042002, block: 100, blockHash: '0xabc', sourceTransaction: '0xtx1', from: '0xaaa', to: '0xbbb' },
    confidence: 0.8,
    version: '1.0.0',
    quality: { status: 'complete', missing: [] },
    state: 'ACTIVE'
  };
  
  state.storeSignal(signal);
  state.storeSignal(signal);
  
  const retrieved = state.getSignal('sig_test123');
  assert.ok(retrieved);
  assert.strictEqual(retrieved.signal_id, 'sig_test123');
  
  const allSignals = state.getSignalsByState('ACTIVE');
  const testSignals = allSignals.filter(s => s.signal_id === 'sig_test123');
  assert.strictEqual(testSignals.length, 1);
  
  cleanupTestDb();
});

test('Signal persistence: same signal repeated produces same ID', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal1 = {
    id: 'sig_abc123',
    type: SIGNAL_TYPES.LARGE_TRANSFER,
    data: { blockNumber: 100, valueUsdc: 100, from: '0xaaa', to: '0xbbb', txHash: '0xtx1' },
    evidence: { txHash: '0xtx1', block: 100 },
    provenance: { chainId: 5042002, block: 100, blockHash: '0xabc', sourceTransaction: '0xtx1', from: '0xaaa', to: '0xbbb' },
    confidence: 0.8,
    version: '1.0.0',
    quality: { status: 'complete', missing: [] },
    state: 'ACTIVE'
  };
  
  const signal2 = { ...signal1 };
  
  state.storeSignal(signal1);
  state.storeSignal(signal2);
  
  const retrieved = state.getSignal('sig_abc123');
  assert.ok(retrieved);
  assert.strictEqual(retrieved.signal_id, 'sig_abc123');
  
  cleanupTestDb();
});

test('Multiple signals in one block', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  const chainId = 5042002;
  
  const block = {
    number: '0x64',
    hash: '0x' + 'a'.repeat(64),
    transactions: [
      { from: '0xaaa', to: '0xbbb', value: '0x5F5E100', hash: '0xtx1' },
      { from: '0xccc', to: '0xddd', value: '0x2FAF080', hash: '0xtx2' },
    ]
  };
  
  const signals = detectLargeTransfers(block, 50);
  assert.strictEqual(signals.length, 2);
  
  for (const signal of signals) {
    signal.provenance = { chainId: 5042002, blockHash: '0xabc', sourceTransaction: signal.data.txHash, from: signal.data.from, to: signal.data.to, blockNumber: 100 };
    state.storeSignal(signal);
  }
  
  const signalsInBlock = state.getSignalsByBlockRange(5042002, 100, 100);
  assert.strictEqual(signalsInBlock.length, 2);
  
  cleanupTestDb();
});

test('Signal state transitions: ACTIVE -> INVALIDATED -> SUPERSEDED', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = {
    id: 'sig_lifecycle1',
    type: SIGNAL_TYPES.LARGE_TRANSFER,
    data: { blockNumber: 200, valueUsdc: 100, from: '0xaaa', to: '0xbbb', txHash: '0xtx1' },
    evidence: { txHash: '0xtx1', block: 200 },
    provenance: { chainId: 5042002, block: 200, blockHash: '0xabc', sourceTransaction: '0xtx1', from: '0xaaa', to: '0xbbb' },
    confidence: 0.8,
    version: '1.0.0',
    quality: { status: 'complete', missing: [] },
    state: 'ACTIVE'
  };
  
  state.storeSignal(signal);
  let retrieved = state.getSignal('sig_lifecycle1');
  assert.strictEqual(retrieved.state, 'ACTIVE');
  
  state.invalidateSignal('sig_lifecycle1', 'Test invalidation');
  retrieved = state.getSignal('sig_lifecycle1');
  assert.strictEqual(retrieved.state, 'INVALIDATED');
  assert.ok(retrieved.invalidatedReason);
  
  const replacement = { ...signal, id: 'sig_lifecycle1_replacement', state: 'ACTIVE', replacementSignalId: 'sig_lifecycle1' };
  state.storeSignal(replacement);
  state.setReplacementSignal('sig_lifecycle1', 'sig_lifecycle1_replacement');
  
  retrieved = state.getSignal('sig_lifecycle1');
  assert.strictEqual(retrieved.state, 'SUPERSEDED');
  assert.strictEqual(retrieved.replacementSignalId, 'sig_lifecycle1_replacement');
  
  cleanupTestDb();
});

test('Signal persistence survives restart', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = {
    id: 'sig_restart1',
    type: SIGNAL_TYPES.LARGE_TRANSFER,
    data: { blockNumber: 300, valueUsdc: 100, from: '0xaaa', to: '0xbbb', txHash: '0xtx1' },
    evidence: { txHash: '0xtx1', block: 300 },
    provenance: { chainId: 5042002, block: 300, blockHash: '0xabc', sourceTransaction: '0xtx1', from: '0xaaa', to: '0xbbb' },
    confidence: 0.8,
    version: '1.0.0',
    quality: { status: 'complete', missing: [] },
    state: 'ACTIVE'
  };
  
  state.storeSignal(signal);
  
  const state2 = getSignalState(TEST_DB);
  const retrieved = state2.getSignal('sig_restart1');
  
  assert.ok(retrieved);
  assert.strictEqual(retrieved.signal_id, 'sig_restart1');
  assert.strictEqual(retrieved.state, 'ACTIVE');
  assert.strictEqual(retrieved.data.valueUsdc, 100);
  
  cleanupTestDb();
});

test('Reorg detection and invalidation', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Record a block hash
  state.recordBlockHash(5042002, 100, '0x' + 'a'.repeat(64));
  
  // Check reorg with different hash
  const isReorg = state.checkReorg(5042002, 100, '0x' + 'b'.repeat(64));
  assert.strictEqual(isReorg, true);
  
  // No reorg with same hash
  const noReorg = state.checkReorg(5042002, 100, '0x' + 'a'.repeat(64));
  assert.strictEqual(noReorg, false);
  
  cleanupTestDb();
});