# TapeBorn — On-chain Intelligence

> The chain leaves a tape. We read the trace.

TapeBorn is an **on-chain intelligence product**. We index Arc blocks and transactions, normalize them into a consistent schema, run a deterministic **Signal Engine** over the data, and mint the most meaningful findings as **Signal Artifacts** — ERC-721 / ERC-1155 NFTs with verifiable provenance.

NFTs are the artifact layer, not the entire product. The core value is the intelligence: traceable, evidence-backed, machine-verifiable.

## Stack

- **Runtime:** Node.js >= 20
- **Chain:** Arc Testnet (chain ID `5042002`) → Arc Mainnet (later)
- **Data layer:** JSON-RPC + (later) indexer
- **Artifact layer:** ERC-721 / ERC-1155

## Genesis Collection

| Property | Value |
|---|---|
| Collection name | Signal Artifacts / ARC / 001 |
| Symbol | SIG |
| Genesis supply | 1 (Token ID 0) |
| Max supply | Unlimited (admin-mint only) |
| Minting policy | Admin-only via BUILD_010 pipeline |
| Token ID | Sequential, starting at 0 |
| Contract address | `0x80B87fa686C8FC91A5252854E82ea282c1B6b814` |
| Deployer | `0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f` |
| Deployment TX | `0x8dec28c1a587c2a534433f41a4e2e613f44fc5313c1de8c993c0855b85e9537c` |
| Mint TX | `0x3d2bad4ffb055841ebc52625eaf5eb5ea273d2bea3b8051e83ebd41723ca40ed` |
| Signal ID | `sig_454539d0` |
| Source TX | `0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0587` |
| Source Block | 60347218 |
| Metadata schema | v1.0.0 |

See [`artifacts/genesis_collection.json`](artifacts/genesis_collection.json) for full parameters and provenance.

## Deployment Checklist (Mainnet)

Before deploying to Arc Mainnet, complete the following checklist:

1. **Network Configuration**
   - [ ] Verify mainnet chain ID (`5042` — official from Circle/Arc docs)
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
|| BUILD_009 | Signal Feed | DONE |
|| BUILD_010 | First Signal Artifact | DONE |
|| BUILD_011 | Metadata System | DONE |
|| BUILD_012 | Public Dashboard | DONE |
|| BUILD_013 | Reliability | DONE |
|| BUILD_014 | Arc Mainnet Readiness | DONE |
|| BUILD_015 | Genesis Collection | DONE |
|| BUILD_016 | Launch | PLANNED |
|| BUILD_017 | Post-launch | PLANNED |

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
