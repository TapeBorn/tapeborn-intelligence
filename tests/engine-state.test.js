// tests/engine-state.test.js
// Tests for persistent signal state (R4)

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { SignalState, getSignalState, resetSignalState } = require('../src/signal/state');
const { detectAddressReactivation } = require('../src/signal/engine');
const { hexToInt } = require('../src/orchestrator/arc');

test('SignalState: persists address last seen across instances', () => {
  // Create a temporary database for testing
  const testDbPath = '/tmp/test-signal-state.sqlite';
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  
  const state1 = new (require('../src/signal/state').SignalState)(testDbPath);
  
  // Set last seen for an address
  state1.setLastSeen('0xabc', 100, 1000);
  state1.setLastSeen('0xdef', 200, 2000);
  
  // Verify in first instance
  const addr1 = state1.getLastSeen('0xabc');
  assert.strictEqual(addr1.lastSeenBlock, 100);
  
  const addr2 = state1.getLastSeen('0xdef');
  assert.strictEqual(addr2.lastSeenBlock, 200);
  
  // Close first instance
  state1.close();
  
  // Create new instance with same database
  const state2 = new (require('../src/signal/state').SignalState)(testDbPath);
  
  // Verify data persists
  const addr1Restored = state2.getLastSeen('0xabc');
  assert.strictEqual(addr1Restored.lastSeenBlock, 100);
  
  const addr2Restored = state2.getLastSeen('0xdef');
  assert.strictEqual(addr2Restored.lastSeenBlock, 200);
  
  // Cleanup
  state2.close();
  fs.unlinkSync(testDbPath);
});

test('SignalState: batch updates work correctly', () => {
  const testDbPath = '/tmp/test-signal-state-batch.sqlite';
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  
  const state = new (require('../src/signal/state').SignalState)(testDbPath);
  
  const updates = [
    { address: '0xaaa', blockNumber: 100, timestamp: 1000 },
    { address: '0xbbb', blockNumber: 200, timestamp: 2000 },
    { address: '0xccc', blockNumber: 300, timestamp: 3000 },
  ];
  
  state.setLastSeenBatch(updates);
  
  assert.strictEqual(state.getLastSeen('0xaaa').lastSeenBlock, 100);
  assert.strictEqual(state.getLastSeen('0xbbb').lastSeenBlock, 200);
  assert.strictEqual(state.getLastSeen('0xccc').lastSeenBlock, 300);
  
  state.close();
  fs.unlinkSync(testDbPath);
});

test('SignalState: chain average volume operations', () => {
  const testDbPath = '/tmp/test-signal-state-chain.sqlite';
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  
  const state = new (require('../src/signal/state').SignalState)(testDbPath);
  
  // Set chain average
  state.setChainAverageVolume(5042002, 500, 100, 1000);
  
  // Retrieve
  const avg = state.getChainAverageVolume(5042002);
  assert.strictEqual(avg.averageVolumeUsdc, 500);
  assert.strictEqual(avg.windowBlocks, 100);
  assert.strictEqual(avg.lastUpdatedBlock, 1000);
  
  // Update
  state.setChainAverageVolume(5042002, 600, 100, 1100);
  const updated = state.getChainAverageVolume(5042002);
  assert.strictEqual(updated.averageVolumeUsdc, 600);
  assert.strictEqual(updated.lastUpdatedBlock, 1100);
  
  state.close();
  fs.unlinkSync(testDbPath);
});

test('address_reactivation: uses persistent state correctly within single process', () => {
  // Use a temporary database for testing
  const testDbPath = '/tmp/test-reactivation.sqlite';
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  
  // Set environment variable for test database BEFORE requiring the modules
  process.env.SIGNAL_STATE_DB = testDbPath;
  
  // Reset any existing state
  const { resetSignalState } = require('../src/signal/state');
  resetSignalState();
  
  // NOW require the engine (after env var is set)
  const { detectAddressReactivation: detect1 } = require('../src/signal/engine');
  
  const block1 = {
    number: '0x1',
    transactions: [{ from: '0xaaa', hash: '0x1' }]
  };
  
  // First call populates state
  detect1(block1, 100);
  
  // Now test with a new block far ahead in same process
  const block2 = {
    number: '0x200', // far ahead
    transactions: [{ from: '0xaaa', hash: '0x2' }]
  };
  
  // This should detect reactivation because state persisted in same process
  const signals = detect1(block2, 100);
  assert.ok(signals.length === 1, 'should detect reactivation after 100 blocks');
  assert.ok(signals[0].type === 'address_reactivation');
  assert.ok(signals[0].data.interval > 100);
  
  // Cleanup
  delete process.env.SIGNAL_STATE_DB;
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});