# TapeBorn — Master Roadmap

> This file is the canonical reference for all TapeBorn milestones (BUILD_001 through BUILD_023) plus FORENSIC REMEDIATION phases (R1-R9).

## Milestone Summary

| Build | Description | Status |
|-------|-------------|--------|
| BUILD_001 | Initial commit | DONE |
| BUILD_002 | Arc RPC reader — verified block 60,241,937 on chain 5042002 | DONE |
| BUILD_003 | Block reader — 173 tx inspected at block 60,244,318 (4 contract creations in sample) | DONE |
| BUILD_004 | Transaction reader — 3 tx + receipts, 10 logs decoded at block 60,246,719 | DONE |
| BUILD_005 | Event reader — decoded 157 Transfer events, 21 Approvals from 227 logs | DONE |
| BUILD_006 | USDC flow — 14 transfers, 70.58 USDC volume across 6 blocks | DONE |
| BUILD_007 | Wallet activity — 255 wallets, 447 tx, 108.86 USDC volume across 16 blocks | DONE |
| BUILD_008 | Signal Engine v0 — contract creation detector, 1 signal from 10 blocks | DONE |
| BUILD_009 | Signal Feed | NOT VERIFIED IN COMMIT HISTORY — kemungkinan gap tidak terdokumentasi |
| BUILD_010 | First Signal Artifact (dry-run) — generated metadata for contract creation signal | DONE |
| BUILD_011 | Metadata system — provenance and Signal ID | DONE |
| BUILD_011.1 | Harden provenance timestamp integrity | DONE |
| BUILD_012 | Add public signal dashboard | NOT IMPLEMENTED |
| BUILD_013 | Add reliability layer | NOT IMPLEMENTED |
| BUILD_014 | Add Arc mainnet readiness | PARTIALLY VERIFIED |
| BUILD_015 | Finalize Genesis Collection | DONE |
| BUILD_016 | Mainnet readiness and deployment hardening | BLOCKED (3 blockers) |
| BUILD_017 | Post-launch intelligence and chain evaluation | NOT IMPLEMENTED |
| BUILD_018 | Signal Intelligence v1 | NOT IMPLEMENTED |
| BUILD_019 | Signal Expansion — add 4 new signal types | PARTIALLY VERIFIED |
| BUILD_020 | Add read-only agent interface | NOT IMPLEMENTED |
| BUILD_021 | Roadmap Gap Analysis | NOT IMPLEMENTED |
| BUILD_022.1 | Harden mainnet deployment gate | PARTIALLY VERIFIED |
| BUILD_023 | Agent Hardening + Documentation Reconciliation | PARTIALLY VERIFIED |

## FORENSIC REMEDIATION PHASES (R1-R9)

Following the TAPEBORN FULL FORENSIC AUDIT (2026-09-19), nine remediation phases were executed.

| Phase | Commit | Description | Status |
|-------|--------|-------------|--------|
| R1 | `e201bbd` | REMEDIATION_002: fix USDC decimal handling (18→6) | VERIFIED |
| R2 | `ad00481` | REMEDIATION_003: unify SignalArtifact deployment source | VERIFIED |
| R3 | `cfa830f` | REMEDIATION_004: remove USDC placeholder address | PARTIALLY VERIFIED |
| R4 | `1865660` | REMEDIATION_005: transaction + reorg safety | VERIFIED |
| R5 | `f2a8719` | REMEDIATION_006: fix canonical signal identity | VERIFIED |
| R6 | `cb8fe6f` | REMEDIATION_011/012: confidence rules + tests | VERIFIED |
| R7 | `1865660` | REMEDIATION_013/014: signal persistence + reorg lifecycle | VERIFIED |
| R8 | `e583af8` | REMEDIATION_015/016: real rolling chain average (USDC Transfer events) | VERIFIED |
| R9 | `485cdbf` | REMEDIATION_017/018: chain average semantic fix + reorg state machine | VERIFIED |
| R9b | `6d3d902` | REMEDIATION_021/022/023/024: adversarial precision + semantic verification | VERIFIED |

## Notes

### BUILD_009 — Unverified Gap

BUILD_009 (Signal Feed) was never found in commit history. Marked as NOT VERIFIED IN COMMIT HISTORY — kemungkinan gap tidak terdokumentasi.

### BUILD_021 — Intentional Gap

BUILD_021 was designated as a "Roadmap Gap Analysis" milestone. It was intentionally left **NOT IMPLEMENTED** to serve as an explicit marker in the roadmap sequence. This gap documents that the project team evaluated the roadmap for missing phases and chose to record the evaluation point without producing a separate deliverable.

### Milestone Status Definitions

| Status | Meaning |
|--------|---------|
| DONE | Implemented, tested, and verified in production/testnet |
| VERIFIED | Implementation + spec compliance + relevant tests + persistence evidence |
| PARTIALLY VERIFIED | Some evidence but incomplete; specific gaps documented |
| PARTIALLY VERIFIED (BUILD milestones) | Implementation exists but not fully verified per spec |
| NOT IMPLEMENTED | Absent; no code exists |
| BLOCKED | Dependency/external decision required |
| NOT VERIFIED IN COMMIT HISTORY | Claim exists but no commit evidence found |

### Utility Roadmap

Planned holder utilities (Signal Points, Trace-linked Mint, Token-gated API) are tracked separately in [UTILITY_ROADMAP.md](UTILITY_ROADMAP.md). All items there are in **PLANNED** status and are not yet implemented.

---

## FORENSIC FINDINGS SUMMARY (R1-R9)

| Finding | Original Severity | Status | Key Evidence |
|---------|------------------|--------|--------------|
| Missing decoder / normalization | P0 | **VERIFIED** | `src/signal/normalizer.js` + 28 tests |
| USDC decimals (18→6) | P1 | **VERIFIED** | `CONFIG.usdcDecimals=6` + adversarial tests |
| USDC address placeholder | P1 | **PARTIALLY VERIFIED** | Per-network config, mainnet still placeholder |
| BUILD_010 contract divergence | P1 | **VERIFIED** | Single source: `contracts/SignalArtifact.sol` |
| Transaction receipt handling | P1 | **VERIFIED** | Reverted txs skipped, receipt validation |
| Reorg handling | P1/P2 | **VERIFIED** | Block hashes + invalidation + replacement |
| Signal ID collision | P2 | **VERIFIED** | Type-specific provenance, null txHash for HFW/WB |
| Chain average volume | P2 | **VERIFIED** | Real rolling 100-block avg from USDC Transfer events |
| Confidence logic | P2 | **VERIFIED** | Per-spec `computeConfidence()` + 28 tests |
| Orchestrator test coverage | P3 | **PARTIALLY VERIFIED** | Networks (15), validator missing |
| Contract admin model | P2 | **BLOCKED** | Single owner, no timelock/multisig |
| Mainnet deployment claim | P2 | **BLOCKED** | Dry-run only, not independently verified |

**All remediation tests: 344 PASS / 0 FAIL**

---

## CURRENT GATES

```
DEVELOPMENT: GO
TESTNET: GO
MAINNET: BLOCKED
```

**Mainnet Blockers:**
1. Mainnet USDC address placeholder
2. Single-owner admin (no timelock/multisig)
3. Mainnet deployment claim not independently verified

---

*MASTER_ROADMAP.md — Canonical milestone reference for TapeBorn Intelligence.*