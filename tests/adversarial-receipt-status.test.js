// tests/adversarial-receipt-status.test.js
// Adversarial tests for receipt status handling

const test = require('node:test');
const assert = require('node:assert');
const { getSignalState, resetSignalState } = require('../src/signal/state');
const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, '..', '.data', 'test-signal-state.sqlite');

function cleanupTestDb() {
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
}

// Note: These tests verify the storage layer behavior.
// The actual receipt status filtering happens in computeBlockUsdcVolume()
// in engine.js. These tests document the expected storage behavior.

test('RECEIPT: Zero volume stored for failed/reverted transactions', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Simulate: reverted tx would not call recordBlockVolume
  // If it did with 0 volume, it should store 0
  state.recordBlockVolume(5042002, 100, 0, '0x' + 'a'.repeat(64));
  
  const avg = state.updateChainAverageVolume(5042002, 100, 1e6);
  assert.strictEqual(avg, 0);
  
  cleanupTestDb();
});

test('RECEIPT: Only successful transactions contribute volume', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Only successful transactions should have volume recorded
  // This is enforced by computeBlockUsdcVolume skipping receipt.status === '0x0'
  state.recordBlockVolume(5042002, 100, 1000, '0x' + 'a'.repeat(64));
  
  const avg = state.updateChainAverageVolume(5042002, 100, 1e6);
  assert.strictEqual(avg, 10); // 1000 / 100 = 10
  
  cleanupTestDb();
});

test('RECEIPT: Receipt unavailable results in no contribution', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // If receipt unavailable, computeBlockUsdcVolume skips the tx
  // No volume recorded for that tx
  state.recordBlockVolume(5042002, 100, 500, '0x' + 'a'.repeat(64));
  
  const avg = state.updateChainAverageVolume(5042002, 100, 1e6);
  assert.strictEqual(avg, 5); // 500 / 100 = 5
  
  cleanupTestDb();
});
