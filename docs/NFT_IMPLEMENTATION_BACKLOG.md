# NFT Implementation Backlog

## Post-BUILD_024 Workstreams

After the architecture bridge and data boundaries are defined (BUILD_024), the following workstreams are required to reach a production‑ready NFT collection. Each item is a *proposed* task; none are approved or implemented yet.

### 1. NFT Specification
- [ ] Finalize trait inventory (visual/trait categories derived from signal types)
- [ ] Define rarity weights per trait (to be approved by founder)
- [ ] Establish coordinate system (if generative art uses spatial traits)
- [ ] Set collision resolution rules (how to handle identical signal IDs)
- [ ] Choose token standard (ERC‑721 vs ERC‑1155) and justify
- [ ] Define metadata schema versioning (v1.0.0 → v2.0.0)

### 2. Art‑Production System
- [ ] Build SVG/PNG generator that maps signal provenance to visual traits
- [ ] Implement trait matrix (e.g., signal type → shape, confidence → color, block number → position)
- [ ] Add generator validation (unit tests, property‑based tests for determinism)
- [ ] Integrate with intelligence layer to receive signal ID and provenance
- [ ] Create bulk generation script for testnet collection

### 3. Metadata Pipeline
- [ ] Implement metadata JSON generator (name, description, image, attributes, provenance_ref)
- [ ] Decide storage layer: IPFS/Filecoin/Arweave vs on‑chain
- [ ] Build upload/pinning automation (or on‑chain calldata)
- [ ] Ensure immutability of stored metadata before NFT mint
- [ ] Create metadata schema documentation and versioning guide

### 4. Production NFT Contract
- [ ] Replace `SignalArtifact.sol` with a production contract implementing CP‑01 through CP‑12
- [ ] Integrate access control (Timelock + Multisig + Guardian)
- [ ] Enforce mint authority (who can call `_mint` and under what conditions)
- [ ] Implement pause functionality (mint only, or full contract pause)
- [ ] Set MAX_SUPPLY (if any) and mint price (if applicable)
- [ ] Add royalties (if using ERC‑2981 or similar)
- [ ] Include upgradeability plan (if desired) or mark as immutable
- [ ] Write comprehensive test suite (behavioral, invariants, fork testing)

### 5. Testnet Collection
- [ ] Deploy testnet version of production contract to Arc Testnet
- [ ] Mint a limited testnet collection (e.g., 100 signals) using the full pipeline
- [ ] Verify on‑chain and off‑chain data consistency (tokenURI → metadata → artifact)
- [ ] Run negative tests (unauthorized mint, pause, etc.)
- [ ] Publish testnet collection on a block explorer (for verification only)

### 6. Security
- [ ] Engage independent security audit (production contract and minting pipeline)
- [ ] Address all findings before mainnet consideration
- [ ] Add fuzzing and invariant testing to CI
- [ ] Ensure no private keys are leaked in logs or artifacts

### 7. Deployment & Operations
- [ ] Finalize mainnet deployment checklist (wallet, keys, network config)
- [ ] Build deployment scripts (with simulation/dry‑run modes)
- [ ] Create post‑deployment verification steps (contract ownership, role assignments)
- [ ] Plan monitoring and alerting for the NFT contract (mint events, pauses)
- [ ] Draft incident response runbook (including emergency procedure CP‑12)

## Production‑Readiness Gaps (from Audit) – Backlog Items

These are *not* decisions; they are gaps that must be closed as part of the above workstreams. They are listed here for tracking but do not imply founder approval.

- [ ] **Mainnet USDC Address Placeholder** – set official Circle USDC address for Arc Mainnet
- [ ] **Signal Engine usdcDecimals Reference Error** – fix config injection in adversarial test
- [ ] **Provenance Timestamp Integrity** – make immutability model explicit in code/metadata
- [ ] **Signal ID Canonical Form** – replace custom hash with `keccak256`
- [ ] **Persistent Signal State** – fully utilize SQLite persistence across restarts
- [ ] **Contract Supply Model** – decide on capped vs unlimited supply and implement
- [ ] **Pause Semantics Granularity** – review whether mint‑only pause is sufficient
- [ ] **Monitoring / Alerting / Incident Response** – implement production‑ready observability
- [ ] **Documentation of Emergency Procedure** – codify CP‑12 in a runbook and test end‑to‑end
- [ ] **Independent Security Audit** – engage auditor and remediate findings
- [ ] **Production Custody / Legal Compliance** – define treasury/admin multisig custody model

---
*Status: PROPOSED (backlog for post‑BUILD_024 work)*
*Last updated: 2026-09-23*