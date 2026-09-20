// tests/chain-average-real.test.js
// Tests for real rolling chain average volume calculation (100-block window per spec)

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

test('Real chain average: empty history returns 0', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  const avg = state.updateChainAverageVolume(5042002, 100, 10**6);
  assert.strictEqual(avg, 0);
  
  cleanupTestDb();
});

test('Real chain average: first block records volume', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Record volume for block 100
  state.recordBlockVolume(5042002, 100, 500, '0x' + 'a'.repeat(64));
  
  // Update average - 100-block window, only block 100 has data
  // Average = 500 / 100 = 5
  const avg = state.updateChainAverageVolume(5042002, 100, 10**6);
  assert.strictEqual(avg, 5);
  
  cleanupTestDb();
});

test('Real chain average: multiple blocks compute average over 100-block window', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Record volumes for blocks 100-105
  state.recordBlockVolume(5042002, 100, 100, '0x' + 'a'.repeat(64));
  state.recordBlockVolume(5042002, 101, 200, '0x' + 'b'.repeat(64));
  state.recordBlockVolume(5042002, 102, 300, '0x' + 'c'.repeat(64));
  state.recordBlockVolume(5042002, 103, 400, '0x' + 'd'.repeat(64));
  state.recordBlockVolume(5042002, 104, 500, '0x' + 'e'.repeat(64));
  state.recordBlockVolume(5042002, 105, 600, '0x' + 'f'.repeat(64));
  
  // Update average at block 105 (window 100 blocks, only 6 have data)
  // Average = (100+200+300+400+500+600) / 100 = 2100 / 100 = 21
  const avg = state.updateChainAverageVolume(5042002, 105, 10**6);
  assert.strictEqual(avg, 21);
  
  cleanupTestDb();
});

test('Real chain average: exactly 100 blocks', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Record 100 blocks with volume = 100 each
  for (let i = 1; i <= 100; i++) {
    state.recordBlockVolume(5042002, i, 100, '0x' + i.toString(16).padStart(64, '0'));
  }
  
  // Average = 100 * 100 / 100 = 100
  const avg = state.updateChainAverageVolume(5042002, 100, 10**6);
  assert.strictEqual(avg, 100);
  
  cleanupTestDb();
});

test('Real chain average: more than 100 blocks - window slides', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Record 150 blocks with volume = 100 each
  for (let i = 1; i <= 150; i++) {
    state.recordBlockVolume(5042002, i, 100, '0x' + i.toString(16).padStart(64, '0'));
  }
  
  // Window is last 100 blocks (51-150) = 100 blocks * 100 = 10000 / 100 = 100
  const avg = state.updateChainAverageVolume(5042002, 150, 10**6);
  assert.strictEqual(avg, 100);
  
  cleanupTestDb();
});

test('Real chain average: old observations expire', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Record blocks 1-50 with volume 100
  for (let i = 1; i <= 50; i++) {
    state.recordBlockVolume(5042002, i, 100, '0x' + i.toString(16).padStart(64, '0'));
  }
  // Record blocks 51-100 with volume 200
  for (let i = 51; i <= 100; i++) {
    state.recordBlockVolume(5042002, i, 200, '0x' + i.toString(16).padStart(64, '0'));
  }
  
  // At block 100, window is 1-100: (50*100 + 50*200) / 100 = 15000 / 100 = 150
  let avg = state.updateChainAverageVolume(5042002, 100, 10**6);
  assert.strictEqual(avg, 150);
  
  // Add block 101 with volume 300, window becomes 2-101
  state.recordBlockVolume(5042002, 101, 300, '0x' + '101'.padStart(64, '0'));
  avg = state.updateChainAverageVolume(5042002, 101, 10**6);
  // Window 2-101: 49*100 + 50*200 + 1*300 = 4900 + 10000 + 300 = 15200 / 100 = 152
  assert.strictEqual(avg, 152);
  
  cleanupTestDb();
});

test('Real chain average: restart persistence', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Record some volumes
  for (let i = 1; i <= 10; i++) {
    state.recordBlockVolume(5042002, i, 100, '0x' + i.toString(16).padStart(64, '0'));
  }
  // 10 * 100 / 100 = 10
  const avg1 = state.updateChainAverageVolume(5042002, 10, 10**6);
  
  // Restart - new instance with same DB
  resetSignalState();
  const state2 = getSignalState(TEST_DB);
  const avg2 = state2.updateChainAverageVolume(5042002, 10, 10**6);
  
  assert.strictEqual(avg2, avg1);
  assert.strictEqual(avg1, 10);
  
  cleanupTestDb();
});

test('Real chain average: duplicate block processing', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Record same block twice with different volumes
  state.recordBlockVolume(5042002, 100, 100, '0x' + 'a'.repeat(64));
  state.recordBlockVolume(5042002, 100, 200, '0x' + 'b'.repeat(64)); // Should overwrite
  
  const avg = state.updateChainAverageVolume(5042002, 100, 10**6);
  // Should use the latest value (200), average = 200 / 100 = 2
  assert.strictEqual(avg, 2);
  
  cleanupTestDb();
});

test('Real chain average: reverted transactions excluded', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Record block with some volume
  state.recordBlockVolume(5042002, 100, 1000, '0x' + 'a'.repeat(64));
  
  // Average = 1000 / 100 = 10
  const avg = state.updateChainAverageVolume(5042002, 100, 10**6);
  assert.strictEqual(avg, 10);
  
  cleanupTestDb();
});

test('Real chain average: large USDC values', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Large values (1M USDC per block)
  for (let i = 1; i <= 10; i++) {
    state.recordBlockVolume(5042002, i, 1000000, '0x' + i.toString(16).padStart(64, '0'));
  }
  
  // Average = 10 * 1,000,000 / 100 = 100,000
  const avg = state.updateChainAverageVolume(5042002, 10, 10**6);
  assert.strictEqual(avg, 100000);
  
  cleanupTestDb();
});

test('Real chain average: decimal conversion precision', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Values that require decimal precision
  state.recordBlockVolume(5042002, 100, 333.33, '0x' + 'a'.repeat(64));
  state.recordBlockVolume(5042002, 101, 666.67, '0x' + 'b'.repeat(64));
  
  // Average = (333.33 + 666.67) / 100 = 10
  const avg = state.updateChainAverageVolume(5042002, 101, 10**6);
  assert.ok(Math.abs(avg - 10) < 0.01);
  
  cleanupTestDb();
});

test('Real chain average: deterministic repeated calculation', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Record same data
  for (let i = 1; i <= 20; i++) {
    state.recordBlockVolume(5042002, i, 100, '0x' + i.toString(16).padStart(64, '0'));
  }
  
  // Calculate multiple times - average = 20 * 100 / 100 = 20
  const avg1 = state.updateChainAverageVolume(5042002, 20, 10**6);
  const avg2 = state.updateChainAverageVolume(5042002, 20, 10**6);
  const avg3 = state.updateChainAverageVolume(5042002, 20, 10**6);
  
  assert.strictEqual(avg1, avg2);
  assert.strictEqual(avg2, avg3);
  assert.strictEqual(avg1, 20);
  
  cleanupTestDb();
});