// BUILD_011 — Metadata System
// DoD: Standardize provenance, Signal ID and source transaction.
// This script converts signals from the signal engine into standardized metadata,
// validates the metadata, and verifies Signal ID stability.

const fs = require("fs");
const path = require("path");
const { getBlockNumber } = require("../src/orchestrator/arc");
const { scanBlocks } = require("../src/signal/engine");
const { buildMetadata, validateMetadata, generateSignalId } = require("../src/metadata");

// Helper: get block number from signal or fetch latest
async function getBlockData(blockNumber) {
  // We don't need full block data for metadata; provenance uses signal data.
  return { number: blockNumber };
}

// Test: generate metadata for a single signal
async function testSingleSignal(signal, index) {
  const blockData = await getBlockData(signal.data?.blockNumber);
  const metadata = buildMetadata(signal, blockData, { artifactNumber: index + 1 });
  const validation = validateMetadata(metadata);
  return { metadata, validation };
}

// Test: Signal ID stability (same signal should produce same ID)
function testSignalIdStability(signal, provenance) {
  const id1 = generateSignalId(signal, provenance);
  const id2 = generateSignalId(signal, provenance);
  return { stable: id1 === id2, id: id1 };
}

// Main
(async () => {
  try {
    console.log("[BUILD_011] Starting metadata system verification...");

    const latest = await getBlockNumber();
    const fromBlock = Math.max(0, latest - 9);
    const signals = await scanBlocks(fromBlock, latest);

    if (signals.length === 0) {
      console.log("No signals found. Cannot test metadata generation.");
      process.exit(0);
    }

    console.log(`Found ${signals.length} signals. Generating metadata...`);

    const results = [];
    const metadataList = [];
    const idStabilityTests = [];

    for (let i = 0; i < Math.min(5, signals.length); i++) {
      const signal = signals[i];
      const result = await testSingleSignal(signal, i);
      results.push({
        signalIndex: i,
        signalType: signal.type,
        metadata: result.metadata,
        valid: result.validation.valid,
        errors: result.validation.errors,
      });
      metadataList.push(result.metadata);

      // Test ID stability
      const prov = result.metadata.provenance;
      const stability = testSignalIdStability(signal, prov);
      idStabilityTests.push({
        signalIndex: i,
        signalId: result.metadata.signalId,
        stable: stability.stable,
      });
    }

    // Summary
    const validCount = results.filter(r => r.valid).length;
    const totalTested = results.length;
    const allValid = validCount === totalTested;
    const allStable = idStabilityTests.every(t => t.stable);

    // Additional check: different signals should have different IDs (if they have different provenance)
    const uniqueIds = new Set(metadataList.map(m => m.signalId));
    const idsUnique = uniqueIds.size === metadataList.length;

    console.log(JSON.stringify({
      ok: true,
      totalSignals: signals.length,
      tested: totalTested,
      validMetadata: validCount,
      allValid,
      allStable,
      idsUnique,
      idStabilityTests,
      sampleMetadata: results.slice(0, 3).map(r => ({
        signalId: r.metadata.signalId,
        signalType: r.metadata.signalType,
        provenance: r.metadata.provenance,
        confidence: r.metadata.signal.confidence,
        version: r.metadata.signal.version,
        evidenceCount: r.metadata.evidence.length,
      })),
      validationErrors: results.filter(r => !r.valid).flatMap(r => r.errors),
    }, null, 2));

    // Write metadata to artifact file for reference (non-deployment)
    const artifactPath = path.join(__dirname, "../artifacts/build_011_metadata_sample.json");
    fs.writeFileSync(artifactPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      sampleSize: results.length,
      metadata: results.map(r => r.metadata),
    }, null, 2));
    console.log(`\n[BUILD_011] Sample metadata saved to ${artifactPath}`);

    if (allValid && allStable && idsUnique) {
      console.log("\n[BUILD_011] ✅ All tests passed. Metadata system ready.");
      process.exit(0);
    } else {
      console.log("\n[BUILD_011] ⚠️ Some tests failed. See details above.");
      process.exit(1);
    }
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: { message: e.message } }, null, 2));
    process.exit(1);
  }
})();