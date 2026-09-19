# SignalArtifact Security Audit Package

## Project Overview

**Project:** TapeBorn SignalArtifact NFT Contract  
**Network:** Arc Mainnet (Chain ID: 5042) / Arc Testnet (Chain ID: 5042002)  
**Solidity Version:** ^0.8.24  
**EVM Target:** Cancun  
**Compiler Settings:** Optimizer enabled, 200 runs  

## Contract Summary

### SignalArtifact.sol

**Purpose:** NFT contract for TapeBorn Signal Artifacts - on-chain intelligence signal tokens

**Inheritance:** ERC721, Ownable, Pausable

**Version:** 1.0.0 (R5 - FROZEN admin model)

### Immutable Parameters (Constructor Only)

| Parameter | Value | Description |
|-----------|-------|-------------|
| `name` | "SignalArtifact" | Token name |
| `symbol` | "SIG" | Token symbol |

### Configurable Parameters (Owner-Only)

| Parameter | Default | Description | Setter |
|-----------|---------|-------------|--------|
| `baseURI` | "https://api.tapeborn.io/metadata/" | Base URI for token metadata | `setBaseURI()` |
| `mintFee` | 0.001 ETH | Fee to mint (in wei) | `setMintFee()` |
| `maxSupply` | 10,000 | Maximum total supply (0 = unlimited) | `setMaxSupply()` |

### Admin Functions (Owner-Only, FROZEN)

| Function | Description | Reverts If |
|----------|-------------|------------|
| `pause()` | Pause minting | Not owner, already paused |
| `unpause()` | Unpause minting | Not owner, not paused |
| `setMintFee(uint256)` | Update mint fee | Not owner |
| `setMaxSupply(uint256)` | Update max supply | Not owner, new < current supply |
| `setBaseURI(string)` | Update base URI | Not owner |
| `withdrawFees()` | Withdraw collected fees | Not owner, no fees |
| `transferOwnership(address)` | Transfer ownership | Not owner |

### Mint Function

```solidity
function mint(address to, string memory uri) external payable onlyOwner whenNotPaused
```

**Requirements:**
- Caller must be owner
- Contract not paused
- `msg.value >= mintFee`
- `totalSupply() < maxSupply` (if maxSupply > 0)

**Events:** `TokenMinted(uint256 tokenId, address to, string uri)`

### Events

| Event | Parameters |
|-------|------------|
| `MintFeeChanged` | `oldFee`, `newFee` |
| `MaxSupplyChanged` | `oldMax`, `newMax` |
| `BaseURIChanged` | `oldURI`, `newURI` |
| `TokenMinted` | `tokenId`, `to`, `uri` |

## Security Model

### Access Control
- **Owner:** Single address (Ownable)
- **Pausable:** Minting can be paused (Pausable)
- **No multi-sig:** Single owner model (by design for MVP)

### Reentrancy Protection
- `mint()`: State updated before external calls (none in mint)
- `withdrawFees()`: Uses `transfer()` with 2300 gas stipend

### Integer Overflow
- Solidity 0.8.24 built-in overflow checks
- No unchecked arithmetic

### Known Limitations

1. **Single Owner:** No multi-sig or timelock for admin functions
2. **No Upgradeability:** Contract is not upgradeable
3. **BaseURI Concatenation:** Simple string concatenation, no validation
4. **Mint Fee:** No refund for overpayment
4. **TotalSupply Tracking:** Manual counter (no ERC721Enumerable)

## Test Coverage

### Behavioral Tests (27 tests)

| Category | Tests |
|----------|-------|
| Deployment | 4 |
| Mint Access Control | 3 |
| Pause/Unpause Access Control | 4 |
| Mint When Paused | 2 |
| TokenURI Storage | 1 |
| Configurable Parameters | 8 |
| Mint Fee Enforcement | 3 |
| Max Supply Enforcement | 1 |
| **Total** | **27** |

### Adversarial Tests (53 tests)

| Category | Tests |
|----------|-------|
| Constructor Edge Cases | 7 |
| Mint Edge Cases | 7 |
| Mint Fee Edge Cases | 6 |
| Max Supply Edge Cases | 7 |
| Pause/Unpause Edge Cases | 4 |
| BaseURI Edge Cases | 7 |
| Withdraw Fees Edge Cases | 3 |
| TotalSupply Invariants | 2 |
| Reentrancy Protection | 2 |
| Access Control Invariants | 7 |
| Ownership Transfer | 2 |
| **Total** | **53** |

### Engine Adversarial Tests (29 tests)

| Category | Tests |
|----------|-------|
| detectAddressReactivation | 10 |
| generateSignalId | 6 |
| detectLargeTransfers | 6 |
| detectContractCreations | 5 |
| detectTokenFlowAnomaly | 3 |
| **Total** | **29** |

## Deployment Scripts

### deploy-mainnet.js
- Pre-flight checks (RPC, balance, network)
- Gas estimation
- Parameter validation
- Dry-run mode
- Automatic verification option
- Deployment record saving

### verify-contract.js
- Reads constructor args from deployment records
- Supports manual and automatic verification
- Updates deployment records with verification status

## CI/CD Pipeline

**File:** `.github/workflows/ci-cd.yml`

### Jobs

1. **Lint & Test** (runs on push/PR)
   - Compilation check
   - Engine tests (`npm run test`)
   - Hardhat tests (`npm run test:hardhat`)
   - Preflight checks

2. **Deploy Testnet** (auto on main push)
   - Deploys to Arc Testnet
   - Verifies on testnet explorer

3. **Deploy Mainnet** (manual confirmation)
   - Dry-run first
   - Actual deployment (when confirmed)
   - Verification on mainnet explorer

4. **Notify** (Telegram)

### Required Secrets
- `DEV_WALLET_PRIVATE_KEY`
- `ARC_RPC_URL_TESTNET`
- `ARC_RPC_URL_MAINNET`
- `ARC_EXPLORER_API_KEY`
- `TELEGRAM_BOT_TOKEN` (optional)
- `TELEGRAM_CHAT_ID` (optional)

## Deployment Checklist

- [ ] Preflight checks pass (`npm run preflight`)
- [ ] All tests pass (`npm run test` && `npm run test:hardhat`)
- [ ] Testnet deployment successful
- [ ] Testnet verification successful
- [ ] Dry-run mainnet deployment successful
- [ ] Wallet has sufficient ETH (>0.1 ETH recommended)
- [ ] Gas price checked (not during congestion)
- [ ] Mainnet deployment executed
- [ ] Contract verified on Arc Explorer
- [ ] Deployment info saved to `deployments/`
- [ ] Post-deployment verification complete
- [ ] Test mint performed

## Rollback Procedures

### Emergency Pause
```solidity
contract.pause()  // Stops all minting
```

### Parameter Updates
```solidity
setMintFee(newFee)      // Update mint fee
setMaxSupply(newMax)    // Update max supply (cannot reduce below current)
setBaseURI(newURI)      // Update base URI
```

### Fee Recovery
```solidity
withdrawFees()  // Recover stuck ETH
```

### Ownership Transfer
```solidity
transferOwnership(newOwner)
```

## Gas Estimates

| Operation | Estimated Gas |
|-----------|---------------|
| Deployment | ~2,500,000 |
| Mint | ~150,000 |
| Pause/Unpause | ~30,000 |
| Set Parameter | ~30,000 |
| Withdraw Fees | ~25,000 |

## External Resources

- **Arc Mainnet RPC:** https://rpc.mainnet.arc.io
- **Arc Explorer:** https://explorer.mainnet.arc.io
- **Arc Testnet RPC:** https://rpc.testnet.arc.io
- **Arc Testnet Explorer:** https://explorer.testnet.arc.io

## Contact

**Project:** TapeBorn Intelligence  
**Repository:** https://github.com/TapeBorn/tapeborn-intelligence  
**Main Branch:** `main`  
**Latest Commit:** `79e9f1a` (R7 complete)

---

*Prepared for Independent Security Review*  
*Date: 2026-09-19*  
*Version: 1.0.0*