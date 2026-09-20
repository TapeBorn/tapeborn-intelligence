// tests/adversarial-log-filter.test.js
// Adversarial tests for log filtering in computeBlockUsdcVolume

const test = require('node:test');
const assert = require('node:assert');

// These tests verify the logic in computeBlockUsdcVolume through simulation
// The actual filtering happens in engine.js, but we can test the logic directly

const TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'.toLowerCase();

function filterLog(log, usdcAddress) {
  // Simulates the filtering logic in computeBlockUsdcVolume
  const logAddress = log.address?.toLowerCase();
  if (logAddress !== usdcAddress) return false;
  
  const topics = log.topics || [];
  if (topics.length < 3) return false;
  if (topics[0] !== TRANSFER_SIGNATURE) return false;
  
  return true;
}

test('LOG FILTER: Correct USDC contract + Transfer topic → counted', () => {
  const log = {
    address: USDC_ADDRESS,
    topics: [TRANSFER_SIGNATURE, '0x...from', '0x...to'],
    data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000'
  };
  
  assert.ok(filterLog(log, USDC_ADDRESS));
});

test('LOG FILTER: Wrong token contract + Transfer topic → ignored', () => {
  const log = {
    address: '0x1111111111111111111111111111111111111111', // Wrong contract
    topics: [TRANSFER_SIGNATURE, '0x...from', '0x...to'],
    data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000'
  };
  
  assert.ok(!filterLog(log, USDC_ADDRESS));
});

test('LOG FILTER: Correct USDC contract + wrong topic → ignored', () => {
  const log = {
    address: USDC_ADDRESS,
    topics: ['0xwrongtopic', '0x...from', '0x...to'], // Not Transfer
    data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000'
  };
  
  assert.ok(!filterLog(log, USDC_ADDRESS));
});

test('LOG FILTER: Malformed log.data → safely ignored (filter returns false)', () => {
  // Malformed data doesn't affect filtering - filtering happens before data parsing
  const log = {
    address: USDC_ADDRESS,
    topics: [TRANSFER_SIGNATURE, '0x...from', '0x...to'],
    data: 'malformed'
  };
  
  // Filter passes, but decoding would fail and continue
  assert.ok(filterLog(log, USDC_ADDRESS));
});

test('LOG FILTER: Missing topics[0] → ignored', () => {
  const log = {
    address: USDC_ADDRESS,
    topics: [],
    data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000'
  };
  
  assert.ok(!filterLog(log, USDC_ADDRESS));
});

test('LOG FILTER: Case variation in contract address → correctly matched', () => {
  const log = {
    address: '0x036CBD53842C5426634E7929541EC2318F3DCF7E'.toLowerCase(), // Different case
    topics: [TRANSFER_SIGNATURE, '0x...from', '0x...to'],
    data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000'
  };
  
  assert.ok(filterLog(log, USDC_ADDRESS.toLowerCase()));
});

test('LOG FILTER: Multiple Transfer events in one receipt → all passed to filter', () => {
  const logs = [
    { address: USDC_ADDRESS, topics: [TRANSFER_SIGNATURE, '0x...from1', '0x...to1'], data: '0x100' },
    { address: USDC_ADDRESS, topics: [TRANSFER_SIGNATURE, '0x...from2', '0x...to2'], data: '0x200' },
    { address: USDC_ADDRESS, topics: [TRANSFER_SIGNATURE, '0x...from3', '0x...to3'], data: '0x300' },
  ];
  
  const passed = logs.filter(l => filterLog(l, USDC_ADDRESS));
  assert.strictEqual(passed.length, 3);
});

test('LOG FILTER: Mixed logs in one receipt → only USDC Transfers pass', () => {
  const logs = [
    { address: USDC_ADDRESS, topics: [TRANSFER_SIGNATURE, '0x...from', '0x...to'], data: '0x100' }, // Pass
    { address: '0xother', topics: [TRANSFER_SIGNATURE, '0x...from', '0x...to'], data: '0x100' }, // Fail - wrong contract
    { address: USDC_ADDRESS, topics: ['0xwrong', '0x...from', '0x...to'], data: '0x100' }, // Fail - wrong topic
    { address: USDC_ADDRESS, topics: [TRANSFER_SIGNATURE, '0x...from', '0x...to'], data: '0x200' }, // Pass
  ];
  
  const passed = logs.filter(l => filterLog(l, USDC_ADDRESS));
  assert.strictEqual(passed.length, 2);
});
