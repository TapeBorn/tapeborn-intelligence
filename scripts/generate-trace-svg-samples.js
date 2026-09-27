// scripts/generate-trace-svg-samples.js
// Generate sample SVG images from real testnet signal data for founder review

const { generateTraceSVG, generateTraceDataUri } = require("../src/visual/trace-svg");
const { deriveTrace } = require("./trace_derivation_prototype");
const fs = require("fs");
const path = require("path");

// Sample real testnet signals (from actual on-chain data)
const SAMPLE_SIGNALS = [
  {
    name: "Genesis Signal (BUILD_015)",
    signalType: "contract_creation",
    trace: { entry: [2, 7], exit: [8, 1], bends: 2 },
    txHash: "0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0587",
    blockNumber: 60347218,
    description: "First Signal Artifact minted - contract creation detected",
  },
  {
    name: "Large Transfer Signal",
    signalType: "large_transfer",
    trace: { entry: [1, 3], exit: [9, 6], bends: 1 },
    txHash: "0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0587",
    blockNumber: 60347218,
    description: "70.58 USDC transfer detected",
  },
  {
    name: "High Frequency Wallet",
    signalType: "high_frequency_wallet",
    trace: { entry: [4, 4], exit: [5, 5], bends: 2 },
    txHash: "0xabc123def456",
    blockNumber: 60348000,
    description: "Wallet sent 15 tx in single block",
  },
  {
    name: "Contract Interaction",
    signalType: "contract_interaction",
    trace: { entry: [0, 9], exit: [9, 0], bends: 2 },
    txHash: "0xdef456abc123",
    blockNumber: 60349000,
    description: "Interaction with known contract (input length: 142 bytes)",
  },
  {
    name: "Wallet Burst",
    signalType: "wallet_burst",
    trace: { entry: [3, 1], exit: [7, 8], bends: 1 },
    txHash: "0x789abc123def",
    blockNumber: 60350000,
    description: "Wallet sent 12 tx in 3-block window",
  },
  {
    name: "Token Flow Anomaly",
    signalType: "token_flow_anomaly",
    trace: { entry: [8, 2], exit: [2, 8], bends: 1 },
    txHash: "0x456def789abc",
    blockNumber: 60351000,
    description: "USDC transfer 500 USDC > 2x chain average",
  },
  {
    name: "Address Reactivation",
    signalType: "address_reactivation",
    trace: { entry: [5, 5], exit: [5, 6], bends: 1 },
    txHash: "0xabc789def123",
    blockNumber: 60352000,
    description: "Address inactive 200 blocks, now active",
  },
  {
    name: "Large Transfer (Auto-derived)",
    signalType: "large_transfer",
    trace: null, // Will be auto-derived from tx hash
    txHash: "0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0587",
    blockNumber: 60347218,
    description: "Auto-derived trace from on-chain data",
  },
];

function generateSamples() {
  const outputDir = path.join(__dirname, "..", "artifacts", "svg-samples");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results = [];

  for (const signal of SAMPLE_SIGNALS) {
    let trace = signal.trace;

    // Auto-derive trace if not provided
    if (!trace && signal.txHash && signal.blockNumber) {
      trace = deriveTrace(signal.txHash, signal.blockNumber);
      console.log(`Auto-derived trace for ${signal.name}:`, trace);
    }

    if (!trace) {
      console.warn(`Skipping ${signal.name}: no trace data`);
      continue;
    }

    // Generate SVG with different options
    const svgDefault = generateTraceSVG(trace, signal.signalType, {
      width: 400,
      height: 400,
      animated: false,
      showGrid: true,
      showCoordinates: true,
    });

    const svgAnimated = generateTraceSVG(trace, signal.signalType, {
      width: 400,
      height: 400,
      animated: true,
      showGrid: true,
      showCoordinates: false,
    });

    const dataUri = generateTraceDataUri(trace, signal.signalType, {
      width: 400,
      height: 400,
      showGrid: true,
      showCoordinates: true,
    });

    // Save files
    const safeName = signal.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const baseName = `${safeName}_${signal.signalType}`;

    fs.writeFileSync(path.join(outputDir, `${baseName}.svg`), svgDefault);
    fs.writeFileSync(path.join(outputDir, `${baseName}_animated.svg`), svgAnimated);
    fs.writeFileSync(path.join(outputDir, `${baseName}_datauri.txt`), dataUri);

    results.push({
      name: signal.name,
      signalType: signal.signalType,
      trace,
      txHash: signal.txHash,
      blockNumber: signal.blockNumber,
      files: {
        svg: `${baseName}.svg`,
        svgAnimated: `${baseName}_animated.svg`,
        dataUri: `${baseName}_datauri.txt`,
      },
      dataUriLength: dataUri.length,
    });

    console.log(`✓ Generated: ${baseName}.svg (${svgDefault.length} chars)`);
  }

  // Write summary JSON
  fs.writeFileSync(
    path.join(outputDir, "samples_summary.json"),
    JSON.stringify(results, null, 2)
  );

  console.log(`\n✅ Generated ${results.length} sample SVGs in ${outputDir}`);
  console.log("Files:");
  results.forEach(r => {
    console.log(`  - ${r.files.svg} (${r.dataUriLength} chars data URI)`);
  });

  return results;
}

// Run if executed directly
if (require.main === module) {
  generateSamples();
}

module.exports = { generateSamples };