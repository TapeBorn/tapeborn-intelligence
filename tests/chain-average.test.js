// tests/chain-average.test.js
// Tests for chain average volume calculation (R7)
// Updated for real rolling 100-block window implementation

const test = require('node:test');
const assert = require('node:assert');
const { getSignalState, resetSignalState } = require('../src/signal/state');

test('SignalState: chain average volume - initial state', () => {
  resetSignalState();
  const state = getSignalState(':memory:');
  const avg = state.getChainAverageVolume(5042002);
  assert.strictEqual(avg.averageVolumeUsdc, 0);
  assert.strictEqual(avg.windowBlocks, 0);
  assert.strictEqual(avg.lastUpdatedBlock, 0);
});

test('SignalState: set and get chain average volume', () => {
  resetSignalState();
  const state = getSignalState(':memory:');
  state.setChainAverageVolume(5042002, 500, 100, 1000);
  const avg = state.getChainAverageVolume(5042002);
  assert.strictEqual(avg.averageVolumeUsdc, 500);
  assert.strictEqual(avg.windowBlocks, 100);
  assert.strictEqual(avg.lastUpdatedBlock, 1000);
});

test('SignalState: update overwrites existing average', () => {
  resetSignalState();
  const state = getSignalState(':memory:');
  state.setChainAverageVolume(5042002, 500, 100, 1000);
  state.setChainAverageVolume(5042002, 1000, 100, 1100);
  const avg = state.getChainAverageVolume(5042002);
  assert.strictEqual(avg.averageVolumeUsdc, 1000);
  assert.strictEqual(avg.lastUpdatedBlock, 1100);
});

test('SignalState: separate chains have separate averages', () => {
  resetSignalState();
  const state = getSignalState(':memory:');
  state.setChainAverageVolume(5042002, 500, 100, 1000);
  state.setChainAverageVolume(5042, 1000, 100, 2000);
  
  const avgTestnet = state.getChainAverageVolume(5042002);
  const avgMainnet = state.getChainAverageVolume(5042);
  
  assert.strictEqual(avgTestnet.averageVolumeUsdc, 500);
  assert.strictEqual(avgMainnet.averageVolumeUsdc, 1000);
});

test('SignalState: updateChainAverageVolume computes real rolling average from block_volumes', () => {
  resetSignalState();
  const state = getSignalState(':memory:');
  
  // Record some block volumes
  state.recordBlockVolume(5042002, 100, 500, '0x' + 'a'.repeat(64));
  state.recordBlockVolume(5042002, 101, 700, '0x' + 'b'.repeat(64));
  
  // Average over 100-block window = (500 + 700) / 100 = 12
  const avg = state.updateChainAverageVolume(5042002, 101, 10**6);
  assert.strictEqual(avg, 12);
  
  // Verify cached average was updated
  const cached = state.getChainAverageVolume(5042002);
  assert.strictEqual(cached.averageVolumeUsdc, 12);
});

test('SignalState: updateChainAverageVolume returns 0 when no block volumes recorded', () => {
  resetSignalState();
  const state = getSignalState(':memory:');
  const avg = state.updateChainAverageVolume(5042002, 1001, 1000000);
  assert.strictEqual(avg, 0);
});

test('SignalState: different chains have independent updateChainAverageVolume', () => {
  resetSignalState();
  const state = getSignalState(':memory:');
  state.recordBlockVolume(5042002, 100, 500, '0x' + 'a'.repeat(64));
  state.recordBlockVolume(5042, 200, 1000, '0x' + 'b'.repeat(64));
  
  const avg1 = state.updateChainAverageVolume(5042002, 100, 1000000);
  const avg2 = state.updateChainAverageVolume(5042, 200, 1000000);
  
  // 500 / 100 = 5, 1000 / 100 = 10
  assert.strictEqual(avg1, 5);
  assert.strictEqual(avg2, 10);
});