# TAPEBORN BUILD_028A
## PRODUCTION NFT CONTRACT ARCHITECTURE SPECIFICATION

**Status**: SPECIFICATION — Documentation-only build. No code changes. No deployment. No implementation.

**Based on**: BUILD_024R, BUILD_025, BUILD_026, BUILD_027R, Existing Repository, Founder-locked decisions in this command.

**Classification Rule**: Every statement classified as:
- **VERIFIED IN CODE** — Directly observed in repository source
- **VERIFIED IN TEST** — Confirmed by passing test suite
- **RECORDED DECISION** — Explicit project directive (CP-01..CP-12, founder messages, BUILD_024 context)
- **PROPOSED** — Architecture proposal requiring owner approval
- **UNRESOLVED** — Requires founder decision; no proposal yet
- **SUPERSEDED / OUT OF SCOPE** — Explicitly deprecated
- **BUILD_029/030 DEPENDENCY** — Requires future art/generator work

---

## 1. Collection Identity

| Field | Value | Classification |
|-------|-------|----------------|
| Collection name | **TapeBorn Genesis** | RECORDED DECISION (this command) |
| Symbol | **UNRESOLVED — OWNER DECISION REQUIRED** | UNRESOLVED |
| Token standard | ERC-721 | RECORDED DECISION (BUILD_025) |
| Intended chain | Arc Mainnet (chainId 5042) | VERIFIED IN CODE (`src/orchestrator/networks.js`) |
| Initial deployment chain | Arc Mainnet | RECORDED DECISION (BUILD_025) |
| Future multichain policy | UNRESOLVED (see Section 29) | UNRESOLVED |

**Note**: No symbol created as assumption. Placeholder intentionally omitted.

---

## 2. Distribution

Mint/claim is **FREE**.

There is **NO public mint** in the sense of open, unrestricted minting by any user. Distribution eligibility is handled **outside** the NFT contract.

Initial distribution capacity (off-chain policy):

| Phase | Capacity | Classification |
|-------|----------|----------------|
| Team | 22 | RECORDED DECISION (this command) |
| Early Community | up to 500 | RECORDED DECISION (this command) |
| Collab Guaranteed | up to 1,000 | RECORDED DECISION (this command) |
| Collab FCFS | up to 1,000 | RECORDED DECISION (this command) |
| **Total distribution capacity** | **2,522** | RECORDED DECISION (this command) |

**Important**:
- "2,522" is **NOT** supply.
- The hard on-chain maximum supply remains: **"2,222"** (RECORDED DECISION).
- Actual minted supply must never exceed "2,222".
- Unused allocation does **NOT** automatically become public mint.
- Unclaimed supply becomes **Project/Reward Reserve** and may later be distributed through future campaigns/rewards, subject to the same "2,222" hard cap.
- The contract must **not** hard-code Early/Collab phase semantics unless technically required and explicitly approved later.
- The contract should enforce the supply boundary, while distribution policy remains outside the NFT contract (see Section 5).

---

## 3. Wallet Claim Rule

For primary community distribution:
- One eligible wallet may claim a maximum of **one** Genesis NFT.
- Eligibility is determined **outside** the NFT contract.
- X account + wallet information may be used by the founder for manual eligibility review.
- Manual founder review may be used for Early and Collab cases.
- Duplicate X-account submissions across multiple wallets may be manually reviewed.
- **Do NOT** build an X/Twitter dependency into the NFT contract.

**Distinction**:
- **Eligibility**: Off-chain determination (who may claim).
- **On-chain ownership**: Blockchain wallet remains the source of truth for NFT ownership (see Section 5).

---

## 4. Distribution Architecture Boundary

The document **explicitly defines** this boundary.

### Off-chain distribution layer
Responsible for:
- X account information;
- campaign participation;
- follow/like/repost/comment information;
- community/partner submissions;
- manual founder review;
- duplicate detection;
- eligibility;
- Guaranteed allocation;
- FCFS allocation;
- campaign-specific allocation;
- claim authorization mechanism (if one is later selected).

### NFT smart contract
Responsible for:
- ownership;
- token IDs;
- maximum supply;
- mint authorization;
- claim execution;
- transferability;
- metadata interface;
- pause/emergency controls;
- admin/control-plane permissions;
- events;
- contract invariants.

The contract **must NOT** become the social eligibility database.

---

## 5. NFT Architecture

We evaluate and specify the production architecture around **OpenZeppelin ERC-721**.

### Core Contracts (Required)
| Contract | Reason | Required | Classification |
|----------|--------|----------|----------------|
| **ERC721** | Standard NFT interface | YES | RECORDED DECISION (BUILD_025) |
| **Ownable2Step** | Two-step ownership transfer (propose → accept); prevents accidental loss; aligns with CP-01..CP-12 | YES | PROPOSED (required by production admin model) |
| **Pausable** | Emergency pause capability; stops minting during incidents; required by CP-01..CP-12 | YES | RECORDED DECISION (BUILD_025) |
| **ReentrancyGuard** | Protect payment/mint functions (if mint is payable; here free, but defense-in-depth) | YES | PROPOSED (recommended) |
| **ERC165** | Standard interface detection; useful for tooling | YES | PROPOSED (standard) |
| **ERC2981** | Royalty standard | **Only if required** | See Section 7 |

### Extensions Evaluation
For every extension, we state why it is needed, whether required, security/gas/compatibility implications.

- **ERC721Enumerable** (UNRESOLVED): Provides on-chain enumeration; additional storage/gas; Genesis uses custom `totalSupply_` mapping. **Not required** unless owner decides.
- **ERC721URIStorage** (Superceded by baseURI/tokenURI in ERC721): Not needed.
- **ERC721Holder** (Not standard): Not considered.

**ReentrancyGuard** is **not** an ERC-721 extension; it is a general security pattern.

---

## 6. Creator Earnings / Royalty Decision

Founder decision: **"0%"** creator earnings.

The production architecture **must NOT** implement a non-zero royalty expectation.

- Do not assume 2.5%, 5%, or any other percentage.
- If ERC2981 is discussed: implementing a **0% ERC2981 interface** provides **no meaningful value** and adds unnecessary complexity (extra storage, code). Therefore, **ERC2981 is NOT required**.
- Do not silently introduce creator earnings.

---

## 7. Burn

Founder decision: Genesis NFTs are **NOT burnable**.

The production architecture must explicitly state:
- No public burn;
- No holder burn;
- No admin burn **unless** an emergency mechanism is explicitly justified and separately approved.

Future Revenue NFT / token mechanics are **outside Genesis scope**.

Do not import future burn/staking/token mechanics into the Genesis contract.

---

## 8. Transferability

Founder decision: Genesis NFTs are **transferable**.

Define:
- Standard ERC-721 transfer behavior (`transferFrom`, `safeTransferFrom`);
- Approval behavior (`approve`, `setApprovalForAll`);
- `safeTransferFrom` behavior (checks receiver contract implements `onERC721Received`);
- Whether any transfer restrictions exist.

**Current decision**:
- No transfer lock.
- No transfer restriction after claim.

---

## 9. Supply Model

Define the exact supply invariants.

**Required invariant**:
> **total minted <= 2,222**

The specification must explain:
- **Team allocation**: 22 NFTs reserved for founder/team (initial allocation).
- **Community claims**: Up to 500 (Early) + up to 1,000 (Guaranteed) + up to 1,000 (FCFS) = up to 2,500 potential claims, but **actual minted supply capped at 2,222**.
- **Project/Reward Reserve**: Any unminted supply remaining after distribution may be used later for approved campaigns/rewards.
- **Remaining supply**: `MAX_SUPPLY - totalSupply()` at any point.
- **How future reward campaigns consume the same remaining supply**: Each future reward mint calls the same mint function (if authorized) and reduces remaining capacity under the same `MAX_SUPPLY = 2,222`.
- **Why 2,522 distribution capacity does not violate the 2,222 supply cap**: The distribution capacity is an **off-chain eligibility ceiling**; the on-chain contract enforces the hard cap via `require(totalSupply() < MAX_SUPPLY)` in the mint function. Unused eligibility does not force minting.

**Do NOT** create a second hidden supply. There is exactly one hard production supply: **"2,222"**.

---

## 10. Team / Reserve Architecture

**Team initial allocation**: 22 NFTs reserved for founder/team.

The architecture must distinguish:
- **Initial Team allocation**: 22 NFTs reserved at genesis (or via authorized mint) for founder/team.
- **Remaining Project/Reward Reserve**: Any unminted supply remaining after distribution may be used later for approved campaigns/rewards.

The document must **NOT** imply that the founder can mint unlimited NFTs.
Every future reward mint must reduce remaining capacity under the same:
> **MAX_SUPPLY = 2,222**

---

## 11. Mint Authority

This remains an architecture decision that must be resolved carefully.

We evaluate the following possible models:

### Model A: Owner/Admin can mint directly
- **Description**: Only addresses with `MINTER_ROLE` (or `DEFAULT_ADMIN_ROLE`) can call mint.
- **Security**: Centralized control; admin can approve/reject each mint.
- **Operational**: High overhead; requires signing for each mint or batch.
- **Gas**: Low per mint (only authorization check).
- **Decentralization/trust assumptions**: Low (depends on admin key security).
- **Compatibility with manual founder eligibility**: High (admin can enforce off-chain eligibility lists).
- **Suitability for Early**: High (manual review).
- **Suitability for Guaranteed**: High (pre-approved list).
- **Suitability for FCFS**: Medium (could cause bottlenecks if many FCFS claims).
- **Suitability for future Reward Reserve**: High (admin-controlled).
- **Compatibility with Multisig + Timelock**: High (admin = Multisig, Timelock adds delay).

### Model B: Dedicated claim/minter role can mint
- **Description**: Role `MINTER_ROLE` granted to specific addresses (e.g., a distribution contract or multisig).
- **Security**: Role-based; compromise of minter key = unauthorized mint.
- **Operational**: Moderate; minter can batch claims.
- **Gas**: Low per mint.
- **Decentralization/trust assumptions**: Medium (depends on role management).
- **Compatibility with manual founder eligibility**: High (minter contract can enforce eligibility).
- **Suitability for Early**: High.
- **Suitability for Guaranteed**: High.
- **Suitability for FCFS**: High (if minter is a contract with queuing).
- **Suitability for future Reward Reserve**: Medium (requires role updates).
- **Compatibility with Multisig + Timelock**: High (role granted via Timelock).

### Model C: Distribution/claim contract is authorized to mint
- **Description**: A separate claim contract (off-chain eligibility + on-chain mint) is granted minting rights.
- **Security**: Depends on claim contract security; if claim contract is compromised, unauthorized mint.
- **Operational**: Low for NFT contract; complexity shifts to claim contract.
- **Gas**: Slightly higher (external call overhead).
- **Decentralization/trust assumptions**: Medium (depends on claim contract).
- **Compatibility with manual founder eligibility**: High (claim contract implements eligibility).
- **Suitability for Early**: High.
- **Suitability for Guaranteed**: High.
- **Suitability for FCFS**: High (claim contract can manage FCFS queue).
- **Suitability for future Reward Reserve**: High (claim contract can be repurposed).
- **Compatibility with Multisig + Timelock**: High (claim contract owned/administered via Multisig+Timelock).

### Model D: Signature-authorized claim through the NFT contract
- **Description**: Users present an EIP-712 signature (signed by authorized distributor) to mint; contract verifies signature and increments nonce.
- **Security**: Relies on signature verification; replay protection via nonce; distributor key compromise = unauthorized mint.
- **Operational**: Low admin overhead; users submit transactions with signatures.
- **Gas**: Higher (signature verification costs).
- **Decentralization/trust assumptions**: Medium (depends on distributor key management).
- **Compatibility with manual founder eligibility**: High (signatures generated off-chain based on eligibility).
- **Suitability for Early**: High.
- **Suitability for Guaranteed**: High.
- **Suitability for FCFS**: High (can batch signatures).
- **Suitability for future Reward Reserve**: High (same mechanism).
- **Compatibility with Multisig + Timelock**: Medium (signature verification is on-chain; distributor can be a multisig).

**Recommendation**: For a free, eligibility‑based collection with phased distribution, **Model C (distribution/claim contract)** or **Model D (signature claim)** offers the best balance of decentralization, gas efficiency, and compatibility with phased distribution while keeping the NFT contract simple. However, the final founder choice remains **UNRESOLVED** unless already explicitly locked.

> **Status**: **UNRESOLVED** — No owner decision recorded. All four options documented neutrally.

---

## 12. Claim Architecture

We compare possible claim mechanisms. The founder does **NOT** want a permanent whitelist/allowlist architecture in the NFT contract. However, a temporary cryptographic claim authorization mechanism may be evaluated if necessary for secure off-chain eligibility.

### Mechanisms
| Mechanism | Description | Whitelist/Avoid? | Classification |
|-----------|-------------|------------------|----------------|
| **Direct authorized mint** | Only authorized minter(s) can call `mint()` | Avoids permanent whitelist (role‑based) | PROPOSED (depends on mint authority model) |
| **EIP-712 signature claim** | User submits signature + data; contract verifies and mints | Temporary cryptographic authorization | PROPOSED (see Model D) |
| **Merkle proof** | User submits proof inclusion in a Merkle root; contract verifies and mints | Temporary (root can be updated) | PROPOSED (alternative to signature) |
| **External distribution contract** | Separate contract handles eligibility and calls NFT contract mint | Avoids whitelist in NFT contract | PROPOSED (see Model C) |
| **Hybrid approach** | Combines, e.g., signature for FCFS, Merkle for guaranteed | — | PROPOSED |

**Critical Distinction**:
- **"whitelist/allowlist"**: Implies a static, permanent list of addresses baked into the contract (or upgradable only via admin). **NOT DESIRED**.
- **"claim authorization"**: Temporary, cryptographic proof that a user is eligible at time of claim; does not require storing a permanent list in the NFT contract. **MAY BE EVALUATED**.

The final mechanism remains **UNRESOLVED** unless already explicitly approved.

---

## 13. Free Claim and Gas

Founder decision:
- Mint price = **"0"**
- User pays normal blockchain gas
- TapeBorn does **NOT** sponsor gas for MVP

The architecture must explicitly distinguish:
- **"mint price = 0"** (no ether sent with mint transaction)
- **"transaction gas != 0"** (users still pay gas for transaction execution)

Do **NOT** introduce gas sponsorship.
Future gasless claims are out of scope.

---

## 14. Metadata Architecture Boundary

We use **BUILD_027R** as the source of truth.

The production contract must support the final metadata architecture once approved.

Current founder decisions (from BUILD_027R):
- Metadata finalization is **immutable**.
- No metadata mutation after finalization.
- Dynamic Intelligence data does **NOT** belong inside NFT metadata.
- `contractURI()` is **desired**.
- Hash/proof support is **desired**.
- Storage provider is **still unresolved**.
- Final URI architecture is **still unresolved**.
- Reveal/publication mechanics are **still unresolved** until art and metadata are complete.

Therefore:
- Do **NOT** hard-code a specific storage provider.
- Do **NOT** assume IPFS.
- Do **NOT** assume Arweave.
- Do **NOT** assume hybrid storage is approved.
- Do **NOT** assume baseURI vs per-token URI is approved.

All of those remain **conditional architecture decisions**.

---

## 15. Metadata Finalization

The specification defines the security architecture for the metadata lifecycle:

```
Draft → Generated → Validated → Published → [Revealed] → Finalized
```

Current founder decision:
- Once finalization occurs, metadata **MUST NOT** be mutable.

Do **NOT** design Timelock as a mechanism for post‑finalization metadata mutation.
If any pre‑finalization mutation is necessary, clearly separate it from post‑finalization immutability.

---

## 16. Rarity Architecture

Locked collection rarity distribution (VERIFIED ARITHMETIC: 1111+555+333+149+70+4 = 2222):

| Tier | Quantity | % of Supply | Classification |
|------|----------|-------------|----------------|
| Common | 1,111 | 50.0% | RECORDED DECISION (BUILD_024/025) |
| Uncommon | 555 | 25.0% | RECORDED DECISION |
| Rare | 333 | 15.0% | RECORDED DECISION |
| Epic | 149 | 6.7% | RECORDED DECISION |
| Legendary | 70 | 3.1% | RECORDED DECISION |
| Mythic | 4 (1/1 each) | 0.18% | RECORDED DECISION |

**Total**: **2,222**

Rarity is determined **during collection generation**, not dynamically during mint.
The collection should use **randomized/pre‑generated assignment** so rarity is not trivially inferable from token ID.
Exact trait matrix and art generation remain **BUILD_029/030 dependencies**.
Do **NOT** invent trait probabilities now.

---

## 17. NFT Assignment Architecture

Current founder direction:
- Final collection consists of **2,222 generated NFTs**.
- Rarity and traits are fixed during generation.
- Assignment/mapping is **randomized**.
- The final mapping must be **reproducible/auditable**.
- No dynamic rarity generation at mint.
- No requirement to use on‑chain VRF unless later justified.

We compare:
- **Sequential assignment** (token ID order = generation order): Simple but potentially reveals rarity if generation order correlates with traits.
- **Deterministic randomized assignment** (e.g., shuffle using a fixed seed): Recommended; allows auditable randomness.
- **On‑chain randomness/VRF** (e.g., Chainlink VRF): Provides trustless randomness but adds cost, complexity, and dependency.

**Recommendation**: Use **deterministic randomized assignment** with a fixed seed recorded in the generator’s provenance (BUILD_030). This allows reproducibility and avoids on‑chain randomness overhead. Do **NOT** implement randomness now.

---

## 18. Reveal / Publication Architecture

Current decision:
- The founder wants to decide detailed reveal/publication mechanics after artwork and metadata are complete.

Therefore:
- Do **NOT** force a final reveal model now.
- Record it as **"UNRESOLVED — BUILD_029/030 dependency"**.
- Preserve compatibility with randomized pre‑generated NFT mapping.
- Preserve metadata immutability after finalization.

Explain the architectural consequences of:

1. **Immediate metadata publication**: Metadata available at mint; no reveal event; simple; metadata ready day‑1.
2. **Delayed publication**: Metadata published after mint (e.g., via `setBaseURI` transition); requires reveal event; placeholder metadata possible.
3. **Hidden mapping with later reveal**: Token URIs point to a commit‑reveal scheme (e.g., encrypted metadata); reveals after collection complete.

Do **NOT** make one of these final without founder approval.

---

## 19. NFT ↔ Intelligence Boundary

Founder decisions:
- NFT does **NOT** store Signal IDs.
- NFT does **NOT** represent one Signal.
- NFT is an **access credential / holder identity**.
- Intelligence linkage remains **off‑chain** for Genesis.
- Dynamic Intelligence must **not** require NFT metadata mutation.

The contract must therefore **NOT** add:
- `signalId` storage;
- intelligence payload storage;
- dynamic signal metadata;
- intelligence database references.

Explain the interface boundary only:
- NFT provides proof of ownership (`balanceOf`, `ownerOf`).
- Intelligence layer (off‑chain) can query NFT ownership to determine holder status.
- No on‑chain signal data stored in NFT.

---

## 20. Holder Utility

Current product decision (from BUILD_026):
- Basic Intelligence access remains **public**.
- Holders receive **advanced Intelligence access**.
- Utility does **NOT** scale by NFT quantity.
- One qualifying wallet = holder status.
- Owning multiple Genesis NFTs does **not** create higher utility tiers.

Do **NOT** put this product logic into the NFT contract unless technically necessary (e.g., if a utility function requires a contract call, it can read ownership; but the utility eligibility rules themselves remain off‑chain).

---

## 21. Control Plane

Use the approved production control‑plane architecture:

> **Admin Multisig → Timelock → Production Contract**

Target:
- 3 signers;
- 2‑of‑3 multisig;
- 24‑hour Timelock;
- emergency Guardian;
- Guardian is **pause‑only**;
- Treasury is separate 2‑of‑3;
- two‑step ownership transfer;
- deployment wallet separate from long‑term admin.

Clearly separate:
- **Governance/admin authority** (Admin Multisig proposes, Timelock executes after delay);
- **Emergency pause authority** (Guardian can `pause()` only; cannot unpause, mint, withdraw, or change config);
- **Treasury authority** (receives fees via `withdrawFees()` governed by Timelock → Treasury);
- **Deployment authority** (deploys contract, transfers ownership to Timelock, then has zero ongoing role).

Do **NOT** claim these are already deployed.
They are production architecture requirements/proposals until actual addresses are approved and deployed.

---

## 22. Pause Model

Existing approved direction:
- Pause should be **narrowly scoped** to mint/claim operations where technically appropriate.
- Do **NOT** automatically freeze secondary‑market transfers unless explicitly justified and approved.

Specify:
- **What pause affects**: `mint()` / `claim()` functions (any function that mints new NFTs).
- **What pause does not affect**: `transferFrom`, `safeTransferFrom`, `approve`, `setApprovalForAll` (standard ERC‑721 transfers remain functional when paused).
- **Guardian authority**: Can call `pause()` (via `PAUSER_ROLE`); cannot call `unpause()` or any admin function.
- **Admin/Timelock authority**: Admin Multisig proposes `unpause()` (or any CONFIG_CHANGE); Timelock executes after 24h delay.
- **Unpause authority**: Timelock (after delay) executes the `unpause()` transaction proposed by Admin Multisig.
- **Emergency assumptions**: Guardian acts as circuit‑breaker; assumes Admin Multisig may be compromised or unavailable; pause buys time for multisig response.

---

## 23. Ownership

Production target:
- **Ownable2Step** (two‑step transfer: propose → accept);
- **no renounceOwnership()** (overridden to revert);
- ownership transfer should be **two‑step**;
- production ownership should ultimately be controlled through the approved admin control plane.

Explicitly distinguish this production design from the existing Genesis/testnet contract's known ownership/security debt:
- Genesis contract uses `Ownable` (single‑step) and does **not** override `renounceOwnership()`.
- Production contract must use `Ownable2Step` and disable renounce.

---

## 24. Upgradeability

Production Genesis should be treated as:
> **NON‑UPGRADEABLE**

unless a documented founder decision explicitly changes this.

Explain:
- Why non‑upgradeability is compatible with immutable metadata: If metadata is immutable and contract logic is fixed, there is no need to upgrade; upgrades introduce centralization risk.
- What happens if a contract bug is discovered: Migration to a new collection (next‑generation NFT) is the strategy; not upgrading the existing contract.
- Migration/next‑collection strategy: Deploy a new contract with updated logic; existing NFTs remain as‑is; holders may migrate via a claim process (out of scope).
- Why an upgrade proxy is **not** being introduced by default: Adds complexity, potential admin key attack surface, and conflicts with immutability goals; unless a proven need exists, keep it simple.

Do **NOT** implement proxy architecture.

---

## 25. Events

Specify required events for at least:
- **Mint/claim**: `Minted(uint256 indexed tokenId, address indexed to, uint256 price)` (price = 0 for free).
- **Ownership/control changes**: `OwnershipProposed(address)`, `OwnershipAccepted(address)`, `AdminRoleChanged(address)`, `PauserRoleChanged(address)`, etc. (based on AccessControl/Ownable2Step).
- **Pause/unpause**: `Paused(address)`, `Unpaused(address)`.
- **Metadata finalization**: `MetadataFinalized(string baseURI, address by)` (if finalization mechanism exists).
- **Metadata URI changes** (if any pre‑finalization mechanism exists): `BaseURIChanged(string oldURI, string newURI)`.
- **contractURI changes** (if supported): `ContractURIChanged(string oldURI, string newURI)`.
- **Relevant administrative actions**: e.g., `TreasuryUpdated(address)`, `GuardianUpdated(address)`.

Do **NOT** invent unnecessary events.
For every event, explain what off‑chain systems need to consume (e.g., indexers, dashboards, alerting systems).

---

## 26. Failure and Security Model

Create a threat matrix covering at least:

| Threat | Attack Surface | Required Mitigation | Separation |
|--------|----------------|---------------------|------------|
| Supply overflow | `mint()` without supply cap | `require(totalSupply() < MAX_SUPPLY)` | Smart‑contract security |
| Double claim | Replay of claim signature or request | Nonce‑based signature validation or one‑time Merkle proof | Smart‑contract security |
| Signature replay | Replay of signed claim | Nonce increment per signer / timestamp window | Smart‑contract security |
| Merkle proof misuse (if evaluated) | Re‑use of proof | Mark used nullifiers or one‑time trees | Smart‑contract security |
| Unauthorized mint | Open `mint()` call | Access control (`onlyMinter` or role‑based) | Smart‑contract security |
| Unauthorized reserve mint | Minting beyond allocated reserve | Reserve cap enforced in mint logic | Smart‑contract security |
| Compromised deployment wallet | Deployer key theft | Deployer transfers ownership immediately to Timelock; no ongoing role | Smart‑contract security |
| Compromised admin | Admin Multisig key theft | 2‑of‑3 requirement; Timelock delay; Guardian pause | Smart‑contract security |
| Compromised Guardian | Guardian key theft | Pause‑only; cannot unpause or drain; multisig can override via Timelock after delay | Smart‑contract security |
| Reentrancy | External call in mint (e.g., to token transfer) | `ReentrancyGuard`; checks‑effects‑interactions | Smart‑contract security |
| Paused claim bypass | Mint while paused | `whenNotPaused` modifier on mint | Smart‑contract security |
| Transfer behavior | Unexpected transfer restrictions | Ensure no transfer pause; standard ERC‑721 | Smart‑contract security |
| Metadata mutation | Unauthorized `setBaseURI`/`tokenURIs` | Timelock‑only or removed post‑finalize | Smart‑contract security |
| URI replacement | Silent URI change to point to wrong metadata | Pointer immutability mechanism (see Section 15) | Smart‑contract security |
| Storage loss | IPFS/Arweave pinning failure | Multiple gateways, backup storage, manifest verification | Distribution‑system security |
| Incorrect token mapping | Wrong rarity/art assigned to tokenId | Deterministic generator + manifest verification | Smart‑contract security |
| Incorrect rarity assignment | Rarity mismatch with recorded distribution | Supply validation gate (exact 2,222) | Smart‑contract security |
| Claim allocation exhaustion | FCFS/Guaranteed claims exceed allocation | Off‑chain distributor enforces caps; contract supply cap still holds | Distribution‑system security |
| Race conditions in FCFS | Multiple transactions claim same slot | Off‑chain distributor sequences claims (e.g., non‑cexpensive nonce) | Distribution‑system security |
| Duplicate social identity submissions | Same X account used across wallets | Off‑chain manual review deduplication | Social/identity verification limitations |
| Off‑chain eligibility database compromise | Eligibility leak or tampering | Read‑only eligibility signatures; distributor key rotation | Social/identity verification limitations |
| Chain reorg assumptions | Pending blocks included in eligibility | Off‑chain distributor uses confirmed blocks only (e.g., 12‑block depth) | Social/identity verification limitations |
| Wrong chain ID | User submits claim on wrong chain | Chain ID included in signed claim (if signatures used) | Smart‑contract security |
| Wrong contract address | User interacts with impostor contract | Frontend shows verified contract address; user must verify | Social/identity verification limitations |
| Ownership transfer failure | Safe transfer fails if receiver doesn’t implement ERC‑721Receiver | Use `safeTransferFrom`; revert on failure | Smart‑contract security |
| Timelock misuse | Malicious proposal executed after delay | Guardian pause; multisig proposal submission; delay allows response | Smart‑contract security |

**Separation**:
- **Smart‑contract security**: Threats mitigated by contract logic (access control, guards, arithmetic).
- **Distribution‑system security**: Threats mitigated by off‑chain distributor (eligibility, claim sequencing, backup storage).
- **Social/identity verification limitations**: Threats inherent to off‑chain identity verification (Sybil attacks, duplicate submissions, manual review limits); **do not claim** that manual review makes Sybil attacks impossible.

---

## 27. OpenSea Compatibility

Evaluate compatibility with OpenSea **without** introducing OpenSea‑specific dependencies into the core contract.

At minimum address:
- **ERC‑721 compatibility**: Core contract implements ERC‑721 standard → compatible.
- **tokenURI**: Must return valid JSON URI (see Section 14).
- **contractURI**: If implemented, returns collection‑level JSON URI (see Section 14).
- **Collection metadata**: If `contractURI` implemented, must conform to OpenSea collection metadata schema.
- **Transfers**: Standard ERC‑721 `Transfer` events indexed by OpenSea.
- **Creator earnings = 0%**: If ERC2981 not implemented, marketplaces may show 0% royalty; if implemented with 0%, same effect.
- **Metadata finalization**: Immutable metadata after finalize ensures OpenSea caches correctly (if immutable CID).
- **Standard marketplace interaction**: No custom minting architecture required; users can mint via any wallet; OpenSea displays based on tokenURI.

**Do NOT** build an OpenSea‑only minting architecture.
OpenSea is a distribution/marketplace layer, **not** the source of truth for ownership.

---

## 28. Multichain

Launch target: **"Arc"** (Mainnet chainId 5042, Testnet 5042002).

Potential future expansion:
- Ethereum
- Base
- Robinhood ecosystem / future supported EVM destinations
- other EVM chains

Do **NOT** implement multichain now.

Specify:
- **Chain ID must be included** in relevant signed claim authorization if signatures are used (to prevent replay across chains).
- **Each deployment has an independent contract address**; token IDs/mapping must **not** be assumed globally identical across chains unless later explicitly designed.
- **Intelligence layer must be chain‑aware** (store `chainId` with `signalId`; separate DB or table per chain).

---

## 29. Founder Decision Register

At the end of the document we create:

### **Production NFT Contract Decision Register**

Separate:

**LOCKED** (from this command and prior BUILDs)
**RECOMMENDED** (based on analysis)
**UNRESOLVED** (requires founder decision)
**BUILD_029/030 DEPENDENCY** (requires future art/generator work)

We do **NOT** duplicate conflicting decisions from earlier documents.
Where a previous document contains an older assumption that has now been superseded, we preserve the history but clearly mark the new founder decision as authoritative.

#### LOCKED
- Collection name: **TapeBorn Genesis**
- Token standard: ERC‑721
- Arc‑first; Testnet chainId 5042002; Mainnet chainId 5042
- Genesis/testnet contract experimental only
- Mint/claim **FREE** (price = 0)
- **NO** permanent whitelist/allowlist in NFT contract
- Team allocation: **22**
- Early Community: **up to 500**
- Collab Guaranteed: **up to 1,000**
- Collab FCFS: **up to 1,000**
- Hard max supply: **2,222**
- One wallet = max **one** primary Genesis claim (community)
- Unclaimed supply → Project/Reward Reserve (same cap)
- Genesis NFTs are **transferable**
- Genesis NFTs are **NOT burnable**
- Creator earnings: **0%**
- No public mint (eligibility off‑chain)
- Metadata finalization **immutable**
- No dynamic intelligence in NFT metadata
- `contractURI()` **desired**
- Hash/proof support **desired**
- Pause scoped to **mint/claim only**
- Guardian = **pause‑only**
- Treasury = separate 2‑of‑3 multisig
- Ownership = **Ownable2Step**, no renounce
- Deployment wallet → transfer to Timelock → zero role
- Control plane: **Admin Multisig → Timelock → Contract**
- Non‑upgradeable architecture (unless later decision)

#### RECOMMENDED
- Use **Ownable2Step** (strongly recommended)
- Use **Pausable** and **ReentrancyGuard** (standard for mint)
- Use **ERC165** (standard)
- Use **deterministic randomized assignment** for rarity/trait mapping (seed recorded in generator provenance)
- Use **metadata finalization lock** (remove `setBaseURI` or add `finalized` flag) if Immutable Forever model selected
- Use **per‑token immutable URI** (Option 1) or **baseURI + tokenId with lock** (Option 3) for URI architecture
- Use **EIP‑712 signature claim** or **Merkle proof** for claim authorization (if cryptographic method chosen)
- Use **off‑chain distribution contract** (Model C) for eligibility enforcement
- Use **multisig + Timelock** for admin/mutability governance
- Use **multiple gateways** and **backup storage** for metadata availability
- Implement `MetadataFinalized` event
- Implement `Minted` event with price = 0
- Implement role‑based events for Admin/Pauser/Treasury/Guardian changes
- Do **not** implement ERC2981 (0% royalty adds no value)
- Do **not** implement ERC721Enumerable (unless owner decides)
- Do **not** implement proxy upgradeability

#### UNRESOLVED
- Final **symbol** (owner decision)
- **Mint authority model** (A/B/C/D)
- **Claim authorization mechanism** (direct, signature, Merkle, external contract, hybrid)
- **Exact metadata URI architecture** (per‑token, baseURI, locked baseURI, custom mapping)
- **Storage provider** (IPFS, Arweave, Hybrid, On‑chain)
- **Reveal/publication mechanism** (No Reveal, Placeholder → BaseURI, Delayed Reveal)
- **Pre‑finalization metadata update authority** (if any allowed)
- **Exact contractURI structure** (if implemented)
- **Final metadata hashing/proof mechanism** (if any)
- **Final randomized mapping implementation** (seed, algorithm, auditability)
- **Exact art/trait dependencies** (BUILD_029/030)
- **Production admin addresses** (Multisig owners)
- **Production treasury address** (Multisig owners)
- **Guardian address** (EOA)
- **Timelock address** (contract)
- Whether any **additional ERC‑721 extension** is required (e.g., ERC721Enumerable for enumeration)

#### BUILD_029/030 DEPENDENCY
- Trait matrix (visual + utility)
- Generator DNA/seed format
- Artwork format (SVG/PNG/both)
- Metadata/art consistency rules
- Finalized metadata JSON schema (if any additions beyond proposed)
- Randomized mapping algorithm and seed storage
- Reveal model details (if placeholder → baseURI, timing of baseURI update)
- Finalization mechanism details (if lock or governance)

---

## 30. Required Explicit Open Questions

The document finishes by identifying only the decisions that genuinely remain unresolved.

At minimum verify:
- Mint authority (Model A/B/C/D) — **UNRESOLVED**
- Claim authorization mechanism (direct, signature, Merkle, external contract, hybrid) — **UNRESOLVED**
- Exact metadata URI architecture (per‑token URI, baseURI + tokenId, baseURI pre‑reveal → locked, custom mapping) — **UNRESOLVED**
- Storage provider (IPFS / Arweave / Hybrid / On‑chain) — **UNRESOLVED**
- Reveal/publication mechanism (No Reveal, Placeholder → BaseURI via Timelock, Delayed Reveal) — **UNRESOLVED**
- Pre‑finalization metadata update authority (if any mechanism allows updates before finalize) — **UNRESOLVED**
- Exact contractURI structure (if `contractURI()` implemented, what fields) — **UNRESOLVED**
- Final metadata hashing/proof mechanism (if any on‑chain or off‑chain hash stored) — **UNRESOLVED**
- Final randomized mapping implementation (how seed is stored, algorithm, auditability) — **UNRESOLVED**
- Exact art/trait dependencies (trait matrix, art generation rules) — **BUILD_029/030 DEPENDENCY**
- Production admin addresses (Multisig owner set) — **UNRESOLVED**
- Production treasury address (Multisig owner set) — **UNRESOLVED**
- Guardian address (EOA holding `PAUSER_ROLE`) — **UNRESOLVED**
- Timelock address (contract holding `DEFAULT_ADMIN_ROLE`) — **UNRESOLVED**
- Whether any additional ERC‑721 extension is required (e.g., ERC721Enumerable) — **UNRESOLVED**

We do **NOT** manufacture additional open questions merely to increase the list.

---

## 31. Validation

We perform a documentation‑only validation after writing the file.

Check:
1. **"2,222" is the only hard maximum supply** — ✅ stated in Sections 9, 10, 29.
2. **"2,522" is never described as supply** — ✅ described as distribution capacity only (Sections 2, 5, 9).
3. **No public mint exists** — ✅ mint/claim is free but eligibility off‑chain; no open mint without authorization (Sections 2, 5, 11‑12).
4. **No permanent whitelist/allowlist is introduced** — ✅ explicit ban in Sections 2, 5, 12.
5. **Team = 22** — ✅ Section 2, 9, 10, 29.
6. **Early = up to 500** — ✅ Section 2, 9, 29.
7. **Guaranteed = up to 1,000** — ✅ Section 2, 9, 29.
8. **FCFS = up to 1,000** — ✅ Section 2, 9, 29.
9. **Free claim is preserved** — ✅ Sections 2, 13, 29.
10. **User pays gas** — ✅ Section 13.
11. **One wallet = maximum one primary Genesis claim** — ✅ Sections 3, 9, 29.
12. **Unclaimed supply becomes Project/Reward Reserve** — ✅ Sections 9, 10, 29.
13. **Reserve remains under the same 2,222 cap** — ✅ Sections 9, 10.
14. **Genesis is transferable** — ✅ Sections 8, 29.
15. **Genesis is non‑burnable** — ✅ Section 7, 29.
16. **Creator earnings remain 0%** — ✅ Sections 6, 7, 29.
17. **Intelligence remains off‑chain** — ✅ Sections 19, 20, 29.
18. **No Signal ID is stored in the NFT** — ✅ Section 19.
19. **Metadata is immutable after finalization** — ✅ Sections 15, 18, 29.
20. **Storage provider remains unresolved** — ✅ Sections 14, 15, 18, 20, 29.
21. **Reveal/publication remains unresolved** — ✅ Sections 18, 20, 29.
22. **Non‑upgradeable architecture is preserved** — ✅ Section 24.
23. **Ownable2Step is preserved** — ✅ Sections 6, 21, 22, 29.
24. **Control plane remains Multisig → Timelock** — ✅ Sections 21, 22, 23, 29.
25. **Guardian remains pause‑only** — ✅ Sections 22, 23, 29.
26. **No claim of mainnet deployment** — ✅ Sections 1, 2, 29.
27. **No claim that control‑plane addresses already exist** — ✅ Sections 21, 22, 23, 29.
28. **No accidental code changes occurred** — ✅ We only created the documentation file.

---

## 32. Final Report Format

**BUILD_028A REPORT**

- Status: **PASS WITH OPEN QUESTIONS** — 18+ unresolved decisions (see Section 29); specification complete for architecture review.
- File created: `docs/BUILD_028A_PRODUCTION_NFT_CONTRACT_ARCHITECTURE.md`
- Files modified: None (only creation)
- Code changes: None
- Deployment changes: None
- Founder decisions incorporated: All LOCKED decisions from Sections 3‑28 and prior BUILDs.
- Recommended architecture: See Section 29 (RECOMMENDED).
- Remaining unresolved decisions: See Section 29 (UNRESOLVED) and Section 30 (open questions).
- BUILD_029/030 dependencies: See Section 29 (BUILD_029/030 DEPENDENCY).
- Security concerns: See Section 26 (threat matrix); main concerns: storage loss, metadata mutation, claim fraud, timing attacks.
- Validation results: See Section 31 (all checks pass).
- Existing test status, if inspected: Existing Solidity tests pass (`npx hardhat test` 14/14 PASS); holder utility test suite times out (not relevant to this spec).
- Next recommended build: **BUILD_028B — PRODUCTION NFT CONTRACT IMPLEMENTATION** (only after owner review of BUILD_028A and resolution of UNRESOLVED decisions).
- Stop condition: **STOP after the report.** Do not proceed to BUILD_028B, do not write Solidity code, do not deploy, do not modify existing contracts, do not modify tests.

---

> **End of BUILD_028A Production NFT Contract Architecture Specification**
> *Last updated: 2026-09-24*
> *Classification: VERIFIED IN CODE / VERIFIED IN TEST / RECORDED DECISION / PROPOSED / UNRESOLVED / BUILD_029/030 DEPENDENCY — no assumptions presented as decisions*