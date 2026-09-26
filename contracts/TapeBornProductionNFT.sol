// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title TapeBornProductionNFT
 * @dev Production NFT contract for TapeBorn Genesis on Arc.
 *      Free claim gated by EIP-712 ClaimAuthorization signatures, per-phase
 *      allocation caps, a strict campaign state machine, Guardian pause
 *      (claim-only), Ownable2Step ownership with renounce disabled, and
 *      immutable metadata after finalization.
 */
contract TapeBornProductionNFT is ERC721, Ownable2Step, Pausable, EIP712, AccessControl {
    // ========== Constants ==========
    uint256 public constant MAX_SUPPLY = 2_222;
    string private constant _name = "TapeBorn Genesis";
    string private constant _symbol = "TBART";
    string private constant _version = "1";
    bytes32 private constant CLAIM_AUTHORIZATION_TYPEHASH = keccak256(
        "ClaimAuthorization(bytes32 campaignId,bytes32 phaseId,address claimant,uint256 quantity,uint256 nonce,uint256 deadline)"
    );

    // ========== State Variables ==========
    // Supply accounting
    uint256 private _totalSupply;

    // Token ID counter (sequential, starts at 1 on first mint)
    uint256 private _tokenIdCounter;

    // Nonce mapping (address => uint256)
    mapping(address => uint256) public nonces;

    // Has claimed mapping (address => bool)
    mapping(address => bool) public hasClaimed;

    // Allocation and claim mappings (campaignId => phaseId => uint256)
    mapping(bytes32 => mapping(bytes32 => uint256)) public allocationCap;
    mapping(bytes32 => mapping(bytes32 => uint256)) public claimed;

    // State mapping (campaignId => phaseId => State)
    enum State { DRAFT, CONFIGURED, REVIEWED, ACTIVE, EXHAUSTED, CLOSED }
    mapping(bytes32 => mapping(bytes32 => State)) public state;

    // EIP-712 signer (dedicated EOA, separate from owner/Timelock/Guardian/deployer)
    address public eip712Signer;

    // Roles
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Metadata
    string public baseURI;
    bool public metadataFinalized;
    string private contractURI_; // for marketplace integration

    // ========== Events ==========
    event ClaimCampaignPhase(bytes32 indexed campaignId, bytes32 indexed phaseId, address indexed claimant, uint256 tokenId);
    event AllocationCapChanged(bytes32 indexed campaignId, bytes32 indexed phaseId, uint256 newCap);
    event PhaseStateChanged(bytes32 indexed campaignId, bytes32 indexed phaseId, uint8 oldState, uint8 newState);
    event SignerRotated(address indexed previousSigner, address indexed newSigner);
    event MetadataFinalized(string baseURI, address calledBy);

    // ========== Constructor ==========
    constructor() ERC721(_name, _symbol) Ownable(msg.sender) EIP712(_name, _version) {
        // Give the deployer (msg.sender) the DEFAULT_ADMIN_ROLE so they can grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // Note: In practice, campaigns are set via setAllocationCap and setCampaignState by owner/Timelock
    }

    // ========== Receive/Fallback (Block accidental ETH/USDC) ==========
    receive() external payable {
        revert("Cannot send native value to this contract");
    }

    fallback() external payable {
        revert("Cannot send native value to this contract");
    }

    // ========== Supply ==========
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    // ========== Allocation ==========
    function setAllocationCap(bytes32 campaignId, bytes32 phaseId, uint256 cap) public onlyOwner {
        require(cap >= claimed[campaignId][phaseId], "Allocation below claimed");
        require(
            state[campaignId][phaseId] == State.DRAFT ||
            state[campaignId][phaseId] == State.CONFIGURED ||
            state[campaignId][phaseId] == State.REVIEWED,
            "Allocation locked"
        );
        allocationCap[campaignId][phaseId] = cap;
        emit AllocationCapChanged(campaignId, phaseId, cap);
    }

    function setCampaignState(bytes32 campaignId, bytes32 phaseId, uint8 newState) public onlyOwner {
        State oldState = state[campaignId][phaseId];
        State newStateEnum = State(newState);
        require(_isValidTransition(oldState, newStateEnum), "Invalid state transition");
        state[campaignId][phaseId] = newStateEnum;
        emit PhaseStateChanged(campaignId, phaseId, uint8(oldState), uint8(newStateEnum));
    }

    // ========== EIP-712 Signer ==========
    function setSigner(address newSigner) public onlyOwner {
        require(newSigner != address(0), "Signer cannot be zero");
        address oldSigner = eip712Signer;
        eip712Signer = newSigner;
        emit SignerRotated(oldSigner, newSigner);
    }

    // ========== Pause ==========
    // Guardian: PAUSER_ROLE only. Cannot unpause, mint, claim, or administer.
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    // Owner (production: Timelock) unpause.
    function unpause() external onlyOwner {
        _unpause();
    }

    function _pause() internal virtual override {
        super._pause();
    }

    function _unpause() internal virtual override {
        super._unpause();
    }

    // ========== Metadata ==========
    function setBaseURI(string memory _uri) public onlyOwner {
        require(!metadataFinalized, "BaseURI frozen after finalization");
        baseURI = _uri;
    }

    function finalizeMetadata(string calldata _uri) public onlyOwner {
        require(!metadataFinalized, "Already finalized");
        baseURI = string(_uri);
        metadataFinalized = true;
        emit MetadataFinalized(baseURI, msg.sender);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ERC721Metadata: URI query for nonexistent token");
        string memory tokenIdStr = Strings.toString(tokenId);
        if (bytes(baseURI).length == 0) {
            return tokenIdStr;
        }
        return string(abi.encodePacked(baseURI, tokenIdStr));
    }

    function contractURI() public view returns (string memory) {
        return contractURI_;
    }

    function setContractURI(string memory _uri) public onlyOwner {
        require(!metadataFinalized, "Contract URI frozen after finalization");
        contractURI_ = _uri;
    }

    // ========== Claim ==========
    /**
     * @dev Free (non-payable) EIP-712 signature-gated claim.
     *      Exactly one NFT per wallet, one NFT per successful claim.
     *      All validation happens before any state mutation.
     */
    function claim(
        bytes32 campaignId,
        bytes32 phaseId,
        address claimant,
        uint256 quantity,
        uint256 nonce,
        uint256 deadline,
        bytes memory signature
    ) external {
        // Pause affects claim only
        require(!paused(), "Pausable: paused");

        // Validate claimant == msg.sender
        require(claimant == msg.sender, "Claimant mismatch");

        // Validate quantity == 1
        require(quantity == 1, "Quantity must be 1");

        // Validate nonce (replay protection: exact current nonce required)
        require(nonce == nonces[claimant], "Invalid nonce");

        // Validate deadline
        require(deadline >= block.timestamp, "Expired deadline");

        // One claim per wallet, never reset by transfer
        require(!hasClaimed[claimant], "Already claimed");

        // Supply can never exceed MAX_SUPPLY
        require(_totalSupply < MAX_SUPPLY, "Supply exhausted");

        // Phase allocation boundary
        require(claimed[campaignId][phaseId] < allocationCap[campaignId][phaseId], "Allocation exhausted");

        // Phase must be ACTIVE
        require(state[campaignId][phaseId] == State.ACTIVE, "Phase not active");

        // Validate EIP-712 signature from dedicated eip712Signer.
        // Domain: name "TapeBorn Genesis", version "1", chainId, address(this).
        bytes32 structHash = keccak256(
            abi.encode(CLAIM_AUTHORIZATION_TYPEHASH, campaignId, phaseId, claimant, quantity, nonce, deadline)
        );
        address recovered = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        require(recovered == eip712Signer, "Invalid signer");

        // ===== State mutations (each exactly once) =====

        // 1. Increment nonce exactly once
        nonces[claimant] = nonce + 1;

        // 2. Mark claimed
        hasClaimed[claimant] = true;

        // 3. Increment supply exactly once
        _totalSupply++;

        // 4. Increment campaign/phase claimed count exactly once
        claimed[campaignId][phaseId]++;

        // 5. Auto-transition ACTIVE -> EXHAUSTED when allocation becomes full
        if (claimed[campaignId][phaseId] >= allocationCap[campaignId][phaseId]) {
            state[campaignId][phaseId] = State.EXHAUSTED;
            emit PhaseStateChanged(campaignId, phaseId, uint8(State.ACTIVE), uint8(State.EXHAUSTED));
        }

        // 6. Mint exactly one NFT (deterministic sequential token ID)
        _safeMint(claimant, ++_tokenIdCounter);

        // 7. Emit Claim
        emit ClaimCampaignPhase(campaignId, phaseId, claimant, _tokenIdCounter);
    }

    // ========== Helper: EIP-712 Domain Separator ==========
    function domainSeparatorV4() public view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // ========== ClaimAuthorization TypeHash ==========
    function typeHash() public pure returns (bytes32) {
        return CLAIM_AUTHORIZATION_TYPEHASH;
    }

    // ========== Recover Signer from EIP-712 digest ==========
    function _recoverSigner(bytes memory signedData, bytes memory signature) internal view returns (address) {
        bytes32 digest = _hashTypedDataV4(keccak256(signedData));
        return ECDSA.recover(digest, signature);
    }

    // ========== State Transition Validation ==========
    function _isValidTransition(State oldState, State newState) private pure returns (bool) {
        // Allowed transitions:
        // DRAFT -> CONFIGURED
        // CONFIGURED -> REVIEWED
        // REVIEWED -> ACTIVE
        // ACTIVE -> EXHAUSTED
        // ACTIVE -> CLOSED
        // EXHAUSTED -> CLOSED
        if (oldState == State.DRAFT && newState == State.CONFIGURED) return true;
        if (oldState == State.CONFIGURED && newState == State.REVIEWED) return true;
        if (oldState == State.REVIEWED && newState == State.ACTIVE) return true;
        if (oldState == State.ACTIVE && newState == State.EXHAUSTED) return true;
        if (oldState == State.ACTIVE && newState == State.CLOSED) return true;
        if (oldState == State.EXHAUSTED && newState == State.CLOSED) return true;
        return false;
    }

    // ========== Ownership (renounce permanently disabled) ==========
    function renounceOwnership() public virtual override onlyOwner {
        revert("Ownership renunciation disabled");
    }

    // ========== supportsInterface ==========
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
