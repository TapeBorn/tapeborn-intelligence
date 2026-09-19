# SignalArtifact Deployment Guide

## Overview

This guide covers the deployment of the SignalArtifact NFT contract to Arc Mainnet (Chain ID: 5042) following the R5 admin model and R7 production infrastructure hardening.

## Prerequisites

### Required Environment Variables

```bash
# Wallet with deployment funds (mainnet)
DEV_WALLET_PRIVATE_KEY=0x...

# Arc RPC endpoints
ARC_RPC_URL_TESTNET=https://rpc.testnet.arc.io
ARC_RPC_URL_MAINNET=https://rpc.mainnet.arc.io

# Optional: Explorer API keys for verification
ARC_EXPLORER_API_KEY=...

# Optional: Telegram notifications
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

### Node.js Version

Required: Node.js >= 20.18.0 (pinned in `.nvmrc`)

### Dependencies

```bash
npm ci
```

## Deployment Parameters (R5 Admin Model)

| Parameter | Value | Type |
|-----------|-------|------|
| Name | SignalArtifact | Immutable (constructor) |
| Symbol | SIG | Immutable (constructor) |
| Base URI | https://api.tapeborn.io/metadata/ | Configurable (owner-only) |
| Mint Fee | 0.001 ETH | Configurable (owner-only) |
| Max Supply | 10,000 | Configurable (owner-only) |

## Deployment Process

### 1. Pre-flight Checks

Run preflight checks to verify mainnet readiness:

```bash
npm run preflight
```

This verifies:
- Network configs exist for testnet and mainnet
- Default network is testnet (safe)
- No .env files in repository
- No hardcoded private keys
- Testnet RPC reachable (chainId 5042002)
- Mainnet RPC reachable (chainId 5042)
- Mainnet RPC verified official

### 2. Dry Run (Testnet)

Test deployment on Arc Testnet first:

```bash
# Deploy to testnet
npx hardhat run scripts/deploy-mainnet.js --network arcTestnet

# Or with dry-run flag (estimates gas only)
node scripts/deploy-mainnet.js --dry-run
```

### 3. Mainnet Deployment

Deploy to Arc Mainnet:

```bash
# With verification
node scripts/deploy-mainnet.js --verify

# Or without verification (verify later)
node scripts/deploy-mainnet.js
```

### 4. Contract Verification

Verify contract on Arc Explorer:

```bash
# Automatic verification (if deployment info exists)
node scripts/verify-contract.js <CONTRACT_ADDRESS>

# Manual verification
npx hardhat verify --network arcMainnet <CONTRACT_ADDRESS> "SignalArtifact" "SIG" "https://api.tapeborn.io/metadata/" 1000000000000000 10000
```

## Gas Estimation

Typical deployment costs on Arc Mainnet:
- Gas limit: ~2,500,000
- Gas price: ~1-5 gwei
- Estimated cost: ~0.005-0.025 ETH

Always run dry-run first to get accurate estimate.

## Post-Deployment Verification

After deployment, verify:

1. **Contract parameters match:**
   ```bash
   # Check via hardhat console
   npx hardhat console --network arcMainnet
   > const contract = await ethers.getContractAt("SignalArtifact", "<ADDRESS>")
   > await contract.name()
   > await contract.symbol()
   > await contract.baseURI()
   > await contract.mintFee()
   > await contract.maxSupply()
   > await contract.owner()
   > await contract.paused()
   ```

2. **Explorer verification:** Check contract on https://explorer.mainnet.arc.io

3. **Test mint:** Perform a test mint with owner wallet

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) handles:

1. **Lint & Test** - Runs on every push/PR:
   - Compilation check
   - Engine tests (`npm run test`)
   - Hardhat tests (`npm run test:hardhat`)
   - Preflight checks

2. **Deploy Testnet** - On merge to main:
   - Deploys to Arc Testnet
   - Verifies on testnet explorer

3. **Deploy Mainnet** - Manual confirmation required:
   - Dry-run first
   - Actual deployment (when confirmed)
   - Verification on mainnet explorer

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DEV_WALLET_PRIVATE_KEY` | Wallet private key for deployment |
| `ARC_RPC_URL_TESTNET` | Testnet RPC URL |
| `ARC_RPC_URL_MAINNET` | Mainnet RPC URL |
| `ARC_EXPLORER_API_KEY` | Explorer API key for verification |
| `TELEGRAM_BOT_TOKEN` | Optional: Telegram notifications |
| `TELEGRAM_CHAT_ID` | Optional: Telegram chat ID |

## Rollback Procedures

### If Deployment Fails

1. Check deployment transaction on explorer
2. Verify gas price wasn't too low
3. Check wallet balance
4. Re-run with higher gas price if needed

### If Contract Has Issues

The SignalArtifact contract (R5) supports:
- **Pause minting:** `contract.pause()` - stops all minting
- **Update parameters:** `setMintFee()`, `setMaxSupply()`, `setBaseURI()`
- **Withdraw fees:** `withdrawFees()` - recover stuck ETH
- **Transfer ownership:** `transferOwnership(newOwner)`

### Emergency Pause

```bash
npx hardhat console --network arcMainnet
> const contract = await ethers.getContractAt("SignalArtifact", "<ADDRESS>")
> await contract.pause()
```

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

## Support

- **Arc Mainnet RPC:** https://rpc.mainnet.arc.io
- **Arc Explorer:** https://explorer.mainnet.arc.io
- **Arc Testnet RPC:** https://rpc.testnet.arc.io
- **Arc Testnet Explorer:** https://explorer.testnet.arc.io

## Contract Addresses

| Network | Contract Address | Explorer |
|---------|------------------|----------|
| Arc Mainnet | TBD after deployment | https://explorer.mainnet.arc.io |
| Arc Testnet | TBD after deployment | https://explorer.testnet.arc.io |

---

*Last updated: 2026-09-19*
*Version: 1.0.0 (R7)*