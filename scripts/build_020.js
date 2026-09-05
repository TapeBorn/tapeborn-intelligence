// BUILD_020 — Agent Interface
// Read-only API for external agents (Hermes, etc.)
// Server runs on http://localhost:3458

const http = require('http');
const url = require('url');
const { scanBlocks } = require('../src/signal/engine');
const { getBlockNumber } = require('../src/orchestrator/arc');
const { buildProvenance, buildEvidence } = require('../src/metadata/schema');

const PORT = process.env.AGENT_PORT || 3458;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const MAX_BLOCK_RANGE = 1000;

// In-memory cache for signals to support /signals/:signalId
// This is intentionally simple — no database.
let signalCache = [];
let cacheTimestamp = null;
const CACHE_TTL_MS = 60000; // 1 minute

async function getSignals(fromBlock, toBlock, limit) {
  if (fromBlock === undefined || toBlock === undefined) {
    const latest = await getBlockNumber();
    fromBlock = Math.max(0, latest - 19);
    toBlock = latest;
  }
  const signals = await scanBlocks(fromBlock, toBlock);
  return signals.slice(0, limit || DEFAULT_LIMIT);
}

async function refreshCache() {
  const now = Date.now();
  if (!cacheTimestamp || (now - cacheTimestamp) > CACHE_TTL_MS) {
    const latest = await getBlockNumber();
    const fromBlock = Math.max(0, latest - 99); // last 100 blocks
    signalCache = await scanBlocks(fromBlock, latest);
    cacheTimestamp = now;
  }
  return signalCache;
}

function buildSignalResponse(signal) {
  // Reuse BUILD_011 provenance/evidence builders
  const provenance = buildProvenance(signal, { number: signal.data?.blockNumber });
  const evidence = buildEvidence(signal);
  return {
    id: signal.id,
    type: signal.type,
    data: signal.data,
    timestamp: signal.timestamp,
    confidence: signal.confidence,
    version: signal.version,
    quality: signal.quality,
    provenance,
    evidence,
  };
}

function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function sendError(res, status, message) {
  sendJSON(res, status, { error: message, status });
}

async function handleRequest(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const query = parsed.query;

  // Only GET
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method Not Allowed');
  }

  // /health
  if (pathname === '/health') {
    try {
      const block = await getBlockNumber();
      return sendJSON(res, 200, {
        status: 'ok',
        chain: 'Arc Testnet',
        chainId: 5042002,
        latestBlock: block,
        version: 'v0',
        endpoints: ['/health', '/signals', '/signals/:signalId', '/provenance/:signalId', '/evidence/:txHash'],
      });
    } catch (e) {
      return sendError(res, 500, 'RPC unavailable');
    }
  }

  // /signals
  if (pathname === '/signals') {
    try {
      // Parse filters
      const type = query.type;
      const blockFrom = query.block_from ? parseInt(query.block_from, 10) : undefined;
      const blockTo = query.block_to ? parseInt(query.block_to, 10) : undefined;
      let limit = query.limit ? parseInt(query.limit, 10) : DEFAULT_LIMIT;
      if (limit > MAX_LIMIT) limit = MAX_LIMIT;
      if (limit < 1) limit = 1;

      // Validate block range
      if (blockFrom !== undefined && blockTo !== undefined) {
        if (blockFrom > blockTo) {
          return sendError(res, 422, 'block_from must be <= block_to');
        }
        if ((blockTo - blockFrom) > MAX_BLOCK_RANGE) {
          return sendError(res, 422, `block range exceeds ${MAX_BLOCK_RANGE} blocks`);
        }
      }

      let signals;
      if (blockFrom !== undefined && blockTo !== undefined) {
        signals = await scanBlocks(blockFrom, blockTo);
      } else {
        // Use cache for default range
        await refreshCache();
        signals = signalCache;
      }

      // Filter by type
      if (type) {
        signals = signals.filter(s => s.type === type);
      }

      // Limit
      const limited = signals.slice(0, limit);

      // Build responses with provenance/evidence
      const items = limited.map(s => buildSignalResponse(s));

      return sendJSON(res, 200, {
        ok: true,
        count: items.length,
        total: signals.length,
        limit,
        signals: items,
      });
    } catch (e) {
      return sendError(res, 500, `Internal error: ${e.message}`);
    }
  }

  // /signals/:signalId
  if (pathname.startsWith('/signals/')) {
    const signalId = pathname.split('/')[2];
    if (!signalId) return sendError(res, 400, 'Missing signalId');
    try {
      await refreshCache();
      const signal = signalCache.find(s => s.id === signalId);
      if (!signal) {
        return sendError(res, 404, `Signal ${signalId} not found`);
      }
      return sendJSON(res, 200, {
        ok: true,
        signal: buildSignalResponse(signal),
      });
    } catch (e) {
      return sendError(res, 500, `Internal error: ${e.message}`);
    }
  }

  // /provenance/:signalId
  if (pathname.startsWith('/provenance/')) {
    const signalId = pathname.split('/')[2];
    if (!signalId) return sendError(res, 400, 'Missing signalId');
    try {
      await refreshCache();
      const signal = signalCache.find(s => s.id === signalId);
      if (!signal) {
        return sendError(res, 404, `Signal ${signalId} not found`);
      }
      const provenance = buildProvenance(signal, { number: signal.data?.blockNumber });
      return sendJSON(res, 200, {
        ok: true,
        provenance,
      });
    } catch (e) {
      return sendError(res, 500, `Internal error: ${e.message}`);
    }
  }

  // /evidence/:txHash
  if (pathname.startsWith('/evidence/')) {
    const txHash = pathname.split('/')[2];
    if (!txHash) return sendError(res, 400, 'Missing txHash');
    try {
      await refreshCache();
      // Find signal(s) that reference this txHash in evidence
      const matches = signalCache.filter(s =>
        s.evidence?.txHash === txHash ||
        s.data?.txHash === txHash
      );
      if (matches.length === 0) {
        return sendError(res, 404, `No evidence found for tx ${txHash}`);
      }
      const items = matches.map(s => buildSignalResponse(s));
      return sendJSON(res, 200, {
        ok: true,
        count: items.length,
        signals: items,
      });
    } catch (e) {
      return sendError(res, 500, `Internal error: ${e.message}`);
    }
  }

  // 404
  return sendError(res, 404, `Endpoint ${pathname} not found`);
}

const server = http.createServer(handleRequest);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[BUILD_020] Agent Interface running on http://0.0.0.0:${PORT}`);
  console.log(`  GET /health`);
  console.log(`  GET /signals?type=<type>&block_from=<n>&block_to=<n>&limit=<n>`);
  console.log(`  GET /signals/:signalId`);
  console.log(`  GET /provenance/:signalId`);
  console.log(`  GET /evidence/:txHash`);
  console.log(`  Read-only, deterministic, evidence-backed.`);
});

process.on('SIGINT', () => {
  console.log('\n[BUILD_020] Shutting down...');
  server.close(() => process.exit(0));
});