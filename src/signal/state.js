// src/signal/state.js
// Persistent signal state using SQLite (R4)
// Replaces in-memory lastSeenMap with persistent SQLite storage

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const pathModule = require('path');

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

  // Generic key-value storage for other signal state
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