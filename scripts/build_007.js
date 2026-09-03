// BUILD_007 — Wallet Activity. Create basic wallet activity profiles.
// DoD: Create basic wallet activity profiles.

const { rpc, getBlockByNumber, getBlockNumber, hexToInt } = require("../src/orchestrator/arc");

(async () => {
  try {
    const latestHead = await getBlockNumber();
    const fromBlock = Math.max(0, latestHead - 15); // last 15 blocks
    const toBlock = "latest";

    console.log(`[BUILD_007] Scanning blocks ${fromBlock} to ${toBlock} for wallet activity...`);

    // Fetch blocks with transactions
    const blocks = [];
    for (let i = fromBlock; i <= latestHead; i++) {
      const block = await getBlockByNumber("0x" + i.toString(16), true);
      if (block && Array.isArray(block.transactions)) {
        blocks.push(block);
      }
    }

    const walletMap = {};

    for (const block of blocks) {
      const txs = block.transactions;
      for (const tx of txs) {
        const from = tx.from;
        const to = tx.to;
        const value = BigInt(tx.value || "0x0");
        const blockNum = hexToInt(block.number);

        // Initialize wallet if not exists
        if (!walletMap[from]) {
          walletMap[from] = { sent: 0n, received: 0n, txCount: 0, firstSeen: blockNum, lastSeen: blockNum };
        }
        walletMap[from].sent += value;
        walletMap[from].txCount += 1;
        walletMap[from].lastSeen = Math.max(walletMap[from].lastSeen, blockNum);

        if (to) {
          if (!walletMap[to]) {
            walletMap[to] = { sent: 0n, received: 0n, txCount: 0, firstSeen: blockNum, lastSeen: blockNum };
          }
          walletMap[to].received += value;
          walletMap[to].txCount += 1;
          walletMap[to].lastSeen = Math.max(walletMap[to].lastSeen, blockNum);
        }
      }
    }

    // Convert to array and sort by total activity (sent + received)
    const wallets = Object.entries(walletMap).map(([address, data]) => ({
      address,
      sentWei: data.sent.toString(),
      sentUsdc: Number(data.sent) / 1e18,
      receivedWei: data.received.toString(),
      receivedUsdc: Number(data.received) / 1e18,
      txCount: data.txCount,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen,
      totalUsdc: (Number(data.sent) + Number(data.received)) / 1e18,
    }));

    wallets.sort((a, b) => b.totalUsdc - a.totalUsdc);

    // Top 10 by total volume
    const topWallets = wallets.slice(0, 10);

    // Summary stats
    const totalWallets = wallets.length;
    const totalTxs = wallets.reduce((acc, w) => acc + w.txCount, 0);
    const totalVolumeUsdc = wallets.reduce((acc, w) => acc + w.totalUsdc, 0);

    console.log(JSON.stringify({
      ok: true,
      rpc: "https://rpc.testnet.arc.io",
      chainHead: latestHead,
      blockRange: { fromBlock, toBlock: latestHead },
      totalWallets,
      totalTxs,
      totalVolumeUsdc,
      topWallets,
    }, null, 2));

    process.exit(0);
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: { code: e.code, message: e.message } }, null, 2));
    process.exit(1);
  }
})();