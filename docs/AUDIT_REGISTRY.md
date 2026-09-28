# Audit Registry

Canonical index of all verified audits, reconciliations, reviews, and security gates in chronological order.

## Columns

| AUDIT ID | DATE | HEAD | SCOPE | MODE | FINDINGS | REMEDIATION | VERIFICATION | STATUS | EVIDENCE |

---

| AUDIT ID | DATE | HEAD | SCOPE | MODE | FINDINGS | REMEDIATION | VERIFICATION | STATUS | EVIDENCE |
|----------|------|------|-------|------|----------|-------------|--------------|--------|----------|
| AUDIT_001 (R0) | UNKNOWN | `d7cdf70` | System audit v0.1 + snapshot | Baseline forensic | Established remediation roadmap R1-R9 | REMEDIATION_002-024 | 344 PASS / 0 FAIL | VERIFIED | Commit `d7cdf70` message |
| TAPEBORN_SYSTEM_AUDIT_001 | 2026-09-17 | `c960025` | Full repo / architecture / security readiness | Forensic review (Human + Hermes) | 30+ findings across architecture, Signal Engine, NFT contract, access control, metadata, API, dashboard, contract security | REMEDIATION_002-024 (R1-R9) | 344 PASS / 0 FAIL | PARTIAL (led to remediation) | `TAPEBORN_SYSTEM_AUDIT_001.md` |
| REPOSITORY_RECONCILIATION_001 | 2026-09-21 | `5909446` | Architecture vs implementation vs documentation | Documentation reconciliation | Identified TapeBorn = Intelligence + Signal Artifact (Genesis) only; NOT final NFT collection | CURRENT_SYSTEM_STATE.md creation | N/A | COMPLETE | `REPOSITORY_RECONCILIATION_001.md` |
| REPOSITORY_RECONCILIATION_002 | 2026-09-21 | `8892ac0` + CP-FIX-001/002 | Post-CP-FIX control plane state | Read-only reconciliation | Admin Safe ✅, Treasury Safe ❌ (non-functional), Timelink ⚠️ (deployer roles), Control Plane ✅, Guardian ✅, Deployment Wallet ✅ | TB-CP-FIX-001, TB-CP-FIX-002 | On-chain role queries | COMPLETE | `REPOSITORY_RECONCILIATION_002.md` |
| TB-CP-TEST-004 | 2026-09-21 | Testnet | Control plane role separation configuration & verification | On-chain verification | 17/17 negative tests PASS, full role matrix verified | CP-FIX-001, CP-FIX-002 | Transaction receipts + RPC queries | PASS | `TB-CP-TEST-004-REPORT.md` |
| TB-CP-FIX-001 | 2026-09-21 | Testnet | Treasury Safe deployment & verification | On-chain deployment | Treasury Safe proxy deployed but **NON-FUNCTIONAL** (threshold=0, owners empty); RPC limitation claim DISPROVEN | Future explicit deployment ceremony | Read-only on-chain verification 2026-09-27 | FAILED (claimed PASS, actually non-functional) | `TB-CP-FIX-001-REPORT.md` + `CURRENT_STATE.md` §TREASURY |
| TB-CP-FIX-002 | 2026-09-21 | Testnet | Timelink role cleanup | On-chain transactions | Deployer DEFAULT_ADMIN/EXECUTOR revoked, EXECUTOR→address(0), Admin Safe roles retained | — | Transaction receipts | PASS | `TB-CP-FIX-002-REPORT.md` |
| TB-CP-RECON-006 | 2026-09-21 | Testnet | Read-only control plane reconciliation | Read-only queries | 4 VERIFIED, 4 DISCREPANCIES (Treasury, Timelink deployer roles) | TB-CP-FIX-001/002 | RPC queries | COMPLETE | `TB-CP-RECON-006-REPORT.md` |
| BUILD_028A_FULL_AUDIT_REPORT | 2026-09-24 | `e691527` | Pre-BUILD_028B gate / full repository & architecture audit | Full repository & architecture | Genesis/production boundary clean, supply/minting sound, claim architecture specified, campaign/phase specified, off-chain eligibility clear, signer/authority separated, ownership/control-plane clear, pause semantics correct | Authorized BUILD_028B implementation | N/A (gate audit) | VERIFIED | `BUILD_028A_FULL_AUDIT_REPORT.md` |
| BUILD_028B_FINAL_CLOSURE_REVIEW | 2026-09-26 | `f09fa32` | BUILD_028B closure / provenance / gap review | Review-only (no restart, rebuild, deploy, RPC, wallet, key) | Contract+tests CLOSED, GAP-F provenance NOT CLOSED, GAP-D event name deviation, GAP-C allocation mutation ambiguity, GAP-H dependency split | Commit authority docs (GAP-F), founder rulings (GAP-C, GAP-D, GAP-G) | 204/204 tests re-run, contract compile, git status | CONDITIONALLY CLOSED (3 blockers before BUILD_033) | `BUILD_028B_FINAL_CLOSURE_REVIEW.md` |
| Canonicalization: BUILD Registry | 2026-09-27 | `70ea4f7` | Canonicalize BUILD registry, gate CI off mainnet deployment | Documentation + CI | Era collisions documented, future numbering rule established | BUILD_REGISTRY.md creation | CI config updated | COMPLETE | Commit `70ea4f7` |
| Canonicalization: Test Execution | 2026-09-27 | `0f8ed96` | Canonicalize test execution and provenance | Test infrastructure | Test provenance canonicalized, normalizer tracked | F-05, F-08, F-17 | All test suites PASS | COMPLETE | Commit `0f8ed96` |
| Canonicalization: Docs Reconciliation | 2026-09-27 | `8fb9233` | Reconcile historical and current project documentation | Documentation | F-02, F-06, F-07, F-13 resolved | Historical vs current claims aligned | N/A | COMPLETE | Commit `8fb9233` |
| Canonicalization: Archive | 2026-09-27 | `e170edb` | Archive historical reports and local control-plane scripts | Repository hygiene | Historical reports moved to docs/archive/ | F-17 | N/A | COMPLETE | Commit `e170edb` |
| Canonicalization: SG-01/03 Fixes | 2026-09-27 | `187d85d` | SG-01 Test 16 fix + SG-03 ignore rule | Remediation | Test 16 case normalization, /test/ ignore correction | SG-01, SG-03 | 17/17 PASS, git check-ignore | COMPLETE | Commit `187d85d` |
| REMEDIATION: GAP-C/GAP-D closure | 2026-09-26 | `b212cd8` | Founder ruling (lock SECTION 8) + event rename + allocation semantics | Remediation | GAP-C allocation ruling recorded, GAP-D event = `ClaimCampaignPhase` | Contract/tests/lock | 204/204 tests, contract line 63/243 + 91-100, tests 379/862 | VERIFIED / CLOSED | Commit `b212cd8` |
| REMEDIATION: GAP-G closure + dependency pruning | 2026-09-26 | `3ee7604` | Implicit existence acceptance + package pruning | Remediation | GAP-G closure note in lock; dotenv/node-fetch/jest removed; lock regenerated (9,219 lines, 677 packages) | Lock + dependency/package audit | Lock closure note; lock consistent vs package.json | VERIFIED / GAP-H remaining dimension OPEN | Commit `3ee7604` |
| PRE-BUILD-038 GATE | 2026-09-28 | `2cc2a81` | Pre-BUILD_038 open-gap + founder-decision gate (12 phases) | Read-only gate | Registry stale rows flagged; Treasury nonce conflict flagged; GAP-D line refs stale (cosmetic) | — | 204/204 (75 NFT + 80 Hardhat + 49 Engine), 17/17 negative | GREEN — GATE COMPLETE | Post-gate reconciliation report |
| Founder Decision Packet Validation | 2026-09-28 | `719ed82` | Founder packet: BUILD_038 scope E + 10 OD decisions + holder-utility + Treasury nonce + genesis provenance | Read-only validation | OD-G/R/C/M/P/FC/Meta/Treasury/TBART/Audit validated; Treasury nonce resolved via deploy receipt (documented 1 = transcription error, canonical 0); holder-utility branch tip = ancestor of main (no merge needed, track files instead) | Contract/tests/lock/RPC/deploy receipts | 204/204, 17/17 negative, RPC read-only, deploy tx `0xf5aa9aaa...` receipt block 63246084 | GREEN — DECISIONS VALIDATED | Founder decision validation report |
| BUILD_038-A Documentation Execution | 2026-09-28 | `719ed82` + docs commit | 038-A entry: BUILD_038 authorization + OD-R RULED + Treasury nonce canonical 0 | Documentation execution (no contract/test/package/deploy/on-chain change) | BUILD_038 AUTHORIZED SCOPE E, stage 038-A; OD-R ruled (verbatim, no mechanism invented); Treasury nonce 0 canonical (transcription error classified, conflict record preserved) | Post-mutation validation | git diff --check exit 0; only 4 allowed docs changed; BUILD_033 OCCUPIED intact | IN PROGRESS — 038-A | This commit |

## Audit Type Classification

| Type | Description | Examples |
|------|-------------|----------|
| **Forensic Audit** | Deep systematic review of architecture, code, security, documentation | TAPEBORN_SYSTEM_AUDIT_001, AUDIT_001 |
| **Reconciliation** | Aligning documentation with implementation and on-chain reality | REPOSITORY_RECONCILIATION_001/002, TB-CP-RECON-006 |
| **On-Chain Verification** | Read-only or transaction-based verification of deployed contracts | TB-CP-TEST-004, TB-CP-FIX-001/002 |
| **Closure Review** | Final gate review before declaring a BUILD complete | BUILD_028A_FULL_AUDIT_REPORT, BUILD_028B_FINAL_CLOSURE_REVIEW |
| **Canonicalization Verification** | Ensuring registry, test infrastructure, documentation are self-consistent | Canonicalization passes (4 commits) |
| **Security Gate** | Explicit blocking/approval for production deployment | MASTER_ROADMAP gates, CI mainnet block |