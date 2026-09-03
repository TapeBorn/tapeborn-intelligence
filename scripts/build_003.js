// scripts/build_003.js
// BUILD_003 — Block Reader. Fetch a block (latest by default) and inspect its transaction list.
// DoD: Fetch a block and inspect its transaction list.

const { rpc, getBlockByNumber, getBlockNumber, hexToInt } = require("../src/orchestrator/arc");

function normalizeBlock(block, requestedTag) {
  return {
    requestedTag,
    number: hexToInt(block.number),
    hash: block.hash,
    parentHash: block.parentHash,
    timestamp: hexToInt(block.timestamp),
    miner: block.miner,
    gasUsed: hexToInt(block.gasUsed),
    gasLimit: hexToInt(block.gasLimit),
    baseFeePerGas: block.baseFeePerGas ? hexToInt(block.baseFeePerGas) : null,
    size: block.size ? hexToInt(block.size) : null,
    txCount: Array.isArray(block.transactions) ? block.transactions.length : 0,
  };
}

function summarizeTx(tx) {
  if (!tx) return null;
  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    valueWei: tx.value,
    valueArc: (Number(BigInt(tx.value || "0x0")) / 1e18).toString(),
    nonce: hexToInt(tx.nonce),
    gas: hexToInt(tx.gas),
    gasPrice: tx.gasPrice ? hexToInt(tx.gasPrice) : null,
    inputLength: (tx.input || "0x").length - 2,
    blockNumber: hexToInt(tx.blockNumber),
    transactionIndex: hexToInt(tx.transactionIndex),
  };
}

(async () => {
  try {
    const latestHead = await getBlockNumber();
    // Test the latest block WITH full tx objects (Arc testnet supports this)
    const block = await getBlockByNumber("latest", true);
    if (!block) throw new Error("latest block returned null");

    const summary = normalizeBlock(block, "latest");
    const txs = Array.isArray(block.transactions) ? block.transactions : [];

    // Sample: first 5 transactions. Items are already tx objects on Arc testnet.
    const sample = [];
    for (let i = 0; i < Math.min(5, txs.length); i++) {
      const item = txs[i];
      if (typeof item === "string") {
        // Fallback: hash-only — fetch the full tx
        const full = await rpc("eth_getTransactionByHash", [item]);
        sample.push(summarizeTx(full));
      } else {
        sample.push(summarizeTx(item));
      }
    }

    // Aggregate stats from the sample
    const stats = sample.reduce(
      (acc, t) => {
        if (!t) return acc;
        const v = Number(BigInt(t.valueWei || "0x0")) / 1e18;
        acc.totalValueArc += v;
        if (t.to === null) acc.contractCreations += 1;
        if (t.inputLength > 0) acc.withCalldata += 1;
        return acc;
      },
      { totalValueArc: 0, contractCreations: 0, withCalldata: 0 }
    );

    console.log(JSON.stringify({
      ok: true,
      rpc: "https://rpc.testnet.arc.io",
      chainHead: latestHead,
      block: summary,
      txSample: sample,
      txSampleStats: {
        sampleSize: sample.length,
        ...stats,
      },
    }, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: { code: e.code, message: e.message } }, null, 2));
    process.exit(1);
  }
})();
