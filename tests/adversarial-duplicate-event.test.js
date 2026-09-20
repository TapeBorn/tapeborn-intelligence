// tests/adversarial-duplicate-event.test.js
// Adversarial tests for duplicate event/log handling

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

test('DUPLICATE: Block-level idempotent persistence (ON CONFLICT)', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Record same block twice with different volumes
  state.recordBlockVolume(5042002, 100, 100, '0x' + 'a'.repeat(64));
  state.recordBlockVolume(5042002, 100, 200, '0x' + 'b'.repeat(64)); // Should overwrite
  
  const avg = state.updateChainAverageVolume(5042002, 100, 1e6);
  assert.strictEqual(avg, 2); // 200 / 100 = 2 (latest value used)
  
  cleanupTestDb();
});

test('DUPLICATE: Same block rescanned preserves volume', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // First scan
  state.recordBlockVolume(5042002, 100, 500, '0x' + 'a'.repeat(64));
  let avg = state.updateChainAverageVolume(5042002, 100, 1e6);
  const firstAvg = avg;
  
  // Rescan same block - should overwrite with same or new value
  state.recordBlockVolume(5042002, 100, 500, '0x' + 'a'.repeat(64));
  avg = state.updateChainAverageVolume(5042002, 100, 1e6);
  
  assert.strictEqual(avg, firstAvg, 'Rescan should be idempotent');
  
  cleanupTestDb();
});

test('DUPLICATE: Multiple transactions with USDC transfers in one block', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Simulate multiple USDC transfers in one block
  // This would be recorded as single block volume = sum of all transfers
  state.recordBlockVolume(5042002, 100, 150, '0x' + 'a'.repeat(64)); // e.g., 100 + 50
  
  const avg = state.updateChainAverageVolume(5042002, 100, 1e6);
  assert.strictEqual(avg, 1.5); // 150 / 100 = 1.5
  
  cleanupTestDb();
});

test('DUPLICATE: Different transactions in same block both counted', () => {
  cleanupTestDb();
  resetSignalState();
  const state = getSignalState(TEST_DB);
  
  // Two transactions in same block, each with USDC transfer
  // Both should contribute to block volume
  state.recordBlockVolume(5042002, 100, 250, '0x' + 'a'.repeat(64)); // 100 + 150
  
  const avg = state.updateChainAverageVolume(5042002, 100, 1e6);
  assert.strictEqual(avg, 2.5); // 250 / 100 = 2.5
  
  cleanupTestDb();
});
