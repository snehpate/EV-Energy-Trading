const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const { ethers } = hre;

async function main() {
  const initialSupply = process.env.INITIAL_SUPPLY || "1000000";
  const energySource = process.env.ENERGY_SOURCE || "Solar";

  const [deployer] = await ethers.getSigners();
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  console.log(`Deploying with account ${deployer.address}`);

  const EnergyToken = await ethers.getContractFactory("EnergyToken");
  const token = await EnergyToken.deploy(ethers.utils.parseEther(initialSupply), energySource);
  await token.deployed();
  const { blockNumber: deployBlock } = await token.deployTransaction.wait();
  console.log(`EnergyToken deployed to ${token.address}`);

  const EnergyMarketplace = await ethers.getContractFactory("EnergyMarketplace");
  const marketplace = await EnergyMarketplace.deploy(token.address, treasury);
  await marketplace.deployed();
  console.log(`EnergyMarketplace deployed to ${marketplace.address}`);

  // Escrow payments must not lose the transfer fee
  await (await token.setFeeExempt(marketplace.address, true)).wait();
  console.log("Marketplace exempted from token transfer fees");

  // Export addresses + ABIs so the React front-end can talk to the contracts
  const { chainId } = await ethers.provider.getNetwork();
  const tokenArtifact = await hre.artifacts.readArtifact("EnergyToken");
  const marketplaceArtifact = await hre.artifacts.readArtifact("EnergyMarketplace");
  const deployment = {
    network: hre.network.name,
    chainId,
    deployBlock, // analytics reads marketplace events from here
    timestamp: new Date().toISOString(),
    token: { address: token.address, abi: tokenArtifact.abi },
    marketplace: { address: marketplace.address, abi: marketplaceArtifact.abi },
  };

  const outFile = path.join(__dirname, "..", "src", "utils", "deployment.json");
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2) + "\n");
  console.log(`Deployment info written to ${path.relative(process.cwd(), outFile)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
