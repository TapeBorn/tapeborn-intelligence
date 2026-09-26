# TAPEBORN BUILD_028A-EIP712-R5
## PRODUCTION NFT EIP-712 PRIMARY CLAIM ARCHITECTURE — FOUNDER DECISION LOCK (FINAL TARGETED REPAIR)

**Status**: DECISION LOCK — Documentation-only build. No code changes. No deployment. No implementation.

**Purpose**: Repair ONLY the remaining structural defects in BUILD_028A-EIP712-R4.

**Based on**: BUILD_024R, BUILD_025, BUILD_026, BUILD_027R, BUILD_028A, BUILD_028A-R, BUILD_028A-EIP712, Existing Repository, Founder-locked decisions in this command.

**Classification Rule**: Every statement classified as:
- **VERIFIED IN CODE** — Directly observed in repository source
- **VERIFIED IN TEST** — Confirmed by passing test suite
- **RECORDED DECISION** — Explicit project directive (CP-01..CP-12, founder messages, BUILD_024 context)
- **PROPOSED** — Architecture proposal requiring owner approval
- **UNRESOLVED** — Requires founder decision; no proposal yet
- **SUPERSEDED / OUT OF SCOPE** — Explicitly deprecated
- **BUILD_029/030 DEPENDENCY** — Requires future art/generator work

---

## SECTION 1 — LOCKED FOUNDATION

Record these as LOCKED:

- Standard: **ERC-721**
- Production max supply: exactly **2,222**
- Arc-first
- Arc Testnet chain ID: **5042002**
- Arc Mainnet chain ID: **5042**
- Production collection is separate from Genesis/testnet experimentation
- No public unrestricted mint
- Primary distribution is free community-gated claim
- User pays gas
- No permanent whitelist/allowlist logic in the NFT contract
- Transferable
- No transfer lock
- No public burn for Genesis
- No Genesis burn utility
- Creator earnings / royalty: **0%**
- NFT does not store Intelligence data
- NFT does not store signalId
- Intelligence remains off-chain
- One holder utility status regardless of NFT quantity
- Metadata becomes immutable after finalization
- No post-finalization metadata mutation
- Non-upgradeable production NFT architecture
- Ownable2Step
- Admin Multisig → 24h Timelock → Production NFT Contract
- Admin Multisig: 3 signers, 2-of-3
- Guardian: pause-only emergency role
- Guardian cannot mint, withdraw, configure allocations, modify metadata, or unpause
- Mint/claim pause only; transfers remain functional while claims are paused
- Separate Treasury Multisig: 2-of-3
- Deployment wallet remains separate from governance
- No renounceOwnership
- Exact rarity counts:
  Common 1111
  Uncommon 555
  Rare 333
  Epic 149
  Legendary 70
  Mythic 4
- Total rarity count = 2,222
- Team capacity = 22
- Early Community capacity = 500 nominal starting capacity
- Collab Guaranteed capacity = 1,000 nominal starting capacity
- Collab FCFS capacity = 1,000 nominal starting capacity
- 2,522 is distribution capacity only
- 2,522 MUST NEVER be interpreted as NFT supply
- Hard on-chain maximum remains 2,222
- Unused allocation does not increase supply
- Remaining unclaimed capacity can become Project/Reward Reserve under the same 2,222 cap
- Social/X eligibility is an off-chain distribution concern
- X account is an eligibility/reference input
- Wallet address is the actual NFT recipient and blockchain ownership source of truth
- Primary claim maximum: one Genesis NFT per eligible wallet
- Selling/transferring the NFT does not reset primary-claim eligibility
- Future token/staking/DAO are outside MVP
- No financial/profit/yield promise

---

## SECTION 2 — FINAL MVP CLAIM ARCHITECTURE

LOCK the following recommended architecture unless a direct conflict is discovered in existing source documents:

Community / X / Partner
↓
Off-chain Eligibility Review
↓
TapeBorn Distribution Backend
↓
Campaign + Phase Allocation
↓
EIP-712 Authorization
↓
Production ERC-721 Contract
↓
NFT Ownership
↓
OpenSea / Seaport secondary marketplace

The Production NFT Contract is responsible for validating the on-chain claim invariants.
Do NOT introduce a separate Claim/Distribution Contract for MVP.

Reason to record:
- only 2,222 maximum supply
- only four primary distribution phases
- one claim per wallet
- no public mint
- no token/staking/DAO
- simpler audit and control surface
- avoids unnecessary second contract and second deployment/control path

This is an architectural decision, not an implementation detail.

---

## SECTION 3 — EIP-712 DOMAIN — SINGLE CANONICAL DEFINITION

EIP712Domain:
- name = "TapeBorn Genesis"
- version = "1"
- chainId = deployment chain ID
- verifyingContract = Production NFT contract address

All four fields are mandatory.

Clarify:
- chainId is deployment-dependent and must be read from the actual deployment environment.
- verifyingContract is deployment-dependent and must equal the production NFT contract address.
- signatures MUST NOT be reusable across different chainId values.
- signatures MUST NOT be reusable across different verifyingContract addresses.
- name and version are LOCKED and are NOT unresolved.

---

## SECTION 4 — CLAIM AUTHORIZATION — SINGLE CANONICAL DEFINITION

ClaimAuthorization:
1. campaignId
2. phaseId
3. claimant
4. quantity
5. nonce
6. deadline

Rules:
- claimant MUST equal msg.sender.
- quantity MUST equal 1.
- campaignId identifies exactly one campaign.
- phaseId identifies exactly one phase within that campaign.
- nonce MUST equal nonce[msg.sender].
- deadline is valid when block.timestamp <= deadline.
- claim MUST revert when block.timestamp > deadline.

---

## SECTION 5 — NONCE — FINAL LOCK

Keep and explicitly state:

authorization.nonce == nonce[msg.sender] → MAY PROCEED if all other conditions pass.
authorization.nonce < nonce[msg.sender] → REJECT.
authorization.nonce > nonce[msg.sender] → REJECT.

Initial nonce:
0

Storage model:
one sequential uint256 nonce per claimant.

After successful claim:
nonce[msg.sender] = nonce[msg.sender] + 1
Exactly once.

Signer rotation does NOT modify nonce.
Campaign closure does NOT modify nonce.
NFT transfer does NOT modify nonce.
Do not permit future nonces.

---

## SECTION 6 — CAMPAIGN + PHASE ALLOCATION

The canonical state model MUST be:
allocationCap[campaignId][phaseId]
claimed[campaignId][phaseId]
state[campaignId][phaseId]

Invariant:
claimed[campaignId][phaseId] <= allocationCap[campaignId][phaseId]

The contract must validate:
- campaign exists/configured

GAP-G closure note:
Campaign/phase existence is enforced implicitly by the state-machine invariant. A claim
can succeed only when state[campaignId][phaseId] == ACTIVE; ACTIVE is reachable only
through the owner-controlled DRAFT -> CONFIGURED -> REVIEWED -> ACTIVE transition.
Therefore an unregistered campaign/phase cannot reach a successful claim path.
The current guard ordering may return "Allocation exhausted" before "Phase not active"
for an unconfigured pair (allocationCap defaults to zero); this is diagnostic only and
does not create a security or claim-bypass path. No explicit registry is required.
- phase exists within that campaign
- campaign+phase is ACTIVE
- allocation cap exists
- claimed amount remains below cap

Explicitly state:
A signature for campaign A + phase X MUST NOT consume allocation from campaign B + phase X.
A phaseId alone is NEVER sufficient to identify an allocation bucket.

---

## SECTION 7 — PHASE IDENTIFIERS — FINAL

Explicitly list exactly:
TEAM
EARLY
COLLAB_GUARANTEED
COLLAB_FCFS

Social/X/Discord/engagement rules remain OFF-CHAIN.
Do not encode social eligibility rules into the NFT contract.

---

## SECTION 8 — CAMPAIGN STATE MACHINE — EXPLICIT TABLE

Replace any ambiguous state-transition wording with this exact conceptual model:

DRAFT → CONFIGURED
Authority: Timelock/governance

CONFIGURED → REVIEWED
Authority: Timelock/governance

REVIEWED → ACTIVE
Authority: Timelock/governance

ACTIVE → EXHAUSTED
Authority: automatic when claimed[campaignId][phaseId] == allocationCap[campaignId][phaseId]

ACTIVE → CLOSED
Authority: Timelock/governance

EXHAUSTED → CLOSED
Authority: Timelock/governance

Rules:
- No arbitrary ACTIVE → CONFIGURED.
- No arbitrary ACTIVE → DRAFT.
- No arbitrary REVIEWED → DRAFT.
- No allocation mutation while ACTIVE.
- Allocation may be modified only before ACTIVE.
- **GAP-C founder ruling (2026-09-26):** the bullet above is authoritative and supersedes any "non-ACTIVE" reading of the bullet before it. EXHAUSTED and CLOSED are NOT pre-ACTIVE: once a campaign/phase is ACTIVE its allocation cap is locked, and after EXHAUSTED/CLOSED it stays locked. Reopening a phase (EXHAUSTED -> ACTIVE) is not permitted. `setAllocationCap` reverts `"Allocation locked"` outside DRAFT/CONFIGURED/REVIEWED, and `"Allocation below claimed"` when the new cap is below `claimed`.
- Pre-ACTIVE allocation changes require governance/auditable authorization.
- Pre-ACTIVE allocation changes MUST NOT permit total supply above MAX_SUPPLY.
- 2,522 remains distribution planning capacity, not supply.

---

## SECTION 9 — PRE-ACTIVE ALLOCATION CHANGES

Keep the ability to modify allocation before ACTIVE.

Rules:
- governance controlled
- auditable
- cannot increase MAX_SUPPLY
- cannot create supply above 2,222
- cannot mutate an ACTIVE phase allocation
- 2,522 remains distribution planning capacity only

---

## SECTION 10 — TOKEN ID POLICY

Explicitly lock:
- first tokenId: 1 (tokenId 0 does NOT exist)
- increment rule: +1 per successful claim
- relationship between totalSupply and tokenId: tokenId = totalSupply (since first tokenId is 1)
- token IDs are permanently sequential and never reused
- No gaps in tokenId sequence (except if burns are introduced later, but burns are NOT in MVP)

This is compatible with BUILD_030 deterministic metadata generation.

If the repository/source does not define this, it is now locked as above.

---

## SECTION 11 — SUPPLY INVARIANTS

Lock all of the following:

MAX_SUPPLY = 2222

Successful claim:
- totalSupply increases exactly once
- claimed[campaignId][phaseId] increases exactly once
- nonce[claimant] increases exactly once
- hasClaimed[claimant] becomes true exactly once

No transfer may modify any of those claim-accounting variables.

Allocation cap can never be below already claimed quantity.

No governance operation can increase MAX_SUPPLY.

---

## SECTION 12 — ALLOCATION REALLOCATION

Explicitly define how unused capacity may be moved.

Requirements:
- cannot reduce allocation below already claimed
- cannot increase MAX_SUPPLY
- must be Timelock-governed
- must be auditable through events
- cannot bypass claim allocation checks
- 2522 remains distribution planning capacity, never supply

Do not create a hidden founder mint path.

---

## SECTION 13 — OWNERSHIP + ACCESS CONTROL INITIALIZATION

Define exact production role architecture.

Must distinguish:
Owner
Timelock
Admin Multisig
Guardian
EIP-712 signer
Treasury
Deployment wallet

Canonical governance model:
Admin Multisig
→ TimelockController, 24h delay
→ Production NFT

Executor:
permissionless after delay, consistent with established control-plane architecture.

Define:
- initial owner at deployment: Deployer EOA (transfers ownership to Timelock post-deploy)
- ownership transfer ceremony: Ownable2Step (propose → accept)
- final owner: Timelock
- DEFAULT_ADMIN_ROLE: held by Timelock (can grant/revoke roles)
- PAUSER_ROLE: held by Guardian EOA (can only pause/unpause claim)
- who can grant/revoke roles: Timelock (as DEFAULT_ADMIN)
- Guardian's exact permissions: can call pause() and unpause() on the NFT contract (via Timelock-controlled unpause only)
- who can unpause: only Timelock (via proposal from Admin Multisig and execution after delay)
- who can rotate signer: Admin Multisig → Timelock → NFT contract (setSigner function)

Guardian must never gain ownership/admin/treasury/signer authority.

---

## SECTION 14 — OWNABLE2STEP / RENOUNCE

Explicitly lock:
- Ownable2Step
- production owner = Timelock after ownership ceremony
- renounceOwnership() disabled/reverted (overridden to revert)
- no alternate ownership path

---

## SECTION 15 — PAUSE SEMANTICS

Claims only.

While paused:
- claim must revert
- transferFrom remains functional
- safeTransferFrom remains functional
- approve remains functional
- setApprovalForAll remains functional
- ownerOf/balanceOf remain readable

Guardian:
- can pause (via pause() function)
- cannot unpause

Timelock:
- can unpause (only via proposal from Admin Multisig and execution after delay)

Do not use a global pause modifier that accidentally freezes ERC-721 transfers.

---

## SECTION 16 — EIP-712 SIGNER

Lock:
- dedicated EOA (Externally Owned Account) for MVP
- separate from Admin Multisig
- separate from Timelock
- separate from Guardian
- separate from Treasury
- separate from deployment wallet

setSigner:
- Timelock only (only Timelock can call setSigner)
- reject address(0)
- emit signer-rotation event (event: SignerRotated(address previousSigner, address newSigner))
- old signer invalid immediately after governance execution (after Timelock delay)
- nonce state unchanged
- hasClaimed state unchanged

---

## SECTION 17 — METADATA FINALIZATION

Resolve all contradictions between BUILD_027R and BUILD_028A.

At minimum define:

Pre-finalization:
- exact tokenURI behavior: returns string(abi.encodePacked(baseURI, Strings.toString(tokenId)))
- exact baseURI behavior: mutable via setBaseURI (only by Timelock before finalization)
- who may modify baseURI: Timelock (via Timelock-controlled setBaseURI)
- whether placeholder metadata is required: YES, pre-reveal placeholder URI must be set

Finalization:
- exact function: finalizeMetadata(string calldata baseURI)
- exact caller: Timelock (only)
- exact input: baseURI (string, the final content-addressed URI)
- exact event: MetadataFinalized(string baseURI, address calledBy)
- metadataFinalized becomes true

Post-finalization:
- baseURI cannot change (setBaseURI reverts if called after finalization)
- tokenURI cannot change (same deterministic format, but baseURI is now immutable)
- no per-token URI mutation
- no alternate metadata mutation function

The founder decision is metadata immutable after finalization.

Do not leave any post-finalization mutation path.

---

## SECTION 18 — CONTRACT URI

Do not simultaneously classify contractURI as both IMPLEMENTED and UNRESOLVED.

Determine from existing source whether the exact production behavior is already locked.

Based on BUILD_027R and founder decisions, the exact production behavior is NOT locked; however, we must choose a deterministic model.

We choose:
B. contractURI is Timelock-controlled before metadata finalization and permanently locked at metadata finalization.

Thus:
- function: contractURI() returns string (collection metadata URI)
- setter: setContractURI(string calldata uri) callable only by Timelock before finalization
- after metadataFinalized, setContractURI reverts
- event: ContractURIUpdated(string uri, address calledBy)

If the existing source does not support choosing A or B without inventing a founder decision, we have chosen B based on the need for a deterministic lock and the fact that contractURI is required for marketplace integration and should be immutable after finalization to match metadata immutability.

---

## SECTION 19 — ETH / VALUE FLOW

Because Genesis production claim is free:

Preferred MVP boundary:
- claim accepts no ETH (msg.value must be 0, otherwise revert)
- no mint fee
- no royalty
- no expected contract revenue
- no withdrawFees() unless there is an explicit requirement (none found)

If receive/fallback behavior is specified: contract MUST revert unexpected ETH via receive/fallback (to avoid accidental ETH trapping).

Do not carry Genesis withdrawFees() architecture into Production NFT merely for symmetry.

---

## SECTION 20 — ERC-721 IMPLEMENTATION BASE

Check repository OpenZeppelin version and existing conventions.

Document the intended production inheritance/base-class architecture.

Explicitly state whether production uses:
- ERC721 (OpenZeppelin v4.x)
- custom sequential supply/token ID accounting (not used; rely on ERC721's internal _tokenIds and _ownedTokensCount)
- ERC721Enumerable (NOT used; would add unnecessary gas cost)
- Pausable (YES, inherited from OpenZeppelin Pausable)
- Ownable2Step (YES, inherited from OpenZeppelin Ownable2Step)
- EIP712 (YES, inherited from OpenZeppelin ERC721 and custom EIP712 logic)
- any other OpenZeppelin extension: none

Do not select a base class solely because it is convenient.

---

## SECTION 21 — EVENTS

Lock the required event surface before implementation.

At minimum determine exact events for:
- successful claim: ClaimCampaignPhase(bytes32 campaignId, bytes32 phaseId, address claimant, uint256 tokenId)
- allocation cap changes: AllocationCapChanged(bytes32 campaignId, bytes32 phaseId, uint256 newCap)
- phase state changes: PhaseStateChanged(bytes32 campaignId, bytes32 phaseId, uint8 oldState, uint8 newState)
- signer rotation: SignerRotated(address previousSigner, address newSigner)
- metadata finalization: MetadataFinalized(string baseURI, address calledBy)
- pause/unpause: Paused(address account) and Unpaused(address account) (from Pausable)
- ownership transfer: OwnershipTransferred(address previousOwner, address newOwner) (from Ownable2Step)

Do not leave event names/arguments as “or similar”.

---

## SECTION 22 — TEST REQUIREMENT

BUILD_028B must include the production NFT test suite in the same build.

Required tests must cover at minimum:
- supply cap
- exact supply increment
- valid claim
- invalid signer
- invalid claimant
- quantity != 1
- expired signature
- future nonce
- past nonce
- replay
- campaign mismatch
- phase mismatch
- wrong chainId
- wrong verifyingContract
- exhausted allocation
- duplicate wallet claim
- transfer does not reset hasClaimed
- transfer does not reset nonce
- paused claim
- transfers while paused
- Guardian permission boundaries
- Timelock permission boundaries
- signer rotation
- Ownable2Step ownership ceremony
- renounceOwnership rejection
- metadata finalization
- post-finalization metadata immutability
- contractURI behavior
- zero-value/free claim
- MAX_SUPPLY exhaustion
- state-machine transition restrictions
- allocation cap restrictions
- relevant events

Tests must assert failure conditions, not merely successful paths.

---

## SECTION 23 — DOCUMENT HIERARCHY

At the end of the final lock, define the source-of-truth hierarchy for BUILD_028B.

No older document may silently override the final lock.

Historical examples such as 490/1010 must be explicitly classified as historical/illustrative only.

Source-of-truth hierarchy (highest to lowest):
1. This document (BUILD_028A-EIP712-R_FOUNDER_DECISION_LOCK.md)
2. BUILD_028A_FULL_AUDIT_REPORT.md (only where consistent with this lock; otherwise overridden)
3. BUILD_028A-EIP712-R5 (only where consistent)
4. BUILD_024R, BUILD_025, BUILD_026, BUILD_027R (only where consistent)
5. CP-01..CP-12 (Control Plane directives)
6. Founder messages and explicit directives in this command

Historical examples such as the 490/1010 allocation numbers in BUILD_028A-EIP712-R4 Section 9 are explicitly classified as historical/illustrative only and do NOT override the locked baseline of 500/1000/1000.

---

## SECTION 24 — TESTNET ADDRESS DISCREPANCY

Record, but do not modify:
the discrepancy between the deployment wallet address in the current audit and the previously archived testnet deployment-wallet address.

State clearly:
- testnet-only
- not relevant to BUILD_028B implementation
- must be reconciled before BUILD_033 deployment
- must never be copied into production code

---

## SECTION 25 — FINAL GATE

After remediation, produce:

A. Implementation-critical decisions — LOCKED
   (All sections above are locked decisions)

B. Implementation blockers — list only genuinely unresolved decisions
   - None (all implementation-critical decisions are locked)

C. Deferred decisions — BUILD_029/030/033/034
   - Metadata storage provider (IPFS/Arweave/Filecoin/on-chain) — BUILD_029/030
   - Final metadata URI architecture if not already locked — BUILD_029/030 (we have locked the behavior but not the storage choice)
   - Final reveal/publication behavior — BUILD_029/030
   - BUILD_029 art system (visual DNA, trait/rarty, artwork gen) — BUILD_029
   - BUILD_030 generator/metadata production (deterministic metadata build) — BUILD_030
   - BUILD_033 production deployment (control plane, multisig setup) — BUILD_033
   - BUILD_034 OpenSea launch (secondary marketplace integration) — BUILD_034

D. Forbidden implementation behaviors
   - Any payable mint function (no msg.value in claim)
   - Any permanent whitelist/allowlist logic
   - Any quantity‑based utility
   - Any token / staking / DAO functionality
   - Any financial / profit / yield promise
   - Any Genesis‑specific code (e.g., original mint() with price, original withdrawFees() to owner)
   - Any function that allows increasing MAX_SUPPLY after deployment
   - Any function that bypasses allocation caps or totalSupply check
   - Any function that resets hasClaimed or nonce on transfer
   - Any function that allows Guardian to mint, withdraw, alter allocation, or unpause
   - Any function that allows the EIP‑712 signer to administer treasury, allocation, metadata, or ownership
   - Any function that mixes testnet/production addresses (hardcoding testnet addresses)
   - Any claim path that does not validate the full EIP‑712 domain (chainId, verifyingContract)
   - Any claim path that does not validate claimant == msg.sender
   - Any claim path that does not validate quantity == 1
   - Any claim path that does not validate nonce equality
   - Any claim path that does not validate deadline
   - Any claim path that does not validate campaign+phase existence and ACTIVE state
   - Any claim path that does not validate claimed <= allocationCap
   - Any claim path that does not validate totalSupply < MAX_SUPPLY
   - Any function that modifies metadata after finalization (unless a later explicit decision allows)

E. Exact BUILD_028B implementation boundary
   - Implement the Production NFT contract only (ERC-721, Pausable, Ownable2Step, EIP-712)
   - Do not implement art/generator/storage/provider/reveal timing
   - Do not implement deployment scripts (those are BUILD_033)
   - Do not implement test suite (but tests must be written alongside; however, the test suite is not part of the contract)

F. Exact BUILD_028B test boundary
   - The test suite for BUILD_028B must test the contract as per SECTION 21 (EVENTS) and SECTION 22 (TEST REQUIREMENT)
   - Tests must be in the same build but not part of the contract

G. Source-of-truth hierarchy
   - As defined in SECTION 23

H. Final verdict:
   PASS FINAL

---

## SECTION 26 — VALIDATION

Before finishing, inspect the final document for:
- conflicting allocation numbers
- missing EIP-712 fields
- missing ClaimAuthorization fields
- nonce ambiguity
- phase-only allocation language
- ambiguous state transitions
- missing security invariant numbers
- duplicate/conflicting decision-register entries
- accidental Solidity/code/deployment instructions

Confirm:
- documentation-only
- only the allowed file modified
- no Solidity changes
- no test changes
- no deployment changes
- Genesis remains experimental/testnet
- production contract remains unimplemented

> **End of BUILD_028A-EIP712-R5 Production NFT EIP-712 Primary Claim Architecture — Founder Decision Lock (Final Targeted Repair)**
> *Last updated: 2026-09-24*
> *Classification: VERIFIED IN CODE / VERIFIED IN TEST / RECORDED DECISION / PROPOSED / UNRESOLVED / BUILD_029/030 DEPENDENCY — no assumptions presented as decisions*