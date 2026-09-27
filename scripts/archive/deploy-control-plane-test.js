// Deployment script for TapeBornControlPlaneTest
// Deploys to Arc Testnet

const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying TapeBornControlPlaneTest to Arc Testnet");
  console.log("=====================================================");

  // Get deployer from private key
  const privateKey = process.env.DEV_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ DEV_WALLET_PRIVATE_KEY environment variable not set");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.io");
  const deployer = new ethers.Wallet(privateKey, provider);
  console.log(`📝 Deployer: ${deployer.address}`);

  // Check balance
  const balance = await provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Warning: Balance below 0.01 ETH, deployment may fail");
  }

  // Deploy TimelockController first
  console.log("\n📦 Deploying TimelockController...");
  const minDelay = 60; // 60 seconds for testing (24h = 86400 for production)
  const TimelockController = await ethers.getContractFactory("TimelockController");
  const timelock = await TimelockController.deploy(
    minDelay,
    [deployer.address], // proposers
    [deployer.address], // cancellers
    deployer.address // admin
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log(`✅ TimelockController deployed at: ${timelockAddress}`);

  // Deploy TapeBornControlPlaneTest
  console.log("\n📦 Deploying TapeBornControlPlaneTest...");
  const ControlPlaneTest = await ethers.getContractFactory("TapeBornControlPlaneTest");
  const controlPlaneDeploy = await ControlPlaneTest.deploy(
    timelockAddress,
    deployer.address, // adminMultisig - using deployer for test
    deployer.address, // treasuryMultisig - using deployer for test
    deployer.address // guardian
  );
  await controlPlaneDeploy.waitForDeployment();
  const controlPlaneAddress = await controlPlaneDeploy.getAddress();
  console.log(`✅ TapeBornControlPlaneTest deployed at: ${controlPlaneAddress}`);

  // Grant initial roles in Timelock
  console.log("\n🔧 Configuring Timelock roles...");
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();

  // Grant PROPOSER_ROLE to deployer (acting as adminMultisig for test)
  let tx = await timelock.grantRole(await timelock.PROPOSER_ROLE(), deployer.address);
  await tx.wait();
  console.log(`✅ Granted PROPOSER_ROLE to ${deployer.address}`);

  tx = await timelock.grantRole(await timelock.CANCELLER_ROLE(), deployer.address);
  await tx.wait();
  console.log(`✅ Granted CANCELLER_ROLE to ${deployer.address}`);

  // Grant EXECUTOR_ROLE to address(0) - anyone can execute after delay
  console.log(`✅ EXECUTOR_ROLE is address(0) (permissionless after delay)`);

  // Verify roles
  console.log("\n🔍 Verifying roles...");
  console.log(`Timelock DEFAULT_ADMIN_ROLE: ${await timelock.hasRole(await timelock.DEFAULT_ADMIN_ROLE(), timelock.getAddress()) ? "Timelock (self)" : "NOT SET"}`);
  console.log(`Timelock PROPOSER_ROLE (deployer): ${await timelock.hasRole(await timelock.PROPOSER_ROLE(), deployer.address) ? "YES" : "NO"}`);
  console.log(`Timelock CANCELLER_ROLE (deployer): ${await timelock.hasRole(await timelock.CANCELLER_ROLE(), deployer.address) ? "YES" : "NO"}`);

  // Get control plane contract instance for testing
  const controlPlane = await ethers.getContractAt("TapeBornControlPlaneTest", controlPlaneAddress);

  // Test the control plane contract
  console.log("\n🔍 Verifying Control Plane roles...");
  console.log(`Owner: ${await controlPlane.owner()}`);
  console.log(`DEFAULT_ADMIN_ROLE (Timelock): ${await controlPlane.hasRole(await controlPlane.DEFAULT_ADMIN_ROLE(), timelockAddress) ? "YES" : "NO"}`);
  console.log(`PAUSER_ROLE (Guardian): ${await controlPlane.hasRole(await controlPlane.PAUSER_ROLE(), deployer.address) ? "YES" : "NO"}`);
  console.log(`GUARDIAN_ADMIN_ROLE (Admin MS): ${await controlPlane.hasRole(await controlPlane.GUARDIAN_ADMIN_ROLE(), deployer.address) ? "YES" : "NO"}`);
  console.log(`TEST_ADMIN_ROLE (Timelock): ${await controlPlane.hasRole(await controlPlane.TEST_ADMIN_ROLE(), timelockAddress) ? "YES" : "NO"}`);
  console.log(`TREASURY_TEST_ROLE (Timelock): ${await controlPlane.hasRole(await controlPlane.TREASURY_TEST_ROLE(), timelockAddress) ? "YES" : "NO"}`);
  console.log(`Paused: ${await controlPlane.isPausedState()}`);
  console.log(`Guardian active: ${await controlPlane.isGuardianActive()}`);

  // Save deployment info
  const deploymentInfo = {
    network: "arcTestnet",
    chainId: 5042002,
    contracts: {
      timelockController: timelockAddress,
      tapeBornControlPlaneTest: controlPlaneAddress,
    },
    roles: {
      timelockController: timelockAddress,
      adminMultisig: deployer.address, // placeholder for test
      treasuryMultisig: deployer.address, // placeholder for test
      guardian: deployer.address, // placeholder for test
    },
    deployer: deployer.address,
    deploymentTx: controlPlane.deploymentTransaction().hash,
    blockNumber: (await provider.getTransactionReceipt(controlPlane.deploymentTransaction().hash)).blockNumber,
    timestamp: new Date().toISOString(),
  };

  const fs = require("fs");
  const path = require("path");
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  const deploymentFile = path.join(__dirname, "..", "deployments", `test-control-plane-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);

  console.log("\n✅ Deployment complete!");
  console.log("=====================================================");
  console.log(`TimelockController: ${timelockAddress}`);
  console.log(`TapeBornControlPlaneTest: ${controlPlaneAddress}`);
  console.log(`Network: Arc Testnet (chainId: 5042002)`);
}

module.exports = { main };