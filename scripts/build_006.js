// BUILD_006 — USDC Flow. Track USDC transfers and flow statistics.
// DoD: Track USDC transfers and flow statistics.

const { rpc, getBlockByNumber, getBlockNumber, hexToInt } = require("../src/orchestrator/arc");

function summarizeTx(tx) {
  if (!tx) return null;
  const valueWei = BigInt(tx.value || "0x0");
  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    valueWei: valueWei.toString(),
    valueUsdc: Number(valueWei) / 1e18,
    nonce: hexToInt(tx.nonce),
    gas: hexToInt(tx.gas),
    gasPrice: tx.gasPrice ? hexToInt(tx.gasPrice) : null,
    blockNumber: hexToInt(tx.blockNumber),
    transactionIndex: hexToInt(tx.transactionIndex),
  };
}

(async () => {
  try {
    const latestHead = await getBlockNumber();
    // Scan last 5 blocks for USDC flows
    const fromBlock = Math.max(0, latestHead - 5);
    const toBlock = "latest";

    console.log(`[BUILD_006] Scanning blocks ${fromBlock} to ${toBlock} for USDC transfers...`);

    // Fetch blocks with transactions
    const blocks = [];
    for (let i = fromBlock; i <= latestHead; i++) {
      const block = await getBlockByNumber("0x" + i.toString(16), true);
      if (block && Array.isArray(block.transactions)) {
        blocks.push(block);
      }
    }

    let totalTransfers = 0;
    let totalVolumeWei = 0n;
    const senderMap = {};
    const receiverMap = {};

    for (const block of blocks) {
      const txs = block.transactions;
      for (const tx of txs) {
        const value = BigInt(tx.value || "0x0");
        if (value > 0n) {
          totalTransfers++;
          totalVolumeWei += value;
          const from = tx.from;
          const to = tx.to;
          senderMap[from] = (senderMap[from] || 0n) + value;
          if (to) receiverMap[to] = (receiverMap[to] || 0n) + value;
        }
      }
    }

    // Top senders and receivers
    const topSenders = Object.entries(senderMap)
      .sort((a, b) => (b[1] > a[1] ? 1 : -1))
      .slice(0, 5)
      .map(([addr, val]) => ({ address: addr, valueWei: val.toString(), valueUsdc: Number(val) / 1e18 }));

    const topReceivers = Object.entries(receiverMap)
      .sort((a, b) => (b[1] > a[1] ? 1 : -1))
      .slice(0, 5)
      .map(([addr, val]) => ({ address: addr, valueWei: val.toString(), valueUsdc: Number(val) / 1e18 }));

    const totalVolumeUsdc = Number(totalVolumeWei) / 1e18;

    console.log(JSON.stringify({
      ok: true,
      rpc: "https://rpc.testnet.arc.io",
      chainHead: latestHead,
      blockRange: { fromBlock, toBlock: latestHead },
      totalTransfers,
      totalVolumeWei: totalVolumeWei.toString(),
      totalVolumeUsdc,
      topSenders,
      topReceivers,
    }, null, 2));

    process.exit(0);
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: { code: e.code, message: e.message } }, null, 2));
    process.exit(1);
  }
})();