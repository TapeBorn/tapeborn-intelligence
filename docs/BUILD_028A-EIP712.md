TAPEBORN BUILD_028A-EIP712

PRIMARY CLAIM AUTHORIZATION & ALLOCATION ARCHITECTURE

Status: FOUNDER DECISION SPECIFICATION
Scope: Documentation / Architecture only
Code: NONE
Deployment: NONE
Primary Chain: Arc
Production Hard Cap: 2,222 Genesis NFTs

---

1. Purpose

Dokumen ini mendefinisikan arsitektur EIP-712 untuk primary community claim TapeBorn Genesis.

Tujuan utama:

1. Mendukung free community-gated claim.
2. Tidak menggunakan permanent whitelist/allowlist di NFT contract.
3. Memisahkan eligibility/community allocation dari NFT ownership.
4. Mencegah signature replay.
5. Mencegah signature lintas campaign.
6. Mencegah signature testnet digunakan di mainnet.
7. Mendukung perubahan allocation sebelum campaign dimulai.
8. Memastikan "MAX_SUPPLY = 2,222" tetap menjadi hard cap absolut.
9. Menjaga ERC-721 tetap transferable dan kompatibel dengan marketplace seperti OpenSea.
10. Tidak menyimpan X/social eligibility di blockchain.
11. Tidak menyimpan Intelligence data di NFT contract.

---

2. Core Architecture

Arsitektur:

Community / X / Partner
↓
Off-chain Eligibility
↓
Campaign Allocation
↓
EIP-712 Authorization
↓
TapeBorn ERC-721 Claim
↓
NFT Ownership
↓
OpenSea / Secondary Marketplace

NFT ownership dan Intelligence access merupakan layer terpisah.

---

3. Fundamental Invariants

3.1 NFT Supply

Absolute hard cap:

"MAX_SUPPLY = 2,222"

Angka berikut TIDAK merupakan NFT supply:

- Team allocation
- Early allocation
- Guaranteed allocation
- FCFS allocation
- campaign capacity
- reserve capacity
- administrative capacity

Jumlah administratif dapat mencapai 2,522 dalam distribution planning, tetapi kontrak tidak pernah boleh mint lebih dari 2,222 NFT.

---

4. Allocation vs Supply

Allocation merupakan distribution configuration.

Contoh:

Initial planning:

- Team = 22
- Early = 500
- Guaranteed = 1,000
- FCFS = 1,000

Final campaign configuration dapat berubah menjadi:

- Team = 22
- Early = 490
- Guaranteed = 1,010
- FCFS = remaining campaign capacity

Perubahan tersebut tidak mengubah:

"MAX_SUPPLY = 2,222"

Allocation tidak boleh dianggap sebagai token supply.

---

5. Campaign Model

Setiap campaign mempunyai identitas unik:

"campaignId"

Contoh konseptual:

"GENESIS-PRIMARY-01"

Campaign ID harus ikut menjadi bagian dari signed authorization.

Tujuannya agar signature yang dibuat untuk campaign tertentu tidak dapat digunakan sebagai authorization untuk campaign lain.

---

6. Phase Model

Phase merupakan distribution category.

Minimal phase:

- TEAM
- EARLY
- COLLAB_GUARANTEED
- COLLAB_FCFS

Phase bukan NFT rarity.

Phase juga bukan ownership class.

Semua Genesis NFT tetap memiliki utility dan ownership model yang sama.

---

7. Recommended Allocation State

Jika allocation enforcement dilakukan on-chain, setiap campaign/phase dapat mempunyai:

- allocation cap
- claimed count
- active/inactive state

Contoh:

EARLY:

"allocation = 490"

"claimed = 320"

"remaining = 170"

COLLAB_GUARANTEED:

"allocation = 1,010"

"claimed = 700"

"remaining = 310"

Allocation dapat ditentukan sebelum campaign dimulai.

---

8. Why Allocation State Is Useful

Allocation enforcement on-chain memberikan protection tambahan.

Contohnya jika signer mengalami compromise.

Tanpa phase allocation cap:

Compromised signer
→ dapat menghasilkan banyak valid signatures
→ berpotensi menghabiskan supply.

Dengan phase cap:

Compromised signer
→ hanya dapat mengotorisasi claim sampai allocation campaign/phase yang telah dikonfigurasi.

Global "MAX_SUPPLY = 2,222" tetap menjadi batas terakhir.

---

9. Allocation Flexibility

Allocation harus dapat ditentukan ulang sebelum campaign aktif.

Contoh:

Configuration A:

Early = 500
Guaranteed = 1,000

Kemudian founder melakukan final review:

Early = 490
Guaranteed = 1,010

Contract tidak perlu redeploy.

Yang berubah hanya campaign allocation configuration, sebelum campaign dikunci/diaktifkan.

Setelah campaign dimulai, allocation tidak boleh berubah secara sepihak tanpa administrative authorization sesuai Control Plane.

---

10. EIP-712 Role
EIP-712 digunakan sebagai structured authorization.

EIP-712 BUKAN:

- NFT standard
- marketplace standard
- ownership standard
- whitelist database
- rarity system
- Intelligence protocol

EIP-712 hanya membuktikan bahwa suatu claim telah di-authorize oleh authorized signer.

---

11. Recommended Claim Authorization Payload

Signed message secara konseptual harus mencakup:

- "campaignId"
- "phase"
- "claimant"
- "quantity"
- "nonce"
- "deadline"

Domain EIP-712 secara otomatis membatasi signature berdasarkan:

- protocol name
- protocol version
- chainId
- verifying contract

Dengan demikian signature terikat kepada contract dan network tertentu.

---

12. Conceptual Structure

EIP712Domain
├── name
├── version
├── chainId
└── verifyingContract

ClaimAuthorization
├── campaignId
├── phase
├── claimant
├── quantity
├── nonce
└── deadline

"quantity" untuk Genesis primary claim secara default adalah:

"1"

Tidak boleh digunakan untuk membuat multi-mint claim jika founder decision tetap:

"1 eligible wallet = 1 Genesis NFT"

---

13. Chain Separation

"chainId" harus menjadi bagian dari EIP-712 domain.

Arc Testnet:

"5042002"

Arc Mainnet:

"5042"

Signature yang dibuat untuk Arc Testnet tidak boleh valid untuk Arc Mainnet.

Signature yang dibuat untuk contract A tidak boleh valid untuk contract B.

Ini merupakan alasan "verifyingContract" harus digunakan dalam EIP-712 domain.

---

14. Claimant Binding

Signature harus terikat langsung kepada wallet claimant.

Contoh:

Signature dibuat untuk:

0xABC...

Maka wallet:

0xDEF...

tidak boleh dapat menggunakan signature tersebut.

Hal ini mencegah signature transfer/reuse antar wallet.

---

15. Nonce

Setiap authorization mempunyai nonce.

Nonce digunakan untuk mencegah replay.

Contoh:

campaignId = GENESIS-PRIMARY-01
phase = EARLY
claimant = 0xABC
nonce = 17

Setelah claim berhasil:

"nonce 17"

tidak boleh dapat digunakan kembali.

Implementasi harus memastikan nonce tidak dapat direplay bahkan apabila transaksi pertama berhasil dan signature kembali tersedia.

---

16. Deadline

Setiap signature harus mempunyai "deadline".

Contoh:

deadline = campaign expiration timestamp

Contract harus menolak authorization jika:

"block.timestamp > deadline"

Tujuannya:

- mengurangi risiko signature lama
- membatasi authorization window
- membantu campaign management
- mengurangi dampak leaked signature

---

17. One Wallet — One Genesis

Primary Genesis claim:

"1 eligible wallet = maximum 1 Genesis NFT"

Contract harus mempunyai persistent claim state.

Conceptually:

"hasClaimed[address]"

Setelah successful primary claim:

"hasClaimed[claimant] = true"

Future claim attempt dari wallet tersebut harus ditolak.

Secondary transfers tidak boleh mengubah historical primary claim state menjadi claimable kembali.

---

18. Important Distinction: hasClaimed vs Ownership

"hasClaimed[address]" bukan ownership.

Contoh:

Alice claim Genesis #1537.

Kemudian Alice menjual NFT kepada Bob.

State:

Alice:
hasClaimed = true
owns NFT = false

Bob:
hasClaimed = false
owns NFT = true

Bob tidak boleh melakukan primary Genesis claim hanya karena dia sekarang memiliki NFT.

Alice juga tidak boleh claim Genesis kedua hanya karena NFT pertamanya telah dijual.

---

19. OpenSea Compatibility

EIP-712 claim authorization berakhir setelah primary claim.

Setelah NFT minted:

ERC-721 ownership
        ↓
wallet
        ↓
OpenSea
        ↓
secondary trading

OpenSea tidak perlu memproses atau memahami EIP-712 primary claim.

OpenSea juga tidak menjadi dependency untuk claim verification.

---

20. Transferability

EIP-712 authorization hanya membatasi primary claim.

Tidak boleh membatasi:

- ERC-721 transfer
- OpenSea listing
- OpenSea purchase
- secondary marketplace transfer
- wallet-to-wallet transfer

Dengan demikian:

"claim restriction ≠ transfer restriction"

---

21. Team Allocation

Team memiliki allocation:

"22"

Team distribution dapat menggunakan authorization mechanism yang sama atau administrative mint mechanism yang telah disetujui dalam final contract architecture.
Tidak boleh ada special NFT utility.

Team NFT tetap:

- ERC-721
- transferable
- same metadata model
- same Intelligence access model
- same collection

---

22. Early Community

Early merupakan manually selected / campaign-qualified community group.

Contoh final allocation:

"490"

Eligibility dapat ditentukan off-chain.

Contract hanya menerima valid authorization.

Contract tidak perlu mengetahui:

- apakah wallet follow X
- apakah wallet like post
- apakah wallet retweet
- bagaimana wallet dipilih

Semua tersebut merupakan eligibility layer.

---

23. Collab Guaranteed

Guaranteed merupakan partner allocation dengan guaranteed claim rights selama allocation masih tersedia.

Contoh:

"1,010"

Contract-level allocation tracking dapat memastikan jumlah successful claim tidak melewati allocation phase.

Partner identity dan social verification tetap berada di off-chain distribution layer.

---

24. Collab FCFS

FCFS merupakan first-come-first-served claim dalam partner allocation.

Eligibility tetap off-chain.

Signature issuance harus berhenti ketika allocation FCFS telah habis.

Jika contract-level allocation cap digunakan, contract juga menolak claim setelah phase allocation habis.

---

25. Allocation Exhaustion

Contoh:

EARLY
Allocation = 490
Claimed = 490
Remaining = 0

Authorization Early berikutnya harus ditolak.

Hal ini berlaku walaupun signature masih mempunyai deadline yang belum expired.

---

26. Unused Allocation

Unused allocation tidak membuat supply tambahan.

Contoh:

Early allocation = 490
Claimed = 450
Unused = 40

40 tersebut dapat dipindahkan ke campaign/distribution reserve berdasarkan governance/admin policy.

Tetap:

"MAX_SUPPLY = 2,222"

Tidak ada allocation yang dapat menciptakan supply di atas 2,222.

---

27. Reserve

Unclaimed supply dapat menjadi Project/Reward Reserve.

Reserve:

- tetap berada di dalam 2,222 hard cap
- bukan additional supply
- bukan unlimited founder mint
- harus menggunakan administrative authorization yang sesuai
- tidak boleh mengubah MAX_SUPPLY

---

28. Authorized Signer

Primary claim memerlukan authorized signer.

Signer merupakan authorization layer, bukan owner NFT.

Signer tidak boleh memiliki kemampuan:

- withdraw treasury
- change metadata
- pause
- unpause
- transfer ownership
- arbitrarily mint outside contract rules

Signer hanya memberikan claim authorization.

---

29. Signer Security

Signer key merupakan security-sensitive component.

Jika signer merupakan EOA:

- private key harus dipisahkan dari deployment wallet
- private key tidak boleh berada di source code
- private key tidak boleh berada di frontend
- key rotation harus tersedia
- signer authorization harus dapat dicabut melalui administrative control plane

Founder belum mengunci apakah signer akan berupa EOA atau smart-contract wallet/ERC-1271 architecture.

Keputusan tersebut tetap menjadi implementation decision sebelum BUILD_028B final.

---

30. Control Plane Relationship

Recommended relationship:

Admin Multisig
      ↓
24h Timelock
      ↓
Production NFT Contract

Administrative control dapat mencakup:

- configure campaign
- configure phase allocation
- activate/deactivate campaign
- set authorized signer
- rotate signer
- finalize metadata
- pause claim
- other explicitly approved configuration


Guardian tetap hanya pause authority sesuai BUILD_028A-R.

---

# 31. Campaign Activation

Recommended lifecycle:

`text
DRAFT
  ↓
CONFIGURED
  ↓
REVIEWED
  ↓
ACTIVE
  ↓
EXHAUSTED / CLOSED

Allocation harus dapat direvisi pada tahap sebelum ACTIVE.

Setelah ACTIVE, perubahan allocation harus mengikuti explicit administrative policy.

---

32. Recommended Claim Flow

1. TapeBorn selects eligible wallet
        ↓
2. Distribution system identifies:
   campaignId
   phase
   wallet
   nonce
   deadline
↓
3. Authorized signer signs EIP-712 message
        ↓
4. User receives authorization
        ↓
5. User calls claim()
        ↓
6. Contract verifies EIP-712 signature
        ↓
7. Contract verifies campaign/phase
        ↓
8. Contract verifies deadline
        ↓
9. Contract verifies nonce
        ↓
10. Contract verifies hasClaimed
        ↓
11. Contract verifies allocation remaining
        ↓
12. Contract verifies MAX_SUPPLY
        ↓
13. Contract marks claim state
        ↓
14. Contract mints ERC-721

---

33. Failure Conditions

Claim harus revert jika salah satu kondisi berikut terjadi:

- invalid signature
- unauthorized signer
- wrong claimant
- wrong campaign
- wrong phase
- expired deadline
- reused nonce
- wallet already claimed
- phase allocation exhausted
- campaign inactive
- contract paused for claims
- global supply exhausted
- invalid quantity

---

34. Replay Threat Matrix

Threat| Protection
Same signature reused| nonce
Signature used by another wallet| claimant binding
Testnet signature used on mainnet| chainId
Signature used on another contract| verifyingContract
Old authorization reused| deadline
Same wallet claims twice| hasClaimed
Phase exceeded| allocation cap
Global supply exceeded| MAX_SUPPLY
Paused campaign claim| pause state

---

35. OpenSea Threat Separation

OpenSea secondary trading does not use the primary claim authorization.

Therefore:

EIP-712 failure

must not cause:

ERC-721 transfer failure

and:

OpenSea trading

must not require:

TapeBorn claim signature

---

36. Intelligence Relationship

NFT contract does not store:

- signalId
- signal data
- evidence
- interpretation
- Intelligence history

Holder utility is determined by current on-chain ownership.

Conceptually:

Wallet
   ↓
Blockchain ownership check
   ↓
TapeBorn NFT ownership
   ↓
Holder access
   ↓
TapeBorn Intelligence

---

37. Final Architecture

                   COMMUNITY
                      │
          X / Partners / Campaigns
                      │
                      ▼
             OFF-CHAIN ELIGIBILITY
                      │
                      ▼
              CAMPAIGN ALLOCATION
                      │
                      ▼
                EIP-712 SIGNER
                      │
                      ▼
               PRIMARY CLAIM
                      │
                      ▼
               TAPE BORN ERC-721
                      │
             ┌────────┼────────┐
             │        │        │
             ▼        ▼        ▼
         Metadata  Ownership  Utility
             │        │        │
             │        │        ▼
             │        │   Intelligence
             │        │
             │        ▼
             │      OpenSea
             │        │
             │        ▼
             │     Seaport
             │        │
             │        ▼
             │ Secondary Market
             │
             ▼
       Finalized Collection

---

38. Founder Decisions

LOCKED

- ERC-721
- MAX_SUPPLY = 2,222
- free primary claim
- community-gated
- no public unrestricted mint
- no permanent whitelist/allowlist
- 1 primary Genesis per eligible wallet
- transferable
- no Genesis burn
- 0% creator earnings
- no NFT Intelligence data
- Intelligence off-chain
- Arc-first
- EIP-712 authorization
- claim authorization separate from secondary transfer
- chain-bound authorization
- contract-bound authorization
- deadline-bound authorization
- nonce/replay protection
- metadata immutable after finalization
- OpenSea as marketplace/distribution layer, not core protocol dependency

RECOMMENDED

- campaignId included in signed claim
- phase included in signed claim
- allocation cap tracked per campaign/phase
- signer rotation capability
- allocation configuration before campaign activation
- claim signer isolated from deployment wallet
- on-chain phase cap as additional protection against signer compromise

UNRESOLVED BEFORE BUILD_028B
1. EOA signer vs ERC-1271 smart-contract signer.
2. Exact signer rotation mechanism.
3. Whether allocation caps are stored directly in NFT contract or external claim/distribution contract.
4. Exact campaign state machine.
5. Exact nonce storage model.
6. Exact Team authorization path.
7. Whether Team uses same claim mechanism or separate authorized mint path.
8. Exact phase identifiers.
9. Exact administrative functions exposed to Timelock.
10. Exact pause scope implementation.
11. Final metadata URI architecture.
12. Final storage provider.
13. Finalization mechanism.
14. Final production deployment parameters.

---

39. Critical Security Invariant

No EIP-712 authorization, regardless of signer validity, may cause:

"totalSupply > 2,222"

This is the final supply boundary.

---

40. Implementation Boundary

This document does not authorize Solidity implementation.

BUILD_028B may begin only after the remaining contract-critical decisions are explicitly resolved.

No OpenSea-specific dependency should be added merely to support primary claim.

No permanent social/whitelist database should be embedded in the NFT contract.

No Intelligence data should be embedded in the NFT contract.