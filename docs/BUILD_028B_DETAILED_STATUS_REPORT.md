# BUILD_028B — DETAILED STATUS REPORT (committed vs local)

**Repo:** `TapeBorn/tapeborn-intelligence` · **Branch:** `main` · **Tip:** `f09fa32` (= `origin/main`)
**Date:** 2026-09-26 · **Scope:** BUILD_028B production NFT contract + build hygiene (GAP-E/GAP-F triage)
**Deployment status:** NOT deployed. No mainnet interaction, no key usage, no on-chain transaction.

---

## 0. Executive summary

| Item | State |
|---|---|
| BUILD_028B in-scope deliverables (contract + tests + npm scripts) | ✅ committed & pushed |
| Build hygiene fix GAP-E (Hardhat artifact collision / tracked-file deletion) | ✅ committed & pushed |
| BUILD_028B documentation report | ✅ committed & pushed |
| Regression | ✅ 204/204 passing (75 NFT + 80 access/adversarial + 49 engine) |
| Unrelated dependency WIP (`package.json`, `package-lock.json`) | ⛔ intentionally LOCAL only |
| Authority documents + deployment tooling + source dirs | ⚠️ **LOCAL only (42 paths untracked)** — see §4, GAP-F |

---

## 1. COMMITTED (pushed to `origin/main`)

Push: `e691527..f09fa32  main -> main` (exit 0)

### 1.1 Commit A — build hygiene (GAP-E)

```
2942373523ebc430cb1ecf062bf84d7d24a41a2a        Sat Sep 26 10:35:21 2026 +0800
fix(build): isolate Hardhat artifacts to ./artifacts-hardhat (GAP-E)
3 files changed, 13 insertions(+), 1 deletion(-)
```

| File | Status | Δ | Content |
|---|---|---|---|
| `.gitignore` | M | +3 | `artifacts-hardhat/`, `cache-hardhat/` ignored |
| `hardhat.config.cjs` | M | +9 | `paths.artifacts → ./artifacts-hardhat`, `paths.cache → ./cache-hardhat` |
| `scripts/build_010.js` | M | +1/−1 | reads `SignalArtifact.json` from `artifacts-hardhat/` |

**Why:** `paths.artifacts` defaulted to `./artifacts`, which is shared with the **tracked** pipeline outputs `artifacts/build_*.json`. Hardhat's artifact auto-cleanup removes every file in that directory that is not a valid Hardhat artifact — so **13 tracked files were deleted from the working tree on every `compile`/`test` run** (no `hardhat clean` required). A naive `git add -A && git commit` would have deleted them from the repository.

### 1.2 Commit B — BUILD_028B deliverable

```
ecedd0b551473ec7cbd4dd1be88ffc6bffa01c18        Sat Sep 26 10:36:37 2026 +0800
feat(nft): BUILD_028B production NFT contract + 75-test suite
3 files changed, 1188 insertions(+)
```

| File | Status | Δ | Content |
|---|---|---|---|
| `contracts/TapeBornProductionNFT.sol` | **A** | +284 | production NFT contract (new file) |
| `tests/TapeBornProductionNFT.test.js` | **A** | +902 | 12 groups / 75 tests, ethers v6 (new file) |
| `package.json` | M | +2 | `test:contract:nft`, `test:contract` — **scripts hunk only** |

**Partial staging note:** `package.json` also carried 6 unrelated dependency additions from a separate workstream. Only the 2 script lines were staged (via `git apply --cached` on a hand-built hunk); all dependency lines were deliberately left uncommitted. Verified with `git diff --cached -- package.json`.

**Compile blocker fixed:** `) external nonpayable {` → `) external {`. `nonpayable` is not a Solidity mutability keyword (valid: `pure`/`view`/`payable`; the default is already non-payable). Result: `Compiled 29 Solidity files successfully (evm target: cancun)`.

### 1.3 Commit C — documentation

```
f09fa32b086a90e373a3a6da891aa68633abea68        Sat Sep 26 11:12:01 2026 +0800
docs(nft): BUILD_028B implementation report + SECTION 22 coverage matrix
2 files changed, 130 insertions(+), 1 deletion(-)
```

| File | Status | Δ | Content |
|---|---|---|---|
| `docs/BUILD_028B_IMPLEMENTATION_REPORT.md` | **A** | +129 | scope justification, SECTION 22 matrix 33/33, evidence, GAP-A…GAP-E |
| `tests/TapeBornProductionNFT.test.js` | M | +1/−1 | title clarification: `owner juga bisa pause…` → `owner (Timelock) TIDAK bisa pause tanpa PAUSER_ROLE` (assertions unchanged) |

### 1.4 Committed artifact inventory

| Path | Tracked lines/files |
|---|---|
| `contracts/TapeBornProductionNFT.sol` | 284 lines |
| `tests/TapeBornProductionNFT.test.js` | 902 lines, 12 groups, 75 tests |
| `docs/BUILD_028B_IMPLEMENTATION_REPORT.md` | 129 lines |
| `docs/` total tracked | 6 files (5 pre-existing + this report) |
| `tests/` tracked | 27 files |
| `scripts/` tracked | 18 files |
| `contracts/` tracked | 2 files |

---

## 2. Test & build evidence (all green)

```
$ npx hardhat --config hardhat.config.cjs compile
Compiled 29 Solidity files successfully (evm target: cancun)

$ npm run test:contract
  75 passing (3s)        # tests/TapeBornProductionNFT.test.js
  80 passing (2s)        # contract-access-behavioral + adversarial

$ node --test tests/engine*.test.js tests/adversarial-engine.test.js
# tests 49   # pass 49   # fail 0
```
**Total 204/204 passing, 0 failing.**

Per-group NFT counts: (1) 6 · (2) 3 · (3) 6 · (4) 7 · (5) 6 · (6) 4 · (7) 21 · (8) 4 · (9) 5 · (10) 2 · (11) 3 · (12) 8 = **75**

### GAP-E fix verification (post-fix full compile+test run)

| Check | Before fix | After fix |
|---|---|---|
| `artifacts/*.json` present after compile+test | 13 → **0 (deleted)** | **13 (intact)** |
| `git status --short artifacts/` | 13 deletions | **0 (clean)** |
| Hardhat output dir | `artifacts/` (collision) | `artifacts-hardhat/` (`build-info`, `contracts`, `@openzeppelin`) |

---

## 3. LOCAL ONLY — modified tracked files (2)

Neither is part of BUILD_028B. Both are dependency WIP from a separate workstream, intentionally left uncommitted.

### 3.1 `package.json` — remaining hunk (+8/−2)

```diff
@@ -33,11 +33,17 @@
   "dependencies": {
     "@openzeppelin/contracts": "5.6.1",
     "better-sqlite3": "13.0.3",
-    "ethers": "6.17.0"
+    "dotenv": "18.0.3",
+    "ethers": "6.17.0",
+    "express": "5.2.1",
+    "express-rate-limit": "8.7.0",
+    "node-fetch": "3.3.2"
   },
   "devDependencies": {
     "@nomicfoundation/hardhat-toolbox": "6.1.2",
     "hardhat": "2.29.1",
-    "solc": "0.8.24"
+    "jest": "30.5.2",
+    "solc": "0.8.24",
+    "supertest": "7.3.0"
   }
```

Added: `dotenv`, `express`, `express-rate-limit`, `node-fetch`, `jest`, `supertest`.

### 3.2 `package-lock.json` — uncommitted

```
1 file changed, 8338 insertions(+), 3453 deletions(-)   (11,791 lines touched)
```

> Note: `package.json` is therefore **split** — its 2 script lines are committed (`ecedd0b`), its dependency lines are local. `package-lock.json` matches neither committed nor HEAD state while these deps stay uncommitted. Anyone running `npm ci` on a fresh clone gets the committed (dependency-free) set.

---

## 4. LOCAL ONLY — untracked paths (42, none gitignored)

All verified with `git check-ignore` → **none** are ignored, i.e. every one is an explicit commit candidate.

### 4.1 Documentation — 13 files ⚠️ highest risk

```
docs/BUILD_028A-EIP712-R_FOUNDER_DECISION_LOCK.md    ← AUTHORITY DOC for BUILD_028B
docs/BUILD_028A-EIP712.md
docs/BUILD_028A-R_CONTRACT_DECISION_LOCK.md
docs/BUILD_028A_FULL_AUDIT_REPORT.md
docs/BUILD_028A_PRODUCTION_NFT_CONTRACT_ARCHITECTURE.md
docs/BUILD_024_DECISIONS_REQUIRED.md
docs/BUILD_024_NFT_INTELLIGENCE_BRIDGE.md
docs/BUILD_025_NFT_CORE_SPECIFICATION.md
docs/BUILD_026_UTILITY_PRODUCT_SPECIFICATION.md
docs/BUILD_027_METADATA_ARCHITECTURE.md
docs/NFT_DATA_BOUNDARIES.md
docs/NFT_IMPLEMENTATION_BACKLOG.md
docs/NFT_INTELLIGENCE_BRIDGE.md
```

### 4.2 Root-level reports — 6 files
```
AUDIT_REPORT_BEFORE_BUILD_024.md
BUILD_028A_REPORT.txt
BUILD_028A-EIP712_REPORT.txt
BUILD_028A-R_REPORT.txt
TB-CP-RECON-006-REPORT.md
TB-CP-TEST-004-REPORT.md
```

### 4.3 Deployment / ops tooling — 10 files (BUILD_033 territory)
```
deploy-test.js                    deploy-treasury-safe.js
deploy-treasury-safe-v2.js        deploy-treasury-safe-v3.js
find-treasury-safe.js             fix-timelock-roles.js
fix-timelock-roles-v2.js          check-owner.js
check-treasury-signers.js         check-treasury.js
```
(`deploy-test.js` was repointed to `artifacts-hardhat/` but remains untracked — the GAP-E fix is complete for it, yet it is not in the repo.)

### 4.4 Scripts — 4 files
```
scripts/deploy-control-plane-test.js
scripts/configure-control-plane-test.js
scripts/negative-test-suite.js
scripts/generate-trace-svg-samples.js
```

### 4.5 Source / modules — 5 paths
```
src/signal/normalizer.js
src/visual/
utils/
holder-utility/
test/
```

### 4.6 Tests / contracts — 3 paths
```
tests/normalizer.test.js
contracts/test/          (TapeBornControlPlaneTest.sol)
Test.sol                 (stray, repo root)
```

### 4.7 Data — 1 path
```
.data/
```

---

## 5. Findings

| ID | Finding | Severity | Status |
|---|---|---|---|
| GAP-A | `DEFAULT_ADMIN_ROLE` bootstrapped to deployer in constructor; lock requires Timelock. Not a contract defect (bootstrap matches lock line 341) — the ceremony was untested. | Medium (ceremony) | **Closed as test** — group 12 proves `grantRole(timelock)` + `renounceRole(deployer)` → deployer reaches **zero roles**, Timelock sole admin, after which deployer cannot `grantRole`. Must be executed at deploy time (BUILD_033). |
| GAP-B | `MAX_SUPPLY` exhaustion path untested | Low | **Closed** — white-box storage probe (scans slots 0..63, restores every non-matching slot); proves claim 2221→2222 succeeds and next reverts `"Supply exhausted"`. |
| GAP-C | Raising `allocationCap` on an `EXHAUSTED` phase does not reopen it (`EXHAUSTED → ACTIVE` rejected). An exhausted phase is permanent; a raised cap is inert. | **CLOSED (2026-09-26)** — founder ruling recorded in lock SECTION 8 (commit `fix(nft): lock claim event and allocation semantics`). `setAllocationCap` now requires DRAFT/CONFIGURED/REVIEWED, reverting `"Allocation locked"` at ACTIVE/EXHAUSTED/CLOSED. |
| GAP-D | **SPEC DEVIATION (corrected 2026-09-26 — the earlier "matches Section 21" note was wrong on the event NAME).** Lock SECTION 21 line 501 requires the event to be named `ClaimCampaignPhase(bytes32,bytes32,address,uint256)`; the contract emits `Claim(...)` (`TapeBornProductionNFT.sol:63`) and the tests assert `"Claim"`. Arguments/order/types **do** match, and field 4 is `tokenId` (not a quantity). §21 line 509 forbids "or similar". | Medium-High (integration / spec conformance) | **CLOSED (2026-09-26)** — event renamed to `ClaimCampaignPhase` in contract (declaration + emit) and tests; now conforms to SECTION 21 line 501. |
| GAP-E | `paths.artifacts` collision silently deleted **13 tracked files** per compile/test run. | **High (data loss)** | **FIXED + committed** (`2942373`). |
| **GAP-F** | **The BUILD_028B authority document (`BUILD_028A-EIP712-R_FOUNDER_DECISION_LOCK.md`) and the whole BUILD_024–028 spec chain are untracked.** The BUILD_028B commit cites a document that does not exist in the repository for any other clone, CI run, or auditor. 42 paths total are local-only. | **High (provenance)** | **OPEN** — see §6. |

---

## 6. Recommended next actions

| # | Action | Owner |
|---|---|---|
| 1 | Commit the authority/spec docs at minimum: `docs/BUILD_028*`, `docs/BUILD_024-027*`, `docs/NFT_*` — closes GAP-F provenance hole | needs decision |
| 2 | Decide on the dependency WIP (`package.json` deps + `package-lock.json`): commit under its own build label, or revert | founder |
| 3 | BUILD_033: deployment + role ceremony scripts (ownership→Timelock, DEFAULT_ADMIN→Timelock, PAUSER→Guardian, deployer→zero roles, real Treasury Safe) | next build |
| 4 | Founder decision on GAP-C (phase reopen semantics) | founder |
| 5 | Independent audit | later |
| 6 | `Test.sol` stray at repo root — remove or relocate | cleanup |

---

## 7. Summary table — committed vs local

| Path | Committed | Local-only |
|---|---|---|
| `contracts/TapeBornProductionNFT.sol` | ✅ `ecedd0b` | — |
| `tests/TapeBornProductionNFT.test.js` | ✅ `ecedd0b`, `f09fa32` | — |
| `docs/BUILD_028B_IMPLEMENTATION_REPORT.md` | ✅ `f09fa32` | — |
| `hardhat.config.cjs`, `.gitignore`, `scripts/build_010.js` | ✅ `2942373` | — |
| `package.json` — `test:contract*` scripts | ✅ `ecedd0b` | — |
| `package.json` — 6 dependency lines | — | ⛔ |
| `package-lock.json` | — | ⛔ |
| `docs/BUILD_028A-EIP712-R_FOUNDER_DECISION_LOCK.md` (authority) | — | ⚠️ |
| 12 other `docs/BUILD_0*` / `NFT_*` specs | — | ⚠️ |
| 6 root `*_REPORT.*` files | — | ⚠️ |
| 10 deployment/ops `deploy-*`/`check-*`/`fix-*` scripts | — | ⚠️ |
| 4 `scripts/*` helpers | — | ⚠️ |
| `src/signal/`, `src/visual/`, `utils/`, `holder-utility/`, `test/` | — | ⚠️ |
| `contracts/test/`, `tests/normalizer.test.js`, `Test.sol` | — | ⚠️ |
| `.data/` | — | ⚠️ |

**This report file itself (`docs/BUILD_028B_DETAILED_STATUS_REPORT.md`) is currently local-only** — left uncommitted for your review. To commit it:

```bash
git add docs/BUILD_028B_DETAILED_STATUS_REPORT.md
git commit -m "docs(nft): BUILD_028B detailed status report (committed vs local)"
git push origin main
```
