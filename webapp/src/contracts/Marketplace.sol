// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

interface IERC721Receiver {

    function onERC721Received(address operator, address from, uint256 id, bytes calldata data) payable external returns (bytes4);
}

contract Marketplace is ReentrancyGuard{

    //--- Variables ---//

    address payable private immutable TRANSACTION_FEE_RECEIVER_ADDRESS;
    uint256 private immutable TRANSACTION_FEE_PERMILLAGE;
    uint256 public marketItemCount;
    uint256 public marketItemsSoldCount;
    
    //--- Scructs ---//

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

    struct Offer{
        address offerer;
        uint256 price;
    }

    struct Offerer{
        address offerer;
    }

    //--- Mappings ---//

    // marketId => marketItem
    mapping(uint256 => MarketItem) public marketItems;
    // marketId => offerer => price 
    mapping(uint256 => mapping(address => Offer)) private _offers;
    // marketId => Array of offerers
    mapping(uint256 => Offerer[]) private _offerers;
    // account address => account name
    mapping(address => string) private _accountNames;

    //--- Events ---//

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

    event OfferSubmitted(
        uint256 indexed id,
        uint256 indexed tokenId, 
        address indexed tokenAddress, 
        address offerer, 
        uint256 price
    );

    event OfferWithdrew(
        uint256 indexed id,
        uint256 indexed tokenId, 
        address indexed tokenAddress, 
        address offerer, 
        uint256 price
    );

    event OfferAccepted(
        uint256 indexed id,
        uint256 indexed tokenId,
        address indexed tokenAddress, 
        address from, 
        address to,
        uint256 price
    );

    //--- Constructor ---//

    constructor(uint256 transactionFeePermillage, address transactionFeeReceiverAddress) {
        TRANSACTION_FEE_RECEIVER_ADDRESS = payable(transactionFeeReceiverAddress);
        TRANSACTION_FEE_PERMILLAGE = transactionFeePermillage;
    }

    //--- Functions ---//

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
        uint256 calculatedTotalPrice = getCalculatedTotalPrice(id);
        uint256 royaltyFee = getCalculatedFeeOnFixedPrice(id, marketItems[id].royaltyFeePermillage);
        uint256 transactionFee = getCalculatedFeeOnFixedPrice(id, TRANSACTION_FEE_PERMILLAGE);

        require(id > 0 && id <= marketItemCount, "Item does not exist");
        require(!marketItems[id].sold, "Item is already sold");
        require(msg.value >= calculatedTotalPrice, "Insufficient funds to cover price + royalty fee");
        require(msg.sender != marketItems[id].seller, "Seller cannot be the same address as the buyer");

        if(marketItems[id].seller == marketItems[id].creator){
            marketItems[id].seller.transfer(calculatedTotalPrice - transactionFee);
        } else{
            marketItems[id].seller.transfer(marketItems[id].price);
            marketItems[id].creator.transfer(royaltyFee);
        }

        TRANSACTION_FEE_RECEIVER_ADDRESS.transfer(transactionFee);

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

    function makeOffer (uint256 id) payable external nonReentrant{
        require(id > 0 && id <= marketItemCount, "Item does not exist");
        require(!marketItems[id].sold, "Item is already sold");
        require(msg.sender != marketItems[id].seller, "Seller cannot be the same address as the offerer");

        _offers[id][msg.sender] = Offer(msg.sender, msg.value);
        addToOfferers(id, msg.sender);
        
        emit OfferSubmitted(
            id, 
            marketItems[id].tokenId,
            address(marketItems[id].token),
            msg.sender, 
            msg.value
        );
    }
    
    function withdrawOffer(uint256 id) payable external nonReentrant{
        uint256 offerPrice =  _offers[id][msg.sender].price; 
        delete(_offers[id][msg.sender]);

        for (uint256 i = 0; i < _offerers[id].length; i++) {
            if(_offerers[id][i].offerer == msg.sender){
                delete(_offerers[id][i]);
            }
        }

        payable(msg.sender).transfer(offerPrice);

        emit OfferWithdrew(
            id, 
            marketItems[id].tokenId, 
            address(marketItems[id].token),
            msg.sender, 
            offerPrice
        );
    }

    function acceptOffer(uint256 id, bytes memory offerer) payable external nonReentrant{
        uint256 tokenId = marketItems[id].tokenId;

        bytes4 retVal = IERC721Receiver(address(this)).onERC721Received(msg.sender, address(this), tokenId, offerer);
        require (retVal == IERC721Receiver.onERC721Received.selector, "ERC721: transfer to non ERC721Receiver implementer");
    }
    

    function onERC721Received(address, address from, uint256 id, bytes calldata data) payable external returns (bytes4) {
        address offerer = bytesToAddress(data);
        uint256 offerPrice = _offers[id][offerer].price;
        require(offerPrice > 0, "Offer invalid");
        uint256 royaltyFee = getCalculatedFeeOnOfferPrice(id, offerPrice, marketItems[id].royaltyFeePermillage);
        uint256 transactionFee = getCalculatedFeeOnOfferPrice(id, offerPrice, TRANSACTION_FEE_PERMILLAGE);
        uint256 netOfferPrice = offerPrice - royaltyFee - transactionFee;
        
        delete(_offers[id][offerer]);

        for (uint256 i = 0; i < _offerers[id].length; i++) {
            if(_offerers[id][i].offerer == offerer){
                delete(_offerers[id][i]);
            }
        }

        if(payable(marketItems[id].seller) == marketItems[id].creator){
            payable(marketItems[id].seller).transfer(offerPrice - transactionFee);
        } else{
            payable(marketItems[id].seller).transfer(netOfferPrice);
            payable(marketItems[id].creator).transfer(royaltyFee);
        }

        TRANSACTION_FEE_RECEIVER_ADDRESS.transfer(transactionFee);

        marketItems[id].owner = payable(offerer);
        marketItems[id].sold = true;

        marketItemsSoldCount++;

        IERC721(address(marketItems[id].token)).transferFrom(address(this), offerer, marketItems[id].tokenId);

        emit OfferAccepted(
            id, 
            marketItems[id].tokenId,
            address(marketItems[id].token),
            from, 
            offerer, 
            offerPrice
        );

        marketItems[id].seller = payable(address(0));

        return IERC721Receiver.onERC721Received.selector;
    }
    
    function bytesToAddress(bytes memory bs) private pure returns (address) {
        require(bs.length >= 20, "slicing out of range");
        address addr;
        assembly {
            addr := mload(add(bs,20))
            
        }
        return addr;
    }

    function getHighestOffer(uint256 id) public view returns (Offer memory){
        uint256 highestOfferPrice = 0;
        address highestOfferer = address(0);

        for(uint256 i = 0; i < _offerers[id].length; i++){
            uint256 offerPrice = (_offers[id][_offerers[id][i].offerer]).price;
            if(offerPrice > highestOfferPrice){
                highestOfferPrice = offerPrice;
                highestOfferer = _offers[id][_offerers[id][i].offerer].offerer;
            }
        }

        return _offers[id][highestOfferer];
    }

    function addToOfferers(uint256 id, address offerer) public {
        _offerers[id].push(Offerer(offerer));
    }

    function getOfferers(uint256 id, uint256 index) external view returns(Offerer memory){
        return _offerers[id][index];
    }

    function getOffers(uint256 id, address offerer) external view returns (Offer memory) {
        return _offers[id][offerer];
    }

    function getCalculatedTotalPrice(uint256 id) view public returns(uint256){
        uint256 calculatedPrice = (marketItems[id].price*(1000 + marketItems[id].royaltyFeePermillage + TRANSACTION_FEE_PERMILLAGE))/1000;
        return calculatedPrice;
    }

    function getCalculatedFeeOnFixedPrice(uint256 id, uint256 feePermillage) view public returns(uint256){
        uint256 calculatedFee = (marketItems[id].price/1000) * feePermillage;
        return calculatedFee;
    }

    function getCalculatedFeeOnOfferPrice(uint256 id, uint256 price, uint256 feePermillage) view public returns(uint256){
        uint256 calculatedFee = (price/(1000 + marketItems[id].royaltyFeePermillage + TRANSACTION_FEE_PERMILLAGE))*feePermillage;
        return calculatedFee; 
    }

    function setAccountName(string memory accountName) public {
        _accountNames[msg.sender] = accountName;
    }

    function getAccountName(address accountAddress) external view returns(string memory){
        return _accountNames[accountAddress];
    }

}