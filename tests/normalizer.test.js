// tests/normalizer.test.js
// Tests for the canonical normalization layer

const test = require('node:test');
const assert = require('node:assert');
const {
  normalizeBlockNumber,
  normalizeAddress,
  normalizeTxHash,
  normalizeBlockHash,
  normalizeLogIndex,
  normalizeValue,
  normalizeBlock,
  normalizeTransaction,
  normalizeLog,
  validateAndNormalizeBlockWithTxs,
} = require('../src/signal/normalizer');

// Helper: generate valid 66-char hex strings (0x + 64 hex)
const VALID_HASH = '0x' + 'a'.repeat(64);
const VALID_HASH_2 = '0x' + 'b'.repeat(64);
const VALID_ADDR = '0x' + 'c'.repeat(40);
const VALID_ADDR_2 = '0x' + 'd'.repeat(40);

test('normalizeBlockNumber: valid hex string', () => {
  assert.strictEqual(normalizeBlockNumber('0x1'), 1);
  assert.strictEqual(normalizeBlockNumber('0x39738a4'), 60242084);
  assert.strictEqual(normalizeBlockNumber('0x0'), 0);
});

test('normalizeBlockNumber: valid integer', () => {
  assert.strictEqual(normalizeBlockNumber(123), 123);
  assert.strictEqual(normalizeBlockNumber(0), 0);
});

test('normalizeBlockNumber: throws on negative number', () => {
  assert.throws(() => normalizeBlockNumber(-1), /Invalid block number/);
});

test('normalizeBlockNumber: throws on non-integer', () => {
  assert.throws(() => normalizeBlockNumber(1.5), /Invalid block number/);
});

test('normalizeBlockNumber: throws on symbolic tag', () => {
  assert.throws(() => normalizeBlockNumber('latest'), /Cannot normalize symbolic/);
  assert.throws(() => normalizeBlockNumber('earliest'), /Cannot normalize symbolic/);
  assert.throws(() => normalizeBlockNumber('pending'), /Cannot normalize symbolic/);
});

test('normalizeBlockNumber: throws on invalid format', () => {
  assert.throws(() => normalizeBlockNumber('abc'), /Invalid block number format/);
  assert.throws(() => normalizeBlockNumber('0xGG'), /Invalid block number format/);
});

test('normalizeAddress: valid address', () => {
  assert.strictEqual(normalizeAddress('0xAbCdEf1234567890abcdef1234567890AbCdEf12'), '0xabcdef1234567890abcdef1234567890abcdef12');
  assert.strictEqual(normalizeAddress(VALID_ADDR), VALID_ADDR.toLowerCase());
});

test('normalizeAddress: throws on invalid address', () => {
  assert.throws(() => normalizeAddress('0x123'), /Invalid address format/);
  assert.throws(() => normalizeAddress('abc'), /Invalid address format/);
  assert.throws(() => normalizeAddress(''), /Address is required/);
  assert.throws(() => normalizeAddress(null), /Address is required/);
});

test('normalizeTxHash: valid hash', () => {
  assert.strictEqual(normalizeTxHash(VALID_HASH.toUpperCase()), VALID_HASH.toLowerCase());
});

test('normalizeTxHash: throws on invalid length', () => {
  assert.throws(() => normalizeTxHash('0x123'), /must be 66 chars/);
  assert.throws(() => normalizeTxHash(VALID_HASH + '12'), /must be 66 chars/);
});

test('normalizeTxHash: throws on invalid format', () => {
  assert.throws(() => normalizeTxHash('abc'), /Invalid transaction hash format/);
});

test('normalizeBlockHash: valid hash', () => {
  assert.strictEqual(normalizeBlockHash(VALID_HASH.toUpperCase()), VALID_HASH.toLowerCase());
});

test('normalizeLogIndex: valid hex', () => {
  assert.strictEqual(normalizeLogIndex('0x1'), 1);
  assert.strictEqual(normalizeLogIndex('0x0'), 0);
  assert.strictEqual(normalizeLogIndex('0xFF'), 255);
});

test('normalizeLogIndex: valid integer', () => {
  assert.strictEqual(normalizeLogIndex(5), 5);
  assert.strictEqual(normalizeLogIndex(0), 0);
});

test('normalizeLogIndex: throws on negative', () => {
  assert.throws(() => normalizeLogIndex(-1), /Invalid log index/);
});

test('normalizeValue: valid hex string', () => {
  assert.strictEqual(normalizeValue('0x1'), 1n);
  assert.strictEqual(normalizeValue('0xde0b6b3a7640000'), 1000000000000000000n);
  assert.strictEqual(normalizeValue('0x0'), 0n);
});

test('normalizeValue: valid integer', () => {
  assert.strictEqual(normalizeValue(123), 123n);
  assert.strictEqual(normalizeValue(0), 0n);
});

test('normalizeValue: throws on negative', () => {
  assert.throws(() => normalizeValue(-1), /Value cannot be negative/);
});

test('normalizeBlock: valid block', () => {
  const block = {
    number: '0x1',
    hash: VALID_HASH,
    parentHash: VALID_HASH_2,
    timestamp: '0x5f5e100',
    miner: VALID_ADDR,
    gasLimit: '0x1c9c380',
    gasUsed: '0x10c8e8',
    baseFeePerGas: '0x4a817c800',
    transactions: [],
  };
  const normalized = normalizeBlock(block);
  assert.strictEqual(normalized.number, 1);
  assert.strictEqual(normalized.hash, VALID_HASH.toLowerCase());
  assert.strictEqual(normalized.miner, VALID_ADDR.toLowerCase());
  assert.strictEqual(normalized.gasLimit, 30000000n);
  assert.strictEqual(normalized.gasUsed, 1100008n);
  assert.strictEqual(normalized.baseFeePerGas, 20000000000n);
  assert.ok(Array.isArray(normalized.transactions));
});

test('normalizeBlock: throws on invalid block', () => {
  assert.throws(() => normalizeBlock(null), /Invalid block structure/);
  assert.throws(() => normalizeBlock({}), /Invalid block structure/);
  assert.throws(() => normalizeBlock({ number: '0x1' }), /Invalid block structure/);
});

test('normalizeTransaction: valid transaction', () => {
  const tx = {
    hash: VALID_HASH,
    from: VALID_ADDR,
    to: VALID_ADDR_2,
    value: '0xde0b6b3a7640000',
    gas: '0x5208',
    gasPrice: '0x4a817c800',
    nonce: '0x1',
    input: '0xa9059cbb0000000000000000000000001234567890abcdef1234567890abcdef1234567800000000000000000000000000000000000000000000000000000000000003e8',
    blockNumber: '0x1',
    blockHash: VALID_HASH,
    transactionIndex: '0x0',
    type: '0x2',
  };
  const normalized = normalizeTransaction(tx);
  assert.strictEqual(normalized.hash, VALID_HASH.toLowerCase());
  assert.strictEqual(normalized.from, VALID_ADDR.toLowerCase());
  assert.strictEqual(normalized.to, VALID_ADDR_2.toLowerCase());
  assert.strictEqual(normalized.value, 1000000000000000000n);
  assert.strictEqual(normalized.gas, 21000n);
  assert.strictEqual(normalized.gasPrice, 20000000000n);
  assert.strictEqual(normalized.nonce, 1);
  assert.strictEqual(normalized.inputLength, 68);
  assert.strictEqual(normalized.blockNumber, 1);
});

test('normalizeTransaction: contract creation (to=null)', () => {
  const tx = {
    hash: VALID_HASH,
    from: VALID_ADDR,
    to: null,
    value: '0x0',
    gas: '0x1c9c380',
    gasPrice: '0x4a817c800',
    nonce: '0x1',
    input: '0x608060405234801561001057600080fd5b506101',
    blockNumber: '0x1',
    blockHash: VALID_HASH,
    transactionIndex: '0x0',
    type: '0x0',
  };
  const normalized = normalizeTransaction(tx);
  assert.strictEqual(normalized.to, null);
  assert.ok(normalized.inputLength > 4);
});

test('normalizeTransaction: throws on invalid tx', () => {
  assert.throws(() => normalizeTransaction(null), /Invalid transaction structure/);
  assert.throws(() => normalizeTransaction({}), /Invalid transaction structure/);
  assert.throws(() => normalizeTransaction({ hash: '0x123' }), /Invalid transaction structure/);
});

test('normalizeLog: valid transfer log', () => {
  const log = {
    address: VALID_ADDR,
    topics: [
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      '0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    ],
    data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
    blockNumber: '0x1',
    blockHash: VALID_HASH,
    transactionHash: VALID_HASH,
    transactionIndex: '0x0',
    logIndex: '0x0',
    removed: false,
  };
  const normalized = normalizeLog(log);
  assert.strictEqual(normalized.address, VALID_ADDR.toLowerCase());
  assert.strictEqual(normalized.topics[0], log.topics[0].toLowerCase());
  assert.strictEqual(normalized.data, log.data);
  assert.strictEqual(normalized.blockNumber, 1);
  assert.strictEqual(normalized.logIndex, 0);
  assert.strictEqual(normalized.removed, false);
});

test('normalizeLog: throws on invalid log', () => {
  assert.throws(() => normalizeLog(null), /Invalid log structure/);
  assert.throws(() => normalizeLog({}), /Invalid log structure/);
  assert.throws(() => normalizeLog({ topics: [] }), /Invalid log structure/);
});

test('validateAndNormalizeBlockWithTxs: valid block with txs', () => {
  const block = {
    number: '0x1',
    hash: VALID_HASH,
    parentHash: VALID_HASH_2,
    timestamp: '0x5f5e100',
    miner: VALID_ADDR,
    gasLimit: '0x1c9c380',
    gasUsed: '0x10c8e8',
    baseFeePerGas: '0x4a817c800',
    transactions: [
      {
        hash: VALID_HASH,
        from: VALID_ADDR,
        to: VALID_ADDR_2,
        value: '0xde0b6b3a7640000',
        gas: '0x5208',
        gasPrice: '0x4a817c800',
        nonce: '0x1',
        input: '0xa9059cbb',
        blockNumber: '0x1',
        blockHash: VALID_HASH,
        transactionIndex: '0x0',
        type: '0x2',
      },
    ],
  };
  const normalized = validateAndNormalizeBlockWithTxs(block);
  assert.strictEqual(normalized.transactions.length, 1);
  assert.strictEqual(normalized.transactions[0].hash, VALID_HASH.toLowerCase());
});

test('validateAndNormalizeBlockWithTxs: throws on invalid tx', () => {
  const block = {
    number: '0x1',
    hash: VALID_HASH,
    parentHash: VALID_HASH_2,
    timestamp: '0x5f5e100',
    miner: VALID_ADDR,
    gasLimit: '0x1c9c380',
    gasUsed: '0x10c8e8',
    transactions: [
      { hash: '0x123' },
    ],
  };
  assert.throws(() => validateAndNormalizeBlockWithTxs(block), /Invalid transaction structure/);
});

test('normalizeBlock with transactions array', () => {
  const block = {
    number: '0x1',
    hash: VALID_HASH,
    parentHash: VALID_HASH_2,
    timestamp: '0x5f5e100',
    miner: VALID_ADDR,
    gasLimit: '0x1c9c380',
    gasUsed: '0x10c8e8',
    baseFeePerGas: '0x4a817c800',
    transactions: [
      {
        hash: VALID_HASH,
        from: VALID_ADDR,
        to: VALID_ADDR_2,
        value: '0xde0b6b3a7640000',
        gas: '0x5208',
        gasPrice: '0x4a817c800',
        nonce: '0x1',
        input: '0xa9059cbb',
        blockNumber: '0x1',
        blockHash: VALID_HASH,
        transactionIndex: '0x0',
        type: '0x2',
      },
    ],
  };
  const normalized = normalizeBlock(block);
  assert.strictEqual(normalized.transactions.length, 1);
  assert.strictEqual(normalized.transactions[0].hash, VALID_HASH.toLowerCase());
});