const { ethers, artifacts } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const Marketplace = await ethers.getContractFactory("Marketplace");
    const marketplace = await Marketplace.deploy();
    await marketplace.deployed();
    console.log("Marketplace deployed to:", marketplace.address);

    const Token = await ethers.getContractFactory("Token")
    const token = await Token.deploy(marketplace.address);
    await token.deployed();
    console.log("Token deployed to:", token.address);

    generateContractsData(marketplace, "Marketplace");
    generateContractsData(token, "Token");
}

function generateContractsData(contract, name){
    const fs = require("fs");
    const contractsDataDir = __dirname + "/../../src/contractsData";

    if(!fs.existsSync(contractsDataDir)){
        fs.mkdirSync(contractsDataDir);
    }

    fs.writeFileSync(
        contractsDataDir + `/${name}-address.json`,
        JSON.stringify({ address: contract.address }, undefined, 2)
    );

    fs.writeFileSync(
        contractsDataDir + `/${name}.json`,
        JSON.stringify(artifacts.readArtifactSync(name), null, 2)
    );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });