# Remediation Registry

Canonical registry of all findings, their remediation, and verification status.

---

## F-01 — F-22 (Forensic Findings from TAPEBORN_SYSTEM_AUDIT_001 → R1-R9)

| FINDING | FOUND | EVIDENCE | SEVERITY | FIX | COMMIT | VERIFICATION | STATUS |
|---------|-------|----------|----------|-----|--------|--------------|--------|
| F-01: Missing decoder / normalization | 2026-09-17 | TAPEBORN_SYSTEM_AUDIT_001 §4 | P0 | `src/signal/normalizer.js` + 28 tests | `cb8fe6f` (R6) | 28 tests PASS | **VERIFIED** |
| F-02: USDC decimals (18→6) | 2026-09-17 | TAPEBORN_SYSTEM_AUDIT_001 §5 | P1 | `CONFIG.usdcDecimals=6` + adversarial tests | `e201bbd` (R1) | Adversarial tests PASS | **VERIFIED** |
| F-03: USDC address placeholder | 2026-09-17 | TAPEBORN_SYSTEM_AUDIT_001 §6 | P1 | Per-network config | `cfa830f` (R3) | Mainnet still placeholder | **PARTIALLY VERIFIED** |
| F-04: BUILD_010 contract divergence | 2026-09-17 | TAPEBORN_SYSTEM_AUDIT_001 §7 | P1 | Single source: `contracts/SignalArtifact.sol` | `ad00481` (R2) | Single source verified | **VERIFIED** |
| F-05: Transaction receipt handling | 2026-09-17 | TAPEBORN_SYSTEM_AUDIT_001 §8 | P1 | Reverted txs skipped, receipt validation | `1865660` (R4) | Reorg tests PASS | **VERIFIED** |
| F-06: Reorg handling | 2026-09-17 | TAPEBORN_SYSTEM_AUDIT_001 §9 | P1/P2 | Block hashes + invalidation + replacement | `485cdbf` (R9) | Adversarial reorg tests PASS | **VERIFIED** |
| F-07: Signal ID collision | 2026-09-17 | TAPEBORN_SYSTEM_AUDIT_001 §10 | P2 | Type-specific provenance, null txHash for HFW/WB | `f2a8719` (R5) | Signal ID tests PASS | **VERIFIED** |
| F-08: Chain average volume | 2026-09-17 | TAPEBORN_SYSTEM_AUDIT_001 §11 | P2 | Real rolling 100-block avg from USDC Transfer events | `e583af8` (R7/R8) | Chain average tests PASS | **VERIFIED** |
| F-09: Confidence logic | 2026-09-17 | TAPEBORN_SYSTEM_AUDIT_001 §12 | P2 | Per-spec `computeConfidence()` + 28 tests | `cb8fe6f` (R6) | 28 tests PASS | **VERIFIED** |
| F-10: Orchestrator test coverage | 2026-09-17 | TAPEBORN_SYSTEM_AUDIT_001 §13 | P3 | Networks tested (15), validator missing | — | Networks 15 PASS | **PARTIALLY VERIFIED** |
| F-11: Contract admin model | 2026-09-17 | TAPEBORN_SYSTEM_AUDIT_001 §14 | P2 | Single owner, no timelock/multisig | BUILD_028B + CP-FIX-002 | Testnet control plane verified | **BLOCKED** (mainnet) |
| F-12: Mainnet deployment claim | 2026-09-17 | TAPEBORN_SYSTEM_AUDIT_001 §15 | P2 | Dry-run only, not independently verified | — | UNVERIFIED | **BLOCKED** |
| F-13: R4/R7 hash confusion | 2026-09-27 | MASTER_ROADMAP §51-55 | DOC | Corrected R7 = `e583af8` (was `1865660`) | `8fb9233` | Independently confirmed | **VERIFIED** |
| F-14: BUILD_028A-EIP712-R5 heading discontinuity | 2026-09-27 | BUILD_028B_DETAILED_STATUS_REPORT §F-14 | DOC | Fixed "# 31." numbering | `b212cd8` | Doc hygiene only | **VERIFIED** |
| F-15: README/MASTER_ROADMAP stale statuses | 2026-09-27 | REPOSITORY_RECONCILIATION_001 §8 | DOC | Synced statuses | `5909446`, `8fb9233` | Statuses aligned | **VERIFIED** |
| F-16: Archive historical reports | 2026-09-27 | F-17 | REPO | Move to docs/archive/ | `e170edb` | Clean main branch | **VERIFIED** |
| F-17: Track control-plane evidence / ignore workstream | 2026-09-27 | This session | REPO | `.gitignore /test/`, track reports | `d05afaa`, `187d85d` | 17/17 PASS, visible | **VERIFIED** |
| F-18: (Not used) | — | — | — | — | — | — | — |
| F-19: Gate CI off mainnet deployment | 2026-09-27 | MASTER_ROADMAP §106-112 | CI | push/merge = test/build/preflight only | `70ea4f7` | CI config updated | **VERIFIED** |
| F-20: (Not used) | — | — | — | — | — | — | — |
| F-21: (Not used) | — | — | — | — | — | — | — |
| F-22: (Not used) | — | — | — | — | — | — | — |

---

## GAP-A — GAP-H (BUILD_028B Findings)

| GAP | FOUND | EVIDENCE | SEVERITY | FIX | COMMIT | VERIFICATION | STATUS |
|-----|-------|----------|----------|-----|--------|--------------|--------|
| **GAP-A** | 2026-09-26 | BUILD_028B_IMPL §5, FINAL_CLOSURE §1 | Medium (ceremony) | Test proves `grantRole(DEFAULT_ADMIN, timelock)` + `renounceRole(deployer)` → deployer zero roles | `ecedd0b` (group 12 test) | Group 12 PASS | **CLOSED AS TEST** — ceremony at BUILD_033 |
| **GAP-B** | 2026-09-26 | BUILD_028B_IMPL §5 | Low | MAX_SUPPLY exhaustion test added (group 12) | `ecedd0b` | 75/75 + group 12 PASS | **CLOSED** |
| **GAP-C** | 2026-09-26 | FINAL_CLOSURE §3, BUILD_028B_IMPL §5 | Medium (ops/UX) | Documented; founder decision needed on "non-ACTIVE may mutate" vs "pre-ACTIVE only" | — | Group 4 tests assert permissive behavior | **RESOLVED (2026-09-26)** — founder ruling recorded in lock SECTION 8, commit `b212cd8`. setAllocationCap permits DRAFT/CONFIGURED/REVIEWED only, reverts "Allocation locked" in ACTIVE/EXHAUSTED/CLOSED. Evidence: `b212cd8` + contract lines 91-100 + tests 325/343 |
| **GAP-D** | 2026-09-26 | FINAL_CLOSURE §4 | Medium (integration) | Event `Claim` vs spec `ClaimCampaignPhase` — rename or amend §21 | — | Tests asserted `Claim` at closure (lines 374, 857); current tests 379/862 assert `ClaimCampaignPhase` | **RESOLVED (2026-09-26)** — event renamed to `ClaimCampaignPhase`, commit `b212cd8`. Evidence: `b212cd8` + contract lines 63/243 + tests 379/862 |
| **GAP-E** | 2026-09-26 | BUILD_028B_IMPL §5 | High (data loss) | Hardhat paths → `./artifacts-hardhat`, `./cache-hardhat`; `.gitignore` updated | `2942373` | All 13 artifacts survive compile/test | **FIXED** |
| **GAP-F** | 2026-09-26 | FINAL_CLOSURE §2, BUILD_028B_IMPL §1 | High (provenance) | 9 authority docs untracked — commit to close | — | BUILD_028B commit cites absent doc | **NOT CLOSED** — irreversible risk |
| **GAP-G** | 2026-09-26 | FINAL_CLOSURE §6 | Low | Implicit campaign/phase existence validation (rejected by cap=0) | — | Test 602-605 | **RESOLVED — DOCUMENTATION-ONLY (2026-09-26)** — implicit enforcement accepted, no explicit registry required, commit `3ee7604` (closure note in lock). Evidence: `3ee7604` + lock closure note + tests 353-355 and 602-605 |
|| **GAP-H** | 2026-09-26 | FINAL_CLOSURE §7 | High (drift) | 6 no-consumer deps + 11,791-line lock drift in package.json/lock | `3ee7604` (lock drift superseded, 9,219 lines/677 packages consistent), `a12e685` (038-B: holder-utility tracked, express/express-rate-limit/supertest now have tracked consumers) | Lock regenerated; holder-utility tracked; all consumers accounted | **RESOLVED (2026-09-29)** — lock drift dimension superseded by `3ee7604` (9,219 lines/677 packages consistent with package.json). Remaining no-consumer question closed by 038-B: holder-utility/server.js (express, express-rate-limit), test/holder-utility.test.js (supertest) now tracked. Original finding preserved above |

---

## SG-01 — SG-07 (Safety Gate Fixes)

| SG | FOUND | EVIDENCE | SEVERITY | FIX | COMMIT | VERIFICATION | STATUS |
|----|-------|----------|----------|-----|--------|--------------|--------|
| **SG-01** | 2026-09-27 | Previous task (Test 16 case-sensitive) | Critical | Test 16: both sides normalized with `.toLowerCase()` | `187d85d` | 17/17 PASS, exit 0 | **CLOSED** |
| **SG-02** | — | — | — | — | — | — | NOT APPLICABLE |
| **SG-03** | 2026-09-27 | Previous task (overbroad `test/` ignore) | Medium | `.gitignore: test/ → /test/` | `187d85d` | `contracts/test/` no longer ignored | **CLOSED** |
| **SG-04** | — | — | — | — | — | — | NOT APPLICABLE |
| **SG-05** | 2026-09-27 | Previous task (negative suite docs) | Medium | Verified docs already reflect 17/17 | — | 17/17 PASS confirmed | **CLOSED** |
| **SG-06** | — | — | — | — | — | — | NOT APPLICABLE |
| **SG-07** | — | — | — | — | — | — | NOT APPLICABLE |

---

## REMEDIATION_002 — REMEDIATION_024 (R1-R9b)

| REMEDIATION | TRIGGERING FINDING | DATE | FILES / COMPONENTS | COMMIT | TEST RESULT | FOLLOW-UP AUDIT | STATUS |
|-------------|-------------------|------|-------------------|--------|-------------|-----------------|--------|
| REMEDIATION_002 (R1) | F-02 USDC decimals | UNKNOWN | `CONFIG.usdcDecimals=6`, adversarial tests | `e201bbd` | PASS | TAPEBORN_SYSTEM_AUDIT_001 | **VERIFIED** |
| REMEDIATION_003 (R2) | F-04 BUILD_010 divergence | UNKNOWN | Unify SignalArtifact deployment source | `ad00481` | PASS | — | **VERIFIED** |
| REMEDIATION_004 (R3) | F-03 USDC placeholder | UNKNOWN | Remove USDC placeholder address | `cfa830f` | PARTIALLY VERIFIED | — | **PARTIALLY VERIFIED** |
| REMEDIATION_005 (R4) | F-05 Tx receipt handling | UNKNOWN | Transaction + reorg safety | `1865660` | PASS | — | **VERIFIED** |
| REMEDIATION_006 (R5) | F-07 Signal ID collision | UNKNOWN | Fix canonical signal identity (keccak256) | `f2a8719` | PASS | — | **VERIFIED** |
| REMEDIATION_011/012 (R6) | F-01, F-09 Normalizer + Confidence | UNKNOWN | Confidence rules + tests | `cb8fe6f` | PASS | — | **VERIFIED** |
| REMEDIATION_013/014/015/016 (R7/R8) | F-06, F-08 Reorg + Chain avg | UNKNOWN | Signal persistence + reorg lifecycle + real rolling chain average | `e583af8` | PASS | — | **VERIFIED** |
| REMEDIATION_017/018/019/020 (R9) | F-06 Reorg hardening | UNKNOWN | USDC transfer-based chain volume + reorg state machine hardening | `485cdbf` | PASS | — | **VERIFIED** |
| REMEDIATION_021/022/023/024 (R9b) | Adversarial precision | UNKNOWN | Adversarial semantic + precision verification | `6d3d902` | PASS | — | **VERIFIED** |

---

## Summary Classification

| Category | Count | Items |
|----------|-------|-------|
| **VERIFIED** | 31 | F-01, F-02, F-04, F-05, F-06, F-07, F-08, F-09, F-13, F-14, F-15, F-16, F-17, F-19, GAP-A, GAP-B, GAP-E, REMED_002-006, REMED_011-016, REMED_017-024, SG-01, SG-03, SG-05, GAP-C, GAP-D, GAP-G |
| **PARTIALLY VERIFIED** | 3 | F-03, F-10, REMED_004 |
| **CLOSED AS TEST** | 1 | GAP-A |
| **UNRESOLVED** | 0 | — (GAP-C, GAP-D resolved via `b212cd8`) |
| **NOT CLOSED** | 0 | — (GAP-F closed via `8ece175`: 9 authority docs tracked) |
|| **OPEN** | 0 | — (GAP-C, GAP-D resolved via `b212cd8`; GAP-H resolved via 038-B tracking) |
| **BLOCKED** | 2 | F-11, F-12 |
| **UNVERIFIED** | 1 | F-03 (mainnet) |

---

## Remediation Type Breakdown

| Type | Count | Examples |
|------|-------|----------|
| **Code remediation** | 12 | F-01 normalizer, F-02 USDC decimals, F-04 single source, F-05 receipt handling, F-07 Signal ID, F-08 chain avg, F-09 confidence, GAP-E artifact isolation, REMED_002-006, REMED_011-024 |
| **Test remediation** | 8 | GAP-A ceremony test, GAP-B MAX_SUPPLY test, GAP-E artifact survival test, 28 normalizer tests, adversarial reorg tests, 204/204 NFT suite |
| **Documentation remediation** | 7 | F-13 R4/R7 hash, F-14 heading fix, F-15 status sync, F-16 archive, BUILD_REGISTRY creation, SG-05 doc reconciliation |
| **Repository hygiene** | 4 | F-17 ignore rule + tracking, F-19 CI gate, GAP-E .gitignore, SG-03 ignore correction |
| **CI/security remediation** | 2 | F-19 CI mainnet block, GAP-E Hardhat config |
| **Deployment/control-plane remediation** | 4 | TB-CP-FIX-001 Treasury, TB-CP-FIX-002 Timelink, TB-CP-TEST-004 verification, REPOSITORY_RECONCILIATION_002 |

---

## Critical Path: BUILD_028B → BUILD_033

```
BUILD_028B (FROZEN, 204/204 PASS)
    │
    ├─ GAP-F: CLOSED via `8ece175` (9 authority docs tracked)
    ├─ GAP-H: PARTIALLY RESOLVED via `3ee7604` (lock drift superseded; remaining no-consumer question OPEN)
    ├─ GAP-C: EXECUTED/RESOLVED via `b212cd8` (founder ruling in lock SECTION 8)
    ├─ GAP-D: EXECUTED/RESOLVED via `b212cd8` (event = ClaimCampaignPhase)
    ├─ GAP-G: EXECUTED/RESOLVED via `3ee7604` (implicit acceptance documented)
    │
    ▼
NEXT BUILD — pending founder ruling (BUILD_038 candidate)
    • ownership → Timelock
    • DEFAULT_ADMIN_ROLE → Timelock
    • PAUSER_ROLE → Guardian
    • deployer → zero roles
    • real Treasury Safe (3 owners, threshold 2, on-chain verified)
    • 24h Timelock (production)
    │
    ▼
Independent Security Audit
    │
    ▼
MAINNET DEPLOYMENT (requires explicit founder approval)
```

---

## Verification Rule

> **A remediation is only CLOSED when:**
> 1. Fix commit exists in Git history
> 2. Verification evidence exists (tests PASS, on-chain verified, docs aligned)
> 3. No outstanding founder ruling required for the specific finding
> 
> **UNVERIFIED claims are never upgraded without new evidence.**