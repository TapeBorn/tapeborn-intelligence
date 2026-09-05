// BUILD_010 — First Signal Artifact
// DoD: Mint first testnet NFT representing a verified signal.

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const solc = require("solc");
const { getBlockNumber, getChainId } = require("../src/orchestrator/arc");
const { scanBlocks } = require("../src/signal/engine");
const { buildMetadata } = require("../src/metadata");
const { getCurrentNetwork } = require("../src/orchestrator/networks");

const { getRpcUrl } = require("../src/orchestrator/networks");
const RPC_URL = getRpcUrl();
const PRIVATE_KEY = process.env.DEV_WALLET_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("ERROR: DEV_WALLET_PRIVATE_KEY environment variable is required.");
  console.error("Set it with: export DEV_WALLET_PRIVATE_KEY=0x...");
  process.exit(1);
}
// Dry-run safety: if DRY_RUN=1, skip actual deployment
const isDryRun = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
if (isDryRun) {
  console.log("🔬 DRY RUN MODE — No transactions will be sent.");
}

// Kontrak Solidity
const contractSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract SignalArtifact is ERC721 {
    uint256 public nextTokenId;
    mapping(uint256 => string) public tokenURIs;

    constructor() ERC721("SignalArtifact", "SIG") {}

    function mint(address to, string memory uri) external {
        uint256 tokenId = nextTokenId++;
        _mint(to, tokenId);
        tokenURIs[tokenId] = uri;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return tokenURIs[tokenId];
    }
}
`;

// Kompilasi kontrak
function compileContract(source) {
    const input = {
        language: "Solidity",
        sources: {
            "SignalArtifact.sol": {
                content: source,
            },
        },
        settings: {
            outputSelection: {
                "*": {
                    "*": ["abi", "evm.bytecode"],
                },
            },
        },
    };
    const pathModule = require('path');
    const output = JSON.parse(solc.compile(JSON.stringify(input), {
        import: function (importPath) {
            const fullPath = pathModule.join(__dirname, "../node_modules", importPath);
            return { contents: fs.readFileSync(fullPath, "utf8") };
        }
    }));
    if (output.errors) {
        for (const err of output.errors) {
            console.error(err.formattedMessage || err.message);
        }
        throw new Error("Compilation failed");
    }
    const contract = output.contracts["SignalArtifact.sol"]["SignalArtifact"];
    return {
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object,
    };
}

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

        // Compile kontrak
        console.log("Compiling contract...");
        const { abi, bytecode } = compileContract(contractSource);
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

        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

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

        console.log("Deploying SignalArtifact contract...");
        const factory = new ethers.ContractFactory(abi, bytecode, wallet);
        const contract = await factory.deploy();
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