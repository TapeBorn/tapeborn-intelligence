// scripts/build_004.js
// BUILD_004 — Transaction Reader. Read transaction details and receipts by hash.
// DoD: Read transaction details and receipts by hash.

const { rpc, getBlockNumber, getBlockByNumber, hexToInt } = require("../src/orchestrator/arc");

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
    blockHash: tx.blockHash,
    transactionIndex: hexToInt(tx.transactionIndex),
    type: tx.type ? hexToInt(tx.type) : 0,
  };
}

function summarizeReceipt(r) {
  if (!r) return null;
  return {
    transactionHash: r.transactionHash,
    status: r.status === "0x1" ? "success" : (r.status === "0x0" ? "failed" : "unknown"),
    statusCode: r.status,
    blockNumber: hexToInt(r.blockNumber),
    blockHash: r.blockHash,
    from: r.from,
    to: r.to,
    contractAddress: r.contractAddress, // non-null if this tx created a contract
    gasUsed: hexToInt(r.gasUsed),
    cumulativeGasUsed: hexToInt(r.cumulativeGasUsed),
    effectiveGasPrice: r.effectiveGasPrice ? hexToInt(r.effectiveGasPrice) : null,
    logsCount: Array.isArray(r.logs) ? r.logs.length : 0,
    logsBloom: r.logsBloom,
    type: r.type ? hexToInt(r.type) : 0,
  };
}

(async () => {
  try {
    const latestHead = await getBlockNumber();
    const block = await getBlockByNumber("latest", true);
    if (!block || !Array.isArray(block.transactions) || block.transactions.length === 0) {
      throw new Error("latest block has no transactions");
    }

    // Pick first 3 transactions from latest block
    const txs = block.transactions;
    const sampleHashes = [];
    const samples = [];
    for (const item of txs.slice(0, 3)) {
      const tx = typeof item === "string" ? await rpc("eth_getTransactionByHash", [item]) : item;
      if (tx) {
        samples.push(tx);
        sampleHashes.push(tx.hash);
      }
    }
    if (samples.length === 0) throw new Error("no transactions found in latest block");

    // Fetch receipt for each sample + first one with logs
    const enriched = [];
    for (const tx of samples) {
      const [receipt] = await Promise.all([rpc("eth_getTransactionReceipt", [tx.hash])]);
      enriched.push({
        tx: summarizeTx(tx),
        receipt: summarizeReceipt(receipt),
      });
    }

    // Stats across the sample
    const stats = enriched.reduce(
      (acc, e) => {
        if (!e.tx || !e.receipt) return acc;
        acc.totalGasUsed += e.receipt.gasUsed;
        acc.contractCreations += e.receipt.contractAddress ? 1 : 0;
        acc.successCount += e.receipt.status === "success" ? 1 : 0;
        acc.totalLogs += e.receipt.logsCount;
        return acc;
      },
      { totalGasUsed: 0, contractCreations: 0, successCount: 0, totalLogs: 0 }
    );

    console.log(JSON.stringify({
      ok: true,
      rpc: "https://rpc.testnet.arc.io",
      chainHead: latestHead,
      block: {
        number: hexToInt(block.number),
        hash: block.hash,
        txCount: txs.length,
      },
      sampleSize: enriched.length,
      samples: enriched,
      stats,
    }, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: { code: e.code, message: e.message } }, null, 2));
    process.exit(1);
  }
})();
