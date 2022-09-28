// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

/**
@title IERC721Receiver
@author Marc Schoch
@dev Defines NFT receiver functions within the ERC721 protocol
*/
interface IERC721Receiver {
    /**
    @dev Defines the structure of the onERC721Received function - we can not simply use the onERC721Received function of OpenZeppelin as
    we need the function to be payable in order to transfer funds.
    @param operator (seller address of the nft)
    @param from (marketplace address)
    @param id (market item id which every market item gets assigned when created)
    @param data (offerer address)
    @return bytes4 (selector of the function)
    */
    function onERC721Received(address operator, address from, uint256 id, bytes calldata data) payable external returns (bytes4);
}

/**
@title Marketplace
@author Marc Schoch
@notice Provides functionality of all operations in the marketplace application
@dev Handles market items, stores market information and provides functions to interact within the ERC721 protocol
*/
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

    // attributes in struct Offer are needed to map back from price to offerer
    struct Offer{
        address offerer;
        uint256 price;
    }

    // // struct Offerer with one attribute is designed this way in order to be expandable for further attributes
    // struct Offerer{
    //     address offerer;
    // }

    //--- Mappings ---//

    // marketId => marketItem
    mapping(uint256 => MarketItem) public marketItems;
    // marketId => offerer => price 
    mapping(uint256 => mapping(address => Offer)) private _offers;
    // marketId => Array of offerers
    mapping(uint256 => address[]) private _offerers;
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

    event OfferWithdrawn(
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

    /**
    @dev Sets the transactionFeePermillage and the transactionFeeReceiverAddress when instantiating a marketplace contract 
    @param transactionFeePermillage (fee in permillage that users have to pay for each transaction)
    @param transactionFeeReceiverAddress (address which receives all earned transaction fees from the marketplace)
    */
    constructor(uint256 transactionFeePermillage, address transactionFeeReceiverAddress) {
        TRANSACTION_FEE_RECEIVER_ADDRESS = payable(transactionFeeReceiverAddress);
        TRANSACTION_FEE_PERMILLAGE = transactionFeePermillage;
    }

    //--- Functions ---//

    /**
    @dev Creates a new market item, maps it to the market id and transfers the NFT to the marketplace address
    @param token (address of the NFT)
    @param tokenId (id of the NFT)
    @param price (selling price)
    @param royaltyFeePermillage (Fee in permillage which future buyers have to pay to the creator for each transaction)
    */
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

    /**
    @dev Transfers price to the seller, transfers royalty fee to the creator, transfers transaction fee to the transaction fee receiver, 
    transfers NFT to the buyer, updates the market item attributes
    @param id (market item id which every market item gets assigned when created)
    */
    function buyMarketItem(uint256 id) payable external nonReentrant{  
        uint256 calculatedTotalPrice = getCalculatedTotalPrice(id);
        uint256 royaltyFee = getCalculatedFeeOnFixedPrice(id, marketItems[id].royaltyFeePermillage);
        uint256 transactionFee = getCalculatedFeeOnFixedPrice(id, TRANSACTION_FEE_PERMILLAGE);

        require(id > 0 && id <= marketItemCount, "Item does not exist");
        require(!marketItems[id].sold, "Item is already sold");
        require(msg.value >= calculatedTotalPrice, "Insufficient funds to cover price, royalty fee + transaction fee");
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

    /**
    @dev Creates an offer item and maps it to the market id and the offerer, 
    creates an offerer item and maps it to the market item id
    @param id (market item id which every market item gets assigned when created)
    */
    function makeOffer (uint256 id) payable external nonReentrant{
        require(id > 0 && id <= marketItemCount, "Item does not exist");
        require(!marketItems[id].sold, "Item is already sold");
        require(msg.sender != marketItems[id].seller, "Seller cannot be the same address as the offerer");
        require(msg.value > 0, "Offer invalid, must be above zero");

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
    
    /**
    @dev Deletes the offer item mapped to the market item id, deletes the offerer item mapped to the market item id, 
    transfers value back to offerer/withdrawer
    @param id (market item id which every market item gets assigned when created)
    */
    function withdrawOffer(uint256 id) payable external nonReentrant{
        uint256 offerPrice =  _offers[id][msg.sender].price; 
        delete(_offers[id][msg.sender]);

        for (uint256 i = 0; i < _offerers[id].length; i++) {
            if(_offerers[id][i] == msg.sender){
                delete(_offerers[id][i]);
            }
        }

        payable(msg.sender).transfer(offerPrice);

        emit OfferWithdrawn(
            id, 
            marketItems[id].tokenId, 
            address(marketItems[id].token),
            msg.sender, 
            offerPrice
        );
    }

    /**
    @dev Triggers function onERC721Received
    @param id (market item id which every market item gets assigned when created)
    @param offerer (address of the offerer)
    */
    function acceptOffer(uint256 id, bytes memory offerer) payable external nonReentrant{
        bytes4 retVal = IERC721Receiver(address(this)).onERC721Received(msg.sender, address(this), id, offerer);
        require (retVal == IERC721Receiver.onERC721Received.selector, "ERC721: transfer to non ERC721Receiver implementer");
    }
    
    /**
    @dev Transfers net offer price to the seller, transfers royalty fee to the creator, transfers transaction fee to the transaction fee receiver,
    transfers the NFT to the offerer/buyer, deletes offer item mapped to the market item id, deletes offerer mapped to the market item id, 
    updates market item attributes
    @param from (marketplace address)
    @param id (market item id which every market item gets assigned when created)
    @param data (offerer address)
    @return bytes4 (selector of the function)
    */
    function onERC721Received(address, address from, uint256 id, bytes calldata data) payable external returns (bytes4) {
        address offerer = bytesToAddress(data);
        uint256 offerPrice = _offers[id][offerer].price;
        require(offerPrice > 0, "Offer invalid, must be above zero");
        uint256 royaltyFee = getCalculatedFeeOnOfferPrice(id, offerPrice, marketItems[id].royaltyFeePermillage);
        uint256 transactionFee = getCalculatedFeeOnOfferPrice(id, offerPrice, TRANSACTION_FEE_PERMILLAGE);
        uint256 netOfferPrice = offerPrice - royaltyFee - transactionFee;
        
        delete(_offers[id][offerer]);

        for (uint256 i = 0; i < _offerers[id].length; i++) {
            if(_offerers[id][i] == offerer){
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

    /**
    @dev Transforms a bytes stream to an address
    @param bs (bytes stream)
    @return address
    */
    function bytesToAddress(bytes memory bs) private pure returns (address) {
        require(bs.length >= 20, "slicing out of range");
        address addr;
        assembly {
            addr := mload(add(bs,20))
            
        }
        return addr;
    }

    /**
    @dev Iterates through all offer items mapped to the market item id to provide the offer item with the highest offer price 
    @param id (market item id which every market item gets assigned when created)
    @return Offer (offer item)
    */
    function getHighestOffer(uint256 id) public view returns (Offer memory){
        uint256 highestOfferPrice = 0;
        address highestOfferer = address(0);

        for(uint256 i = 0; i < _offerers[id].length; i++){
            uint256 offerPrice = (_offers[id][_offerers[id][i]]).price;
            if(offerPrice > highestOfferPrice){
                highestOfferPrice = offerPrice;
                highestOfferer = _offers[id][_offerers[id][i]].offerer;
            }
        }

        return _offers[id][highestOfferer];
    }

    /**
    @dev Maps a new offerer item to the market item id
    @param id (market item id which every market item gets assigned when created)
    @param offerer (offerer address)
    */
    function addToOfferers(uint256 id, address offerer) public {
        _offerers[id].push(offerer);
    }

    /**
    @dev Provides an offerer item for a given market item id and index
    @param id (market item id which every market item gets assigned when created)
    @param index (position in offerer array)
    @return address (offerer)
    */
    function getOfferers(uint256 id, uint256 index) external view returns(address){
        return _offerers[id][index];
    }

    /**
    @dev Provides an offer item for a given market item id and offerer
    @param id (market item id which every market item gets assigned when created)
    @param offerer (offerer address)
    @return Offer (offer item)
    */
    function getOffers(uint256 id, address offerer) external view returns (Offer memory) {
        return _offers[id][offerer];
    }

    /**
    @dev Provides the calculated total price including the royalty fee and transaction fee,
    calculating with uint256 can cause minor rounding differences which causes minor inaccuracies
    when transferring ether
    @param id (market item id which every market item gets assigned when created)
    @return uint256 (calculated total price)
    */
    function getCalculatedTotalPrice(uint256 id) public view returns(uint256){
        uint256 calculatedPrice = (marketItems[id].price*(1000 + marketItems[id].royaltyFeePermillage + TRANSACTION_FEE_PERMILLAGE))/1000;
        return calculatedPrice;
    }

    /**
    @dev Provides the calculated fee based on a fixed price, the function is used for the direct buying process
    calculating with uint256 can cause minor rounding differences which causes minor inaccuracies
    when transferring ether
    @param id (market item id which every market item gets assigned when created)
    @param feePermillage (fee in permillage which can either be royalty fee or transaction fee)
    @return uint256 (calculated fee)
    */
    function getCalculatedFeeOnFixedPrice(uint256 id, uint256 feePermillage) public view returns(uint256){
        uint256 calculatedFee = (marketItems[id].price/1000) * feePermillage;
        return calculatedFee;
    }

    /**
    @dev Provides the calculated fee based on an offer price, the function is used for the offering process
    calculating with uint256 can cause minor rounding differences which causes minor inaccuracies
    when transferring ether
    @param id (market item id which every market item gets assigned when created)
    @param price (offer price)
    @param feePermillage (fee in permillage which can either be royalty fee or transaction fee)
    @return uint256 (calculated fee)
    */
    function getCalculatedFeeOnOfferPrice(uint256 id, uint256 price, uint256 feePermillage) public view returns(uint256){
        uint256 calculatedFee = (price/(1000 + marketItems[id].royaltyFeePermillage + TRANSACTION_FEE_PERMILLAGE))*feePermillage;
        return calculatedFee; 
    }

    /**
    @dev Maps the accountName to the callers address
    @param accountName (name input of the user as a string)
    */
    function setAccountName(string memory accountName) external {
        _accountNames[msg.sender] = accountName;
    }

    /**
    @dev Provides the account name mapped to the account address
    @param accountAddress (wallet address of the account)
    @return string (account name)
    */
    function getAccountName(address accountAddress) external view returns(string memory){
        return _accountNames[accountAddress];
    }

}