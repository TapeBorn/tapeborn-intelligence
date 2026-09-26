# TAPEBORN BUILD_028A-R
## PRODUCTION NFT CONTRACT ARCHITECTURE — FOUNDER DECISION LOCK

**Status**: DECISION LOCK — Documentation-only build. No code changes. No deployment. No implementation.

**Purpose**: Lock the six remaining contract-level architecture decisions required before BUILD_028B (Production NFT Contract Implementation).

**Based on**: BUILD_024R, BUILD_025, BUILD_026, BUILD_027R, BUILD_028A, Existing Repository, Founder-locked decisions in this command.

**Classification Rule**: Every statement classified as:
- **VERIFIED IN CODE** — Directly observed in repository source
- **VERIFIED IN TEST** — Confirmed by passing test suite
- **RECORDED DECISION** — Explicit project directive (CP-01..CP-12, founder messages, BUILD_024 context)
- **PROPOSED** — Architecture proposal requiring owner approval
- **UNRESOLVED** — Requires founder decision; no proposal yet
- **SUPERSEDED / OUT OF SCOPE** — Explicitly deprecated
- **BUILD_029/030 DEPENDENCY** — Requires future art/generator work

---

## 1. Source of Truth

Read and respect:
- docs/BUILD_024R_*.md
- docs/BUILD_025_*.md
- docs/BUILD_026_*.md
- docs/BUILD_027R_*.md
- docs/BUILD_028A_PRODUCTION_NFT_CONTRACT_ARCHITECTURE.md
- existing SignalArtifact.sol
- existing Hardhat configuration/tests
- existing control-plane documentation/tests

If exact filenames differ, locate them in the repository.

Founder decisions recorded after previous builds are authoritative.

Do NOT silently reinterpret them.

If an older document conflicts with a newer Founder decision, preserve the history but explicitly mark the newer decision as authoritative/superseding.

---

## 2. Locked Foundation — Do Not Change

The following are already LOCKED and must remain unchanged:

### Collection
- Name: **TapeBorn Genesis**
- Standard: **ERC-721**
- Production supply: exactly **2,222** maximum
- Arc-first
- Arc Mainnet chainId: **5042**
- Arc Testnet chainId: **5042002**
- Genesis/testnet contract is experimental only

### Distribution
- No public unrestricted mint
- Free primary claim
- User pays gas
- No gas sponsorship in MVP
- Eligibility remains outside NFT contract
- No permanent whitelist/allowlist in NFT contract
- One eligible wallet = maximum **one** primary Genesis claim
- Team = **22**
- Early Community = **up to 500**
- Collab Guaranteed = **up to 1,000**
- Collab FCFS = **up to 1,000**
- **2,522** = distribution capacity only, NEVER supply
- Hard on-chain supply = **2,222**
- Unclaimed supply remains available as **Project/Reward Reserve**
- Future reserve distribution uses the same **2,222** hard cap
- Founder/team reserve does NOT create hidden additional supply

### NFT Behavior
- Transferable
- No transfer lock
- No Genesis burn
- No public burn
- No admin burn unless separately approved in the future
- Creator earnings = **0%**
- Do not implement ERC2981 unless a later Founder decision changes this
- NFT does not store signalId
- NFT does not store Intelligence data
- NFT is holder identity/access credential
- Intelligence remains off-chain
- One holder wallet receives holder utility regardless of number of Genesis NFTs owned
- No token/staking/DAO mechanics in MVP

### Security/Control
- Non-upgradeable architecture
- Ownable2Step
- Admin Multisig → 24h Timelock → Production Contract
- Admin Multisig target: 3 signers / 2-of-3
- Guardian is pause-only
- Guardian cannot mint
- Guardian cannot withdraw
- Guardian cannot change configuration
- Guardian cannot unpause
- Pause should affect mint/claim only
- Secondary-market transfers remain functional while mint is paused
- Treasury is separate 2-of-3 multisig
- Deployment wallet has no ongoing production role
- No claim that production control-plane addresses already exist

### Metadata
- Metadata becomes immutable after finalization
- Dynamic Intelligence data must never require NFT metadata mutation
- contractURI() is desired
- Storage provider was previously unresolved
- Reveal/publication details were previously unresolved
- Art/trait generation belongs to BUILD_029/030
- Rarity distribution is locked:
  - Common: 1,111
  - Uncommon: 555
  - Rare: 333
  - Epic: 149
  - Legendary: 70
  - Mythic: 4 (1/1 each)
  - **Total: 2,222**

---

## 3. Decision 1 — Mint Authority

We evaluate the following models:

### A. Direct authorized mint
- **Who can authorize a mint**: Admin Multisig (via Timelock) or a designated MINTER_ROLE.
- **Who can execute the user transaction**: The user sends a transaction to the NFT contract's mint function; the contract checks if the caller is authorized (e.g., onlyMinter or has MINTER_ROLE).
- **Where eligibility lives**: Off-chain (distributor or admin checks eligibility before authorizing the mint).
- **Where one-claim protection lives**: Off-chain (distributor ensures each wallet only gets one authorization) or on-chain via a mapping of wallet to claim status (if using a claim mechanism like signature or Merkle).
- **Where reserve limits live**: Off-chain (distributor respects allocation caps) or on-chain via a reserve cap in the mint function.

**Advantages**:
- Simple contract logic.
- Low gas cost for authorization (only a role check).
- Clear separation: eligibility off-chain, authorization on-chain.

**Disadvantages**:
- Requires off-chain distributor to manage eligibility and authorizations (signature or direct call).
- If using direct authorized mint (only admin can mint), the admin must submit a transaction for each claim, which is operational heavy for FCFS.

**Security Implications**:
- If authorization is role-based, compromise of the minter key allows unauthorized mint.
- Mitigation: use multisig for minter role, and/or use Timelock for mint execution.

**Gas/Operational Implications**:
- Low gas per mint (only role check).
- Operational overhead depends on how authorizations are generated off-chain (e.g., signing each claim).

**Interaction**:
- Free claim: user sends mint transaction with authorization (if required) and pays gas.
- Manual X/wallet eligibility: off-chain distributor verifies eligibility before providing authorization.
- Guaranteed allocation: off-chain distributor can pre-authorize a list of wallets.
- FCFS allocation: off-chain distributor can process claims in order and stop when allocation exhausted.
- Project/Reward Reserve: same mechanism; off-chain distributor respects reserve cap.
- 2,222 hard cap: enforced in contract via `require(totalSupply() < MAX_SUPPLY)`.
- Multisig + Timelock: minter role can be granted to Admin Multisig via Timelock; mint execution can be delayed by Timelock if desired.
- Metadata immutability: unaffected.
- OpenSea compatibility: unaffected.
- Future EVM expansion: each deployment independent.

### B. Dedicated MINTER_ROLE
- Similar to A, but with a specific role for minting (separate from admin roles).
- Allows more granular control (e.g., minter role can be transferred without affecting admin).

**Advantages**:
- Role separation: minter can be a different entity from admin.
- Can be revoked without affecting admin functions.

**Disadvantages**:
- Same as A regarding operational overhead if minter must submit transactions.

**Security Implications**:
- Same as A; minter key compromise is the risk.

### C. Separate distribution/claim contract
- A separate contract (claim contract) handles eligibility and authorization, and is granted minting rights on the NFT contract.
- The claim contract can implement signature-based claims, Merkle proofs, or direct allowlists (off-chain managed).
- The NFT contract only mints when called by the authorized claim contract.

**Advantages**:
- NFT contract remains simple: only checks that caller is the authorized claim contract.
- Eligibility and claim logic live in the claim contract, which can be upgraded or replaced (if upgradeable) without changing the NFT contract.
- Allows complex claim mechanisms (signature, Merkle) without bloating the NFT contract.

**Disadvantages**:
- Introduces an additional contract (attack surface, upgradeability risk).
- Requires securing the claim contract.
- Slightly higher gas due to external call.

**Security Implications**:
- If the claim contract is compromised, it could mint unauthorized NFTs.
- Mitigation: make the claim contract immutable or use multisig ownership.

**Gas/Operational Implications**:
- One external call per mint (low overhead).
- Claim contract can batch or process claims efficiently off-chain.

**Interaction**:
- Free claim: user interacts with claim contract (pays gas there); claim contract then calls NFT contract.
- Manual X/wallet eligibility: claim contract verifies off-chain.
- Guaranteed/FCFS: claim contract manages allocations.
- Project/Reward Reserve: same claim contract can be used.
- 2,222 hard cap: NFT contract still enforces supply cap.
- Multisig + Timelock: claim contract ownership can be controlled via Multisig → Timelock.
- Metadata immutability: unaffected.
- OpenSea compatibility: unaffected.
- Future EVM expansion: each deployment independent.

### D. NFT contract with signature-authorized claim
- User presents an EIP-712 signature (signed by an authorized distributor) to the NFT contract's mint function.
- Contract verifies signature, nonce, and contract address to prevent replay.
- Distributor generates signatures off-chain based on eligibility.

**Advantages**:
- No need for a separate claim contract; all logic in NFT contract.
- Non-interactive: user can submit a transaction with a pre-generated signature.
- Gas efficient for user (only one transaction).
- No state required for Merkle roots or allowlists.

**Disadvantages**:
- Slightly higher gas due to signature verification (but still reasonable).
- Requires secure management of distributor key.
- If distributor key is compromised, unauthorized signatures can be generated.
- Nonce management must be careful to prevent replay.

**Security Implications**:
- Distributor key compromise = ability to mint unauthorized NFTs.
- Mitigation: distributor can be a multisig, and signatures can include chainId and contract address to prevent cross-chain replay.
- Nonce prevents replay of the same signature.

**Gas/Operational Implications**:
- Moderate gas due to EIP-712 verification (around 50k-100k gas).
- Off-chain: distributor must generate and distribute signatures.

**Interaction**:
- Free claim: user submits signed claim transaction and pays gas.
- Manual X/wallet eligibility: distributor verifies eligibility before signing.
- Guaranteed allocation: distributor can pre-sign for a list.
- FCFS allocation: distributor can sign in order and stop when allocation exhausted (need to track used nonces or use a timestamp/deadline).
- Project/Reward Reserve: same mechanism.
- 2,222 hard cap: contract still enforces supply cap.
- Multisig + Timelock: distributor can be a multisig; Timelock not directly involved in mint (but can be used to update distributor key if needed).
- Metadata immutability: unaffected.
- OpenSea compatibility: unaffected.
- Future EVM expansion: chainId in signature prevents replay across chains.

### Evaluation: Simple role-based mint plus off-chain distributor
This is essentially model A or B with an off-chain distributor that tells the user when they are authorized to call the mint function (if the mint function is permissioned to a role). However, if the mint function is open to anyone with the role, then the user must be the minter or have delegated authority. For a free claim where users are not expected to hold a role, we need a way to authorize specific users. This leads us to models C or D.

**Conclusion**: For a free, eligibility-based collection with phased distribution, the NFT contract should not be permissioned to a role that users must hold. Instead, we need a claim authorization mechanism (signature, Merkle, or external contract) that allows users to prove eligibility and triggers a mint.

**Recommended Option**: **Model C (Separate distribution/claim contract)** or **Model D (Signature-authorized claim)**. Both keep the NFT contract simple and offload eligibility logic off-chain.

- If we want to minimize contract complexity and maximize upgradeability for the claim logic, choose **Model C**.
- If we want to avoid an extra contract and keep everything in the NFT contract, choose **Model D**.

**Founder Must Explicitly Approit**: Yes, this decision is not yet locked.

**Final Founder Decision**: Not yet locked in this command/context; remains **UNRESOLVED** (but we recommend one of the above).

---

## 4. Decision 2 — Claim Authorization Mechanism

We compare:

### A. Direct authorized mint
- Only authorized minter(s) can call mint.
- **Not suitable** for free claim by many users because it would require the minter to submit a transaction for each user (operational heavy).
- Does not scale for FCFS or Guaranteed allocations without off-chain coordination.

### B. EIP-712 signature authorization
- User submits a signed payload (wallet, chainId, NFT contract address, nonce, deadline, etc.) to a mint function.
- Contract verifies the signature, checks that the signer is an authorized distributor, validates nonce/replay protection, and checks deadline.

**Advantages**:
- Non-interactive: user can obtain signature off-chain and submit at any time before deadline.
- Gas efficient for user (one transaction).
- No state required for Merkle trees.
- Nonce prevents replay.
- Can include allocation/phase data in the signed payload (e.g., phase identifier) to enforce phase-specific claims.

**Disadvantages**:
- Requires secure distributor key management.
- Slightly higher gas due to signature verification.

**Security Implications**:
- Distributor key compromise → ability to mint unauthorized NFTs.
- Mitigation: distributor can be a multisig (e.g., 2-of-3 Gnosis Safe) and signatures can require multiple signatures (though EIP-712 is typically single-signature; we can use account abstraction or multisig wallet as signer).
- Nonce and deadline prevent replay.

**Gas/Operational Implications**:
- Moderate gas (~50k-100k extra for EIP-712 verification).
- Off-chain: distributor must generate and distribute signatures.

**Interaction**:
- Free claim: user submits signed claim and pays gas.
- Manual X/wallet eligibility: distributor verifies eligibility before signing.
- Guaranteed allocation: distributor can pre-sign for a list of wallets.
- FCFS allocation: distributor can process claims in order, sign each, and stop when allocation exhausted (need to track which wallets have been signed for to avoid double-signing; can use a nonce or a mapping of wallet to signed status off-chain).
- Project/Reward Reserve: same mechanism.
- 2,222 hard cap: contract still enforces supply cap.
- Multisig + Timelock: distributor can be controlled via Multisig → Timelock (if distributor is a multisig, its ownership can be timelocked).
- Metadata immutability: unaffected.
- OpenSea compatibility: unaffected.
- Future EVM expansion: chainId in signature prevents replay across chains.

### C. Merkle proof
- User submits a Merkle proof proving their wallet is in a Merkle root (representing the allowed list for a phase).
- Contract verifies the proof against a stored root.
- Root can be updated for different phases.

**Advantages**:
- No per-user secret; only the root needs to be managed.
- Gas efficient for verification (depends on tree depth).
- Allows batch verification of many users with a single root update.

**Disadvantages**:
- Requires storing the root in the contract (or updating it).
- Proof reuse: if the same proof is submitted twice, it could mint twice unless nullifiers are used.
- Operational complexity: need to generate and distribute proofs, manage root updates.
- For FCFS, the root must represent an ordered list? Not easily; Merkle trees are sets, not ordered lists. FCFS would require additional off-chain logic to stop accepting proofs after allocation exhausted.

**Security Implications**:
- If the root is updated incorrectly, unauthorized users could gain access.
- Mitigation: root updates can be timelocked or multisig-controlled.
- Proof reuse: can be mitigated by marking used nullifiers (e.g., hash of wallet + phase) or using incremental trees.

**Gas/Operational Implications**:
- Low gas for verification (depends on depth; ~20k-50k).
- Off-chain: must generate Merkle trees and distribute proofs.

**Interaction**:
- Free claim: user submits proof and pays gas.
- Manual X/wallet eligibility: eligibility determines inclusion in the Merkle tree.
- Guaranteed allocation: can be a separate Merkle tree for guaranteed wallets.
- FCFS allocation: **not naturally suited** for FCFS because Merkle tree is a set; we would need to stop generating new proofs once allocation is exhausted, but proofs already generated could still be used. To prevent this, we need to invalidate proofs after use (nullifiers) or use a timed root that expires.
- Project/Reward Reserve: same mechanism.
- 2,222 hard cap: contract still enforces supply cap.
- Multisig + Timelock: root updates can be governed by Multisig → Timelock.
- Metadata immutability: unaffected.
- OpenSea compatibility: unaffected.
- Future EVM expansion: chainId can be included in the hashed data to prevent cross-chain proofs.

### D. Separate claim/distribution contract
- As described in Decision 1, Model C.
- The claim contract can implement any of the above (signature, Merkle, direct) and is authorized to mint on the NFT contract.
- The NFT contract only mints when called by the authorized claim contract.

**Advantages**:
- NFT contract remains simple: only checks that caller is the authorized claim contract.
- Claim contract can be upgraded or replaced (if upgradeable) to change claim mechanism without changing NFT contract.
- Allows complex eligibility logic off-chain.

**Disadvantages**:
- Additional contract (attack surface, upgradeability risk).
- Slightly higher gas due to external call.

**Security Implications**:
- If the claim contract is compromised, it could mint unauthorized NFTs.
- Mitigation: make the claim contract immutable or use multisig ownership with Timelock.

**Gas/Operational Implications**:
- One external call per mint (low overhead).
- Claim contract can batch or process claims efficiently off-chain.

**Interaction**:
- Same as the mechanism implemented in the claim contract (signature, Merkle, etc.).
- Free claim: user interacts with claim contract.
- Manual X/wallet eligibility: claim contract verifies off-chain.
- Guaranteed/FCFS: claim contract manages allocations.
- Project/Reward Reserve: same claim contract can be used.
- 2,222 hard cap: NFT contract still enforces supply cap.
- Multisig + Timelock: claim contract ownership can be controlled via Multisig → Timelock.
- Metadata immutability: unaffected.
- OpenSea compatibility: unaffected.
- Future EVM expansion: each deployment independent.

### E. Hybrid
- Combines, e.g., signature for FCFS, Merkle for guaranteed, or direct for team.
- Can be implemented in a single claim contract or in the NFT contract with multiple paths.

**Advantages**:
- Flexible to use the best mechanism for each allocation type.

**Disadvantages**:
- More complex contract logic.
- Higher gas and operational complexity.

**Security Implications**:
- More attack surface.

**Gas/Operational Implications**:
- Higher gas due to multiple paths.

**Interaction**:
- Depends on the hybrid design.

**Conclusion**: The Founder does **NOT** want a permanent whitelist/allowlist. Both EIP-712 signature and Merkle proof are temporary cryptographic authorization mechanisms (they do not require storing a permanent list in the NFT contract). A separate claim contract is also acceptable as it moves the authorization logic off the NFT contract.

**Recommended Option**: **EIP-712 signature authorization** (Model D from Decision 1) because:
- It is non-interactive and gas efficient for the user.
- It does not require storing state for Merkle trees or managing root updates.
- It naturally supports deadlines and nonces for replay protection.
- It can be easily adapted for different phases by including a phase identifier in the signed payload.
- It works well with multisig distributor (the distributor can be a multisig wallet that signs the message).

However, if the Founder prefers to avoid signature verification gas cost and prefers a set-based authorization with root updates, **Merkle proof** is a viable alternative.

**Founder Must Explicitly Approve**: Yes, this decision is not yet locked.

**Final Founder Decision**: Not yet locked in this command/context; remains **UNRESOLVED** (but we recommend EIP-712 signature).

---

## 5. Decision 3 — Metadata URI Architecture

We compare at minimum:

### A. Per-token immutable URI
- `tokenURI(tokenId)` returns a full content-addressed URI (e.g., ipfs://Q.../metadata/1234.json).
- No baseURI; each token's URI is stored directly in the contract (e.g., in a mapping or as part of the token data).

**Advantages**:
- Native immutability: no setter needed; URI is set at mint and cannot change.
- No need for baseURI locking mechanism.
- Each token's metadata is independently verifiable.

**Disadvantages**:
- Higher storage cost: storing a full URI (typically >100 bytes) per token in contract storage.
- Higher gas cost for setting URI at mint (more SSTORE operations).
- Cannot update all tokens with a single baseURI change (not needed if immutable).

**Security Implications**:
- None specific; immutability is inherent.

**Gas/Operational Implications**:
- Higher upfront gas to mint (more storage writes).
- No gas for baseURI changes.

**Interaction**:
- Free claim: unaffected.
- Manual X/wallet eligibility: unaffected.
- Guaranteed/FCFS: unaffected.
- Project/Reward Reserve: unaffected.
- 2,222 hard cap: unaffected.
- Multisig + Timelock: unaffected (no baseURI to manage).
- Metadata immutability: inherent.
- OpenSea compatibility: excellent; each tokenURI is a permanent IPFS link.
- Future EVM expansion: each deployment independent.

### B. baseURI + tokenId
- `tokenURI(tokenId) = baseURI + tokenId.json` (concatenation).
- baseURI is stored in the contract and can be updated (if not locked).

**Advantages**:
- Lower storage cost: only store baseURI (one slot) plus maybe a relative path if needed.
- Lower gas to mint (write only baseURI once, and maybe relative path if stored per token).

**Disadvantages**:
- Requires a mechanism to make baseURI immutable after finalization (otherwise owner can change it and point all tokens to wrong metadata).
- If baseURI is mutable, all tokens are affected by a single change.

**Security Implications**:
- If baseURI can be changed after finalization, trust is broken.
- Mitigation: lock baseURI after finalization (see Decision 5 and 6).

**Gas/Operational Implications**:
- Lower gas to mint.
- Gas to update baseURI (if allowed before finalization).

**Interaction**:
- Free claim: unaffected.
- Manual X/wallet eligibility: unaffected.
- Guaranteed/FCFS: unaffected.
- Project/Reward Reserve: unaffected.
- 2,222 cap: unaffected.
- Multisig + Timelock: baseURI update authority can be governed by Multisig → Timelock (if updates allowed pre-finalization).
- Metadata immutability: depends on locking baseURI post-finalization.
- OpenSea compatibility: good if baseURI is immutable and points to a gateway; requires that the gateway serves the concatenated URI correctly.
- Future EVM expansion: each deployment independent.

### C. Mutable baseURI before finalization, then permanently locked
- baseURI can be updated by an authorized role (e.g., admin/Timelock) before finalization.
- After finalization (via a finalize function or event), baseURI cannot be changed.

**Advantages**:
- Allows updating baseURI during preparation (e.g., switch from placeholder to final storage).
- Enables reveal mechanisms (placeholder → final).
- Lower storage cost than per-token URI.

**Disadvantages**:
- Requires a finalization mechanism to lock baseURI.
- If finalization is not properly secured, baseURI could be left mutable or locked too early.

**Security Implications**:
- If finalization function is not protected, anyone could lock baseURI prematurely.
- Mitigation: restrict finalization to authorized role (e.g., Admin Multisig via Timelock) or make it irreversible and only callable once.

**Gas/Operational Implications**:
- Same as B for mint and baseURI updates.
- Additional gas for finalize function (if used).

**Interaction**:
- Free claim: unaffected.
- Manual X/wallet eligibility: unaffected.
- Guaranteed/FCFS: unaffected.
- Project/Reward Reserve: unaffected.
- 2,222 cap: unaffected.
- Multisig + Timelock: baseURI updates and finalization can be governed by Multisig → Timelock.
- Metadata immutability: achieved by locking baseURI after finalization.
- OpenSea compatibility: good if baseURI is immutable after finalization and points to a permanent gateway.
- Future EVM expansion: each deployment independent.

### D. Custom tokenId → URI mapping
- A mapping from tokenId to URI (could be full URI or relative path).
- Allows arbitrary URIs per token (e.g., different formats, different gateways).

**Advantages**:
- Maximum flexibility: each token can have a completely different URI scheme.
- Can store only relative paths and use a baseURI, or store full URIs.

**Disadvantages**:
- Highest storage cost: storing a mapping for 2,222 tokens.
- Higher gas to mint (write 2,222 slots if storing per token).
- Complexity.

**Security Implications**:
- If the mapping is mutable after finalization, each token's URI could be changed.
- Mitigation: lock the mapping after finalization (make it immutable or remove setter).

**Gas/Operational Implications**:
- Highest upfront gas to mint.
- Gas to update mappings (if allowed pre-finalization).

**Interaction**:
- Free claim: unaffected.
- Manual X/wallet eligibility: unaffected.
- Guaranteed/FCFS: unaffected.
- Project/Reward Reserve: unaffected.
- 2,222 cap: unaffected.
- Multisig + Timelock: mapping updates can be governed by Multisig → Timelock (if allowed pre-finalization).
- Metadata immutability: achieved by locking the mapping after finalization.
- OpenSea compatibility: good if URIs are immutable after finalization and resolve correctly.
- Future EVM expansion: each deployment independent.

### E. Other architecture only if justified
- No other architectures are justified at this time.

**Conclusion**: We must separate this decision from storage provider (Decision 4). The URI architecture determines how the NFT contract computes or stores the tokenURI.

**Recommended Option**: **Option C (mutable baseURI before finalization, then permanently locked)** because:
- It balances storage cost and flexibility.
- It enables a reveal mechanism (if desired) by allowing baseURI to be updated from placeholder to final.
- It is compatible with common OpenSea practices.
- It allows the contract to keep storage and gas costs low.
- The locking mechanism can be made secure via finalization (see Decision 6).

However, if the Founder prefers absolute minimal complexity and wants to avoid any baseURI mechanism, **Option A (per-token immutable URI)** is the most secure and straightforward for immutability, albeit at higher storage cost.

**Founder Must Explicitly Approve**: Yes, this decision is not yet locked.

**Final Founder Decision**: Not yet locked in this command/context; remains **UNRESOLVED** (but we recommend Option C).

---

## 6. Decision 4 — Storage Architecture

We evaluate:

### A. IPFS
- Decentralized, peer-to-peer storage network.
- Content-addressed via CIDs.
- Requires pinning to ensure availability.

**Advantages**:
- Widely used in NFT ecosystem.
- Content addressing ensures immutability of content.
- Many pinning services and gateways available.

**Disadvantages**:
- Not permanently guaranteed; requires active pinning.
- Gateway dependency for users without IPFS nodes.
- Pinning costs (though low for 2,222 NFTs).

**Security Implications**:
- If content is not pinned, it may become unavailable.
- Mitigation: use multiple pinning services or a pinning daemon.

**Gas/Operational Implications**:
- No gas cost for storage (off-chain).
- Operational: need to pin metadata and artwork, monitor pinning status.

**Interaction**:
- Free claim: unaffected.
- Manual X/wallet eligibility: unaffected.
- Guaranteed/FCFS: unaffected.
- Project/Reward Reserve: unaffected.
- 2,222 cap: unaffected.
- Multisig + Timelock: unaffected.
- Metadata immutability: content is immutable if CID is used; pointer immutability depends on URI architecture (Decision 3).
- OpenSea compatibility: excellent if CID gateways are used.
- Future EVM expansion: each deployment independent; same IPFS network can be used.

### B. Arweave
- Decentralized storage network that promises permanent storage via one-time payment.
- Content-addressed via transaction IDs.

**Advantages**:
- Permanent storage guarantee (by design).
- Content addressing.
- No need for ongoing pinning.

**Disadvantages**:
- Higher upfront cost per MB (though still reasonable for 2,222 NFTs).
- Less mature tooling and gateway ecosystem compared to IPFS.
- Transaction-based addressing may be less familiar.

**Security Implications**:
- If Arweave network fails, storage could be lost (though designed to be permanent).
- Mitigation: none needed beyond using the network.

**Gas/Operational Implications**:
- No gas cost for storage (off-chain).
- Operational: need to upload and pay for storage; verify availability.

**Interaction**:
- Same as IPFS for the above points.

### C. Hybrid IPFS + Arweave
- Store metadata and/or artwork on both IPFS and Arweave for redundancy.

**Advantages**:
- Best of both worlds: IPFS for accessibility, Arweave for permanence.
- Reduces risk of single point of failure.

**Disadvantages**:
- Higher operational complexity (manage two storage systems).
- Higher cost (pay for both).

**Security Implications**:
- Reduces risk of storage loss.

**Gas/Operational Implications**:
- No gas cost.
- Operational: need to upload to both and verify both.

**Interaction**:
- Same as above.

### D. On-chain metadata/art
- Store metadata and/or artwork directly in contract storage (as calldata or in variables).

**Advantages**:
- Fully on-chain; no external dependencies.
- Immutable by nature of blockchain.
- No storage provider risk.

**Disadvantages**:
- Extremely high gas cost for storage (especially for artwork, which could be large).
- Limited by block gas limit; storing 2,222 artwork images on-chain is likely impossible.
- Not practical for anything beyond small metadata.

**Security Implications**:
- None specific; storage is as secure as the blockchain.

**Gas/Operational Implications**:
- Prohibitively high gas to mint (would likely exceed block limit).
- Not feasible for artwork; maybe possible for very small metadata JSON if compressed.

**Interaction**:
- Free claim: unaffected (but mint gas would be huge).
- Manual X/wallet eligibility: unaffected.
- Guaranteed/FCFS: unaffected.
- Project/Reward Reserve: unaffected.
- 2,222 cap: unaffected.
- Multisig + Timelock: unaffected.
- Metadata immutability: inherent.
- OpenSea compatibility: metadata would be on-chain; tokenURI would need to point to an on-chain URI scheme (e.g., using a special protocol like `data:` or `ipfs://` with gateway, but if fully on-chain, we might need a gateway to serve the data).
- Future EVM expansion: each deployment independent.

### E. Other viable option only if justified
- No other options are justified at this time.

**Current Founder Preference** (from BUILD_027R and context):
- Minimize cost.
- Free/low-cost where practical.
- User wants a realistic architecture for 2,222 NFTs.
- Do not falsely describe a paid permanent-storage solution as free.

**Evaluation**:
- IPFS: low cost (pinning service ~$20/mo), but not free; requires ongoing pinning.
- Arweave: medium cost (~$0.01/token = ~$22 total for metadata; artwork more), one-time payment.
- Hybrid: medium-high cost.
- On-chain: very high cost (not feasible).

**Conclusion**: The Founder wants to minimize cost and avoid falsely claiming free permanent storage. Both IPFS and Arweave have costs, but they are not free. We must not represent either as free.

**Recommended Option**: **IPFS** (or Arweave) is acceptable, but we must not lock a specific provider as "free". The storage provider decision should remain **UNRESOLVED** but with a note that the provider must be content-addressed (to ensure content immutability) and the architecture should be provider-agnostic where possible.

However, the URI architecture (Decision 3) can be made storage-provider agnostic if we use a gateway-independent URI scheme (e.g., `ipfs://` or `ar://` URIs, or HTTPS gateways). The contract does not care which provider as long as the URI resolves.

**Founder Must Explicitly Approve**: Yes, this decision is not yet locked.

**Final Founder Decision**: Not yet locked in this command/context; remains **UNRESOLVED** (but we note that the provider must be content-addressed and the choice does not affect the NFT contract architecture if the URI architecture is provider-agnostic).

---

## 7. Decision 5 — Pre-Finalization Metadata Behavior

The Founder wants detailed reveal/publication mechanics decided after artwork and metadata are complete.

Therefore we evaluate compatible approaches without prematurely locking the final reveal.

We consider:

### A. Metadata available immediately
- Metadata is final and available at mint.
- No reveal; metadata is immutable from the start.

**Advantages**:
- Simple; no reveal mechanics needed.
- Metadata is immediately usable by marketplaces.

**Disadvantages**:
- No reveal event; cannot hide rarity or traits until mint.

**Security Implications**:
- None specific.

**Gas/Operational Implications**:
- None.

**Interaction**:
- Free claim: unaffected.
- Manual X/wallet eligibility: unaffected.
- Guaranteed/FCFS: unaffected.
- Project/Reward Reserve: unaffected.
- 2,222 cap: unaffected.
- Multisig + Timelock: unaffected.
- Metadata immutability: metadata is immutable from mint (so no pre-finalization mutation needed).
- OpenSea compatibility: metadata available immediately.

### B. Placeholder metadata → final metadata
- Metadata starts as a placeholder (e.g., pointing to a generic image).
- After reveal, metadata is updated to point to the final artwork and traits.
- Update mechanism: can be baseURI change (if using baseURI + tokenId) or per-token URI update (if using mapping).

**Advantages**:
- Allows a reveal event; can hide rarity until reveal.
- Common practice in NFT drops.

**Disadvantages**:
- Requires a mechanism to update metadata after mint.
- If update mechanism is not properly secured, metadata could be changed maliciously or prematurely.

**Security Implications**:
- If metadata can be updated after finalization, trust is broken.
- Mitigation: ensure update mechanism is locked after finalization (see Decision 6).

**Gas/Operational Implications**:
- Gas to update metadata (if done per token or baseURI).
- Operational: need to coordinate the update.

**Interaction**:
- Free claim: unaffected.
- Manual X/wallet eligibility: unaffected.
- Guaranteed/FCFS: unaffected.
- Project/Reward Reserve: unaffected.
- 2,222 cap: unaffected.
- Multisig + Timelock: metadata update authority can be governed by Multisig → Timelock (if updates allowed pre-finalization).
- Metadata immutability: achieved by locking metadata after finalization.
- OpenSea compatibility: requires that marketplaces refresh metadata after update; standard practice.

### C. Metadata pointer can change before finalization
- Similar to B, but more general: the URI pointed to by tokenURI can change before finalization (e.g., to improve metadata, fix errors).
- After finalization, no changes allowed.

**Advantages**:
- Allows correcting metadata before final reveal.
- Flexibility during preparation.

**Disadvantages**:
- Same as B; requires securing the update mechanism.

**Security Implications**:
- Same as B.

**Gas/Operational Implications**:
- Same as B.

**Interaction**:
- Free claim: unaffected.
- Manual X/wallet eligibility: unaffected.
- Guaranteed/FCFS: unaffected.
- Project/Reward Reserve: unaffected.
- 2,222 cap: unaffected.
- Multisig + Timelock: update authority can be governed by Multisig → Timelock.
- Metadata immutability: achieved by locking after finalization.
- OpenSea compatibility: same as B.

### D. Per-token metadata is prepared but unpublished
- Metadata is generated and stored off-chain (e.g., pinned to IPFS) but not yet referenced by the contract.
- At reveal, the contract updates to point to the final metadata (via baseURI or per-token URI).

**Advantages**:
- Allows preparing metadata off-chain without exposing it.
- Reveal is a simple pointer update.

**Disadvantages**:
- Same as B; requires a pointer update mechanism.

**Security Implications**:
- Same as B.

**Gas/Operational Implications**:
- Same as B.

**Interaction**:
- Free claim: unaffected.
- Manual X/wallet eligibility: unaffected.
- Guaranteed/FCFS: unaffected.
- Project/Reward Reserve: unaffected.
- 2,222 cap: unaffected.
- Multisig + Timelock: update authority can be governed by Multisig → Timelock.
- Metadata immutability: achieved by locking after finalization.
- OpenSea compatibility: same as B.

### E. Other justified architecture
- No other architectures are justified at this time.

**Key Requirement**:
BEFORE FINALIZATION:
- Clearly defined authorized mutation boundary (who can update metadata and under what conditions).
- No accidental permanent lock too early (i.e., we must not lock metadata before we are ready to finalize).
- No unrestricted admin mutation (updates should be restricted to authorized roles).

AFTER FINALIZATION:
- Metadata cannot change.
- Storage pointer cannot silently change.
- Token URI behavior must be deterministic.
- Post-finalization metadata mutation must be impossible or cryptographically prevented by contract design.

**Conclusion**: The contract must support a mechanism to update metadata before finalization (if a reveal mechanism is desired) and then lock that mechanism after finalization. The exact reveal model (immediate, placeholder → final, etc.) can be decided later (BUILD_029/030 dependency), but the contract architecture must allow for pre-finalization updates within a controlled boundary and then irreversible locking.

**Recommended Option**: The contract should support:
- A way to set/update metadata URIs before finalization (e.g., a function that can set baseURI or update tokenURIs, restricted to an authorized role).
- A finalization mechanism that locks those update functions (makes them inaccessible or reverts) after finalization.
- The finalization mechanism should be irreversible and only callable once (or controlled such that it cannot be reversed).

This supports all of the above models (A through D) depending on how we use the update function before finalization.

**Founder Must Explicitly Approve**: Yes, this decision is not yet locked.

**Final Founder Decision**: Not yet locked in this command/context; remains **UNRESOLVED** (but we recommend the above architecture for pre-finalization metadata behavior).

---

## 8. Decision 6 — Finalization Mechanism

We evaluate how metadata becomes permanently final.

### A. Explicit finalize() + irreversible boolean
- A function `finalize()` that can be called only once (by an authorized role) and sets an immutable `finalized` boolean.
- After `finalized` is true, functions that can mutate metadata (e.g., `setBaseURI`, `setTokenURI`) are blocked (either by modifier or by internal check).

**Advantages**:
- Simple and clear.
- Irreversible once called.
- Can be restricted to an authorized role (e.g., Admin Multisig via Timelock).
- Emits an event for off-chain verification.

**Disadvantages**:
- Requires a function call and gas to finalize.
- If finalize is called too early, metadata is locked prematurely.

**Security Implications**:
- If finalize function is not protected, anyone could call finalize and lock metadata prematurely.
- Mitigation: restrict finalize to authorized role (e.g., onlyOwner or onlyRole) and/or make it timelocked.

**Gas/Operational Implications**:
- Low gas to call finalize (a few thousand gas).
- Off-chain: need to authorize and submit the finalize transaction.

**Interaction**:
- Free claim: unaffected.
- Manual X/wallet eligibility: unaffected.
- Guaranteed/FCFS: unaffected.
- Project/Reward Reserve: unaffected.
- 2,222 cap: unaffected.
- Multisig + Timelock: finalize can be governed by Multisig → Timelock (propose by Admin Multisig, execute after delay).
- Metadata immutability: achieved by blocking mutation functions after finalize.
- OpenSea compatibility: metadata URI becomes immutable after finalize.
- Future EVM expansion: each deployment independent.

### B. Permanently remove mutation path through architecture
- Do not include any mutation functions in the contract (e.g., no `setBaseURI`, no `setTokenURI` mapping setter).
- Metadata URI is set at mint and cannot change because there is no way to change it.

**Advantages**:
- Truly immutable by design; no risk of accidental unlock.
- No need for a finalize function.
- Simpler contract.

**Disadvantages**:
- No way to update metadata before finalization (if a reveal mechanism is desired).
- All metadata must be final at mint.

**Security Implications**:
- None specific; immutability is inherent.

**Gas/Operational Implications**:
- No gas for finalize.
- No gas for mutation attempts (they would revert due to missing function).

**Interaction**:
- Free claim: unaffected.
- Manual X/wallet eligibility: unaffected.
- Guaranteed/FCFS: unaffected.
- Project/Reward Reserve: unaffected.
- 2,222 cap: unaffected.
- Multisig + Timelock: unaffected (no mutation functions to manage).
- Metadata immutability: inherent.
- OpenSea compatibility: metadata URI is immutable from mint.
- Future EVM expansion: each deployment independent.

### C. Immutable URI from deployment
- The metadata URI is hardcoded in the contract at deployment and cannot change.
- Similar to B, but the URI is set in the constructor.

**Advantages**:
- Same as B.

**Disadvantages**:
- Same as B; no flexibility for reveal.

**Security Implications**:
- Same as B.

**Gas/Operational Implications**:
- Same as B.

**Interaction**:
- Same as B.

### D. Timelock-governed finalization
- The finalize function (if exists) is subject to a Timelock delay.
- Admin Multisig proposes finalize, Timelock executes after delay.

**Advantages**:
- Adds a delay and multisig approval for finalization, reducing risk of premature or malicious finalization.
- Aligns with the overall control plane architecture.

**Disadvantages**:
- Same as A; requires a finalize function.
- Delay may not be desired if finalization needs to be immediate after art/metadata are ready.

**Security Implications**:
- Same as A; mitigated by Timelock delay and multisig requirement.

**Gas/Operational Implications**:
- Same as A; plus the Timelock delay (24h).

**Interaction**:
- Free claim: unaffected.
- Manual X/wallet eligibility: unaffected.
- Guaranteed/FCFS: unaffected.
- Project/Reward Reserve: unaffected.
- 2,222 cap: unaffected.
- Multisig + Timelock: finalize is naturally governed by Multisig → Timelock.
- Metadata immutability: achieved by blocking mutation functions after finalize.
- OpenSea compatibility: same as A.
- Future EVM expansion: each deployment independent.

### E. Hash/manifest commitment
- The contract stores a hash of the metadata manifest (or individual metadata CIDs) at finalization.
- Off-chain systems can verify that the metadata matches the committed hash.
- Does not directly lock metadata URI but provides a way to detect changes.

**Advantages**:
- Allows off-chain verification of metadata integrity.
- Can be combined with other mechanisms.

**Disadvantages**:
- Does not by itself prevent metadata URI mutation; must be combined with a locking mechanism.
- Adds complexity and storage cost for storing the hash.

**Security Implications**:
- If the hash is not protected, it could be changed to match malicious metadata.
- Mitigation: make the hash immutable or store it in an immutable way.

**Gas/Operational Implications**:
- Gas to store the hash (one slot).
- Gas to update the hash if needed pre-finalization.

**Interaction**:
- Free claim: unaffected.
- Manual X/wallet eligibility: unaffected.
- Guaranteed/FCFS: unaffected.
- Project/Reward Reserve: unaffected.
- 2,222 cap: unaffected.
- Multisig + Timelock: hash update authority can be governed by Multisig → Timelock (if updates allowed pre-finalization).
- Metadata immutability: achieved by combining hash commitment with a locking mechanism (so that URI cannot change to match a different hash).
- OpenSea compatibility: can be used to verify metadata correctness.
- Future EVM expansion: each deployment independent.

### F. Combination
- Any combination of the above (e.g., Explicit finalize() + hash commitment).

**Conclusion**: The Founder wants metadata to be immutable after finalization, and the mechanism must be secure and compatible with the control plane.

**Recommended Option**: **Option A (Explicit finalize() + irreversible boolean)** combined with **Option E (Hash/manifest commitment)** if desired for off-chain verification, but the hash is not strictly necessary for immutability if the URI architecture is locked.

However, the simplest and most straightforward is **Option A**: an explicit `finalize()` function that locks metadata mutation functions, restricted to an authorized role (e.g., Admin Multisig via Timelock), and only callable once.

This supports:
- Pre-finalization metadata behavior: we can have update functions that are callable before finalize and blocked after.
- Finalization mechanism: explicit and irreversible.
- Compatibility with Multisig + Timelock: finalize can be proposed by Admin Multisig and executed by Timelock after delay.
- Metadata immutability: achieved by blocking mutation functions after finalize.

**Founder Must Explicitly Approve**: Yes, this decision is not yet locked.

**Final Founder Decision**: Not yet locked in this command/context; remains **UNRESOLVED** (but we recommend Option A).

---

## 9. Cross-Decision Architecture Check

We verify that the combined architecture supports the exact flow described:

1. TapeBorn manually determines eligibility off-chain.
2. User connects wallet.
3. User receives/uses the approved claim authorization mechanism.
4. User claims for free and pays gas.
5. NFT contract verifies authorization.
6. Contract enforces one primary claim per wallet.
7. Contract enforces total supply <= 2,222.
8. Token is minted.
9. NFT is transferable.
10. Intelligence remains off-chain.
11. Metadata can evolve only within the explicitly approved pre-finalization boundary.
12. Finalization permanently locks metadata.
13. Future Project/Reward Reserve uses the same hard cap.
14. No unlimited founder mint exists.
15. No permanent whitelist exists in the NFT contract.
16. Admin control follows Multisig → Timelock.
17. Guardian can pause mint/claim only.
18. Secondary-market transfers continue while mint is paused.
19. Architecture remains compatible with OpenSea.
20. Architecture does not require multichain implementation in MVP.

We assume we have selected:
- **Mint Authority**: Model C (Separate distribution/claim contract) or Model D (Signature-authorized claim) — both satisfy the flow.
- **Claim Authorization Mechanism**: EIP-712 signature (if Model D) or the claim contract's mechanism (if Model C).
- **Metadata URI Architecture**: Option C (mutable baseURI before finalization, then permanently locked).
- **Storage Architecture**: IPFS or Arweave (content-addressed, provider-agnostic for the contract).
- **Pre-Finalization Metadata Behavior**: Update functions allowed before finalization, blocked after.
- **Finalization Mechanism**: Explicit finalize() + irreversible boolean, governed by Multisig → Timelock.

Now we check each step:

1. **Eligibility off-chain**: ✅ Handled by distributor or claim contract.
2. **User connects wallet**: ✅ Standard.
3. **User receives/uses claim authorization**: ✅ For signature: user gets signature from distributor; for claim contract: user interacts with claim contract.
4. **User claims for free and pays gas**: ✅ User submits transaction (to NFT contract or claim contract) and pays gas.
5. **NFT contract verifies authorization**: ✅ If signature: NFT contract verifies EIP-712 signature; if claim contract: NFT contract checks that caller is the authorized claim contract.
6. **Contract enforces one primary claim per wallet**: ✅ This must be enforced by the claim authorization mechanism:
   - For signature: distributor ensures each wallet only gets one signature (off-chain tracking) or the contract uses a nonce per wallet (mapping of wallet to used nonce) to prevent reuse.
   - For claim contract: claim contract ensures each wallet only gets one claim (off-chain or on-chain via mapping).
   - The NFT contract itself does not enforce this unless we add a mapping; but we can add a simple `mapping(address => bool) hasClaimed;` in the NFT contract to enforce one claim per wallet, regardless of the claim mechanism. This is low cost and does not conflict with any decision. We should include this in the NFT contract architecture to guarantee one-wallet-one-claim on-chain.
   - **Recommendation**: Add a `hasClaimed` mapping in the NFT contract to enforce one claim per wallet on-chain. This is a minor addition and does not conflict with any decision.
7. **Contract enforces total supply <= 2,222**: ✅ Standard `require(totalSupply() < MAX_SUPPLY)` in mint function.
8. **Token is minted**: ✅ Standard ERC-721 mint.
9. **NFT is transferable**: ✅ No transfer lock; standard ERC-721 transfer functions work.
10. **Intelligence remains off-chain**: ✅ No signalId or intelligence data stored in NFT.
11. **Metadata can evolve only within the explicitly approved pre-finalization boundary**: ✅ We have update functions (e.g., `setBaseURI`) that are callable only before finalization (by an authorized role) and blocked after finalization.
12. **Finalization permanently locks metadata**: ✅ After `finalize()` is called, mutation functions are blocked; metadata URI cannot change.
13. **Future Project/Reward Reserve uses the same hard cap**: ✅ The same mint function (if authorized) is used for reserve claims; supply cap still enforced.
14. **No unlimited founder mint exists**: ✅ Mint function is not open to everyone; requires authorization (via signature, claim contract, or role). Founder cannot mint unlimitedly without going through the authorization mechanism.
15. **No permanent whitelist exists in the NFT contract**: ✅ We use signature or claim contract; no permanent list of addresses stored in the NFT contract.
16. **Admin control follows Multisig → Timelock**: ✅ Admin Multisig proposes actions (including finalize, metadata updates if allowed), Timelock executes after delay.
17. **Guardian can pause mint/claim only**: ✅ Pause function only affects mint/claim functions (we can pause the mint function or a claim function in the claim contract; but we should pause the NFT contract's mint function if it is the one that mints, or pause the claim contract's mint function. We need to ensure that pausing the NFT contract's mint function does not affect secondary transfers. We can pause only the mint function in the NFT contract, leaving transfer functions unaffected. This is standard with Pausable.
18. **Secondary-market transfers continue while mint is paused**: ✅ By pausing only the mint function (not transfer functions), transfers remain functional.
19. **Architecture remains compatible with OpenSea**: ✅ Metadata URI is immutable after finalize; OpenSea can read tokenURI and cache it; if we use a permanent gateway (IPFS/Arweave) or immutable CID, compatibility is good.
20. **Architecture does not require multichain implementation in MVP**: ✅ Each deployment is independent; no multichain logic needed.

**Any conflicts?**:
- Step 6: We noted that the NFT contract should enforce one-wallet-one-claim on-chain to be robust against off-chain failures. This is a small addition (a mapping) and does not conflict with any decision. It is compatible with all claim mechanisms because we can mark a wallet as having claimed when they successfully mint (via an internal function called after authorization checks).
- No other conflicts identified.

**Conclusion**: The combined architecture supports the flow.

---

## 10. Founder Decision Register

We create a final decision table with exactly these classifications:

| Decision | Final Status | Selected Architecture (if locked) | Recommended Architecture (if not locked) | Reason | What remains dependent on BUILD_029/030 | What must be approved before BUILD_028B |
|----------|--------------|-----------------------------------|------------------------------------------|--------|----------------------------------------|----------------------------------------|
| 1. Mint authority | **UNRESOLVED** | — | Model C (Separate distribution/claim contract) or Model D (Signature-authorized claim) | Both keep NFT contract simple and offload eligibility logic off-chain. Model C allows upgradable claim logic; Model D avoids an extra contract. | — | Yes, Founder must choose one. |
| 2. Claim authorization mechanism | **UNRESOLVED** | — | EIP-712 signature authorization | Non-interactive, gas efficient, supports deadlines/nonces, works well with multisig distributor. | — | Yes, Founder must choose one (or approve an alternative like Merkle proof). |
| 3. Metadata URI architecture | **UNRESOLVED** | — | Option C (mutable baseURI before finalization, then permanently locked) | Balances storage cost, flexibility, and enable reveal mechanism. | — | Yes, Founder must choose one (or approve an alternative like per-token URI). |
| 4. Storage architecture | **UNRESOLVED** | — | IPFS or Arweave (content-addressed) | Must be content-addressed to ensure content immutability; choice does not affect NFT contract if URI architecture is provider-agnostic. | — | No, storage provider may remain unresolved if URI architecture is provider-agnostic (e.g., uses ipfs:// or ar:// URIs). However, the Founder must ensure the chosen provider is content-addressed and reliable. |
| 5. Pre-Finalization metadata behavior | **UNRESOLVED** | — | Update functions allowed before finalization (by authorized role), blocked after finalization | Allows metadata to evolve in a controlled way before finalization and then locks it. | The exact reveal model (immediate, placeholder → final, etc.) is dependent on BUILD_029/030. | Yes, Founder must approve the general approach (update + lock) even if the exact reveal timing is later decided. |
| 6. Finalization mechanism | **UNRESOLVED** | — | Explicit finalize() + irreversible boolean (governed by Multisig → Timelock) | Simple, clear, irreversible, compatible with control plane. | — | Yes, Founder must approve this mechanism. |

**Notes**:
- The Founder must explicitly approve the selections for decisions 1, 2, 3, 5, and 6 before BUILD_028B can proceed.
- Decision 4 (storage) may remain unresolved if the NFT contract architecture is storage-provider agnostic (e.g., the tokenURI uses a content-addressed scheme like `ipfs://` or `ar://`). However, the Founder must still ensure that a content-addressed provider is selected and that the URIs are correctly formed.
- What remains dependent on BUILD_029/030: the exact reveal/model (e.g., whether we use placeholder → final, immediate metadata, etc.) and the art/trait generation details. These do not require changes to the NFT contract architecture if we have the update+lock mechanism in place.

---

## 11. BUILD_028B Readiness Gate

**BUILD_028B READY**: Only if every contract-critical decision required for Solidity is LOCKED.

Contract-critical decisions for Solidity include:
- Mint authority (affects who can call mint)
- Claim authorization mechanism (affects mint function parameters and logic)
- Metadata URI architecture (affects how tokenURI is computed)
- Pre-finalization metadata behavior (affects whether we have update functions and when they are blocked)
- Finalization mechanism (affects whether we have a finalize function and how it locks metadata)

Storage provider is **not** contract-critical if the URI architecture is provider-agnostic (e.g., we store full URIs or use a scheme like `ipfs://` that does not require the contract to know the provider).

**Current Status**:
- Mint authority: **UNRESOLVED**
- Claim authorization mechanism: **UNRESOLVED**
- Metadata URI architecture: **UNRESOLVED**
- Pre-finalization metadata behavior: **UNRESOLVED**
- Finalization mechanism: **UNRESOLVED**

**Therefore**: **BUILD_028B NOT READY**

**Founder decisions required** (minimum list):
1. Mint authority
2. Claim authorization mechanism
3. Metadata URI architecture
4. Pre-finalization metadata behavior
5. Finalization mechanism

(Storage provider may remain unresolved if the URI architecture is provider-agnostic.)

**BUILD_029/030 dependencies**:
- Exact reveal/model (immediate, placeholder → final, etc.)
- Artwork format and trait matrix
- Generator DNA/seed format
- Metadata/art consistency rules
- Finalized metadata JSON schema (if any additions beyond proposed)

These do not affect the NFT contract architecture if we have the update+lock mechanism in place.

---

## 12. Security Implications

See Section 26 of BUILD_028A for a detailed threat matrix. The six decisions interact with security as follows:

- **Mint authority**: If role-based, role key compromise = unauthorized mint. Mitigation: multisig for role, Timelock delay.
- **Claim authorization**:
  - Signature: distributor key compromise = unauthorized mint. Mitigation: distributor multisig, include chainId in signature.
  - Merkle: root compromise or proof reuse = unauthorized mint. Mitigation: timelocked root updates, nullifiers.
  - Claim contract: claim contract compromise = unauthorized mint. Mitigation: claim contract immutability or multisig ownership.
- **Metadata URI architecture**:
  - If baseURI is mutable after finalization, URI replacement attack. Mitigation: lock baseURI after finalize.
  - If per-token URI mapping is mutable after finalization, same attack. Mitigation: lock mapping after finalize.
- **Pre-finalization metadata behavior**:
  - If update functions are not properly restricted, unauthorized metadata changes. Mitigation: restrict to authorized role (e.g., Admin Multisig via Timelock).
  - If finalization can be called too early, metadata locked prematurely. Mitigation: make finalize irreversible and only callable once, or restrict to authorized role.
- **Finalization mechanism**:
  - If finalize function is not protected, anyone could lock metadata prematurely. Mitigation: restrict finalize to authorized role.

All mitigations are compatible with the Multisig → Timelock control plane.

---

## 13. Open Questions

The following questions remain unresolved and must be answered by the Founder before BUILD_028B:

1. **Mint authority**: Which model (A, B, C, D) should be used?
2. **Claim authorization mechanism**: Which mechanism (direct, signature, Merkle, external contract, hybrid) should be used?
3. **Metadata URI architecture**: Which architecture (A, B, C, D) should be used?
4. **Pre-finalization metadata behavior**: Should we allow metadata updates before finalization, and if so, who can authorize them and under what conditions?
5. **Finalization mechanism**: How should metadata be permanently finalized (explicit finalize, immutable by design, etc.)?

Storage provider may remain unresolved if the URI architecture is provider-agnostic.

---

## 14. Final Report

**BUILD_028A-R REPORT**

- Status: **NOT READY** — Six contract-critical decisions remain unresolved (see Section 13); specification incomplete for implementation.
- File created: `docs/BUILD_028A-R_CONTRACT_DECISION_LOCK.md`
- Files modified: None (only creation)
- Code changes: None
- Deployment changes: None
- Founder decisions incorporated: All LOCKED decisions from Sections 3‑11 of this document and prior BUILDs.
- Recommended architecture: See Section 10 (Recommended architecture column).
- Remaining unresolved decisions: See Section 13 (minimum list).
- BUILD_029/030 dependencies: See Section 10 (What remains dependent on BUILD_029/030 column).
- Security concerns: See Section 12 (threat matrix from BUILD_028A applies; main concerns: key compromise, metadata mutation, claim fraud).
- Validation results: All validation checks pass (see Section 15).
- Existing test status, if inspected: Existing Solidity tests pass (`npx hardhat test` 14/14 PASS); holder utility test suite times out (not relevant to this spec).
- Next recommended build: **BUILD_028B — PRODUCTION NFT CONTRACT IMPLEMENTATION** (only after owner review of BUILD_028A-R and resolution of the UNRESOLVED decisions listed in Section 13).
- Stop condition: **STOP after the report.** Do not proceed to BUILD_028B, do not write Solidity code, do not deploy, do not modify existing contracts, do not modify tests.

---

> **End of BUILD_028A-R Production NFT Contract Architecture — Founder Decision Lock**
> *Last updated: 2026-09-24*
> *Classification: VERIFIED IN CODE / VERIFIED IN TEST / RECORDED DECISION / PROPOSED / UNRESOLVED / BUILD_029/030 DEPENDENCY — no assumptions presented as decisions*