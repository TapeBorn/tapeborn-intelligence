// tests/trace-derivation.test.js
// Deterministic Trace derivation tests (prototype for Trace-linked Mint mechanic)

const test = require('node:test');
const assert = require('node:assert');
const { deriveTrace } = require('../scripts/trace_derivation_prototype');

test('Trace derivation: same input → same output', () => {
  const txHash = '0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0587';
  const blockNumber = 60347218;
  const trace1 = deriveTrace(txHash, blockNumber);
  const trace2 = deriveTrace(txHash, blockNumber);
  assert.deepStrictEqual(trace1, trace2, 'same input should produce same trace');
});

test('Trace derivation: different tx hash → different output', () => {
  const blockNumber = 60347218;
  const trace1 = deriveTrace('0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0587', blockNumber);
  const trace2 = deriveTrace('0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0588', blockNumber); // last char changed
  assert.notDeepStrictEqual(trace1, trace2, 'different tx hash should produce different trace');
});

test('Trace derivation: different block number → different output', () => {
  const txHash = '0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0587';
  const trace1 = deriveTrace(txHash, 60347218);
  const trace2 = deriveTrace(txHash, 60347219);
  assert.notDeepStrictEqual(trace1, trace2, 'different block number should produce different trace');
});

test('Trace derivation: repeated execution → identical output', () => {
  const txHash = '0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0587';
  const blockNumber = 60347218;
  const traces = [];
  for (let i = 0; i < 10; i++) {
    traces.push(deriveTrace(txHash, blockNumber));
  }
  const allSame = traces.every(t => t.entry[0] === traces[0].entry[0] && t.entry[1] === traces[0].entry[1] &&
                                      t.exit[0] === traces[0].exit[0] && t.exit[1] === traces[0].exit[1] &&
                                      t.bends === traces[0].bends);
  assert.ok(allSame, 'repeated execution should produce identical trace');
});

test('Trace derivation: no timestamp/randomness dependency', () => {
  const txHash = '0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0587';
  const blockNumber = 60347218;
  const trace1 = deriveTrace(txHash, blockNumber);
  // We don't actually wait, just call again immediately; the function is deterministic so it should be the same.
  const trace2 = deriveTrace(txHash, blockNumber);
  assert.deepStrictEqual(trace1, trace2, 'Trace should not depend on time or randomness');
});

test('Trace derivation: output values within expected ranges', () => {
  const txHash = '0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0587';
  const blockNumber = 60347218;
  const trace = deriveTrace(txHash, blockNumber);
  // entry and exit coordinates between 0 and 9
  assert.ok(trace.entry[0] >= 0 && trace.entry[0] <= 9);
  assert.ok(trace.entry[1] >= 0 && trace.entry[1] <= 9);
  assert.ok(trace.exit[0] >= 0 && trace.exit[0] <= 9);
  assert.ok(trace.exit[1] >= 0 && trace.exit[1] <= 9);
  // bends either 1 or 2
  assert.ok(trace.bends === 1 || trace.bends === 2);
  // entry and exit must not be the same
  assert.notDeepStrictEqual(trace.entry, trace.exit, 'entry and exit points must be different');
});

test('Trace derivation: works with sample data from genesis', () => {
  // This is the same sample as in the prototype's direct run
  const txHash = '0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0587';
  const blockNumber = 60347218;
  const trace = deriveTrace(txHash, blockNumber);
  // We don't assert specific values because the algorithm is fixed, but we can check that it runs and returns an object.
  assert.ok(trace.entry && trace.exit && trace.bends);
});