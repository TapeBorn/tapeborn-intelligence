// tests/adversarial-window.test.js
// Adversarial tests for 100-block window boundaries

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

test('WINDOW: current-100 excluded, current-99 included', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Current = 200
  // Window = [101, 200] (100 blocks)
  // Block 100 should be EXCLUDED
  // Block 101 should be INCLUDED
  
  state.recordBlockVolume(5042002, 100, 1000, '0x' + 'a'.repeat(64)); // Should be excluded
  state.recordBlockVolume(5042002, 101, 1000, '0x' + 'b'.repeat(64)); // Should be included
  
  // Average at block 200: only block 101 counted = 1000 / 100 = 10
  const avg = state.updateChainAverageVolume(5042002, 200, 1e6);
  assert.strictEqual(avg, 10);
  
  cleanupTestDb();
});

test('WINDOW: current included', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Current = 100
  // Window = [1, 100]
  // Block 100 should be included
  
  state.recordBlockVolume(5042002, 100, 1000, '0x' + 'a'.repeat(64));
  
  const avg = state.updateChainAverageVolume(5042002, 100, 1e6);
  assert.strictEqual(avg, 10); // 1000 / 100 = 10
  
  cleanupTestDb();
});

test('WINDOW: zero-volume blocks included in denominator', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Only block 100 has volume, blocks 1-99 have 0
  state.recordBlockVolume(5042002, 100, 1000, '0x' + 'a'.repeat(64));
  
  // Average = 1000 / 100 = 10 (includes 99 zero-volume blocks in denominator)
  const avg = state.updateChainAverageVolume(5042002, 100, 1e6);
  assert.strictEqual(avg, 10);
  
  cleanupTestDb();
});

test('WINDOW: rescanning existing block does not duplicate volume', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Record block 100
  state.recordBlockVolume(5042002, 100, 1000, '0x' + 'a'.repeat(64));
  let avg = state.updateChainAverageVolume(5042002, 100, 1e6);
  const firstAvg = avg;
  
  // Rescan - overwrite with same value
  state.recordBlockVolume(5042002, 100, 1000, '0x' + 'a'.repeat(64));
  avg = state.updateChainAverageVolume(5042002, 100, 1e6);
  
  assert.strictEqual(avg, firstAvg, 'Rescan should not change average');
  
  cleanupTestDb();
});

test('WINDOW: restart preserves history', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  for (let i = 1; i <= 50; i++) {
    state.recordBlockVolume(5042002, i, 100, '0x' + i.toString(16).padStart(64, '0'));
  }
  const avg1 = state.updateChainAverageVolume(5042002, 50, 1e6);
  
  // Restart
  const state2 = getSignalState(TEST_DB);
  const avg2 = state2.updateChainAverageVolume(5042002, 50, 1e6);
  
  assert.strictEqual(avg2, avg1);
  assert.strictEqual(avg1, 50); // 50 * 100 / 100 = 50
  
  cleanupTestDb();
});

test('WINDOW: sliding window expires old blocks', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Blocks 1-50: volume 100
  for (let i = 1; i <= 50; i++) {
    state.recordBlockVolume(5042002, i, 100, '0x' + i.toString(16).padStart(64, '0'));
  }
  // Blocks 51-100: volume 200
  for (let i = 51; i <= 100; i++) {
    state.recordBlockVolume(5042002, i, 200, '0x' + i.toString(16).padStart(64, '0'));
  }
  
  // At block 100: window = [1, 100]
  // Average = (50*100 + 50*200) / 100 = 150
  let avg = state.updateChainAverageVolume(5042002, 100, 1e6);
  assert.strictEqual(avg, 150);
  
  // Add block 101: window = [2, 101]
  // Block 1 expires (was 100)
  // Block 101 = 300
  state.recordBlockVolume(5042002, 101, 300, '0x' + '101'.padStart(64, '0'));
  avg = state.updateChainAverageVolume(5042002, 101, 1e6);
  // Window [2, 101]: 49*100 + 50*200 + 1*300 = 4900 + 10000 + 300 = 15200 / 100 = 152
  assert.strictEqual(avg, 152);
  
  cleanupTestDb();
});
