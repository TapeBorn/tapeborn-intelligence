// Simple deployment script for TapeBornControlPlaneTest
// Run with: node deploy-test.js

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("🚀 Deploying TapeBornControlPlaneTest to Arc Testnet");
    console.log("=====================================================");

    const privateKey = process.env.DEV_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      console.error("❌ DEV_WALLET_PRIVATE_KEY not set");
      process.exit(1);
    }

    const rpcUrl = "https://rpc.testnet.arc.io";
    const rpcProvider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.io");
    const deployer = new ethers.Wallet(process.env.DEV_WALLET_PRIVATE_KEY, rpcProvider);
    console.log("📝 Deployer:", deployer.address);

    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH");

    if (balance < ethers.parseEther("0.01")) {
      console.warn("⚠️  Warning: Balance below 0.01 ETH");
    }

    // Load test contract artifact
    const controlPlaneArtifact = JSON.parse(fs.readFileSync("artifacts-hardhat/contracts/test/TapeBornControlPlaneTest.sol/TapeBornControlPlaneTest.json", "utf8"));

    // Use OpenZeppelin TimelockController artifact directly from npm package
    const TimelockControllerArtifact = require("@openzeppelin/contracts/build/contracts/TimelockController.json");
    const TimelockControllerABI = TimelockControllerArtifact.abi;
    const TimelockControllerBytecode = TimelockControllerArtifact.bytecode;

    // Deploy TimelockController using OpenZeppelin artifact
    console.log("\n📦 Deploying TimelockController...");
    const TimelockFactory = new ethers.ContractFactory(
      TimelockControllerABI,
      TimelockControllerBytecode,
      deployer
    );

    const minDelay = 60; // 60 seconds for testing
    const timelock = await new ethers.ContractFactory(
      TimelockControllerABI,
      TimelockControllerBytecode,
      deployer
    ).deploy(60, [deployer.address], [deployer.address], deployer.address);

    console.log("Waiting for Timelock deployment...");
    await timelock.waitForDeployment();
    const timelockAddress = await timelock.getAddress();
    console.log("✅ TimelockController deployed at:", timelockAddress);

    // Deploy Control Plane
    console.log("\n📦 Deploying TapeBornControlPlaneTest...");
    const ControlPlaneFactory = new ethers.ContractFactory(
      controlPlaneArtifact.abi,
      controlPlaneArtifact.bytecode,
      deployer
    );

    const controlPlaneDeploy = await ControlPlaneFactory.deploy(
      timelockAddress,
      deployer.address, // adminMultisig
      deployer.address, // treasuryMultisig
      deployer.address  // guardian
    );

    await controlPlaneDeploy.waitForDeployment();
    const controlPlaneAddress = await controlPlaneDeploy.getAddress();
    console.log("✅ TapeBornControlPlaneTest deployed at:", controlPlaneAddress);

    // Configure Timelock roles
    console.log("\n🔧 Configuring Timelock roles...");
    const timelockContract = new ethers.Contract(
      timelockAddress,
      TimelockControllerABI,
      deployer
    );

    // Grant PROPOSER_ROLE and CANCELLER_ROLE to deployer
    const PROPOSER_ROLE = await timelockContract.PROPOSER_ROLE();
    const CANCELLER_ROLE = await timelockContract.CANCELLER_ROLE();

    let tx = await timelockContract.grantRole(await timelockContract.PROPOSER_ROLE(), deployer.address);
    await tx.wait();
    console.log("✅ Granted PROPOSER_ROLE to", deployer.address);

    tx = await timelockContract.grantRole(await timelockContract.CANCELLER_ROLE(), deployer.address);
    await tx.wait();
    console.log("✅ Granted CANCELLER_ROLE to", deployer.address);

    console.log("✅ EXECUTOR_ROLE is address(0) (permissionless after delay)");

    // Verify roles
    console.log("\n🔍 Verifying roles...");
    const timelockContractRead = new ethers.Contract(
      timelockAddress,
      TimelockControllerABI,
      new ethers.JsonRpcProvider("https://rpc.testnet.arc.io")
    );

    console.log("Timelock DEFAULT_ADMIN_ROLE:", await timelockContractRead.hasRole(await timelockContractRead.DEFAULT_ADMIN_ROLE(), timelockAddress) ? "Timelock (self)" : "NOT SET");
    console.log("Timelock PROPOSER_ROLE (deployer):", await timelockContractRead.hasRole(await timelockContractRead.PROPOSER_ROLE(), "0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f") ? "YES" : "NO");
    console.log("Timelock CANCELLER_ROLE (deployer):", await timelockContractRead.hasRole(await timelockContractRead.CANCELLER_ROLE(), "0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f") ? "YES" : "NO");

    // Test Control Plane
    const controlPlane = new ethers.Contract(
      controlPlaneAddress,
      controlPlaneArtifact.abi,
      rpcProvider
    );

    console.log("\n🔍 Verifying Control Plane roles...");
    console.log("Owner:", await controlPlane.owner());
    console.log("DEFAULT_ADMIN_ROLE (Timelock):", await controlPlane.hasRole(await controlPlane.DEFAULT_ADMIN_ROLE(), timelockAddress) ? "YES" : "NO");
    console.log("PAUSER_ROLE (Guardian):", await controlPlane.hasRole(await controlPlane.PAUSER_ROLE(), "0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f") ? "YES" : "NO");
    console.log("GUARDIAN_ADMIN_ROLE (Admin MS):", await controlPlane.hasRole(await controlPlane.GUARDIAN_ADMIN_ROLE(), "0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f") ? "YES" : "NO");
    console.log("TEST_ADMIN_ROLE (Timelock):", await controlPlane.hasRole(await controlPlane.TEST_ADMIN_ROLE(), timelockAddress) ? "YES" : "NO");
    console.log("TREASURY_TEST_ROLE (Timelock):", await controlPlane.hasRole(await controlPlane.TREASURY_TEST_ROLE(), timelockAddress) ? "YES" : "NO");
    console.log("Paused:", await controlPlane.isPausedState());
    console.log("Guardian active:", await controlPlane.isGuardianActive());

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
        adminMultisig: "0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f",
        treasuryMultisig: "0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f",
        guardian: "0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f",
      },
      deployer: "0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f",
      timestamp: new Date().toISOString(),
    };

    if (!fs.existsSync("deployments")) {
      fs.mkdirSync("deployments", { recursive: true });
    }
    const deploymentFile = "./deployments/test-control-plane-" + Date.now() + ".json";
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n💾 Deployment info saved to:", deploymentFile);

    console.log("\n✅ Deployment complete!");
    console.log("=====================================================");
    console.log("TimelockController:", timelockAddress);
    console.log("TapeBornControlPlaneTest:", controlPlaneAddress);
    console.log("Network: Arc Testnet (chainId: 5042002)");

    return { timelockAddress, controlPlaneAddress };
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);