// BUILD_017 — Post-launch Usage Measurement
// Measure signal pipeline usage statistics.
// DoD: Measure usage, improve signals, evaluate new chains.

const { getBlockNumber } = require("../src/orchestrator/arc");
const { scanBlocks } = require("../src/signal/engine");
const fs = require("fs");
const path = require("path");

async function measureUsage() {
  const latest = await getBlockNumber();
  const fromBlock = Math.max(0, latest - 99); // last 100 blocks
  const signals = await scanBlocks(fromBlock, latest);

  // Aggregate by type
  const typeCounts = {};
  const confidenceDistribution = [];
  const evidenceAvailability = {
    hasTxHash: 0,
    hasBlock: 0,
    hasInputLength: 0,
    hasValueUsdc: 0,
    total: signals.length,
  };

  for (const s of signals) {
    typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
    confidenceDistribution.push(s.confidence || 0);

    if (s.evidence?.txHash) evidenceAvailability.hasTxHash++;
    if (s.evidence?.block) evidenceAvailability.hasBlock++;
    if (s.data?.inputLength !== undefined) evidenceAvailability.hasInputLength++;
    if (s.data?.valueUsdc !== undefined) evidenceAvailability.hasValueUsdc++;
  }

  const totalSignals = signals.length;
  const uniqueTypes = Object.keys(typeCounts);

  const usageReport = {
    timestamp: new Date().toISOString(),
    blockRange: { fromBlock, toBlock: latest },
    totalSignals,
    uniqueSignalTypes: uniqueTypes,
    typeCounts,
    confidence: {
      avg: totalSignals > 0 ? confidenceDistribution.reduce((a,b) => a + b, 0) / totalSignals : 0,
      min: totalSignals > 0 ? Math.min(...confidenceDistribution) : 0,
      max: totalSignals > 0 ? Math.max(...confidenceDistribution) : 0,
    },
    evidenceAvailability,
    version: "v0",
  };

  const artifactPath = path.join(__dirname, "../artifacts/build_017_usage_report.json");
  // Read existing history if any
  let history = [];
  if (fs.existsSync(artifactPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      if (Array.isArray(existing)) {
        history = existing;
      } else {
        // old format: single object, convert to array
        history = [existing];
      }
    } catch (e) {
      // ignore
    }
  }
  // Append new report
  history.push(usageReport);
  fs.writeFileSync(artifactPath, JSON.stringify(history, null, 2));
  console.log(`[BUILD_017] Usage report appended to ${artifactPath}`);
  console.log(`[BUILD_017] Usage report saved to ${artifactPath}`);
  console.log(`  Total signals: ${totalSignals}`);
  console.log(`  Types: ${uniqueTypes.join(", ")}`);
  console.log(`  Confidence avg: ${usageReport.confidence.avg.toFixed(2)}`);
  return usageReport;
}

(async () => {
  try {
    await measureUsage();
    console.log("[BUILD_017] Usage measurement completed.");
    process.exit(0);
  } catch (e) {
    console.error("[BUILD_017] Error:", e.message);
    process.exit(1);
  }
})();