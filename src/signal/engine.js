// src/signal/engine.js
// Signal Engine v0 — deterministic, evidence-backed signal detection.
// Enhanced with validation and logging (BUILD_013).

const { getBlockByNumber, getBlockNumber, hexToInt } = require("../orchestrator/arc");
const logger = require("../orchestrator/logger");
const { validateBlock } = require("../orchestrator/validator");

// Configuration
const CONFIG = {
  largeTransferThreshold: 50, // USDC
  contractCreationThreshold: 1,
  maxBlocks: 10,
};

/**
 * Signal types
 */
const SIGNAL_TYPES = {
  LARGE_TRANSFER: "large_transfer",
  CONTRACT_CREATION: "contract_creation",
  HIGH_FREQUENCY_WALLET: "high_frequency_wallet",
  UNUSUAL_INFLOW: "unusual_inflow",
};

/**
 * Compute signal quality/completeness based on type and available data/evidence.
 * Returns an object with 'status' ('complete' or 'partial') and 'missing' array.
 */
function computeSignalQuality(type, data, evidence) {
  const missing = [];
  const required = {
    large_transfer: ['evidence.txHash', 'evidence.block', 'data.valueUsdc'],
    contract_creation: ['evidence.txHash', 'evidence.block', 'data.inputLength'],
    high_frequency_wallet: ['evidence.block', 'data.txCount'],
  };
  const fields = required[type] || [];
  for (const field of fields) {
    const parts = field.split('.');
    let val;
    if (parts[0] === 'evidence') val = evidence?.[parts[1]];
    else if (parts[0] === 'data') val = data?.[parts[1]];
    if (val === undefined || val === null) missing.push(field);
  }
  return {
    status: missing.length === 0 ? 'complete' : 'partial',
    missing,
  };
}

/**
 * Generate a signal object
 * Signal ID is now deterministic using BUILD_011 logic if available, but for backwards compatibility we keep the old format.
 * In production, BUILD_011's generateSignalId should be used.
 */
function createSignal(type, data, evidence) {
  const quality = computeSignalQuality(type, data, evidence);
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    timestamp: new Date().toISOString(),
    data,
    evidence,
    confidence: 0.8, // default, can be adjusted per detector
    version: "v0",
    quality, // added in BUILD_018
  };
}

/**
 * Detect large transfers (USDC value > threshold)
 */
function detectLargeTransfers(block, threshold = CONFIG.largeTransferThreshold) {
  const signals = [];
  const txs = block.transactions || [];
  for (const tx of txs) {
    const value = BigInt(tx.value || "0x0");
    const valueUsdc = Number(value) / 1e18;
    if (valueUsdc >= threshold) {
      signals.push(createSignal(
        SIGNAL_TYPES.LARGE_TRANSFER,
        {
          from: tx.from,
          to: tx.to,
          valueWei: value.toString(),
          valueUsdc,
          blockNumber: hexToInt(block.number),
          txHash: tx.hash,
        },
        {
          block: block.number,
          txHash: tx.hash,
          description: `Transfer of ${valueUsdc.toFixed(2)} USDC from ${tx.from.slice(0, 10)}... to ${tx.to?.slice(0, 10)}...`
        }
      ));
    }
  }
  return signals;
}

/**
 * Detect contract creations (to === null)
 */
function detectContractCreations(block) {
  const signals = [];
  const txs = block.transactions || [];
  for (const tx of txs) {
    if (tx.to === null) {
      signals.push(createSignal(
        SIGNAL_TYPES.CONTRACT_CREATION,
        {
          from: tx.from,
          blockNumber: hexToInt(block.number),
          txHash: tx.hash,
          inputLength: (tx.input || "0x").length - 2,
        },
        {
          block: block.number,
          txHash: tx.hash,
          description: `Contract created by ${tx.from.slice(0, 10)}... (input length ${(tx.input || "0x").length - 2})`
        }
      ));
    }
  }
  return signals;
}

/**
 * Detect high-frequency wallets (many tx in a single block)
 * Only if a wallet appears more than a threshold number of times in a block
 */
function detectHighFrequencyWallets(block, threshold = 5) {
  const signals = [];
  const txs = block.transactions || [];
  const countMap = {};
  for (const tx of txs) {
    const from = tx.from;
    countMap[from] = (countMap[from] || 0) + 1;
  }
  for (const [addr, count] of Object.entries(countMap)) {
    if (count >= threshold) {
      signals.push(createSignal(
        SIGNAL_TYPES.HIGH_FREQUENCY_WALLET,
        {
          address: addr,
          txCount: count,
          blockNumber: hexToInt(block.number),
        },
        {
          block: block.number,
          description: `Wallet ${addr.slice(0, 10)}... sent ${count} transactions in block ${block.number}`
        }
      ));
    }
  }
  return signals;
}

/**
 * Detect unusual inflows: a wallet receiving large amount from a single tx
 * (similar to large transfer, but we can combine or focus on receiver)
 * For simplicity, we'll just mark large transfers with receiver emphasis.
 */

/**
 * Main engine: scan blocks and collect signals
 */
async function scanBlocks(fromBlock, toBlock) {
  if (fromBlock > toBlock) {
    logger.warn('[Engine] Invalid block range', { fromBlock, toBlock });
    return [];
  }
  const count = toBlock - fromBlock + 1;
  logger.info(`[Engine] Scanning ${count} blocks: ${fromBlock}-${toBlock}`);
  const signals = [];
  for (let i = fromBlock; i <= toBlock; i++) {
    try {
      const block = await getBlockByNumber("0x" + i.toString(16), true);
      if (!block) {
        logger.warn(`[Engine] Block ${i} not found, skipping`);
        continue;
      }
      if (!validateBlock(block, `block:${i}`)) {
        logger.warn(`[Engine] Block ${i} invalid, skipping`);
        continue;
      }
      signals.push(...detectLargeTransfers(block));
      signals.push(...detectContractCreations(block));
      signals.push(...detectHighFrequencyWallets(block));
    } catch (e) {
      logger.error(`[Engine] Error scanning block ${i}`, { error: e.message });
    }
  }
  logger.info(`[Engine] Found ${signals.length} signals`);
  return signals;
}

module.exports = {
  scanBlocks,
  detectLargeTransfers,
  detectContractCreations,
  detectHighFrequencyWallets,
  createSignal,
  SIGNAL_TYPES,
  CONFIG,
};