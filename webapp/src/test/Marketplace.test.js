const { expect } = require("chai");
const { ethers } = require("hardhat");

const toWei = (number) => ethers.utils.parseEther(number.toString())
const fromWei = (number) => ethers.utils.formatEther(number)
const roundTo5Dec = (number) => parseFloat(number).toFixed(5)

describe("Marketplace", function () {

    beforeEach( async function (){
        // deploy marketplace
        Marketplace = await ethers.getContractFactory("Marketplace");
        marketplace = await Marketplace.deploy();
        await marketplace.deployed();
        marketplaceAddress = marketplace.address;
        // deploy token
        Token = await ethers.getContractFactory("Token");
        token = await Token.deploy(marketplaceAddress);
        await token.deployed();
        tokenContractAddress = token.address;
        // get test addresses
        [addr1, addr2, addr3, addr4, addr5, addr6, addr7,...addrs] = await ethers.getSigners();
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
        
        it("Checks if the arket item attributes are correct after a new market item is created", async function () {
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
    describe("Buy a token from the markeplace in primary market", function () {
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
            const sellerBalanceBeforePurchase = fromWei(await addr3.getBalance())
            const buyerBalanceBeforePurchase = fromWei(await addr4.getBalance())
            const calculatedPrice = await marketplace.getCalculatedPrice(1)

            // buy market item
            await marketplace.connect(addr4).buyMarketItem(1, {value: calculatedPrice})

            const buyerBalanceAfterPurchase = fromWei(await addr4.getBalance())
            const costOfBuyMethod = (buyerBalanceBeforePurchase - buyerBalanceAfterPurchase) - (fromWei(calculatedPrice));
            const sellerFinalBalance = fromWei(await addr3.getBalance())

            // check if balance of buyer is correct after the purchase
            expect(roundTo5Dec(buyerBalanceAfterPurchase)).to.equal(roundTo5Dec(buyerBalanceBeforePurchase - fromWei(calculatedPrice) - costOfBuyMethod))
            // check if balance of seller is correct after the purchase
            expect(roundTo5Dec(sellerFinalBalance)).to.equal(roundTo5Dec(parseFloat(sellerBalanceBeforePurchase) + parseFloat(fromWei(calculatedPrice)))) 

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
            const calculatedPrice = await marketplace.getCalculatedPrice(1)
            await marketplace.connect(addr6).buyMarketItem(1, {value: calculatedPrice})
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
            const calculatedPrice = await marketplace.getCalculatedPrice(2)
            const royalteFee = fromWei(calculatedPrice) - fromWei(resellingPrice)

            // buy market item
            await marketplace.connect(addr7).buyMarketItem(2, {value: calculatedPrice})

            const buyerBalanceAfterPurchase = fromWei(await addr7.getBalance())
            const costOfBuyMethod = (buyerBalanceBeforePurchase - buyerBalanceAfterPurchase) - (fromWei(calculatedPrice));
            const sellerBalanceAfterPurchase = fromWei(await addr6.getBalance())
            const creatorBalanceAfterPurchase = fromWei(await addr5.getBalance())

            // check if balance of buyer is correct after the purchase
            expect(roundTo5Dec(buyerBalanceAfterPurchase)).to.equal(roundTo5Dec(buyerBalanceBeforePurchase - fromWei(calculatedPrice) - costOfBuyMethod))
            // check if balance of seller is correct after the purchase
            expect(roundTo5Dec(sellerBalanceAfterPurchase)).to.equal(roundTo5Dec(parseFloat(sellerBalanceBeforePurchase) + parseFloat(fromWei(resellingPrice))))
            // check if balance of creator is correct after the purchase
            expect(roundTo5Dec(creatorBalanceAfterPurchase)).to.equal(roundTo5Dec(parseFloat(creatorBalanceBeforePurchase) + parseFloat(royalteFee))) 

            boughtMarketItem = await marketplace.marketItems(2);

            // check if attributes of bought market item are correct after the purchase
            expect(boughtMarketItem.sold).to.equal(true);
            expect(boughtMarketItem.owner).to.equal(addr7.address);
            expect(await token.ownerOf(1)).to.equal(addr7.address);    
        });  
    });
    
});