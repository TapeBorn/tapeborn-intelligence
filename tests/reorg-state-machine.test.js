// tests/reorg-state-machine.test.js
// Reorg state machine hardening tests

const test = require('node:test');
const assert = require('node:assert');
const { getSignalState, resetSignalState } = require('../src/signal/state');
const { SIGNAL_TYPES } = require('../src/signal/engine');
const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, '..', '.data', 'test-signal-state.sqlite');

function cleanupTestDb() {
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
}

function createTestSignal(id, type = SIGNAL_TYPES.LARGE_TRANSFER) {
  return {
    id,
    type,
    data: { blockNumber: 100, valueUsdc: 100, from: '0xaaa', to: '0xbbb', txHash: '0xtx1' },
    evidence: { txHash: '0xtx1', block: 100 },
    provenance: { chainId: 5042002, block: 100, blockHash: '0xabc', sourceTransaction: '0xtx1', from: '0xaaa', to: '0xbbb' },
    confidence: 0.8,
    version: '1.0.0',
    quality: { status: 'complete', missing: [] },
    state: 'ACTIVE'
  };
}

test('REORG: ACTIVE -> INVALIDATED transition allowed', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_active1');
  state.storeSignal(signal);
  
  state.invalidateSignal('sig_active1', 'REORG test');
  const retrieved = state.getSignal('sig_active1');
  
  assert.strictEqual(retrieved.state, 'INVALIDATED');
  assert.ok(retrieved.invalidatedReason);
  assert.ok(retrieved.invalidatedAt > 0);
  
  cleanupTestDb();
});

test('REORG: INVALIDATED -> SUPERSEDED transition allowed with valid replacement', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_lifecycle1');
  state.storeSignal(signal);
  state.invalidateSignal('sig_lifecycle1', 'REORG test');
  
  // Create replacement signal
  const replacement = { ...signal, id: 'sig_replacement1', state: 'ACTIVE' };
  state.storeSignal(replacement);
  
  state.setReplacementSignal('sig_lifecycle1', 'sig_replacement1');
  
  const original = state.getSignal('sig_lifecycle1');
  assert.strictEqual(original.state, 'SUPERSEDED');
  assert.strictEqual(original.replacementSignalId, 'sig_replacement1');
  
  const replacementRetrieved = state.getSignal('sig_replacement1');
  assert.strictEqual(replacementRetrieved.state, 'ACTIVE');
  
  cleanupTestDb();
});

test('REORG: INVALIDATED -> ACTIVE direct transition REJECTED', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_invalid1');
  state.storeSignal(signal);
  state.invalidateSignal('sig_invalid1', 'REORG test');
  
  // Try to directly set state back to ACTIVE via storeSignal
  const backToActive = { ...signal, state: 'ACTIVE' };
  assert.throws(() => {
    state.storeSignal(backToActive);
  }, /Cannot invalidate non-existent signal|state/);
  
  // Verify state is still INVALIDATED
  const retrieved = state.getSignal('sig_invalid1');
  assert.strictEqual(retrieved.state, 'INVALIDATED');
  
  cleanupTestDb();
});

test('REORG: SUPERSEDED -> ACTIVE direct transition REJECTED', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_superseded1');
  state.storeSignal(signal);
  state.invalidateSignal('sig_superseded1', 'REORG test');
  
  const replacement = { ...signal, id: 'sig_replacement2', state: 'ACTIVE' };
  state.storeSignal(replacement);
  state.setReplacementSignal('sig_superseded1', 'sig_replacement2');
  
  // Try to set original back to ACTIVE
  const backToActive = { ...signal, state: 'ACTIVE' };
  assert.throws(() => {
    state.storeSignal(backToActive);
  }, /Cannot invalidate non-existent signal|state/);
  
  // Verify state is still SUPERSEDED
  const retrieved = state.getSignal('sig_superseded1');
  assert.strictEqual(retrieved.state, 'SUPERSEDED');
  
  cleanupTestDb();
});

test('REORG: setReplacementSignal requires INVALIDATED state', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_active2');
  state.storeSignal(signal);
  
  // Try to supersede ACTIVE signal
  assert.throws(() => {
    state.setReplacementSignal('sig_active2', 'sig_replacement3');
  }, /Can only supersede INVALIDATED signal/);
  
  cleanupTestDb();
});

test('REORG: setReplacementSignal requires replacement_signal_id', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_invalid2');
  state.storeSignal(signal);
  state.invalidateSignal('sig_invalid2', 'REORG test');
  
  // Try to supersede without replacement ID
  assert.throws(() => {
    state.setReplacementSignal('sig_invalid2', null);
  }, /replacement_signal_id is required/);
  
  cleanupTestDb();
});

test('REORG: setReplacementSignal requires valid replacement signal', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_invalid3');
  state.storeSignal(signal);
  state.invalidateSignal('sig_invalid3', 'REORG test');
  
  // Try to supersede with non-existent replacement
  assert.throws(() => {
    state.setReplacementSignal('sig_invalid3', 'sig_nonexistent');
  }, /Replacement signal not found/);
  
  cleanupTestDb();
});

test('REORG: invalidateSignal idempotent', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_idempotent1');
  state.storeSignal(signal);
  state.invalidateSignal('sig_idempotent1', 'First invalidation');
  state.invalidateSignal('sig_idempotent1', 'Second invalidation'); // Should not throw
  
  const retrieved = state.getSignal('sig_idempotent1');
  assert.strictEqual(retrieved.state, 'INVALIDATED');
  
  cleanupTestDb();
});

test('REORG: cannot invalidate SUPERSEDED signal', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_superseded2');
  state.storeSignal(signal);
  state.invalidateSignal('sig_superseded2', 'REORG test');
  
  const replacement = { ...signal, id: 'sig_replacement4', state: 'ACTIVE' };
  state.storeSignal(replacement);
  state.setReplacementSignal('sig_superseded2', 'sig_replacement4');
  
  // Try to invalidate SUPERSEDED
  assert.throws(() => {
    state.invalidateSignal('sig_superseded2', 'Attempt to invalidate superseded');
  }, /Cannot invalidate SUPERSEDED signal/);
  
  cleanupTestDb();
});

test('REORG: duplicate invalidation after replacement fails', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_dup1');
  state.storeSignal(signal);
  state.invalidateSignal('sig_dup1', 'REORG test');
  
  const replacement = { ...signal, id: 'sig_replacement5', state: 'ACTIVE' };
  state.storeSignal(replacement);
  state.setReplacementSignal('sig_dup1', 'sig_replacement5');
  
  // Try to invalidate again
  assert.throws(() => {
    state.invalidateSignal('sig_dup1', 'Duplicate invalidation');
  }, /Cannot invalidate SUPERSEDED signal/);
  
  cleanupTestDb();
});

test('REORG: restart persistence preserves state machine', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_restart1');
  state.storeSignal(signal);
  state.invalidateSignal('sig_restart1', 'REORG test');
  
  const replacement = { ...signal, id: 'sig_replacement6', state: 'ACTIVE' };
  state.storeSignal(replacement);
  state.setReplacementSignal('sig_restart1', 'sig_replacement6');
  
  // Restart
  resetSignalState();
  const state2 = getSignalState(TEST_DB);
  
  const original = state2.getSignal('sig_restart1');
  assert.strictEqual(original.state, 'SUPERSEDED');
  assert.strictEqual(original.replacementSignalId, 'sig_replacement6');
  
  const replacementRetrieved = state2.getSignal('sig_replacement6');
  assert.strictEqual(replacementRetrieved.state, 'ACTIVE');
  
  cleanupTestDb();
});
