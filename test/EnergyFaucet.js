const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("EnergyFaucet Contract", function () {
  const eng = (n) => ethers.utils.parseEther(String(n));
  let token, faucet, owner, user, other;

  beforeEach(async function () {
    [owner, user, other] = await ethers.getSigners();
    const EnergyToken = await ethers.getContractFactory("EnergyToken");
    token = await EnergyToken.deploy(eng("1000000"), "Solar");
    await token.deployed();

    const EnergyFaucet = await ethers.getContractFactory("EnergyFaucet");
    faucet = await EnergyFaucet.deploy(token.address);
    await faucet.deployed();
    await token.setFeeExempt(faucet.address, true);
    await token.transfer(faucet.address, eng(250));
  });

  it("Should give the drip amount once per cooldown", async function () {
    expect(await faucet.nextClaimTime(user.address)).to.equal(0);
    await expect(faucet.connect(user).claim())
      .to.emit(faucet, "Claimed")
      .withArgs(user.address, eng(100));
    expect(await token.balanceOf(user.address)).to.equal(eng(100));

    await expect(faucet.connect(user).claim()).to.be.revertedWith("Already claimed, try again later");
    await time.increase(24 * 60 * 60);
    await faucet.connect(user).claim();
    expect(await token.balanceOf(user.address)).to.equal(eng(200));
  });

  it("Should stop when empty", async function () {
    await faucet.connect(user).claim();
    await faucet.connect(other).claim();
    await expect(faucet.connect(owner).claim()).to.be.revertedWith("Faucet is empty");
  });

  it("Should let only the owner change settings and withdraw", async function () {
    await expect(faucet.connect(user).setDripAmount(1)).to.be.revertedWithCustomError(
      faucet,
      "OwnableUnauthorizedAccount"
    );
    await expect(faucet.setDripAmount(eng(10))).to.emit(faucet, "DripAmountUpdated").withArgs(eng(10));
    await expect(faucet.setCooldown(31 * 24 * 60 * 60)).to.be.revertedWith("Cooldown too long");
    await faucet.setCooldown(60);
    expect(await faucet.cooldown()).to.equal(60);

    const before = await token.balanceOf(owner.address);
    await faucet.withdraw(eng(50));
    expect(await token.balanceOf(owner.address)).to.equal(before.add(eng(50)));
  });
});
