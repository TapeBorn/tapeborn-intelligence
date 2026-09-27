# TB-CP-RECON-006-REPORT.md

**TapeBorn Arc Testnet Control Plane — Read-Only Reconciliation Report**

**Date:** 2026-09-21  
**Network:** Arc Testnet  
**Chain ID:** 5042002  
**RPC:** https://rpc.testnet.arc.io  
**Verifier:** Read-only on-chain queries (no transactions sent)

---

## SUMMARY

| Category | Verified | Discrepancies |
|----------|----------|---------------|
| Admin Safe | ✅ PASS | — |
| Treasury Safe | ❌ FAIL | Not deployed (placeholder) |
| Timelock | ⚠️ DISCREPANCY | Deployer retains DEFAULT_ADMIN_ROLE; EXECUTOR_ROLE held by deployer not address(0) |
| Control Plane | ✅ PASS | — |
| Guardian | ✅ PASS | — |
| Deployment Wallet | ✅ PASS | — |

---

## 1. ADMIN SAFE

**Address:** `0xfDff2Ef0C32433A2044101257A18219620fFcd5B`

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Safe exists | YES | YES | ✅ PASS |
| Contract code | EXISTS | EXISTS (344 bytes) | ✅ PASS |
| Owners | 3 specific addresses | `0x86dA6995611bdF38D3F790c73756582642E2b69d`, `0xB076F29Ef3EB25f79DC75C422979C7B1864B0f3f`, `0xE291A2f7AbE1aA81e99a4dc0DD738a3493202866` | ✅ PASS |
| Threshold | 2 | 2 | ✅ PASS |
| Separate from Treasury | YES | YES (Treasury not deployed) | ✅ PASS |

**Status:** ✅ **VERIFIED** — Admin Safe correctly deployed as 2-of-3 Gnosis Safe with expected owners.

---

## 2. TREASURY SAFE

**Expected Address:** Should be separate 2-of-3 Safe from project artifacts  
**Actual:** No Treasury Safe deployed

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Safe exists | YES | NO | ❌ FAIL |
| Separate from Admin Safe | YES | N/A | ❌ FAIL |
| Separate from Deployer | YES | N/A | ❌ FAIL |
| Threshold = 2 | 2 | N/A | ❌ FAIL |
| Separate from Deployer wallet | YES | N/A | ❌ FAIL |

**Status:** ❌ **DISCREPANCY** — No Treasury Safe deployed on Arc Testnet. The Control Plane contract's `getTreasuryMultisig()` returns the deployer address (`0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f`), which is an EOA, not a Safe. This is a known placeholder.

**Action Required:** Deploy a separate 2-of-3 Gnosis Safe as Treasury with distinct owners from Admin Safe.

---

## 3. TIMELOCK

**Address:** `0xb1937d3f88d40dB94CfE56a890A53213cc582e36`

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| minDelay | 60s (testnet) | 60s | ✅ PASS |
| Owner | Timelock self | Timelock (self) | ✅ PASS |
| DEFAULT_ADMIN_ROLE | Timelock (self) | Timelock (self) ✅ | ⚠️ **DISCREPANCY** — Deployer also has DEFAULT_ADMIN_ROLE |
| PROPOSER_ROLE | Admin Safe | Admin Safe ✅ | ✅ PASS |
| CANCELLER_ROLE | Admin Safe | Admin Safe ✅ | ✅ PASS |
| EXECUTOR_ROLE | address(0) | Deployer holds it ❌ | ⚠️ **DISCREPANCY** — Deployer holds EXECUTOR_ROLE |
| Deployer PROPOSER_ROLE | NO | NO | ✅ PASS |
| Deployer CANCELLER_ROLE | NO | NO | ✅ PASS |
| Admin Safe PROPOSER_ROLE | YES | YES | ✅ PASS |
| Admin Safe CANCELLER_ROLE | YES | YES | ✅ PASS |
| Deployer retains operational authority | NO | YES (DEFAULT_ADMIN + EXECUTOR) | ⚠️ **DISCREPANCY** |

**Role Admin Hierarchy:**
- DEFAULT_ADMIN_ROLE admin: DEFAULT_ADMIN_ROLE (0x0) → Timelock self-admin ✅
- PROPOSER_ROLE admin: DEFAULT_ADMIN_ROLE ✅
- CANCELLER_ROLE admin: DEFAULT_ADMIN_ROLE ✅
- EXECUTOR_ROLE admin: DEFAULT_ADMIN_ROLE ✅

**Status:** ⚠️ **DISCREPANCIES** — Two critical issues:
1. **Deployer retains DEFAULT_ADMIN_ROLE** on Timelock (should be Timelock self-admin only)
2. **Deployer holds EXECUTOR_ROLE** (should be `address(0)` for permissionless execution after delay)

**Action Required:** Revoke DEFAULT_ADMIN_ROLE and EXECUTOR_ROLE from deployer on Timelock. Set EXECUTOR_ROLE to `address(0)`.

---

## 4. CONTROL PLANE

**Address:** `0x07602D7Da6602F538A4e6BBf89987AfC776F9c62`

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Owner | Timelock | Timelock (`0xb1937d3f88d40dB94CfE56a890A53213cc582e36`) | ✅ PASS |
| DEFAULT_ADMIN_ROLE | Timelock | Timelock | ✅ PASS |
| PAUSER_ROLE | Guardian | Guardian (`0xb88DE39aF3835838323a83986702b2974FA0bDB0`) | ✅ PASS |
| GUARDIAN_ADMIN_ROLE | Admin Safe | Admin Safe (`0xfDff2Ef0C32433A2044101257A18219620fFcd5B`) | ✅ PASS |
| TEST_ADMIN_ROLE | Timelock | Timelock | ✅ PASS |
| TREASURY_TEST_ROLE | Timelock | Timelock | ✅ PASS |
| Guardian address | `0xb88DE39aF3835838323a83986702b2974FA0bDB0` | Matches ✅ | ✅ PASS |
| Deployer PAUSER_ROLE | NO | NO | ✅ PASS |
| Deployer GUARDIAN_ADMIN_ROLE | NO | NO | ✅ PASS |
| Deployer DEFAULT_ADMIN_ROLE | NO | NO | ✅ PASS |
| Paused | false | false | ✅ PASS |

**Status:** ✅ **VERIFIED** — Control Plane role separation correctly implemented.

---

## 5. GUARDIAN

**Address:** `0xb88DE39aF3835838323a83986702b2974FA0bDB0`

| Capability | Expected | Actual | Result |
|------------|----------|--------|--------|
| PAUSER_ROLE | YES | YES | ✅ PASS |
| Can `pause()` | YES | YES (has PAUSER_ROLE) | ✅ PASS |
| Can `unpause()` | NO | NO (no DEFAULT_ADMIN_ROLE) | ✅ PASS |
| Can `setTestValue()` | NO | NO (no TEST_ADMIN_ROLE) | ✅ PASS |
| Can `setTreasuryTestValue()` | NO | NO (no TREASURY_TEST_ROLE) | ✅ PASS |
| Can `grantRole()` | NO | NO (no DEFAULT_ADMIN_ROLE) | ✅ PASS |
| Can `revokeRole()` | NO | NO (no DEFAULT_ADMIN_ROLE) | ✅ PASS |
| Can `setGuardian()` | NO | NO (no GUARDIAN_ADMIN_ROLE) | ✅ PASS |
| Can `replaceGuardian()` | NO | NO (no GUARDIAN_ADMIN_ROLE) | ✅ PASS |
| Can `transferOwnership()` | NO | NO (not owner) | ✅ PASS |

**Status:** ✅ **VERIFIED** — Guardian correctly restricted to `pause()` only.

---

## 6. DEPLOYMENT WALLET

**Address:** `0x12627b8E344DEC94cF52B0D0A0B0B6b98dC3e631`

| Role | Expected | Actual | Result |
|------|----------|--------|--------|
| PAUSER_ROLE | NO | NO | ✅ PASS |
| DEFAULT_ADMIN_ROLE | NO | NO | ✅ PASS |
| GUARDIAN_ADMIN_ROLE | NO | NO | ✅ PASS |
| TEST_ADMIN_ROLE | NO | NO | ✅ PASS |
| TREASURY_TEST_ROLE | NO | NO | ✅ PASS |

**Note:** This is the designated production deployment wallet (different from test control plane deployer `0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f`). It correctly holds no operational roles.

**Status:** ✅ **VERIFIED** — Deployment wallet has no operational authority.

---

## 7. DEPLOYER (Test Control Plane Deployer)

**Address:** `0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f`

| Role | Expected | Actual | Result |
|------|----------|--------|--------|
| Control Plane PAUSER_ROLE | NO | NO | ✅ PASS |
| Control Plane GUARDIAN_ADMIN_ROLE | NO | NO | ✅ PASS |
| Control Plane DEFAULT_ADMIN_ROLE | NO | NO | ✅ PASS |
| Control Plane TEST_ADMIN_ROLE | NO | NO | ✅ PASS |
| Timelock PROPOSER_ROLE | NO | NO | ✅ PASS |
| Timelock CANCELLER_ROLE | NO | NO | ✅ PASS |
| Timelock DEFAULT_ADMIN_ROLE | NO | **YES** ❌ | ⚠️ DISCREPANCY |
| Timelock EXECUTOR_ROLE | NO (address(0)) | **YES** ❌ | ⚠️ DISCREPANCY |

**Status:** ⚠️ **DISCREPANCIES** — Deployer retains DEFAULT_ADMIN_ROLE and EXECUTOR_ROLE on Timelock.

---

## FINAL CLASSIFICATION

### A. VERIFIED ✅
1. Admin Safe — 2-of-3, correct owners, threshold=2
2. Control Plane — Role separation fully correct (owner=Timelock, PAUSER=Guardian, GUARDIAN_ADMIN=Admin Safe, TEST_ADMIN/TREASURY_TEST=Timelock)
3. Guardian — PAUSER_ROLE only, no admin capabilities
4. Deployment Wallet — Zero operational roles
5. Deployer (Control Plane) — No Control Plane roles ✅
6. Timelock — minDelay=60s, Admin Safe = PROPOSER+CANCELLER ✅

### B. DISCREPANCIES ⚠️

| # | Component | Issue | Severity |
|---|-----------|-------|----------|
| 1 | Treasury Safe | Not deployed (placeholder = deployer EOA) | HIGH |
| 2 | Timelink DEFAULT_ADMIN_ROLE | Deployer retains it (should be Timelock self-only) | HIGH |
| 3 | Timelink EXECUTOR_ROLE | Deployer holds it (should be `address(0)`) | HIGH |
| 4 | Deployer Timelock privileges | Retains DEFAULT_ADMIN + EXECUTOR | HIGH |

### C. ACTIONS REQUIRED

| Priority | Action |
|----------|--------|
| 1 | Deploy Treasury Safe (2-of-3, separate owners from Admin Safe) |
| 2 | Revoke DEFAULT_ADMIN_ROLE from deployer on Timelock (Timelock must self-admin) |
| 3 | Revoke EXECUTOR_ROLE from deployer on Timelock; grant to `address(0)` |
| 4 | Verify Treasury Safe owners are distinct from Admin Safe owners |

### D. NO-ACTION ITEMS

- Admin Safe configuration — correct
- Control Plane role separation — correct
- Guardian restrictions — correct
- Deployment wallet — correct (no roles)
- Deployer Control Plane privileges — correctly revoked
- Timelink PROPOSER/CANCELLER on Admin Safe — correct
- Timelink minDelay — correct for testnet (60s)

---

## TRANSACTION HASHES (Reference)

| TX | Description | Block |
|----|-------------|-------|
| `0x60f836bdf5c7350d1dc1f0a3c7f21ca91d8e6f96a5ebb2ff0537c46c84ed5059` | `setGuardian(Guardian)` | 63225964 |
| `0x542d889ed6ce661045ac2626d6e74fabcb9ac5720f8131f4b725128d48df926e` | Schedule `grantPauserRole(Guardian)` | 63225974 |

---

## NETWORK CONTEXT

| Property | Value |
|----------|-------|
| Network | Arc Testnet |
| Chain ID | 5042002 |
| RPC | https://rpc.testnet.arc.io |
| Timestamp | 2026-09-21 |

---

**No private key material included. No transactions sent. No contracts modified. Mainnet untouched.**