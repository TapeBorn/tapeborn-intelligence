// tests/contract-access-behavioral.test.cjs
// Behavioral access-control tests for SignalArtifact contract (BUILD_026)
// These tests deploy the contract to a local Hardhat network and verify actual revert behavior.

const { ethers } = require("hardhat");
const { expect } = require("chai");

async function deployContract() {
  const factory = await ethers.getContractFactory("SignalArtifact");
  const contract = await factory.deploy(
    "SignalArtifact",  // name
    "SIG",             // symbol
    "",                // baseURI
    0,                 // mintFee (0 for testing)
    0                  // maxSupply (0 = unlimited)
  );
  await contract.waitForDeployment();
  return contract;
}

describe("SignalArtifact: Behavioral Access Control", function () {
  let owner;
  let stranger;

  before(async function () {
    [owner, stranger] = await ethers.getSigners();
  });

  describe("Deployment", function () {
    let contract;
    before(async function () {
      contract = await deployContract();
    });

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
    let contract;
    before(async function () {
      contract = await deployContract();
    });
    const testURI = "data:application/json;base64,eyJ0ZX...pIn0=";

    it("should SUCCEED when called by owner", async function () {
      const tx = await contract.connect(owner).mint(owner.address, testURI);
      await tx.wait();

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
      const [, , thirdSigner] = await ethers.getSigners();
      await expect(
        contract.connect(thirdSigner).mint(thirdSigner.address, testURI)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });
  });

  describe("pause()/unpause() access control", function () {
    let contract;
    before(async function () {
      contract = await deployContract();
    });

    it("pause() should SUCCEED when called by owner", async function () {
      const tx = await contract.connect(owner).pause();
      await tx.wait();
      expect(await contract.paused()).to.be.true;
    });

    it("pause() should REVERT when called by stranger", async function () {
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
    let contract;
    before(async function () {
      contract = await deployContract();
    });
    const testURI = "data:application/json;base64,eyJ0ZX...pIn0=";

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
    let contract;
    before(async function () {
      contract = await deployContract();
    });

    it("should store and retrieve tokenURI correctly", async function () {
      const uri = "data:application/json;base64,dGVzdA==";
      const tx = await contract.connect(owner).mint(owner.address, uri);
      await tx.wait();

      const tokenId = await contract.nextTokenId();
      const storedUri = await contract.tokenURI(Number(tokenId) - 1);
      expect(storedUri).to.equal(uri);
    });
  });

  describe("R5: Admin model - configurable parameters", function () {
    let contract;
    before(async function () {
      contract = await deployContract();
    });

    it("should allow owner to set mint fee", async function () {
      const newFee = ethers.parseEther("0.01");
      await contract.connect(owner).setMintFee(newFee);
      expect(await contract.mintFee()).to.equal(newFee);
    });

    it("should REVERT when non-owner tries to set mint fee", async function () {
      const newFee = ethers.parseEther("0.01");
      await expect(
        contract.connect(stranger).setMintFee(newFee)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("should allow owner to set max supply", async function () {
      await contract.connect(owner).setMaxSupply(1000);
      expect(await contract.maxSupply()).to.equal(1000);
    });

    it("should REVERT when non-owner tries to set max supply", async function () {
      await expect(
        contract.connect(stranger).setMaxSupply(1000)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("should REVERT when setting max supply below current supply", async function () {
      // Fresh contract for this test
      const freshContract = await deployContract();
      // Mint a few tokens first
      for (let i = 0; i < 5; i++) {
        await freshContract.connect(owner).mint(owner.address, "uri");
      }
      await expect(
        freshContract.connect(owner).setMaxSupply(3)
      ).to.be.revertedWith("Max supply below current supply");
    });

    it("should allow owner to set base URI", async function () {
      const newURI = "https://api.example.com/metadata/";
      await contract.connect(owner).setBaseURI(newURI);
      expect(await contract.baseURI()).to.equal(newURI);
    });

    it("should REVERT when non-owner tries to set base URI", async function () {
      await expect(
        contract.connect(stranger).setBaseURI("https://example.com/")
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("should prepend baseURI to relative URIs in tokenURI", async function () {
      const freshContract = await deployContract();
      await freshContract.connect(owner).setBaseURI("https://api.example.com/metadata/");
      const uri = "token/1.json";
      await freshContract.connect(owner).mint(owner.address, uri);
      const tokenId = (await freshContract.nextTokenId()) - 1n;
      const fullURI = await freshContract.tokenURI(tokenId);
      expect(fullURI).to.equal("https://api.example.com/metadata/token/1.json");
    });

    it("should NOT prepend baseURI to absolute URIs (http/https/data:)", async function () {
      const freshContract = await deployContract();
      const absoluteURI = "https://external.com/metadata.json";
      await freshContract.connect(owner).mint(owner.address, absoluteURI);
      const tokenId = (await freshContract.nextTokenId()) - 1n;
      const fullURI = await freshContract.tokenURI(tokenId);
      expect(fullURI).to.equal(absoluteURI);
    });
  });

  describe("R5: Admin model - mint fee enforcement", function () {
    let contract;
    before(async function () {
      contract = await deployContract();
      // Set a mint fee for these tests
      await contract.connect(owner).setMintFee(ethers.parseEther("0.01"));
    });
    const testURI = "data:application/json;base64,eyJ0ZX...pIn0=";

    it("should REVERT when mint fee not paid", async function () {
      await expect(
        contract.connect(owner).mint(owner.address, testURI, { value: 0 })
      ).to.be.revertedWith("Insufficient mint fee");
    });

    it("should SUCCEED when mint fee paid", async function () {
      const tx = await contract.connect(owner).mint(owner.address, testURI, { 
        value: ethers.parseEther("0.01") 
      });
      await tx.wait();
      expect(await contract.nextTokenId()).to.be.greaterThan(0);
    });

    it("should allow owner to withdraw fees", async function () {
      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await contract.connect(owner).withdrawFees();
      await tx.wait();
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      expect(balanceAfter).to.be.gt(balanceBefore - ethers.parseEther("0.1"));
    });
  });

  describe("R5: Admin model - max supply enforcement", function () {
    let contract;
    before(async function () {
      contract = await deployContract();
      // Set max supply for these tests
      await contract.connect(owner).setMaxSupply(3);
    });
    const testURI = "data:application/json;base64,eyJ0ZX...pIn0=";

    it("should REVERT when max supply reached", async function () {
      // Mint up to max supply
      for (let i = 0; i < 3; i++) {
        await contract.connect(owner).mint(owner.address, testURI);
      }
      expect(await contract.totalSupply()).to.equal(3);

      // Next mint should fail
      await expect(
        contract.connect(owner).mint(owner.address, testURI)
      ).to.be.revertedWith("Max supply reached");
    });
  });
});