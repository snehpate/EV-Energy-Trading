// Fills a local deployment with demo data: funded accounts, listings and orders.
const hre = require("hardhat");
const deployment = require("../src/utils/deployment.json");

const { ethers } = hre;
const eng = (n) => ethers.utils.parseEther(String(n));

async function main() {
  const [admin, solarFarm, windCoop, driver1, driver2] = await ethers.getSigners();
  const token = await ethers.getContractAt("EnergyToken", deployment.token.address);
  const market = await ethers.getContractAt("EnergyMarketplace", deployment.marketplace.address);

  for (const account of [solarFarm, windCoop, driver1, driver2]) {
    await (await token.transfer(account.address, eng(5000))).wait();
  }
  console.log("Funded 4 demo accounts with 5000 ENG each");

  const listings = [
    [solarFarm, 500, "0.45", "Solar", "SunPark Charging Hub, Austin"],
    [solarFarm, 250, "0.40", "Solar", "Rooftop Station 7, Austin"],
    [windCoop, 800, "0.38", "Wind", "Prairie Wind Chargers, Amarillo"],
    [windCoop, 300, "0.52", "Hydro", "River Dam Fast-Charge, Portland"],
  ];
  for (const [seller, kwh, price, source, location] of listings) {
    await (await market.connect(seller).createListing(kwh, eng(price), source, location)).wait();
  }
  console.log(`Created ${listings.length} energy listings`);

  // A few trades so analytics and ratings have data
  for (const driver of [driver1, driver2]) {
    await (await token.connect(driver).approve(market.address, ethers.constants.MaxUint256)).wait();
  }
  await (await market.connect(driver1).buyEnergy(0, 60, eng("0.45"))).wait();
  await (await market.connect(driver1).confirmDelivery(0)).wait();
  await (await market.connect(driver1).rateSeller(0, 5)).wait();
  await (await market.connect(driver2).buyEnergy(2, 120, eng("0.38"))).wait();
  await (await market.connect(driver2).confirmDelivery(1)).wait();
  await (await market.connect(driver2).rateSeller(1, 4)).wait();
  await (await market.connect(driver2).buyEnergy(3, 40, eng("0.52"))).wait();
  await (await token.connect(admin).stakeTokens(eng(10000))).wait();
  console.log("Placed 3 orders (2 completed and rated, 1 pending) and staked 10000 ENG");

  console.log("\nDemo accounts (import their keys from the `npm run node` output):");
  console.log(`  #1 Solar farm (seller): ${solarFarm.address}`);
  console.log(`  #2 Wind co-op (seller): ${windCoop.address}`);
  console.log(`  #3 EV driver (buyer):   ${driver1.address}`);
  console.log(`  #4 EV driver (buyer):   ${driver2.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
