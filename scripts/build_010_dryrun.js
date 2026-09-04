// BUILD_010 — First Signal Artifact (Dry Run)
// DoD: Mint first testnet NFT representing a verified signal.
// This is a simulation that generates metadata and prepares the artifact without deploying.

const fs = require("fs");
const path = require("path");
const { getBlockNumber } = require("../src/orchestrator/arc");
const { scanBlocks } = require("../src/signal/engine");
const { buildMetadata } = require("../src/metadata");

(async () => {
  try {
    // Ambil sinyal terbaru
    const latest = await getBlockNumber();
    const fromBlock = Math.max(0, latest - 9);
    const signals = await scanBlocks(fromBlock, latest);
    if (signals.length === 0) {
      console.log("No signals found. Nothing to mint.");
      process.exit(0);
    }

    // Pilih sinyal pertama sebagai artefak
    const signal = signals[0];

    // Siapkan metadata
    // Siapkan metadata menggunakan BUILD_011 schema
    const blockData = { number: signal.data.blockNumber };
    const metadata = buildMetadata(signal, blockData, { artifactNumber: 1 });
    const metadataURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`;

    // Simulasi deployment dan mint
    const simulatedContractAddress = "0x" + "abcdef".padStart(40, "0");
    const simulatedTokenId = 1;
    const simulatedTxHash = "0x" + "deadbeef".padStart(64, "0");

    // Simpan artefak
    const artifact = {
      contractAddress: simulatedContractAddress,
      tokenId: simulatedTokenId,
      metadata,
      metadataURI,
      txHash: simulatedTxHash,
      simulated: true,
      note: "Dry run — contract not actually deployed. Set DEV_WALLET_PRIVATE_KEY to mint for real.",
    };
    const artifactPath = path.join(__dirname, "../artifacts/signal_artifact_dryrun.json");
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
    console.log(`[DRY RUN] Artifact saved to ${artifactPath}`);
    console.log(`[DRY RUN] Metadata: ${JSON.stringify(metadata, null, 2)}`);
    console.log("\nBUILD_010 dry-run completed successfully.");
    console.log("To deploy for real, set DEV_WALLET_PRIVATE_KEY and run build_010.js");
    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();