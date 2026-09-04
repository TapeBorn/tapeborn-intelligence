// BUILD_010 — First Signal Artifact
// DoD: Mint first testnet NFT representing a verified signal.

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const solc = require("solc");
const { getBlockNumber } = require("../src/orchestrator/arc");
const { scanBlocks } = require("../src/signal/engine");
const { buildMetadata } = require("../src/metadata");

const RPC_URL = "https://rpc.testnet.arc.io";
const PRIVATE_KEY = process.env.DEV_WALLET_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("ERROR: DEV_WALLET_PRIVATE_KEY environment variable is required.");
  console.error("Set it with: export DEV_WALLET_PRIVATE_KEY=0x...");
  process.exit(1);
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
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

        // Deploy kontrak
        console.log("Deploying SignalArtifact contract...");
        const factory = new ethers.ContractFactory(abi, bytecode, wallet);
        const contract = await factory.deploy();
        await contract.deployed();
        console.log(`Contract deployed at: ${contract.address}`);

        // Mint token
        console.log("Minting token...");
        const tx = await contract.mint(wallet.address, metadataURI);
        await tx.wait();
        const tokenId = await contract.nextTokenId();
        console.log(`Token minted! Token ID: ${tokenId - 1}`);

        // Simpan artefak
        const artifact = {
            contractAddress: contract.address,
            tokenId: tokenId - 1,
            metadata,
            metadataURI,
            txHash: tx.hash,
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