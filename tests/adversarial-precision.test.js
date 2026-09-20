// tests/adversarial-precision.test.js
// Adversarial precision tests for USDC volume aggregation

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

// Test precision loss from Number(BigInt) conversion
test('PRECISION: Number(BigInt) loses precision above MAX_SAFE_INTEGER', () => {
  const MAX_SAFE = 9007199254740991; // Number.MAX_SAFE_INTEGER
  const big1 = BigInt(MAX_SAFE) + 1n;
  const big2 = BigInt(MAX_SAFE) + 2n;
  
  // These should be distinguishable as BigInt
  assert.notStrictEqual(big1, big2);
  
  // But as Number they become equal (precision loss)
  const num1 = Number(big1);
  const num2 = Number(big2);
  
  console.log(`BigInt: ${big1} vs ${big2} = ${big1 !== big2}`);
  console.log(`Number: ${num1} vs ${num2} = ${num1 !== num2}`);
  
  // This demonstrates the precision loss
  assert.ok(num1 === num2, 'Numbers above MAX_SAFE_INTEGER lose precision');
});

test('PRECISION: USDC raw amounts that exceed safe integer', () => {
  // 10^18 wei (1 ETH) = 10^18 raw units
  // This is ~1000x MAX_SAFE_INTEGER
  const largeAmount = 10n ** 18n;
  const asNumber = Number(largeAmount);
  
  console.log(`Large amount: ${largeAmount}`);
  console.log(`As Number: ${asNumber}`);
  
  // The Number representation may be equal but the precision is lost
  // for arithmetic operations
  assert.ok(largeAmount > 0n, 'Large amount is valid BigInt');
});

test('PRECISION: Aggregation in BigInt preserves exactness', () => {
  // Test that aggregating in BigInt then converting once is exact
  const amounts = [
    1000000n,      // 1 USDC
    50000000n,     // 50 USDC
    9007199254740991n, // MAX_SAFE
    9007199254740992n, // MAX_SAFE + 1
  ];
  
  // Aggregate in BigInt
  let totalBigInt = 0n;
  for (const a of amounts) totalBigInt += a;
  
  // Convert once at the end
  const divisor = 10n ** 6n;
  const exactUSDC = totalBigInt / divisor;
  const remainder = totalBigInt % divisor;
  
  // Convert each individually through Number (current implementation)
  let totalNumber = 0;
  for (const a of amounts) {
    totalNumber += Number(a) / Number(divisor);
  }
  
  console.log(`BigInt total: ${totalBigInt}`);
  console.log(`Number total: ${totalNumber}`);
  console.log(`Exact USDC: ${exactUSDC} remainder ${remainder}`);
  
  // The Number approach loses precision
  assert.ok(Math.abs(totalNumber - Number(exactUSDC)) > 0.001, 'Precision loss confirmed');
});