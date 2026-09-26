# NFT Intelligence to Architecture Bridge

## Overview

This document defines the architectural bridge between the TapeBorn Intelligence Layer and the eventual NFT production system. It specifies how raw blockchain data is transformed into verifiable, provenance-rich NFTs (Signal Artifacts) while maintaining a clear separation between experimental/testnet artifacts (Genesis SignalArtifact) and the future production NFT collection.

## Data Flow

```mermaid
flowchart LR
    A[Blockchain Event] --> B[Signal Engine]
    B --> C[Canonical Signal ID]
    C --> D[Provenance & Evidence]
    D --> E[Artifact Generation]
    E --> F[NFT Minting]
    F --> G[On-chain NFT (ERC-721/1155)]
```

### Step-by-step

1. **Blockchain Event**
   Raw on-chain data (transactions, logs, state changes) captured via Arc RPC client with retry, rate‑limit, and validation.

2. **Signal Engine**
   Seven deterministic detectors (contract creation, large transfer, high frequency, contract interaction, wallet burst, token flow anomaly, address reactivation) evaluate events against the canonical signal specification (`signal-spec.yaml`). Each detector outputs a raw signal with:
   - Signal type
   - Raw evidence (tx hash, block, addresses, values)
   - Confidence score
   - Timestamp

3. **Canonical Signal ID**
   Each signal is assigned a deterministic, collision-resistant ID derived from its provenance.
   **Current:** Custom hash (to be replaced with `keccak256` per founder decision).
   **Future:** `keccak256(abi.encodePacked(signalType, normalizedEvidence, blockNumber, txIndex))`.

4. **Provenance & Evidence**
   The intelligence layer attaches immutable evidence to each signal:
   - Source transaction hash
   - Source block number
   - Event logs (decoded)
   - Pre‑ and post‑state snapshots (where feasible)
   - Detection methodology (which detector, parameters)
   - Confidence components
   This evidence is stored in the intelligence layer’s persistence (SQLite) and referenced in the NFT metadata.

5. **Artifact Generation**
   Using the signal ID and provenance, the system generates:
   - A visual/trace representation (SVG, PNG) via the art‑production system (planned)
   - A metadata JSON file adhering to the metadata schema (`v1.0.0` → future versions)
   - An IPFS‑compatible CID (if external storage is used) or direct URI

6. **NFT Minting**
   The production NFT contract mints an ERC‑721/1155 token whose:
   - `tokenId` is derived from the canonical signal ID (or a mapped range)
   - `tokenURI` points to the metadata JSON (on‑chain, IPFS, or other storage)
   - The contract enforces mint authority, pause status, and supply limits per founder decisions.

## Genesis SignalArtifact: Experiment, Not Production

- The currently deployed contract `SignalArtifact.sol` on Arc Testnet (`0x80B87fa686C8FC91A5252854E82ea282c1B6b814`) is an **experimental genesis layer**.
- It was used to validate the Signal Artifact infrastructure (deploy → mint → metadata → provenance).
- **It is NOT the final public TapeBorn NFT collection.**
- The genesis contract:
  - Uses `Ownable + Pausable` (not the intended production admin model)
  - Has unlimited supply (`MAX_SUPPLY` configurable but not set)
  - Mint policy is admin‑only (`mintPaused` configurable)
  - Metadata schema is `v1.0.0` (subject to change)
- All findings from the genesis experiment inform the production specification but do not constitute prior art for the final collection.

## Data Classification

| Layer | Description | Example | Mutability |
|-------|-------------|---------|------------|
| **Source Data** | Raw blockchain events as received from Arc RPC | Tx `0x...`, block `63564109`, log `Transfer` | Immutable (on‑chain) |
| **Derived Data** | Output of signal engine: signal type, confidence, canonical signal ID | Signal ID `sig_abc123`, type `large_transfer`, confidence `0.87` | Immutable once computed (deterministic) |
| **Artifact** | Off‑chain representation (SVG, PNG, audio, etc.) derived from signal + provenance | SVG trace of a large USDC transfer | Mutable until frozen (planned immutability via CID/hash) |
| **Metadata** | JSON file describing the NFT, referencing artifact and provenance | `{name: "Signal Artifact #42", description: ..., image: "ipfs://.../svg", attributes: [...]}` | Mutable until storage is fixed (IPFS/Filecoin) or on‑chain |
| **NFT** | On‑chain token (ERC‑721/1155) with `tokenId`, `tokenURI`, ownership, and transfer history | Token ID `1001`, contract `0x...`, owner `0x...` | Immutable after mint (except burning if supported) |

## Separation of Concerns

- **Intelligence Layer** → Responsible for steps 1‑4 (event → signal ID → provenance).
  Lives in `src/orchestrator`, `src/signal`, `src/metadata`, persistence (`SQLite`).
- **Art‑Production System** → Responsible for step 5 (artifact generation).
  Planned in `src/visual` and external generative art pipeline.
- **Metadata Pipeline** → Responsible for step 5 (metadata JSON) and step 6 (link to NFT).
  Will produce metadata JSON and handle storage (IPFS, Arweave, or on‑chain).
- **Production NFT Contract** → Responsible for step 6 (minting, ownership, enforcement).
  Will replace `SignalArtifact.sol` with a contract implementing CP‑01 through CP‑12.

## Open Questions (Founder Decisions)

See `BUILD_024_DECISIONS_REQUIRED.md` for the complete list of decisions that must be resolved before implementation can begin.

---
*Status: PROPOSED (awaiting founder decisions on items in BUILD_024_DECISIONS_REQUIRED.md)*
*Last updated: 2026-09-23*