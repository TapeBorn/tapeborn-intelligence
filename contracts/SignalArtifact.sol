// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract SignalArtifact is ERC721, Ownable, Pausable {
    uint256 public nextTokenId;
    mapping(uint256 => string) public tokenURIs;

    constructor() ERC721("SignalArtifact", "SIG") Ownable(msg.sender) {}

    function mint(address to, string memory uri) external onlyOwner whenNotPaused {
        uint256 tokenId = nextTokenId++;
        _mint(to, tokenId);
        tokenURIs[tokenId] = uri;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return tokenURIs[tokenId];
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}