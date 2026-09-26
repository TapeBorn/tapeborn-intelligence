# BUILD_028B — PRODUCTION NFT CONTRACT: IMPLEMENTATION REPORT

**Repo:** `TapeBorn/tapeborn-intelligence`
**Date:** 2026-09-26
**Authority:** `docs/BUILD_028A-EIP712-R_FOUNDER_DECISION_LOCK.md` (PASS FINAL, final lock)
**Status:** ✅ COMPLETE — in scope per Section 25 E/F; not deployed.

---

## 1. Scope decision (why BUILD_028B is authorized to run now)

| Document | Verdict | Relevance |
|---|---|---|
| `BUILD_028A-R_CONTRACT_DECISION_LOCK.md` | **NOT READY** + stop condition ("do not write Solidity code") | Superseded — 6 decisions were unresolved at the time |
| `BUILD_028A-EIP712-R_FOUNDER_DECISION_LOCK.md` | **PASS FINAL** | Defines the BUILD_028B boundary (Section 25 E/F) |

Section 23 (document hierarchy) states that older documents may not override the final lock. Section 25 E authorizes: *"Implement the Production NFT contract only (ERC-721, Pausable, Ownable2Step, EIP-712) — do not implement deployment scripts (BUILD_033)"*. Section 25 F: *"Tests must be in the same build but not part of the contract."*

**Out of scope for BUILD_028B:** deployment scripts (`scripts/`, `deploy-test.js`), repo/tooling hygiene, BUILD_033 ceremony.

## 2. Deliverables

| Artifact | Status |
|---|---|
| `contracts/TapeBornProductionNFT.sol` | Implemented; 1 compile blocker fixed |
| `tests/TapeBornProductionNFT.test.js` | 730+ lines, ethers v6, 12 groups, **75 tests** |
| `package.json` | `test:contract:nft`, `test:contract` scripts added |

### Compile blocker fixed
`) external nonpayable {` → `) external {` — `nonpayable` is not a Solidity mutability keyword (valid: `pure`/`view`/`payable`; the default is already non-payable). Result: `Compiled 29 Solidity files successfully (evm target: cancun)`.

### Contract shape (verified against the decision lock)
- **Plain ERC-721** — `ERC721Enumerable` is forbidden by `BUILD_028A-R`; `tokenOfOwnerByIndex` intentionally absent, `supportsInterface(Enumerable)` returns `false`.
- **MAX_SUPPLY = 2222**, per-phase `allocationCap`, phases `TEAM` / `COLLAB_GUARANTEED` / `COLLAB_FCFS`.
- **5-state machine:** `DRAFT → CONFIGURED → REVIEWED → ACTIVE → {EXHAUSTED, CLOSED}`; `CLOSED` is terminal.
- **EIP-712 signed claims:** nonce-based replay protection, `deadline`, campaign/phase binding, domain `chainId` + `verifyingContract` binding.
- **Access control:** `Ownable2Step` (Timelock = owner), `PAUSER_ROLE` (Guardian, pause only), unpause via owner/Timelock only, `renounceOwnership` permanently reverts.
- **`Claim(campaignId, phaseId, claimant, tokenId)`** — field 3 is the **tokenId**, not a quantity (Section 21). Indexers must read tokenId.

## 3. SECTION 22 TEST REQUIREMENT — coverage matrix (33/33)

Every bullet required by Section 22, mapped to the tests that exercise it. All items include negative/failure assertions, not just happy paths.

| # | Required test | Covering test(s) | Group |
|---|---|---|---|
| 1 | supply cap | `MAX_SUPPLY = 2222 ...`, `MAX_SUPPLY hard cap invariant` | 1, 11 |
| 2 | exact supply increment | `claim valid: ... semua counter naik tepat sekali` | 6 |
| 3 | valid claim | `claim valid: mint 1 NFT, tokenId=1`, `capacity test` | 6 |
| 4 | invalid signer | `signer tidak sah`, `signature tampered`, `signature untuk phaseId lain`, `signature kosong` | 7 |
| 5 | invalid claimant | `claimant != msg.sender -> 'Claimant mismatch'` | 7 |
| 6 | quantity != 1 | `quantity != 1` (qty 2), `quantity = 0` | 7 |
| 7 | expired signature | `deadline expired -> 'Expired deadline'`, `deadline = block.timestamp -> diterima` | 7 |
| 8 | future nonce | `future nonce -> 'Invalid nonce'` | 7 |
| 9 | past nonce | `replay signature (nonce sama) -> 'Invalid nonce'`, `transfer TIDAK reset nonce` | 7, 12 |
| 10 | replay | `replay signature (nonce sama)`, stale-sig replay after transfer | 7, 12 |
| 11 | campaign mismatch | `signature tampered (campaignId beda) -> 'Invalid signer'` | 7 |
| 12 | phase mismatch | `signature untuk phaseId lain -> 'Invalid signer'` | 7 |
| 13 | wrong chainId | `wrong chainId -> 'Invalid signer' (domain separator binding)` | **12** |
| 14 | wrong verifyingContract | `domain verifyingContract salah`, `domain version salah` | 7 |
| 15 | exhausted allocation | `cap = 0 -> semua claim revert Allocation exhausted` | 5 |
| 16 | duplicate wallet claim | `double claim wallet sama (nonce fresh, sig baru) -> 'Already claimed'` | 7 |
| 17 | transfer does not reset hasClaimed | `hasClaimed tidak reset oleh transfer -> tidak bisa claim 2x` | 7 |
| 18 | transfer does not reset nonce | `transfer TIDAK reset nonce (SECTION 22)` | **12** |
| 19 | paused claim | `claim saat paused -> 'Pausable: paused'` | 7 |
| 20 | transfers while paused | `pause TIDAK memblokir transfer sekunder` | 8 |
| 21 | Guardian permission boundaries | `guardian punya PAUSER_ROLE, TIDAK punya DEFAULT_ADMIN_ROLE`, `guardian TIDAK bisa unpause/config/grant` | 3 |
| 22 | Timelock permission boundaries | `non-owner tidak bisa memanggil fungsi onlyOwner`, `owner (Timelock) TIDAK bisa pause tanpa PAUSER_ROLE`, `unpause oleh owner` | 2, 8 |
| 23 | signer rotation | `signer rotation: SignerRotated + signer lama invalid, signer baru valid` | **12** |
| 24 | Ownable2Step ownership ceremony | `transferOwnership hanya pendingOwner -> acceptOwnership`, `owner awal = deployer, setelah ceremony = timelock` | 1, 2 |
| 25 | renounceOwnership rejection | `renounceOwnership SELALU revert (permanen disabled)` | 2 |
| 26 | metadata finalization | `finalizeMetadata mengunci baseURI permanen` | 9 |
| 27 | post-finalization metadata immutability | same test — mutation after finalize reverts | 9 |
| 28 | contractURI behavior | `contractURI() default kosong, bisa di-set owner, non-owner ditolak` | 9 |
| 29 | zero-value/free claim | `claim adalah free (non-payable): kirim value -> revert`, `kirim ETH langsung ke kontrak -> revert` | 6, 10 |
| 30 | MAX_SUPPLY exhaustion | `MAX_SUPPLY boundary: claim ke-2222 sukses, berikutnya 'Supply exhausted'`, `MAX_SUPPLY sudah tercapai` | **12** |
| 31 | state-machine transition restrictions | `transisi ilegal revert` ×3, `EXHAUSTED->ACTIVE ditolak`, `CLOSED itu terminal` | 4 |
| 32 | allocation cap restrictions | `cap di bawah claimed revert`, `cap TIDAK bisa diubah saat ACTIVE`, `isolasi antar phase` | 5 |
| 33 | relevant events | `Claim`, `PhaseStateChanged`, `AllocationCapChanged`, `MetadataFinalized`, `SignerRotated`, `Paused`, `Unpaused`, `OwnershipTransferStarted` | 2–12 |

**Items that were missing before this pass and were added in group 12:** #13 wrong chainId, #18 nonce survival across transfer, #23 signer rotation, #30 MAX_SUPPLY exhaustion, plus `Paused`/`Unpaused` event assertions.

### MAX_SUPPLY exhaustion — how it is actually executed
The `_totalSupply < MAX_SUPPLY` branch cannot be reached with real wallets (2,222 accounts). Instead of leaving it uncovered, group 12 forces state with a **white-box storage probe**: it scans slots `0..63`, writes the target value with `hardhat_setStorageAt`, checks `totalSupply()`, and **restores the original value for every non-matching slot** (so `_owner`/`_paused` are never left mutated). The test then proves the real boundary: at supply `2221` a claim succeeds and reaches `2222`; the next claim reverts `"Supply exhausted"`.

## 4. Evidence

```
$ npx hardhat --config hardhat.config.cjs compile
Compiled 29 Solidity files successfully (evm target: cancun)

$ npx hardhat --config hardhat.config.cjs test tests/TapeBornProductionNFT.test.js
  75 passing (3s)          # 0 failing

$ npm run test:contract
  75 passing (3s)          # NFT suite
  80 passing (2s)          # contract-access-behavioral + adversarial

$ node --test tests/engine*.test.js tests/adversarial-engine.test.js
# tests 49   # pass 49   # fail 0
```

**Total: 204/204 passing, 0 failing.**

Per-group counts: (1) 6 · (2) 3 · (3) 6 · (4) 7 · (5) 6 · (6) 4 · (7) 21 · (8) 4 · (9) 5 · (10) 2 · (11) 3 · (12) 8.

## 5. Findings and open items

| ID | Finding | Severity | Status |
|---|---|---|---|
| GAP-A | `DEFAULT_ADMIN_ROLE` is bootstrapped to the deployer in the constructor. The lock (line 344) requires the Timelock to hold it. This is **not a contract defect** (bootstrap matches the lock's owner pattern, line 341) — the ceremony was untested. | Medium (ceremony) | **Closed as test**: group 12 proves `grantRole(DEFAULT_ADMIN, timelock)` + `renounceRole(deployer)` leaves the deployer with **zero roles** and Timelock as sole admin, after which the deployer can no longer `grantRole`. Contract unchanged. Must be executed at deploy time (BUILD_033). |
| GAP-B | `MAX_SUPPLY` exhaustion path previously untested. | Low | **Closed** — see §3/§4. |
| GAP-C | Raising `allocationCap` while `EXHAUSTED` does not reopen the phase (`EXHAUSTED → ACTIVE` is rejected); an exhausted phase is permanent. | Medium (ops/UX) | Documented + asserted in group 4. Requires a founder decision if re-opening is ever needed (a raised cap on `EXHAUSTED` is currently inert). |
| GAP-D | `Claim` event field 3 is the **tokenId**, not a quantity. Indexers/backend must not read it as an amount. | Medium (integration) | Documented; matches Section 21. |
| GAP-E | `paths.artifacts` defaulted to `./artifacts`, shared with the tracked pipeline outputs `artifacts/build_*.json`. Hardhat's artifact auto-cleanup silently deleted **13 tracked files** on every compile/test run (`hardhat clean` was not required). | **High (data loss)** | **Fixed** — `hardhat.config.cjs` now uses `./artifacts-hardhat` and `./cache-hardhat`; `.gitignore` updated; `scripts/build_010.js` repointed; `deploy-test.js` repointed. Verified: all 13 `artifacts/*.json` survive a full compile+test run and `git status` stays clean. |

### Still open before mainnet (not part of BUILD_028B)
1. Deployment + role ceremony scripts (BUILD_033): ownership → Timelock, `DEFAULT_ADMIN_ROLE` → Timelock, `PAUSER_ROLE` → Guardian, deployer → zero roles, real Treasury Safe.
2. `deploy-test.js` remains untracked local tooling, as are the other `deploy-*.js` / `check-*.js` helpers.
3. `package.json` carries unrelated dependency additions (`dotenv`, `express`, `express-rate-limit`, `node-fetch`, `jest`, `supertest`) from a separate workstream — deliberately **not** included in the BUILD_028B commit.
4. Independent audit.

## 6. Commits

| Commit | Scope |
|---|---|
| `2942373` | `fix(build): isolate Hardhat artifacts to ./artifacts-hardhat (GAP-E)` |
| `ecedd0b` | `feat(nft): BUILD_028B production NFT contract + 75-test suite` |

Neither commit deploys anything. No mainnet interaction, no key usage.
