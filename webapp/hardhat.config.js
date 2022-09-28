/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require('@nomiclabs/hardhat-waffle');
//require('solidity-coverage'); // --> uncomment to determine the test coverage for smart contracts locally

module.exports = {
  solidity: "0.8.1",

  paths: {
    artifacts: "./src/artifacts",
    sources: "./src/contracts",
    cache: "./src/cache",
    tests: "./src/test"
  },

  networks: {
    hardhat: {
      gasPrice: 0,
      initialBaseFeePerGas: 0
    }
  }
};
