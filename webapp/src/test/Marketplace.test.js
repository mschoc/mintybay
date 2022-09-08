const { expect } = require("chai");
const { ethers } = require("hardhat");

const toWei = (number) => ethers.utils.parseEther(number.toString())
const fromWei = (number) => ethers.utils.formatEther(number)
const TRANSACTION_FEE_PERMILLAGE = 5;

describe("Marketplace", function () {

    beforeEach( async function (){
        // get test addresses
        [transactionFeeReceiver, addr1, addr2, addr3, addr4, addr5, addr6, addr7, ...addrs] = await ethers.getSigners();
        // deploy marketplace
        Marketplace = await ethers.getContractFactory("Marketplace");
        marketplace = await Marketplace.deploy(TRANSACTION_FEE_PERMILLAGE, transactionFeeReceiver.address);
        await marketplace.deployed();
        marketplaceAddress = marketplace.address;
        // deploy token
        Token = await ethers.getContractFactory("Token");
        token = await Token.deploy(marketplaceAddress);
        await token.deployed();
        tokenContractAddress = token.address;
    });
    
    describe("Deployment of token", function () {
        it("Checks if token name and symbol are correct after token is deployed", async function () {
            const tokenName = "mintybay Token"
            const tokenSymbol = "MBT"
            expect(await token.name()).to.equal(tokenName);
            expect(await token.symbol()).to.equal(tokenSymbol);
          });
    });

    describe("Mint tokens", function () {
        it("Checks if tokenIdCount, balance and tokenURI are correct after token is minted", async function () {
            // mint token 1
            await token.connect(addr1).mint("https...1")
            expect(await token.tokenIdCount()).to.equal(1);
            expect(await token.balanceOf(addr1.address)).to.equal(1);
            expect(await token.tokenURI(1)).to.equal("https...1");
            // mint token 2
            await token.connect(addr2).mint("https...2")
            expect(await token.tokenIdCount()).to.equal(2);
            expect(await token.balanceOf(addr1.address)).to.equal(1);
            expect(await token.tokenURI(2)).to.equal("https...2");
          });
    });

    describe("Create market items", function () {
        let price = ethers.utils.parseUnits('10', 'ether')
        let royaltyFeePermillage = 20;
        
        it("Checks if the market item attributes are correct after a new market item is created", async function () {
            // mint token
            await token.connect(addr1).mint("https...3")
            // set approval for marketplace
            await token.connect(addr1).setApprovalForAll(marketplace.address, true)
            // create market item 
            await marketplace.connect(addr1).createMarketItem(tokenContractAddress, 1, price, royaltyFeePermillage)
            const marketItem = await marketplace.marketItems(1);
            // check if market item attributes are correct
            expect(marketItem.id).to.equal(1);
            expect(marketItem.tokenId).to.equal(1);
            expect(marketItem.token).to.equal(token.address);
            expect(marketItem.seller).to.equal(addr1.address);
            expect(marketItem.creator).to.equal(addr1.address);
            expect(marketItem.price).to.equal(price);
            expect(marketItem.royaltyFeePermillage).to.equal(royaltyFeePermillage);
            expect(marketItem.sold).to.equal(false);
            expect(await marketplace.marketItemCount()).to.equal(1);
          });
    });



    // PRIMARY MARKET: First listing and purchase of a token after its minting
    describe("Buy a token from the marketplace in primary market", function () {
        let price = toWei(10)
        let royaltyFeePermillage = 20;

        beforeEach(async function () {
            // mint token
            await token.connect(addr3).mint("https...3")
            // set approval for marketplace
            await token.connect(addr3).setApprovalForAll(marketplace.address, true)
            // create market item
            await marketplace.connect(addr3).createMarketItem(tokenContractAddress, 1, price, royaltyFeePermillage)
        })

        it("Checks if the balances of the buyer and seller aswell as the market item attributes are correct after a token is purchased in primary market", async function () {
            const buyerBalanceBeforePurchase = fromWei(await addr4.getBalance())
            const sellerBalanceBeforePurchase = fromWei(await addr3.getBalance())
            const trxFeeReceiverBalanceBeforePurchase = fromWei(await transactionFeeReceiver.getBalance())
            const calculatedTotalPrice = await marketplace.getCalculatedTotalPrice(1)
            const transactionFee = await marketplace.getCalculatedFeeOnFixedPrice(1, TRANSACTION_FEE_PERMILLAGE);

            // buy market item
            await marketplace.connect(addr4).buyMarketItem(1, {value: calculatedTotalPrice})

            const buyerBalanceAfterPurchase = fromWei(await addr4.getBalance())
            const sellerBalanceAfterBalance = fromWei(await addr3.getBalance())
            const trxFeeReceiverBalanceAfterPurchase = fromWei(await transactionFeeReceiver.getBalance())

            // check if balance of buyer is correct after the purchase
            expect(parseFloat(buyerBalanceAfterPurchase)).to.equal(parseFloat(buyerBalanceBeforePurchase) - parseFloat(fromWei(calculatedTotalPrice)))
            // check if balance of seller is correct after the purchase
            expect(parseFloat(sellerBalanceAfterBalance)).to.equal(parseFloat(sellerBalanceBeforePurchase) + parseFloat((fromWei(calculatedTotalPrice) - fromWei(transactionFee))))
            // check if balance of transaction fee reveiver is correct after the purchase
            expect(parseFloat(trxFeeReceiverBalanceAfterPurchase)).to.equal(parseFloat(trxFeeReceiverBalanceBeforePurchase) + parseFloat(fromWei(transactionFee)))

            boughtMarketItem = await marketplace.marketItems(1);

            // check if attributes of bought market item are correct after the purchase
            expect(boughtMarketItem.sold).to.equal(true);
            expect(boughtMarketItem.owner).to.equal(addr4.address);
            expect(await token.ownerOf(1)).to.equal(addr4.address); 
        });  
    });

    // SECONDARY MARKET: Listing and purchase of a token which has already been listed and purchased at least 1 time after its minting
    describe("Resell and buy a token from the marketplace in secondary market", function () {
        let price = toWei(10)
        let royaltyFeePermillage = 20;
        let resellingPrice = toWei(20);

        beforeEach(async function () {
            // mint token
            await token.connect(addr5).mint("https...4")
            // set approval for marketplace
            await token.connect(addr5).setApprovalForAll(marketplace.address, true)
            // create market item
            await marketplace.connect(addr5).createMarketItem(tokenContractAddress, 1, price, royaltyFeePermillage)
            // buy market item in primary market
            const calculatedTotalPrice = await marketplace.getCalculatedTotalPrice(1)
            await marketplace.connect(addr6).buyMarketItem(1, {value: calculatedTotalPrice})
            // set approval for marketplace
            await token.connect(addr6).setApprovalForAll(marketplace.address, true)
        })

        it("Checks if the market item attributes of the reselling market item are correct after a new market item is created", async function () {
            // create market item 
            await marketplace.connect(addr6).createMarketItem(tokenContractAddress, 1, resellingPrice, royaltyFeePermillage)
            const resellingMarketItem = await marketplace.marketItems(2);

            // check if attributes of reselling market item are correct
            expect(resellingMarketItem.id).to.equal(2);
            expect(resellingMarketItem.tokenId).to.equal(1);
            expect(resellingMarketItem.token).to.equal(token.address);
            expect(resellingMarketItem.seller).to.equal(addr6.address);
            expect(resellingMarketItem.creator).to.equal(addr5.address);
            expect(resellingMarketItem.price).to.equal(resellingPrice);
            expect(resellingMarketItem.royaltyFeePermillage).to.equal(royaltyFeePermillage);
            expect(resellingMarketItem.sold).to.equal(false);
            expect(await marketplace.marketItemCount()).to.equal(2);
        });  

        it("Checks if the balances of the buyer, seller and creator aswell as the market item attributes are correct after a token is purchased in secondary market", async function () {
            // create market item 
            await marketplace.connect(addr6).createMarketItem(tokenContractAddress, 1, resellingPrice, royaltyFeePermillage)

            const sellerBalanceBeforePurchase = fromWei(await addr6.getBalance())
            const buyerBalanceBeforePurchase = fromWei(await addr7.getBalance())
            const creatorBalanceBeforePurchase = fromWei(await addr5.getBalance())
            const trxFeeReceiverBalanceBeforePurchase = fromWei(await transactionFeeReceiver.getBalance())
            const calculatedTotalPrice = await marketplace.getCalculatedTotalPrice(2)
            const royalteFee = await marketplace.getCalculatedFeeOnFixedPrice(2, royaltyFeePermillage);
            const transactionFee = await marketplace.getCalculatedFeeOnFixedPrice(2, TRANSACTION_FEE_PERMILLAGE);

            // buy market item
            await marketplace.connect(addr7).buyMarketItem(2, {value: calculatedTotalPrice})

            const buyerBalanceAfterPurchase = fromWei(await addr7.getBalance())
            const sellerBalanceAfterPurchase = fromWei(await addr6.getBalance())
            const creatorBalanceAfterPurchase = fromWei(await addr5.getBalance())
            const trxFeeReceiverBalanceAfterPurchase = fromWei(await transactionFeeReceiver.getBalance())

            // check if balance of buyer is correct after the purchase
            expect(parseFloat(buyerBalanceAfterPurchase)).to.equal(parseFloat(buyerBalanceBeforePurchase) - parseFloat(fromWei(calculatedTotalPrice)))
            // check if balance of seller is correct after the purchase
            expect(parseFloat(sellerBalanceAfterPurchase)).to.equal(parseFloat(sellerBalanceBeforePurchase) + parseFloat(fromWei(resellingPrice)))
            // check if balance of creator is correct after the purchase
            expect(parseFloat(creatorBalanceAfterPurchase)).to.equal(parseFloat(creatorBalanceBeforePurchase) + parseFloat(fromWei(royalteFee)))
            // check if balance of transaction fee receiver is correct after the purchase
            expect(parseFloat(trxFeeReceiverBalanceAfterPurchase)).to.equal(parseFloat(trxFeeReceiverBalanceBeforePurchase) + parseFloat(fromWei(transactionFee))) 

            boughtMarketItem = await marketplace.marketItems(2);

            // check if attributes of bought market item are correct after the purchase
            expect(boughtMarketItem.sold).to.equal(true);
            expect(boughtMarketItem.owner).to.equal(addr7.address);
            expect(await token.ownerOf(1)).to.equal(addr7.address);    
        });  
    });

    describe("Make an offer for a token and accept/withdraw the offer", function () {
        let price = toWei(10)
        let royaltyFeePermillage = 20;
        let offerPrice = toWei(5)

        beforeEach(async function () {
            // mint token
            await token.connect(addr3).mint("https...3")
            // set approval for marketplace
            await token.connect(addr3).setApprovalForAll(marketplace.address, true)
            // create market item
            await marketplace.connect(addr3).createMarketItem(tokenContractAddress, 1, price, royaltyFeePermillage)
        })

        it("Checks if the balance of the offerer aswell as the offer and offerer attributes are correct if an offer is made", async function () {
            const offererBalanceBeforeOffer = fromWei(await addr4.getBalance());
            
            // make offer
            await marketplace.connect(addr4).makeOffer(1, {value: offerPrice});

            const offererBalanceAfterOffer = fromWei(await addr4.getBalance());
            
            // check if balance of offerer is correct after the withdrawal
            expect(parseFloat(offererBalanceAfterOffer)).to.equal(parseFloat(offererBalanceBeforeOffer) - parseFloat(fromWei(offerPrice)))

            const offer = await marketplace.getOffers(1, addr4.address);
            const offerer = await marketplace.getOfferers(1, 0);

            // check if attributes of offer and offerer are correct
            expect(offer.offerer).to.equal(addr4.address);
            expect(offer.price).to.equal(offerPrice);
            expect(offerer.offerer).to.equal(addr4.address);
        });

        it("Checks if the balance of the offerer, seller and fee receiver are correct aswell as the attributes involved in the process are correct after an offer is accepted", async function () {
            // make offer
            await marketplace.connect(addr4).makeOffer(1, {value: offerPrice})

            const offererBalanceBeforeAcceptance = fromWei(await addr4.getBalance());
            const sellerBalanceBeforeAcceptance = fromWei(await addr3.getBalance());
            const trxFeeReceiverBalanceBeforeAcceptance = fromWei(await transactionFeeReceiver.getBalance());
            const transactionFee = await marketplace.getCalculatedFeeOnOfferPrice(1, offerPrice, TRANSACTION_FEE_PERMILLAGE);
            const offerer = await marketplace.getOfferers(1, 0);

            // accept offer
            await marketplace.connect(addr3).acceptOffer(1, offerer.offerer);

            const offererBalanceAfterAcceptance = fromWei(await addr4.getBalance());
            const sellerBalanceAfterAcceptance = fromWei(await addr3.getBalance())
            const trxFeeReceiverBalanceAfterAcceptance = fromWei(await transactionFeeReceiver.getBalance())

            // check if balance of offerer is correct after the acceptance
            expect(parseFloat(offererBalanceAfterAcceptance)).to.equal(parseFloat(offererBalanceBeforeAcceptance))
            // check if balance of seller is correct after the purchase
            expect(parseFloat(sellerBalanceAfterAcceptance)).to.equal(parseFloat(sellerBalanceBeforeAcceptance) + (parseFloat(fromWei(offerPrice) - fromWei(transactionFee))))
            // check if balance of transaction fee receiver is correct after the purchase
            expect(parseFloat(trxFeeReceiverBalanceAfterAcceptance)).to.equal(parseFloat(trxFeeReceiverBalanceBeforeAcceptance) + parseFloat(fromWei(transactionFee)))

            const offererAfterAcceptance = await marketplace.getOfferers(1, 0);
            const offerAfterAcceptance = await marketplace.getOffers(1, addr4.address);

            // check if offerer is deleted
            expect(offererAfterAcceptance.offerer).to.equal('0x0000000000000000000000000000000000000000')
            // check if offer is deleted
            expect(offerAfterAcceptance.price).to.equal(0)

            boughtMarketItem = await marketplace.marketItems(1);

            // check if attributes of bought market item are correct after the offer acceptance
            expect(boughtMarketItem.sold).to.equal(true);
            expect(boughtMarketItem.owner).to.equal(addr4.address);
            expect(await token.ownerOf(1)).to.equal(addr4.address);
        });

        it("Checks if the balance of the offerer aswell as the attributes involved in the process are correct after an offer is withdrawn", async function () {
            // make offer
            await marketplace.connect(addr4).makeOffer(1, {value: offerPrice})

            const offererBalanceBeforeWithdrawal = fromWei(await addr4.getBalance());

            // withdraw offer
            await marketplace.connect(addr4).withdrawOffer(1);

            const offererBalanceAfterWithdrawal = fromWei(await addr4.getBalance());

            // check if balance of offerer is correct after the withdrawal
            expect(parseFloat(offererBalanceAfterWithdrawal)).to.equal(parseFloat(offererBalanceBeforeWithdrawal) + parseFloat(fromWei(offerPrice)))

            const offererAfterWithdrawal = await marketplace.getOfferers(1, 0);
            const offerAfterWithdrawal = await marketplace.getOffers(1, addr4.address);

            // check if offerer is deleted
            expect(offererAfterWithdrawal.offerer).to.equal('0x0000000000000000000000000000000000000000')
            // check if offer is deleted
            expect(offerAfterWithdrawal.price).to.equal(0)
        });
    });
    
});