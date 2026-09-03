// BUILD_009 — Signal Feed. Expose signals through JSON/API and readable output.
// DoD: Expose signals through JSON/API and readable output.

const http = require("http");
const { scanBlocks } = require("../src/signal/engine");
const { getBlockNumber } = require("../src/orchestrator/arc");

const PORT = process.env.SIGNAL_PORT || 3456;

/**
 * Format signals as readable text
 */
function formatReadable(signals) {
  if (!signals || signals.length === 0) return "No signals detected.\n";
  let output = `=== TapeBorn Signal Feed ===\n`;
  output += `Total signals: ${signals.length}\n\n`;
  for (const s of signals) {
    output += `[${s.type}] ${s.evidence.description}\n`;
    output += `  ID: ${s.id}\n`;
    output += `  Block: ${s.data.blockNumber || s.evidence.block || 'N/A'}\n`;
    output += `  Tx: ${s.evidence.txHash || 'N/A'}\n`;
    output += `  Confidence: ${s.confidence}\n`;
    output += `  Version: ${s.version}\n\n`;
  }
  return output;
}

/**
 * Serve signals as JSON
 */
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // Only allow GET
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  // Parse query params
  const limit = parseInt(url.searchParams.get("limit")) || 50;
  const format = url.searchParams.get("format") || "json"; // 'json' or 'text'

  try {
    const latest = await getBlockNumber();
    const fromBlock = Math.max(0, latest - 19); // last 20 blocks
    const signals = await scanBlocks(fromBlock, latest);

    // Apply limit
    const limited = signals.slice(0, limit);

    if (format === "text") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(formatReadable(limited));
      return;
    }

    // Default: JSON
    const response = {
      ok: true,
      rpc: "https://rpc.testnet.arc.io",
      blockRange: { fromBlock, toBlock: latest },
      totalSignals: signals.length,
      returned: limited.length,
      signals: limited,
      feed: "https://docs.arc.io/arc/references/contract-addresses", // placeholder
      version: "v0",
      timestamp: new Date().toISOString(),
    };
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(response, null, 2));
  } catch (e) {
    res.writeHead(500);
    res.end(JSON.stringify({ ok: false, error: e.message }));
  }
}

const server = http.createServer(handleRequest);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[BUILD_009] Signal Feed running on http://0.0.0.0:${PORT}`);
  console.log(`  GET / -> JSON (limit param optional, default 50)`);
  console.log(`  GET /?format=text -> human-readable output`);
  console.log(`  GET /?limit=10 -> limit results`);
});

// Handle shutdown gracefully
process.on("SIGINT", () => {
  console.log("\n[BUILD_009] Shutting down...");
  server.close(() => process.exit(0));
});

// Also run once for verification
(async () => {
  try {
    const latest = await getBlockNumber();
    const fromBlock = Math.max(0, latest - 9);
    const signals = await scanBlocks(fromBlock, latest);
    console.log(`\n[BUILD_009] Verification: scanned blocks ${fromBlock}-${latest}, found ${signals.length} signals`);
    console.log(`  Signal types:`, signals.reduce((acc, s) => { acc[s.type] = (acc[s.type] || 0) + 1; return acc; }, {}));
  } catch (e) {
    console.error("Verification failed:", e.message);
  }
})();