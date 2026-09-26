# BUILD_024 Founder Decisions Required

The following decisions must be resolved (APPROVED) before implementation work can begin on the items in NFT_IMPLEMENTATION_BACKLOG.md. Each decision is categorized as:

- **APPROVED** – Founder has decided; implementation may proceed.
- **PROPOSED** – A recommendation is on the table; founder feedback needed.
- **UNRESOLVED** – No proposal yet; requires founder input.
- **VERIFIED** – Decision already implemented and tested (not applicable here as BUILD_024 is decision‑gate).

All decisions are **UNRESOLVED** or **PROPOSED** at the start of BUILD_024. No decision should be marked APPROVED until explicit founder sign‑off is recorded.

---


## 1. Trait Inventory & Rarity
| Decision | Description | Status |
|----------|-------------|--------|
| Trait Inventory | Final list of visual/trait categories derived from signal types (e.g., signal type → shape, confidence → color, block number → position, tx value → size). | PROPOSED: Use the seven signal detectors as base traits, with sub‑traits from evidence fields. |
| Rarity Weights | Numerical weights that determine rarity of each trait value (to be used in generative art ranking). | UNRESOLVED: Founder to provide weighting scheme or approve a data‑driven approach (e.g., inverse frequency on testnet). |

## 2. Coordinate System & Collision Rules
| Decision | Description | Status |
|----------|-------------|--------|
| Coordinate System | If the art‑production system uses a 2D/3D canvas, define the axes, bounds, and mapping from signal fields (e.g., block number → X, tx index → Y). | PROPOSED: Normalize block number to [0,1] range of recent epoch, tx index to [0,1] within block; canvas 1000×1000. |
| Collision Rules | How to handle two signals that produce identical trait combinations (same signal ID or same derived traits). Options: append a counter, use a random seed, or allow duplicate NFTs (not recommended). | UNRESOLVED: Founder to choose deterministic disambiguation (e.g., least‑significant block timestamp) or approve probabilistic method. |

## 3. Token Standard
| Decision | Description | Status |
|----------|-------------|--------|
| Token Standard | Choose between ERC‑721 (unique) and ERC‑1155 (semi‑fungible/batch) for the production Signal Artifact collection. | PROPOSED: ERC‑721 for 1:1 signal‑to‑artifact mapping; ERC‑1155 considered only if future editions or fractional ownership are desired. |

## 4. Metadata Storage & Immutability
| Decision | Description | Status |
|----------|-------------|--------|
| Storage Layer | Where metadata and artifact files will be stored long‑term: IPFS, Filecoin, Arweave, or on‑chain (calldata). | UNRESOLVED: Founder to weigh cost, permanence, and decentralization guarantees. |
| Immutability Guarantee | Required level of immutability (e.g., content‑addressed CID with pinning guarantee, or on‑chain storage). | PROPOSED: IPFS with pinning service + Filecoin backup; to be verified before mainnet. |
| Metadata Schema Versioning | How to handle future changes to metadata schema (backward compatibility, migration). | UNRESOLVED: Founder to decide on semver‑style schema version field in metadata. |

## 5. Mint Authority & Price
| Decision | Description | Status |
|----------|-------------|--------|
| Mint Authority | Which entity(ies) can call the mint function after considering CP‑01 through CP‑12 (Timelock + Multisig + Guardian). Options: Timelock proposer only, Multisig directly, or a combination. | UNRESOLVED: Founder to decide based on production admin model (CP‑01). |
| Mint Price | Whether minting is free, has a fixed price (in USDC or native token), or uses a bonding curve. | UNRESOLVED: Founder to decide on economic model (free for provenance, or price to fund treasury). |
| Royalties | Whether to implement ERC‑2981 royalties and, if so, the percentage and recipient (e.g., treasury, developer fund). | UNRESOLVED: Founder to decide on royalty model. |

## 6. Utility MVP
| Decision | Description | Status |
|----------|-------------|--------|
| Utility Minimum Viable Product | Which holder utilities (if any) will be shipped at launch: Signal Points, Trace‑linked Mint, Token‑gated API, Credibility API, etc. | UNRESOLVED: Founder to prioritize based on roadmap and dependencies (e.g., audit, metadata finalization). |

## 7. Four Mythic Traits
| Decision | Description | Status |
|----------|-------------|--------|
| Mythic Traits | Define four special, ultra‑rare traits (e.g., “Genesis”, “Oracle”, “Whale”, “Archivist”) and their acquisition rules (e.g., based on specific signal types, provenance from genesis block, or community votes). | UNRESOLVED: Founder to propose names, rarity, and acquisition logic. |

## 8. Provenance Model in Metadata
| Decision | Description | Status |
|----------|-------------|--------|
| Provenance Embedding | How much of the raw provenance (transaction hash, block, logs) should be embedded directly in metadata vs. referenced via an immutable identifier (e.g., IPFS CID of provenance file). | PROPOSED: Store a content‑addressed provenance reference (CID) in metadata; keep raw logs off‑chain to avoid metadata bloat. |
| Confidentiality | Whether any provenance data (e.g., interacting addresses) must be redacted for privacy reasons. | UNRESOLVED: Founder to decide on privacy thresholds (e.g., hash addresses, show only first/last 4 chars). |

## 9. Supply Cap
| Decision | Description | Status |
|----------|-------------|--------|
| MAX_SUPPLY | Whether the production collection should have a hard cap (e.g., 10,000) or remain unlimited (admin‑only mint). | UNRESOLVED: Founder to decide based on economic model and trait rarity goals. |

## 10. Upgradeability
| Decision | Description | Status |
|----------|-------------|--------|
| Contract Upgradeability | Whether the production NFT contract should be upgradeable (via proxy) or immutable after deployment. | PROPOSED: Immutable contract for simplicity and trust; upgradeability only if a critical bug is found post‑audit (requires multisig timelock). |

---
*All decisions above are **UNRESOLVED** or **PROPOSED** until explicit founder approval is recorded in this file (changing status to APPROVED) or via a signed off‑channel acknowledgment that is then reflected here.*

*Last updated: 2026-09-23*