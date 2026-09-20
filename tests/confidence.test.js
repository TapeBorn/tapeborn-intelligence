// tests/confidence.test.js
// Confidence rule tests per signal-spec.yaml v1.0.0

const test = require('node:test');
const assert = require('node:assert');
const { computeConfidence, SIGNAL_TYPES } = require('../src/signal/engine');

test('LARGE_TRANSFER: valueUsdc >= 1000 -> 0.9', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.LARGE_TRANSFER, { valueUsdc: 1000 }), 0.9);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.LARGE_TRANSFER, { valueUsdc: 5000 }), 0.9);
});

test('LARGE_TRANSFER: valueUsdc >= 500 -> 0.85', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.LARGE_TRANSFER, { valueUsdc: 500 }), 0.85);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.LARGE_TRANSFER, { valueUsdc: 999 }), 0.85);
});

test('LARGE_TRANSFER: valueUsdc >= 100 -> 0.8', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.LARGE_TRANSFER, { valueUsdc: 100 }), 0.8);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.LARGE_TRANSFER, { valueUsdc: 499 }), 0.8);
});

test('LARGE_TRANSFER: valueUsdc < 100 -> 0.7', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.LARGE_TRANSFER, { valueUsdc: 99 }), 0.7);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.LARGE_TRANSFER, { valueUsdc: 50 }), 0.7);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.LARGE_TRANSFER, { valueUsdc: 0 }), 0.7);
});

test('LARGE_TRANSFER: missing valueUsdc defaults to 0.7', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.LARGE_TRANSFER, {}), 0.7);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.LARGE_TRANSFER, { valueUsdc: null }), 0.7);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.LARGE_TRANSFER, { valueUsdc: undefined }), 0.7);
});

test('TOKEN_FLOW_ANOMALY: valueUsdc > 2 * averageVolume -> 0.8', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.TOKEN_FLOW_ANOMALY, { valueUsdc: 1000, averageVolume: 400 }), 0.8);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.TOKEN_FLOW_ANOMALY, { valueUsdc: 2001, averageVolume: 1000 }), 0.8);
});

test('TOKEN_FLOW_ANOMALY: valueUsdc > 1000 but <= 2*averageVolume -> 0.6', () => {
  // valueUsdc=1000, averageVolume=1000: 1000 > 2000? false; 1000 > 1000? false -> 0.5
  // Need valueUsdc > 1000 but <= 2*averageVolume
  // Example: valueUsdc=1500, averageVolume=1000: 1500 > 2000? false; 1500 > 1000? true -> 0.6
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.TOKEN_FLOW_ANOMALY, { valueUsdc: 1500, averageVolume: 1000 }), 0.6);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.TOKEN_FLOW_ANOMALY, { valueUsdc: 1200, averageVolume: 800 }), 0.6); // 1200 > 1600? false; 1200 > 1000? true -> 0.6
});

test('TOKEN_FLOW_ANOMALY: valueUsdc <= 1000 and <= 2*averageVolume -> 0.5', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.TOKEN_FLOW_ANOMALY, { valueUsdc: 500, averageVolume: 1000 }), 0.5);
  // valueUsdc=1000, averageVolume=1000:
  // 1000 > 2*1000 (2000)? false
  // 1000 > 1000? false (not strictly greater)
  // returns 0.5
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.TOKEN_FLOW_ANOMALY, { valueUsdc: 1000, averageVolume: 1000 }), 0.5);
});

test('TOKEN_FLOW_ANOMALY: missing data defaults', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.TOKEN_FLOW_ANOMALY, {}), 0.5); // avg=0, value=0 -> 0 > 0 false, 0 > 1000 false -> 0.5
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.TOKEN_FLOW_ANOMALY, { valueUsdc: null }), 0.5);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.TOKEN_FLOW_ANOMALY, { averageVolume: null }), 0.5);
});

test('CONTRACT_CREATION: inputLength > 1000 -> 0.9', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.CONTRACT_CREATION, { inputLength: 1001 }), 0.9);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.CONTRACT_CREATION, { inputLength: 5000 }), 0.9);
});

test('CONTRACT_CREATION: inputLength > 100 -> 0.8', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.CONTRACT_CREATION, { inputLength: 101 }), 0.8);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.CONTRACT_CREATION, { inputLength: 1000 }), 0.8);
});

test('CONTRACT_CREATION: inputLength <= 100 -> 0.7', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.CONTRACT_CREATION, { inputLength: 100 }), 0.7);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.CONTRACT_CREATION, { inputLength: 50 }), 0.7);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.CONTRACT_CREATION, { inputLength: 4 }), 0.7);
});

test('CONTRACT_CREATION: missing inputLength defaults to 0.7', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.CONTRACT_CREATION, {}), 0.7);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.CONTRACT_CREATION, { inputLength: null }), 0.7);
});

test('HIGH_FREQUENCY_WALLET: txCount >= 20 -> 0.9', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.HIGH_FREQUENCY_WALLET, { txCount: 20 }), 0.9);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.HIGH_FREQUENCY_WALLET, { txCount: 50 }), 0.9);
});

test('HIGH_FREQUENCY_WALLET: txCount >= 10 -> 0.8', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.HIGH_FREQUENCY_WALLET, { txCount: 10 }), 0.8);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.HIGH_FREQUENCY_WALLET, { txCount: 19 }), 0.8);
});

test('HIGH_FREQUENCY_WALLET: txCount < 10 -> 0.7', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.HIGH_FREQUENCY_WALLET, { txCount: 9 }), 0.7);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.HIGH_FREQUENCY_WALLET, { txCount: 5 }), 0.7);
});

test('HIGH_FREQUENCY_WALLET: missing txCount defaults to 0.7', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.HIGH_FREQUENCY_WALLET, {}), 0.7);
});

test('CONTRACT_INTERACTION: inputLength > 100 -> 0.8', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.CONTRACT_INTERACTION, { inputLength: 101 }), 0.8);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.CONTRACT_INTERACTION, { inputLength: 1000 }), 0.8);
});

test('CONTRACT_INTERACTION: inputLength <= 100 -> 0.6', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.CONTRACT_INTERACTION, { inputLength: 100 }), 0.6);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.CONTRACT_INTERACTION, { inputLength: 4 }), 0.6);
});

test('CONTRACT_INTERACTION: missing inputLength defaults to 0.6', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.CONTRACT_INTERACTION, {}), 0.6);
});

test('WALLET_BURST: txCount > 20 -> 0.9', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.WALLET_BURST, { txCount: 21 }), 0.9);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.WALLET_BURST, { txCount: 100 }), 0.9);
});

test('WALLET_BURST: txCount <= 20 -> 0.7', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.WALLET_BURST, { txCount: 20 }), 0.7);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.WALLET_BURST, { txCount: 10 }), 0.7);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.WALLET_BURST, { txCount: 0 }), 0.7);
});

test('WALLET_BURST: missing txCount defaults to 0.7', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.WALLET_BURST, {}), 0.7);
});

test('ADDRESS_REACTIVATION: interval > 500 -> 0.9', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.ADDRESS_REACTIVATION, { interval: 501 }), 0.9);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.ADDRESS_REACTIVATION, { interval: 1000 }), 0.9);
});

test('ADDRESS_REACTIVATION: interval <= 500 -> 0.7', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.ADDRESS_REACTIVATION, { interval: 500 }), 0.7);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.ADDRESS_REACTIVATION, { interval: 100 }), 0.7);
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.ADDRESS_REACTIVATION, { interval: 0 }), 0.7);
});

test('ADDRESS_REACTIVATION: missing interval defaults to 0.7', () => {
  assert.strictEqual(computeConfidence(SIGNAL_TYPES.ADDRESS_REACTIVATION, {}), 0.7);
});

test('Confidence determinism: same input -> same output', () => {
  const signalTypes = Object.values(SIGNAL_TYPES);
  for (const type of signalTypes) {
    const data1 = { valueUsdc: 100, inputLength: 500, txCount: 15, averageVolume: 100, interval: 600 };
    const data2 = { valueUsdc: 100, inputLength: 500, txCount: 15, averageVolume: 100, interval: 600 };
    const c1 = computeConfidence(type, data1);
    const c2 = computeConfidence(type, data2);
    assert.strictEqual(c1, c2, `Confidence for ${type} must be deterministic`);
  }
});

test('Confidence range: always between 0.5 and 0.9', () => {
  const testCases = [
    { type: SIGNAL_TYPES.LARGE_TRANSFER, data: { valueUsdc: 0 } },
    { type: SIGNAL_TYPES.LARGE_TRANSFER, data: { valueUsdc: 10000 } },
    { type: SIGNAL_TYPES.TOKEN_FLOW_ANOMALY, data: { valueUsdc: 0, averageVolume: 0 } },
    { type: SIGNAL_TYPES.TOKEN_FLOW_ANOMALY, data: { valueUsdc: 100000, averageVolume: 100 } },
    { type: SIGNAL_TYPES.CONTRACT_CREATION, data: { inputLength: 0 } },
    { type: SIGNAL_TYPES.CONTRACT_CREATION, data: { inputLength: 10000 } },
    { type: SIGNAL_TYPES.HIGH_FREQUENCY_WALLET, data: { txCount: 0 } },
    { type: SIGNAL_TYPES.HIGH_FREQUENCY_WALLET, data: { txCount: 100 } },
    { type: SIGNAL_TYPES.CONTRACT_INTERACTION, data: { inputLength: 0 } },
    { type: SIGNAL_TYPES.CONTRACT_INTERACTION, data: { inputLength: 10000 } },
    { type: SIGNAL_TYPES.WALLET_BURST, data: { txCount: 0 } },
    { type: SIGNAL_TYPES.WALLET_BURST, data: { txCount: 100 } },
    { type: SIGNAL_TYPES.ADDRESS_REACTIVATION, data: { interval: 0 } },
    { type: SIGNAL_TYPES.ADDRESS_REACTIVATION, data: { interval: 1000 } },
  ];
  
  for (const { type, data } of testCases) {
    const conf = computeConfidence(type, data);
    assert.ok(conf >= 0.5 && conf <= 0.9, `Confidence ${conf} for ${type} out of range [0.5, 0.9]`);
  }
});
