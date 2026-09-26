# BUILD_028B — FINAL CLOSURE / PROVENANCE / GAP REVIEW

**Repo:** `TapeBorn/tapeborn-intelligence` · **Branch:** `main` · **Tip:** `f09fa32` (= `origin/main`)
**Date:** 2026-09-26 · **Mode:** review-only (no restart, no rebuild, no deploy, no RPC, no wallet, no key)
**Deployment status:** NOT deployed.

---

## PHASE 9 — FINAL CLOSURE CLASSIFICATION

| Verdict | Value |
|---|---|
| **BUILD_028B contract + test deliverable** | ✅ **CLOSED** — committed, pushed, independently re-verified in this session |
| **BUILD_028B provenance (GAP-F)** | ⛔ **NOT CLOSED** — authority doc untracked |
| **BUILD_028B spec-conformance** | ⚠️ **2 deviations** (GAP-C wording, GAP-D event name) — need founder ruling |
| **Overall** | **CONDITIONALLY CLOSED — 3 blockers before BUILD_033** |

### Blockers (ordered by cost of delay)

| # | Blocker | Class | Fix cost now vs later |
|---|---|---|---|
| 1 | **GAP-F** — `BUILD_028A-EIP712-R_FOUNDER_DECISION_LOCK.md` (rank-1 authority) + BUILD_024–027 spec chain untracked | B. RESOLVABLE NOW | 1 commit now; unrecoverable if a machine is lost |
| 2 | **GAP-D** — event emitted as `Claim`, spec §21 requires `ClaimCampaignPhase` | C. UNRESOLVED (founder) | rename = 1 line + 2 test asserts **now**; post-deploy rename breaks every indexer |
| 3 | **GAP-C** — lock §8 self-contradiction on allocation mutation window | C. UNRESOLVED (founder) | benign today (inert), but sets undocumented semantics |
| 4 | **GAP-H** (new) — 6 no-consumer deps + 11,791-line lock drift, uncommitted | B. RESOLVABLE NOW | commit-under-own-label or revert |

---

## PHASE 1 — CURRENT STATE (verified, not assumed)

```
branch                 main
origin/main tip        f09fa32
contract/test uncommitted diff   0   (contracts/ and tests/ clean vs HEAD)
contracts tracked      2   SignalArtifact.sol, TapeBornProductionNFT.sol
docs tracked           6   BUILD_028B_IMPLEMENTATION_REPORT.md, CURRENT_STATE.md,
                           REPOSITORY_RECONCILIATION_001.md, _002.md,
                           deployment.md, signal-spec.yaml
artifacts/ tracked     13  (intact, git status --short artifacts/ → empty)
```

---

## PHASE 5 — TEST VERIFICATION (re-run, real output)

| Command | Result |
|---|---|
| `npx hardhat compile` | `Nothing to compile` · exit 0 |
| `npm run test:contract:nft` | **75 passing (3s)** |
| `npm run test:hardhat` | **80 passing (2s)** |
| `npm test` (engine) | **49 passing, 0 fail** |
| **Total** | **204 / 204 — reported figure CONFIRMED** |
| `git status --short artifacts/` | clean (GAP-E fix holds) |

Decomposition is exact: 75 (NFT) + 80 (access/adversarial) + 49 (engine) = 204.
Note: `npm run test:contract` alone is `test:contract:nft && test:hardhat` — its tail only shows 80, which can be misread as "the NFT suite = 80". The NFT suite is the **75**.

### Read-anomaly resolved (no defect)
`read_file` rendered `tests/…:49` as `ClaimAuthorization: ***` and
`contracts/…:26` as `CLAIM_AUTHORIZATION_TYPEHASH=***`. `od -c` on line 49 shows the
real bytes are `ClaimAuthorization: [` → an EIP-712 field **array** (valid ethers v6 form),
and `node --check` returns SYNTAX OK. The `***` is a display-side redaction of the long
hex/bracket literal, **not** file content. No action.

---

## PHASE 2 — GAP-F PROVENANCE CLASSIFICATION

Authority hierarchy per lock **SECTION 23**.

### REQUIRED — commit to close GAP-F (9 docs, untracked)

| Doc | Rank in §23 | Why required |
|---|---|---|
| `docs/BUILD_028A-EIP712-R_FOUNDER_DECISION_LOCK.md` | **1 (authority)** | The BUILD_028B commit cites a document absent from the repo |
| `docs/BUILD_028A_FULL_AUDIT_REPORT.md` | 2 | referenced by §23.2; source of the `qty` event supersession |
| `docs/BUILD_028A-EIP712.md` | 3 (R5) | EIP-712 spec the lock repairs |
| `docs/BUILD_024_NFT_INTELLIGENCE_BRIDGE.md` | 4 (024R) | spec chain |
| `docs/BUILD_024_DECISIONS_REQUIRED.md` | 4 (024R) | decision register |
| `docs/BUILD_025_NFT_CORE_SPECIFICATION.md` | 4 | core NFT spec |
| `docs/BUILD_026_UTILITY_PRODUCT_SPECIFICATION.md` | 4 | utility boundary (§25D forbids quantity utility) |
| `docs/BUILD_027_METADATA_ARCHITECTURE.md` | 4 | baseURI / finalizeMetadata origin |
| `docs/BUILD_028A_PRODUCTION_NFT_CONTRACT_ARCHITECTURE.md` | ref | production inheritance architecture |

Also recommend tracking `docs/BUILD_028A-R_CONTRACT_DECISION_LOCK.md` (superseded, but it is the *provenance of the supersession* — §23 says no older doc may silently override, which requires the older doc to exist).

### HISTORICAL / EVIDENCE — recommend commit (not required for 028B logic)

```
BUILD_028A_REPORT.txt            BUILD_028A-EIP712_REPORT.txt
BUILD_028A-R_REPORT.txt          AUDIT_REPORT_BEFORE_BUILD_024.md
TB-CP-RECON-006-REPORT.md        TB-CP-TEST-004-REPORT.md
docs/NFT_DATA_BOUNDARIES.md      docs/NFT_IMPLEMENTATION_BACKLOG.md
docs/NFT_INTELLIGENCE_BRIDGE.md
```

### NOT REQUIRED — do not bundle into the 028B closure commit

| Group | Paths |
|---|---|
| BUILD_033 deployment/ops tooling | `deploy-test.js`, `deploy-treasury-safe{,-v2,-v3}.js`, `find-treasury-safe.js`, `fix-timelock-roles{,-v2}.js`, `check-owner.js`, `check-treasury{,-signers}.js`, `scripts/deploy-control-plane-test.js`, `scripts/configure-control-plane-test.js`, `scripts/negative-test-suite.js` |
| unrelated source | `src/signal/normalizer.js`, `src/visual/`, `utils/`, `holder-utility/`, `test/` |
| other | `tests/normalizer.test.js`, `contracts/test/`, `scripts/generate-trace-svg-samples.js`, `.data/`, `Test.sol` (stray — delete/relocate separately) |

---

## PHASE 4 — GAP-D REVIEW (event schema) — **CORRECTION TO PRIOR REPORT**

> ⚠️ My earlier `BUILD_028B_DETAILED_STATUS_REPORT.md` §5 recorded GAP-D as
> *"matches Section 21"*. **That is wrong on the event NAME.** Corrected here.

**Spec — lock SECTION 21, line 501:**
```
successful claim: ClaimCampaignPhase(bytes32 campaignId, bytes32 phaseId, address claimant, uint256 tokenId)
```
line 509: *"Do not leave event names/arguments as 'or similar'."* → the name is mandatory, not advisory.

**Implementation — `contracts/TapeBornProductionNFT.sol:63`:**
```solidity
event Claim(bytes32 indexed campaignId, bytes32 indexed phaseId, address indexed claimant, uint256 tokenId);
```

| Aspect | Spec | Impl | Verdict |
|---|---|---|---|
| Name | `ClaimCampaignPhase` | `Claim` | ❌ **DEVIATION** |
| Arg count/order/types | campaignId, phaseId, claimant, tokenId | identical | ✅ |
| Arg 4 semantics | `tokenId` | `tokenId` | ✅ (the old `qty` reading in `BUILD_028A_FULL_AUDIT_REPORT.md:751` is superseded by the lock) |
| Indexing | unspecified | first 3 `indexed` | ✅ acceptable addition |

`ClaimCampaignPhase` appears **nowhere** outside the lock document — not in the contract, not in 902 lines of tests. Tests assert `"Claim"` (test lines 374, 857).

**Classification: C. UNRESOLVED.** Not a security defect (no supply/fund/replay impact), but a hard spec-conformance defect and an integration hazard. Nothing is deployed → the rename is currently free. Required if the spec stands: rename event (1 line), update test asserts, re-run the suite.
Alternative: founder amends §21 to lock `Claim` as canonical — then the lock must be edited (it is the rank-1 authority; the repo cannot silently deviate).

---

## PHASE 3 — GAP-C REVIEW (allocation mutation window)

State model: `state[campaignId][phaseId] ∈ {DRAFT, CONFIGURED, REVIEWED, ACTIVE, EXHAUSTED, CLOSED}`.

```solidity
91  function setAllocationCap(bytes32 campaignId, bytes32 phaseId, uint256 cap) public onlyOwner {
92      require(state[campaignId][phaseId] != State.ACTIVE, "Cannot modify active phase");
93      require(cap >= claimed[campaignId][phaseId], "Allocation below claimed");
```
`claim` requires `claimed < allocationCap` (201) **and** `state == ACTIVE` (204); cap reaching claimed auto-sets EXHAUSTED.

**The lock contradicts itself:**
- §8 line 246: *"No allocation mutation while ACTIVE."* → permissive reading = "any non-ACTIVE state is mutable" (implementation follows this).
- §8 line 247: *"Allocation may be modified only before ACTIVE."* → strict reading = EXHAUSTED/CLOSED are **not** "before ACTIVE", so mutation there is prohibited (implementation violates this).

**Observable behaviour (test-asserted, group 5 lines 310-332):**
- cap raise while `EXHAUSTED` → **allowed**, state stays `EXHAUSTED`, `EXHAUSTED → ACTIVE` reverts `Invalid state transition`, next claim reverts `Phase not active`.
- ⇒ the raise is **inert**. Reopening is **not reachable** from any path.
- cap **below** claimed → reverts `Allocation below claimed` ✅ (invariant `claimed <= cap` preserved).
- cap mutation while `ACTIVE` → reverts `Cannot modify active phase` ✅ (§8 line 246 satisfied).

No document in the repo authorizes *or* prohibits "reopening". Test lines 310-332 **encode the permissive reading as expected behaviour**, so this is now de-facto semantics.

**Classification: C. UNRESOLVED.** Ambiguity is in the authority doc, not the code. Benign today (no supply/claim impact), but §8 must be disambiguated (tighten the guard to pre-ACTIVE-only, or ratify "non-ACTIVE" as canonical).

---

## PHASE 6 — SECURITY REVIEW (21 forbidden behaviours, §25 D)

| # | §25 D forbidden behaviour | Evidence | Verdict |
|---|---|---|---|
| 1 | payable mint / `msg.value` | `claim` non-payable (170); `receive`/`fallback` revert; tests 385-395, 706-710 | ✅ |
| 2 | permanent whitelist/allowlist | none; gate = EIP-712 signature, not stored list | ✅ |
| 3 | quantity-based utility | `quantity == 1` hard-required (186); tests 445-453 | ✅ |
| 4 | token/staking/DAO | `staking`→0 hits | ✅ |
| 5 | financial/profit/yield promise | no such surface | ✅ |
| 6 | Genesis-specific code | `withdrawFees`/`setMaxSupply`/`mintFee`/`function mint` → **0 hits**; imports OZ only | ✅ |
| 7 | increase MAX_SUPPLY post-deploy | `constant` (22), no setter | ✅ |
| 8 | bypass cap or totalSupply check | single mint path, both checks (198, 201) | ✅ |
| 9 | reset hasClaimed/nonce on transfer | no `_update` override (0 hits); tests 503-509, 817-838 | ✅ |
| 10 | Guardian mint/withdraw/alloc/unpause | PAUSER_ROLE → `pause()` only; unpause & all config `onlyOwner`; tests 196-232 | ✅ |
| 11 | signer administering anything | `eip712Signer` is a bare address, used once (212); tests 840-873 | ✅ |
| 12 | mixes testnet/prod addresses | no address literals except `address(0)` guards | ✅ |
| 13 | no full EIP-712 domain validation | `_hashTypedDataV4`; tests 581-591, 791-799 | ✅ |
| 14 | no `claimant == msg.sender` | 183; test 435-443 | ✅ |
| 15 | no `quantity == 1` | 186; tests 445-453 | ✅ |
| 16 | no nonce equality | 189; tests 455-473 | ✅ |
| 17 | no deadline check | 192; tests 486-495 | ✅ |
| 18 | no campaign+phase existence & ACTIVE | ACTIVE ✅ (204). **Existence only implicit** — see GAP-G | ⚠️ |
| 19 | no `claimed <= allocationCap` | 201; tests 310-361 | ✅ |
| 20 | no `totalSupply < MAX_SUPPLY` | 198; tests 801-815 | ✅ |
| 21 | metadata mutable after finalize | 135, 140, 160; tests 685-701 | ✅ |

**Result: 20/21 clean, 1 partial (GAP-G).**

### GAP-G (new, Low) — implicit campaign/phase existence
§6 requires the contract to *validate* "campaign exists/configured" and "phase exists within that campaign". There is no campaign registry; a never-configured `(campaignId, phaseId)` is rejected by `Allocation exhausted` (cap 0) or `Phase not active` — never accepted, so **safe**, but the validation is implicit and the revert reason is misleading. Test 602-605 covers the rejection. Either accept the implicit model (founder note) or add an explicit configured-flag check pre-deployment.

### Test-accuracy notes (cosmetic, non-blocking)
- L491 title claims the `deadline == block.timestamp` boundary but signs `now + 1` → the exact boundary is not exercised (operator `>=` makes it safe).
- L278 title claims direct `ACTIVE → CLOSED`; body only walks `ACTIVE → EXHAUSTED → CLOSED`.
- L755 title claims `require` blocks supply; body asserts constants only (the require is covered in group 12).
- L310-332 asserts the §8-line-247 deviation as expected behaviour (see GAP-C).

---

## PHASE 7 — DEPENDENCY SPLIT ANALYSIS (GAP-H)

`package.json` is **split**: its 2 `test:contract*` script lines are committed (`ecedd0b`); its 6 dependency lines are local-only.

| Dep | Version | Consumers in **tracked** code | Consumers in untracked code | Belongs to |
|---|---|---|---|---|
| `dotenv` | 18.0.3 | **0** | 0 | none found |
| `express` | 5.2.1 | **0** | 1 | HTTP API workstream |
| `express-rate-limit` | 8.7.0 | **0** | 1 | HTTP API workstream |
| `node-fetch` | 3.3.2 | **0** | 0 | none found |
| `jest` | 30.5.2 | **0** | 0 | **wrong stack** — repo already uses `node --test` + hardhat/mocha/chai |
| `supertest` | 7.3.0 | **0** | 1 | HTTP API workstream |

- **None of the 6 is needed by committed BUILD_028B** (uses hardhat 2.29.1 / ethers 6.17.0 / chai — already declared).
- `package-lock.json`: **706 packages added**, 11,791 lines touched, uncommitted.
- Consistency: the **committed pair** (`package.json`@HEAD *without* the 6 deps + `package-lock.json`@HEAD) is consistent → a fresh clone / `npm ci` is fine. The **local working tree** is the inconsistent one (lock reflects deps the manifest keeps uncommitted).

**Recommendation:** do not bundle into the 028B closure commit. Either (a) commit under its own build label *after* the HTTP workstream that consumes them is tracked, or (b) `git checkout -- package.json package-lock.json` to drop the local drift. `jest` in particular should be dropped — it duplicates the existing runner.

---

## PHASE 8 — PROPOSED CLOSURE COMMIT LIST (nothing staged)

### Commit 1 — `docs(nft): track BUILD_028A/B authority + spec chain (closes GAP-F)`
```
docs/BUILD_028A-EIP712-R_FOUNDER_DECISION_LOCK.md
docs/BUILD_028A_FULL_AUDIT_REPORT.md
docs/BUILD_028A-EIP712.md
docs/BUILD_028A-R_CONTRACT_DECISION_LOCK.md
docs/BUILD_028A_PRODUCTION_NFT_CONTRACT_ARCHITECTURE.md
docs/BUILD_024_NFT_INTELLIGENCE_BRIDGE.md
docs/BUILD_024_DECISIONS_REQUIRED.md
docs/BUILD_025_NFT_CORE_SPECIFICATION.md
docs/BUILD_026_UTILITY_PRODUCT_SPECIFICATION.md
docs/BUILD_027_METADATA_ARCHITECTURE.md
docs/NFT_DATA_BOUNDARIES.md
docs/NFT_IMPLEMENTATION_BACKLOG.md
docs/NFT_INTELLIGENCE_BRIDGE.md
```

### Commit 2 — `docs(nft): BUILD_028B final closure review`
```
docs/BUILD_028B_FINAL_CLOSURE_REVIEW.md      (this file)
docs/BUILD_028B_DETAILED_STATUS_REPORT.md    (prior report; §5 GAP-D now corrected)
```

### Commit 3 (optional) — build evidence
```
BUILD_028A_REPORT.txt  BUILD_028A-EIP712_REPORT.txt  BUILD_028A-R_REPORT.txt
AUDIT_REPORT_BEFORE_BUILD_024.md  TB-CP-RECON-006-REPORT.md  TB-CP-TEST-004-REPORT.md
```

### Explicitly EXCLUDED
`package.json` deps hunk · `package-lock.json` · all `deploy-*`/`check-*`/`fix-*` · `src/` · `utils/` · `holder-utility/` · `test/` · `contracts/test/` · `tests/normalizer.test.js` · `scripts/{deploy,configure}-control-plane-test.js` · `scripts/negative-test-suite.js` · `scripts/generate-trace-svg-samples.js` · `.data/` · `Test.sol`

---

## PHASE 9 — NEXT ACTION

1. **Now, free:** execute Commit 1 (+2) → closes GAP-F, the only irreversible risk.
2. **Founder ruling #1 (GAP-D):** rename `Claim` → `ClaimCampaignPhase` + update 2 test asserts + re-run, **or** amend §21. Decide before BUILD_033 — after deployment the rename is breaking.
3. **Founder ruling #2 (GAP-C):** ratify "non-ACTIVE may be mutated" or tighten `setAllocationCap` to pre-ACTIVE only; disambiguate §8 lines 246/247.
4. **GAP-G:** accept implicit existence validation or add explicit check.
5. **GAP-H:** commit the HTTP dep set under its own label (drop `jest`) or revert the local drift.
6. Then BUILD_033 (deployment + role ceremony: ownership→Timelock, DEFAULT_ADMIN→Timelock, PAUSER→Guardian, deployer→zero roles, real Treasury Safe) and independent audit.

**No contract, test, config, or deployment file was modified in this review. Nothing was staged, committed, or deployed.**
