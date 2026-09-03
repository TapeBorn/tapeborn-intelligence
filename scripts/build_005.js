// BUILD_005 — Event Reader. Decode logs and ERC-20 Transfer events.
// DoD: Decode logs and ERC-20 Transfer events.

const { rpc, getBlockByNumber, getBlockNumber, hexToInt } = require("../src/orchestrator/arc");
const { decodeLog } = require("../src/signal/decoder");

async function getLogs(filter) {
  // filter: { fromBlock, toBlock, address?, topics? }
  return rpc("eth_getLogs", [filter]);
}

(async () => {
  try {
    const latestHead = await getBlockNumber();
    const fromBlock = Math.max(0, latestHead - 5); // last 5 blocks
    const toBlock = "latest";

    console.log(`[BUILD_005] Scanning blocks ${fromBlock} to ${toBlock} for logs...`);

    // 1) Fetch logs for last 5 blocks
    const logs = await getLogs({
      fromBlock: "0x" + fromBlock.toString(16),
      toBlock: "latest",
    });

    if (!Array.isArray(logs) || logs.length === 0) {
      console.log(JSON.stringify({ ok: true, message: "No logs found in recent blocks", blockRange: { fromBlock, toBlock: latestHead } }, null, 2));
      process.exit(0);
    }

    console.log(`Found ${logs.length} raw logs. Decoding...`);

    // 2) Decode each log
    const decoded = [];
    const byEvent = { Transfer: 0, Approval: 0, Deposit: 0, Withdrawal: 0, Unknown: 0 };
    const transfers = [];

    for (const log of logs) {
      const decodedEvent = decodeLog(log);
      const entry = {
        address: log.address,
        blockNumber: hexToInt(log.blockNumber),
        transactionHash: log.transactionHash,
        logIndex: hexToInt(log.logIndex),
        decoded: decodedEvent,
        raw: {
          topics: log.topics,
          data: log.data,
        },
      };
      decoded.push(entry);

      if (decodedEvent) {
        const eventName = decodedEvent.event || "Unknown";
        byEvent[eventName] = (byEvent[eventName] || 0) + 1;
        if (eventName === "Transfer") {
          transfers.push({
            blockNumber: entry.blockNumber,
            txHash: entry.transactionHash,
            from: decodedEvent.from,
            to: decodedEvent.to,
            valueHuman: decodedEvent.valueHuman,
            token: log.address,
          });
        }
      } else {
        byEvent.Unknown += 1;
      }
    }

    // 3) Summary stats
    const sampleSize = Math.min(5, decoded.length);
    const sample = decoded.slice(0, sampleSize).map(e => ({
      address: e.address,
      blockNumber: e.blockNumber,
      txHash: e.transactionHash.slice(0, 18) + "...",
      decoded: e.decoded ? `${e.decoded.event} (${e.decoded.from?.slice(0, 10)}... → ${e.decoded.to?.slice(0, 10)}...)` : "unknown",
    }));

    console.log(JSON.stringify({
      ok: true,
      rpc: "https://rpc.testnet.arc.io",
      chainHead: latestHead,
      blockRange: { fromBlock, toBlock: latestHead },
      totalLogs: logs.length,
      decodedSummary: byEvent,
      transfersFound: transfers.length,
      sampleTransfers: transfers.slice(0, 3).map(t => ({
        block: t.blockNumber,
        tx: t.txHash.slice(0, 18) + "...",
        from: t.from.slice(0, 12) + "...",
        to: t.to.slice(0, 12) + "...",
        value: t.valueHuman.toFixed(6),
        token: t.token.slice(0, 12) + "...",
      })),
      sample,
    }, null, 2));

    process.exit(0);
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: { code: e.code, message: e.message } }, null, 2));
    process.exit(1);
  }
})();