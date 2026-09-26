// BUILD_010 — First Signal Artifact
// DoD: Mint first testnet NFT representing a verified signal.

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { getBlockNumber, getChainId } = require("../src/orchestrator/arc");
const { scanBlocks } = require("../src/signal/engine");
const { buildMetadata } = require("../src/metadata");
const { getCurrentNetwork, getRpcUrl } = require("../src/orchestrator/networks");

const RPC_URL = getRpcUrl();

// Dry-run safety: if DRY_RUN=1, skip actual deployment
const isDryRun = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
if (isDryRun) {
  console.log("🔬 DRY RUN MODE — No transactions will be sent.");
}

// Only require private key for real deployment
if (!isDryRun) {
  const PRIVATE_KEY = process.env.DEV_WALLET_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error("ERROR: DEV_WALLET_PRIVATE_KEY environment variable is required.");
    console.error("Set it with: export DEV_WALLET_PRIVATE_KEY=0x...");
    process.exit(1);
  }
}

// Load contract artifact from Hardhat compilation (single source of truth)
const artifactPath = path.join(__dirname, "../artifacts-hardhat/contracts/SignalArtifact.sol/SignalArtifact.json");
if (!fs.existsSync(artifactPath)) {
  console.error("ERROR: Contract artifact not found. Run 'npm run compile' first.");
  process.exit(1);
}
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const { abi, bytecode } = artifact;

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

    // Siapkan metadata menggunakan BUILD_011 schema
    const blockData = { number: signal.data.blockNumber };
    const metadata = buildMetadata(signal, blockData, { artifactNumber: 1 });
    const metadataURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`;

    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Chain ID verification (BUILD_016 hardening)
    const currentNetwork = getCurrentNetwork();
    const onChainId = await provider.getNetwork().then(n => Number(n.chainId));
    if (onChainId !== currentNetwork.chainId) {
      console.error(`❌ Chain ID mismatch! Expected ${currentNetwork.chainId} (${currentNetwork.name}) but got ${onChainId}.`);
      console.error(`   RPC: ${RPC_URL}`);
      console.error(`   Aborting deployment. Set ARC_NETWORK correctly or use the correct RPC.`);
      process.exit(1);
    }
    console.log(`✅ Chain ID verified: ${onChainId} (matches ${currentNetwork.name})`);

    // Deployment parameters (R5 admin model)
    // For testnet/dry-run: mintFee=0, maxSupply=0 (unlimited), baseURI=""
    const name = "SignalArtifact";
    const symbol = "SIG";
    const baseURI = "";
    const mintFee = 0n;
    const maxSupply = 0n; // 0 = unlimited

    console.log("");
    console.log("📋 Deployment Parameters:");
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Base URI: ${baseURI || "(empty)"}`);
    console.log(`   Mint Fee: ${mintFee} wei (${mintFee === 0n ? "FREE" : ""})`);
    console.log(`   Max Supply: ${maxSupply === 0n ? "unlimited" : maxSupply}`);
    console.log("");

    // Deploy kontrak
    if (isDryRun) {
      console.log("🔬 DRY RUN: Skipping actual contract deployment.");
      const contractAddress = "0x0000000000000000000000000000000000000000";
      const deployTx = { hash: "0x0000000000000000000000000000000000000000000000000000000000000000" };
      const tokenIdNumber = 0;
      const tx = { hash: "0x0000000000000000000000000000000000000000000000000000000000000000" };
      const artifact = {
        contractAddress,
        tokenId: tokenIdNumber,
        metadata,
        metadataURI,
        txHash: tx.hash,
        deployTxHash: deployTx.hash,
        simulated: true,
        note: "Dry run — contract not actually deployed. Set DRY_RUN=0 to deploy for real.",
      };
      const artifactPath = path.join(__dirname, "../artifacts/signal_artifact_dryrun.json");
      fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
      console.log(`Artifact saved to ${artifactPath}`);
      console.log("BUILD_010 dry-run completed.");
      process.exit(0);
    }

    // Real deployment - require private key
    const PRIVATE_KEY = process.env.DEV_WALLET_PRIVATE_KEY;
    if (!PRIVATE_KEY) {
      console.error("ERROR: DEV_WALLET_PRIVATE_KEY environment variable is required.");
      console.error("Set it with: export DEV_WALLET_PRIVATE_KEY=0x...");
      process.exit(1);
    }

    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("Deploying SignalArtifact contract...");
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const contract = await factory.deploy(name, symbol, baseURI, mintFee, maxSupply);
    const deployTx = contract.deploymentTransaction();
    console.log(`Deployment tx: ${deployTx.hash}`);
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    console.log(`Contract deployed at: ${contractAddress}`);

    // Mint token
    console.log("Minting token...");
    const tx = await contract.mint(wallet.address, metadataURI);
    await tx.wait();
    const tokenId = await contract.nextTokenId();
    const tokenIdNumber = Number(tokenId) - 1;
    console.log(`Token minted! Token ID: ${tokenIdNumber}`);

    // Simpan artefak
    const artifact = {
      contractAddress: contractAddress,
      tokenId: tokenIdNumber,
      metadata,
      metadataURI,
      txHash: tx.hash,
      deployTxHash: deployTx.hash,
    };
    const artifactPath = path.join(__dirname, "../artifacts/signal_artifact.json");
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
    console.log(`Artifact saved to ${artifactPath}`);

    console.log("BUILD_010 completed successfully.");
    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();