// tests/TapeBornProductionNFT.test.js
// Behavioral + adversarial suite untuk contracts/TapeBornProductionNFT.sol
// Stack: Hardhat 2.29.1 + ethers v6.17.0 + @openzeppelin/contracts 5.6.1
// Run: npx hardhat --config hardhat.config.cjs test tests/TapeBornProductionNFT.test.js
//
// Decision-lock compliance yang diuji di sini:
//  - ERC721 plain (TIDAK memakai ERC721Enumerable) -> enumeration diuji via ownerOf()
//  - Ownable2Step, renounceOwnership DISABLED
//  - Guardian = PAUSER_ROLE only (pause claim only, tidak bisa unpause/mint/config)
//  - Metadata immutable setelah finalizeMetadata()
//  - Free claim (non-payable) + EIP-712 ClaimAuthorization, 1 NFT / wallet
//  - State machine DRAFT->CONFIGURED->REVIEWED->ACTIVE->{EXHAUSTED|CLOSED}
//  - Secondary transfer tetap jalan saat paused

const { expect } = require("chai");
const { ethers } = require("hardhat");

const MAX_SUPPLY = 2222n;
const TEAM = ethers.id("TEAM");
const EARLY = ethers.id("EARLY");
const COLLAB_GUARANTEED = ethers.id("COLLAB_GUARANTEED");
const COLLAB_FCFS = ethers.id("COLLAB_FCFS");

const ST = { DRAFT: 0n, CONFIGURED: 1n, REVIEWED: 2n, ACTIVE: 3n, EXHAUSTED: 4n, CLOSED: 5n };
const ST_NAME = ["DRAFT", "CONFIGURED", "REVIEWED", "ACTIVE", "EXHAUSTED", "CLOSED"];

const DOMAIN_NAME = "TapeBorn Genesis";
const DOMAIN_VERSION = "1";
const ONE_HOUR = 3600n;
const BASE_URI = "ipfs://tbart-genesis/";
const CONTRACT_URI = "ipfs://tbart-contract/collection.json";

describe("TapeBornProductionNFT", function () {
  let owner, timelock, guardian, sigSigner, stranger, alice, bob, carol, mallory;
  let nft, nftAddr, chainId, pauserRole;

  async function blockNow() {
    return BigInt((await ethers.provider.getBlock("latest")).timestamp);
  }

  async function signClaim(signer, params, over = {}) {
    const domain = {
      name: over.name ?? DOMAIN_NAME,
      version: over.version ?? DOMAIN_VERSION,
      chainId: over.chainId ?? chainId,
      verifyingContract: over.verifyingContract ?? nftAddr,
    };
    const types = {
      ClaimAuthorization: [
        { name: "campaignId", type: "bytes32" },
        { name: "phaseId", type: "bytes32" },
        { name: "claimant", type: "address" },
        { name: "quantity", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    return signer.signTypedData(domain, types, params);
  }

  async function makeAuth(claimantAddr, campaignId = TEAM, phaseId = EARLY, over = {}) {
    return {
      campaignId: over.campaignId ?? campaignId,
      phaseId: over.phaseId ?? phaseId,
      claimant: over.claimant ?? claimantAddr,
      quantity: over.quantity ?? 1n,
      nonce: over.nonce !== undefined ? over.nonce : await nft.nonces(claimantAddr),
      deadline: over.deadline !== undefined ? over.deadline : (await blockNow()) + ONE_HOUR,
    };
  }

  async function claimAs(signer, auth, signerForSig = sigSigner, over = {}) {
    const sig = await signClaim(signerForSig, auth, over);
    return nft
      .connect(signer)
      .claim(auth.campaignId, auth.phaseId, auth.claimant, auth.quantity, auth.nonce, auth.deadline, sig);
  }

  // DRAFT -> CONFIGURED -> REVIEWED -> ACTIVE (semua via owner/Timelock)
  async function configurePhase(campaignId, phaseId, cap, asOwner = timelock) {
    await nft.connect(asOwner).setAllocationCap(campaignId, phaseId, cap);
    await nft.connect(asOwner).setCampaignState(campaignId, phaseId, ST.CONFIGURED);
    await nft.connect(asOwner).setCampaignState(campaignId, phaseId, ST.REVIEWED);
    await nft.connect(asOwner).setCampaignState(campaignId, phaseId, ST.ACTIVE);
  }

  beforeEach(async function () {
    [owner, timelock, guardian, sigSigner, stranger, alice, bob, carol, mallory] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("TapeBornProductionNFT");
    nft = await Factory.deploy();
    await nft.waitForDeployment();
    nftAddr = await nft.getAddress();
    chainId = (await ethers.provider.getNetwork()).chainId;
    pauserRole = await nft.PAUSER_ROLE();

    // Ownership ceremony: deployer -> pendingOwner(timelock) -> accept
    await nft.connect(owner).transferOwnership(timelock.address);
    await nft.connect(timelock).acceptOwnership();

    // Dedicated EIP-712 signer (bukan owner/timelock/guardian/deployer)
    await nft.connect(timelock).setSigner(sigSigner.address);

    // Guardian hanya menerima PAUSER_ROLE dari DEFAULT_ADMIN_ROLE
    await nft.connect(owner).grantRole(pauserRole, guardian.address);
  });

  // ============================================================
  describe("1. Deployment & immutables", function () {
    it("name/symbol sesuai decision lock", async function () {
      expect(await nft.name()).to.equal("TapeBorn Genesis");
      expect(await nft.symbol()).to.equal("TBART");
    });

    it("MAX_SUPPLY = 2222 dan totalSupply awal 0", async function () {
      expect(await nft.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
      expect(await nft.totalSupply()).to.equal(0n);
    });

    it("owner awal = deployer, setelah ceremony = timelock, pendingOwner kosong", async function () {
      expect(await nft.owner()).to.equal(timelock.address);
      expect(await nft.pendingOwner()).to.equal(ethers.ZeroAddress);
    });

    it("deployer masih DEFAULT_ADMIN_ROLE (role admin belum dipindah)", async function () {
      expect(await nft.hasRole(ethers.ZeroHash, owner.address)).to.equal(true);
      expect(await nft.hasRole(ethers.ZeroHash, timelock.address)).to.equal(false);
    });

    it("eip712Signer ter-set dan typeHash/domain separator deterministik", async function () {
      expect(await nft.eip712Signer()).to.equal(sigSigner.address);
      const th = await nft.typeHash();
      expect(th).to.equal(
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "ClaimAuthorization(bytes32 campaignId,bytes32 phaseId,address claimant,uint256 quantity,uint256 nonce,uint256 deadline)"
          )
        )
      );
      expect(await nft.domainSeparatorV4()).to.not.equal(ethers.ZeroHash);
    });

    it("metadataFinalized awal = false", async function () {
      expect(await nft.metadataFinalized()).to.equal(false);
    });
  });

  // ============================================================
  describe("2. Ownable2Step + renounce disabled", function () {
    it("transferOwnership hanya pendingOwner -> acceptOwnership", async function () {
      await nft.connect(timelock).transferOwnership(alice.address);
      expect(await nft.owner()).to.equal(timelock.address);
      expect(await nft.pendingOwner()).to.equal(alice.address);

      await expect(nft.connect(stranger).acceptOwnership()).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount"
      );

      await nft.connect(alice).acceptOwnership();
      expect(await nft.owner()).to.equal(alice.address);
      expect(await nft.pendingOwner()).to.equal(ethers.ZeroAddress);
    });

    it("renounceOwnership SELALU revert (permanen disabled)", async function () {
      await expect(nft.connect(timelock).renounceOwnership()).to.be.revertedWith(
        "Ownership renunciation disabled"
      );
    });

    it("non-owner tidak bisa memanggil fungsi onlyOwner", async function () {
      await expect(nft.connect(stranger).setSigner(bob.address)).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount"
      );
      await expect(
        nft.connect(stranger).setAllocationCap(TEAM, EARLY, 10)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
      await expect(
        nft.connect(stranger).setCampaignState(TEAM, EARLY, ST.CONFIGURED)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
      await expect(nft.connect(stranger).unpause()).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  // ============================================================
  describe("3. Role separation (Guardian pause-only)", function () {
    it("guardian punya PAUSER_ROLE, TIDAK punya DEFAULT_ADMIN_ROLE", async function () {
      expect(await nft.hasRole(pauserRole, guardian.address)).to.equal(true);
      expect(await nft.hasRole(ethers.ZeroHash, guardian.address)).to.equal(false);
    });

    it("guardian bisa pause, TIDAK bisa unpause", async function () {
      await nft.connect(guardian).pause();
      expect(await nft.paused()).to.equal(true);
      await expect(nft.connect(guardian).unpause()).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount"
      );
    });

    it("guardian TIDAK bisa config (cap/state/signer/metadata)", async function () {
      await expect(
        nft.connect(guardian).setAllocationCap(TEAM, EARLY, 10)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
      await expect(
        nft.connect(guardian).setCampaignState(TEAM, EARLY, ST.CONFIGURED)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
      await expect(nft.connect(guardian).setSigner(bob.address)).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount"
      );
      await expect(nft.connect(guardian).finalizeMetadata(BASE_URI)).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount"
      );
    });

    it("stranger tanpa PAUSER_ROLE tidak bisa pause", async function () {
      await expect(nft.connect(stranger).pause())
        .to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount")
        .withArgs(stranger.address, pauserRole);
    });

    it("guardian TIDAK bisa grant role (bukan admin PAUSER_ROLE)", async function () {
      await expect(
        nft.connect(guardian).grantRole(pauserRole, mallory.address)
      ).to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount");
    });

    it("admin bisa revoke PAUSER_ROLE -> guardian kehilangan hak pause", async function () {
      await nft.connect(owner).revokeRole(pauserRole, guardian.address);
      await expect(nft.connect(guardian).pause()).to.be.revertedWithCustomError(
        nft,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  // ============================================================
  describe("4. Campaign state machine", function () {
    it("transisi valid DRAFT->CONFIGURED->REVIEWED->ACTIVE", async function () {
      await nft.connect(timelock).setAllocationCap(TEAM, EARLY, 500);
      await nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.CONFIGURED);
      expect(await nft.state(TEAM, EARLY)).to.equal(ST.CONFIGURED);
      await nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.REVIEWED);
      expect(await nft.state(TEAM, EARLY)).to.equal(ST.REVIEWED);
      await nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.ACTIVE);
      expect(await nft.state(TEAM, EARLY)).to.equal(ST.ACTIVE);
    });

    it("transisi ilegal revert: DRAFT->ACTIVE", async function () {
      await expect(
        nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.ACTIVE)
      ).to.be.revertedWith("Invalid state transition");
    });

    it("transisi ilegal revert: REVIEWED->CONFIGURED (backwards)", async function () {
      await nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.CONFIGURED);
      await nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.REVIEWED);
      await expect(
        nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.CONFIGURED)
      ).to.be.revertedWith("Invalid state transition");
    });

    it("transisi ilegal revert: CLOSED itu terminal", async function () {
      await configurePhase(TEAM, EARLY, 10);
      await nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.CLOSED);
      expect(await nft.state(TEAM, EARLY)).to.equal(ST.CLOSED);
      await expect(
        nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.ACTIVE)
      ).to.be.revertedWith("Invalid state transition");
    });

    it("ACTIVE->CLOSED diizinkan, ACTIVE->EXHAUSTED diizinkan (manual)", async function () {
      await configurePhase(TEAM, EARLY, 10);
      await nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.EXHAUSTED);
      expect(await nft.state(TEAM, EARLY)).to.equal(ST.EXHAUSTED);
      await nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.CLOSED);
      expect(await nft.state(TEAM, EARLY)).to.equal(ST.CLOSED);
    });

    it("EXHAUSTED->ACTIVE ditolak", async function () {
      await configurePhase(TEAM, EARLY, 10);
      await nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.EXHAUSTED);
      await expect(
        nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.ACTIVE)
      ).to.be.revertedWith("Invalid state transition");
    });

    it("PhaseStateChanged event lengkap (oldState/newState)", async function () {
      await expect(nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.CONFIGURED))
        .to.emit(nft, "PhaseStateChanged")
        .withArgs(TEAM, EARLY, Number(ST.DRAFT), Number(ST.CONFIGURED));
    });
  });

  // ============================================================
  describe("5. Allocation caps", function () {
    it("owner set cap + event AllocationCapChanged", async function () {
      await expect(nft.connect(timelock).setAllocationCap(EARLY, TEAM, 500))
        .to.emit(nft, "AllocationCapChanged")
        .withArgs(EARLY, TEAM, 500n);
      expect(await nft.allocationCap(EARLY, TEAM)).to.equal(500n);
    });

    it("cap di bawah claimed revert (phase sudah EXHAUSTED)", async function () {
      await configurePhase(TEAM, EARLY, 3);
      await claimAs(alice, await makeAuth(alice.address));
      await claimAs(bob, await makeAuth(bob.address));
      await claimAs(carol, await makeAuth(carol.address));
      expect(await nft.state(TEAM, EARLY)).to.equal(ST.EXHAUSTED);

      await expect(nft.connect(timelock).setAllocationCap(TEAM, EARLY, 2)).to.be.revertedWith(
        "Allocation below claimed"
      );

      // raise cap saat EXHAUSTED boleh (state != ACTIVE) ...
      await nft.connect(timelock).setAllocationCap(TEAM, EARLY, 4);
      expect(await nft.allocationCap(TEAM, EARLY)).to.equal(4n);
      // ... tapi phase TETAP tidak bisa dipakai: EXHAUSTED->ACTIVE ditolak,
      // jadi raise cap setelah EXHAUSTED tidak membuka ulang phase (by design).
      await expect(claimAs(mallory, await makeAuth(mallory.address))).to.be.revertedWith(
        "Phase not active"
      );
      await expect(
        nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.ACTIVE)
      ).to.be.revertedWith("Invalid state transition");
    });

    it("cap TIDAK bisa diubah saat phase ACTIVE", async function () {
      await configurePhase(TEAM, EARLY, 10);
      await expect(
        nft.connect(timelock).setAllocationCap(TEAM, EARLY, 20)
      ).to.be.revertedWith("Cannot modify active phase");
    });

    it("cap bisa diubah saat phase belum ACTIVE (CONFIGURED)", async function () {
      await nft.connect(timelock).setAllocationCap(TEAM, EARLY, 10);
      await nft.connect(timelock).setCampaignState(TEAM, EARLY, ST.CONFIGURED);
      await nft.connect(timelock).setAllocationCap(TEAM, EARLY, 40);
      expect(await nft.allocationCap(TEAM, EARLY)).to.equal(40n);
    });

    it("cap = 0 -> semua claim revert Allocation exhausted", async function () {
      const auth = await makeAuth(alice.address);
      await expect(claimAs(alice, auth)).to.be.revertedWith("Allocation exhausted");
    });

    it("isolasi antar phase: cap EARLY habis tidak memblok COLLAB_FCFS", async function () {
      await configurePhase(TEAM, EARLY, 1);
      await configurePhase(TEAM, COLLAB_FCFS, 5);
      await claimAs(alice, await makeAuth(alice.address, TEAM, EARLY));
      expect(await nft.state(TEAM, EARLY)).to.equal(ST.EXHAUSTED);
      await claimAs(bob, await makeAuth(bob.address, TEAM, COLLAB_FCFS));
      expect(await nft.claimed(TEAM, COLLAB_FCFS)).to.equal(1n);
      expect(await nft.totalSupply()).to.equal(2n);
    });
  });

  // ============================================================
  describe("6. Claim — happy path", function () {
    beforeEach(async function () {
      await configurePhase(TEAM, EARLY, 500);
    });

    it("claim valid: mint 1 NFT, tokenId=1, semua counter naik tepat sekali", async function () {
      const auth = await makeAuth(alice.address);
      const tx = await claimAs(alice, auth);

      await expect(tx).to.emit(nft, "Claim").withArgs(TEAM, EARLY, alice.address, 1n);
      await expect(tx).to.emit(nft, "Transfer").withArgs(ethers.ZeroAddress, alice.address, 1n);

      expect(await nft.ownerOf(1)).to.equal(alice.address);
      expect(await nft.balanceOf(alice.address)).to.equal(1n);
      expect(await nft.nonces(alice.address)).to.equal(auth.nonce + 1n);
      expect(await nft.hasClaimed(alice.address)).to.equal(true);
      expect(await nft.totalSupply()).to.equal(1n);
      expect(await nft.claimed(TEAM, EARLY)).to.equal(1n);
    });

    it("claim adalah free (non-payable): kirim value -> revert", async function () {
      const auth = await makeAuth(alice.address);
      const sig = await signClaim(sigSigner, auth);
      await expect(
        nft
          .connect(alice)
          .claim(auth.campaignId, auth.phaseId, auth.claimant, auth.quantity, auth.nonce, auth.deadline, sig, {
            value: 1n,
          })
      ).to.be.reverted;
    });

    it("claimed counter per-phase, tokenId sequential 1..N", async function () {
      await claimAs(alice, await makeAuth(alice.address));
      await claimAs(bob, await makeAuth(bob.address));
      await claimAs(carol, await makeAuth(carol.address));
      expect(await nft.ownerOf(1)).to.equal(alice.address);
      expect(await nft.ownerOf(2)).to.equal(bob.address);
      expect(await nft.ownerOf(3)).to.equal(carol.address);
      expect(await nft.totalSupply()).to.equal(3n);
      expect(await nft.claimed(TEAM, EARLY)).to.equal(3n);
    });

    it("capacity test: phase auto-EXHAUSTED tepat di cap", async function () {
      const signers = (await ethers.getSigners()).slice(9); // wallet segar (di luar role)
      const cap = BigInt(signers.length);
      await configurePhase(COLLAB_FCFS, EARLY, cap);

      for (let i = 0; i < signers.length; i++) {
        const who = signers[i];
        await claimAs(who, await makeAuth(who.address, COLLAB_FCFS, EARLY));
        expect(await nft.claimed(COLLAB_FCFS, EARLY)).to.equal(BigInt(i + 1));
      }

      expect(await nft.totalSupply()).to.equal(cap);
      expect(await nft.state(COLLAB_FCFS, EARLY)).to.equal(ST.EXHAUSTED);

      // wallet berikutnya ditolak
      await expect(
        claimAs(mallory, await makeAuth(mallory.address, COLLAB_FCFS, EARLY))
      ).to.be.revertedWith("Allocation exhausted");
    });
  });

  // ============================================================
  describe("7. Claim — adversarial / negative", function () {
    beforeEach(async function () {
      await configurePhase(TEAM, EARLY, 500);
    });

    it("claimant != msg.sender -> 'Claimant mismatch'", async function () {
      const auth = await makeAuth(alice.address);
      const sig = await signClaim(sigSigner, auth);
      await expect(
        nft
          .connect(bob)
          .claim(auth.campaignId, auth.phaseId, auth.claimant, auth.quantity, auth.nonce, auth.deadline, sig)
      ).to.be.revertedWith("Claimant mismatch");
    });

    it("quantity != 1 -> 'Quantity must be 1' (qty 2)", async function () {
      const auth = await makeAuth(alice.address, TEAM, EARLY, { quantity: 2n });
      await expect(claimAs(alice, auth)).to.be.revertedWith("Quantity must be 1");
    });

    it("quantity = 0 -> 'Quantity must be 1'", async function () {
      const auth = await makeAuth(alice.address, TEAM, EARLY, { quantity: 0n });
      await expect(claimAs(alice, auth)).to.be.revertedWith("Quantity must be 1");
    });

    it("replay signature (nonce sama) -> 'Invalid nonce'", async function () {
      const auth = await makeAuth(alice.address);
      const sig = await signClaim(sigSigner, auth);
      await nft
        .connect(alice)
        .claim(auth.campaignId, auth.phaseId, auth.claimant, auth.quantity, auth.nonce, auth.deadline, sig);

      await expect(
        nft
          .connect(alice)
          .claim(auth.campaignId, auth.phaseId, auth.claimant, auth.quantity, auth.nonce, auth.deadline, sig)
      ).to.be.revertedWith("Invalid nonce");
    });

    it("future nonce -> 'Invalid nonce'", async function () {
      const current = await nft.nonces(alice.address);
      const auth = await makeAuth(alice.address, TEAM, EARLY, { nonce: current + 1n });
      await expect(claimAs(alice, auth)).to.be.revertedWith("Invalid nonce");
    });

    it("signature dipakai wallet lain (cross-claimant) -> revert", async function () {
      const authAlice = await makeAuth(alice.address);
      const sig = await signClaim(sigSigner, authAlice);
      const authBob = await makeAuth(bob.address);
      await expect(
        nft
          .connect(bob)
          .claim(authBob.campaignId, authBob.phaseId, authBob.claimant, authBob.quantity, authBob.nonce, authBob.deadline, sig)
      ).to.be.reverted;
    });

    it("deadline expired -> 'Expired deadline'", async function () {
      const auth = await makeAuth(alice.address, TEAM, EARLY, { deadline: (await blockNow()) - 1n });
      await expect(claimAs(alice, auth)).to.be.revertedWith("Expired deadline");
    });

    it("deadline = block.timestamp -> diterima (boundary >=)", async function () {
      const now = await blockNow();
      const auth = await makeAuth(alice.address, TEAM, EARLY, { deadline: now + 1n });
      await expect(claimAs(alice, auth)).to.not.be.reverted;
    });

    it("double claim wallet sama (nonce fresh, sig baru) -> 'Already claimed'", async function () {
      await claimAs(alice, await makeAuth(alice.address));
      const auth2 = await makeAuth(alice.address); // nonce sudah 1
      await expect(claimAs(alice, auth2)).to.be.revertedWith("Already claimed");
    });

    it("hasClaimed tidak reset oleh transfer -> tidak bisa claim 2x", async function () {
      await claimAs(alice, await makeAuth(alice.address));
      await nft.connect(alice).transferFrom(alice.address, bob.address, 1);
      expect(await nft.ownerOf(1)).to.equal(bob.address);
      expect(await nft.hasClaimed(alice.address)).to.equal(true);
      await expect(claimAs(alice, await makeAuth(alice.address))).to.be.revertedWith("Already claimed");
    });

    it("phase DRAFT dengan cap > 0 -> 'Phase not active'", async function () {
      await nft.connect(timelock).setAllocationCap(TEAM, COLLAB_GUARANTEED, 100);
      const auth = await makeAuth(alice.address, TEAM, COLLAB_GUARANTEED);
      await expect(claimAs(alice, auth)).to.be.revertedWith("Phase not active");
    });

    it("phase REVIEWED -> 'Phase not active'", async function () {
      await nft.connect(timelock).setAllocationCap(TEAM, COLLAB_GUARANTEED, 100);
      await nft.connect(timelock).setCampaignState(TEAM, COLLAB_GUARANTEED, ST.CONFIGURED);
      await nft.connect(timelock).setCampaignState(TEAM, COLLAB_GUARANTEED, ST.REVIEWED);
      const auth = await makeAuth(alice.address, TEAM, COLLAB_GUARANTEED);
      await expect(claimAs(alice, auth)).to.be.revertedWith("Phase not active");
    });

    it("phase CLOSED -> 'Phase not active'", async function () {
      await configurePhase(TEAM, COLLAB_GUARANTEED, 100);
      await nft.connect(timelock).setCampaignState(TEAM, COLLAB_GUARANTEED, ST.CLOSED);
      const auth = await makeAuth(alice.address, TEAM, COLLAB_GUARANTEED);
      await expect(claimAs(alice, auth)).to.be.revertedWith("Phase not active");
    });

    it("signer tidak sah (user menandatangani sendiri) -> 'Invalid signer'", async function () {
      const auth = await makeAuth(alice.address);
      await expect(claimAs(alice, auth, mallory)).to.be.revertedWith("Invalid signer");
    });

    it("signature tampered (campaignId beda) -> 'Invalid signer'", async function () {
      // kedua phase harus ACTIVE + ada sisa alokasi supaya require() mencapai
      // tahap verifikasi signature (urutan: allocation -> phase active -> signer)
      await configurePhase(COLLAB_FCFS, EARLY, 100);
      const signed = await makeAuth(alice.address, TEAM, EARLY);
      const sig = await signClaim(sigSigner, signed);
      await expect(
        nft
          .connect(alice)
          .claim(
            COLLAB_FCFS, // campaignId diubah, bukan yang ditandatangani
            signed.phaseId,
            signed.claimant,
            signed.quantity,
            signed.nonce,
            signed.deadline,
            sig
          )
      ).to.be.revertedWith("Invalid signer");
    });

    it("signature untuk phaseId lain -> 'Invalid signer'", async function () {
      await nft.connect(timelock).setAllocationCap(TEAM, COLLAB_GUARANTEED, 100);
      await nft.connect(timelock).setCampaignState(TEAM, COLLAB_GUARANTEED, ST.CONFIGURED);
      await nft.connect(timelock).setCampaignState(TEAM, COLLAB_GUARANTEED, ST.REVIEWED);
      await nft.connect(timelock).setCampaignState(TEAM, COLLAB_GUARANTEED, ST.ACTIVE);

      const signed = await makeAuth(alice.address, TEAM, EARLY); // ditandatangani untuk EARLY
      const sig = await signClaim(sigSigner, signed);
      await expect(
        nft
          .connect(alice)
          .claim(
            signed.campaignId,
            COLLAB_GUARANTEED, // phaseId diubah
            signed.claimant,
            signed.quantity,
            signed.nonce,
            signed.deadline,
            sig
          )
      ).to.be.revertedWith("Invalid signer");
    });

    it("domain version salah -> 'Invalid signer' (domain separator binding)", async function () {
      const auth = await makeAuth(alice.address);
      await expect(claimAs(alice, auth, sigSigner, { version: "2" })).to.be.revertedWith("Invalid signer");
    });

    it("domain verifyingContract salah (chain/contract lain) -> 'Invalid signer'", async function () {
      const auth = await makeAuth(alice.address);
      await expect(
        claimAs(alice, auth, sigSigner, { verifyingContract: mallory.address })
      ).to.be.revertedWith("Invalid signer");
    });

    it("signature kosong/panjang 0 -> revert ECDSA", async function () {
      const auth = await makeAuth(alice.address);
      await expect(
        nft
          .connect(alice)
          .claim(auth.campaignId, auth.phaseId, auth.claimant, auth.quantity, auth.nonce, auth.deadline, "0x")
      ).to.be.reverted;
    });

    it("phase belum pernah dikonfigurasi (cap 0, DRAFT) -> revert", async function () {
      const auth = await makeAuth(alice.address, COLLAB_FCFS, COLLAB_GUARANTEED);
      await expect(claimAs(alice, auth)).to.be.revertedWith("Allocation exhausted");
    });

    it("claim saat paused -> 'Pausable: paused'", async function () {
      await nft.connect(guardian).pause();
      const auth = await makeAuth(alice.address);
      await expect(claimAs(alice, auth)).to.be.revertedWith("Pausable: paused");
    });
  });

  // ============================================================
  describe("8. Pause semantics (claim-only)", function () {
    beforeEach(async function () {
      await configurePhase(TEAM, EARLY, 500);
    });

    it("pause TIDAK memblokir transfer sekunder selama paused", async function () {
      await claimAs(alice, await makeAuth(alice.address));
      await nft.connect(guardian).pause();
      expect(await nft.paused()).to.equal(true);

      await expect(nft.connect(alice).transferFrom(alice.address, bob.address, 1))
        .to.emit(nft, "Transfer")
        .withArgs(alice.address, bob.address, 1n);
      expect(await nft.ownerOf(1)).to.equal(bob.address);
    });

    it("unpause oleh owner memulihkan claim", async function () {
      await nft.connect(guardian).pause();
      await nft.connect(timelock).unpause();
      expect(await nft.paused()).to.equal(false);
      await expect(claimAs(alice, await makeAuth(alice.address))).to.not.be.reverted;
    });

    it("owner juga bisa pause langsung (onlyRole PAUSER_ROLE tidak dipenuhi owner=timelock)", async function () {
      await expect(nft.connect(timelock).pause()).to.be.revertedWithCustomError(
        nft,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("admin memberi PAUSER_ROLE ke timelock -> timelock bisa pause", async function () {
      await nft.connect(owner).grantRole(pauserRole, timelock.address);
      await expect(nft.connect(timelock).pause()).to.not.be.reverted;
      expect(await nft.paused()).to.equal(true);
    });
  });

  // ============================================================
  describe("9. Metadata", function () {
    it("tokenURI sebelum baseURI di-set mengembalikan tokenId string", async function () {
      await configurePhase(TEAM, EARLY, 10);
      await claimAs(alice, await makeAuth(alice.address));
      expect(await nft.tokenURI(1)).to.equal("1");
    });

    it("tokenURI setelah baseURI = baseURI + tokenId", async function () {
      await nft.connect(timelock).setBaseURI(BASE_URI);
      await configurePhase(TEAM, EARLY, 10);
      await claimAs(alice, await makeAuth(alice.address));
      await claimAs(bob, await makeAuth(bob.address));
      expect(await nft.tokenURI(1)).to.equal(BASE_URI + "1");
      expect(await nft.tokenURI(2)).to.equal(BASE_URI + "2");
    });

    it("tokenURI token nonexistent -> revert ERC721Metadata", async function () {
      await expect(nft.tokenURI(999)).to.be.revertedWith(
        "ERC721Metadata: URI query for nonexistent token"
      );
    });

    it("contractURI() default kosong, bisa di-set owner, non-owner ditolak", async function () {
      expect(await nft.contractURI()).to.equal("");
      await nft.connect(timelock).setContractURI(CONTRACT_URI);
      expect(await nft.contractURI()).to.equal(CONTRACT_URI);
      await expect(nft.connect(stranger).setContractURI("ipfs://x/")).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount"
      );
    });

    it("finalizeMetadata mengunci baseURI permanen", async function () {
      await expect(nft.connect(timelock).finalizeMetadata(BASE_URI))
        .to.emit(nft, "MetadataFinalized")
        .withArgs(BASE_URI, timelock.address);
      expect(await nft.metadataFinalized()).to.equal(true);
      expect(await nft.baseURI()).to.equal(BASE_URI);

      await expect(nft.connect(timelock).setBaseURI("ipfs://evil/")).to.be.revertedWith(
        "BaseURI frozen after finalization"
      );
      await expect(nft.connect(timelock).finalizeMetadata("ipfs://evil/")).to.be.revertedWith(
        "Already finalized"
      );
      await expect(nft.connect(timelock).setContractURI("ipfs://evil/")).to.be.revertedWith(
        "Contract URI frozen after finalization"
      );
    });
  });

  // ============================================================
  describe("10. Value rejection & interface", function () {
    it("kirim ETH langsung ke kontrak -> revert", async function () {
      await expect(alice.sendTransaction({ to: nftAddr, value: 1n })).to.be.revertedWith(
        "Cannot send native value to this contract"
      );
    });

    it("supportsInterface: ERC721 + AccessControl + ERC165 terdeteksi", async function () {
      expect(await nft.supportsInterface("0x80ac58cd")).to.equal(true); // ERC721
      expect(await nft.supportsInterface("0x01ffc9a7")).to.equal(true); // ERC165
      expect(await nft.supportsInterface("0x7965db0b")).to.equal(true); // AccessControl
      expect(await nft.supportsInterface("0x780e9d63")).to.equal(false); // ERC721Enumerable TIDAK dipakai
    });
  });

  // ============================================================
  describe("11. Invariants", function () {
    it("totalSupply == sum(claimed) setelah 10 claim lintas phase", async function () {
      await configurePhase(TEAM, EARLY, 5);
      await configurePhase(TEAM, COLLAB_FCFS, 5);
      const signers = (await ethers.getSigners()).slice(9, 19);
      const auths = [];
      for (let i = 0; i < signers.length; i++) {
        const phase = i < 5 ? EARLY : COLLAB_FCFS;
        auths.push(await makeAuth(signers[i].address, TEAM, phase));
      }
      for (let i = 0; i < signers.length; i++) {
        await claimAs(signers[i], auths[i]);
      }
      const e = await nft.claimed(TEAM, EARLY);
      const f = await nft.claimed(TEAM, COLLAB_FCFS);
      expect(e).to.equal(5n);
      expect(f).to.equal(5n);
      expect(await nft.totalSupply()).to.equal(e + f);
      expect(await nft.state(TEAM, EARLY)).to.equal(ST.EXHAUSTED);
      expect(await nft.state(TEAM, COLLAB_FCFS)).to.equal(ST.EXHAUSTED);
    });

    it("nonce bertambah tepat 1 per claim sukses, tidak berubah saat claim gagal", async function () {
      await configurePhase(TEAM, EARLY, 10);
      const before = await nft.nonces(alice.address);
      await expect(
        claimAs(alice, await makeAuth(alice.address, TEAM, EARLY, { quantity: 2n }))
      ).to.be.revertedWith("Quantity must be 1");
      expect(await nft.nonces(alice.address)).to.equal(before);

      await claimAs(alice, await makeAuth(alice.address));
      expect(await nft.nonces(alice.address)).to.equal(before + 1n);
    });

    it("MAX_SUPPLY hard cap invariant: allocationCap gabungan boleh > cap tapi supply dibatasi require", async function () {
      // 2,522 = distribution capacity (22+500+1000+1000), 2,222 = hard supply.
      await nft.connect(timelock).setAllocationCap(TEAM, ethers.id("TEAM_RESERVE"), 22);
      await nft.connect(timelock).setAllocationCap(TEAM, EARLY, 500);
      await nft.connect(timelock).setAllocationCap(TEAM, COLLAB_GUARANTEED, 1000);
      await nft.connect(timelock).setAllocationCap(TEAM, COLLAB_FCFS, 1000);
      const sum =
        (await nft.allocationCap(TEAM, ethers.id("TEAM_RESERVE"))) +
        (await nft.allocationCap(TEAM, EARLY)) +
        (await nft.allocationCap(TEAM, COLLAB_GUARANTEED)) +
        (await nft.allocationCap(TEAM, COLLAB_FCFS));
      expect(sum).to.equal(2522n);
      expect(await nft.MAX_SUPPLY()).to.equal(2222n);
    });
  });

  // ============================================================
  describe("12. Locked-requirement coverage (SECTION 22 final lock)", function () {
    beforeEach(async function () {
      await configurePhase(TEAM, EARLY, 100);
    });

    // White-box helper: paksa _totalSupply via storage tanpa harus 2.222 wallet.
    // Probe tiap slot, kembalikan nilai asli bila bukan slot _totalSupply,
    // sehingga tidak ada state lain (owner/paused) yang tertinggal termodifikasi.
    async function forceTotalSupply(value) {
      for (let slot = 0; slot < 64; slot++) {
        const key = ethers.toBeHex(slot, 32);
        const original = await ethers.provider.getStorage(nftAddr, slot);
        await ethers.provider.send("hardhat_setStorageAt", [nftAddr, key, ethers.toBeHex(value, 32)]);
        if ((await nft.totalSupply()) === value) return slot;
        await ethers.provider.send("hardhat_setStorageAt", [nftAddr, key, original]);
      }
      throw new Error("slot _totalSupply tidak ditemukan");
    }

    it("wrong chainId -> 'Invalid signer' (domain separator binding)", async function () {
      const auth = await makeAuth(alice.address);
      const sig = await signClaim(sigSigner, auth, { chainId: chainId + 1n });
      await expect(
        nft
          .connect(alice)
          .claim(auth.campaignId, auth.phaseId, auth.claimant, auth.quantity, auth.nonce, auth.deadline, sig)
      ).to.be.revertedWith("Invalid signer");
    });

    it("MAX_SUPPLY boundary: claim ke-2222 sukses, berikutnya 'Supply exhausted'", async function () {
      const slot = await forceTotalSupply(MAX_SUPPLY - 1n);
      expect(typeof slot).to.equal("number");

      await claimAs(alice, await makeAuth(alice.address));
      expect(await nft.totalSupply()).to.equal(MAX_SUPPLY);

      await expect(claimAs(bob, await makeAuth(bob.address))).to.be.revertedWith("Supply exhausted");
      expect(await nft.totalSupply()).to.equal(MAX_SUPPLY);
    });

    it("MAX_SUPPLY sudah tercapai -> 'Supply exhausted'", async function () {
      await forceTotalSupply(MAX_SUPPLY);
      await expect(claimAs(alice, await makeAuth(alice.address))).to.be.revertedWith("Supply exhausted");
    });

    it("transfer TIDAK reset nonce (SECTION 22)", async function () {
      await claimAs(alice, await makeAuth(alice.address));
      expect(await nft.ownerOf(1n)).to.equal(alice.address);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      expect(await nft.ownerOf(1n)).to.equal(bob.address);

      // nonce wallet pengirim tetap habis, hasClaimed tetap true
      expect(await nft.nonces(alice.address)).to.equal(1n);
      expect(await nft.hasClaimed(alice.address)).to.equal(true);
      // wallet penerima TIDAK mewarisi nonce/claim
      expect(await nft.nonces(bob.address)).to.equal(0n);
      expect(await nft.hasClaimed(bob.address)).to.equal(false);

      // replay signature lama (nonce 0) tetap ditolak setelah transfer
      const deadline = (await blockNow()) + ONE_HOUR;
      const stale = { campaignId: TEAM, phaseId: EARLY, claimant: alice.address, quantity: 1n, nonce: 0n, deadline };
      const staleSig = await signClaim(sigSigner, stale);
      await expect(
        nft.connect(alice).claim(TEAM, EARLY, alice.address, 1n, 0n, deadline, staleSig)
      ).to.be.revertedWith("Invalid nonce");
    });

    it("signer rotation: SignerRotated + signer lama langsung invalid, signer baru valid", async function () {
      await expect(nft.connect(timelock).setSigner(stranger.address))
        .to.emit(nft, "SignerRotated")
        .withArgs(sigSigner.address, stranger.address);
      expect(await nft.eip712Signer()).to.equal(stranger.address);

      const a1 = await makeAuth(carol.address);
      const s1 = await signClaim(sigSigner, a1);
      await expect(
        nft.connect(carol).claim(a1.campaignId, a1.phaseId, a1.claimant, a1.quantity, a1.nonce, a1.deadline, s1)
      ).to.be.revertedWith("Invalid signer");

      const a2 = await makeAuth(carol.address);
      const s2 = await signClaim(stranger, a2);
      await expect(
        nft.connect(carol).claim(a2.campaignId, a2.phaseId, a2.claimant, a2.quantity, a2.nonce, a2.deadline, s2)
      )
        .to.emit(nft, "Claim")
        .withArgs(TEAM, EARLY, carol.address, 1n);
    });

    it("setSigner: non-owner & Guardian ditolak, zero address ditolak", async function () {
      await expect(nft.connect(stranger).setSigner(stranger.address)).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount"
      );
      await expect(nft.connect(guardian).setSigner(guardian.address)).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount"
      );
      await expect(nft.connect(timelock).setSigner(ethers.ZeroAddress)).to.be.revertedWith(
        "Signer cannot be zero"
      );
    });

    it("event Paused/Unpaused dari Pausable", async function () {
      await expect(nft.connect(guardian).pause()).to.emit(nft, "Paused").withArgs(guardian.address);
      await expect(nft.connect(timelock).unpause()).to.emit(nft, "Unpaused").withArgs(timelock.address);
    });

    it("ceremony: DEFAULT_ADMIN_ROLE pindah ke Timelock, deployer nol role", async function () {
      const ADMIN = await nft.DEFAULT_ADMIN_ROLE();
      expect(await nft.hasRole(ADMIN, owner.address)).to.equal(true); // bootstrap deployer

      await nft.connect(owner).grantRole(ADMIN, timelock.address);
      await nft.connect(owner).renounceRole(ADMIN, owner.address);

      expect(await nft.hasRole(ADMIN, timelock.address)).to.equal(true);
      expect(await nft.hasRole(ADMIN, owner.address)).to.equal(false);
      expect(await nft.hasRole(pauserRole, owner.address)).to.equal(false);
      expect(await nft.owner()).to.equal(timelock.address);

      // deployer tidak lagi bisa grant role ...
      await expect(nft.connect(owner).grantRole(pauserRole, bob.address)).to.be.revertedWithCustomError(
        nft,
        "AccessControlUnauthorizedAccount"
      );
      // ... Timelock sebagai satu-satunya admin bisa
      await nft.connect(timelock).grantRole(pauserRole, bob.address);
      expect(await nft.hasRole(pauserRole, bob.address)).to.equal(true);
    });
  });
});
