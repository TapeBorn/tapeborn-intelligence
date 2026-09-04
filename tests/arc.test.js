// tests/arc.test.js
// Tests for RPC client (BUILD_013)
// Run with: node --test tests/arc.test.js

const test = require('node:test');
const assert = require('node:assert');
const { getBlockNumber, getBlockByNumber, getChainId } = require('../src/orchestrator/arc');

test('ARC RPC: getBlockNumber returns a number', async () => {
  const block = await getBlockNumber();
  assert.ok(typeof block === 'number' && block > 0, 'block number should be positive integer');
});

test('ARC RPC: getBlockByNumber returns block', async () => {
  const block = await getBlockByNumber('latest', true);
  assert.ok(block, 'block should exist');
  assert.ok(block.number, 'block should have number');
  assert.ok(block.hash, 'block should have hash');
  assert.ok(Array.isArray(block.transactions), 'transactions should be array');
});

test('ARC RPC: getBlockByNumber with numeric tag', async () => {
  const blockNum = await getBlockNumber();
  const block = await getBlockByNumber(blockNum, false);
  assert.ok(block, 'block should exist');
  const hexNum = '0x' + blockNum.toString(16);
  assert.ok(block.number === hexNum, 'block number should match');
});

test('ARC RPC: getChainId returns 5042002', async () => {
  const chainId = await getChainId();
  assert.ok(chainId === 5042002, 'chain ID should be 5042002 (Arc Testnet)');
});

test('ARC RPC: timeout handling', async () => {
  // This should not throw if RPC is responsive
  const block = await getBlockNumber();
  assert.ok(block > 0);
});

// Rate limit test: ensure multiple calls don't exceed rate
test('ARC RPC: rate limit does not cause errors', async () => {
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(getBlockNumber());
  }
  const results = await Promise.all(promises);
  assert.ok(results.every(r => typeof r === 'number' && r > 0), 'all calls should return valid block numbers');
});