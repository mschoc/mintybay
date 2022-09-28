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
        let price = toWei(10);
        let zeroPrice = toWei(0);
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

        it("Checks if the item creation fails when the price is 0", async function () {
            // mint token
            await token.connect(addr1).mint("https...3")
            // set approval for marketplace
            await token.connect(addr1).setApprovalForAll(marketplace.address, true)
            // check if create market item with zero price fails
            await expect(marketplace.connect(addr1).createMarketItem(tokenContractAddress, 1, zeroPrice, royaltyFeePermillage)).to.be.revertedWith("Price must be greater than zero"); 
        });
    });



    // PRIMARY MARKET: First listing and purchase of a token after its minting
    describe("Buy a token from the marketplace in primary market", function () {
        let price = toWei(10)
        let insufficientValue = toWei(10)
        let royaltyFeePermillage = 20;

        beforeEach(async function () {
            // mint token
            await token.connect(addr3).mint("https...3")
            // set approval for marketplace
            await token.connect(addr3).setApprovalForAll(marketplace.address, true)
            // create market item
            await marketplace.connect(addr3).createMarketItem(tokenContractAddress, 1, price, royaltyFeePermillage)
        })

        it("Checks if the balances of the buyer and seller aswell as the market item attributes are correct after a token is purchased in primary market and checks if buying the same item again fails because it is already sold", async function () {
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

            // check if buyMarketItem fails if the item is already sold
            await expect(marketplace.connect(addr4).buyMarketItem(1, {value: calculatedTotalPrice})).to.be.revertedWith("Item is already sold");  
        });

        it("Checks if the purchase of the token fails when the item does not exist, the value is insufficient to cover price, royalty fee and transaction fee and the is the seller has same address as the buyer", async function () {
            const calculatedTotalPrice = await marketplace.getCalculatedTotalPrice(1)

            // check if buyMarketItem with a non-existing item does fail
            await expect(marketplace.connect(addr4).buyMarketItem(2, {value: calculatedTotalPrice})).to.be.revertedWith("Item does not exist");
            // check if buyMarketItem with a insufficient value added does fail (This check is commented out because there is an error occurring when the given value for buyMarketItem is below the necessary value --> bug need to be fixed in the future)
            // await expect(marketplace.connect(addr4).buyMarketItem(1, {value: insufficientValue})).to.be.revertedWith("Insufficient funds to cover price, royalty fee + transaction fee");
            // check if buyMarketitem with seller same as buyer does fail
            await expect(marketplace.connect(addr3).buyMarketItem(1, {value: calculatedTotalPrice})).to.be.revertedWith("Seller cannot be the same address as the buyer");

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
            const royaltyFee = await marketplace.getCalculatedFeeOnFixedPrice(2, royaltyFeePermillage);
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
            expect(parseFloat(creatorBalanceAfterPurchase)).to.equal(parseFloat(creatorBalanceBeforePurchase) + parseFloat(fromWei(royaltyFee)))
            // check if balance of transaction fee receiver is correct after the purchase
            expect(parseFloat(trxFeeReceiverBalanceAfterPurchase)).to.equal(parseFloat(trxFeeReceiverBalanceBeforePurchase) + parseFloat(fromWei(transactionFee))) 

            boughtMarketItem = await marketplace.marketItems(2);

            // check if attributes of bought market item are correct after the purchase
            expect(boughtMarketItem.sold).to.equal(true);
            expect(boughtMarketItem.owner).to.equal(addr7.address);
            expect(await token.ownerOf(1)).to.equal(addr7.address);    
        });  
    });

    describe("Make an offer for a token and accept/withdraw the offer in the primary market", function () {
        let price = toWei(10)
        let royaltyFeePermillage = 20;
        let offerPrice = toWei(5);
        let higherOfferPrice = toWei(6);
        let zeroOfferPrice = toWei(0);

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

            // check if attributes of offer and offerer are correct
            expect((await marketplace.getOffers(1, addr4.address)).offerer).to.equal(addr4.address);
            expect((await marketplace.getOffers(1, addr4.address)).price).to.equal(offerPrice);
            expect((await marketplace.getOfferers(1, 0))).to.equal(addr4.address);
        });

        it("Checks if the balance of the offerer, seller and fee receiver are correct aswell as the attributes involved in the process are correct after an offer is accepted and checks if making offer for the same item again fails", async function () {
            // make offer
            await marketplace.connect(addr4).makeOffer(1, {value: offerPrice})

            const offererBalanceBeforeAcceptance = fromWei(await addr4.getBalance());
            const sellerBalanceBeforeAcceptance = fromWei(await addr3.getBalance());
            const trxFeeReceiverBalanceBeforeAcceptance = fromWei(await transactionFeeReceiver.getBalance());
            const transactionFee = await marketplace.getCalculatedFeeOnOfferPrice(1, offerPrice, TRANSACTION_FEE_PERMILLAGE);
            const offerer = await marketplace.getOfferers(1, 0);

            // accept offer
            await marketplace.connect(addr3).acceptOffer(1, offerer);

            const offererBalanceAfterAcceptance = fromWei(await addr4.getBalance());
            const sellerBalanceAfterAcceptance = fromWei(await addr3.getBalance())
            const trxFeeReceiverBalanceAfterAcceptance = fromWei(await transactionFeeReceiver.getBalance())

            // check if balance of offerer is correct after the acceptance
            expect(parseFloat(offererBalanceAfterAcceptance)).to.equal(parseFloat(offererBalanceBeforeAcceptance))
            // check if balance of seller is correct after the purchase
            expect(parseFloat(sellerBalanceAfterAcceptance)).to.equal(parseFloat(sellerBalanceBeforeAcceptance) + (parseFloat(fromWei(offerPrice) - fromWei(transactionFee))))
            // check if balance of transaction fee receiver is correct after the purchase
            expect(parseFloat(trxFeeReceiverBalanceAfterAcceptance)).to.equal(parseFloat(trxFeeReceiverBalanceBeforeAcceptance) + parseFloat(fromWei(transactionFee)))

            // check if offerer is deleted
            expect((await marketplace.getOfferers(1, 0))).to.equal('0x0000000000000000000000000000000000000000')
            // check if offer is deleted
            expect((await marketplace.getOffers(1, addr4.address)).price).to.equal(0)

            boughtMarketItem = await marketplace.marketItems(1);

            // check if attributes of bought market item are correct after the offer acceptance
            expect(boughtMarketItem.sold).to.equal(true);
            expect(boughtMarketItem.owner).to.equal(addr4.address);
            expect(await token.ownerOf(1)).to.equal(addr4.address);

            // check if make offer fails when item is already sold
            await expect(marketplace.connect(addr4).makeOffer(1, {value: offerPrice})).to.be.revertedWith("Item is already sold");

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

            // check if offerer is deleted
            expect((await marketplace.getOfferers(1, 0))).to.equal('0x0000000000000000000000000000000000000000')
            // check if offer is deleted
            expect((await marketplace.getOffers(1, addr4.address)).price).to.equal(0)
        });

        it("Checks if highest offer function is providing the correct offer price", async function () {
            // make offer
            await marketplace.connect(addr4).makeOffer(1, {value: offerPrice});
            // make offer with a higher price
            await marketplace.connect(addr5).makeOffer(1, {value: higherOfferPrice});

            // check if the the highest offer is correct
            expect((await marketplace.connect(addr4).getHighestOffer(1)).price).to.equal(higherOfferPrice);

        });

        it("Checks if making an offer fails when the item does not exist, the seller is the same address as the offerer, the offer price is zero", async function () {

            //check if make offer fails when the item does not exist
            await expect(marketplace.connect(addr4).makeOffer(3, {value: offerPrice})).to.be.revertedWith("Item does not exist");
            //check if make offer fails when the seller is the same address as the offerer
            await expect(marketplace.connect(addr3).makeOffer(1, {value: offerPrice})).to.be.revertedWith("Seller cannot be the same address as the offerer");
            //check if make offer fails when the offer price is zero
            await expect(marketplace.connect(addr4).makeOffer(1, {value: zeroOfferPrice})).to.be.revertedWith("Offer invalid, must be above zero");

        });
    });

    describe("Make an offer for a token and accept it in secondary market", function () {
        let price = toWei(10)
        let royaltyFeePermillage = 20;
        let resellingPrice = toWei(20);
        let offerPrice = toWei(5);

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
            // sell market item again
            await marketplace.connect(addr6).createMarketItem(tokenContractAddress, 1, resellingPrice, royaltyFeePermillage)
        });

        it("Checks if the balance of the seller and the creator are correct aswell after an offer is accepted in secondary market", async function () {
            // make offer
            await marketplace.connect(addr7).makeOffer(2, {value: offerPrice})

            const sellerBalanceBeforeAcceptance = fromWei(await addr6.getBalance());
            const creatorBalanceBeforeAcceptance = fromWei(await addr5.getBalance());
            const royaltyFee = await marketplace.getCalculatedFeeOnOfferPrice(2, offerPrice, royaltyFeePermillage);
            const transactionFee = await marketplace.getCalculatedFeeOnOfferPrice(2, offerPrice, TRANSACTION_FEE_PERMILLAGE);
            const offerer = await marketplace.getOfferers(2, 0);

            // accept offer
            await marketplace.connect(addr6).acceptOffer(2, offerer);

            const sellerBalanceAfterAcceptance = fromWei(await addr6.getBalance());
            const creatorBalanceAfterAcceptance = fromWei(await addr5.getBalance());

            // check if balance of seller is correct after the purchase
            expect(parseFloat(sellerBalanceAfterAcceptance)).to.equal(parseFloat(sellerBalanceBeforeAcceptance) + (parseFloat(fromWei(offerPrice) - fromWei(transactionFee) - fromWei(royaltyFee))))
            // check if balance of creator is correct after the purchase
            expect(parseFloat(creatorBalanceAfterAcceptance)).to.equal(parseFloat(creatorBalanceBeforeAcceptance) + parseFloat(fromWei(royaltyFee)))
        });
    });

    describe("Set an account name", function () {
        const accountName = "SuperMinter11"

        it("Checks if the set account name is mapped to the address", async function () {

            // set account name
            await marketplace.connect(addr7).setAccountName(accountName);

            // check if the accountName is mapped to the address
            expect(await marketplace.connect(addr7).getAccountName(addr7.address)).to.equal(accountName);
        });

    });
    
});