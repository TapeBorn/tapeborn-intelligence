# TapeBorn — On-chain Intelligence

> The chain leaves a tape. We read the trace.

TapeBorn is an **on-chain intelligence product**. We index Arc blocks and transactions, normalize them into a consistent schema, run a deterministic **Signal Engine** over the data, and mint the most meaningful findings as **Signal Artifacts** — ERC-721 / ERC-1155 NFTs with verifiable provenance.

NFTs are the artifact layer, not the entire product. The core value is the intelligence: traceable, evidence-backed, machine-verifiable.

## Stack

- **Runtime:** Node.js >= 20
- **Chain:** Arc Testnet (chain ID `5042002`) → Arc Mainnet (later)
- **Data layer:** JSON-RPC + (later) indexer
- **Artifact layer:** ERC-721 / ERC-1155

## Deployment Checklist (Mainnet)

Before deploying to Arc Mainnet, complete the following checklist:

1. **Network Configuration**
   - [ ] Verify mainnet chain ID (currently placeholder `5042000` — update from official docs)
   - [ ] Verify mainnet RPC URL (currently placeholder — update from official docs)
   - [ ] Test RPC connectivity with `npm run preflight`

2. **Wallet & Keys**
   - [ ] Create a dedicated mainnet deployment wallet (separate from testnet)
   - [ ] Fund wallet with sufficient USDC for deployment and gas
   - [ ] Store private key securely (not in repository, use environment variable)
   - [ ] Set `DEV_WALLET_PRIVATE_KEY` in secure environment (not committed)

3. **Contract Readiness**
   - [ ] Test contract on testnet (BUILD_010 already deployed)
   - [ ] Review contract code for production readiness
   - [ ] Verify contract ownership and admin controls
   - [ ] Set up multisig or admin wallet if needed

4. **Metadata & Provenance**
   - [ ] Verify metadata schema v1.0.0 is finalized
   - [ ] Test provenance and evidence fields with testnet deployment
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
   - [ ] Default network remains testnet (unless `ARC_NETWORK=mainnet` is explicitly set)
   - [ ] No private keys in source code or commit history
   - [ ] `.env` files excluded from version control (`.gitignore` must include `.env*`)

## Milestones

See `MASTER_ROADMAP.md` for the full 17-milestone plan.

| ID | Milestone | Status |
|---|---|---|
| BUILD_001 | Genesis Trace | DONE |
| BUILD_002 | Arc Connection | DONE
| BUILD_003 | Block Reader | DONE |
| BUILD_004 | Transaction Reader | DONE |
| BUILD_005 | Event Reader | DONE |
| BUILD_006 | USDC Flow | DONE |
| BUILD_007 | Wallet Activity | DONE |
| BUILD_008 | Signal Engine v0 | DONE |
| BUILD_009 | Signal Feed | PLANNED |
| BUILD_010 | First Signal Artifact | DONE (dry-run) |
| BUILD_011 | Metadata System | PLANNED |
| BUILD_012 | Public Dashboard | PLANNED |
| BUILD_013 | Reliability | PLANNED |
| BUILD_014 | Arc Mainnet Readiness | PLANNED |
| BUILD_015 | Genesis Collection | PLANNED |
| BUILD_016 | Launch | PLANNED |
| BUILD_017 | Post-launch | PLANNED |

## Build

```bash
npm run build:002   # verify Arc RPC connection, print latest block
```

Override RPC endpoint:

```bash
ARC_RPC_URL=https://rpc.quicknode.testnet.arc.io npm run build:002
```

## Layout

```
src/orchestrator/   # chain adapters, RPC clients
src/signal/         # signal engine (BUILD_008+)
src/artifact/       # NFT artifact pipeline (BUILD_010+)
scripts/            # one script per milestone, runnable + verifiable
```

## License

MIT — see `LICENSE`.
