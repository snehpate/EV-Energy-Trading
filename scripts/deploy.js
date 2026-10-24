const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const { ethers } = hre;

async function main() {
  const initialSupply = process.env.INITIAL_SUPPLY || "1000000";
  const energySource = process.env.ENERGY_SOURCE || "Solar";

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying EnergyToken with account ${deployer.address}`);

  const EnergyToken = await ethers.getContractFactory("EnergyToken");
  const token = await EnergyToken.deploy(
    ethers.utils.parseEther(initialSupply),
    energySource
  );
  await token.deployed();
  console.log(`EnergyToken deployed to ${token.address} on ${hre.network.name}`);

  // Export address + ABI so the React front-end can talk to the contract
  const { chainId } = await ethers.provider.getNetwork();
  const artifact = await hre.artifacts.readArtifact("EnergyToken");
  const deployment = {
    address: token.address,
    network: hre.network.name,
    chainId,
    timestamp: new Date().toISOString(),
    abi: artifact.abi,
  };

  const outFile = path.join(__dirname, "..", "src", "utils", "deployment.json");
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));
  console.log(`Deployment info written to ${path.relative(process.cwd(), outFile)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
