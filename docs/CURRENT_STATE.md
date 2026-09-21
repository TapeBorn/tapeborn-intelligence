# CURRENT_STATE.md

**TapeBorn — Canonical Current State**

**Updated:** 2026-09-21
**Commit:** `5909446` (DOC: sync README + MASTER_ROADMAP)
**Branch:** main

---

## SYSTEM DEFINITION

**TapeBorn = Intelligence Layer + Signal Artifact Infrastructure (Genesis Experimental)**

### IMPLEMENTED & VERIFIED

| Component | Details |
|-----------|---------|
| **Blockchain Reader** | Arc RPC client (testnet 5042002), retry/rate-limit/validation, 10/10 preflight |
| **Signal Engine** | 7 detectors: contract_creation, large_transfer, high_frequency, contract_interaction, wallet_burst, token_flow_anomaly, address_reactivation |
| **Signal Feed** | HTTP API :3456, 331 signals / 20 blocks |
| **Evidence/Provenance** | Deterministic Signal ID, metadata schema v1.0.0 |
| **Persistence** | SQLite + in-memory lastSeenMap |
| **Reorg Handling** | Block hashes, invalidation, replacement, adversarial tests (49/49 PASS) |
| **SignalArtifact.sol** | ERC721 + Ownable + Pausable, mintPaused, MAX_SUPPLY configurable |
| **Genesis Deployment** | Arc Testnet `0x80B87fa686C8FC91A5252854E82ea282c1B6b814` (chain 5042002) |
| **Genesis Mint** | Token ID 0, Signal ID `sig_454539d0`, source block 60347218 |
| **Behavioral Tests** | 14 Hardhat tests PASS (on-chain revert behavior) |

### PARTIALLY IMPLEMENTED / VERIFIED

| Component | Status | Gap |
|----------|--------|-----|
| Persistent State | SQLite implemented | lastSeenMap still in-memory |
| Signal ID | Custom hash | Needs canonical keccak256 |
| Metadata Immutability | Schema v1.0.0 | Not explicit |
| Token Flow Anomaly | Implemented | Uses fixed threshold (not dynamic) |
| Orchestrator Validator | Missing | Networks tested, validator not |
| Control Plane (testnet) | Deployed & role-separated | Treasury Safe not deployed |

### NOT IMPLEMENTED / NOT STARTED

| Component | Status |
|----------|--------|
| **Treasury Safe (testnet)** | NOT DEPLOYED |
| **Admin Safe (2-of-3)** | NOT DEPLOYED |
| **Production 24h Timelock** | NOT DEPLOYED |
| **Production NFT Contract** | NOT STARTED (OD-P) |
| **Final Mint Authority** | NOT STARTED (OD-P) |
| **Metadata Architecture** | NOT STARTED (OD-Meta) |
| **Production Custody** | NOT STARTED |
| **Independent Security Audit** | NOT ENGAGED |
| **Monitoring/Alerting** | NOT IMPLEMENTED |
| **Incident Response Runbook** | NOT CREATED |
| **Public Signal Dashboard** | NOT IMPLEMENTED |
| **Final NFT Collection / Art / Lore** | NOT IMPLEMENTED |
| **Holder Utility / Website / Community** | NOT IMPLEMENTED |

---

## SIGNAL ARTIFACT STATUS

| Property | Value |
|----------|-------|
| **Layer** | Genesis Experimental Layer |
| **Contract** | `SignalArtifact.sol` (ERC721 + Ownable + Pausable) |
| **Network** | Arc Testnet (5042002) |
| **Address** | `0x80B87fa686C8FC91A5252854E82ea282c1B6b814` |
| **Genesis Mint** | Token ID 0, `sig_454539d0` |
| **Mint Policy** | Admin-only, mintPaused configurable |
| **Max Supply** | Unlimited (MAX_SUPPLY configurable) |

**NOT** the final public TapeBorn collection.

---

## TESTNET CONTROL PLANE (Verified)

| Contract | Address |
|----------|---------|
| TimelockController | `0xb1937d3f88d40dB94CfE56a890A53213cc582e36` |
| TapeBornControlPlaneTest | `0x07602D7Da6602F538A4e6BBf89987AfC776F9c62` |

### Role Separation (17/17 Negative Tests PASS)

| Role | Timelock | Admin Safe | Guardian | Deployer |
|------|----------|------------|----------|----------|
| Owner | YES | NO | NO | NO |
| DEFAULT_ADMIN_ROLE | YES | NO | NO | NO |
| PAUSER_ROLE | NO | NO | YES | NO |
| GUARDIAN_ADMIN_ROLE | NO | YES | NO | NO |
| TIMELOCK PROPOSER | N/A | YES | NO | NO |
| TIMELOCK CANCELLER | N/A | YES | NO | NO |

### Guardian Capabilities
- ✅ CAN: `pause()`
- ✅ CANNOT: `unpause()`, any admin function, role management, ownership transfer

---

## CP-01 through CP-12 (Approved Production Architecture)

| CP | Decision |
|----|----------|
| CP-01 | Multisig + Timelock + Emergency Guardian |
| CP-02 | Admin Multisig = 3 signers |
| CP-03 | Admin threshold = 2-of-3 |
| CP-04 | Timelock enabled |
| CP-05 | Timelock delay = 24 hours |
| CP-06 | Emergency Guardian enabled |
| CP-07 | Guardian = pause only |
| CP-08 | Treasury = separate 2-of-3 multisig |
| CP-09 | renounceOwnership() disabled |
| CP-10 | Two-step ownership transfer |
| CP-11 | Deployment wallet separate |
| CP-12 | Emergency: Guardian pause → investigation → multisig resolution → mitigation → verification → multisig unpause → monitoring |

---

## UNRESOLVED FOUNDER DECISIONS

| ID | Decision | Status |
|----|----------|--------|
| OD-G | Guardian 1-of-1 vs 1-of-2 | OPEN |
| OD-R | Quorum-loss recovery model | OPEN |
| OD-C | Final production blockchain | OPEN |
| OD-M | Multisig provider | OPEN |
| OD-P | Production contract architecture | OPEN |
| OD-FC | Final collection design | OPEN |
| OD-Meta | Metadata architecture | OPEN |
| OD-Treasury | Treasury accounting/disbursement | OPEN |
| OD-Audit | Audit provider | OPEN |

---

## DEPLOYMENT STATUS

| Environment | Status |
|-------------|--------|
| **DEVELOPMENT** | GO |
| **TESTNET** | GO |
| **MAINNET** | BLOCKED |

### Mainnet Blockers
1. Mainnet USDC address placeholder
2. Single-owner admin (no timelock/multisig)
3. Mainnet deployment claim not independently verified

---

## TEST COVERAGE

| Suite | Tests | Status |
|-------|-------|--------|
| Node.js (engine, signal, normalizer, adversarial) | 49 | ✅ PASS |
| Hardhat behavioral (contract access) | 14 | ✅ PASS |
| Negative permission tests (testnet) | 17 | ✅ PASS |
| Preflight (mainnet) | 10 | ✅ PASS |

---

## KEY FILES

| Path | Purpose |
|------|---------|
| `contracts/SignalArtifact.sol` | Genesis NFT contract |
| `src/signal/engine.js` | Signal Engine (7 detectors) |
| `src/signal/normalizer.js` | Normalization (28 tests) |
| `src/signal/state.js` | SQLite persistence |
| `src/metadata/schema.js` | Metadata schema v1.0.0 |
| `scripts/build_010.js` | Deploy + mint pipeline |
| `scripts/preflight-mainnet.js` | Mainnet readiness |
| `tests/` | 49 Node.js + 14 Hardhat tests |

---

## CLASSIFICATION LEGEND

| Label | Meaning |
|-------|---------|
| ✅ VERIFIED | Implemented + tested + on-chain evidence |
| ⚠️ PARTIAL | Implemented but gaps documented |
| 🟡 PARTIALLY VERIFIED | Some evidence, incomplete |
| ❌ NOT STARTED | No implementation |
| 🔴 BLOCKED | External decision required |

---

*This is the canonical current state. Do not label the system as production-ready, mainnet-ready, fully secure, or final NFT collection.*