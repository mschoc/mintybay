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
        address payable creator;
        uint256 price;
        uint256 royaltyFeePermillage;
        bool sold;
    }

    mapping(uint256 => MarketItem) public marketItems;

    event marketItemCreated(
        uint256 indexed id, 
        uint256 indexed tokenId,
        address indexed tokenAddress,
        address seller,
        address owner,
        address creator,
        uint256 price,
        uint256 royaltyFeePermillage
    );

    event marketItemSold(
        uint256 indexed id, 
        uint256 indexed tokenId,
        address indexed tokenAddress,
        address seller,
        address buyer,
        address creator,
        uint256 price,
        uint256 royaltyFeePermillage
    );
    
    function createMarketItem(IERC721 token, uint256 tokenId, uint256 price, uint256 royaltyFeePermillage) external nonReentrant{
        require(price > 0, "Price must be greater than zero");
        marketItemCount++;
        uint256 marketItemId = marketItemCount;
        address payable creator = payable(msg.sender);

        for (uint256 i = 0; i < marketItemCount; i++) {
            if (marketItems[i + 1].tokenId == tokenId) {
                marketItems[i + 1].owner = payable(address(0));
                creator = marketItems[i + 1].creator;
            }
        }

        marketItems[marketItemId] = MarketItem(
            marketItemId,
            tokenId,
            token,
            payable(msg.sender),
            payable(address(0)),
            creator, 
            price,
            royaltyFeePermillage,
            false
        );

        token.transferFrom(msg.sender, address(this), tokenId);
        
        emit marketItemCreated(
            marketItemId,
            tokenId,
            address(token),
            msg.sender,
            address(0),
            creator,
            price,
            royaltyFeePermillage
        );
    }

    function buyMarketItem(uint256 id) payable external nonReentrant{  
        uint256 calculatedPrice = getCalculatedPrice(id);
        uint256 royaltyFee = calculatedPrice - marketItems[id].price;

        require(id > 0 && id <= marketItemCount, "Item does not exist");
        require(!marketItems[id].sold, "Item is already sold");
        require(msg.value >= calculatedPrice, "Insufficient funds to cover price + royalty fee");
        require(msg.sender != marketItems[id].seller, "Seller cannot be the same address as the buyer");

        if(marketItems[id].seller == marketItems[id].creator){
            // TODO: Differ primary and secondary market in terms of royalty fee? --> No royaltyFee if seller is creator?
            marketItems[id].seller.transfer(calculatedPrice);
        } else{
            marketItems[id].seller.transfer(marketItems[id].price);
            marketItems[id].creator.transfer(royaltyFee);
        }
        
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
            marketItems[id].creator,
            marketItems[id].price,
            marketItems[id].royaltyFeePermillage
        );

        marketItems[id].seller = payable(address(0));
    }

    function getCalculatedPrice(uint256 id) view public returns(uint256){
        uint256 calculatedPrice = (marketItems[id].price*(1000 + marketItems[id].royaltyFeePermillage))/1000;
        return calculatedPrice;
    }

    // for testing purposes
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

    // for testing purposes
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