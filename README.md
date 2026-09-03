# TapeBorn — On-chain Intelligence

> The chain leaves a tape. We read the trace.

TapeBorn is an **on-chain intelligence product**. We index Arc blocks and transactions, normalize them into a consistent schema, run a deterministic **Signal Engine** over the data, and mint the most meaningful findings as **Signal Artifacts** — ERC-721 / ERC-1155 NFTs with verifiable provenance.

NFTs are the artifact layer, not the entire product. The core value is the intelligence: traceable, evidence-backed, machine-verifiable.

## Stack

- **Runtime:** Node.js >= 20
- **Chain:** Arc Testnet (chain ID `5042002`) → Arc Mainnet (later)
- **Data layer:** JSON-RPC + (later) indexer
- **Artifact layer:** ERC-721 / ERC-1155

## Milestones

See `MASTER_ROADMAP.md` for the full 17-milestone plan.

| ID | Milestone | Status |
|---|---|---|
| BUILD_001 | Genesis Trace | DONE |
| BUILD_002 | Arc Connection | DONE
| BUILD_003 | Block Reader | DONE |
| BUILD_004 | Transaction Reader | DONE |
| BUILD_005 | Event Reader | PLANNED |
| BUILD_006 | USDC Flow | PLANNED |
| BUILD_007 | Wallet Activity | PLANNED |
| BUILD_008 | Signal Engine v0 | PLANNED |
| BUILD_009 | Signal Feed | PLANNED |
| BUILD_010 | First Signal Artifact | PLANNED |
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
