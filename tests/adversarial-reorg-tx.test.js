// tests/adversarial-reorg-tx.test.js
// Adversarial tests for reorg state machine transactionality

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

test('REORG TX: ACTIVE → INVALIDATED persists reason', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_invalid_reason1');
  state.storeSignal(signal);
  state.invalidateSignal('sig_invalid_reason1', 'REORG: block 100 replaced');
  
  const retrieved = state.getSignal('sig_invalid_reason1');
  assert.strictEqual(retrieved.state, 'INVALIDATED');
  assert.ok(retrieved.invalidatedReason.includes('REORG'));
  assert.ok(retrieved.invalidatedAt > 0);
  
  cleanupTestDb();
});

test('REORG TX: INVALIDATED → SUPERSEDED persists replacement link', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_super_link1');
  state.storeSignal(signal);
  state.invalidateSignal('sig_super_link1', 'REORG test');
  
  const replacement = { ...signal, id: 'sig_replacement_link1', state: 'ACTIVE' };
  state.storeSignal(replacement);
  state.setReplacementSignal('sig_super_link1', 'sig_replacement_link1');
  
  const original = state.getSignal('sig_super_link1');
  assert.strictEqual(original.state, 'SUPERSEDED');
  assert.strictEqual(original.replacementSignalId, 'sig_replacement_link1');
  
  const replacementRetrieved = state.getSignal('sig_replacement_link1');
  assert.strictEqual(replacementRetrieved.state, 'ACTIVE');
  
  cleanupTestDb();
});

test('REORG TX: Restart preserves final state', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_restart_tx1');
  state.storeSignal(signal);
  state.invalidateSignal('sig_restart_tx1', 'REORG test');
  
  const replacement = { ...signal, id: 'sig_replacement_restart1', state: 'ACTIVE' };
  state.storeSignal(replacement);
  state.setReplacementSignal('sig_restart_tx1', 'sig_replacement_restart1');
  
  // Restart
  resetSignalState();
  const state2 = getSignalState(TEST_DB);
  
  const original = state2.getSignal('sig_restart_tx1');
  assert.strictEqual(original.state, 'SUPERSEDED');
  assert.strictEqual(original.replacementSignalId, 'sig_replacement_restart1');
  assert.ok(original.invalidatedReason);
  
  const replacementRetrieved = state2.getSignal('sig_replacement_restart1');
  assert.strictEqual(replacementRetrieved.state, 'ACTIVE');
  
  cleanupTestDb();
});

test('REORG TX: Illegal INVALIDATED → ACTIVE rejected', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_illegal1');
  state.storeSignal(signal);
  state.invalidateSignal('sig_illegal1', 'REORG test');
  
  // Try to set back to ACTIVE
  const backToActive = { ...signal, state: 'ACTIVE' };
  assert.throws(() => {
    state.storeSignal(backToActive);
  }, /Illegal state transition/);
  
  // Verify state unchanged
  const retrieved = state.getSignal('sig_illegal1');
  assert.strictEqual(retrieved.state, 'INVALIDATED');
  
  cleanupTestDb();
});

test('REORG TX: Illegal SUPERSEDED → ACTIVE rejected', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_illegal2');
  state.storeSignal(signal);
  state.invalidateSignal('sig_illegal2', 'REORG test');
  
  const replacement = { ...signal, id: 'sig_replacement_illegal1', state: 'ACTIVE' };
  state.storeSignal(replacement);
  state.setReplacementSignal('sig_illegal2', 'sig_replacement_illegal1');
  
  // Try to set original back to ACTIVE
  const backToActive = { ...signal, state: 'ACTIVE' };
  assert.throws(() => {
    state.storeSignal(backToActive);
  }, /Illegal state transition/);
  
  cleanupTestDb();
});

test('REORG TX: Invalidated reason persists through SUPERSEDED', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_reason_persist1');
  state.storeSignal(signal);
  state.invalidateSignal('sig_reason_persist1', 'REORG: block 100 replaced');
  
  const replacement = { ...signal, id: 'sig_replacement_reason1', state: 'ACTIVE' };
  state.storeSignal(replacement);
  state.setReplacementSignal('sig_reason_persist1', 'sig_replacement_reason1');
  
  const original = state.getSignal('sig_reason_persist1');
  assert.ok(original.invalidatedReason.includes('REORG'));
  
  // Restart
  resetSignalState();
  const state2 = getSignalState(TEST_DB);
  const original2 = state2.getSignal('sig_reason_persist1');
  assert.ok(original2.invalidatedReason.includes('REORG'));
  
  cleanupTestDb();
});

test('REORG TX: Replacement signal ID mandatory for SUPERSEDED', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_mandatory1');
  state.storeSignal(signal);
  state.invalidateSignal('sig_mandatory1', 'REORG test');
  
  assert.throws(() => {
    state.setReplacementSignal('sig_mandatory1', null);
  }, /replacement_signal_id is required/);
  
  cleanupTestDb();
});

test('REORG TX: Replacement signal must exist', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_mandatory2');
  state.storeSignal(signal);
  state.invalidateSignal('sig_mandatory2', 'REORG test');
  
  assert.throws(() => {
    state.setReplacementSignal('sig_mandatory2', 'sig_nonexistent');
  }, /Replacement signal not found/);
  
  cleanupTestDb();
});

test('REORG TX: Cannot supersede ACTIVE signal', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_active3');
  state.storeSignal(signal);
  
  assert.throws(() => {
    state.setReplacementSignal('sig_active3', 'sig_replacement3');
  }, /Can only supersede INVALIDATED signal/);
  
  cleanupTestDb();
});

test('REORG TX: Cannot invalidate SUPERSEDED signal', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const signal = createTestSignal('sig_super2');
  state.storeSignal(signal);
  state.invalidateSignal('sig_super2', 'REORG test');
  
  const replacement = { ...signal, id: 'sig_replacement_super2', state: 'ACTIVE' };
  state.storeSignal(replacement);
  state.setReplacementSignal('sig_super2', 'sig_replacement_super2');
  
  assert.throws(() => {
    state.invalidateSignal('sig_super2', 'Attempt to invalidate superseded');
  }, /Cannot invalidate SUPERSEDED signal/);
  
  cleanupTestDb();
});
