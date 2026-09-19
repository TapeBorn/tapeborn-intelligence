// src/signal/engine.js
// Signal Engine v0 — deterministic, evidence-backed signal detection.
// Enhanced with validation and logging (BUILD_013).
// Signal definitions per signal-spec.yaml v1.0.0 (R2 frozen).

const { getBlockByNumber, getBlockNumber, hexToInt } = require("../orchestrator/arc");
const logger = require("../orchestrator/logger");
const { validateBlock } = require("../orchestrator/validator");
const { generateSignalId } = require("../metadata/schema");
const { getSignalState } = require("./state");

// Configuration per signal-spec.yaml v1.0.0
const CONFIG = {
  largeTransferThreshold: 50, // USDC (absolute threshold per spec)
  contractCreationThreshold: 1,
  highFrequencyThreshold: 5, // per block
  contractInteractionInputLengthThreshold: 4, // bytes
  walletBurstThreshold: 10, // per 3-block window
  walletBurstWindowBlocks: 3, // sliding window
  tokenFlowAnomalyMinAbsolute: 1000, // USDC minimum
  tokenFlowAnomalyMultiplier: 2.0, // 2x chain average
  tokenFlowAnomalyWindowBlocks: 100, // rolling window for chain average
  addressReactivationThreshold: 100, // blocks of inactivity
  maxBlocks: 10,
};

// Signal types per signal-spec.yaml v1.0.0
const SIGNAL_TYPES = {
  LARGE_TRANSFER: "large_transfer",
  CONTRACT_CREATION: "contract_creation",
  HIGH_FREQUENCY_WALLET: "high_frequency_wallet",
  CONTRACT_INTERACTION: "contract_interaction",
  WALLET_BURST: "wallet_burst",
  TOKEN_FLOW_ANOMALY: "token_flow_anomaly",
  ADDRESS_REACTIVATION: "address_reactivation",
};

// Signal versions per signal-spec.yaml v1.0.0
const SIGNAL_VERSIONS = {
  large_transfer: "1.0.0",
  contract_creation: "1.0.0",
  high_frequency_wallet: "1.0.0",
  contract_interaction: "1.0.0",
  wallet_burst: "1.0.0",
  token_flow_anomaly: "1.0.0",
  address_reactivation: "1.0.0",
};

// Known contract addresses per chain (for contract_interaction detector)
// Configure via ARC_KNOWN_CONTRACTS env var (comma-separated) or leave empty for open detection
// Format: "0x1234...,0x5678..."
function getKnownContracts(chainId) {
  const envContracts = process.env.ARC_KNOWN_CONTRACTS;
  if (envContracts) {
    return envContracts.split(",").map(s => s.trim()).filter(Boolean);
  }
  // Default empty - open detection mode (any contract with data > 4 bytes)
  // Production should set ARC_KNOWN_CONTRACTS explicitly
  return [];
}

// Lazy getter for signalState - creates new instance if env var changed or first access
let _signalStateCache = null;
let _signalStateCacheEnv = null;

function getSignalStateInstance() {
  // Force re-read of env var each time to support test isolation
  const dbPath = process.env.SIGNAL_STATE_DB || null;

  // Check if we need to create a new instance
  if (!_signalStateCache || _signalStateCacheEnv !== process.env.SIGNAL_STATE_DB) {
    // Close old instance if it exists
    if (global._signalStateInstance) {
      try {
        global._signalStateInstance.close();
      } catch (e) {
        // ignore close errors
      }
    }
    global._signalStateInstance = require("./state").getSignalState(process.env.SIGNAL_STATE_DB || null);
    _signalStateCacheEnv = process.env.SIGNAL_STATE_DB;
  }
  return global._signalStateInstance;
}

// Export signalState getter for backward compatibility
const signalState = {
  getLastSeen: (address) => getSignalStateInstance().getLastSeen(address),
  setLastSeen: (address, blockNumber, timestamp) => getSignalStateInstance().setLastSeen(address, blockNumber, timestamp),
  setLastSeenBatch: (updates) => getSignalStateInstance().setLastSeenBatch(updates),
  getChainAverageVolume: (chainId) => getSignalStateInstance().getChainAverageVolume(chainId),
  setChainAverageVolume: (chainId, averageVolumeUsdc, windowBlocks, lastUpdatedBlock) =>
    getSignalStateInstance().setChainAverageVolume(chainId, averageVolumeUsdc, windowBlocks, lastUpdatedBlock),
  getState: (key) => getSignalStateInstance().getState(key),
  setState: (key, value) => getSignalStateInstance().setState(key, value),
  deleteState: (key) => getSignalStateInstance().deleteState(key),
  pruneOldAddressRecords: (olderThanTimestamp) => getSignalStateInstance().pruneOldAddressRecords(olderThanTimestamp),
  close: () => getSignalStateInstance().close(),
  isClosed: () => getSignalStateInstance().isClosed ? getSignalStateInstance().isClosed() : false
};

/**
 * Compute signal quality/completeness based on type and available data/evidence.
 * Returns an object with 'status' ('complete' or 'partial') and 'missing' array.
 * Quality rules per signal-spec.yaml v1.0.0
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
 * Generate a signal object with canonical Signal ID per signal-spec.yaml v1.0.0
 * Signal ID uses keccak256 canonical payload per signal-spec.yaml
 * Signal version per signal-spec.yaml v1.0.0
 */
function createSignal(type, data, evidence) {
  const quality = computeSignalQuality(type, data, evidence);
  // Build provenance-like object for deterministic ID generation
  const provenance = {
    block: data?.blockNumber || data?.block || '0',
    sourceTransaction: evidence?.txHash || data?.txHash || '0x',
    from: data?.from || evidence?.from || '0x',
    to: data?.to || '',
    contractAddress: data?.contractAddress || '',
    blockHash: data?.blockHash || '0x',
    logIndex: data?.logIndex !== undefined ? data.logIndex : '0',
  };
  // Use deterministic Signal ID from metadata/schema (keccak256 canonical payload)
  const signalId = generateSignalId({ type, data, evidence, version: SIGNAL_VERSIONS[type] || "1.0.0" }, provenance);
  return {
    id: signalId,
    type,
    timestamp: new Date().toISOString(),
    data,
    evidence,
    confidence: 0.8, // default, will be overridden by confidenceRule per signal type
    version: SIGNAL_VERSIONS[type] || "1.0.0", // per signal-spec.yaml v1.0.0
    quality, // added in BUILD_018
  };
}

/**
 * Detect large transfers (USDC value > threshold)
 * Per spec: absolute threshold 50 USDC (NOT relative to chain average)
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
          tokenAddress: "0x...", // USDC contract - should be per chain config
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
 * Per spec: to === null AND input.length > 4 bytes
 */
function detectContractCreations(block) {
  const signals = [];
  const txs = block.transactions || [];
  for (const tx of txs) {
    if (tx.to === null) {
      const inputLength = (tx.input || "0x").length - 2;
      if (inputLength > CONFIG.contractCreationThreshold) {
        signals.push(createSignal(
          SIGNAL_TYPES.CONTRACT_CREATION,
          {
            from: tx.from,
            blockNumber: hexToInt(block.number),
            txHash: tx.hash,
            inputLength,
          },
          {
            block: block.number,
            txHash: tx.hash,
            description: `Contract created by ${tx.from.slice(0, 10)}... (input length ${inputLength})`
          }
        ));
      }
    }
  }
  return signals;
}

/**
 * Detect high-frequency wallets (many tx in a single block)
 * Per spec: threshold 5 tx per block
 */
function detectHighFrequencyWallets(block, threshold = CONFIG.highFrequencyThreshold) {
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
 * Detect contract interactions (to is a known contract and input data > 4 bytes)
 * Per spec: tx.to in knownContracts AND input.length > 4 bytes
 * If no known contracts configured, treats any non-null to with data > 4 bytes as interaction
 */
function detectContractInteractions(block, knownContracts = []) {
  const signals = [];
  const txs = block.transactions || [];
  // Get chain-specific known contracts from environment
  const chainId = parseInt(process.env.ARC_CHAIN_ID) || 5042002;
  const chainKnownContracts = getKnownContracts(parseInt(process.env.ARC_CHAIN_ID) || 5042002);
  const allKnownContracts = [...new Set([...knownContracts, ...chainKnownContracts])];

  for (const tx of txs) {
    const input = tx.input || "0x";
    const inputLength = input.length - 2;
    if (tx.to !== null && inputLength > CONFIG.contractInteractionInputLengthThreshold) {
      // Check if knownContracts list is provided, otherwise treat any non-null to with data as interaction
      const isKnown = allKnownContracts.length === 0 || allKnownContracts.includes(tx.to);
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
 * Per spec: sliding window of 3 blocks, threshold 10 transactions.
 * TODO: Full sliding window implementation requires state across blocks.
 * Current implementation: per-block count with note about window limitation.
 */
function detectWalletBurst(block, threshold = CONFIG.walletBurstThreshold) {
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
          // Note: Full sliding window (3 blocks) requires state across blocks
          // This is a simplified per-block implementation
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
 * Detect token flow anomaly: USDC transfer value significantly exceeds historical average.
 * Per spec: valueUsdc >= max(2 * chainAverageUSDC(last_100_blocks), 1000 USDC)
 * TODO: Implement rolling 100-block average calculation (requires state across blocks)
 * Current: Uses fixed threshold as fallback; chain average calculation requires persistent state.
 */
function detectTokenFlowAnomaly(block, threshold = CONFIG.tokenFlowAnomalyMinAbsolute) {
  const signals = [];
  const txs = block.transactions || [];
  for (const tx of txs) {
    const value = BigInt(tx.value || "0x0");
    const valueUsdc = Number(value) / 1e18;
    // Per spec: threshold = max(2 * chainAverageUSDC(last_100_blocks), 1000 USDC)
    // For now using minimum absolute threshold; chain average requires persistent state
    const effectiveThreshold = Math.max(threshold, CONFIG.tokenFlowAnomalyMinAbsolute);
    if (valueUsdc >= effectiveThreshold) {
      signals.push(createSignal(
        SIGNAL_TYPES.TOKEN_FLOW_ANOMALY,
        {
          from: tx.from,
          to: tx.to,
          valueUsdc,
          averageVolume: threshold, // placeholder - should be chain average
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
 * Detect address reactivation: address inactive for >100 blocks sends a transaction.
 * Per spec: lastSeen == 0 OR interval > 100 blocks
 * Uses persistent SQLite storage (R4)
 */
function detectAddressReactivation(block, inactivityThreshold = CONFIG.addressReactivationThreshold) {
  const signals = [];
  const txs = block.transactions || [];
  const currentBlock = hexToInt(block.number);
  for (const tx of txs) {
    const from = tx.from;
    const normalizedAddress = from.toLowerCase();
    const lastSeenData = getSignalStateInstance().getLastSeen(normalizedAddress);
    const lastSeen = lastSeenData.lastSeenBlock;
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
    getSignalStateInstance().setLastSeen(from, currentBlock);
  }
  return signals;
}

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
  getKnownContracts,
  signalState, // R4: persistent signal state
};