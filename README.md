# mintybay.io - NFT Marketplace by Marc Schoch

## Requirements
- NodeJS --> Install [NodeJS](https://nodejs.org/en/)
- Hardhat --> Install [Hardhat](https://hardhat.org/)

## Setup npm
### 1. Clone Repository
### 2. Switch to Webapp
`$ cd webapp`
### 3. Install npm dependencies
`$ npm install`

## Setup Local Development Environment
### 1. Switch to Webapp
`$ cd webapp`
### 2. Start hardhat local blockchain
`$ npx hardhat node`
### 3. Connect local blockchain to Metamask
- Metamask --> add networks --> Network Name: "Hardhat" --> New RPC URL: "http://127.0.0.1:8545" --> Chain ID: "31337" --> save
- Import private key from a provided account of your local blockchain
### 4. Deploy Smart Contracts to local blockchain
`$ npx hardhat run src/backend/scripts/deploy.js --network localhost`

### Run Application
### 1. Switch to Webapp
`$ cd webapp`
### 2. Run Frontend Application
`$ npm run start`

## Additional useful commands
### Clean and Compile Smart Contracts
```
$ cd webapp
$ npx hardhat clean
$ npx hardhat compile
```
### Run Tests
```
$ cd webapp
$ npx hardhat test
```







