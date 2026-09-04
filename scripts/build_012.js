// BUILD_012 — Public Dashboard
// DoD: Display signals and supporting evidence.
// Server runs on http://localhost:3457

const http = require("http");
const { scanBlocks } = require("../src/signal/engine");
const { getBlockNumber } = require("../src/orchestrator/arc");

const PORT = process.env.DASHBOARD_PORT || 3457;

/**
 * Format signals as HTML dashboard
 */
function renderDashboard(signals, blockRange, timestamp) {
  const signalCount = signals.length;
  const hasSignals = signalCount > 0;

  const signalCards = hasSignals
    ? signals.map((s, idx) => {
        const evidence = s.evidence || {};
        const data = s.data || {};
        const provenance = s.provenance || {};

        // Build evidence list
        const evidenceItems = [];
        if (evidence.txHash) evidenceItems.push({ label: "Transaction", value: evidence.txHash, type: "tx" });
        if (evidence.block) evidenceItems.push({ label: "Block", value: evidence.block, type: "block" });
        if (data.inputLength !== undefined) evidenceItems.push({ label: "Input Length", value: data.inputLength + " bytes", type: "data" });
        if (data.valueUsdc !== undefined) evidenceItems.push({ label: "USDC Value", value: data.valueUsdc + " USDC", type: "data" });
        // Add any extra evidence fields
        for (const [key, val] of Object.entries(evidence)) {
          if (!["txHash", "block", "description"].includes(key)) {
            evidenceItems.push({ label: key, value: val, type: "data" });
          }
        }

        // Provenance fields
        const provFields = [];
        if (provenance.chain) provFields.push({ label: "Chain", value: provenance.chain });
        if (provenance.chainId) provFields.push({ label: "Chain ID", value: provenance.chainId });
        if (provenance.block) provFields.push({ label: "Source Block", value: provenance.block });
        if (provenance.sourceTransaction) provFields.push({ label: "Source Transaction", value: provenance.sourceTransaction });
        if (provenance.timestamp) provFields.push({ label: "Source Timestamp", value: provenance.timestamp });
        if (provenance.from) provFields.push({ label: "From", value: provenance.from });

        return `
        <div class="signal-card">
          <div class="signal-header">
            <span class="signal-type">${s.type || "unknown"}</span>
            <span class="signal-id">${s.id || "N/A"}</span>
          </div>
          <div class="signal-body">
            <div class="signal-meta">
              <span class="meta-item"><strong>Confidence:</strong> ${s.confidence || "N/A"}</span>
              <span class="meta-item"><strong>Version:</strong> ${s.version || "N/A"}</span>
            </div>
            ${evidenceItems.length > 0 ? `
            <div class="evidence-section">
              <h4>Evidence</h4>
              <ul>
                ${evidenceItems.map(e => `<li><span class="evidence-label">${e.label}:</span> <span class="evidence-value">${e.value}</span></li>`).join("")}
              </ul>
            </div>` : ""}
            ${provFields.length > 0 ? `
            <div class="provenance-section">
              <h4>Provenance</h4>
              <ul>
                ${provFields.map(p => `<li><span class="prov-label">${p.label}:</span> <span class="prov-value">${p.value}</span></li>`).join("")}
              </ul>
            </div>` : ""}
          </div>
        </div>
        `;
      })
    : '<p class="no-signals">No signals detected in the scanned block range.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TapeBorn — Signal Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0b0e14;
      color: #d0d7e6;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      font-size: 2rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: #e6edf5;
      margin-bottom: 0.2rem;
    }
    .subhead {
      color: #7a8a9e;
      font-size: 0.95rem;
      margin-bottom: 2rem;
      border-left: 3px solid #2a6f97;
      padding-left: 1rem;
    }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 2rem;
      background: #161c26;
      border-radius: 12px;
      padding: 1rem 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid #1f2a36;
    }
    .stat-item {
      display: flex;
      flex-direction: column;
    }
    .stat-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #7a8a9e;
    }
    .stat-value {
      font-size: 1.2rem;
      font-weight: 500;
      color: #e6edf5;
    }
    .signal-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 768px) {
      .signal-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    @media (min-width: 1024px) {
      .signal-grid {
        grid-template-columns: 1fr 1fr 1fr;
      }
    }
    .signal-card {
      background: #161c26;
      border-radius: 12px;
      border: 1px solid #1f2a36;
      padding: 1.2rem 1.5rem;
      transition: border-color 0.2s;
    }
    .signal-card:hover {
      border-color: #2a6f97;
    }
    .signal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .signal-type {
      background: #1f2a36;
      color: #8ab4d6;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.2rem 0.7rem;
      border-radius: 20px;
      border: 1px solid #2a3a4a;
    }
    .signal-id {
      font-size: 0.75rem;
      color: #7a8a9e;
      font-family: 'JetBrains Mono', monospace;
      word-break: break-all;
    }
    .signal-body {
      margin-top: 0.25rem;
    }
    .signal-meta {
      display: flex;
      gap: 1.5rem;
      font-size: 0.85rem;
      color: #b0c0d0;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }
    .meta-item {
      background: #0f151e;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
    }
    .evidence-section, .provenance-section {
      margin-top: 0.8rem;
      border-top: 1px solid #1f2a36;
      padding-top: 0.8rem;
    }
    .evidence-section h4, .provenance-section h4 {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #7a8a9e;
      margin-bottom: 0.4rem;
    }
    .evidence-section ul, .provenance-section ul {
      list-style: none;
      font-size: 0.8rem;
      font-family: 'JetBrains Mono', monospace;
      word-break: break-all;
    }
    .evidence-section li, .provenance-section li {
      margin-bottom: 0.2rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem 0.6rem;
    }
    .evidence-label, .prov-label {
      color: #7a8a9e;
      font-weight: 500;
    }
    .evidence-value, .prov-value {
      color: #d0d7e6;
    }
    .no-signals {
      color: #7a8a9e;
      font-style: italic;
      padding: 2rem 0;
      text-align: center;
    }
    .footer {
      margin-top: 3rem;
      font-size: 0.75rem;
      color: #4a5a6e;
      text-align: center;
      border-top: 1px solid #1f2a36;
      padding-top: 1.5rem;
    }
    .refresh-note {
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: #4a5a6e;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>⏺ TapeBorn</h1>
    <div class="subhead">On-chain intelligence · Signal Dashboard</div>

    <div class="stats">
      <div class="stat-item">
        <span class="stat-label">Signals</span>
        <span class="stat-value">${signalCount}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Block Range</span>
        <span class="stat-value">${blockRange.fromBlock} – ${blockRange.toBlock}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Last Updated</span>
        <span class="stat-value">${timestamp}</span>
      </div>
    </div>

    <div class="signal-grid">
      ${signalCards}
    </div>

    <div class="footer">
      <div>Arc Testnet · Chain ID 5042002</div>
      <div class="refresh-note">Dashboard auto-refreshes every 30 seconds</div>
    </div>
  </div>
  <script>
    // Auto-refresh every 30 seconds
    setTimeout(() => {
      window.location.reload();
    }, 30000);
  </script>
</body>
</html>`;
}

/**
 * HTTP request handler
 */
async function handleRequest(req, res) {
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  try {
    const latest = await getBlockNumber();
    const fromBlock = Math.max(0, latest - 19); // last 20 blocks
    const signals = await scanBlocks(fromBlock, latest);

    // Limit to 50 signals
    const limited = signals.slice(0, 50);

    const html = renderDashboard(limited, { fromBlock, toBlock: latest }, new Date().toISOString());
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } catch (e) {
    res.writeHead(500);
    res.end(`<h1>Error</h1><p>${e.message}</p><p>Please check the Signal Engine and RPC connectivity.</p>`);
  }
}

const server = http.createServer(handleRequest);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[BUILD_012] Dashboard running on http://0.0.0.0:${PORT}`);
  console.log(`  Auto-refresh every 30 seconds`);
  console.log(`  Scans last 20 blocks, shows up to 50 signals`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[BUILD_012] Shutting down...");
  server.close(() => process.exit(0));
});