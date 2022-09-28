// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
@title Token
@author Marc Schoch
@notice Provides functionality of an NFT object
@dev Stores NFT information, provides functionality to mint a new NFT, handles NFT functions within the the ERC721 protocol
*/
contract Token is ERC721URIStorage {
    uint256 public tokenIdCount;
    address private _marketplaceAddress;

    /**
    @dev Sets the marketplace address when a token contract is instantiated
    @param marketplaceAddress (address of the marketplace when deployed)
    */
    constructor(address marketplaceAddress) ERC721("mintybay Token", "MBT"){
        _marketplaceAddress = marketplaceAddress;
    }

    /**
    @dev mints (creates) a new NFT, sets the uniform resource identifier of the NFT metadata 
    and approves the marketplace for the NFT 
    @param _tokenUri (uniform resource identifier of the token metadata)
    @return uint256 (token id)
    */  
    function mint(string memory _tokenUri) public returns (uint256){
        tokenIdCount++;
        uint256 newItemId = tokenIdCount;
        _safeMint(msg.sender, newItemId);
        _setTokenURI(newItemId, _tokenUri);
        approve(_marketplaceAddress, newItemId);
        return newItemId;
    }
}