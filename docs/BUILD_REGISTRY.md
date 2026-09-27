# TapeBorn — Canonical BUILD Registry

> **STATUS: CANONICAL (2026-09-27).** This document is the single source of truth for BUILD
> numbering. It was produced by the repository canonicalization + forensic remediation pass.
>
> **RULES (immutable):**
> 1. Historical BUILD numbers are **immutable** — never rename or renumber historical commits.
> 2. A BUILD number **already used by any era/workstream is occupied forever** — future builds
>    must not reuse it.
> 3. **Next BUILD number = highest number used anywhere + 1, pending founder ruling.**
>    The highest number used anywhere is **BUILD_037** (era-1 / SIGNAL remediation, `3a06ba6`).
>    Therefore the next available number is **BUILD_038**. **DO NOT assign it yet** — the
>    registry must be canonical first (it is now) and the founder must rule on what the next
>    production stage constitutes.
> 4. Era-1 vs era-2 collisions are **documented, not resolved by renaming**. Ambiguity is
>    resolved by context: the file/commit/workstream a number appears in.

---

## The Collision (ERA-1 vs ERA-2)

TapeBorn ran **two numbering schemes** over its lifetime:

| Era | Workstream | Numbers used |
|-----|-----------|--------------|
| **ERA 1 / SIGNAL** | On-chain intelligence pipeline (BLOCK_001-023) + forensic hardening sprint | BUILD_024, BUILD_026, BUILD_029, BUILD_030 ... BUILD_037 (+ REMEDIATION_002-024) |
| **ERA 2 / NFT** | Production NFT collection (specs → contract → 204-test closure) | BUILD_024, BUILD_025, BUILD_026, BUILD_027, BUILD_028A, BUILD_028A-R, BUILD_028A-EIP712, BUILD_028A-EIP712-R5, BUILD_028B |

The two eras **independently used** BUILD_024 and BUILD_026 for different work:
- **BUILD_024 (ERA-1)** = preflight mainnet RPC check order fix (`11d18a2`)
- **BUILD_024 (ERA-2)** = NFT intelligence bridge spec (`docs/BUILD_024_NFT_INTELLIGENCE_BRIDGE.md`)
- **BUILD_026 (ERA-1)** = Ownable + Pausable access control on SignalArtifact (`e58a2af`)
- **BUILD_026 (ERA-2)** = Utility product spec (`docs/BUILD_026_UTILITY_PRODUCT_SPECIFICATION.md`)

**Known fact (founder-confirmed):** BUILD_033 is already occupied by the SQLite signal-state work
(commit `ff6cbd6`, "BUILD_033: Persistent signal state with SQLite (R4)").

---

## Canonical Registry — ERA 1 / SIGNAL

| BUILD | Commit (40-char via git) | Description | Status | Notes |
|-------|--------------------------|-------------|--------|-------|
| BUILD_001-008 | `30ef395` ... `75d873b` | Reader/engine milestones 1-8 | DONE | See MASTER_ROADMAP |
| BUILD_009 | — (no commit) | Signal Feed | NOT VERIFIED IN COMMIT HISTORY | Intentional gap; `scripts/build_009.js` exists (era-1 feed implementation, committed under BUILD_010 dry-run `c960025`) |
| BUILD_010 | `c960025`, `def33bf` | First Signal Artifact (dry-run) + deploy | DONE (testnet, unverified provenance) | F-04 UNVERIFIED |
| BUILD_011 | `eed6f4c`, `58e2790` | Metadata system + provenance | DONE | |
| BUILD_011.1 | `58e2790` | Harden provenance timestamp integrity | DONE | |
| BUILD_012 | `f7dcd31` | Public signal dashboard (`scripts/build_012.js`) | DONE (implementation exists) | README "NOT IMPLEMENTED" was stale — fixed 2026-09-27 |
| BUILD_013 | `91a470c` | Reliability layer (retry/rateLimit) | DONE (implementation exists) | README "NOT IMPLEMENTED" was stale — fixed 2026-09-27 |
| BUILD_014 | `2aa6140` | Arc mainnet readiness | PARTIALLY VERIFIED | |
| BUILD_015 | `707483a` | Finalize Genesis Collection | DONE | |
| BUILD_016 | `ad6006f` | Mainnet readiness + deployment hardening | BLOCKED | |
| BUILD_017 | `c9f3d30` | Post-launch intelligence + chain eval (`scripts/build_017_usage.js`) | DONE (implementation exists) | README "NOT IMPLEMENTED" was stale — fixed 2026-09-27 |
| BUILD_018 | `b579664` | Signal Intelligence v1 | DONE (implementation exists) | README "NOT IMPLEMENTED" was stale — fixed 2026-09-27 |
| BUILD_019 | `7e45893` | Signal Expansion (4 new signal types) | DONE | |
| BUILD_020 | `a4023de` | Read-only agent interface (`scripts/build_020.js`) | DONE (implementation exists) | README "NOT IMPLEMENTED" was stale — fixed 2026-09-27 |
| BUILD_021 | — (intentional) | Roadmap Gap Analysis | NOT IMPLEMENTED (intentional) | |
| BUILD_022.1 | `14647cf` | Harden mainnet deployment gate | PARTIALLY VERIFIED | |
| BUILD_023 | `7d1c606` | Agent interface hardening + doc reconciliation | PARTIALLY VERIFIED | |
| **BUILD_024** ⚠ | `11d18a2` | Fix preflight mainnet RPC check order | DONE | **COLLIDES with ERA-2 BUILD_024 (NFT bridge spec)** |
| **BUILD_026** ⚠ | `e58a2af` | Ownable + Pausable access control | DONE | **COLLIDES with ERA-2 BUILD_026 (utility product spec)** |
| BUILD_029 | `57648c5` | Behavioral access-control tests | DONE | |
| BUILD_030 (R1) | `553e090` | Lock reproducible dev environment | VERIFIED | |
| BUILD_031 (R2) | `559fdd5` | Freeze signal specifications v1.0.0 | VERIFIED | |
| BUILD_032 (R3) | `893f7a6` | Canonical Signal ID with keccak256 | VERIFIED | |
| **BUILD_033 (R4)** | `ff6cbd6` | **Persistent signal state with SQLite** | VERIFIED | **OCCUPIED — never reuse** |
| BUILD_034 (R5) | `3c8f2d6` | Freeze smart contract admin model | VERIFIED | |
| BUILD_035 (R6) | `062e881` | Adversarial testing suite | VERIFIED | |
| BUILD_036 (R7) | `79e9f1a` | Production infrastructure hardening | VERIFIED | |
| BUILD_037 (R8) | `3a06ba6` | Independent security review preparation | VERIFIED | **HIGHEST NUMBER ANYWHERE** |

### ERA-1 REMEDIATION phases (distinct from BUILD numbers)

| Phase | Commit | Description | Status |
|-------|--------|-------------|--------|
| REMEDIATION_002 (R1) | `e201bbd` | Fix USDC decimal handling (18→6) | VERIFIED |
| REMEDIATION_003 (R2) | `ad00481` | Unify SignalArtifact deployment source | VERIFIED |
| REMEDIATION_004 (R3) | `cfa830f` | Remove USDC placeholder address | PARTIALLY VERIFIED |
| REMEDIATION_005 (R4) | `1865660` | Transaction + reorg safety | VERIFIED |
| REMEDIATION_006 (R5) | `f2a8719` | Fix canonical signal identity | VERIFIED |
| REMEDIATION_011/012 (R6) | `cb8fe6f` | Confidence rules + tests | VERIFIED |
| REMEDIATION_013/014 (R7) | `e583af8` (first half) | Signal persistence + reorg lifecycle | VERIFIED |
| REMEDIATION_015/016 (R8) | `e583af8` (second half) | Real rolling chain average (USDC Transfer events) | VERIFIED |
| REMEDIATION_017/018 (R9) | `485cdbf` | Chain average semantic fix + reorg state machine | VERIFIED |
| REMEDIATION_021-024 (R9b) | `6d3d902` | Adversarial precision + semantic verification | VERIFIED |

> **R4/R7 hash note (F-13):** MASTER_ROADMAP previously listed R7 = `1865660` (duplicate of R4).
> Corrected 2026-09-27 to R7 = `e583af8`, independently confirmed: commit `e583af8` message =
> "REMEDIATION_013/014/015/016: signal persistence + reorg lifecycle + real rolling chain average".

---

## Canonical Registry — ERA 2 / NFT

| BUILD | Commit | Description | Status | Notes |
|-------|--------|-------------|--------|-------|
| **BUILD_024** ⚠ | spec only (committed `8ece175`) | NFT intelligence bridge | CLOSED (spec) | **COLLIDES with ERA-1 BUILD_024 (preflight fix)** |
| BUILD_025 | spec only (committed `8ece175`) | NFT core specification (739 lines) | CLOSED (spec) | |
| **BUILD_026** ⚠ | spec only (committed `8ece175`) | Utility product specification (667 lines) | CLOSED (spec) | **COLLIDES with ERA-1 BUILD_026 (access control)** |
| BUILD_027 | spec only (committed `8ece175`) | Metadata architecture (738 lines) | CLOSED (spec) | |
| BUILD_028A | spec + audit (committed `8ece175`) | Production NFT contract architecture | CLOSED (spec) | |
| BUILD_028A-R | `8ece175` | Contract decision lock (1219 lines) | CLOSED (rank-2 lock) | |
| BUILD_028A-EIP712 | `8ece175` | EIP-712 claim specification (888 lines) | CLOSED (spec) | Heading "# 31." numbering discontinuity fixed 2026-09-27 (F-14, doc hygiene only) |
| BUILD_028A-EIP712-R5 | `8ece175` (+1 line `b212cd8`) | **RANK-1 FOUNDER DECISION LOCK** (673 lines) | CLOSED (rank-1 authority) | |
| **BUILD_028B** | `ecedd0b` (feat), `f09fa32` (impl report), `b212cd8` (fix), `8ece175` (closure) | **Production NFT contract + 75-test suite** | **FROZEN / FULLY CLOSED** | 204/204 tests (75+80+49). Contract is FROZEN — no changes without a genuine security finding |

---

## Future Numbering Rule

1. Next production stage = **BUILD_038** (highest used anywhere BUILD_037 + 1). **Do not
   assign BUILD_038 until the founder rules on what that stage is.**
2. All new BUILDs must check this registry first. A number appearing in **either** era table
   is occupied.
3. Remediation phases remain named `REMEDIATION_N` / `R<N>` and do not consume BUILD numbers.
4. Historical commits are immutable; collisions are resolved by context, never renaming.

---

## Engineering History / Audit Trail

For the complete engineering chronology, audit trail, and remediation registry, see:

- **Engineering Ledger:** `docs/ENGINEERING_LEDGER.md` — Master chronology (Layer A), BUILD collision reconciliation (Layer B), audit→finding→fix graph (Layer C), current open state (Layer D), provenance rules (Layer E)
- **Audit Registry:** `docs/AUDIT_REGISTRY.md` — Canonical index of all audits, reconciliations, on-chain verifications, closure reviews, and canonicalization passes
- **Remediation Registry:** `docs/REMEDIATION_REGISTRY.md` — Complete finding→remediation→verification chain for F-01..F-22, GAP-A..GAP-H, SG-01..SG-07, and REMEDIATION_002..024
