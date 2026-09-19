#!/usr/bin/env node
// scripts/deploy-mainnet.js
// SignalArtifact contract deployment script for Arc Mainnet
// Usage: node scripts/deploy-mainnet.js [--dry-run] [--verify]

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const shouldVerify = args.includes("--verify");

  console.log("🚀 SignalArtifact Deployment Script");
  console.log("=====================================");
  console.log(`Network: ${dryRun ? "DRY RUN (testnet)" : "arcMainnet"}`);
  console.log(`Verify: ${shouldVerify ? "Yes" : "No"}`);
  console.log("");

  // Check required environment variables
  const requiredEnvVars = ["DEV_WALLET_PRIVATE_KEY"];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deployer: ${deployer.address}`);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.1")) {
    console.warn("⚠️  Warning: Balance below 0.1 ETH, deployment may fail");
  }

  // Deployment parameters (R5 admin model)
  const name = "SignalArtifact";
  const symbol = "SIG";
  const baseURI = "https://api.tapeborn.io/metadata/";
  const mintFee = ethers.parseEther("0.001"); // 0.001 ETH mint fee
  const maxSupply = 10000; // 10,000 max supply

  console.log("");
  console.log("📋 Deployment Parameters:");
  console.log(`   Name: ${name}`);
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Base URI: ${baseURI}`);
  console.log(`   Mint Fee: ${ethers.formatEther(mintFee)} ETH`);
  console.log(`   Max Supply: ${maxSupply}`);
  console.log("");

  // Get contract factory
  const factory = await ethers.getContractFactory("SignalArtifact");
  
  // Estimate gas
  console.log("⛽ Estimating gas...");
  const deployTx = factory.getDeployTransaction(name, symbol, baseURI, mintFee, maxSupply);
  const gasEstimate = await ethers.provider.estimateGas(deployTx);
  const gasPrice = await ethers.provider.getGasPrice();
  const estimatedCost = gasEstimate * gasPrice;
  
  console.log(`   Gas estimate: ${gasEstimate.toString()}`);
  console.log(`   Gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
  console.log(`   Estimated cost: ${ethers.formatEther(estimatedCost)} ETH`);
  console.log("");

  if (dryRun) {
    console.log("🔍 DRY RUN - Skipping actual deployment");
    console.log("✅ Gas estimation successful");
    process.exit(0);
  }

  // Deploy contract
  console.log("📦 Deploying contract...");
  const contract = await factory.deploy(name, symbol, baseURI, mintFee, maxSupply);
  
  console.log(`   Transaction hash: ${contract.deploymentTransaction().hash}`);
  console.log("   Waiting for confirmation...");
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log(`✅ Contract deployed at: ${contractAddress}`);
  console.log("");

  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const deployedName = await contract.name();
  const deployedSymbol = await contract.symbol();
  const deployedBaseURI = await contract.baseURI();
  const deployedMintFee = await contract.mintFee();
  const deployedMaxSupply = await contract.maxSupply();
  const deployedOwner = await contract.owner();
  const deployedPaused = await contract.paused();

  console.log(`   Name: ${deployedName} ${deployedName === name ? "✅" : "❌"}`);
  console.log(`   Symbol: ${deployedSymbol} ${deployedSymbol === symbol ? "✅" : "❌"}`);
  console.log(`   Base URI: ${deployedBaseURI} ${deployedBaseURI === baseURI ? "✅" : "❌"}`);
  console.log(`   Mint Fee: ${ethers.formatEther(deployedMintFee)} ETH ${deployedMintFee === mintFee ? "✅" : "❌"}`);
  console.log(`   Max Supply: ${deployedMaxSupply} ${deployedMaxSupply === maxSupply ? "✅" : "❌"}`);
  console.log(`   Owner: ${deployedOwner} ${deployedOwner === deployer.address ? "✅" : "❌"}`);
  console.log(`   Paused: ${deployedPaused} ${!deployedPaused ? "✅" : "❌"}`);
  console.log("");

  // Save deployment info
  const deploymentInfo = {
    network: "arcMainnet",
    chainId: 5042,
    contractAddress,
    deployer: deployer.address,
    deploymentTx: contract.deploymentTransaction().hash,
    blockNumber: (await ethers.provider.getTransactionReceipt(contract.deploymentTransaction().hash)).blockNumber,
    timestamp: new Date().toISOString(),
    parameters: {
      name,
      symbol,
      baseURI,
      mintFee: mintFee.toString(),
      maxSupply: maxSupply.toString()
    },
    verified: false
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `deployment-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${deploymentFile}`);

  // Verify on explorer if requested
  if (shouldVerify) {
    console.log("");
    console.log("🔍 Verifying contract on Arc Explorer...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [name, symbol, baseURI, mintFee, maxSupply],
      });
      console.log("✅ Contract verified on Arc Explorer");
      
      // Update deployment info
      deploymentInfo.verified = true;
      fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    } catch (error) {
      console.error("❌ Verification failed:", error.message);
      console.log("   You can verify manually later with:");
      console.log(`   npx hardhat verify --network arcMainnet ${contractAddress} "${name}" "${symbol}" "${baseURI}" ${mintFee} ${maxSupply}`);
    }
  }

  console.log("");
  console.log("🎉 Deployment complete!");
  console.log(`   Contract: ${contractAddress}`);
  console.log(`   Explorer: https://explorer.mainnet.arc.io/address/${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });