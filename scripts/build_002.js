// scripts/build_002.js
// BUILD_002 — Arc Connection. Reads latest block from Arc RPC and prints a structured log.
// DoD: Node program reads latest Arc block through RPC.

const { rpc, getChainId, getBlockNumber, getBlockByNumber, hexToInt } = require("../src/orchestrator/arc");

(async () => {
  const t0 = Date.now();
  try {
    const [chainId, blockHex, block] = await Promise.all([
      getChainId(),
      getBlockNumber(),
      getBlockByNumber("latest", false),
    ]);
    const ms = Date.now() - t0;

    if (!block) {
      console.error("FAIL: latest block is null");
      process.exit(1);
    }

    const summary = {
      ok: true,
      rpc: "https://rpc.testnet.arc.io",
      chainId,
      blockNumber: hexToInt(block.number),
      blockHex: block.number,
      timestamp: hexToInt(block.timestamp),
      txCount: Array.isArray(block.transactions) ? block.transactions.length : 0,
      hash: block.hash,
      parentHash: block.parentHash,
      miner: block.miner,
      gasUsed: hexToInt(block.gasUsed),
      gasLimit: hexToInt(block.gasLimit),
      baseFeePerGas: block.baseFeePerGas ? hexToInt(block.baseFeePerGas) : null,
      elapsedMs: ms,
    };

    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: { code: e.code, message: e.message } }, null, 2));
    process.exit(1);
  }
})();
