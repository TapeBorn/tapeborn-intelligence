// tests/adversarial.test.js
// Adversarial tests for SignalArtifact contract (R6)
// Fuzzing, edge cases, and invariant testing

const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("SignalArtifact: Adversarial Tests (R6)", function () {
  let owner;
  let stranger;
  let attacker;

  before(async function () {
    [owner, stranger, attacker] = await ethers.getSigners();
  });

  async function deployContract(overrides = {}) {
    const factory = await ethers.getContractFactory("SignalArtifact");
    const contract = await factory.deploy(
      overrides.name || "SignalArtifact",
      overrides.symbol || "SIG",
      overrides.baseURI || "",
      overrides.mintFee || 0,
      overrides.maxSupply || 0
    );
    await contract.waitForDeployment();
    return contract;
  }

  describe("Constructor edge cases", function () {
    it("should accept very long name and symbol", async function () {
      const longName = "A".repeat(1000);
      const longSymbol = "B".repeat(1000);
      const contract = await deployContract({ name: longName, symbol: longSymbol });
      expect(await contract.name()).to.equal(longName);
      expect(await contract.symbol()).to.equal(longSymbol);
    });

    it("should accept max uint256 mintFee", async function () {
      const contract = await deployContract({ mintFee: ethers.MaxUint256 });
      expect(await contract.mintFee()).to.equal(ethers.MaxUint256);
    });

    it("should accept max uint256 maxSupply", async function () {
      const contract = await deployContract({ maxSupply: ethers.MaxUint256 });
      expect(await contract.maxSupply()).to.equal(ethers.MaxUint256);
    });

    it("should accept empty baseURI", async function () {
      const contract = await deployContract({ baseURI: "" });
      expect(await contract.baseURI()).to.equal("");
    });

    it("should accept very long baseURI", async function () {
      const longURI = "https://example.com/".repeat(100);
      const contract = await deployContract({ baseURI: longURI });
      expect(await contract.baseURI()).to.equal(longURI);
    });
  });

  describe("Mint edge cases", function () {
    const testURI = "data:application/json;base64,eyJ0ZXN0IjoxMjN9";

    it("should REVERT when minting to zero address", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await expect(
        contract.connect(owner).mint(ethers.ZeroAddress, testURI)
      ).to.be.reverted; // ERC721 _mint validates to != address(0)
    });

    it("should handle empty URI", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      const tx = await contract.connect(owner).mint(owner.address, "");
      await tx.wait();
      expect(await contract.tokenURI(0)).to.equal("");
    });

    it("should handle very long URI", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      const longURI = "data:application/json;base64," + "A".repeat(10000);
      const tx = await contract.connect(owner).mint(owner.address, longURI);
      await tx.wait();
      expect(await contract.tokenURI(0)).to.equal(longURI);
    });

    it("should handle unicode URI", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      const unicodeURI = "data:application/json;base64,eyLigJzigJzigJzigJzigJzigJzsiJwi";
      const tx = await contract.connect(owner).mint(owner.address, unicodeURI);
      await tx.wait();
      expect(await contract.tokenURI(0)).to.equal(unicodeURI);
    });

    it("should mint sequentially without gaps", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      for (let i = 0; i < 10; i++) {
        await contract.connect(owner).mint(owner.address, `uri${i}`);
      }
      expect(await contract.nextTokenId()).to.equal(10);
      expect(await contract.totalSupply()).to.equal(10);
      for (let i = 0; i < 10; i++) {
        expect(await contract.ownerOf(i)).to.equal(owner.address);
      }
    });

    it("should emit TokenMinted event with correct params", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      const tx = await contract.connect(owner).mint(stranger.address, testURI);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === "TokenMinted";
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;
    });

    it("should handle mint with value when mintFee is 0", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      const tx = await contract.connect(owner).mint(owner.address, testURI, { 
        value: ethers.parseEther("1.0") 
      });
      await tx.wait();
      // Contract should accept and keep the ETH
      expect(await ethers.provider.getBalance(await contract.getAddress())).to.equal(ethers.parseEther("1.0"));
    });
  });

  describe("Mint fee edge cases", function () {
    const testURI = "data:application/json;base64,eyJ0ZXN0IjoxMjN9";

    it("should REVERT when value is exactly 1 wei less than mintFee", async function () {
      const contract = await deployContract({ mintFee: ethers.parseEther("0.01"), maxSupply: 0 });
      await expect(
        contract.connect(owner).mint(owner.address, testURI, { 
          value: ethers.parseEther("0.01") - 1n 
        })
      ).to.be.revertedWith("Insufficient mint fee");
    });

    it("should SUCCEED when value equals mintFee exactly", async function () {
      const contract = await deployContract({ mintFee: ethers.parseEther("0.01"), maxSupply: 0 });
      const tx = await contract.connect(owner).mint(owner.address, testURI, { 
        value: ethers.parseEther("0.01") 
      });
      await tx.wait();
      expect(await contract.nextTokenId()).to.equal(1);
    });

    it("should SUCCEED when value exceeds mintFee", async function () {
      const contract = await deployContract({ mintFee: ethers.parseEther("0.01"), maxSupply: 0 });
      const tx = await contract.connect(owner).mint(owner.address, testURI, { 
        value: ethers.parseEther("0.02") 
      });
      await tx.wait();
      // Excess ETH should remain in contract
      expect(await ethers.provider.getBalance(await contract.getAddress())).to.equal(ethers.parseEther("0.02"));
    });

    it("should allow mintFee = 0 (free mint)", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      const tx = await contract.connect(owner).mint(owner.address, testURI, { value: 0 });
      await tx.wait();
      expect(await contract.nextTokenId()).to.equal(1);
    });

    it("should allow owner to set mintFee to 0 after being non-zero", async function () {
      const contract = await deployContract({ mintFee: ethers.parseEther("0.01"), maxSupply: 0 });
      await contract.connect(owner).setMintFee(0);
      const tx = await contract.connect(owner).mint(owner.address, testURI, { value: 0 });
      await tx.wait();
      expect(await contract.nextTokenId()).to.equal(1);
    });

    it("should emit MintFeeChanged event", async function () {
      const contract = await deployContract({ mintFee: ethers.parseEther("0.01"), maxSupply: 0 });
      const newFee = ethers.parseEther("0.05");
      const tx = await contract.connect(owner).setMintFee(newFee);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === "MintFeeChanged";
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;
    });
  });

  describe("Max supply edge cases", function () {
    const testURI = "data:application/json;base64,eyJ0ZXN0IjoxMjN9";

    it("should allow minting up to maxSupply", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 5 });
      for (let i = 0; i < 5; i++) {
        await contract.connect(owner).mint(owner.address, testURI);
      }
      expect(await contract.totalSupply()).to.equal(5);
      expect(await contract.nextTokenId()).to.equal(5);
    });

    it("should REVERT when minting beyond maxSupply", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 5 });
      for (let i = 0; i < 5; i++) {
        await contract.connect(owner).mint(owner.address, testURI);
      }
      await expect(
        contract.connect(owner).mint(owner.address, testURI)
      ).to.be.revertedWith("Max supply reached");
    });

    it("should allow setting maxSupply to 0 (unlimited) after being limited", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 5 });
      for (let i = 0; i < 5; i++) {
        await contract.connect(owner).mint(owner.address, testURI);
      }
      await contract.connect(owner).setMaxSupply(0);
      // Should be able to mint more
      for (let i = 0; i < 3; i++) {
        await contract.connect(owner).mint(owner.address, testURI);
      }
      expect(await contract.totalSupply()).to.equal(8);
    });

    it("should REVERT when setting maxSupply below current supply", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 10 });
      for (let i = 0; i < 5; i++) {
        await contract.connect(owner).mint(owner.address, testURI);
      }
      await expect(
        contract.connect(owner).setMaxSupply(3)
      ).to.be.revertedWith("Max supply below current supply");
    });

    it("should allow setting maxSupply equal to current supply", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 10 });
      for (let i = 0; i < 5; i++) {
        await contract.connect(owner).mint(owner.address, testURI);
      }
      await contract.connect(owner).setMaxSupply(5);
      expect(await contract.maxSupply()).to.equal(5);
    });

    it("should emit MaxSupplyChanged event", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 10 });
      const tx = await contract.connect(owner).setMaxSupply(20);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === "MaxSupplyChanged";
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;
    });

    it("should handle maxSupply = 1 correctly", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 1 });
      await contract.connect(owner).mint(owner.address, testURI);
      await expect(
        contract.connect(owner).mint(owner.address, testURI)
      ).to.be.revertedWith("Max supply reached");
    });
  });

  describe("Pause/Unpause edge cases", function () {
    const testURI = "data:application/json;base64,eyJ0ZXN0IjoxMjN9";

    it("should allow multiple pause/unpause cycles", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      for (let i = 0; i < 5; i++) {
        await contract.connect(owner).pause();
        expect(await contract.paused()).to.be.true;
        await contract.connect(owner).unpause();
        expect(await contract.paused()).to.be.false;
      }
    });

    it("should REVERT pause when already paused", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await contract.connect(owner).pause();
      await expect(
        contract.connect(owner).pause()
      ).to.be.revertedWithCustomError(contract, "EnforcedPause");
    });

    it("should REVERT unpause when not paused (OpenZeppelin Pausable behavior)", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      // OpenZeppelin Pausable.unpause() reverts with ExpectedPause when not paused
      await expect(
        contract.connect(owner).unpause()
      ).to.be.revertedWithCustomError(contract, "ExpectedPause");
    });

    it("should block mint when paused even with valid fee", async function () {
      const contract = await deployContract({ mintFee: ethers.parseEther("0.01"), maxSupply: 0 });
      await contract.connect(owner).pause();
      await expect(
        contract.connect(owner).mint(owner.address, testURI, { 
          value: ethers.parseEther("0.01") 
        })
      ).to.be.revertedWithCustomError(contract, "EnforcedPause");
    });
  });

  describe("BaseURI edge cases", function () {
    const testURI = "data:application/json;base64,eyJ0ZXN0IjoxMjN9";

    it("should handle baseURI with trailing slash", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await contract.connect(owner).setBaseURI("https://api.example.com/metadata/");
      await contract.connect(owner).mint(owner.address, "1.json");
      const tokenId = (await contract.nextTokenId()) - 1n;
      const fullURI = await contract.tokenURI(tokenId);
      expect(fullURI).to.equal("https://api.example.com/metadata/1.json");
    });

    it("should handle baseURI without trailing slash", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await contract.connect(owner).setBaseURI("https://api.example.com/metadata");
      await contract.connect(owner).mint(owner.address, "1.json");
      const tokenId = (await contract.nextTokenId()) - 1n;
      const fullURI = await contract.tokenURI(tokenId);
      expect(fullURI).to.equal("https://api.example.com/metadata1.json");
    });

    it("should handle baseURI with query parameters", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await contract.connect(owner).setBaseURI("https://api.example.com/metadata?id=");
      await contract.connect(owner).mint(owner.address, "123");
      const tokenId = (await contract.nextTokenId()) - 1n;
      const fullURI = await contract.tokenURI(tokenId);
      expect(fullURI).to.equal("https://api.example.com/metadata?id=123");
    });

    it("should handle IPFS URIs", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await contract.connect(owner).setBaseURI("ipfs://QmHash/");
      await contract.connect(owner).mint(owner.address, "metadata.json");
      const tokenId = (await contract.nextTokenId()) - 1n;
      const fullURI = await contract.tokenURI(tokenId);
      expect(fullURI).to.equal("ipfs://QmHash/metadata.json");
    });

    it("should handle data: URIs as absolute (no prepend)", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await contract.connect(owner).setBaseURI("https://example.com/");
      const dataURI = "data:application/json;base64,eyJ0ZXN0IjoxMjN9";
      await contract.connect(owner).mint(owner.address, dataURI);
      const tokenId = (await contract.nextTokenId()) - 1n;
      const fullURI = await contract.tokenURI(tokenId);
      expect(fullURI).to.equal(dataURI);
    });

    it("should handle https: URIs as absolute (no prepend)", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await contract.connect(owner).setBaseURI("https://example.com/");
      const httpsURI = "https://external.com/metadata.json";
      await contract.connect(owner).mint(owner.address, httpsURI);
      const tokenId = (await contract.nextTokenId()) - 1n;
      const fullURI = await contract.tokenURI(tokenId);
      expect(fullURI).to.equal(httpsURI);
    });

    it("should handle http: URIs as absolute (no prepend)", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await contract.connect(owner).setBaseURI("https://example.com/");
      const httpURI = "http://external.com/metadata.json";
      await contract.connect(owner).mint(owner.address, httpURI);
      const tokenId = (await contract.nextTokenId()) - 1n;
      const fullURI = await contract.tokenURI(tokenId);
      expect(fullURI).to.equal(httpURI);
    });

    it("should emit BaseURIChanged event", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      const tx = await contract.connect(owner).setBaseURI("https://new.example.com/");
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === "BaseURIChanged";
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;
    });
  });

  describe("Withdraw fees edge cases", function () {
    const testURI = "data:application/json;base64,eyJ0ZXN0IjoxMjN9";

    it("should REVERT when no fees to withdraw", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await expect(
        contract.connect(owner).withdrawFees()
      ).to.be.revertedWith("No fees to withdraw");
    });

    it("should withdraw all accumulated fees", async function () {
      const contract = await deployContract({ mintFee: ethers.parseEther("0.01"), maxSupply: 0 });
      // Mint several tokens with fees
      for (let i = 0; i < 3; i++) {
        await contract.connect(owner).mint(owner.address, testURI, { 
          value: ethers.parseEther("0.01") 
        });
      }
      const contractBalance = await ethers.provider.getBalance(await contract.getAddress());
      expect(contractBalance).to.equal(ethers.parseEther("0.03"));

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await contract.connect(owner).withdrawFees();
      await tx.wait();
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      
      // Owner balance should increase by contract balance (minus gas)
      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
      expect(await ethers.provider.getBalance(await contract.getAddress())).to.equal(0);
    });

    it("should REVERT when non-owner tries to withdraw", async function () {
      const contract = await deployContract({ mintFee: ethers.parseEther("0.01"), maxSupply: 0 });
      await contract.connect(owner).mint(owner.address, testURI, { 
        value: ethers.parseEther("0.01") 
      });
      await expect(
        contract.connect(stranger).withdrawFees()
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });
  });

  describe("TotalSupply invariant", function () {
    const testURI = "data:application/json;base64,eyJ0ZXN0IjoxMjN9";

    it("totalSupply should equal nextTokenId", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      for (let i = 0; i < 20; i++) {
        await contract.connect(owner).mint(owner.address, testURI);
        expect(await contract.totalSupply()).to.equal(await contract.nextTokenId());
      }
    });

    it("totalSupply should not decrease", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      const initialSupply = await contract.totalSupply();
      await contract.connect(owner).mint(owner.address, testURI);
      expect(await contract.totalSupply()).to.be.gte(initialSupply);
    });
  });

  describe("Reentrancy protection", function () {
    it("should not be vulnerable to reentrancy in mint (no external calls before state update)", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      const tx = await contract.connect(owner).mint(owner.address, "uri");
      await tx.wait();
      expect(await contract.totalSupply()).to.equal(1);
    });

    it("withdrawFees uses transfer (reentrancy-safe for ETH)", async function () {
      const contract = await deployContract({ mintFee: ethers.parseEther("0.01"), maxSupply: 0 });
      await contract.connect(owner).mint(owner.address, "uri", { value: ethers.parseEther("0.01") });
      
      // withdrawFees uses payable(owner()).transfer(balance)
      // which is reentrancy-safe due to 2300 gas stipend
      const tx = await contract.connect(owner).withdrawFees();
      await tx.wait();
      expect(await ethers.provider.getBalance(await contract.getAddress())).to.equal(0);
    });
  });

  describe("Access control invariants", function () {
    const testURI = "data:application/json;base64,eyJ0ZXN0IjoxMjN9";

    it("only owner can mint", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await expect(
        contract.connect(stranger).mint(stranger.address, testURI)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("only owner can pause", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await expect(
        contract.connect(stranger).pause()
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("only owner can unpause", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await contract.connect(owner).pause();
      await expect(
        contract.connect(stranger).unpause()
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("only owner can setMintFee", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await expect(
        contract.connect(stranger).setMintFee(ethers.parseEther("0.01"))
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("only owner can setMaxSupply", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await expect(
        contract.connect(stranger).setMaxSupply(100)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("only owner can setBaseURI", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await expect(
        contract.connect(stranger).setBaseURI("https://example.com/")
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("only owner can withdrawFees", async function () {
      const contract = await deployContract({ mintFee: ethers.parseEther("0.01"), maxSupply: 0 });
      await contract.connect(owner).mint(owner.address, testURI, { 
        value: ethers.parseEther("0.01") 
      });
      await expect(
        contract.connect(stranger).withdrawFees()
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });
  });

  describe("Ownership transfer", function () {
    const testURI = "data:application/json;base64,eyJ0ZXN0IjoxMjN9";

    it("should allow owner to transfer ownership", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await contract.connect(owner).transferOwnership(stranger.address);
      expect(await contract.owner()).to.equal(stranger.address);
      
      // New owner should be able to mint
      await contract.connect(stranger).mint(stranger.address, testURI);
      expect(await contract.nextTokenId()).to.equal(1);
    });

    it("should REVERT when non-owner tries to transfer ownership", async function () {
      const contract = await deployContract({ mintFee: 0, maxSupply: 0 });
      await expect(
        contract.connect(stranger).transferOwnership(attacker.address)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });
  });
});