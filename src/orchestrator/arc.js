// src/orchestrator/arc.js
// Arc RPC client (used by BUILD_002 -> BUILD_007). Standard Ethereum JSON-RPC over HTTP.
// Enhanced with retry, rate limiting, validation, and logging (BUILD_013).

const logger = require('./logger');
const { retry } = require('./retry');
const { RateLimiter } = require('./rateLimit');
const { validateBlockNumber, validateBlock, isValidBlockNumber } = require('./validator');

const DEFAULT_RPC = process.env.ARC_RPC_URL || "https://rpc.testnet.arc.io";

// Global rate limiter instance (10 requests per second)
const rateLimiter = new RateLimiter({ requestsPerSecond: 10 });

class RpcError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function shouldRetryRpc(error) {
  // Retry on network errors, timeouts, and certain HTTP statuses
  if (error.code === -32000 && error.message.includes('timeout')) return true;
  if (error.code === -32000 && error.message.includes('ETIMEDOUT')) return true;
  if (error.code === 429) return true; // Rate limited
  if (error.code >= 500 && error.code < 600) return true; // Server errors
  if (error.code === -32000) return true; // Generic RPC error (could be temporary)
  return false;
}

async function rpc(method, params = [], { rpcUrl = DEFAULT_RPC, timeoutMs = 10000, maxRetries = 3 } = {}) {
  logger.debug(`[RPC] Calling ${method}`, { params: params.length, rpcUrl });

  const callFn = async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new RpcError(res.status, `HTTP ${res.status}`);
      const j = await res.json();
      if (j.error) throw new RpcError(j.error.code || -32000, j.error.message || "rpc error");
      return j.result;
    } catch (e) {
      if (e.name === "AbortError") throw new RpcError(-32000, `timeout after ${timeoutMs}ms`);
      throw e;
    } finally {
      clearTimeout(t);
    }
  };

  try {
    const result = await rateLimiter.call(() =>
      retry(callFn, {
        maxRetries: maxRetries,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        shouldRetry: shouldRetryRpc,
        context: `rpc:${method}`,
      })
    );
    logger.debug(`[RPC] ${method} succeeded`);
    return result;
  } catch (e) {
    logger.error(`[RPC] ${method} failed after retries`, { error: e.message, code: e.code });
    throw e;
  }
}

const hexToInt = (h) => (typeof h === "string" ? parseInt(h, 16) : Number(h));
const hexToBig = (h) => BigInt(h);

async function getChainId() {
  const result = await rpc("eth_chainId");
  return hexToInt(result);
}

async function getBlockNumber() {
  const result = await rpc("eth_blockNumber");
  const block = hexToInt(result);
  logger.debug(`[RPC] Latest block: ${block}`);
  return block;
}

async function getBlockByNumber(tag = "latest", includeTx = false) {
  // Validate tag if it's a number
  if (typeof tag === 'number') {
    tag = '0x' + tag.toString(16);
  }
  if (!isValidBlockNumber(tag)) {
    logger.warn(`[RPC] Invalid block tag: ${tag}`);
    throw new RpcError(-32000, `Invalid block tag: ${tag}`);
  }
  const block = await rpc("eth_getBlockByNumber", [tag, includeTx]);
  if (!block) {
    logger.warn(`[RPC] Block not found: ${tag}`);
    return null;
  }
  // Validate block structure
  if (!validateBlock(block, `block:${tag}`)) {
    logger.warn(`[RPC] Block validation failed for ${tag}`);
  }
  return block;
}

module.exports = {
  rpc,
  getChainId,
  getBlockNumber,
  getBlockByNumber,
  hexToInt,
  hexToBig,
  DEFAULT_RPC,
  RpcError,
};
