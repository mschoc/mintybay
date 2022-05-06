// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

//import './ERC721Connector.sol';

contract Token is ERC721Enumerable{
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;
    address private contractAddress;

    struct Item {
        uint256 id;
        address creator;
        string name;
        string symbol;
        string uri;
    }

    mapping(uint256 => Item) public Items;

    constructor() ERC721("mintybay Token", "MBT"){}

    function mint(string memory _tokenUri) public returns (uint256){

        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _safeMint(msg.sender, newItemId);
        approve(contractAddress, newItemId);
        
        Items[newItemId] = Item({
            id: newItemId,
            creator: msg.sender,
            name: name(),
            symbol: symbol(),
            uri: _tokenUri
        });

        return newItemId;
    }

    // TODO override tokenURI?

    function setMarketplaceAddress(address marketplaceAddress) public {
        contractAddress = marketplaceAddress;
    }

}