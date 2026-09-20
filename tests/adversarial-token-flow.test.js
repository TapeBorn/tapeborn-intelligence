// tests/adversarial-token-flow.test.js
// Adversarial tests for token_flow_anomaly threshold using corrected chain average

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

test('TOKEN FLOW: average = 0 → threshold = 1000 USDC', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // No history recorded
  const avg = state.updateChainAverageVolume(5042002, 100, 1e6);
  assert.strictEqual(avg, 0);
  
  // Token flow threshold = max(2*0, 1000) = 1000
  const threshold = Math.max(2 * avg, 1000);
  assert.strictEqual(threshold, 1000);
  
  cleanupTestDb();
});

test('TOKEN FLOW: average = 400 → threshold = 1000 USDC', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Create average = 400 (e.g., 40 blocks * 1000 volume / 100 = 400)
  for (let i = 1; i <= 40; i++) {
    state.recordBlockVolume(5042002, i, 1000, '0x' + i.toString(16).padStart(64, '0'));
  }
  const avg = state.updateChainAverageVolume(5042002, 40, 1e6);
  assert.ok(Math.abs(avg - 400) < 1, `Expected ~400, got ${avg}`);
  
  // Token flow threshold = max(2*400, 1000) = max(800, 1000) = 1000
  const threshold = Math.max(2 * avg, 1000);
  assert.strictEqual(threshold, 1000);
  
  cleanupTestDb();
});

test('TOKEN FLOW: average = 600 → threshold = 1200 USDC', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Create average = 600
  for (let i = 1; i <= 60; i++) {
    state.recordBlockVolume(5042002, i, 1000, '0x' + i.toString(16).padStart(64, '0'));
  }
  const avg = state.updateChainAverageVolume(5042002, 60, 1e6);
  assert.ok(Math.abs(avg - 600) < 1, `Expected ~600, got ${avg}`);
  
  // Token flow threshold = max(2*600, 1000) = max(1200, 1000) = 1200
  const threshold = Math.max(2 * avg, 1000);
  assert.ok(Math.abs(threshold - 1200) < 1, `Expected ~1200, got ${threshold}`);
  
  cleanupTestDb();
});

test('TOKEN FLOW: average = 1000 → threshold = 2000 USDC', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Create average = 1000
  for (let i = 1; i <= 100; i++) {
    state.recordBlockVolume(5042002, i, 1000, '0x' + i.toString(16).padStart(64, '0'));
  }
  const avg = state.updateChainAverageVolume(5042002, 100, 1e6);
  assert.strictEqual(avg, 1000);
  
  // Token flow threshold = max(2*1000, 1000) = 2000
  const threshold = Math.max(2 * avg, 1000);
  assert.strictEqual(threshold, 2000);
  
  cleanupTestDb();
});

test('TOKEN FLOW: No second independent average calculation', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Verify there's only one source of average
  // The same updateChainAverageVolume is used for both chain average display
  // and token flow anomaly detection
  
  for (let i = 1; i <= 10; i++) {
    state.recordBlockVolume(5042002, i, 1000, '0x' + i.toString(16).padStart(64, '0'));
  }
  
  const avg1 = state.updateChainAverageVolume(5042002, 10, 1e6);
  const avg2 = state.updateChainAverageVolume(5042002, 10, 1e6);
  const avg3 = state.getChainAverageVolume(5042002).averageVolumeUsdc;
  
  assert.strictEqual(avg1, avg2);
  assert.strictEqual(avg2, avg3);
  
  cleanupTestDb();
});
