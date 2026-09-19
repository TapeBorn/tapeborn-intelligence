# TAPEBORN_SYSTEM_AUDIT_001

**Audit Type:** Repository / Architecture / Security Readiness
**Repository:** TapeBorn/tapeborn-intelligence
**Scope:** Current GitHub state + project master roadmap + reconciliation report
**Purpose:** Menentukan kondisi aktual sistem dan blocker sebelum testnet/mainnet/public mint
**Status:** DRAFT v0.1 — belum 100% file-by-file (batas tool calls), tapi representative untuk scope yang sudah diinspeksi
**Generated:** 2026-09-17
**Auditor:** Human + Hermes (forensic review)

---

# PART A — AUDIT FINDINGS

## 0. Executive Verdict

| Area | Status |
|------|--------|
| Core architecture | 🟢 |
| Arc connectivity | 🟢 |
| Blockchain readers | 🟢 |
| Event decoding | 🟢 |
| USDC flow | 🟢 |
| Wallet activity | 🟢 |
| Deterministic signals | 🟡 |
| Signal semantics | 🟡 |
| Provenance | 🟡 |
| NFT contract | 🟡 |
| **Contract security** | 🔴 **belum production-ready** |
| Testing | 🟡 |
| Deployment tooling | 🟡 |
| API | 🟡 |
| Dashboard | 🟡 |
| Documentation consistency | 🟡 |
| Mainnet readiness | 🔴 |
| Public mint readiness | 🔴 |

**Kesimpulan:** TapeBorn sudah memiliki fondasi sistem yang nyata dan bukan prototype kosong. **Tetapi TapeBorn belum boleh dianggap mainnet/public-mint ready.** Kita tidak perlu rebuild — kita perlu harden, reconcile, test, dan security-review.

---

## 1. Source-of-Truth Reconciliation

**Masalah:** Dokumen `tapeborn_reconciliation_report.md` (2026-09-04, HEAD c960025) menyatakan BUILD_010 = dry-run, BUILD_011 = next. Repository aktual sudah jauh melampaui snapshot tersebut (BUILD_026+ behavioral tests, BUILD_029 audit).

**Action Required:** 🔴 Buat `CURRENT_SYSTEM_STATE.md` sebagai canonical snapshot baru. Reconciliation report sudah historical.

---

## 2. Architecture Audit

Arsitektur konseptual TapeBorn **sangat kuat dan konsisten** dengan master roadmap:

```
ARC → Blockchain Data → Normalization → Signal Engine → Evidence → Intelligence
                                              ↓
                              ┌───────────────┴───────────────┐
                              ▼                               ▼
                         Signal API                      Signal Artifact
                                                            │
                                                            ▼
                                                      NFT Contract
```

**Verdict:** 🟢 KEEP — Tidak perlu dibongkar.

---

## 3. src/orchestrator/arc.js

Fondasi RPC → block → transactions → receipts/logs. BUILD_002–005 membuktikan pipeline bekerja (227 logs, 157 Transfer, 21 Approval di BUILD_005).

**Production gaps:** retry behavior, RPC failure handling, malformed response, rate limiting, chain mismatch, block reorg handling → harus masuk reliability layer.

---

## 4. src/signal/decoder.js

Normalization layer yang benar: raw RPC → normalized event → signal engine.

**Risk:** Jangan biarkan signal engine membaca raw RPC langsung. Canonical pipeline wajib: RPC → decoder → normalized schema → signal engine.

---

## 5. src/signal/engine.js — Signal Semantics Issue

**Finding:** `token_flow_anomaly` didokumentasikan sebagai anomaly relatif terhadap historical/chain average, tapi implementasi menggunakan fixed threshold di beberapa jalur. "Anomaly detection" ≠ "statistical anomaly detection".

**Action:** 🟡 **SIGNAL SPEC FREEZE** — Setiap signal harus punya definisi matematis eksplisit:
```yaml
signalType:
  definition:
  input:
  window:
  threshold:
  formula:
  evidence:
  confidence:
  false_positive_conditions:
  false_negative_conditions:
  version:
```

---

## 6. Signal ID — Canonical Identity

Current: deterministic custom hashing (terlalu kecil untuk cryptographic identity).

**Required:** `keccak256(canonicalSignalPayload)` dengan payload:
```
chainId + signalType + blockNumber + transactionHash + logIndex + relevantAddress
→ sig_<hash>
```

Signal ID adalah backbone untuk: Metadata → NFT → Provenance → API → Historical archive. Harus di-fix sebelum production.

---

## 7. Historical State / address_reactivation

`lastSeenMap = {}` process-memory based → histori hilang saat restart → signal "reactivation" salah.

**Solution:** Persistent state (SQLite/Postgres/indexer). Untuk V1, SQLite cukup tergantung volume.

---

## 8. Signal Artifact Contract

**Good:** Sederhana — ERC721 + Ownable + Pausable, mint admin-controlled. Tidak ada staking/rewards/treasury/yield/governance di Genesis.

**Issue:** Model `admin → mint(to, metadata)` bukan `public user → pay → mint`. Revenue model Genesis belum di-contract.

---

## 9. Contract Access Control

**Progress:** Behavioral tests added (owner→allowed, non-owner→reverted). **Tetapi belum cukup.**

**Required test coverage before mainnet:**
- owner lifecycle (renounceOwnership, transferOwnership, zero address)
- pause/unpause, mint while paused
- mint invalid recipient, duplicate metadata
- token URI behavior, unexpected recipient contract
- max supply behavior
- **Jika public mint:** payment, underpayment, overpayment, refund, reentrancy, mint limit, supply exhaustion, withdraw, withdraw access control

---

## 10. Pausable Semantics

`pause()` hanya menghentikan `mint`, bukan NFT transfer. Terminologi "paused" ambigu.

**Recommendation:** Rename ke `mintPaused` atau dokumentasikan eksplisit: "hanya mint yang dihentikan, transfer ERC721 tetap berjalan."

---

## 11. Unlimited Supply

Contract memungkinkan owner mint tanpa hard cap.

**Untuk internal artifact:** 🟢 masuk akal
**Untuk Genesis collection:** 🟡 perlu keputusan final. Kalau "Genesis NFT" dijual dengan supply fixed tapi contract unlimited → supply scarcity tidak dijamin on-chain. `MAX_SUPPLY` harus di-contract jika scarcity dijual.

---

## 12. Metadata/Provenance

**Strength:** Metadata sudah punya konsep lengkap (chain, block, timestamp, signal type, tx hash, signal ID, confidence, version, evidence).

**Gap:** Belum ada distinction eksplisit:
- **ON-CHAIN FACTS** (immutable): signalId, block, txHash, chainId, signalType
- **DERIVED INTERPRETATION** (mutable): description, UI presentation, image, explanation

---

## 13. API / Agent Layer

Read-only API dengan endpoint `/signals`, `/signals/:signalId`, `/provenance/:signalId`, `/evidence/:txHash` — sangat cocok roadmap.

**Production gaps:** authentication, rate limiting, caching, request size limits, RPC abuse protection, observability. Saat ini protection di level RPC/query, bukan complete public API security layer.

---

## 14. Dashboard

Functional prototype, bukan production app. Scanning blockchain per request tidak scalable.

**Production architecture needed:** Arc → Indexer/ingestion worker → Persistent DB → Signal Engine → API → Dashboard.

---

## 15. Trace-linked Mint

**Concept:** on-chain trace → deterministic derivation → artifact. Jauh lebih defensible dari random image mint.

**Status:** 🟢 concept, 🟡 production implementation pending.

---

## 16. Utility Roadmap

Segmented dengan benar:
- Off-chain (Signal Points, Credibility Tier) → backend/dashboard
- On-chain/token-gated → ditunda
- B2B Credibility API → future consideration

---

## 17. Dependency/Toolchain

**Issues:** Hardhat config ≠ package dependency declaration; compiler version ≠ single canonical compiler path. Risk: Hermes env ≠ local env ≠ CI env.

**Required:** Satu canonical version untuk Node, npm, Solidity, OpenZeppelin, Hardhat/Foundry — semua terkunci.

---

## 18. Package-lock / Dependency Source

Dependency resolution menggunakan HTTP mirror. Production blockchain software harus: HTTPS registry + integrity hash + lockfile + clean install.

---

## 19. Documentation Drift

Reconciliation report (BUILD_010) vs repo aktual (BUILD_026+). README/roadmap memiliki statement yang tertinggal.

**Required:** Pisahkan 3 dokumen:
- MASTER ROADMAP (planning)
- CURRENT SYSTEM STATE (snapshot)
- IMPLEMENTATION STATUS (tracking)

---

## 20. Secrets — Hard Rule

Tidak boleh ada private key, seed, API secret, deployment credentials di: Git, README, logs, artifacts, GitHub Actions output.

`DEV_WALLET_PRIVATE_KEY` hanya development/testnet. Mainnet wallet harus dipisah sepenuhnya.

---

## 21. Current Blocker Matrix

### 🔴 CRITICAL — JANGAN MAINNET
1. No independent smart-contract review yet
2. Public mint/economic contract belum final
3. Mainnet deployment architecture belum final
4. Signal semantics belum seluruhnya frozen
5. Canonical Signal ID perlu diperkuat
6. Historical state belum persistent untuk signal tertentu
7. Production API security belum selesai
8. Contract supply/admin model belum final

### 🟠 HIGH — SELESAIKAN SEBELUM LAUNCH
1. Canonical compiler version
2. Reproducible dependency installation
3. Hardhat/tooling dependency cleanup
4. Documentation reconciliation
5. Contract edge-case tests
6. Metadata immutability model
7. Mainnet wallet separation
8. Deployment verification procedure
9. Emergency/pause semantics
10. Public mint economics

### 🟡 MEDIUM
1. Dashboard scalability
2. API caching
3. Better indexing
4. Richer signal analytics
5. Agent API authentication
6. Observability
7. Historical database optimization

### 🟢 LOW / POST-MINT
1. Multi-chain adapters
2. Advanced AI interpretation
3. Sophisticated credibility system
4. Advanced holder utilities
5. Additional agentic utilities

---

## 22. Yang TIDAK Perlu Dilakukan

❌ Rewrite seluruh repository
❌ Pindah framework hanya karena terlihat lebih modern
❌ Membangun token / staking / DAO / marketplace / complex agent economy
❌ Multi-chain sekarang
❌ Membuat AI signal detector sebelum deterministic layer stabil

---

## 23. Recommended Remediation Order (R0–R13)

| Phase | Task |
|-------|------|
| R0 | CURRENT SYSTEM SNAPSHOT |
| R1 | REPRODUCIBLE DEVELOPMENT ENVIRONMENT |
| R2 | SIGNAL SPECIFICATION FREEZE |
| R3 | CANONICAL SIGNAL ID |
| R4 | PERSISTENT SIGNAL STATE |
| R5 | METADATA / PROVENANCE FREEZE |
| R6 | NFT CONTRACT HARDENING |
| R7 | CONTRACT TEST SUITE |
| R8 | FULL TESTNET E2E |
| R9 | MAINNET DEPLOYMENT PLAN |
| R10 | INDEPENDENT SECURITY REVIEW |
| R11 | FIX + RE-REVIEW |
| R12 | MAINNET |
| R13 | SMALL GENESIS MINT |

**Tidak ada public mint sebelum R10–R11 selesai.**

---

## 24. Genesis V1 Definition

```
TAPEBORN GENESIS
┌─────────────────────────────┐
│ Signal Intelligence         │
│                             │
│ Signal                      │
│ Evidence                    │
│ Provenance                  │
│ Artifact                    │
└──────────────┬──────────────┘
               │
               ▼
        Simple ERC-721
               │
               ▼
          Public Mint
```

**Tidak ada:** staking, token, yield, treasury logic, complex rewards, DAO, cross-chain.

---

## 25. Hermes Role After Audit

**Dari:** "build whatever is next" → **Ke:** "controlled implementation agent"

Setiap task Hermes **harus** punya template:
```
TASK: [ID] - [Judul]
ALLOWED FILES: [...]
FORBIDDEN FILES: [...]
EXPECTED BEHAVIOR: [...]
REQUIRED TESTS: [...]
ACCEPTANCE CRITERIA: [...]
SECURITY IMPACT: [...]
COMMIT FORMAT: BUILD_XXX: [deskripsi]
```

---

## 26. Status TapeBorn Saat Ini

```
TAPE BORN
                        │
             ┌──────────┴──────────┐
             │                     │
       INTELLIGENCE             ON-CHAIN
             │                     │
             ▼                     ▼
          🟢 75%                 🟡 50%
             │                     │
             └──────────┬──────────┘
                        │
                        ▼
                  PRODUCT MVP
                        │
                        ▼
                     🟡 65%
                        │
                        ▼
                 MAINNET / MINT
                        │
                        ▼
                     🔴 0%
```

*(Visualisasi status, bukan scoring formal)*

---

## 27. Kesimpulan Paling Jujur

> **Sebelumnya: BUILD → Sekarang: HARDEN → Selanjutnya: SECURE → Baru: LAUNCH**

TapeBorn sudah memiliki core system yang cukup nyata untuk diperlakukan seperti software production. Kita tidak perlu rebuild — kita perlu harden, reconcile, test, dan security-review.

**Audit ini bukan smart-contract security audit profesional.** Ini technical/system audit untuk menentukan readiness. External security review tetap gate sebelum public mainnet mint.

---

# PART B — HERMES REMEDIATION PLAN

## Task Template (Wajib untuk Semua Task Hermes)

```markdown
## TASK: [ID] - [Judul]

### ALLOWED FILES
- src/signal/*
- tests/signal/*
- docs/signal-spec.md

### FORBIDDEN FILES
- contracts/*
- deployment/*
- wallet/*

### EXPECTED BEHAVIOR
[Deskripsi perilaku yang diharapkan setelah change]

### REQUIRED TESTS
- [ ] Unit test X
- [ ] Integration test Y
- [ ] Behavioral test Z

### ACCEPTANCE CRITERIA
- [ ] Semua existing test PASS
- [ ] New test PASS
- [ ] Preflight ALL PASS
- [ ] build:010_dryrun SUCCESS

### SECURITY IMPACT
[Analisis dampak ke contract/API/state]

### COMMIT MESSAGE FORMAT
BUILD_XXX: [deskripsi singkat]
```

---

## R0 — CURRENT SYSTEM SNAPSHOT

**Goal:** Commit audit document + baseline state sebagai canonical reference.

| Item | Detail |
|------|--------|
| **Task ID** | R0_SNAPSHOT |
| **Allowed Files** | `TAPEBORN_SYSTEM_AUDIT_001.md`, `CURRENT_SYSTEM_STATE.md` |
| **Forbidden Files** | Semua file selain di atas |
| **Expected Behavior** | Audit document committed sebagai canonical reference; snapshot state recorded |
| **Required Tests** | - [ ] `git status` clean<br>- [ ] `npm run test` PASS<br>- [ ] `npm run preflight` PASS |
| **Acceptance Criteria** | Audit document accessible di repo; `git log --oneline -1` menunjukkan commit audit |
| **Security Impact** | Tidak ada (documentation only) |
| **Commit Format** | `AUDIT_001: Add system audit v0.1 + current system snapshot` |

**Dependencies:** None (starting point)

---

## R1 — REPRODUCIBLE DEVELOPMENT ENVIRONMENT

**Goal:** Single canonical toolchain (Node, npm, Solidity, OpenZeppelin, Hardhat) dengan lockfile integrity.

| Item | Detail |
|------|--------|
| **Task ID** | R1_REPRODUCIBLE_ENV |
| **Allowed Files** | `package.json`, `package-lock.json`, `hardhat.config.cjs`, `.nvmrc`, `.npmrc`, `Dockerfile` (optional) |
| **Forbidden Files** | `contracts/*`, `src/*`, `scripts/*`, `tests/*` |
| **Expected Behavior** | `npm ci` → identical `node_modules` di lokal/CI/Hermes; single solc version; HTTPS registry only |
| **Required Tests** | - [ ] `npm ci` succeeds clean<br>- [ ] `npx hardhat compile` succeeds<br>- [ ] `npm run test` PASS<br>- [ ] `npm run preflight` PASS |
| **Acceptance Criteria** | Lockfile integrity verified; no HTTP mirrors; single solc version in config |
| **Security Impact** | Supply chain reproducibility — mencegah dependency confusion |
| **Commit Format** | `BUILD_030: Lock reproducible development environment` |

**Dependencies:** R0

---

## R2 — SIGNAL SPECIFICATION FREEZE

**Goal:** Setiap signal punya definisi matematis eksplisit (YAML/JSON) yang frozen sebelum implementation.

| Item | Detail |
|------|--------|
| **Task ID** | R2_SIGNAL_SPEC_FREEZE |
| **Allowed Files** | `docs/signal-spec.yaml`, `src/signal/engine.js`, `tests/engine*.test.js`, `artifacts/build_019_signal_spec.json` |
| **Forbidden Files** | `contracts/*`, `deployment/*`, `wallet/*`, `scripts/build_010.js` |
| **Expected Behavior** | Setiap signal punya: definition, input, window, threshold, formula, evidence, confidence, FP/FN conditions, version. Implementation = spec. |
| **Required Tests** | - [ ] Spec file exists & valid YAML<br>- [ ] Implementation matches spec (tested via property-based tests)<br>- [ ] `npm run test` PASS<br>- [ ] `npm run build:010_dryrun` SUCCESS |
| **Acceptance Criteria** | Spec file canonical; zero deviation between spec & impl; all signal types covered |
| **Security Impact** | Signal integrity — mencegah semantic drift |
| **Commit Format** | `BUILD_031: Freeze signal specifications v1.0` |

**Dependencies:** R1

---

## R3 — CANONICAL SIGNAL ID

**Goal:** Ganti custom hash dengan `keccak256(canonicalSignalPayload)`.

| Item | Detail |
|------|--------|
| **Task ID** | R3_CANONICAL_SIGNAL_ID |
| **Allowed Files** | `src/metadata/schema.js`, `src/signal/engine.js`, `tests/signal-id.test.js`, `tests/contract-access-behavioral.test.cjs` |
| **Forbidden Files** | `contracts/*`, `deployment/*`, `wallet/*`, `scripts/build_012.js` |
| **Expected Behavior** | `generateSignalId()` → `sig_<keccak256(payload)>`; payload = chainId+type+block+txHash+logIndex+addr; deterministic, collision-resistant |
| **Required Tests** | - [ ] Same input → same ID<br>- [ ] Different txHash → different ID<br>- [ ] Different block → different ID<br>- [ ] No timestamp/randomness dependency<br>- [ ] All signal types produce valid ID<br>- [ ] `npm run test` PASS |
| **Acceptance Criteria** | Canonical ID used everywhere (metadata, NFT, API, provenance); old IDs migrated or deprecated |
| **Security Impact** | Identity integrity — backbone untuk NFT provenance, API, historical archive |
| **Commit Format** | `BUILD_032: Implement canonical Signal ID (keccak256)` |

**Dependencies:** R2

---

## R4 — PERSISTENT SIGNAL STATE

**Goal:** Ganti `lastSeenMap` in-memory dengan persistent storage (SQLite) untuk `address_reactivation` dan future signals.

| Item | Detail |
|------|--------|
| **Task ID** | R4_PERSISTENT_STATE |
| **Allowed Files** | `src/signal/engine.js`, `src/signal/state.js` (new), `package.json` (add better-sqlite3), `tests/engine.test.js` |
| **Forbidden Files** | `contracts/*`, `deployment/*`, `wallet/*` |
| **Expected Behavior** | Signal engine read/write state ke SQLite; survives process restart; `address_reactivation` accurate after restart |
| **Required Tests** | - [ ] State persists across process restart<br>- [ ] `address_reactivation` accurate after restart<br>- [ ] Concurrent access safe<br>- [ ] `npm run test` PASS |
| **Acceptance Criteria** | Zero signal accuracy loss after restart; SQLite file in `.data/` (gitignored) |
| **Security Impact** | Signal accuracy — mencegah false positive/negative reactivation |
| **Commit Format** | `BUILD_033: Add persistent signal state (SQLite)` |

**Dependencies:** R2, R3

---

## R5 — METADATA / PROVENANCE FREEZE

**Goal:** Explicit ON-CHAIN FACTS vs DERIVED INTERPRETATION distinction; immutable fields locked.

| Item | Detail |
|------|--------|
| **Task ID** | R5_METADATA_FREEZE |
| **Allowed Files** | `src/metadata/schema.js`, `docs/metadata-spec.yaml`, `tests/signal-id.test.js`, `scripts/build_011.js` |
| **Forbidden Files** | `contracts/*`, `deployment/*` |
| **Expected Behavior** | Metadata schema v1.1 dengan explicit `immutable: true/false` per field; validation enforces immutability |
| **Required Tests** | - [ ] Immutable fields rejected on modification<br>- [ ] Mutable fields accept updates<br>- [ ] Schema validation PASS<br>- [ ] `npm run test` PASS |
| **Acceptance Criteria** | Schema v1.1 canonical; immutable fields documented & enforced |
| **Security Impact** | Provenance integrity — mencegah historical revisionism |
| **Commit Format** | `BUILD_034: Freeze metadata schema v1.1 with immutability model` |

**Dependencies:** R3

---

## R6 — NFT CONTRACT HARDENING

**Goal:** Contract production-ready dengan edge-case coverage, supply model final, pause semantics clear.

| Item | Detail |
|------|--------|
| **Task ID** | R6_CONTRACT_HARDENING |
| **Allowed Files** | `contracts/SignalArtifact.sol`, `scripts/build_010.js`, `hardhat.config.cjs` |
| **Forbidden Files** | `src/*` (except metadata), `scripts/build_009.js`, `scripts/build_012.js`, `scripts/build_020.js` |
| **Expected Behavior** | Contract dengan: MAX_SUPPLY (configurable), mintPaused (explicit), edge-case guards, explicit pause semantics, owner lifecycle tested |
| **Required Tests** | - [ ] All edge-case tests PASS (see §9)<br>- [ ] `npm run test` PASS<br>- [ ] `npm run build:010_dryrun` SUCCESS<br>- [ ] Coverage ≥ 95% |
| **Acceptance Criteria** | Contract passes independent review checklist; supply/admin model documented & final |
| **Security Impact** | Contract security — primary asset protection |
| **Commit Format** | `BUILD_035: Harden SignalArtifact contract v2.0` |

**Dependencies:** R3, R5

---

## R7 — CONTRACT TEST SUITE

**Goal:** Comprehensive test suite (unit + behavioral + fuzz + integration) untuk contract.

| Item | Detail |
|------|--------|
| **Task ID** | R7_CONTRACT_TEST_SUITE |
| **Allowed Files** | `tests/contract-*.test.cjs`, `hardhat.config.cjs`, `contracts/SignalArtifact.sol` |
| **Forbidden Files** | `src/orchestrator/*`, `scripts/build_009.js`, `scripts/build_012.js`, `scripts/build_020.js` |
| **Expected Behavior** | Test suite: unit (ABI), behavioral (deploy+mint+pause), fuzz (foundry/hardhat), integration (deploy+mint+transfer), edge-case coverage ≥ 95% |
| **Required Tests** | - [ ] Unit tests PASS<br>- [ ] Behavioral tests PASS (existing 14 + new edge cases)<br>- [ ] Fuzz tests PASS<br>- [ ] Integration tests PASS<br>- [ ] Coverage ≥ 95% |
| **Acceptance Criteria** | All tests PASS; coverage report generated; no skipped tests |
| **Security Impact** | Regression prevention — contract behavior verified |
| **Commit Format** | `BUILD_036: Complete contract test suite (≥95% coverage)` |

**Dependencies:** R6

---

## R8 — FULL TESTNET E2E

**Goal:** End-to-end testnet deployment + mint + verify + API + dashboard.

| Item | Detail |
|------|--------|
| **Task ID** | R8_TESTNET_E2E |
| **Allowed Files** | `scripts/build_010.js`, `scripts/build_010_dryrun.js`, `scripts/build_012.js`, `scripts/build_020.js`, `scripts/preflight-mainnet.js`, `.env.testnet` (template) |
| **Forbidden Files** | `contracts/*` (already frozen), `deployment/mainnet/*` |
| **Expected Behavior** | Full pipeline: deploy → mint → verify provenance → API query → dashboard render → all PASS |
| **Required Tests** | - [ ] `npm run build:010_dryrun` PASS<br>- [ ] Real deploy testnet (manual, funded wallet)<br>- [ ] Mint → verify on explorer<br>- [ ] API `/signals` returns minted signal<br>- [ ] Dashboard renders signal<br>- [ ] Preflight ALL PASS |
| **Acceptance Criteria** | End-to-end testnet run documented dengan tx hashes; zero manual intervention gaps |
| **Security Impact** | Deployment procedure validated — mencegah mainnet surprises |
| **Commit Format** | `BUILD_037: Full testnet E2E validation` |

**Dependencies:** R6, R7

---

## R9 — MAINNET DEPLOYMENT PLAN

**Goal:** Documented, rehearsed, verified deployment procedure.

| Item | Detail |
|------|--------|
| **Task ID** | R9_DEPLOYMENT_PLAN |
| **Allowed Files** | `DEPLOYMENT_PLAN.md`, `scripts/preflight-mainnet.js`, `scripts/build_010.js`, `.env.mainnet.template` |
| **Forbidden Files** | `contracts/*`, `src/*`, `tests/*` |
| **Expected Behavior** | Step-by-step plan: wallet creation → funding → preflight → deploy → verify → API update → monitoring. Checklist dengan rollback procedure. |
| **Required Tests** | - [ ] Plan reviewed by 2+ team members<br>- [ ] Dry-run checklist PASS<br>- [ ] Rollback procedure documented<br>- [ ] Emergency contacts listed |
| **Acceptance Criteria** | Plan executable tanpa improvisation; rollback tested di testnet |
| **Security Impact** | Operational safety — mencegah deployment errors |
| **Commit Format** | `BUILD_038: Mainnet deployment plan v1.0` |

**Dependencies:** R8

---

## R10 — INDEPENDENT SECURITY REVIEW

**Goal:** Professional third-party smart contract audit.

| Item | Detail |
|------|--------|
| **Task ID** | R10_SECURITY_REVIEW |
| **Allowed Files** | `contracts/SignalArtifact.sol`, `DEPLOYMENT_PLAN.md`, `SECURITY_REVIEW_SCOPE.md` |
| **Forbidden Files** | Semua file implementasi (audit scope = contract only) |
| **Expected Behavior** | Engage reputable auditor (OpenZeppelin, Trail of Bits, Spearbit, atau equivalent). Scope: contract + deployment script. Deliverable: report + fix verification. |
| **Required Tests** | - [ ] Auditor engaged & scope agreed<br>- [ ] Report received<br>- [ ] All CRITICAL/HIGH findings fixed<br>- [ ] Fixes re-verified by auditor |
| **Acceptance Criteria** | Auditor sign-off; zero CRITICAL/HIGH findings; report archived |
| **Security Impact** | **Gate sebelum public mainnet mint** — external validation |
| **Commit Format** | `BUILD_039: Security audit completed & fixes applied` |

**Dependencies:** R9 (deployment plan ready for auditor context)

---

## R11 — FIX + RE-REVIEW

**Goal:** Apply auditor fixes, re-verify, re-test.

| Item | Detail |
|------|--------|
| **Task ID** | R11_FIX_REREVIEW |
| **Allowed Files** | `contracts/SignalArtifact.sol`, `tests/contract-*.test.cjs`, `scripts/build_010.js` |
| **Forbidden Files** | `src/orchestrator/*`, `scripts/build_009.js`, `scripts/build_012.js`, `scripts/build_020.js` |
| **Expected Behavior** | All auditor findings addressed; tests updated; re-verification PASS |
| **Required Tests** | - [ ] All auditor fixes applied<br>- [ ] All tests PASS<br>- [ ] Coverage maintained ≥ 95%<br>- [ ] Auditor re-verification PASS |
| **Acceptance Criteria** | Zero unresolved findings; contract re-certified |
| **Security Impact** | Final contract certification |
| **Commit Format** | `BUILD_040: Apply security audit fixes & re-verify` |

**Dependencies:** R10

---

## R12 — MAINNET DEPLOYMENT

**Goal:** Execute deployment plan dengan real mainnet wallet.

| Item | Detail |
|------|--------|
| **Task ID** | R12_MAINNET_DEPLOY |
| **Allowed Files** | `scripts/build_010.js`, `scripts/preflight-mainnet.js`, `.env.mainnet` (runtime only, not committed) |
| **Forbidden Files** | `contracts/*` (frozen), `src/*`, `tests/*`, `scripts/build_009.js`, `scripts/build_012.js`, `scripts/build_020.js` |
| **Expected Behavior** | Deploy dengan dedicated mainnet wallet (multi-sig preferred); verify on explorer; update API config; announce |
| **Required Tests** | - [ ] Preflight ALL PASS (mainnet RPC)<br>- [ ] Deploy tx confirmed<br>- [ ] Contract verified on explorer<br>- [ ] API points to mainnet contract<br>- [ ] Monitoring active |
| **Acceptance Criteria** | Contract live on Arc Mainnet; verified; API operational; monitoring green |
| **Security Impact** | Production deployment — irreversible |
| **Commit Format** | `BUILD_041: Mainnet deployment — SignalArtifact live` |

**Dependencies:** R11 (auditor sign-off), R9 (plan rehearsed)

---

## R13 — SMALL GENESIS MINT

**Goal:** First public genesis mint dengan controlled rollout.

| Item | Detail |
|------|--------|
| **Task ID** | R13_GENESIS_MINT |
| **Allowed Files** | `scripts/build_010.js`, `scripts/build_010_dryrun.js`, `artifacts/genesis_collection.json` |
| **Forbidden Files** | `contracts/*`, `src/*`, `scripts/build_009.js`, `scripts/build_012.js`, `scripts/build_020.js` |
| **Expected Behavior** | Controlled genesis mint (allowlist/FCFS/auction per plan); metadata uploaded; provenance recorded; holders notified |
| **Required Tests** | - [ ] Mint transaction successful<br>- [ ] Metadata accessible<br>- [ ] Provenance verifiable<br>- [ ] Holder communication sent |
| **Acceptance Criteria** | Genesis NFT minted & distributed per plan; provenance complete |
| **Security Impact** | First public mint — reputational & operational |
| **Commit Format** | `BUILD_042: Genesis mint executed` |

**Dependencies:** R12

---

## Execution Rules

1. **Sequential only** — R(n+1) tidak dimulai sebelum Rn acceptance criteria terpenuhi.
2. **No scope creep** — Setiap task hanya menyentuh ALLOWED FILES.
3. **Test-first** — Tests ditulis/diperbarui sebelum/bersamaan implementation.
4. **Commit per task** — Satu commit per task dengan format yang ditentukan.
5. **Stop condition** — Jika acceptance criteria gagal, STOP, fix, re-test. Lanjut hanya kalau PASS.

---

## Progress Tracking

| Phase | Task | Status | Commit |
|-------|------|--------|--------|
| R0 | Current System Snapshot | ⬜ Pending | — |
| R1 | Reproducible Dev Environment | ⬜ Pending | — |
| R2 | Signal Spec Freeze | ⬜ Pending | — |
| R3 | Canonical Signal ID | ⬜ Pending | — |
| R4 | Persistent Signal State | ⬜ Pending | — |
| R5 | Metadata/Provenance Freeze | ⬜ Pending | — |
| R6 | NFT Contract Hardening | ⬜ Pending | — |
| R7 | Contract Test Suite | ⬜ Pending | — |
| R8 | Full Testnet E2E | ⬜ Pending | — |
| R9 | Mainnet Deployment Plan | ⬜ Pending | — |
| R10 | Independent Security Review | ⬜ Pending | — |
| R11 | Fix + Re-review | ⬜ Pending | — |
| R12 | Mainnet Deployment | ⬜ Pending | — |
| R13 | Small Genesis Mint | ⬜ Pending | — |

---

*End of TAPEBORN_SYSTEM_AUDIT_001 — Part A & Part B*