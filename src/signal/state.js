// src/signal/state.js
// Persistent signal state using SQLite (R4)
// Replaces in-memory lastSeenMap with persistent SQLite storage

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const pathModule = require('path');
const logger = require('../orchestrator/logger');

class SignalState {
  constructor(dbPath = null) {
    // Default to .data/signal-state.sqlite in project root
    if (!dbPath) {
      const projectRoot = pathModule.resolve(__dirname, '..', '..');
      const dataDir = pathModule.join(projectRoot, '.data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      dbPath = pathModule.join(dataDir, 'signal-state.sqlite');
    }
    
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    this.initSchema();
  }

  initSchema() {
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS address_last_seen (
        address TEXT PRIMARY KEY,
        last_seen_block INTEGER NOT NULL,
        last_seen_timestamp INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_address_last_seen_block 
      ON address_last_seen(last_seen_block);
      
      CREATE TABLE IF NOT EXISTS signal_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS chain_average_volume (
        chain_id INTEGER PRIMARY KEY,
        average_volume_usdc REAL NOT NULL,
        window_blocks INTEGER NOT NULL,
        last_updated_block INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS block_hashes (
        block_number INTEGER PRIMARY KEY,
        block_hash TEXT NOT NULL,
        chain_id INTEGER NOT NULL,
        recorded_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_block_hashes_chain ON block_hashes(chain_id);

      CREATE TABLE IF NOT EXISTS block_volumes (
        chain_id INTEGER NOT NULL,
        block_number INTEGER NOT NULL,
        usdc_volume REAL NOT NULL,
        block_hash TEXT NOT NULL,
        recorded_at INTEGER NOT NULL,
        PRIMARY KEY (chain_id, block_number)
      );
      CREATE INDEX IF NOT EXISTS idx_block_volumes_chain ON block_volumes(chain_id);

      CREATE TABLE IF NOT EXISTS signals (
        signal_id TEXT PRIMARY KEY,
        signal_type TEXT NOT NULL,
        chain_id INTEGER NOT NULL,
        block_number INTEGER NOT NULL,
        block_hash TEXT NOT NULL,
        transaction_hash TEXT,
        provenance TEXT NOT NULL,
        signal_data TEXT NOT NULL,
        evidence TEXT NOT NULL,
        confidence REAL NOT NULL,
        version TEXT NOT NULL,
        quality_status TEXT NOT NULL,
        quality_missing TEXT,
        state TEXT NOT NULL DEFAULT 'ACTIVE',
        invalidated_reason TEXT,
        invalidated_at INTEGER,
        replacement_signal_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_signals_chain_block ON signals(chain_id, block_number);
      CREATE INDEX IF NOT EXISTS idx_signals_state ON signals(state);
      CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(signal_type);
    `);
  }

  // Address last seen operations
  getLastSeen(address) {
    const row = this.db.prepare(
      'SELECT last_seen_block, last_seen_timestamp FROM address_last_seen WHERE address = ?'
    ).get(address.toLowerCase());
    
    if (!row) return { lastSeenBlock: 0, lastSeenTimestamp: 0 };
    return {
      lastSeenBlock: row.last_seen_block,
      lastSeenTimestamp: row.last_seen_timestamp
    };
  }

  setLastSeen(address, blockNumber, timestamp = Date.now()) {
    const normalizedAddress = address.toLowerCase();
    this.db.prepare(`
      INSERT INTO address_last_seen (address, last_seen_block, last_seen_timestamp, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(address) DO UPDATE SET
        last_seen_block = excluded.last_seen_block,
        last_seen_timestamp = excluded.last_seen_timestamp,
        updated_at = excluded.updated_at
    `).run(normalizedAddress, blockNumber, timestamp, timestamp);
  }

  // Batch update for multiple addresses
  setLastSeenBatch(updates) {
    const stmt = this.db.prepare(`
      INSERT INTO address_last_seen (address, last_seen_block, last_seen_timestamp, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(address) DO UPDATE SET
        last_seen_block = excluded.last_seen_block,
        last_seen_timestamp = excluded.last_seen_timestamp,
        updated_at = excluded.updated_at
    `);
    
    const tx = this.db.transaction((updates) => {
      for (const { address, blockNumber, timestamp } of updates) {
        stmt.run(address.toLowerCase(), blockNumber, timestamp || Date.now(), timestamp || Date.now());
      }
    });
    tx(updates);
  }

  // Chain average volume operations
  getChainAverageVolume(chainId) {
    const row = this.db.prepare(
      'SELECT average_volume_usdc, window_blocks, last_updated_block FROM chain_average_volume WHERE chain_id = ?'
    ).get(chainId);
    
    if (!row) return { averageVolumeUsdc: 0, windowBlocks: 0, lastUpdatedBlock: 0 };
    return {
      averageVolumeUsdc: row.average_volume_usdc,
      windowBlocks: row.window_blocks,
      lastUpdatedBlock: row.last_updated_block
    };
  }

  setChainAverageVolume(chainId, averageVolumeUsdc, windowBlocks, lastUpdatedBlock) {
    this.db.prepare(`
      INSERT INTO chain_average_volume (chain_id, average_volume_usdc, window_blocks, last_updated_block, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(chain_id) DO UPDATE SET
        average_volume_usdc = excluded.average_volume_usdc,
        window_blocks = excluded.window_blocks,
        last_updated_block = excluded.last_updated_block,
        updated_at = excluded.updated_at
    `).run(chainId, averageVolumeUsdc, windowBlocks, lastUpdatedBlock, Date.now());
  }

  // Block hash tracking for reorg detection
  recordBlockHash(chainId, blockNumber, blockHash) {
    this.db.prepare(`
      INSERT INTO block_hashes (block_number, block_hash, chain_id, recorded_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(block_number) DO UPDATE SET
        block_hash = excluded.block_hash,
        chain_id = excluded.chain_id,
        recorded_at = excluded.recorded_at
    `).run(blockNumber, blockHash, chainId, Date.now());
  }

  // Get recorded block hash
  getBlockHash(chainId, blockNumber) {
    const row = this.db.prepare(
      'SELECT block_hash FROM block_hashes WHERE block_number = ? AND chain_id = ?'
    ).get(blockNumber, chainId);
    return row ? row.block_hash : null;
  }

  // Check for reorg: returns true if block hash differs from recorded
  checkReorg(chainId, blockNumber, currentBlockHash) {
    const recordedHash = this.getBlockHash(chainId, blockNumber);
    if (!recordedHash) return false; // Not recorded yet, can't detect reorg
    return recordedHash !== currentBlockHash;
  }

  // Invalidate signals from reorged block range
  invalidateSignalsFromBlock(chainId, fromBlock) {
    const signals = this.getSignalsByBlockRange(chainId, fromBlock, 999999999);
    for (const signal of signals) {
      this.invalidateSignal(signal.signal_id, `REORG: block ${signal.block_number} replaced`);
    }
    // Could delete address_last_seen records from reorged blocks
    this.db.prepare(`
      DELETE FROM address_last_seen 
      WHERE last_seen_block >= ? AND chain_id = ?
    `).run(fromBlock, chainId);
  }

  // Signal persistence methods
  storeSignal(signal) {
    const now = Date.now();
    const existing = this.getSignal(signal.id);
    
    // Build provenance from the signal data (same as createSignal does)
    let provenance;
    switch (signal.type) {
      case 'large_transfer':
      case 'token_flow_anomaly':
        provenance = {
          block: signal.data?.blockNumber || signal.data?.block || '0',
          sourceTransaction: signal.evidence?.txHash || signal.data?.txHash || '0x',
          from: signal.data?.from || signal.evidence?.from || '0x',
          to: signal.data?.to || '',
          contractAddress: signal.data?.contractAddress || '',
          blockHash: signal.data?.blockHash || '0x',
          logIndex: signal.data?.logIndex !== undefined ? signal.data.logIndex : '0',
        };
        break;
      case 'contract_creation':
        provenance = {
          block: signal.data?.blockNumber || signal.data?.block || '0',
          sourceTransaction: signal.evidence?.txHash || signal.data?.txHash || '0x',
          from: signal.data?.from || signal.evidence?.from || '0x',
          to: '',
          contractAddress: '',
          blockHash: signal.data?.blockHash || '0x',
          logIndex: signal.data?.logIndex !== undefined ? signal.data.logIndex : '0',
        };
        break;
      case 'high_frequency_wallet':
        provenance = {
          block: signal.data?.blockNumber || signal.data?.block || '0',
          sourceTransaction: null,
          from: signal.data?.address || signal.data?.sender || '0x',
          to: '',
          contractAddress: '',
          blockHash: signal.data?.blockHash || '0x',
          logIndex: '0',
        };
        break;
      case 'contract_interaction':
        provenance = {
          block: signal.data?.blockNumber || signal.data?.block || '0',
          sourceTransaction: signal.evidence?.txHash || signal.data?.txHash || '0x',
          from: signal.data?.from || signal.evidence?.from || '0x',
          to: signal.data?.contractAddress || signal.data?.to || '',
          contractAddress: signal.data?.contractAddress || '',
          blockHash: signal.data?.blockHash || '0x',
          logIndex: signal.data?.logIndex !== undefined ? signal.data.logIndex : '0',
        };
        break;
      case 'wallet_burst':
        provenance = {
          block: signal.data?.firstBlock || signal.data?.blockNumber || signal.data?.block || '0',
          sourceTransaction: null,
          from: signal.data?.sender || '0x',
          to: '',
          contractAddress: '',
          blockHash: signal.data?.blockHash || '0x',
          logIndex: '0',
        };
        break;
      case 'address_reactivation':
        provenance = {
          block: signal.data?.blockNumber || signal.data?.block || '0',
          sourceTransaction: signal.evidence?.txHash || signal.data?.txHash || '0x',
          from: signal.data?.from || '0x',
          to: '',
          contractAddress: '',
          blockHash: signal.data?.blockHash || '0x',
          logIndex: signal.data?.logIndex !== undefined ? signal.data.logIndex : '0',
        };
        break;
      default:
        provenance = {
          block: signal.data?.blockNumber || signal.data?.block || '0',
          sourceTransaction: signal.evidence?.txHash || signal.data?.txHash || '0x',
          from: signal.data?.from || signal.evidence?.from || '0x',
          to: signal.data?.to || '',
          contractAddress: signal.data?.contractAddress || '',
          blockHash: signal.data?.blockHash || '0x',
          logIndex: signal.data?.logIndex !== undefined ? signal.data.logIndex : '0',
        };
    }
    
    const provenanceJson = JSON.stringify(provenance);
    const signalDataJson = JSON.stringify(signal.data);
    const evidenceJson = JSON.stringify(signal.evidence);
    const chainId = provenance.chainId || signal.data?.chainId || 5042002;
    
    if (existing) {
      // Update existing signal - validate state transition
      const allowedTransitions = {
        'ACTIVE': ['INVALIDATED'],
        'INVALIDATED': ['SUPERSEDED'],
        'SUPERSEDED': [] // No transitions allowed from SUPERSEDED
      };
      const currentState = existing.state;
      const newState = signal.state || 'ACTIVE';
      const allowed = allowedTransitions[currentState] || [];
      
      if (currentState !== newState && !allowed.includes(newState)) {
        throw new Error(`Illegal state transition: ${currentState} -> ${newState}`);
      }
      
      // Update existing signal
      this.db.prepare(`
        UPDATE signals SET
          provenance = ?,
          signal_data = ?,
          evidence = ?,
          confidence = ?,
          version = ?,
          quality_status = ?,
          quality_missing = ?,
          state = ?,
          invalidated_reason = ?,
          invalidated_at = ?,
          replacement_signal_id = ?,
          updated_at = ?
        WHERE signal_id = ?
      `).run(
        provenanceJson,
        signalDataJson,
        evidenceJson,
        signal.confidence,
        signal.version,
        signal.quality?.status || 'UNKNOWN',
        signal.quality?.missing ? JSON.stringify(signal.quality.missing) : null,
        signal.state || 'ACTIVE',
        signal.invalidatedReason || null,
        signal.invalidatedAt || null,
        signal.replacementSignalId || null,
        Date.now(),
        signal.id
      );
    } else {
      // Insert new signal
      this.db.prepare(`
        INSERT INTO signals (
          signal_id, signal_type, chain_id, block_number, block_hash,
          transaction_hash, provenance, signal_data, evidence,
          confidence, version, quality_status, quality_missing,
          state, invalidated_reason, invalidated_at, replacement_signal_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        signal.id,
        signal.type,
        chainId,
        signal.data?.blockNumber || signal.data?.block || 0,
        provenance.blockHash || '0x',
        provenance.sourceTransaction || null,
        provenanceJson,
        signalDataJson,
        evidenceJson,
        signal.confidence,
        signal.version,
        signal.quality?.status || 'UNKNOWN',
        signal.quality?.missing ? JSON.stringify(signal.quality.missing) : null,
        signal.state || 'ACTIVE',
        signal.invalidatedReason || null,
        signal.invalidatedAt || null,
        signal.replacementSignalId || null,
        Date.now(),
        Date.now()
      );
    }
  }

  getSignal(signalId) {
    const row = this.db.prepare('SELECT * FROM signals WHERE signal_id = ?').get(signalId);
    if (!row) return null;
    return {
      signal_id: row.signal_id,
      type: row.signal_type,
      chainId: row.chain_id,
      blockNumber: row.block_number,
      blockHash: row.block_hash,
      data: JSON.parse(row.signal_data),
      evidence: JSON.parse(row.evidence),
      provenance: JSON.parse(row.provenance),
      confidence: row.confidence,
      version: row.version,
      quality: {
        status: row.quality_status,
        missing: row.quality_missing ? JSON.parse(row.quality_missing) : undefined
      },
      state: row.state,
      invalidatedReason: row.invalidated_reason,
      invalidatedAt: row.invalidated_at,
      replacementSignalId: row.replacement_signal_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  getSignalsByBlockRange(chainId, fromBlock, toBlock) {
    return this.db.prepare(
      'SELECT * FROM signals WHERE chain_id = ? AND block_number BETWEEN ? AND ? ORDER BY block_number'
    ).all(chainId, fromBlock, toBlock).map(row => ({
      signal_id: row.signal_id,
      type: row.signal_type,
      chainId: row.chain_id,
      blockNumber: row.block_number,
      blockHash: row.block_hash,
      data: JSON.parse(row.signal_data),
      evidence: JSON.parse(row.evidence),
      provenance: JSON.parse(row.provenance),
      confidence: row.confidence,
      version: row.version,
      quality: {
        status: row.quality_status,
        missing: row.quality_missing ? JSON.parse(row.quality_missing) : undefined
      },
      state: row.state,
      invalidatedReason: row.invalidated_reason,
      invalidatedAt: row.invalidated_at,
      replacementSignalId: row.replacement_signal_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  invalidateSignal(signalId, reason) {
    const now = Date.now();
    // Validate current state before transition
    const current = this.getSignal(signalId);
    if (!current) {
      throw new Error(`Cannot invalidate non-existent signal: ${signalId}`);
    }
    if (current.state === 'SUPERSEDED') {
      throw new Error(`Cannot invalidate SUPERSEDED signal: ${signalId}`);
    }
    if (current.state === 'INVALIDATED') {
      // Idempotent - already invalidated
      return;
    }
    this.db.prepare(`
      UPDATE signals SET
        state = 'INVALIDATED',
        invalidated_reason = ?,
        invalidated_at = ?,
        updated_at = ?
      WHERE signal_id = ?
    `).run(reason, Date.now(), Date.now(), signalId);
  }

  setReplacementSignal(originalSignalId, replacementSignalId) {
    const now = Date.now();
    // Validate current state before transition
    const current = this.getSignal(originalSignalId);
    if (!current) {
      throw new Error(`Cannot supersede non-existent signal: ${originalSignalId}`);
    }
    if (current.state !== 'INVALIDATED') {
      throw new Error(`Can only supersede INVALIDATED signal, current state: ${current.state}`);
    }
    if (!replacementSignalId) {
      throw new Error(`replacement_signal_id is required for SUPERSEDED transition`);
    }
    // Verify replacement signal exists
    const replacement = this.getSignal(replacementSignalId);
    if (!replacement) {
      throw new Error(`Replacement signal not found: ${replacementSignalId}`);
    }
    this.db.prepare(`
      UPDATE signals SET
        state = 'SUPERSEDED',
        replacement_signal_id = ?,
        updated_at = ?
      WHERE signal_id = ?
    `).run(replacementSignalId, now, originalSignalId);
  }

  getSignalsByState(state) {
    return this.db.prepare(
      'SELECT * FROM signals WHERE state = ? ORDER BY created_at DESC'
    ).all(state).map(row => ({
      signal_id: row.signal_id,
      type: row.signal_type,
      chainId: row.chain_id,
      blockNumber: row.block_number,
      blockHash: row.block_hash,
      data: JSON.parse(row.signal_data),
      evidence: JSON.parse(row.evidence),
      provenance: JSON.parse(row.provenance),
      confidence: row.confidence,
      version: row.version,
      quality: {
        status: row.quality_status,
        missing: row.quality_missing ? JSON.parse(row.quality_missing) : undefined
      },
      state: row.state,
      invalidatedReason: row.invalidated_reason,
      invalidatedAt: row.invalidated_at,
      replacementSignalId: row.replacement_signal_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  // Chain average volume - real rolling 100-block average
  // Per signal-spec.yaml: rolling 100-block window for chain average volume
  // This should be called after scanning each block to keep the average current

  // Persist per-block USDC volume for rolling average calculation
  recordBlockVolume(chainId, blockNumber, usdcVolume, blockHash) {
    this.db.prepare(`
      INSERT INTO block_volumes (chain_id, block_number, usdc_volume, block_hash, recorded_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(block_number, chain_id) DO UPDATE SET
        usdc_volume = excluded.usdc_volume,
        block_hash = excluded.block_hash,
        recorded_at = excluded.recorded_at
    `).run(chainId, blockNumber, usdcVolume, blockHash, Date.now());
  }

  getBlockVolume(chainId, blockNumber) {
    const row = this.db.prepare(
      'SELECT usdc_volume FROM block_volumes WHERE chain_id = ? AND block_number = ?'
    ).get(chainId, blockNumber);
    return row ? row.usdc_volume : 0;
  }

  // Calculate and update rolling 100-block average volume
  // This computes the actual average from persisted block volumes
  updateChainAverageVolume(chainId, currentBlockNumber, usdcDivisor) {
    const windowBlocks = 100; // Per signal-spec.yaml
    const fromBlock = Math.max(1, currentBlockNumber - windowBlocks + 1);
    const toBlock = currentBlockNumber;
    
    // Sum USDC volumes from the last 100 blocks
    const rows = this.db.prepare(
      'SELECT SUM(usdc_volume) as total_volume FROM block_volumes WHERE chain_id = ? AND block_number BETWEEN ? AND ?'
    ).get(chainId, fromBlock, toBlock);
    
    const totalVolume = rows?.total_volume || 0;
    
    // Per spec: average over 100-block window (including blocks with 0 volume)
    const averageVolume = totalVolume / windowBlocks;
    
    // Update the cached average
    this.setChainAverageVolume(chainId, averageVolume, windowBlocks, currentBlockNumber);
    
    return averageVolume;
  }

  getState(key) {
    const row = this.db.prepare('SELECT value FROM signal_state WHERE key = ?').get(key);
    if (!row) return null;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }

  setState(key, value) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    this.db.prepare(`
      INSERT INTO signal_state (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).run(key, serialized, Date.now());
  }

  deleteState(key) {
    this.db.prepare('DELETE FROM signal_state WHERE key = ?').run(key);
  }

  // Cleanup old records (optional maintenance)
  pruneOldAddressRecords(olderThanTimestamp) {
    return this.db.prepare(
      'DELETE FROM address_last_seen WHERE last_seen_timestamp < ?'
    ).run(olderThanTimestamp);
  }

  close() {
    this.db.close();
  }
}

// Singleton instance
let instance = null;

function getSignalState(dbPath) {
  if (!instance || instance.isClosed()) {
    instance = new SignalState(dbPath);
  }
  return instance;
}

function resetSignalState() {
  if (instance) {
    instance.close();
    instance = null;
  }
}

// Add isClosed method to SignalState class
SignalState.prototype.isClosed = function() {
  return this.db === null || this.db.open === false;
};

module.exports = {
  SignalState,
  getSignalState,
  resetSignalState
};