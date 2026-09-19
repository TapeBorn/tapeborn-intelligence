#!/usr/bin/env node
// scripts/verify-contract.js
// SignalArtifact contract verification script for Arc Explorer
// Usage: node scripts/verify-contract.js <contractAddress> [network]

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error("Usage: node scripts/verify-contract.js <contractAddress> [network]");
    console.error("Network defaults to arcMainnet");
    process.exit(1);
  }

  const contractAddress = args[0];
  const network = args[1] || "arcMainnet";

  console.log("🔍 SignalArtifact Contract Verification");
  console.log("========================================");
  console.log(`Contract: ${contractAddress}`);
  console.log(`Network: ${network}`);
  console.log("");

  // Check if address is valid
  if (!ethers.isAddress(contractAddress)) {
    console.error("❌ Invalid contract address");
    process.exit(1);
  }

  try {
    // Get contract factory
    const factory = await ethers.getContractFactory("SignalArtifact");
    
    // Attach to deployed contract
    const contract = factory.attach(contractAddress);
    
    // Read constructor arguments from deployment file or prompt
    let deploymentsDir = path.join(__dirname, "..", "deployments");
    let constructorArgs = null;
    
    if (fs.existsSync(deploymentsDir)) {
      const files = fs.readdirSync(deploymentsDir)
        .filter(f => f.endsWith(".json"))
        .sort()
        .reverse();
      
      for (const file of files) {
        const deployment = JSON.parse(fs.readFileSync(path.join(deploymentsDir, file), "utf8"));
        if (deployment.contractAddress.toLowerCase() === contractAddress.toLowerCase()) {
          constructorArgs = [
            deployment.parameters.name,
            deployment.parameters.symbol,
            deployment.parameters.baseURI,
            deployment.parameters.mintFee,
            deployment.parameters.maxSupply
          ];
          console.log(`📄 Found deployment info: ${file}`);
          break;
        }
      }
    }
    
    if (!constructorArgs) {
      console.log("⚠️  No deployment info found, using default parameters");
      constructorArgs = [
        "SignalArtifact",
        "SIG",
        "https://api.tapeborn.io/metadata/",
        "1000000000000000", // 0.001 ETH
        "10000"
      ];
    }

    console.log("📋 Constructor arguments:");
    console.log(`   Name: ${constructorArgs[0]}`);
    console.log(`   Symbol: ${constructorArgs[1]}`);
    console.log(`   Base URI: ${constructorArgs[2]}`);
    console.log(`   Mint Fee: ${ethers.formatEther(constructorArgs[3])} ETH`);
    console.log(`   Max Supply: ${constructorArgs[4]}`);
    console.log("");

    // Verify contract
    console.log("🔍 Verifying contract on Arc Explorer...");
    
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
    });

    console.log("✅ Contract verified successfully!");
    console.log(`   Explorer: https://explorer.mainnet.arc.io/address/${contractAddress}`);
    
    // Update deployment file if exists
    if (fs.existsSync(deploymentsDir)) {
      const files = fs.readdirSync(deploymentsDir)
        .filter(f => f.endsWith(".json"))
        .sort()
        .reverse();
      
      for (const file of files) {
        const deploymentPath = path.join(deploymentsDir, file);
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
        if (deployment.contractAddress.toLowerCase() === contractAddress.toLowerCase()) {
          deployment.verified = true;
          deployment.verifiedAt = new Date().toISOString();
          fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
          console.log(`💾 Updated deployment record: ${file}`);
          break;
        }
      }
    }

  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Contract is already verified on the explorer");
      process.exit(0);
    }
    
    console.log("");
    console.log("💡 Manual verification command:");
    console.log(`npx hardhat verify --network ${network} ${contractAddress} "${constructorArgs[0]}" "${constructorArgs[1]}" "${constructorArgs[2]}" ${constructorArgs[3]} ${constructorArgs[4]}`);
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });