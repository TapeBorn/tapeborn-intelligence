# TapeBorn NFT Holder Utility Roadmap

This document outlines planned utility features for holders of TapeBorn NFTs (Signal Artifacts). All features listed below are in the **PLANNED** stage and are not yet implemented. They are intended to increase holder engagement and provide ongoing value beyond the initial NFT mint.

---

## 1. Signal Points System

**Description:**  
A points-based reward system where holders earn "Signal Points" through on-chain and off-chain activities, such as:
- Regular dashboard visits or signal viewing
- Participation in community governance or signaling events
- Referral of new holders
- Holding duration or specific NFT traits

**Utility:**  
Accumulated Signal Points can be used to:
- Gain whitelist access to future TapeBorn drops or collaborating projects
- Unlock exclusive features (e.g., advanced signal filters, custom artifact minting)
- Redeem for limited-edition off-chain rewards (e.g., merch, event tickets)

**Status:** PLANNED  
**Notes:** Requires integration with the dashboard (BUILD_012/PUBLIC DASHBOARD) and backend tracking of holder interactions.

---

## 2. Trace-linked Mint Mechanic

**Description:**  
Each TapeBorn NFT’s visual and metadata traits are directly derived from verifiable on-chain data at the time of mint, including:
- The transaction hash that triggered the mint
- The specific on-chain signal (e.g., a large USDC transfer, a contract interaction) that the NFT represents
- Block-level data (timestamp, block number) used in generative layers

**Utility:**  
This ensures that every NFT is a **provable on-chain artifact**—not just a generative art piece. Holders can:
- Prove the exact on-chain event their NFT represents
- Trace the NFT’s utility back to real blockchain activity
- Use the NFT as a verifiable signal marker in other dApps or analytics tools

**Status:** PLANNED  
**Notes:** Requires technical research into deterministic on-chain metadata generation and verification. May involve upgrades to the metadata system (BUILD_011) and artifact pipeline (BUILD_010+).

---

## 3. Token-gated Agent API Access

**Description:**  
Holders of TapeBorn NFTs can verify wallet ownership to receive an upgraded API key for the BUILD_020 Agent Interface (read-only HTTP API for signal data), granting:
- Higher rate limits (e.g., 50 req/sec vs. 10 req/sec for public)
- Access to additional endpoints or data layers (e.g., raw signal feeds, beta features)
- Priority signal aggregation or custom webhook configurations

**Utility:**  
Empowers holders and developers to build on top of TapeBorn’s intelligence layer with fewer restrictions, encouraging ecosystem growth and active use of the NFT as a "key" to premium data access.

**Status:** PLANNED  
**Notes:** Can be built as an extension of BUILD_020 Agent Interface. Requires wallet-signature verification (e.g., via `eth_sign` or SIWE) and a simple holder-check against the NFT contract.

---

### Important Disclaimer

All features listed above are **PLANNED** and not yet implemented. They represent future intentions for the TapeBorn project and should not be interpreted as active utilities. Implementation will depend on community feedback, technical feasibility, and project roadmap priority.

Holders are encouraged to participate in governance discussions (once available) to help shape which utilities are developed first.

---
*UTILITY_ROADMAP.md — Created to document planned holder utility for TapeBorn NFTs.*