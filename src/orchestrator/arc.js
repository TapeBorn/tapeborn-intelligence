// src/orchestrator/arc.js
// Arc RPC client (used by BUILD_002 -> BUILD_007). Standard Ethereum JSON-RPC over HTTP.

const DEFAULT_RPC = process.env.ARC_RPC_URL || "https://rpc.testnet.arc.io";

class RpcError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

async function rpc(method, params = [], { rpcUrl = DEFAULT_RPC, timeoutMs = 10000 } = {}) {
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
}

const hexToInt = (h) => (typeof h === "string" ? parseInt(h, 16) : Number(h));
const hexToBig = (h) => BigInt(h);

async function getChainId() { return hexToInt(await rpc("eth_chainId")); }
async function getBlockNumber() { return hexToInt(await rpc("eth_blockNumber")); }

async function getBlockByNumber(tag = "latest", includeTx = false) {
  return rpc("eth_getBlockByNumber", [tag, includeTx]);
}

module.exports = {
  rpc,
  getChainId,
  getBlockNumber,
  getBlockByNumber,
  hexToInt,
  hexToBig,
  DEFAULT_RPC,
};
