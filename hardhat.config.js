require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

const { PRIVATE_KEY, INFURA_API_KEY } = process.env;

const networks = {
  localhost: {
    url: "http://127.0.0.1:8545",
  },
};

// Only register the public testnet when credentials are provided
if (PRIVATE_KEY && INFURA_API_KEY) {
  networks.sepolia = {
    url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
    accounts: [PRIVATE_KEY],
  };
}

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks,
};
