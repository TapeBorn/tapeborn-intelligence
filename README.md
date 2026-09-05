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

## Milestones\n\nSee `MASTER_ROADMAP.md` for the full 17-milestone plan.\n\n| ID | Milestone | Status |\n|---|---|---|\n| BUILD_001 | Genesis Trace | VERIFIED |\n| BUILD_002 | Arc Connection | VERIFIED\n| BUILD_003 | Block Reader | VERIFIED |\n| BUILD_004 | Transaction Reader | VERIFIED |\n| BUILD_005 | Event Reader | VERIFIED |\n| BUILD_006 | USDC Flow | VERIFIED |\n| BUILD_007 | Wallet Activity | VERIFIED |\n| BUILD_008 | Signal Engine v0 | VERIFIED |\n|| BUILD_009 | Signal Feed | VERIFIED |\n|| BUILD_010 | First Signal Artifact | VERIFIED |\n|| BUILD_011 | Metadata System | VERIFIED |\n|| BUILD_012 | Public Dashboard | VERIFIED |\n|| BUILD_013 | Reliability | VERIFIED |\n|| BUILD_014 | Arc Mainnet Readiness | PARTIAL (config ready, RPC blocked) |\n|| BUILD_015 | Genesis Collection | VERIFIED |\n|| BUILD_016 | Launch | PARTIAL (not launched — code hardening only) |\n|| BUILD_017 | Post-launch | VERIFIED (anticipatory, implemented before launch) |\n|| BUILD_018 | Signal Intelligence v1 | VERIFIED |\n|| BUILD_019 | Signal Expansion | VERIFIED |\n|| BUILD_020 | Agent Interface | VERIFIED |\n|| BUILD_021 | Not Implemented | NOT IMPLEMENTED |\n|| BUILD_022.1 | Mainnet Gate Hardening | VERIFIED |\n\n## Genesis Collection\n\n| Property | Value |\n|---|---|\n| Collection name | Signal Artifacts / ARC / 001 |\n| Symbol | SIG |\n| Genesis supply | 1 (Token ID 0) |\n| Max supply | Unlimited (admin-mint only) |\n| Minting policy | Admin-only via BUILD_010 pipeline |\n| Token ID | Sequential, starting at 0 |\n| Contract address | `0x80B87fa686C8FC91A5252854E82ea282c1B6b814` |\n| Deployer | `0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f` |\n| Deployment TX | `0x8dec28c1a587c2a534433f41a4e2e613f44fc5313c1de8c993c0855b85e9537c` |\n| Mint TX | `0x3d2bad4ffb055841ebc52625eaf5eb5ea273d2bea3b8051e83ebd41723ca40ed` |\n| Signal ID | `sig_454539d0` |\n| Source TX | `0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0587` |\n| Source Block | 60347218 |\n| Metadata schema | v1.0.0 |\n\nSee [`artifacts/genesis_collection.json`](artifacts/genesis_collection.json) for full parameters and provenance.\n\n## Deployment Checklist (Mainnet)\n\nBefore deploying to Arc Mainnet, complete the following checklist:\n\n1. **Network Configuration**\n   - [ ] Verify mainnet chain ID (`5042` — official from Circle/Arc docs)\n   - [ ] Verify mainnet RPC URL (currently placeholder — update from official docs)\n   - [ ] Test RPC connectivity with `npm run preflight`\n\n2. **Wallet & Keys**\n   - [ ] Create a dedicated mainnet deployment wallet (separate from testnet)\n   - [ ] Fund wallet with sufficient USDC for deployment and gas\n   - [ ] Store private key securely (not in repository, use environment variable)\n   - [ ] Set `DEV_WALLET_PRIVATE_KEY` in secure environment (not committed)\n\n3. **Contract Readiness**\n   - [ ] Test contract on testnet (BUILD_010 already deployed)\n   - [ ] Review contract code for production readiness\n   - [ ] Verify contract ownership and admin controls\n   - [ ] Set up multisig or admin wallet if needed\n\n4. **Metadata & Provenance**\n   - [ ] Verify metadata schema v1.0.0 is finalized\n   - [ ] Test provenance and evidence fields with testnet deployment\n   - [ ] Confirm deterministic Signal ID generation\n\n5. **Deployment Plan**\n   - [ ] Run `npm run preflight` — all checks must pass\n   - [ ] Run `npm run test` — all tests must pass\n   - [ ] Run `npm run build:011` — metadata validation must pass\n   - [ ] Run `npm run build:010_dryrun` — dry-run must pass\n   - [ ] Set `ARC_NETWORK=mainnet` before deployment\n   - [ ] Execute `npm run build:010` for real deployment\n\n6. **Post-Deployment**\n   - [ ] Verify contract on block explorer\n   - [ ] Confirm token ID 0 exists\n   - [ ] Verify metadata URI is accessible\n   - [ ] Document deployment transaction hashes\n\n7. **Safety Guards**\n   - [ ] Default network remains testnet (unless `ARC_NETWORK=mainnet` is explicitly set)\n   - [ ] No private keys in source code or commit history\n   - [ ] `.env` files excluded from version control (`.gitignore` must include `.env*`)\n\n## BUILD_018 — Signal Intelligence v1\n\n**Objective:** Improve signal quality, fix known issues, parameterize metadata, add quality/completeness evaluation.\n\n**Implemented:**\n\n- Fixed `high_frequency_wallet` `sourceTransaction` null issue by making it optional in provenance schema.\n- Parameterized metadata network info (chain name/chainId) using `networks.js` instead of hardcoded values.\n- Added `quality` field to signals: `{ status: 'complete' | 'partial', missing: [...] }` based on required evidence per signal type.\n- Enhanced usage report to maintain history (append to `build_017_usage_report.json` as an array).\n- Updated dashboard to display signal quality.\n\n**Verification:**\n\n```bash\nnpm test\nnpm run build:011\nnpm run build:010_dryrun\nnpm run build:012\nnpm run build:017_usage\nnpm run preflight\n```\n\n**Known limitations:**\n\n- Quality evaluation is based on static per-type requirements; may need tuning for new signal types.\n\n## BUILD_017 — Post-launch Intelligence\n\n**Objective:** Measure usage, improve signals, evaluate new chains.\n\n**Implemented:**\n\n- Usage measurement script (`scripts/build_017_usage.js`) — scans last 100 blocks, aggregates signal types, confidence distribution, evidence availability.\n- Chain evaluation artifact (`artifacts/build_017_chain_evaluation.json`) — architectural analysis for adding EVM chains without rewriting core.\n- No blockchain transactions, no mainnet deployment, no wallet signing.\n\n**Verification:**\n\n```bash\nnpm run build:017_usage   # generates usage report\n```\n\n**Known limitations:**\n\n- Usage measurement is runtime snapshot, not persistent historical tracking.\n- Chain evaluation is theoretical; actual multi-chain support requires testing with additional testnet.\n- Metadata schema currently hardcodes Arc Testnet; parameterization is recommended for multi-chain.\n\n## BUILD_020 — Agent Interface\n\n**Objective:** Provide read-only HTTP interface for Signal Artifact data.\n\n**Implemented:**\n\n- Read-only HTTP server on port 3458\n- Endpoints:\n  - `/health` — returns chain, chainId, latestBlock\n  - `/signals?limit=<n>&page=<n>` — returns paginated signals (limit 1-100, page >=1, default limit=10, page=1)\n  - `/signals/:signalId` — returns specific signal by signalId\n  - `/provenance/:signalId` — returns provenance only for a signal\n  - `/evidence/:txHash` — returns signals by transaction hash\n- Rate limiting: 10 requests per second per IP (configurable)\n- No transaction signing, no private key usage, no state mutation\n\n**Verification:**\n\n```bash\nnpm test\nnpm run build:020\ncurl http://localhost:3458/health\ncurl \"http://localhost:3458/signals?limit=1&page=1\"\n```\n\n**Security:**\n\n- Read-only interface — no POST/PUT/DELETE methods\n- No wallet interaction\n- No transaction submission\n\n## BUILD_023 — Agent Interface Hardening + Documentation Reconciliation\n\n**Objective:** Harden Agent Interface and reconcile documentation with actual state.\n\n**Implemented:**\n\n- Rate limiting added to Agent Interface (10 req/sec)\n- Pagination added to `/signals` endpoint (page & limit params)\n- README updated to reflect actual BUILD statuses from master audit\n- Corrected BUILD_010 description to emphasize REAL on-chain deployment\n- Clarified that mainnet deployment is BLOCKED pending official RPC\n- Documented BUILD_016 as PARTIAL (not launched)\n- Documented BUILD_017 as anticipatory post-launch implementation\n\n**Verification:**\n\n```bash\nnpm test\nnpm run build:020\nnpm run preflight\n```\n\n## Build\n\n```bash\nnpm run build:002   # verify Arc RPC connection, print latest block\n```\n\nOverride RPC endpoint:\n\n```bash\nARC_RPC_URL=https://rpc.quicknode.testnet.arc.io npm run build:002\n```\n\n## Layout\n\n```\nsrc/orchestrator/   # chain adapters, RPC clients\nsrc/signal/         # signal engine (BUILD_008+)\nsrc/artifact/       # NFT artifact pipeline (BUILD_010+)\nscripts/            # one script per milestone, runnable + verifiable\n```\n\n## License\n\nMIT — see `LICENSE`.
