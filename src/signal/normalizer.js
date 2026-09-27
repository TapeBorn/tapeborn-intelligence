// src/signal/normalizer.js
// Canonical normalization layer for blockchain data
// Normalizes RPC/block/transaction/log representations into a canonical internal structure

const { hexToInt, hexToBig } = require("../orchestrator/arc");
const { isValidBlockNumber, isValidBlock, isValidTransaction, isValidAddress, isValidHexString } = require("../orchestrator/validator");

/**
 * Normalize a block number to integer
 * @param {string|number} blockNumber - block number in hex string or integer
 * @returns {number} normalized block number
 * @throws {Error} if invalid
 */
function normalizeBlockNumber(blockNumber) {
  if (typeof blockNumber === 'number') {
    if (!Number.isInteger(blockNumber) || blockNumber < 0) {
      throw new Error(`Invalid block number: ${blockNumber}`);
    }
    return blockNumber;
  }
  if (typeof blockNumber === 'string') {
    if (blockNumber === 'latest' || blockNumber === 'earliest' || blockNumber === 'pending') {
      throw new Error(`Cannot normalize symbolic block tag: ${blockNumber}`);
    }
    if (!isValidBlockNumber(blockNumber)) {
      throw new Error(`Invalid block number format: ${blockNumber}`);
    }
    return hexToInt(blockNumber);
  }
  throw new Error(`Block number must be string or number, got: ${typeof blockNumber}`);
}

/**
 * Normalize an address to lowercase checksummed format
 * @param {string} address - Ethereum address
 * @returns {string} normalized address (lowercase)
 * @throws {Error} if invalid
 */
function normalizeAddress(address) {
  if (!address) throw new Error('Address is required');
  if (!isValidAddress(address)) throw new Error(`Invalid address format: ${address}`);
  return address.toLowerCase();
}

/**
 * Normalize a transaction hash
 * @param {string} txHash - transaction hash
 * @returns {string} normalized hash (lowercase with 0x prefix)
 * @throws {Error} if invalid
 */
function normalizeTxHash(txHash) {
  if (!txHash) throw new Error('Transaction hash is required');
  if (!isValidHexString(txHash)) throw new Error(`Invalid transaction hash format: ${txHash}`);
  const normalized = txHash.toLowerCase();
  if (normalized.length !== 66) throw new Error(`Transaction hash must be 66 chars (0x + 64 hex), got: ${normalized.length}`);
  return normalized;
}

/**
 * Normalize a block hash
 * @param {string} blockHash - block hash
 * @returns {string} normalized hash (lowercase with 0x prefix)
 * @throws {Error} if invalid
 */
function normalizeBlockHash(blockHash) {
  if (!blockHash) throw new Error('Block hash is required');
  if (!isValidHexString(blockHash)) throw new Error(`Invalid block hash format: ${blockHash}`);
  const normalized = blockHash.toLowerCase();
  if (normalized.length !== 66) throw new Error(`Block hash must be 66 chars (0x + 64 hex), got: ${normalized.length}`);
  return normalized;
}

/**
 * Normalize log index to integer
 * @param {string|number} logIndex - log index
 * @returns {number} normalized log index
 * @throws {Error} if invalid
 */
function normalizeLogIndex(logIndex) {
  if (typeof logIndex === 'number') {
    if (!Number.isInteger(logIndex) || logIndex < 0) {
      throw new Error(`Invalid log index: ${logIndex}`);
    }
    return logIndex;
  }
  if (typeof logIndex === 'string') {
    if (!isValidHexString(logIndex)) throw new Error(`Invalid log index format: ${logIndex}`);
    return hexToInt(logIndex);
  }
  throw new Error(`Log index must be string or number, got: ${typeof logIndex}`);
}

/**
 * Normalize a numeric value from hex string to BigInt
 * @param {string|number|bigint} value - value in hex string, number, or bigint
 * @returns {bigint} normalized value
 * @throws {Error} if invalid
 */
function normalizeValue(value) {
  if (typeof value === 'bigint') {
    if (value < 0n) throw new Error(`Value cannot be negative: ${value}`);
    return value;
  }
  if (typeof value === 'number') {
    if (value < 0) throw new Error(`Value cannot be negative: ${value}`);
    return BigInt(value);
  }
  if (typeof value === 'string') {
    if (!isValidHexString(value)) throw new Error(`Invalid value format: ${value}`);
    return hexToBig(value);
  }
  throw new Error(`Value must be string, number, or bigint, got: ${typeof value}`);
}

/**
 * Normalize a block object into canonical structure
 * @param {Object} block - raw block from RPC
 * @returns {Object} normalized block
 * @throws {Error} if block is invalid
 */
function normalizeBlock(block) {
  if (!isValidBlock(block)) throw new Error('Invalid block structure');
  
  return {
    number: normalizeBlockNumber(block.number),
    hash: normalizeBlockHash(block.hash),
    parentHash: normalizeBlockHash(block.parentHash),
    timestamp: typeof block.timestamp === 'string' ? hexToInt(block.timestamp) : Number(block.timestamp),
    miner: normalizeAddress(block.miner),
    gasLimit: normalizeValue(block.gasLimit),
    gasUsed: normalizeValue(block.gasUsed),
    baseFeePerGas: block.baseFeePerGas ? normalizeValue(block.baseFeePerGas) : null,
    transactions: Array.isArray(block.transactions) ? block.transactions.map(normalizeTransaction) : [],
    size: block.size ? normalizeValue(block.size) : null,
    txCount: Array.isArray(block.transactions) ? block.transactions.length : 0,
  };
}

/**
 * Normalize a transaction object into canonical structure
 * @param {Object} tx - raw transaction from RPC
 * @returns {Object} normalized transaction
 * @throws {Error} if transaction is invalid
 */
function normalizeTransaction(tx) {
  if (!isValidTransaction(tx)) throw new Error('Invalid transaction structure');
  
  return {
    hash: normalizeTxHash(tx.hash),
    from: normalizeAddress(tx.from),
    to: tx.to ? normalizeAddress(tx.to) : null,
    value: normalizeValue(tx.value || '0x0'),
    gas: normalizeValue(tx.gas),
    gasPrice: tx.gasPrice ? normalizeValue(tx.gasPrice) : null,
    maxFeePerGas: tx.maxFeePerGas ? normalizeValue(tx.maxFeePerGas) : null,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? normalizeValue(tx.maxPriorityFeePerGas) : null,
    nonce: typeof tx.nonce === 'string' ? hexToInt(tx.nonce) : Number(tx.nonce),
    input: tx.input || '0x',
    inputLength: (tx.input || '0x').length > 2 ? (tx.input.length - 2) / 2 : 0,
    blockNumber: tx.blockNumber ? normalizeBlockNumber(tx.blockNumber) : null,
    blockHash: tx.blockHash ? normalizeBlockHash(tx.blockHash) : null,
    transactionIndex: tx.transactionIndex !== undefined ? 
      (typeof tx.transactionIndex === 'string' ? hexToInt(tx.transactionIndex) : Number(tx.transactionIndex)) : null,
    type: tx.type !== undefined ? (typeof tx.type === 'string' ? hexToInt(tx.type) : Number(tx.type)) : 0,
  };
}

/**
 * Normalize a log object into canonical structure
 * @param {Object} log - raw log from RPC
 * @returns {Object} normalized log
 * @throws {Error} if log is invalid
 */
function normalizeLog(log) {
  if (!log || !log.topics || !Array.isArray(log.topics) || log.topics.length === 0) {
    throw new Error('Invalid log structure: missing topics');
  }
  
  return {
    address: normalizeAddress(log.address),
    topics: log.topics.map(t => t.toLowerCase()),
    data: log.data || '0x',
    blockNumber: log.blockNumber ? normalizeBlockNumber(log.blockNumber) : null,
    blockHash: log.blockHash ? normalizeBlockHash(log.blockHash) : null,
    transactionHash: log.transactionHash ? normalizeTxHash(log.transactionHash) : null,
    transactionIndex: log.transactionIndex !== undefined ?
      (typeof log.transactionIndex === 'string' ? hexToInt(log.transactionIndex) : Number(log.transactionIndex)) : null,
    logIndex: log.logIndex !== undefined ? normalizeLogIndex(log.logIndex) : null,
    removed: log.removed === true,
  };
}

/**
 * Validate and normalize a complete block with transactions
 * @param {Object} block - raw block with transactions
 * @returns {Object} normalized block with normalized transactions
 * @throws {Error} if invalid
 */
function validateAndNormalizeBlockWithTxs(block) {
  const normalizedBlock = normalizeBlock(block);
  // Validate each transaction
  if (normalizedBlock.transactions && normalizedBlock.transactions.length > 0) {
    for (let i = 0; i < normalizedBlock.transactions.length; i++) {
      try {
        normalizedBlock.transactions[i] = normalizeTransaction(normalizedBlock.transactions[i]);
      } catch (e) {
        throw new Error(`Transaction at index ${i} invalid: ${e.message}`);
      }
    }
  }
  return normalizedBlock;
}

module.exports = {
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
};
