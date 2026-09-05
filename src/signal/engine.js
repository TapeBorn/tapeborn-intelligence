// src/signal/engine.js
// Signal Engine v0 — deterministic, evidence-backed signal detection.
// Enhanced with validation and logging (BUILD_013).

const { getBlockByNumber, getBlockNumber, hexToInt } = require("../orchestrator/arc");
const logger = require("../orchestrator/logger");
const { validateBlock } = require("../orchestrator/validator");
const { generateSignalId } = require("../metadata/schema");

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
  CONTRACT_INTERACTION: "contract_interaction",
  WALLET_BURST: "wallet_burst",
  TOKEN_FLOW_ANOMALY: "token_flow_anomaly",
  ADDRESS_REACTIVATION: "address_reactivation",
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
    contract_interaction: ['evidence.txHash', 'evidence.block', 'data.inputLength', 'data.contractAddress'],
    wallet_burst: ['data.txCount', 'data.sender'],
    token_flow_anomaly: ['evidence.txHash', 'evidence.block', 'data.valueUsdc', 'data.from'],
    address_reactivation: ['evidence.txHash', 'evidence.block', 'data.from', 'data.lastSeenBlock'],
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
  // Build provenance-like object for deterministic ID generation
  const provenance = {
    block: data?.blockNumber || data?.block || '0',
    sourceTransaction: evidence?.txHash || data?.txHash || '0x',
    from: data?.from || evidence?.from || '0x',
  };
  // Use deterministic Signal ID from BUILD_011
  const signalId = generateSignalId({ type, data, evidence }, provenance);
  return {
    id: signalId,
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
 * Detect contract interactions (to is a contract and input data is present)
 */
function detectContractInteractions(block, knownContracts = []) {
  const signals = [];
  const txs = block.transactions || [];
  // Simple heuristic: if to is not null and input length > 4 bytes, treat as contract interaction
  // In practice, we could maintain a list of known contract addresses.
  for (const tx of txs) {
    const input = tx.input || "0x";
    const inputLength = input.length - 2;
    if (tx.to !== null && inputLength > 4) {
      // Check if knownContracts list is provided, otherwise treat any non-null to with data as interaction
      const isKnown = knownContracts.length === 0 || knownContracts.includes(tx.to);
      if (isKnown) {
        signals.push(createSignal(
          SIGNAL_TYPES.CONTRACT_INTERACTION,
          {
            from: tx.from,
            to: tx.to,
            blockNumber: hexToInt(block.number),
            txHash: tx.hash,
            inputLength,
            contractAddress: tx.to,
            valueUsdc: Number(BigInt(tx.value || "0x0")) / 1e18,
          },
          {
            block: block.number,
            txHash: tx.hash,
            description: `Contract interaction: ${tx.from.slice(0, 10)}... → ${tx.to.slice(0, 10)}... (input ${inputLength} bytes)`
          }
        ));
      }
    }
  }
  return signals;
}

/**
 * Detect wallet burst: a wallet sends many transactions in a short time.
 * This function is called per block, but burst detection requires sliding window.
 * We'll implement a simple version: within the current block, count transactions from same sender.
 * For full burst detection, we'd need state across blocks. We'll implement a simplified version that marks
 * any sender with >5 tx in a single block as a burst candidate.
 */
function detectWalletBurst(block, threshold = 5) {
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
        SIGNAL_TYPES.WALLET_BURST,
        {
          sender: addr,
          txCount: count,
          blockNumber: hexToInt(block.number),
          firstBlock: block.number,
          lastBlock: block.number,
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
 * Detect token flow anomaly: USDC transfer value > 2x average (or threshold).
 * We'll use a fixed threshold for simplicity, or compute average from recent blocks.
 */
function detectTokenFlowAnomaly(block, threshold = 1000) {
  const signals = [];
  const txs = block.transactions || [];
  for (const tx of txs) {
    const value = BigInt(tx.value || "0x0");
    const valueUsdc = Number(value) / 1e18;
    if (valueUsdc >= threshold) {
      signals.push(createSignal(
        SIGNAL_TYPES.TOKEN_FLOW_ANOMALY,
        {
          from: tx.from,
          to: tx.to,
          valueUsdc,
          averageVolume: threshold,
          blockNumber: hexToInt(block.number),
          txHash: tx.hash,
        },
        {
          block: block.number,
          txHash: tx.hash,
          description: `Anomalous USDC flow: ${valueUsdc.toFixed(2)} USDC from ${tx.from.slice(0, 10)}... to ${tx.to?.slice(0, 10)}...`
        }
      ));
    }
  }
  return signals;
}

/**
 * Detect address reactivation: address with no prior tx in last N blocks.
 * This requires state across blocks. We'll implement a simplified version: if blockNumber > lastSeenBlock + 100.
 * For this, we need a map of last seen block per address. We'll maintain a global map.
 */
const lastSeenMap = {};
function detectAddressReactivation(block, inactivityThreshold = 100) {
  const signals = [];
  const txs = block.transactions || [];
  const currentBlock = hexToInt(block.number);
  for (const tx of txs) {
    const from = tx.from;
    const lastSeen = lastSeenMap[from] || 0;
    const interval = currentBlock - lastSeen;
    if (lastSeen === 0 || interval > inactivityThreshold) {
      signals.push(createSignal(
        SIGNAL_TYPES.ADDRESS_REACTIVATION,
        {
          from,
          blockNumber: currentBlock,
          txHash: tx.hash,
          lastSeenBlock: lastSeen,
          interval,
        },
        {
          block: block.number,
          txHash: tx.hash,
          description: `Address ${from.slice(0, 10)}... reactivated after ${interval} blocks`
        }
      ));
    }
    // Update last seen
    lastSeenMap[from] = currentBlock;
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
      signals.push(...detectContractInteractions(block));
      signals.push(...detectWalletBurst(block));
      signals.push(...detectTokenFlowAnomaly(block));
      signals.push(...detectAddressReactivation(block));
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
  detectContractInteractions,
  detectWalletBurst,
  detectTokenFlowAnomaly,
  detectAddressReactivation,
  createSignal,
  SIGNAL_TYPES,
  CONFIG,
};