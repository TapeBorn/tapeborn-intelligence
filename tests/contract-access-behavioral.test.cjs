// tests/contract-access-behavioral.test.cjs
// Behavioral access-control tests for SignalArtifact contract (BUILD_026)
// These tests deploy the contract to a local Hardhat network and verify actual revert behavior.

const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("SignalArtifact: Behavioral Access Control", function () {
  let contract;
  let owner;
  let stranger;

  before(async function () {
    // Get signers
    [owner, stranger] = await ethers.getSigners();

    // Compile and deploy contract
    const factory = await ethers.getContractFactory("SignalArtifact");
    contract = await factory.deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set owner to deployer", async function () {
      const contractOwner = await contract.owner();
      expect(contractOwner).to.equal(owner.address);
    });

    it("should have correct name and symbol", async function () {
      expect(await contract.name()).to.equal("SignalArtifact");
      expect(await contract.symbol()).to.equal("SIG");
    });

    it("should start unpaused", async function () {
      expect(await contract.paused()).to.be.false;
    });

    it("should start with nextTokenId = 0", async function () {
      expect(await contract.nextTokenId()).to.equal(0);
    });
  });

  describe("mint() access control", function () {
    const testURI = "data:application/json;base64,eyJ0ZXN0IjoidXJpIn0=";

    it("should SUCCEED when called by owner", async function () {
      const tx = await contract.connect(owner).mint(owner.address, testURI);
      await tx.wait();

      // Verify token was minted
      expect(await contract.nextTokenId()).to.equal(1);
      expect(await contract.ownerOf(0)).to.equal(owner.address);
      expect(await contract.tokenURI(0)).to.equal(testURI);
    });

    it("should REVERT when called by non-owner (stranger)", async function () {
      await expect(
        contract.connect(stranger).mint(stranger.address, testURI)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
        .withArgs(stranger.address);
    });

    it("should REVERT when called by non-owner (any address except owner)", async function () {
      // Use a funded signer instead of random address with no funds
      const [, , thirdSigner] = await ethers.getSigners();
      // Third signer should have funds but not be the owner
      await expect(
        contract.connect(thirdSigner).mint(thirdSigner.address, testURI)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });
  });

  describe("pause()/unpause() access control", function () {
    it("pause() should SUCCEED when called by owner", async function () {
      const tx = await contract.connect(owner).pause();
      await tx.wait();
      expect(await contract.paused()).to.be.true;
    });

    it("pause() should REVERT when called by stranger", async function () {
      // First unpause to reset state
      await contract.connect(owner).unpause();
      
      await expect(
        contract.connect(stranger).pause()
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
        .withArgs(stranger.address);
    });

    it("unpause() should SUCCEED when called by owner", async function () {
      await contract.connect(owner).pause();
      expect(await contract.paused()).to.be.true;

      const tx = await contract.connect(owner).unpause();
      await tx.wait();
      expect(await contract.paused()).to.be.false;
    });

    it("unpause() should REVERT when called by stranger", async function () {
      await expect(
        contract.connect(stranger).unpause()
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
        .withArgs(stranger.address);
    });
  });

  describe("mint() when paused", function () {
    const testURI = "data:application/json;base64,eyJ0ZXN0IjoidXJpIn0=";

    it("should REVERT with EnforcedPause when contract is paused (even for owner)", async function () {
      await contract.connect(owner).pause();
      expect(await contract.paused()).to.be.true;

      await expect(
        contract.connect(owner).mint(owner.address, testURI)
      ).to.be.revertedWithCustomError(contract, "EnforcedPause");
    });

    it("should SUCCEED again after unpause", async function () {
      await contract.connect(owner).unpause();
      expect(await contract.paused()).to.be.false;

      const tx = await contract.connect(owner).mint(owner.address, testURI);
      await tx.wait();

      expect(await contract.nextTokenId()).to.be.greaterThan(0);
      expect(await contract.ownerOf(0)).to.equal(owner.address);
    });
  });

  describe("tokenURI storage mechanism", function () {
    it("should store and retrieve tokenURI correctly", async function () {
      const uri = "data:application/json;base64,dGVzdA==";
      const tx = await contract.connect(owner).mint(owner.address, uri);
      await tx.wait();

      const tokenId = await contract.nextTokenId();
      const storedUri = await contract.tokenURI(Number(tokenId) - 1);
      expect(storedUri).to.equal(uri);
    });
  });
});