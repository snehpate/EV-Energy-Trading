require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

const { PRIVATE_KEY, INFURA_API_KEY, SEPOLIA_RPC_URL } = process.env;

const networks = {
  localhost: {
    url: "http://127.0.0.1:8545",
  },
};

// Only register the public testnet when credentials are provided.
// SEPOLIA_RPC_URL can be any provider (Alchemy, Infura, ...); INFURA_API_KEY is a shortcut.
const sepoliaUrl = SEPOLIA_RPC_URL || (INFURA_API_KEY && `https://sepolia.infura.io/v3/${INFURA_API_KEY}`);
if (PRIVATE_KEY && sepoliaUrl) {
  networks.sepolia = {
    url: sepoliaUrl,
    accounts: [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`],
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
