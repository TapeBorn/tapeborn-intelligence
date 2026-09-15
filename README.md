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

| Build | Description | Status |
|-------|-------------|--------|
| BUILD_001 | Project scaffolding and Arc testnet connection | DONE |
| BUILD_002 | JSON-RPC data ingestion pipeline | DONE |
| BUILD_003 | Block and transaction normalization schema | DONE |
| BUILD_004 | Signal Engine v0 — deterministic signal detection | DONE |
| BUILD_005 | Signal classification and scoring | DONE |
| BUILD_006 | Metadata schema v1.0.0 design | DONE |
| BUILD_007 | ERC-721 contract draft | DONE |
| BUILD_008 | ERC-1155 contract draft | DONE |
| BUILD_009 | Provenance and evidence linking | DONE |
| BUILD_010 | Testnet deployment pipeline | DONE |
| BUILD_011 | Metadata validation and build scripts | DONE |
| BUILD_012 | Genesis collection minting (Token ID 0) | DONE |
| BUILD_013 | Signal artifact verification tooling | DONE |
| BUILD_014 | Dashboard v0 — signal explorer | DONE |
| BUILD_015 | API layer for signal queries | DONE |
| BUILD_016 | Multi-signal batch processing | DONE |
| BUILD_017 | Post-launch intelligence and chain evaluation | DONE |
| BUILD_018 | Signal Intelligence v1 | DONE |
| BUILD_019 | Signal Expansion (4 new signal types) | DONE |
| BUILD_020 | Agent Interface (read-only) | DONE |
| BUILD_021 | Roadmap Gap Analysis | NOT IMPLEMENTED (intentional gap — documented in MASTER_ROADMAP) |
| BUILD_022.1 | Mainnet Gate Hardening | DONE |
| BUILD_023 | Agent Hardening + Documentation Reconciliation | DONE |

> Full roadmap reference: see [MASTER_ROADMAP.md](MASTER_ROADMAP.md).
