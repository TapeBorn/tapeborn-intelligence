# TapeBorn — On-chain Intelligence

> The chain leaves a tape. We read the trace.

TapeBorn is an **on-chain intelligence product**. We index Arc blocks and transactions, normalize them into a consistent schema, run a deterministic **Signal Engine** over the data, and mint the most meaningful findings as **Signal Artifacts** — ERC-721 / ERC-1155 NFTs with verifiable provenance.

NFTs are the artifact layer, not the entire product. The core value is the intelligence: traceable, evidence-backed, machine-verifiable.

## Current Status

| Layer | Status |
|-------|--------|
| **Intelligence Layer** | ✅ Implemented & Verified (49/49 tests PASS) |
| **Signal Artifact Infrastructure** | 🟡 Genesis Experimental Layer (testnet only) |
| **Production NFT Collection** | ❌ Not Implemented |
| **Mainnet Deployment** | 🔴 BLOCKED (9 blockers) |

**DEVELOPMENT: GO** | **TESTNET: GO** | **MAINNET: BLOCKED**

---

## Genesis Experimental Layer (NOT Final Collection)

The current deployed contract is an **experimental genesis layer** for testing the Signal Artifact infrastructure. It is **NOT** the final public TapeBorn NFT collection.

| Property | Value |
|---|---|
| Contract | `SignalArtifact.sol` (ERC721 + Ownable + Pausable) |
| Network | Arc Testnet (chain ID `5042002`) |
| Address | `0x80B87fa686C8FC91A5252854E82ea282c1B6b814` |
| Genesis Mint | Token ID 0 (`sig_454539d0`) |
| Source TX | `0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0587` |
| Source Block | 60347218 |
| Mint TX | `0x3d2bad4ffb055841ebc52625eaf5eb5ea273d2bea3b8051e83ebd41723ca40ed` |
| Deployer | `0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f` |
| Deployment TX | `0x8dec28c1a587c2a534433f41a4e2e613f44fc5313c1de8c993c0855b85e9537c` |
| Mint Policy | Admin-only, `mintPaused` configurable |
| Max Supply | Unlimited (`MAX_SUPPLY` configurable) |
| Metadata Schema | v1.0.0 |

See [`artifacts/genesis_collection.json`](artifacts/genesis_collection.json) for full parameters and provenance.

---

## Testnet Control Plane (VERIFIED)

| Contract | Address |
|---|---|
| TimelockController | `0xb1937d3f88d40dB94CfE56a890A53213cc582e36` |
| TapeBornControlPlaneTest | `0x07602D7Da6602F538A4e6BBf89987AfC776F9c62` |
| Admin Safe (2-of-3) | `0xfDff2Ef0C32433A2044101257A18219620fFcd5B` |
| Treasury Safe (2-of-3) | `0xe9c0cb8729159e2b111f00aeda111d9a361ec7be` |
| Guardian | `0xb88DE39aF3835838323a83986702b2974FA0bDB0` |
| Deployment Wallet | `0x12627b8E344DEC94cF52B0D0A0B0B6b98dC3e631` |

**Role Separation Verified (17/17 Negative Tests PASS):**

| Role | Timelock | Admin Safe | Guardian | Deployer |
|---|---|---|---|---|
| Owner | YES | NO | NO | NO |
| DEFAULT_ADMIN_ROLE | YES (self) | NO | NO | NO |
| PAUSER_ROLE | NO | NO | YES | NO |
| GUARDIAN_ADMIN_ROLE | NO | YES | NO | NO |
| TIMELOCK PROPOSER | N/A | YES | NO | NO |
| TIMELOCK CANCELLER | N/A | YES | NO | NO |
| TIMELOCK EXECUTOR | N/A | address(0) | NO | NO |

**Guardian Capabilities:**
- ✅ CAN: `pause()`
- ✅ CANNOT: `unpause()`, any admin function, role management, ownership transfer

**Timelock Verification:**
- minDelay: 60 seconds (testnet)
- Admin Safe: PROPOSER_ROLE + CANCELLER_ROLE ✅
- Deployer: NO proposer/canceller roles ✅
- Guardian: NO proposer/canceller roles ✅
- Deployer privileges fully revoked ✅
- EXECUTOR_ROLE granted to address(0) ✅

---

## Recent Verification Milestones

| Task | Status | Evidence |
|---|---|---|
| **CP-FIX-001** Treasury Safe Deployment | ✅ PASS | 2-of-3 Safe deployed at `0xe9c0cb...` |
| **CP-FIX-002** Timelock Role Cleanup | ✅ PASS | Deployer DEFAULT_ADMIN + EXECUTOR removed |
| **CP-FIX-001/002** Role Separation | ✅ PASS | 17/17 negative tests PASS |
| Reorg/Adversarial Tests | ✅ PASS | 49/49 PASS |
| Preflight (mainnet) | ✅ PASS | 10/10 PASS |

---

## Forensic Remediation Status (R1-R9)

| Finding | Severity | Status | Evidence |
|---|---|---|---|
| Missing decoder / normalization | P0 | **VERIFIED** | `src/signal/normalizer.js` + 28 tests |
| USDC decimal handling (18→6) | P1 | **VERIFIED** | `CONFIG.usdcDecimals=6` + adversarial tests |
| USDC address placeholder | P1 | **PARTIALLY VERIFIED** | Per-network config, mainnet still placeholder |
| BUILD_010 contract divergence | P1 | **VERIFIED** | Single source: `contracts/SignalArtifact.sol` |
| Transaction receipt handling | P1 | **VERIFIED** | Reverted txs skipped, receipt validation |
| Reorg handling | P1/P2 | **VERIFIED** | Block hashes + invalidation + replacement |
| Signal ID collision | P2 | **VERIFIED** | Type-specific provenance, null txHash for HFW/WB |
| Chain average volume | P2 | **VERIFIED** | Real rolling 100-block avg from USDC Transfer events |
| Confidence logic | P2 | **VERIFIED** | Per-spec `computeConfidence()` + 28 tests |
| Orchestrator test coverage | P3 | **PARTIALLY VERIFIED** | Networks (15), validator missing |
| Contract admin model | P2 | **BLOCKED** | Production admin = Multisig + Timelock + Guardian not deployed |
| Mainnet deployment claim | P2 | **BLOCKED** | Dry-run only, not independently verified |

**All remediation tests: 344 PASS / 0 FAIL** (49 Node.js + 14 Hardhat + 17 negative permission + 10 preflight)

---

## Milestones

| Build | Description | Status |
|---|---|---|
| BUILD_001 | Initial commit | DONE |
| BUILD_002 | Arc RPC reader — verified block 60,241,937 on chain 5042002 | DONE |
| BUILD_003 | Block reader — 173 tx inspected at block 60,244,318 | DONE |
| BUILD_004 | Transaction reader — 3 tx + receipts, 10 logs decoded | DONE |
| BUILD_005 | Event reader — 157 Transfer, 21 Approval events decoded | DONE |
| BUILD_006 | USDC flow — 14 transfers, 70.58 USDC volume | DONE |
| BUILD_007 | Wallet activity — 255 wallets, 447 tx, 108.86 USDC | DONE |
| BUILD_008 | Signal Engine v0 — contract creation detector | DONE |
| BUILD_009 | Signal Feed | NOT VERIFIED IN COMMIT HISTORY |
| BUILD_010 | First Signal Artifact (dry-run) — generated metadata | DONE |
| BUILD_011 | Metadata system — provenance and Signal ID | DONE |
| BUILD_011.1 | Harden provenance timestamp integrity | DONE |
| BUILD_012 | Add public signal dashboard | NOT IMPLEMENTED |
| BUILD_013 | Add reliability layer | NOT IMPLEMENTED |
| BUILD_014 | Add Arc mainnet readiness | PARTIALLY VERIFIED |
| BUILD_015 | Finalize Genesis Collection | DONE |
| BUILD_016 | Mainnet readiness and deployment hardening | BLOCKED (9 blockers) |
| BUILD_017 | Post-launch intelligence and chain evaluation | NOT IMPLEMENTED |
| BUILD_018 | Signal Intelligence v1 | NOT IMPLEMENTED |
| BUILD_019 | Signal Expansion — add 4 new signal types | PARTIALLY VERIFIED |
| BUILD_020 | Add read-only agent interface | NOT IMPLEMENTED |
| BUILD_021 | Roadmap Gap Analysis | NOT IMPLEMENTED (intentional) |
| BUILD_022.1 | Harden mainnet deployment gate | PARTIALLY VERIFIED |
| BUILD_023 | Agent Hardening + Documentation Reconciliation | PARTIALLY VERIFIED |
| CP-FIX-001 | Treasury Safe Deployment | ✅ VERIFIED |
| CP-FIX-002 | Timelock Role Cleanup | ✅ VERIFIED |

> **Status Definitions:** DONE = implemented, tested, verified in testnet; VERIFIED = implementation + spec compliance + tests + persistence evidence; PARTIALLY VERIFIED = some evidence but incomplete; NOT IMPLEMENTED = absent; BLOCKED = dependency/external decision required; NOT VERIFIED IN COMMIT HISTORY = claim exists but no commit evidence found.

---

## Production Architecture (CP-01 through CP-12)

| CP | Decision |
|---|---|
| CP-01 | Production admin = Multisig + Timelock + Emergency Guardian |
| CP-02 | Admin Multisig = 3 signers |
| CP-03 | Admin threshold = 2-of-3 |
| CP-04 | Timelock enabled |
| CP-05 | Timelock delay = 24 hours |
| CP-06 | Emergency Guardian enabled |
| CP-07 | Guardian authority = pause only |
| CP-08 | Treasury = separate 2-of-3 multisig |
| CP-09 | renounceOwnership() disabled |
| CP-10 | Ownership transfer = two-step |
| CP-11 | Deployment wallet separate |
| CP-12 | Emergency: Guardian pause → investigation → multisig resolution → mitigation → verification → multisig unpause → monitoring |

**Production target delay: 24 hours. Current testnet delay: 60 seconds.**

---

## Mainnet Blockers (9)

1. **Mainnet USDC address placeholder** (per-network config not finalized)
2. **Production Admin Safe not deployed** (2-of-3 Safe required)
3. **Production Treasury Safe not deployed** (2-of-3 Safe required)
4. **Production Timelock not deployed** (24h delay required)
4. **Production NFT contract not implemented** (OD-P pending)
5. **Final mint authority not defined** (OD-P pending)
6. **Metadata architecture not finalized** (OD-Meta pending)
7. **Independent security audit not engaged**
8. **Production custody/compliance not resolved**
9. **Mainnet deployment claim not independently verified**

---

## Deployment Checklist (Mainnet)

Before deploying to Arc Mainnet:

1. **Network Configuration**
   - [ ] Verify mainnet chain ID (`5042` — official from Circle/Arc docs)
   - [ ] Verify mainnet RPC URL (currently placeholder)
   - [ ] Test RPC connectivity with `npm run preflight`

2. **Wallet & Keys**
   - [ ] Create dedicated mainnet deployment wallet
   - [ ] Fund wallet with sufficient USDC
   - [ ] Store private key securely (not in repository)
   - [ ] Set `DEV_WALLET_PRIVATE_KEY` in secure environment

3. **Contract Readiness**
   - [ ] Test contract on testnet (complete)
   - [ ] Review contract code for production readiness
   - [ ] **Deploy production Admin Safe (2-of-3)**
   - [ ] **Deploy production Treasury Safe (2-of-3)**
   - [ ] **Deploy production Timelock (24h delay)**
   - [ ] **Deploy production NFT contract**

4. **Metadata & Provenance**
   - [ ] Verify metadata schema v1.0.0 is finalized
   - [ ] Test provenance and evidence fields
   - [ ] Confirm deterministic Signal ID generation

5. **Deployment Plan**
   - [ ] Run `npm run preflight` — all checks must pass
   - [ ] Run `npm run test` — all tests must pass
   - [ ] Run `npm run build:011` — metadata validation must pass
   - [ ] Run `npm run build:010_dryrun` — dry-run must pass
   - [ ] Set `ARC_NETWORK=mainnet` before deployment
   - [ ] Execute `npm run build:010` for real deployment

6. **Post-Deployment**
   - [ ] Verify contract on block explorer
   - [ ] Confirm token ID 0 exists
   - [ ] Verify metadata URI is accessible
   - [ ] Document deployment transaction hashes

7. **Safety Guards**
   - [ ] Default network remains testnet
   - [ ] No private keys in source code or commit history
   - [ ] `.env` files excluded from version control

---

## Test Coverage

| Suite | Tests | Status |
|---|---|---|
| Node.js (engine, signal, normalizer, adversarial, reorg) | 49 | ✅ PASS |
| Hardhat behavioral (contract access) | 14 | ✅ PASS |
| Negative permission tests (testnet) | 17 | ✅ PASS |
| Preflight (mainnet) | 10 | ✅ PASS |
| **Total** | **90** | ✅ **ALL PASS** |

---

## Security Posture

| Control | Status |
|---|---|
| No private keys in repo | ✅ Verified by preflight |
| No .env files committed | ✅ Verified by preflight |
| DEV_WALLET_PRIVATE_KEY only at runtime | ✅ |
| Contract access control | 🟢 Ownable + Pausable + behavioral tests |
| Contract supply model | 🟡 Unlimited (MAX_SUPPLY configurable) |
| Pause semantics | 🟢 mintPaused (explicit) |
| Metadata immutability | 🟡 Not explicit |
| External security audit | 🔴 Not yet engaged |

---

## Documentation

- **Current State:** [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md)
- **Repository Reconciliation:** [`docs/REPOSITORY_RECONCILIATION_002.md`](docs/REPOSITORY_RECONCILIATION_002.md)
- **Master Roadmap:** [`MASTER_ROADMAP.md`](MASTER_ROADMAP.md)
- **Current System State:** [`CURRENT_SYSTEM_STATE.md`](CURRENT_SYSTEM_STATE.md)
- **Audit Package:** [`AUDIT_PACKAGE.md`](AUDIT_PACKAGE.md)
- **System Audit:** [`TAPEBORN_SYSTEM_AUDIT_001.md`](TAPEBORN_SYSTEM_AUDIT_001.md)
- **CP-FIX-001 Report:** [`TB-CP-FIX-001-REPORT.md`](TB-CP-FIX-001-REPORT.md)
- **CP-FIX-002 Report:** [`TB-CP-FIX-002-REPORT.md`](TB-CP-FIX-002-REPORT.md)

---

## Utility Roadmap

Planned holder utilities (Signal Points, Trace-linked Mint, Token-gated API) are tracked in [`UTILITY_ROADMAP.md`](UTILITY_ROADMAP.md). All items are **PLANNED** and not yet implemented.

---

## Contributing

1. Run tests: `npm test` (Node.js) and `npx hardhat test` (contract)
2. Run preflight: `npm run preflight`
3. No private keys in commits — use `DEV_WALLET_PRIVATE_KEY` env var
4. Default network = testnet (`ARC_NETWORK=mainnet` required for mainnet)

---

*TapeBorn — The chain leaves a tape. We read the trace.*