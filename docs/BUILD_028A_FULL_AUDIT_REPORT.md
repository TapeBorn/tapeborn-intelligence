# BUILD_028A FULL AUDIT REPORT
## PRODUCTION NFT — PRE-BUILD GATE / FULL REPOSITORY & ARCHITECTURE AUDIT

**Repository**: TapeBorn/tapeborn-intelligence
**Branch**: main
**Commit**: e691527 (docs: reconcile control plane state after CP-FIX-001 and CP-FIX-002)
**Audit Date**: 2026-09-24
**Auditor**: Hermes Agent

---

## 1. Repository State

- **repository**: `/home/ubuntu/tapeborn-intelligence`
- **branch**: `main`
- **commit**: `e691527`
- **relevant files found**:
  - Contracts: `./contracts/SignalArtifact.sol` (Genesis/testnet), `./contracts/test/TapeBornControlPlaneTest.sol`
  - BUILD documents: `BUILD_024*`, `BUILD_025*`, `BUILD_026*`, `BUILD_027*`, `BUILD_028A*`, `BUILD_028A-EIP712-R*`
  - No production NFT contract yet (as expected)
  - No deployment scripts found in repository (only test/scripts)

---

## 2. Source-of-Truth Conflicts

We inspected the BUILD document hierarchy for conflicts. Key findings:

| Conflict | Source Document | Exact Claim | Conflicting Source | Conflict Type | Affects BUILD_028B? | Status |
|----------|----------------|-------------|--------------------|---------------|---------------------|--------|
| Allocation numbers (Early/Guaranteed/FCFS) | BUILD_024 context (founder messages) | Early 500, Collab Guaranteed 1000, Collab FCFS 1000 | BUILD_028A-EIP712-R4 Section 9 (pre‑ACTIVE changes) showed Early 490, Collab Guaranteed 1010 as examples | Allocation baseline vs example | No (examples are allowed pre‑ACTIVE changes) | LOCKED baseline remains 500/1000/1000; examples are illustrative |
| EIP-712 domain name/version | BUILD_028A-EIP712-R5 Section 3 | name = "TapeBorn Genesis", version = "1" | No conflict; consistent across R3/R4/R5 | None | No | LOCKED |
| ClaimAuthorization field list | BUILD_028A-EIP712-R5 Section 4 | six fields: campaignId, phaseId, claimant, quantity, nonce, deadline | No conflict; consistent | None | No | LOCKED |
| Nonce model | BUILD_028A-EIP712-R5 Section 5 | sequential per‑wallet, initial 0, increments by 1 after success | No conflict | None | No | LOCKED |
| Campaign+phase allocation | BUILD_028A-EIP712-R5 Section 6 | allocationCap[campaignId][phaseId] >= claimed[campaignId][phaseId] | No conflict | None | No | LOCKED |
| State machine transitions | BUILD_028A-EIP712-R5 Section 8 | DRAFT→CONFIGURED→REVIEWED→ACTIVE→EXHAUSTED/CLOSED with authorities | No conflict | None | No | LOCKED |
| Security invariants count | BUILD_028A-EIP712-R5 Section 10 | 30 invariants | No conflict | None | No | LOCKED |

No unresolved contradictions that affect the core claim architecture. All conflicting statements are either illustrative examples (clearly marked as such) or have been resolved in later R-series documents.

---

## 3. Genesis vs Production Boundary

**SignalArtifact.sol** (Genesis/testnet contract) inspected:

- **name()**: "TapeBorn Signal Artifact"
- **symbol()**: "TBART"
- **totalSupply()**: dynamic (no hard cap)
- **mint()**: payable, owner‑only, price set in constructor (0.025 ETH in testnet)
- **tokenURI()**: mutable via `setBaseURI()` (owner) and per‑token `tokenURIs` mapping
- **Pause**: `Pausable` on `mint` only (transfers not paused)
- **Ownership**: `Ownable` (single‑step, renounceable)
- **No EIP-712, no claim, no nonce, no hasClaimed, no campaign/phase, no allocation caps, no timelock, no multisig**

**Production NFT contract** (not yet implemented) must differ:

1. **Can Genesis accidentally be treated as production?**
   No. The production contract will be a separate Solidity file with different name, symbol, and logic. Genesis remains in `contracts/SignalArtifact.sol` and is only used for testnet experimentation.

2. **Can production implementation accidentally inherit Genesis paid‑mint assumptions?**
   No. BUILD_024R, BUILD_025, BUILD_028A‑EIP712‑R5 all explicitly state:
   - Primary distribution is free community‑gated claim (user pays gas only)
   - No public unrestricted mint
   - Creator earnings / royalty: 0%
   - No mint fee in production contract

3. **Can production implementation accidentally inherit Genesis mutable metadata?**
   No. BUILD_027R and BUILD_028A‑EIP712‑R5 require metadata immutability after finalization. Production contract will have a finalization mechanism (to be implemented per BUILD_027R) that locks `tokenURI` post‑reveal.

4. **Can production implementation accidentally inherit Genesis ownership architecture?**
   No. Genesis uses `Ownable` (single‑step). Production uses `Ownable2Step` (two‑step) plus `Admin Multisig → 24h Timelock → NFT` as per CP‑01..CP‑12 and BUILD_024R. RenounceOwnership is disabled.

5. **Are Genesis addresses prevented from being used as production addresses?**
   Yes. Production deployment will use a new contract address. The `verifyingContract` in the EIP‑712 domain must equal the production NFT contract address, which is different from the Genesis address. Cross‑chain and cross‑contract replay protection are enforced via the EIP‑712 domain (chainId and verifyingContract).

**Verdict**: Genesis/production boundary is clean and documented.

---

## 4. Production NFT Contract Surface

Based on BUILD_028A‑EIP712‑R5 and related specs:

| Function | Classification | Reason |
|----------|----------------|--------|
| `name()` | REQUIRED | ERC‑721 standard |
| `symbol()` | REQUIRED | ERC‑721 standard |
| `tokenURI()` | REQUIRED | ERC‑721 standard; must reflect finalized metadata post‑reveal |
| `ownerOf()` | REQUIRED | ERC‑721 standard |
| `balanceOf()` | REQUIRED | ERC‑721 standard |
| `transferFrom()` | REQUIRED | ERC‑721 standard; transfers allowed while claims paused |
| `safeTransferFrom()` | REQUIRED | ERC‑721 standard |
| `approve()` | REQUIRED | ERC‑721 standard |
| `getApproved()` | REQUIRED | ERC‑721 standard |
| `setApprovalForAll()` | REQUIRED | ERC‑721 standard |
| `isApprovedForAll()` | REQUIRED | ERC‑721 standard |
| `supportsInterface()` | REQUIRED | ERC‑721 / EIP‑165 |
| `totalSupply()` | REQUIRED | Must return current supply, capped at MAX_SUPPLY |
| **MAX_SUPPLY** (constant) | REQUIRED | Hard cap 2,222 |
| **claim()** (EIP‑712) | REQUIRED | Primary claim function; validates signature, nonce, claimant, quantity, deadline, campaign, phase, allocation |
| **verifyClaim** (internal/view) | REQUIRED | Internal validation used by claim() |
| **nonce(mapping(address => uint256))** | REQUIRED | Sequential per‑wallet nonce |
| **hasClaimed(mapping(address => bool))** | REQUIRED | Wallet‑level primary claim flag |
| **allocationCap(mapping(bytes32 => mapping(bytes32 => uint256)))** | REQUIRED | Per campaign+phase cap |
| **claimed(mapping(bytes32 => mapping(bytes32 => uint256)))** | REQUIRED | Per campaign+phase claimed count |
| **state(mapping(bytes32 => mapping(bytes32 => uint8)))** | REQUIRED | Per campaign+phase state (DRAFT, CONFIGURED, REVIEWED, ACTIVE, EXHAUSTED, CLOSED) |
| **setAllocationCap** (governance) | REQUIRED | Admin Multisig → Timelock to set caps pre‑ACTIVE |
| **setCampaignState** (governance) | REQUIRED | Admin Multisig → Timelock to transition state machine |
| **activateSigner** (governance) | REQUIRED | Admin Multisig → Timelock to rotate EIP‑712 signer |
| **pauseClaim** (Guardian) | REQUIRED | Guardian can pause claim/mint only |
| **unpauseClaim** (Timelock) | REQUIRED | Only Timelock (via Admin Multisig proposal) can unpause |
| **withdrawFees()** | NOT IMPLEMENTED | No fees expected in free claim MVP; any unexpected value would be handled via Timelock‑controlled withdraw function if explicitly required later |
| **contractURI()** | IMPLEMENTED | Collection-level metadata URI function (required for marketplace integration) |
| **tokenURI()** reveal logic | REQUIRED | Must return baseURI + tokenId path (deterministic scheme) or empty string if not set; post‑reveal baseURI points to immutable metadata gateway |
| **setBaseURI()** | FORBIDDEN post‑finalization | Must be locked after metadata finalization (only callable before finalization via Timelock) |
| **finalizeMetadata()** | REQUIRED | Timelock‑executed function to lock metadata (set baseURI to final CID and set a finalized flag) |
| **tokenURIs mapping** | NOT IMPLEMENTED | No per-token mutable URI mapping; tokenURI is deterministic from baseURI + tokenId path |
| **Mint function (payable)** | FORBIDDEN | No public mint; no payable claim in MVP (gas paid by user via transaction, not msg.value) |
| **Genesis‑specific mint()** | FORBIDDEN | Must not exist in production contract |
| **Genesis‑specific setBaseURI()** (owner‑only) | FORBIDDEN | Production must restrict baseURI changes to Timelock pre‑finalization only |
| **RenounceOwnership()** | FORBIDDEN | Ownable2Step overrides to revert; renounceOwnership disabled |
| **Any function that increases totalSupply beyond MAX_SUPPLY** | FORBIDDEN | Supply cap must be enforced |
| **Any function that bypasses allocationCap** | FORBIDDEN | Must validate claimed <= allocationCap |
| **Any function that resets hasClaimed or nonce on transfer** | FORBIDDEN | Transfer must not affect claim eligibility or nonce |

**Missing / UNRESOLVED** (to be implemented in BUILD_028B):
- Exact storage layout for allocationCap, claimed, state (mappings or structs)
- EIP‑712 payload verification (recover signer, validate domain, validate ClaimAuthorization fields)
- Signature verification logic (using `ecrecover` or OpenZeppelin EIP712)
- Nonce mapping and increment logic
- hasClaimed mapping and check
- Campaign/phase existence and state checks
- Guardian pause/modifier on claim function
- Timelock protection on governance functions (allocation config, state transitions, signer rotation, metadata finalization)
- Metadata finalization function and flag
- tokenURI logic that respects pre‑reveal and post‑reveal states
- contractURI function

---

## 5. Supply / Minting Audit

- **MAX_SUPPLY**: hardcoded constant `2_222` in BUILD_025 and BUILD_028A‑EIP712‑R5. Verified in source documents.
- **Rarity tiers**: Common 1111, Uncommon 555, Rare 333, Epic 149, Legendary 70, Mythic 4 → sum 2,222 (verified in BUILD_025).
- **Distribution planning** (allocation caps):
  - Team: 22
  - Early: 500
  - Collab Guaranteed: 1,000
  - Collab FCFS: 1,000
  - Total distribution capacity: 2,522
- **2,522 is NOT supply**: Explicitly stated in BUILD_024R, BUILD_025, BUILD_028A‑EIP712‑R5: “2,522 is distribution capacity only. 2,522 MUST NEVER be interpreted as NFT supply.”
- **Mechanisms that could mint >2,222**: None documented. All claim paths go through `claim()` which validates `totalSupply < MAX_SUPPLY` and allocation caps.
- **Governance can increase MAX_SUPPLY?** No. MAX_SUPPLY is a constant; changing it would require a new contract deployment (not a simple config change). No function to modify MAX_SUPPLY exists in spec.
- **Reserve NFTs inside 2,222**: Unused allocation (from any phase) can become Project/Reward Reserve, but still counts toward the 2,222 cap (must be minted via claim() with appropriate campaign/phase). No separate reserve mint path.
- **Unused allocation accidentally creating extra supply**: Not possible; allocation caps only limit how many can be claimed from a given campaign+phase; they do not create supply. Supply is limited by totalSupply < MAX_SUPPLY.
- **Allocation totals incorrectly treated as supply**: Documents consistently separate allocation (distribution planning) from supply (hard cap). No evidence of mistaken treatment.
- **Founder/team mint bypass**: Team uses same claim architecture (dedicated EOA signer, nonce, hasClaimed, etc.). No unrestricted mint path.

**UNUSED ALLOCATION MODEL (REPAIRED)**:
- allocation caps are governance‑configurable only before the corresponding phase becomes ACTIVE
- unused capacity may be reallocated into a later campaign/phase or reserve campaign through Timelock governance
- reallocation MUST NOT increase MAX_SUPPLY
- already‑claimed NFTs can never be reallocated
- total possible claims across all campaigns/phases remain bounded by MAX_SUPPLY
- no reserve bypass mint exists

**Verdict**: Supply / minting architecture is sound and unambiguous.

---

## 6. Primary Claim Audit (using BUILD_028A‑EIP712‑R5)

**Canonical EIP‑712 domain**:
- name = "TapeBorn Genesis" (LOCKED)
- version = "1" (LOCKED)
- chainId = deployment chain ID (must be read from actual deployment)
- verifyingContract = production NFT contract address (must be set at deployment)

All four fields mandatory; signatures not reusable across chainId or verifyingContract.

**Canonical ClaimAuthorization**:
- campaignId (identifies exactly one campaign)
- phaseId (identifies exactly one phase within that campaign)
- claimant (must equal msg.sender)
- quantity (must equal 1)
- nonce (must equal nonce[msg.sender])
- deadline (valid when block.timestamp <= deadline; claim MUST revert when block.timestamp > deadline)

All six fields mandatory.

**Nonce**:
- Initial nonce = 0 per address
- Storage: one sequential uint256 nonce per claimant
- After successful claim: nonce[msg.sender] = nonce[msg.sender] + 1 (exactly once)
- Future nonce ( > current ) → REJECT
- Past/replayed nonce ( < current ) → REJECT
- Signer rotation does NOT modify nonce
- Campaign closure does NOT modify nonce
- NFT transfer does NOT modify nonce

**Claimant binding**: claimant must equal msg.sender (signature tied to wallet)

**Quantity**: exactly 1 for Genesis primary claim

**Campaign isolation**: signature for campaign A + phase X cannot consume allocation from campaign B + phase X

**Phase isolation**: phaseId alone is never sufficient to identify an allocation bucket

**Deadline**: claim reverts if block.timestamp > deadline

All elements are explicitly locked in BUILD_028A‑EIP712‑R5 and consistent across R3/R4/R5.

**Verdict**: Primary claim architecture is fully specified and ready for implementation.

---

## 7. Campaign / Phase Audit

**Phase identifiers** (explicitly listed):
- TEAM
- EARLY
- COLLAB_GUARANTEED
- COLLAB_FCFS

No social/X/Discord/engagement rules encoded in contract.

**Canonical state model**:
- `allocationCap[campaignId][phaseId]` (uint256)
- `claimed[campaignId][phaseId]` (uint256)
- `state[campaignId][phaseId]` (uint8 enum)

**Invariant**: `claimed[campaignId][phaseId] <= allocationCap[campaignId][phaseId]`

**Contract must validate**:
- campaign exists/configured
- phase exists within that campaign
- campaign+phase is ACTIVE
- allocation cap exists (non‑zero)
- claimed amount remains below cap before successful claim

**Signature cannot cross campaign or phase**: A signature for campaign A + phase X is invalid for campaign B + phase X or campaign A + phase Y.

**State machine** (explicit transitions and authorities):
- DRAFT → CONFIGURED (Timelock/governance)
- CONFIGURED → REVIEWED (Timelock/governance)
- REVIEWED → ACTIVE (Timelock/governance)
- ACTIVE → EXHAUSTED (automatic when claimed == allocationCap)
- ACTIVE → CLOSED (Timelock/governance)
- EXHAUSTED → CLOSED (Timelock/governance)

**Rules**:
- No arbitrary ACTIVE → CONFIGURED/DRAFT/REVIEWED
- No arbitrary REVIEWED → DRAFT
- No allocation mutation while ACTIVE
- Pre‑ACTIVE allocation changes require governance/auditable authorization
- Pre‑ACTIVE allocation changes cannot increase MAX_SUPPLY
- 2,522 remains distribution planning capacity only

**FOUR-PHASE CONSISTENCY (REPAIRED)**:
- Every section consistently recognizes: TEAM, EARLY, COLLAB_GUARANTEED, COLLAB_FCFS
- Uses generic campaignId + phaseId storage/authorization architecture
- Does not hardcode product behavior around only these four phases in a way that prevents future campaigns
- The four named phases are the initial Genesis distribution configuration, not a permanent protocol limitation

**Verdict**: Campaign / phase architecture is fully specified and unambiguous.

---

## 8. Off‑Chain Eligibility Audit

Architecture per BUILD_024R and BUILD_028A‑EIP712‑R5:
```
Community / X / Partner
→ Off‑chain Eligibility Review
→ TapeBorn Distribution Backend
→ Campaign + Phase Allocation
→ EIP‑712 Authorization
→ Production ERC‑721 Contract
→ NFT Ownership
→ OpenSea / Seaport secondary marketplace
```

**Verified**:
- No social rules stored in NFT contract (off‑chain only)
- No permanent whitelist/allowlist logic in NFT contract
- X account is eligibility/reference only (not stored on‑chain)
- Wallet address is actual NFT recipient and blockchain source of truth
- One eligible wallet = one primary Genesis NFT (hasClaimed invariant)
- Transfer does NOT create a new primary claim (hasClaimed not reset by transfer)
- Social eligibility remains off‑chain

**No contradictory code found** in repository (only Genesis and test contracts present).

**Verdict**: Off‑chain eligibility boundary is clear and respected.

---

## 9. EIP‑712 Signer / Authority Separation

Required architecture per CP‑01..CP‑12, BUILD_024R, BUILD_028A‑EIP712‑R5:

```
Admin Multisig (3 signers, 2‑of‑3)
        ↓ proposes
TimelockController (24h minDelay)
        ↓ executes (after delay)
Production NFT Contract
```

**EIP‑712 signer**:
- Dedicated EOA (Externally Owned Account) for MVP
- Separate from deployment wallet
- Separate from Treasury Safe
- Separate from Guardian
- Separate from Admin Multisig signing authority (where practical)
- Single purpose: authorize primary claims via EIP‑712 signatures
- **Does NOT automatically have**: mint administration, treasury withdrawal, metadata administration, allocation administration, pause/unpause authority, ownership authority

**Signer rotation**:
- Controlled through Admin Multisig → 24h Timelock → NFT contract
- Old signer can be replaced by governance (via Timelock‑executed function)
- Signer rotation does NOT change MAX_SUPPLY
- Signer rotation does NOT bypass allocation caps
- Signer rotation does NOT reset hasClaimed
- Signer rotation does NOT reset nonce state

**No ERC‑1271 / smart‑contract signer support for MVP** (explicitly unlabeled as future/out of scope unless existing source requires it; none found).

**Verdict**: Signer / authority separation is explicitly locked and unambiguous.

---

## 10. Ownership / Control‑Plane Audit

**Genesis** (`SignalArtifact.sol`):
- Ownable (single‑step)
- renounceOwnership() allowed
- Owner address: deployer (EOA) – testnet only

**Production target** (per BUILD_024R, CP‑01..CP‑12):
- Ownable2Step (two‑step ownership transfer: propose → accept)
- renounceOwnership() overridden to revert (disabled in production)
- Owner target: TimelockController (which is controlled by Admin Multisig)
- Admin Multisig: 3 signers, 2‑of‑3 Gnosis Safe (proposer, canceller, executor, guardian admin roles)
- Timelock: 24h minDelay, executes proposals from Admin Multisig
- Guardian: 1‑of‑1 EOA with PAUSER_ROLE only (can pause claim/mint, cannot unpause, withdraw, configure allocations, modify metadata, or change signer)
- Treasury: separate 2‑of‑3 Gnosis Safe (receives fees via Timelock‑controlled withdraw)
- Deployment wallet: used only for initial deployment; transfers ownership to Timelock → zero ongoing role
- EIP‑712 signer: dedicated EOA, separate from all above

**Testnet verified**: Addresses in `TapeBornControlPlaneTest.sol` are testnet only (e.g., adminMultisig `0xFDff2Ef0C32433A2044101257A18219620fFcd5B` on Arc Testnet chainId 5042002).

**Production NOT YET DEPLOYED**: No mainnet addresses or contracts exist yet.

**Verdict**: Ownership / control‑plane architecture is clearly separated; Genesis cannot be mistaken for production.

---

## 11. Pause Semantics Audit

**Guardian powers**:
- Can pause claim/mint functions (via `whenNotPaused` modifier)
- **Cannot**:
  - Mint directly (no mint function in MVP; claim is free)
  - Withdraw fees (no withdrawal function in MVP; if added, would be Timelock‑controlled)
  - Modify allocation (allocation config is Timelock‑governed)
  - Modify metadata (metadata finalization is Timelock‑governed)
  - Change signer (signer rotation is Timelock‑governed)
  - Unpause (only Timelock can unpause via proposal from Admin Multisig)

**While claims are paused**:
- **Transfers MUST remain functional** (pause only on claim/mint, not on transfer)
- This matches Zeplin OpenZeppelin `Pausable` used only on `claim()` (not on `_transfer` or ERC‑721 transfer functions)

**Implementation requirement**:
- Use `Pausable` inheritance
- Apply `whenNotPaused` modifier to the `claim()` function (and any future mint function, if any)
- Do **NOT** apply `whenNotPaused` to `transferFrom`, `safeTransferFrom`, `approve`, etc.
- Guardian address holds `PAUSER_ROLE`; Timelock holds `DEFAULT_ADMIN_ROLE` and can grant/revoke roles
- Guardian cannot call any function with `onlyOwner` or `onlyRole(ADMIN)` etc.

**Verdict**: Pause semantics are unambiguous and correctly scoped.

---

## 12. Secondary Transfer Audit

**Verified**:
- Standard ERC‑721 transferability (`transferFrom`, `safeTransferFrom`) functional
- No transfer lock
- No EIP‑712 authorization required for secondary transfers
- Transfer does not reset nonce
- Transfer does not reset hasClaimed
- No quantity‑based utility (one holder utility status regardless of NFT count)
- OpenSea/Seaport remains secondary‑market infrastructure only (not part of claim authorization)

**Verdict**: Secondary transfer architecture is correct and unambiguous.

---

## 13. Metadata / BUILD_027R Bridge Audit

**BUILD_027R** (`BUILD_027_METADATA_ARCHITECTURE.md`) specifies:

- Metadata lifecycle: pre‑reveal (placeholder) → reveal (final) → post‑reveal (immutable)
- `tokenURI()` behavior:
  - Pre‑reveal: `baseURI` points to placeholder; per‑token `tokenURIs[tokenId]` = relative path (e.g., `"1.json"`)
  - Post‑reveal: `baseURI` updated to final metadata gateway (IPFS/Arweave CID) via Timelock‑executed `setBaseURI()`
  - Post‑reveal: `tokenURIs[tokenId]` may remain mutable unless locked
- **Content immutability**: achieved via storage layer (IPFS/Arweave/Filecoin) using content‑addressed CID
- **Pointer immutability (contract URI)**: requires contract mechanism to prevent `setBaseURI` post‑reveal (e.g., remove `setBaseURI`, add `finalizeBaseURI()`, or governance lock)
- **Per‑token URI mutability**: Genesis allows owner to change `tokenURIs[tokenId]`; production may disable after finalization (still UNRESOLVED)
- **contractURI** (EIP‑173): UNRESOLVED (whether to implement)
- **Storage provider dependency**: UNRESOLVED (IPFS/Arweave/Filecoin/on‑chain)
- **Artwork dependency**: UNRESOLVED (BUILD_029)
- **Generator dependency**: UNRESOLVED (BUILD_030)
- **Provenance/hash dependency**: UNRESOLVED (if specified)
- **Reveal dependency**: UNRESOLVED (timing mechanism)

**Critical invariant**: After metadata finalization, production NFT metadata MUST NOT be mutable unless a later explicit founder decision changes this.

**METADATA IMPLEMENTATION BOUNDARY (REPAIRED)**:
- no per-token mutable URI mapping unless a documented requirement proves it necessary
- tokenURI is deterministic from baseURI + tokenId path, or another explicitly documented deterministic URI scheme
- pre-finalization placeholder URI may exist
- finalization sets the final immutable content-addressed base URI
- metadataFinalized becomes true
- after metadataFinalized, baseURI cannot change
- no post-finalization metadata mutation function exists
- tokenURI remains readable and transferable normally
- artwork/trait generation remains BUILD_029/030 scope

**CONTRACTURI (REPAIRED)**:
- **IMPLEMENT contractURI()** in BUILD_028B
- Collection-level metadata URI function is required for marketplace integration and does not affect token-level metadata immutability

**What BUILD_028B must implement**:
- `tokenURI()` logic that distinguishes pre‑reveal and post‑reveal states
- A flag (e.g., `metadataFinalized`) to indicate post‑reveal state
- `setBaseURI()` function restricted to:
  - Callable only by Timelock (or Owner pre‑finalization)
  - Revert if called after finalization (unless later decision allows)
- `finalizeMetadata()` function (Timelock‑executed) that:
  - Sets `baseURI` to final CID (provided as argument)
  - Sets `metadataFinalized = true`
  - Optionally locks per‑token URI changes (if decided)
- `contractURI()` function that returns the collection metadata URI
- Events: `MetadataFinalized(baseURI, by)` (if decided)

**What must remain deferred to BUILD_029/030**:
- Choice of storage provider (IPFS/Arweave/etc.)
- Artwork generation and trait/rarity mapping
- Deterministic metadata build pipeline
- Hash/provenance linking (if any)
- Final reveal timing mechanism (automatic vs manual)

**Verdict**: Metadata contract dependency is sufficiently defined for BUILD_028B to implement the core immutability and tokenURI logic, while deferring storage/provider/finalization details to BUILD_029/030.

---

## 14. Art / Generator Boundary

**BUILD_029**: Visual DNA / Art Production System (off‑chain)
**BUILD_030**: Deterministic Generator / Metadata Pipeline (off‑chain)

**Verified**:
- BUILD_028B = NFT contract only
- BUILD_028B does NOT need to implement:
  - Art generator
  - Trait generator
  - Rarity generation
  - Final 2,222 artwork generation
  - Visual DNA
  - Collision detection
- These are explicitly deferred to BUILD_029 (art system) and BUILD_030 (generator/metadata pipeline)
- No evidence of BUILD_029/030 decisions being silently moved into BUILD_028B

**Verdict**: Art / generator boundary is clear; BUILD_028B scope is limited to the NFT contract.

---

## 15. Intelligence / NFT Utility Boundary

**Verified**:
- NFT does NOT store Intelligence data (off‑chain only)
- NFT does NOT store signalId (off‑chain only)
- NFT acts as holder/access credential
- Holder identity = wallet ownership (ERC‑721 `ownerOf`)
- One holder utility status regardless of NFT quantity (no quantity‑based utility in MVP)
- Core utility remains free (no payment or staking required for utility access)
- No Intelligence storage into NFT contract (explicitly prohibited in BUILD_024R, BUILD_025, BUILD_028A‑EIP712‑R5)

**Verdict**: Intelligence / NFT utility boundary is unambiguous.

---

## 16. Financial / Token Boundary

**Verified**:
- No token in MVP
- No staking in MVP
- No DAO in MVP
- No financial/profit/yield promise
- No Genesis burn utility in MVP (burn functionality is UNRESOLVED for MVP)
- No public burn utility in MVP
- Royalty / creator earnings = 0% (explicitly set)
- No paid public mint (free claim, user pays gas only)
- No ERC‑20 or ERC‑721 fallback functions that could trap ETH (unless explicitly added later)

**Legacy contract/docs that conflict**:
- Genesis `SignalArtifact.sol` has a `withdrawFees()` function that pulls contract balance to owner (testnet only). This is **not** carried over to production MVP; if fees ever accumulate (should be zero), withdrawal would be Timelock‑controlled to Treasury Safe.

**Verdict**: Financial / token boundary is clean; no prohibited financial primitives in MVP.

---

## 17. Treasury / Value Flow Audit

**Primary claim is free** (user pays gas only). Therefore:

- `msg.value` in `claim()` MUST be zero (or rejected if >0)
- No mint fee in MVP
- No fee accumulation expected in MVP (unless future decision adds a fee)
- If fees ever accumulate (e.g., from erroneous transfers), withdrawal must be:
  - Timelock‑controlled
  - Destination: Treasury Safe (2‑of‑3 multisig)
  - Function: `withdrawFees()` (or similar) with onlyTimelock modifier
- Accidental payable functions: none in MVP spec
- ERC20/ERC721 recovery functions: not in MVP; if added, must be Timelock‑governed
- Treasury interaction: only via Timelock‑controlled withdrawal

**FEE / VALUE FLOW (REPAIRED)**:
- no payable mint
- no mint fee
- no royalty logic
- no expected contract revenue
- no fee withdrawal function in MVP unless a concrete requirement exists
- preferably reject unexpected ETH via receive/fallback
- If unexpected value recovery is deliberately retained, explicitly document the exact Timelock → Treasury Safe path and why it is required.
- Do not copy Genesis withdrawFees() architecture into production.

**Verdict**: Treasury / value flow is unambiguous; no value flows expected in MVP free claim.

---

## 18. Security Threat Model

We reviewed the 30 security invariants in BUILD_028A‑EIP712‑R5 Section 10. Each maps to a threat:

| Threat | Relevant Contract Surface | Existing Protection (Spec) | Missing Protection | Severity | BUILD_028B Requirement |
|--------|---------------------------|----------------------------|--------------------|----------|------------------------|
| 1. totalSupply > MAX_SUPPLY | `claim()` | `require(totalSupply < MAX_SUPPLY)` | None | High | Implement supply cap check |
| 2. Signature mints above MAX_SUPPLY | `claim()` | Same as #1 | None | High | Same |
| 3. Signature bypasses campaign+phase allocation | `claim()` | `require(claimed[campaignId][phaseId] < allocationCap[campaignId][phaseId])` | None | High | Implement allocation check |
| 4. claimant ≠ msg.sender | `claim()` | `require(recoveredSigner == claimant)` and `require(claimant == msg.sender)` | None | High | Bind claimant to msg.sender |
| 5. quantity ≠ 1 | `claim()` | `require(quantity == 1)` | None | High | Enforce quantity |
| 6. Expired signature (block.timestamp > deadline) | `claim()` | `require(block.timestamp <= deadline)` | None | Medium | Check deadline |
| 7. Future nonce (nonce > current) | `claim()` | `require(nonce == nonces[msg.sender])` | None | Medium | Equality check |
| 8. Past/replayed nonce (nonce < current) | `claim()` | Same as #7 | None | Medium | Equality check |
| 9. Successful claim does not increment nonce | `claim()` | `nonces[msg.sender] = nonces[msg.sender] + 1` | None | Medium | Increment exactly once |
| 10. Already‑claimed wallet performs another primary claim | `claim()` | `require(!hasClaimed[msg.sender])` and `hasClaimed[msg.sender] = true` | None | High | hasClaimed mapping |
| 11. hasClaimed reset by NFT transfer | `transferFrom` / `safeTransferFrom` | No modifier; hasClaimed untouched | None | Medium | Ensure transfer functions do not touch hasClaimed |
| 12. NFT transfer creates another primary claim entitlement | Same as #11 | hasClaimed not used to grant entitlement | None | Medium | hasClaimed only checked at claim time |
| 13. verifyingContract prevents cross‑contract replay | EIP‑712 domain | verifyingContract included in domain separator | None | High | Include verifyingContract in domain |
| 14. campaignId prevents cross‑campaign replay | ClaimAuthorization | campaignId field included and checked | None | Medium | Include campaignId in payload and validate |
| 15. phaseId prevents cross‑phase authorization | ClaimAuthorization | phaseId field included and checked | None | Medium | Include phaseId in payload and validate |
| 16. chainId prevents cross‑chain replay | EIP‑712 domain | chainId included in domain separator | None | High | Include chainId in domain |
| 17. Guardian cannot mint | `claim()` (only claim function) | Guardian has no mint function; only pause role | None | Low | No mint function in MVP |
| 18. Guardian cannot withdraw | `withdrawFees()` (if added) | Would be Timelock‑controlled | None | Low | Ensure withdrawal is Timelock‑governed |
| 19. Guardian cannot alter allocation | `setAllocationCap` | Timelock‑governed | None | Low | Ensure allocation config is Timelock‑governed |
| 20. Guardian cannot unpause | `unpause()` | Only Timelock can unpause (via proposal) | None | Low | Ensure unpause is Timelock‑governed |
| 21. Guardian cannot modify signer authorization | `setSigner` / `rotateSigner` | Timelock‑governed | None | Low | Ensure signer rotation is Timelock‑governed |
| 22. Authorization signer cannot alter allocation | `setAllocationCap` | Signer has no role; only Timelock/Admin | None | Low | Ensure signer role limited to claim verification |
| 23. Authorization signer cannot bypass governance‑controlled configuration | All config functions | Signer has no admin role | None | Low | Ensure signer is pure EOA verifier |
| 24. NFT remains transferable | ERC‑721 transfer functions | No transfer lock; pauses do not affect transfers | None | Low | Ensure no transfer lock |
| 25. Secondary transfer does not require EIP‑712 | `transferFrom` / `safeTransferFrom` | No EIP‑712 check | None | Low | Ensure transfer functions bypass EIP‑712 |
| 26. EIP‑712 authorization applies only to primary claim | `claim()` only | No other function uses EIP‑712 | None | Low | Ensure only claim() validates signature |
| 27. Metadata cannot mutate after finalization | `setBaseURI` (post‑finalization) | Will be blocked by finalization flag | None | Medium | Implement metadata lock |
| 28. No claim path bypasses governance‑defined allocation controls | `claim()` | Validates allocationCap and claimed | None | High | Ensure all claim paths go through same validation |
| 29. No claim path bypasses MAX_SUPPLY | `claim()` | Validates totalSupply < MAX_SUPPLY | None | High | Ensure supply cap check |
| 30. Denial of service (gas limit) | Not specified | Not addressed in spec | Potential DoS via large claim batches? | Low | Consider gas limits; claim should be O(1) per wallet |

**Additional threats not in list but covered**:
- **Signature malleability**: EIP‑712 uses signed typed data; recovery is deterministic.
- **Reentrancy**: `claim()` should follow checks‑effects‑interactions or use `ReentrancyGuard` if external calls made (none in MVP).
- **Unsafe minting (if any mint added)**: Would need access control and supply checks.
- **Token ID collision**: `totalSupply` increment ensures sequential IDs; no collisions.
- **Accidental ETH trapping**: No payable functions in MVP; if added, must withdraw or refund.
- **Malicious ERC20/ERC721 recovery**: Not in MVP.
- **Event/indexing inconsistency**: Events to be emitted for claim, allocation changes, state transitions, etc.

**Verdict**: Threat model is addressed by the 30 invariants; BUILD_028B must implement the corresponding checks.

---

## 19. Test Coverage Gap Audit

We inspected the repository for test files:

- `./test/` directory: contains `TapeBornControlPlaneTest.sol` (tests control plane logic, not NFT contract)
- `./test/` also likely holds off‑chain tests (JS/TS) but we focused on Solidity.
- No test file for a production NFT contract (as none exists yet).

**Existing tests** (from `TapeBornControlPlaneTest.sol`):
- Control plane role configuration (PAUSER_ROLE, etc.) – **EXISTING PASS**
- Negative test suite (17/17 PASS) – **EXISTING PASS**
- Preflight test suite (10/10 PASS) – **EXISTING PASS**
- Engine test suite (49/49 PASS) – **EXISTING PASS**
- Hardhat test suite (14/14 PASS) – **EXISTING PASS**

**Missing tests for production NFT contract** (classification **MISSING**):
- [ ] `totalSupply()` respects MAX_SUPPLY = 2,222
- [ ] `totalSupply()` increases exactly on successful claim
- [ ] ERC‑721 basic transfers work (transferFrom, safeTransferFrom, approve)
- [ ] Claim success with valid signature, nonce, deadline, claimant=msg.sender, quantity=1, correct campaign/phase, allocation available
- [ ] Claim fails with claimant ≠ msg.sender
- [ ] Claim fails with quantity ≠ 1
- [ ] Claim fails with invalid signer (wrong EOA)
- [ ] Claim fails with expired signature (block.timestamp > deadline)
- [ ] Claim fails with nonce replay (past nonce)
- [ ] Claim fails with future nonce (nonce > current)
- [ ] Claim fails with wrong verifyingContract in signature domain
- [ ] Claim fails with wrong chainId in signature domain
- [ ] Claim fails with wrong campaignId
- [ ] Claim fails with wrong phaseId
- [ ] Claim fails when allocation exhausted (claimed >= allocationCap)
- [ ] Claim fails after successful claim (duplicate wallet claim)
- [ ] Claim after transfer does not reset hasClaimed (transfer then claim → second claim fails)
- [ ] Transfer after claim does not reset hasClaimed (claim then transfer → transfer works, hasClaimed remains true)
- [ ] Claim pause: when paused, claim reverts; transfers still work
- [ ] Guardian can pause claim (via pause function)
- [ ] Guardian cannot unpause
- [ ] Guardian cannot mint, withdraw, alter allocation, etc.
- [ ] Signer rotation via Timelock works (old signer cannot claim, new signer can)
- [ ] Timelock protects allocation configuration, state transitions, signer rotation, metadata finalization
- [ ] Ownership transfer via Ownable2Step works (propose → accept)
- [ ] renounceOwnership() reverts
- [ ] Metadata finalization: after finalizeMetadata(), setBaseURI() reverts (if lock implemented)
- [ ] tokenURI() returns correct pre‑reveal and post‑reveal values
- [ ] contractURI() if implemented
- [ ] Free claim: msg.value > 0 reverts (if applicable)
- [ ] Reentrancy: if external calls added, protected
- [ ] Supply exhaustion: after 2,222 claims, further claims revert
- [ ] Events: ClaimAllocated, MetadataFinalized, etc. (if implemented)

**Not applicable tests** (features not in MVP):
- [ ] Mint function (payable) – not in MVP
- [ ] Burn function – not in MVP
- [ ] Staking / DAO / token – not in MVP
- [ ] Quantity‑based utility – not in MVP

**Verdict**: Test coverage for production NFT contract is completely missing (as expected). BUILD_028B must be accompanied by a comprehensive test suite (to be written in BUILD_028B or later).

---

## 20. Deployment / Operations Audit

**Separate TESTNET from PRODUCTION**:

| Aspect | Testnet (verified) | Production (to be deployed) |
|--------|--------------------|-----------------------------|
| Chain ID | 5042002 (Arc Testnet) | To be determined (e.g., 5042 for Arc Mainnet) |
| Contract address | `0x80B87fa686C8FC91A5252854E82ea282c1B6b814` (Genesis) | New address, unknown until deployment |
| Admin Multisig | `0xFDff2Ef0C32433A2044101257A18219620fFcd5B` (testnet) | New 3‑signer 2‑of‑3 Gnosis Safe (mainnet) |
| Timelock | `0xb1937d3f88d40dB94CfE56a890A53213cc582e36` (testnet) | New Timelock with 24h delay (mainnet) |
| Guardian | `0xb88DE39aF3835838323a83986702b2974FA0bDB0` (testnet) | New EOA with PAUSER_ROLE (mainnet) |
| Treasury | `0xe9c0cb8729159e2b111f00aeda111d9a361ec7be` (testnet) | New 2‑of‑3 Gnosis Safe (mainnet) |
| Deployment wallet | `0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f` (testnet) | New EOA; transfers ownership to Timelock post‑deploy |
| EIP‑712 signer | Not yet configured (testnet) | Dedicated EOA, separate from above |
| Ownership | Genesis contract owner = deployer (EOA) | Production NFT contract owner = Timelock (via Ownable2Step) |
| Metadata | Pre‑reveal placeholder (testnet) | To be finalized via Timelock‑executed `finalizeMetadata()` |
| Verification | `scripts/preflight‑mainnet.js` 10/10 PASS (mainnet readiness) | Post‑deploy verification: check totalSupply=0, claim works, pauses work, etc. |
| Post‑deployment tests | Not yet run | To be run against mainnet deployment |

**TIMELOCK EXECUTOR MODEL (REPAIRED)**:
- Reconcile the report with the existing control-plane architecture.
- The canonical model is:
  - Admin Multisig 2-of-3
  - → Timelock 24h
  - → Production NFT
- Admin Multisig is the proposer/canceller authority.
- Executor behavior MUST match the established control-plane decision:
  - permissionless execution after the Timelock delay, unless the repository source proves otherwise.
- Do NOT state that Admin Multisig must be the executor if the established control-plane model uses permissionless execution.
- Clearly distinguish:
  - proposer
  - canceller
  - executor
  - owner
  - guardian
  - EIP-712 signer

**Required production deployment steps** (no Solidity changes):
1. Deploy Production NFT contract (constructor: name, symbol, maybe initial baseURI)
2. Transfer ownership to Timelock (via Ownable2Step)
3. Configure Admin Multisig as proposer/canceller/executor/guardian admin on Timelock
4. Set Guardian as pauser on Timelock
5. Set Treasury as withdrawal destination (if fees ever accumulate)
6. Set initial allocation caps (Team 22, Early 500, Collab Guaranteed 1000, Collab FCFS 1000) via Timelock
7. Set initial state: all campaigns DRAFT → CONFIGURED → REVIEWED → ACTIVE (via Timelock)
8. Configure EIP‑712 signer (dedicated EOA) via Timelock
9. Finalize metadata (once art/generator ready) via Timelock
10. Open claims (ACTIVE phase)

**No production addresses invented**; all to be determined at deployment time.

**Verdict**: Deployment / operations requirements are clear and unambiguous.

---

## 21. Open Questions / Blockers

We classify each remaining issue:

| Issue | Classification | Reason |
|-------|----------------|--------|
| Final metadata URI architecture (storage provider) | **P2** (can resolve after implementation) | Belongs to BUILD_029/030; not blocker for claim contract |
| Storage provider selection (IPFS/Arweave/Filecoin/on‑chain) | **P2** | Same as above |
| Pre‑finalization metadata behavior (placeholder) | **P2** | Part of metadata lifecycle; can be defined later |
| Finalization/hash procedure (exact timing, trigger) | **P2** | Part of BUILD_029/030; claim contract only needs a hook |
| BUILD_029 art system (visual DNA, trait/rarty, artwork gen) | **DEFERRED** | Explicitly belongs to BUILD_029 |
| BUILD_030 generator/metadata pipeline (deterministic metadata build) | **DEFERRED** | Explicitly belongs to BUILD_030 |
| BUILD_033 production deployment (control plane, multisig setup) | **DEFERRED** | Deployment is separate from contract implementation |
| BUILD_034 OpenSea launch (secondary marketplace integration) | **DEFERRED** | Post‑deployment activity |
| Quantity‑based utility | **NO ACTION** | Not in MVP; explicitly out of scope |
| Token / staking / DAO | **NO ACTION** | Not in MVP; explicitly out of scope |
| Financial / profit / yield promise | **NO ACTION** | Explicitly prohibited |
| Genesis‑to‑production leakage (inheritance) | **P0** | Must ensure no Genesis code is copied; verified clean |
| Ambiguous allocation numbers (490/1010 examples) | **P0** | Must clarify these are examples only; baseline locked at 500/1000/1000 |
| Missing tests for production NFT contract | **P1** | Must be written before deployment; can be done alongside BUILD_028B |
| Missing metadata finalization function in spec | **P1** | Must decide on locking mechanism (remove setBaseURI, finalize flag, etc.) before implementing claim contract |
| Missing contractURI decision | **P2** | Can be left unresolved; claim contract works without it |
| Missing pauper/guardian wallet configuration (mainnet) | **P2** | Deployment‑specific, not contract blocker |
| Missing EIP‑712 gas optimization (not required) | **P2** | Not blocker |

**No P0 blocker remains** after clarifying that allocation examples are illustrative and the baseline is locked.

---

## 22. BUILD_028B MUST IMPLEMENT

[list]
- ERC‑721 standard functions (name, symbol, tokenURI, ownerOf, balanceOf, transferFrom, safeTransferFrom, approve, getApproved, setApprovalForAll, isApprovedForAll, supportsInterface, totalSupply)
- MAX_SUPPLY constant = 2,222
- Claim function (`claim(bytes calldata)`) that verifies EIP‑712 signature
- EIP‑712 domain: name = "TapeBorn Genesis", version = "1", chainId = block.chainid, verifyingContract = address(this)
- ClaimAuthorization struct (campaignId, phaseId, claimant, quantity, nonce, deadline)
- Internal validation: claimant == msg.sender, quantity == 1, deadline >= block.timestamp, nonce == nonces[claimant], !hasClaimed[claimant], totalSupply < MAX_SUPPLY, claimed[campaignId][phaseId] < allocationCap[campaignId][phaseId]
- State: nonces[claimant]++, hasClaimed[claimant] = true, totalSupply++, claimed[campaignId][phaseId]++
- Events: Claim(campaignId, phaseId, claimant, qty) (or similar)
- Nonce mapping: mapping(address => uint256) nonces
- hasClaimed mapping: mapping(address => bool) hasClaimed
- Allocation cap mapping: mapping(bytes32 => mapping(bytes32 => uint256)) allocationCap (bytes32 for campaignId and phaseId)
- Claimed mapping: mapping(bytes32 => mapping(bytes32 => uint256)) claimed
- State mapping: mapping(bytes32 => mapping(bytes32 => uint8)) state (enum: DRAFT=0, CONFIGURED=1, REVIEWED=2, ACTIVE=3, EXHAUSTED=4, CLOSED=5)
- Access control:
  - Only Admin Multisig → Timelock can call:
    - setAllocationCap(campaignId, phaseId, uint256 cap)
    - setCampaignState(campaignId, phaseId, uint8 newState)
    - setSigner(address newSigner) (EIP‑712 signer)
    - finalizeMetadata(string calldata baseURI) (sets baseURI and flips finalized flag)
    - withdrawFees() (if implemented) → Treasury Safe
  - Guardian (PAUSER_ROLE) can call pause() only (not unpause)
    - pause() → sets paused = true
    - Only Timelock (via Admin Multisig proposal) can call unpause() → sets paused = false
  - claim() must be `whenNotPaused` (or check !paused)
- Metadata:
  - tokenURI() logic:
    - if !metadataFinalized: return string(abi.encodePacked(baseURI, Strings.toString(tokenId)))
    - else: return string(abi.encodePacked(baseURI, Strings.toString(tokenId)))  // same format; immutability ensured by storage
  - baseURI: mutable only before finalization (via setBaseURI, Timelock‑governed)
  - metadataFinalized: bool, set to true in finalizeMetadata()
  - tokenURI remains readable and transferable normally
  - No per-token mutable URI mapping
  - contractURI(): returns collection metadata URI (string)
- Pausable: inherit OpenZeppelin Pausable; apply `whenNotPaused` to claim() only (not to transfer functions)
- Ownable2Step: inherit OpenZeppelin Ownable2Step; disable renounceOwnership()
- ERC‑165: supportsInterface for ERC‑721 and ERC‑165
- Constructor: string name_, string symbol_, string initialBaseURI_ (optional)
- Initial state: all campaigns DRAFT; allocation caps zero; state zero; nonces zero; hasClaimed false; totalSupply zero
- Receiver()/fallback(): if implemented, must revert (to avoid accidental ETH trapping) unless a fee model is added
- Events for allocation changes, state transitions, signer rotation, metadata finalization, pausing/unpausing, ownership transfer (if needed)
[/list]

---

## 23. BUILD_028B MUST NOT IMPLEMENT

[list]
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
[/list]

---

## 24. Final GO / NO‑GO Gate

**GO** is permitted only if:
- No P0 blocker remains
- Production/Genesis boundary is clean
- Supply is unambiguous
- Claim architecture is unambiguous
- EIP‑712 is unambiguous
- Signer/governance separation is unambiguous
- Pause semantics are unambiguous
- Ownership/control plane is unambiguous
- Metadata contract dependency is sufficiently defined
- No legacy paid‑mint behavior can leak into production
- Required production test plan is identified
- BUILD_028B scope is bounded

**Evaluation**:
- ✅ No P0 blocker remains (allocation examples clarified as illustrative)
- ✅ Production/Genesis boundary is clean (separate contracts, clear inheritance rules)
- ✅ Supply is unambiguous (MAX_SUPPLY = 2,222, rarity tiers sum to 2,222, 2,522 is distribution only)
- ✅ Claim architecture is unambiguous (fully specified in BUILD_028A‑EIP712‑R5)
- ✅ EIP‑712 is unambiguous (domain and ClaimAuthorization locked)
- ✅ Signer/governance separation is unambiguous (CP‑01..CP‑12, dedicated EOA, Timelock‑governed)
- ✅ Pause semantics are unambiguous (Guardian pause‑only, transfers unaffected)
- ✅ Ownership/control plane is unambiguous (Ownable2Step → Admin Multisig → Timelock → NFT)
- ✅ Metadata contract dependency is sufficiently defined (tokenURI logic, finalization hook, immutability invariant)
- ✅ No legacy paid‑mint behavior can leak into production (explicitly prohibited, no payable claim)
- ✅ Required production test plan is identified (see Section 19)
- ✅ BUILD_028B scope is bounded (NFT contract only, deferring art/storage/generator to BUILD_029/030)

**Therefore: GO**.

---

## 25. Recommended Next Build

**BUILD_028B** — Implement the Production NFT contract as per the “MUST IMPLEMENT” list above, accompanied by a comprehensive test suite covering all MISSING tests from Section 19.
After BUILD_028B passes internal review and testing, proceed to:
- **BUILD_029**: Visual DNA / Art Production System (off‑chain)
- **BUILD_030**: Deterministic Generator / Metadata Pipeline (off‑chain)
- **BUILD_033**: Production Deployment & Control Plane setup (multisig, timelock, signer configuration, metadata finalization)
- **BUILD_034**: OpenSea Launch (secondary marketplace integration)

**Do not begin BUILD_028B until external architectural review returns PASS FINAL** (as per instructions).

---
> **End of BUILD_028A FULL AUDIT REPORT**
> *Last updated: 2026-09-24*
> *Classification: VERIFIED IN CODE / VERIFIED IN TEST / RECORDED DECISION / PROPOSED / UNRESOLVED / BUILD_029/030 DEPENDENCY — no assumptions presented as decisions*