// BUILD_008 — Signal Engine v0.
// DoD: Define deterministic, evidence-backed signals.

const { scanBlocks } = require("../src/signal/engine");
const { getBlockNumber } = require("../src/orchestrator/arc");

(async () => {
  try {
    const latest = await getBlockNumber();
    const fromBlock = Math.max(0, latest - 9); // last 10 blocks
    const toBlock = latest;

    console.log(`[BUILD_008] Scanning blocks ${fromBlock} to ${toBlock} for signals...`);

    const signals = await scanBlocks(fromBlock, toBlock);

    // Group by type
    const grouped = {};
    for (const s of signals) {
      grouped[s.type] = (grouped[s.type] || 0) + 1;
    }

    console.log(JSON.stringify({
      ok: true,
      rpc: "https://rpc.testnet.arc.io",
      blockRange: { fromBlock, toBlock },
      totalSignals: signals.length,
      signalTypes: grouped,
      signals: signals.slice(0, 20), // limit for output
    }, null, 2));

    process.exit(0);
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: { code: e.code, message: e.message } }, null, 2));
    process.exit(1);
  }
})();