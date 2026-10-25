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

  const { chainId } = await ethers.provider.getNetwork();

  // Test networks get a faucet so public testers can claim ENG themselves
  let faucet;
  if (chainId !== 1) {
    const EnergyFaucet = await ethers.getContractFactory("EnergyFaucet");
    faucet = await EnergyFaucet.deploy(token.address);
    await faucet.deployed();
    await (await token.setFeeExempt(faucet.address, true)).wait();
    const funding = ethers.utils.parseEther(process.env.FAUCET_FUNDING || "100000");
    await (await token.transfer(faucet.address, funding)).wait();
    console.log(`EnergyFaucet deployed to ${faucet.address} and funded`);
  }

  // Export addresses + ABIs so the React front-end can talk to the contracts
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
  if (faucet) {
    const faucetArtifact = await hre.artifacts.readArtifact("EnergyFaucet");
    deployment.faucet = { address: faucet.address, abi: faucetArtifact.abi };
  }

  // One file per chain; the front-end picks the one matching the wallet's network
  const outFile = path.join(__dirname, "..", "src", "utils", "deployments", `${chainId}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2) + "\n");
  console.log(`Deployment info written to ${path.relative(process.cwd(), outFile)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
