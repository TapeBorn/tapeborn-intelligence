// src/orchestrator/validator.js
// Input validation for RPC and blockchain data

const logger = require('./logger');

function isValidBlockNumber(blockNumber) {
  if (typeof blockNumber === 'number' && Number.isInteger(blockNumber) && blockNumber >= 0) {
    return true;
  }
  if (typeof blockNumber === 'string' && /^0x[0-9a-fA-F]+$/.test(blockNumber)) {
    return true;
  }
  if (blockNumber === 'latest' || blockNumber === 'earliest' || blockNumber === 'pending') {
    return true;
  }
  return false;
}

function validateBlockNumber(blockNumber, context = 'block') {
  if (!isValidBlockNumber(blockNumber)) {
    logger.warn(`[Validator] Invalid block number: ${blockNumber}`, { context });
    return false;
  }
  return true;
}

function isValidBlock(block) {
  if (!block) return false;
  if (typeof block !== 'object') return false;
  if (!block.number && block.number !== 0) return false;
  if (!block.hash || typeof block.hash !== 'string') return false;
  if (!block.transactions || !Array.isArray(block.transactions)) return false;
  return true;
}

function validateBlock(block, context = 'block') {
  if (!isValidBlock(block)) {
    logger.warn(`[Validator] Invalid block data`, { context });
    return false;
  }
  return true;
}

function isValidTransaction(tx) {
  if (!tx) return false;
  if (typeof tx !== 'object') return false;
  if (!tx.hash || typeof tx.hash !== 'string') return false;
  if (tx.from === undefined || tx.from === null) return false;
  return true;
}

function validateTransaction(tx, context = 'tx') {
  if (!isValidTransaction(tx)) {
    logger.warn(`[Validator] Invalid transaction`, { context });
    return false;
  }
  return true;
}

function isValidHexString(str) {
  return typeof str === 'string' && /^0x[0-9a-fA-F]*$/.test(str);
}

function isValidAddress(str) {
  return isValidHexString(str) && str.length === 42;
}

module.exports = {
  isValidBlockNumber,
  validateBlockNumber,
  isValidBlock,
  validateBlock,
  isValidTransaction,
  validateTransaction,
  isValidHexString,
  isValidAddress,
};