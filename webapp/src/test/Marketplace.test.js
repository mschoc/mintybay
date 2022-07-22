const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", function () {

    it("Should create and buy market items", async function () {

    // deploy marketplace
    const Marketplace = await ethers.getContractFactory("Marketplace")
    const marketplace = await Marketplace.deploy()
    await marketplace.deployed()
    const marketplaceAddress = marketplace.address

    // deploy token
    const Token = await ethers.getContractFactory("Token")
    const token = await Token.deploy(marketplaceAddress)
    await token.deployed()
    const tokenContractAddress = token.address

    const [addr1, addr2, ...addrs] = await ethers.getSigners();
    console.log(addr1);
    console.log(addr2);

    // mint tokens
    await token.connect(addr1).mint("https...1")
    await token.connect(addr1).mint("https...2")

    // create market items with minted tokens
    const price = ethers.utils.parseUnits('10', 'ether')
    const royaltyFeePermillage = 20;
    await marketplace.connect(addr1).createMarketItem(tokenContractAddress, 1, price, royaltyFeePermillage)
    await marketplace.connect(addr1).createMarketItem(tokenContractAddress, 2, price, royaltyFeePermillage)

    // buy market item
    const priceWithFee = await marketplace.connect(addr1).getCalculatedPrice(1);
    await marketplace.connect(addr2).buyMarketItem(1, {value: priceWithFee});

    // return all unsold items
    let unsoldMarketItems = await marketplace.getUnsoldMarketItems()
    
    unsoldMarketItems = await Promise.all(unsoldMarketItems.map(async i => {
        const tokenUri = await token.tokenURI(i.tokenId) 
        let unsoldMarketItem = {
        price: i.price.toString(),
        tokenId: i.tokenId.toString(),
        seller: i.seller,
        owner: i.owner,
        tokenUri
        }
        return unsoldMarketItem
    }))

    const marketItem = unsoldMarketItems[0];
    expect((marketItem.tokenId) == 2);
    expect((marketItem.price) == price);

    console.log('unsold market items: ', unsoldMarketItems)
    });
});