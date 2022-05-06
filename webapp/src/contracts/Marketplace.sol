// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Token.sol";

contract Marketplace{
    Token private token;

    struct MarketItem{
        uint256 id;
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
    }

    MarketItem[] public marketItems;

    event itemPlacedOnMarket(uint256 id, uint256 tokenId, address seller, uint256 price);
    event itemSold(uint256 id, uint256 tokenId, address buyer, uint256 price);

    constructor(Token _token){
        token = _token;
    }

    function placeItemOnMarket(uint256 tokenId, uint256 price) external returns (uint256){
        require(token.ownerOf(tokenId) == msg.sender, "Seller is not the owner of the Item");
        require(token.getApproved(tokenId) == address(this), "Market address is not approved");

        uint256 newMarketItemId = marketItems.length;
        marketItems.push(
            MarketItem({
                id: newMarketItemId,
                tokenId: tokenId,
                seller: payable(msg.sender),
                owner: payable(msg.sender),
                price: price,
                sold: false
            })
        );

        emit itemPlacedOnMarket(newMarketItemId, tokenId, msg.sender, price);

        return newMarketItemId;
    }

    function buyItem(uint256 id) payable external{
        require(marketItems[id].id == id, "No item found");
        require(token.getApproved(marketItems[id].tokenId) == address(this), "Market address is not approved");
        require(!marketItems[id].sold, "Item is already sold");
        require(msg.sender != marketItems[id].seller);
        // TODO Check whether buyer has enough funds
        // require(msg.value >= marketItems[id].price, "Insufficient funds");

        marketItems[id].sold = true;
        token.safeTransferFrom(marketItems[id].seller, msg.sender, marketItems[id].tokenId);
        marketItems[id].seller.transfer(msg.value);
        marketItems[id].owner = payable(msg.sender);

        emit itemSold(id, marketItems[id].tokenId, msg.sender, marketItems[id].price);
    }

    function getMsgSender() public returns (address){
        return msg.sender;
    }
}