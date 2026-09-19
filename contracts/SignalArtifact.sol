// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SignalArtifact
 * @dev NFT contract for TapeBorn Signal Artifacts.
 * 
 * ADMIN MODEL (R5 - FROZEN):
 * - Ownable + Pausable: FROZEN - cannot be changed
 * - Immutable params (set in constructor): name, symbol
 * - Configurable params (owner-only setters): 
 *   - mintFee: fee to mint (in wei)
 *   - maxSupply: maximum total supply (0 = unlimited)
 *   - baseURI: base URI for token metadata
 * - Pausable minting: ENFORCED - mint reverts when paused even for owner
 * 
 * VERSION: 1.0.0 (R5)
 */
contract SignalArtifact is ERC721, Ownable, Pausable {
    uint256 public nextTokenId;
    mapping(uint256 => string) public tokenURIs;
    
    // Configurable parameters (R5)
    uint256 public mintFee;
    uint256 public maxSupply;
    string public baseURI;
    
    // Total supply tracking (since we don't use ERC721Enumerable)
    uint256 public totalSupply_;
    
    // Events for configurable parameter changes
    event MintFeeChanged(uint256 indexed oldFee, uint256 indexed newFee);
    event MaxSupplyChanged(uint256 indexed oldMax, uint256 indexed newMax);
    event BaseURIChanged(string oldURI, string newURI);
    event TokenMinted(uint256 indexed tokenId, address indexed to, string uri);

    /**
     * @dev Constructor - sets immutable parameters
     * @param _name Token name (IMMUTABLE)
     * @param _symbol Token symbol (IMMUTABLE)
     * @param _baseURI Base URI for token metadata (CONFIGURABLE via setBaseURI)
     * @param _mintFee Initial mint fee in wei (CONFIGURABLE via setMintFee)
     * @param _maxSupply Maximum supply, 0 = unlimited (CONFIGURABLE via setMaxSupply)
     */
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseURI,
        uint256 _mintFee,
        uint256 _maxSupply
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        baseURI = _baseURI;
        mintFee = _mintFee;
        maxSupply = _maxSupply;
        nextTokenId = 0;
    }

    /**
     * @dev Check if string starts with prefix
     */
    function _startsWith(string memory str, string memory prefix) internal pure returns (bool) {
        if (bytes(str).length < bytes(prefix).length) return false;
        for (uint256 i = 0; i < bytes(prefix).length; i++) {
            if (bytes(str)[i] != bytes(prefix)[i]) return false;
        }
        return true;
    }

    /**
     * @dev Mint a new token with URI
     * @param to Recipient address
     * @param uri Token URI (can be full URI or relative to baseURI)
     * @custom:requirement caller must be owner, contract not paused
     * @custom:requirement msg.value >= mintFee
     * @custom:requirement totalSupply() < maxSupply (if maxSupply > 0)
     */
    function mint(address to, string memory uri) external payable onlyOwner whenNotPaused {
        // Check mint fee
        require(msg.value >= mintFee, "Insufficient mint fee");
        
        // Check max supply
        if (maxSupply > 0) {
            require(totalSupply_ < maxSupply, "Max supply reached");
        }
        
        uint256 tokenId = nextTokenId++;
        _mint(to, tokenId);
        tokenURIs[tokenId] = uri;
        totalSupply_++;
        
        emit TokenMinted(tokenId, to, uri);
    }

    /**
     * @dev Override tokenURI to support baseURI pattern
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        string memory uri = tokenURIs[tokenId];
        // If URI is empty, return empty
        if (bytes(uri).length == 0) return "";
        // If URI already starts with http/https/data:, return as-is
        if (_startsWith(uri, "http://") || _startsWith(uri, "https://") || _startsWith(uri, "data:")) {
            return uri;
        }
        // Otherwise prepend baseURI
        if (bytes(baseURI).length > 0) {
            return string(abi.encodePacked(baseURI, uri));
        }
        return uri;
    }

    /**
     * @dev Pause minting (owner only)
     * FROZEN - admin function, cannot be changed
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause minting (owner only)
     * FROZEN - admin function, cannot be changed
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Set mint fee (owner only)
     * CONFIGURABLE parameter
     * @param _newFee New mint fee in wei
     */
    function setMintFee(uint256 _newFee) external onlyOwner {
        uint256 oldFee = mintFee;
        mintFee = _newFee;
        emit MintFeeChanged(oldFee, _newFee);
    }

    /**
     * @dev Get total supply
     */
    function totalSupply() external view returns (uint256) {
        return totalSupply_;
    }

    /**
     * @dev Set maximum supply (owner only)
     * CONFIGURABLE parameter
     * @param _newMax New max supply (0 = unlimited)
     * @custom:requirement _newMax >= totalSupply() (cannot reduce below current)
     */
    function setMaxSupply(uint256 _newMax) external onlyOwner {
        require(_newMax == 0 || _newMax >= totalSupply_, "Max supply below current supply");
        uint256 oldMax = maxSupply;
        maxSupply = _newMax;
        emit MaxSupplyChanged(oldMax, _newMax);
    }

    /**
     * @dev Set base URI (owner only)
     * CONFIGURABLE parameter
     * @param _newURI New base URI
     */
    function setBaseURI(string memory _newURI) external onlyOwner {
        string memory oldURI = baseURI;
        baseURI = _newURI;
        emit BaseURIChanged(oldURI, _newURI);
    }

    /**
     * @dev Withdraw collected mint fees (owner only)
     * @custom:requirement contract balance > 0
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Receive ETH for mint fee payments
     */
    receive() external payable {}
}