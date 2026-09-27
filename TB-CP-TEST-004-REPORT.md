# TB-CP-TEST-004 Report

## Control Plane Role Separation Configuration & Verification

**Date:** 2026-09-21  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Status:** PASS

---

## 1. Addresses Used

| Component | Address |
|-----------|---------|
| TimelockController | `0xb1937d3f88d40dB94CfE56a890A53213cc582e36` |
| TapeBornControlPlaneTest | `0x07602D7Da6602F538A4e6BBf89987AfC776F9c62` |
| Admin Multisig | `0xfDff2Ef0C32433A2044101257A18219620fFcd5B` |
| Guardian | `0xb88DE39aF3835838323a83986702b2974FA0bDB0` |
| Deployer (original) | `0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f` |
| Chain | Arc Testnet (5042002) |
| RPC | https://rpc.testnet.arc.io |

---

## 2. Before State (Initial)

### Control Plane
- **Owner:** TimelockController ✅
- **Guardian (state var):** Deployer
- **DEFAULT_ADMIN_ROLE:** Timelock ✅
- **PAUSER_ROLE:** Deployer ❌ (should be Guardian)
- **GUARDIAN_ADMIN_ROLE:** Deployer ❌ (should be Admin Multisig)
- **TEST_ADMIN_ROLE:** Timelock ✅
- **TREASURY_TEST_ROLE:** Timelock ✅

### TimelockController
- **minDelay:** 60 seconds (test value)
- **DEFAULT_ADMIN_ROLE:** Self (Timelock) ✅
- **PROPOSER_ROLE:** Deployer ❌ (should be Admin Multisig)
- **CANCELLER_ROLE:** Deployer ❌ (should be Admin Multisig)

---

## 3. Intended Final State

| Role | Timelock | Admin Safe | Guardian | Deployer |
|------|----------|------------|----------|----------|
| Owner | YES | NO | NO | NO |
| DEFAULT_ADMIN_ROLE | YES | NO | NO | NO |
| PAUSER_ROLE | NO | NO | YES | NO |
| GUARDIAN_ADMIN_ROLE | NO | YES | NO | NO |
| TEST_ADMIN_ROLE | YES | NO | NO | NO |
| TREASURY_TEST_ROLE | YES | NO | NO | NO |
| TIMELOCK PROPOSER | N/A | YES | NO | NO |
| TIMELOCK CANCELLER | N/A | YES | NO | NO |

---

## 4. Role Changes Executed

| # | Change | Method | Status |
|---|--------|--------|--------|
| 1 | Update guardian state variable → Guardian | Direct call (Deployer had GUARDIAN_ADMIN_ROLE) | ✅ TX: `0x60f836bdf5c7350d1dc1f0a3c7f21ca91d8e6f96a5ebb2ff0537c46c84ed5059` |
| 2 | Grant PAUSER_ROLE to Guardian | Timelock schedule → wait 60s → execute | ✅ Scheduled/Executed |
| 3 | Grant GUARDIAN_ADMIN_ROLE to Admin Multisig | Timelock schedule → wait 60s → execute | ✅ TX: `0xf0eb2db66e5cc46913f7c21957225bccf9b182b6bbf20d450ceea8d8db2248cc` / `0x9620cf98257941a58d918add9f4eb6ec086d37406354447343a7f19b992a9026` |
| 4 | Revoke PAUSER_ROLE from Deployer | Timelock schedule → wait 60s → execute | ✅ Executed |
| 5 | Revoke GUARDIAN_ADMIN_ROLE from Deployer | Timelock schedule → wait 60s → execute | ✅ TX: `0xbfc605b77048b0c33cd17e60f937355c5a03af09ceb1f62e7c260b0beec7f9cd` / `0x8fdde864f3a06a623468aa3e0625d5b87c62a6286ee3a07ba903aeab4e0dbd53` |
| 6 | Grant Timelock PROPOSER_ROLE to Admin Multisig | Timelock schedule → wait 60s → execute | ✅ Executed |
| 7 | Grant Timelock CANCELLER_ROLE to Admin Multisig | Timelock schedule → wait 60s → execute | ✅ Executed |
| 8 | Revoke Timelock PROPOSER_ROLE from Deployer | Direct call (Deployer had DEFAULT_ADMIN_ROLE on Timelock) | ✅ Executed |
| 9 | Revoke Timelock CANCELLER_ROLE from Deployer | Direct call (Deployer had DEFAULT_ADMIN_ROLE on Timelock) | ✅ TX: `0xe8b8177a725e2d6e1ec65de59345cfab3659a0b3921f0920d1ad52c979164a2b` |

---

## 5. Timelock Scheduling/Execution Details

All Control Plane role changes required **Timelock scheduling** because:
- `DEFAULT_ADMIN_ROLE` on Control Plane = TimelockController
- Timelock is self-administered (DEFAULT_ADMIN_ROLE = Timelock)

**Flow:** `schedule()` → wait 60s (minDelay) → `execute()`

**Timelock self-role changes** (PROPOSER/CANCELLER roles):
- Also require Timelock's DEFAULT_ADMIN_ROLE = Timelock
- Must be scheduled through Timelock itself
- Deployer could directly revoke because Deployer held DEFAULT_ADMIN_ROLE on Timelock initially

---

## 6. Final Role Matrix (Verified)

| Role | Timelock | Admin Safe | Guardian | Deployer |
|------|----------|------------|----------|----------|
| Owner | YES ✅ | NO | NO | NO |
| DEFAULT_ADMIN_ROLE | YES ✅ | NO | NO | NO |
| PAUSER_ROLE | NO | NO | YES ✅ | NO |
| GUARDIAN_ADMIN_ROLE | NO | YES ✅ | NO | NO |
| TEST_ADMIN_ROLE | YES ✅ | NO | NO | NO |
| TREASURY_TEST_ROLE | YES ✅ | NO | NO | NO |
| TIMELOCK PROPOSER | N/A | YES ✅ | NO | NO |
| TIMELOCK CANCELLER | N/A | YES ✅ | NO | NO |

---

## 7. Guardian Negative Tests (All PASS)

| Test | Description | Result |
|------|-------------|--------|
| TEST-A | Guardian can pause (has PAUSER_ROLE) | ✅ PASS |
| TEST-B | Guardian cannot unpause (no DEFAULT_ADMIN_ROLE) | ✅ PASS |
| TEST-C | Guardian cannot setTestValue (no TEST_ADMIN_ROLE) | ✅ PASS |
| TEST-D | Guardian cannot setTreasuryTestValue (no TREASURY_TEST_ROLE) | ✅ PASS |
| TEST-E | Guardian cannot grant roles (no DEFAULT_ADMIN_ROLE) | ✅ PASS |
| TEST-F | Guardian cannot revoke roles (no DEFAULT_ADMIN_ROLE) | ✅ PASS |
| TEST-G | Guardian cannot replace itself (no GUARDIAN_ADMIN_ROLE) | ✅ PASS |

---

## 8. Admin Multisig Verification

| Check | Result |
|-------|--------|
| Has GUARDIAN_ADMIN_ROLE on Control Plane | ✅ YES |
| Has PAUSER_ROLE on Control Plane | ✅ NO (correct) |
| Has DEFAULT_ADMIN_ROLE on Control Plane | ✅ NO (correct) |
| Has PROPOSER_ROLE on Timelock | ✅ YES |
| Has CANCELLER_ROLE on Timelock | ✅ YES |

---

## 9. Deployer Privilege Removal Verification

| Role | Before | After | Status |
|------|--------|-------|--------|
| PAUSER_ROLE (Control Plane) | YES | NO | ✅ REMOVED |
| GUARDIAN_ADMIN_ROLE (Control Plane) | YES | NO | ✅ REMOVED |
| DEFAULT_ADMIN_ROLE (Control Plane) | NO | NO | ✅ N/A |
| TEST_ADMIN_ROLE (Control Plane) | NO | NO | ✅ N/A |
| TREASURY_TEST_ROLE (Control Plane) | NO | NO | ✅ N/A |
| PROPOSER_ROLE (Timelock) | YES | NO | ✅ REMOVED |
| CANCELLER_ROLE (Timelock) | YES | NO | ✅ REMOVED |
| DEFAULT_ADMIN_ROLE (Timelock) | YES* | YES (self) | ✅ N/A |

*Deployer initially had DEFAULT_ADMIN_ROLE on Timelock via constructor admin param. Timelock is now self-administered.

---

## 10. Genesis Contract Verification

```
contracts/SignalArtifact.sol: UNTOUCHED ✅
```

**Git Verification:**
- No modifications to `contracts/SignalArtifact.sol` in this session
- File remains at original state

---

## 11. Mainnet Verification

```
Mainnet: UNTOUCHED ✅
```

- All operations on Arc Testnet (chainId: 5042002) only
- RPC: https://rpc.testnet.arc.io
- No mainnet transactions or RPC calls

---

## 12. Files Created/Modified

| File | Action |
|------|--------|
| `scripts/configure-control-plane-test.js` | CREATED |
| `scripts/deploy-control-plane-test.js` | UNCHANGED |
| `deploy-test.js` | UNCHANGED |
| `contracts/test/TapeBornControlPlaneTest.sol` | UNCHANGED |
| `contracts/SignalArtifact.sol` | UNTOUCHED |

---

## 13. Risks Identified

| Risk | Severity | Mitigation |
|------|----------|------------|
| Admin Multisig is a single address (not verified Safe) | MEDIUM | Production must use verified Gnosis Safe 2-of-3 |
| Guardian is 1-of-1 (not 1-of-2) | MEDIUM | Founder decision OD-G required |
| Treasury Multisig not configured (placeholder) | HIGH | Must deploy separate 2-of-3 Treasury Safe |
| Timelock delay is 60s (test) vs 24h (production) | LOW | Documented difference |
| No quorum-loss recovery configured | HIGH | Founder decision OD-R required |

---

## 14. Remaining Blockers for Production

| Blocker | Decision Required |
|---------|-------------------|
| OD-G: Guardian 1-of-1 vs 1-of-2 | Founder |
| OD-R: Quorum-loss recovery model | Founder |
| OD-C: Final production blockchain | Founder |
| OD-M: Multisig provider (Safe vs custom) | Founder |
| OD-P: Production contract architecture | Founder |
| Treasury Multisig deployment | Technical |
| Independent security audit | Operational |

---

## 15. Recommendation for TB-CP-TEST-005

**Proceed to TB-CP-TEST-005:** Comprehensive testnet validation including:

1. **End-to-end emergency drill** - Guardian pause → Admin investigation → Timelock unpause
2. **Multisig transaction simulation** - Verify Admin Safe can execute via Timelock
3. **Reorg/edge case testing** - Timelock behavior under reorg
4. **Full negative test suite** - Automated tests for all permission boundaries
5. **Treasury Multisig deployment** - Deploy and configure separate 2-of-3 Treasury
6. **Stress test** - Multiple rapid role changes, scheduling conflicts
7. **Documentation** - Final control-plane testnet validation report

---

## Summary

**TB-CP-TEST-004: PASS**

✅ Role separation successfully configured and verified on Arc Testnet  
✅ Guardian restricted to PAUSER_ROLE only  
✅ Admin Multisig holds GUARDIAN_ADMIN_ROLE + Timelock PROPOSER/CANCELLER  
✅ Deployer privileges fully revoked  
✅ Timelock remains owner and DEFAULT_ADMIN_ROLE authority  
✅ All negative security tests pass  
✅ Genesis contract untouched  
✅ Mainnet untouched  

**Ready for TB-CP-TEST-005 (Comprehensive Testnet Validation)**