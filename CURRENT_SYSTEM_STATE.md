# CURRENT_SYSTEM_STATE.md

**Canonical Snapshot** — TapeBorn Intelligence Repository State
**Updated:** 2026-09-21
**Commit:** `8892ac0` (DOC: reconcile repository with current architecture) + `TB-CP-FIX-001/002`
**Branch:** main
**Purpose:** Single source of truth for current repository state — replaces historical reconciliation report

---

## Repository Overview

| Metric | Value |
|--------|-------|
| **Repo** | TapeBorn/tapeborn-intelligence |
| **Branch** | main |
| **HEAD** | `8892ac0` (DOC: reconcile repository with current architecture) |
| **Last Commit** | DOC: reconcile control plane state after CP-FIX-001 and CP-FIX-002 |
| **Date** | 2026-09-21 |

---

## Milestone Status (Actual vs Roadmap)

| Build | Description | Status | Notes |
|-------|-------------|--------|-------|
| BUILD_001 | Initial commit | ✅ DONE | Historical |
| BUILD_002 | Arc RPC reader | ✅ DONE | Verified block 60,241,937 |
| BUILD_003 | Block reader | ✅ DONE | 173 tx inspected |
| BUILD_004 | Transaction reader | ✅ DONE | 3 tx + receipts |
| BUILD_005 | Event reader | ✅ DONE | 157 Transfer, 21 Approval |
| BUILD_006 | USDC flow | ✅ DONE | 14 transfers, 70.58 USDC |
| BUILD_007 | Wallet activity | ✅ DONE | 255 wallets, 447 tx |
| BUILD_008 | Signal Engine v0 | ✅ DONE | Contract creation detector |
| BUILD_009 | Signal Feed | ✅ WORKING | HTTP API on :3456, 331 signals/20 blocks |
| BUILD_010 | First Signal Artifact | ✅ DONE | Dry-run + real deploy pipeline |
| BUILD_011 | Metadata system | ✅ DONE | Provenance + Signal ID |
| BUILD_011.1 | Provenance timestamp | ✅ DONE | |
| BUILD_012 | Public signal dashboard | ❌ NOT IMPLEMENTED | |
| BUILD_013 | Reliability layer | ✅ DONE | Retry, rate limit, validation, logging |
| BUILD_014 | Arc mainnet readiness | ⚠️ PARTIALLY VERIFIED | Preflight PASS, mainnet RPC verified |
| BUILD_015 | Finalize Genesis Collection | ✅ DONE | Token ID 0 minted |
| BUILD_016 | Mainnet hardening | ⚠️ BLOCKED | 3 blockers (see below) |
| BUILD_017 | Post-launch intelligence | ❌ NOT IMPLEMENTED | |
| BUILD_018 | Signal Intelligence v1 | ❌ NOT IMPLEMENTED | |
| BUILD_019 | Signal Expansion (4 types) | ✅ DONE | 4 new signal types added |
| BUILD_020 | Agent Interface | ✅ DONE | Read-only API on :3458 |
| BUILD_021 | Roadmap Gap Analysis | ⚠️ NOT IMPLEMENTED | Intentional gap |
| BUILD_022.1 | Mainnet Gate Hardening | ⚠️ PARTIALLY VERIFIED | Multi-gate preflight |
| BUILD_023 | Agent Hardening + Doc Reconciliation | ⚠️ PARTIALLY VERIFIED | TB-GH-RECON-001 complete |
| CP-FIX-001 | Treasury Safe deployment | ✅ VERIFIED | 2-of-3 Treasury Safe deployed |
| CP-FIX-002 | Timelock role cleanup | ✅ VERIFIED | Deployer roles removed |

---

## Key Components Status

### Core Pipeline (src/)

| Module | Status | Notes |
|--------|--------|-------|
| `src/orchestrator/arc.js` | ✅ Production-ready | RPC client with retry, rate-limit, validation |
| `src/orchestrator/networks.js` | ✅ Correct | Testnet (5042002) / Mainnet (5042) config |
| `src/orchestrator/logger.js` | ✅ | Structured logging |
| `src/orchestrator/rateLimit.js` | ✅ | 10 req/s |
| `src/orchestrator/retry.js` | ✅ | Exponential backoff |
| `src/orchestrator/validator.js` | ✅ | Block/tx/address validation |
| `src/signal/decoder.js` | ✅ | ERC-20 event normalization |
| `src/signal/engine.js` | 🟡 Minor issue | token_flow_anomaly uses fixed threshold |
| `src/metadata/schema.js` | 🟡 Minor issue | Immutability model not explicit |

### Contracts

| Contract | Status | Notes |
|----------|--------|-------|
| `contracts/SignalArtifact.sol` | ✅ Hardened v2.0 | ERC721 + Ownable + Pausable, mintPaused, MAX_SUPPLY configurable |
| `scripts/build_010.js` | ✅ | Deploy + mint pipeline with chain ID verification |
| `contracts/test/TapeBornControlPlaneTest.sol` | ✅ Test contract | Testnet-only control plane test contract |

### Tests

| Test File | Tests | Status |
|-----------|-------|--------|
| `tests/engine.test.js` | 6 | ✅ PASS |
| `tests/engine-build019.test.js` | 8 | ✅ PASS |
| `tests/normalizer.test.js` | 7 | ✅ PASS |
| `tests/signal-id.test.js` | 7 | ✅ PASS |
| `tests/trace-derivation.test.js` | 7 | ✅ PASS |
| `tests/adversarial-reorg-tx.test.js` | 12 | ✅ PASS |
| `tests/reorg-state-machine.test.js` | 9 | ✅ PASS |
| `tests/reorg-lifecycle.test.js` | 8 | ✅ PASS |
| **Total Node.js** | **49** | ✅ **ALL PASS** |
| **Hardhat behavioral** | **14** | ✅ **ALL PASS** |
| **Negative permission tests (testnet)** | **17** | ✅ **ALL PASS** |
| **Preflight (mainnet)** | **10** | ✅ **ALL PASS** |

### Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `scripts/build_002.js` → `build_008.js` | Blockchain readers | ✅ DONE |
| `scripts/build_009.js` | Signal Feed (HTTP :3456) | ✅ WORKING |
| `scripts/build_010.js` | Deploy + mint (dry-run + real) | ✅ DONE |
| `scripts/build_010_dryrun.js` | Dry-run only | ✅ DONE |
| `scripts/build_011.js` | Metadata validation | ✅ DONE |
| `scripts/build_012.js` | Dashboard (HTML :3457) | ✅ DONE |
| `scripts/build_017_usage.js` | Usage measurement | ✅ DONE |
| `scripts/build_020.js` | Agent API (:3458) | ✅ DONE |
| `scripts/preflight-mainnet.js` | Mainnet readiness | ✅ ALL PASS |
| `scripts/trace_derivation_prototype.js` | Trace-linked mint | ✅ PROTOTYPE |
| `scripts/negative-test-suite.js` | Testnet negative tests | ✅ VERIFIED |
| `scripts/configure-control-plane-test.js` | Testnet control plane config | ✅ VERIFIED |
| `scripts/negative-test-suite.js` | Negative permission tests | ✅ VERIFIED |

### Artifacts

| Artifact | Description |
|----------|-------------|
| `artifacts/genesis_collection.json` | Genesis NFT params (Token ID 0, contract 0x80B87fa686C8FC91A5252854E82ea282c1B6b814) |
| `artifacts/signal_artifact.json` | Real testnet mint record |
| `artifacts/signal_artifact_dryrun.json` | Latest dry-run output |
| `artifacts/build_019_signal_spec.json` | Signal expansion spec |

---

## Network Configuration

```javascript
// src/orchestrator/networks.js
testnet: {
  chainId: 5042002,
  rpcUrl: 'https://rpc.testnet.arc.io',
  symbol: 'USDC'
}
mainnet: {
  chainId: 5042,           // 0x13B2
  rpcUrl: 'https://rpc.mainnet.arc.io',
  symbol: 'USDC'
}
```

**Preflight (mainnet):** ✅ ALL 10 PASS
- Mainnet RPC reachable (chainId 5042)
- Mainnet RPC verified official
- Testnet RPC reachable (chainId 5042002)
- No hardcoded private keys
- No .env files committed
- Default network = testnet

---

## Arc Testnet Control Plane (VERIFIED)

| Component | Address | Status |
|-----------|---------|--------|
| SignalArtifact (Genesis) | `0x80B87fa686C8FC91A5252854E82ea282c1B6b814` | ✅ VERIFIED |
| TimelockController (test) | `0xb1937d3f88d40dB94CfE56a890A53213cc582e36` | ✅ VERIFIED |
| TapeBornControlPlaneTest | `0x07602D7Da6602F538A4e6BBf89987AfC776F9c62` | ✅ VERIFIED |
| Admin Safe | `0xfDff2Ef0C32433A2044101257A18219620fFcd5B` | ✅ VERIFIED (2-of-3) |
| Treasury Safe | `0xe9c0cb8729159e2b111f00aeda111d9a361ec7be` | ✅ VERIFIED (2-of-3) |
| Guardian | `0xb88DE39aF3835838323a83986702b2974FA0bDB0` | ✅ VERIFIED |
| Deployment Wallet | `0x12627b8E344DEC94cF52B0D0A0B0B6b98dC3e631` | ✅ VERIFIED (no roles) |
| Test Control Plane Deployer | `0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f` | ✅ VERIFIED (no roles) |

---

## Role Separation Verified (17/17 Negative Tests PASS)

| Role | Timelock | Admin Safe | Guardian | Deployer |
|------|----------|------------|----------|----------|
| Owner | ✅ YES | NO | NO | NO |
| DEFAULT_ADMIN_ROLE | ✅ YES (self) | NO | NO | NO |
| PAUSER_ROLE | NO | NO | ✅ YES | NO |
| GUARDIAN_ADMIN_ROLE | NO | ✅ YES | NO | NO |
| TEST_ADMIN_ROLE | ✅ YES | NO | NO | NO |
| TREASURY_TEST_ROLE | ✅ YES | NO | NO | NO |
| TIMELOCK PROPOSER | N/A | ✅ YES | NO | NO |
| TIMELOCK CANCELLER | N/A | ✅ YES | NO | NO |
| TIMELOCK EXECUTOR | N/A | address(0) | NO | NO |

**Guardian Capabilities:**
- ✅ CAN: `pause()`
- ✅ CANNOT: `unpause()`, any admin function, role management, ownership transfer

---

## CP-01 through CP-12 (Approved Production Architecture)

| CP | Decision | Status |
|----|----------|--------|
| CP-01 | Production admin = Multisig + Timelock + Emergency Guardian | APPROVED |
| CP-02 | Admin Multisig = 3 signers | APPROVED |
| CP-03 | Admin threshold = 2-of-3 | APPROVED |
| CP-04 | Timelock enabled | APPROVED |
| CP-05 | Timelock delay = 24 hours | APPROVED |
| CP-06 | Emergency Guardian enabled | APPROVED |
| CP-06 | Guardian authority = pause only | APPROVED |
| CP-08 | Treasury = separate 2-of-3 multisig | APPROVED |
| CP-09 | renounceOwnership() disabled | APPROVED |
| CP-10 | Ownership transfer = two-step | APPROVED |
| CP-11 | Deployment wallet separate | APPROVED |
| CP-12 | Emergency procedure = Guardian pause → investigation → multisig resolution → mitigation → verification → multisig unpause → monitoring | APPROVED |

**Production target delay: 24 hours. Current testnet delay: 60 seconds.**

---

## Testnet Control Plane Verification Summary

| Verification | Result | Evidence |
|--------------|--------|----------|
| Admin Safe (2-of-3) | ✅ PASS | 3 owners, threshold=2 |
| Treasury Safe (2-of-3) | ✅ PASS | 3 signers, threshold=2, separate from Admin |
| Timelink role cleanup | ✅ PASS | Deployer DEFAULT_ADMIN + EXECUTOR removed |
| Control Plane role separation | ✅ PASS | 17/17 negative tests PASS |
| Guardian capabilities | ✅ PASS | pause() only |
| Admin Safe roles | ✅ PASS | PROPOSER + CANCELLER retained |
| Treasury Safe | ✅ PASS | Separate 2-of-3 deployed |
| Timelink self-admin | ✅ PASS | DEFAULT_ADMIN = Timelock self |
| EXECUTOR_ROLE | ✅ PASS | address(0) granted |
| Timelink delay | ✅ PASS | 60s testnet |
| Control Plane owner | ✅ PASS | Timelock |

---

## Remaining Production Blockers

| Blocker | Status | Resolution Required |
|---------|--------|---------------------|
| Production Treasury Safe | ❌ NOT DEPLOYED | Deploy 2-of-3 on mainnet |
| Production Admin Safe | ❌ NOT DEPLOYED | Deploy 2-of-3 on mainnet |
| Production 24h Timelock | ❌ NOT DEPLOYED | Deploy with 86400s delay |
| Production NFT Contract | ❌ NOT IMPLEMENTED | OD-P pending |
| Final Mint Authority | ❌ NOT DEFINED | OD-P pending |
| Metadata Architecture | ❌ NOT DEFINED | OD-Meta pending |
| Independent Security Audit | ❌ NOT ENGAGED | Engage auditor |
| Production Custody | ❌ NOT DEFINED | Legal/compliance |
| Guardian Model | ⚠️ OPEN | OD-G: 1-of-1 vs 1-of-2 |
| Quorum-Loss Recovery | ⚠️ OPEN | OD-R pending |
| Production Blockchain | ⚠️ OPEN | OD-C pending (Arc Mainnet vs other) |
| Multisig Provider | ⚠️ OPEN | OD-M pending |
| Metadata Architecture | ❌ NOT STARTED | OD-Meta pending |
| Monitoring/Alerting | ❌ NOT IMPLEMENTED | |
| Incident Response Runbook | ❌ NOT CREATED | |
| Independent Security Audit | ❌ NOT ENGAGED | |
| Production Custody/Compliance | ❌ NOT STARTED | Legal/compliance |
| Deployment Ceremony | ❌ NOT DEFINED | |
| Monitoring/Alerting | ❌ NOT IMPLEMENTED | |
| Incident Response Runbook | ❌ NOT CREATED | |

---

## Key Metrics

| Metric | Value |
|--------|-------|
| **Test Coverage (Node.js)** | 49 tests PASS |
| **Test Coverage (Hardhat)** | 14 behavioral PASS |
| **Negative Permission Tests (testnet)** | 17 PASS |
| **Preflight (mainnet)** | 10/10 PASS |
| **build:010_dryrun** | SUCCESS |
| **Signal Feed (build_009)** | 331 signals / 20 blocks |
| **Dashboard (build_012)** | HTML on :3457 |
| **Agent API (build_020)** | REST on :3458 |
| **Contract Security** | Ownable+Pausable, behavioral tests PASS |
| **Signal Semantics** | token_flow_anomaly uses fixed threshold |
| **Signal ID** | Custom hash (needs canonical keccak256) |
| **Historical State** | In-memory lastSeenMap only |
| **Metadata Immutability** | Not explicit |

---

## Blocker Summary (from Audit)

| Priority | Count | Description |
|--------|-------|-------------|
| 🔴 CRITICAL | 6 | No independent audit, production contract not final, signal semantics frozen, canonical Signal ID missing, persistent state partial, production API security incomplete, deployment arch not final |
| 🟠 HIGH | 8 | Compiler version, reproducible deps, tooling cleanup, docs reconciliation, edge-case tests, metadata immutability, wallet separation, deployment procedure, pause semantics, mint economics |
| 🟡 MEDIUM | 7 | Dashboard scaling, API caching, indexing, analytics, auth, observability, DB optimization |

---

## Genesis Collection (Current — Experimental Layer)

```json
{
  "contractAddress": "0x80B87fa686C8FC91A5252854E82ea282c1B6b814",
  "deployer": "0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f",
  "deploymentTx": "0x8dec28c1a587c2a534433f41a4e2e613f44fc5313c1de8c993c0855b85e9537c",
  "mintTx": "0x3d2bad4ffb055841ebc52625eaf5eb5ea273d2bea3b8051e83ebd41723ca40ed",
  "tokenId": 0,
  "signalId": "sig_454539d0",
  "sourceTx": "0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0587",
  "sourceBlock": 60347218,
  "metadataSchema": "v1.0.0"
}
```

**NOT the final public TapeBorn collection.**

---

## Utility Roadmap Status

| Utility | Status | Implementation |
|---------|--------|----------------|
| Trace-linked Mint | 🟡 Prototype | Deterministic derivation from on-chain trace |
| Signal Points & Credibility Tier | 🟡 Planned | Off-chain (backend/dashboard) |
| Token-gated Agent API | 🔴 DEPRIORITIZED | Repositioned for B2B |
| Credibility API (B2B) | 🔴 FUTURE | Requires audit + BD |
| Auto-gating transfer | 🔴 FUTURE | Requires audit + BD |

---

## Environment

| Tool | Version | Locked |
|------|---------|--------|
| Node.js | 22.x | 🟡 (via .nvmrc) |
| npm | 10.x | 🟡 |
| Solidity | 0.8.24 | ✅ (hardhat.config.cjs) |
| OpenZeppelin | 5.6.1 | ✅ (package.json) |
| ethers | 6.17.0 | ✅ (package.json) |
| Hardhat | 2.29.1 | ✅ (package.json, .cjs config) |
| solc | 0.8.24 | ✅ (compiler config) |

---

## Security Posture

| Control | Status |
|---------|--------|
| No private keys in repo | ✅ Verified by preflight |
| No .env files committed | ✅ Verified by preflight |
| DEV_WALLET_PRIVATE_KEY only | ✅ Runtime only |
| Mainnet wallet separation | 🟡 Not yet implemented |
| Contract access control | 🟢 Ownable + Pausable + behavioral tests |
| Contract supply model | 🟡 Unlimited (MAX_SUPPLY configurable) |
| Pause semantics | 🟢 mintPaused (explicit) |
| Metadata immutability | 🟡 Not explicit |
| External security audit | 🔴 Not yet engaged |

---

## Next Phase (Remediation Plan)

Per `TAPEBORN_SYSTEM_AUDIT_001.md` Part B:

| Phase | Task | Target |
|-------|------|--------|
| R0 | Current System Snapshot | Commit audit doc + this file |
| R1 | Reproducible Dev Environment | Lock toolchain |
| R2 | Signal Spec Freeze | Canonical YAML spec |
| R3 | Canonical Signal ID | keccak256 |
| R4 | Persistent Signal State | SQLite (partially done) |
| R5 | Metadata/Provenance Freeze | Explicit immutability |
| R6 | NFT Contract Hardening | MAX_SUPPLY, mintPaused, edge cases |
| R7 | Contract Test Suite | ≥95% coverage |
| R8 | Full Testnet E2E | Deploy → mint → verify |
| R9 | Mainnet Deployment Plan | Checklist + rollback |
| R10 | Independent Security Review | Professional auditor |
| R11 | Fix + Re-review | Apply findings |
| R12 | Mainnet Deployment | Execute plan |
| R13 | Small Genesis Mint | Controlled rollout |

---

## DEPLOYMENT STATUS

| Environment | Status |
|-------------|--------|
| **DEVELOPMENT** | GO |
| **TESTNET** | GO |
| **MAINNET** | BLOCKED |

### Mainnet Blockers
1. Mainnet USDC address placeholder
2. Production Admin Safe not deployed (2-of-3)
3. Production Treasury Safe not deployed (2-of-3)
4. Production Timelock (24h) not deployed
5. Production NFT contract not implemented
5. Mainnet deployment claim not independently verified

---

*This document is the canonical CURRENT_SYSTEM_STATE.md as of commit post-CP-FIX-002. Update only via explicit remediation task.*