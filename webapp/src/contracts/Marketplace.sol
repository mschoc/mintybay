// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract Marketplace is ReentrancyGuard{
    uint256 public marketItemCount; 
    uint256 public marketItemsSoldCount;

    struct MarketItem{
        uint256 id;
        uint256 tokenId;
        IERC721 token;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
    }

    mapping(uint256 => MarketItem) public marketItems;

    event marketItemCreated(
        uint256 indexed id, 
        uint256 indexed tokenId,
        address indexed tokenAddress,
        address seller,
        address owner,
        uint256 price
    );

    event marketItemSold(
        uint256 indexed id, 
        uint256 indexed tokenId,
        address indexed tokenAddress,
        address seller,
        address buyer,
        uint256 price
    );
    
    function createMarketItem(IERC721 token, uint256 tokenId, uint256 price) external nonReentrant{
        require(price > 0, "Price must be greater than zero");
        marketItemCount++;
        uint256 marketItemId = marketItemCount;

        marketItems[marketItemId] = MarketItem(
            marketItemId,
            tokenId,
            token,
            payable(msg.sender),
            payable(msg.sender),
            price,
            false
        );

        token.transferFrom(msg.sender, address(this), tokenId);

        emit marketItemCreated(
            marketItemId,
            tokenId,
            address(token),
            msg.sender,
            msg.sender,
            price
        );
    }

    function buyMarketItem(uint256 id) payable external nonReentrant{

        require(id > 0 && id <= marketItemCount, "Item does not exist");
        require(!marketItems[id].sold, "Item is already sold");
        require(msg.value >= marketItems[id].price, "Insufficient funds");
        require(msg.sender != marketItems[id].seller, "Seller cannot be the same address as the buyer");

        marketItems[id].seller.transfer(marketItems[id].price);
        marketItems[id].token.transferFrom(address(this), msg.sender, marketItems[id].tokenId);
        marketItems[id].owner = payable(msg.sender);
        marketItems[id].sold = true;

       marketItemsSoldCount++;

        emit marketItemSold(
            id, 
            marketItems[id].tokenId, 
            address(marketItems[id].token),
            marketItems[id].seller,
            msg.sender,
            marketItems[id].price
        );
    }

    function getUnsoldMarketItems() public view returns (MarketItem[] memory){
        uint256 totalMarketItemCount = marketItemCount;
        uint256 unsoldMarketItemCount = marketItemCount - marketItemsSoldCount;
        uint256 currentIndex = 0;

        MarketItem[] memory unsoldMarketItems = new MarketItem[](unsoldMarketItemCount);
        for (uint256 i = 0; i < totalMarketItemCount; i++) {
            if (marketItems[i + 1].sold == false) {
                uint256 currentId =  i + 1;
                MarketItem storage currentItem = marketItems[currentId];
                unsoldMarketItems[currentIndex] = currentItem;
                currentIndex += 1;
            } 
        }
        return unsoldMarketItems;
    }

    function getMyOwnedNFTs() public view returns (MarketItem[] memory){
        uint256 totalMarketItemCount = marketItemCount;
        uint256 marketItemCountOwned = 0;
        uint256 currentIndex = 0;

        for (uint i = 0; i < totalMarketItemCount; i++) {
            if (marketItems[i + 1].owner == msg.sender) {
                marketItemCountOwned += 1;
            }
        }

        MarketItem[] memory myItems = new MarketItem[](marketItemCountOwned);
        for (uint256 i = 0; i < totalMarketItemCount; i++) {
            if (marketItems[i + 1].owner == msg.sender) {
                uint256 currentId =  i + 1;
                MarketItem storage currentItem = marketItems[currentId];
                myItems[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return myItems;
    }
}