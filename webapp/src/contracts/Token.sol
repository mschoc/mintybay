// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract Token is ERC721URIStorage {
    uint256 public tokenIdCount;
    address private _marketplaceAddress;

    constructor(address marketplaceAddress) ERC721("mintybay Token", "MBT"){
        _marketplaceAddress = marketplaceAddress;
    }

    function mint(string memory _tokenUri) public returns (uint256){
        tokenIdCount++;
        uint256 newItemId = tokenIdCount;
        _safeMint(msg.sender, newItemId);
        _setTokenURI(newItemId, _tokenUri);
        approve(_marketplaceAddress, newItemId);
        return newItemId;
    }
}