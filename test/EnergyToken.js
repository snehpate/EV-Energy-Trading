const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EnergyToken Contract", function () {
  let EnergyToken, energyToken, owner, addr1, addr2;

  beforeEach(async function () {
    EnergyToken = await ethers.getContractFactory("EnergyToken");
    [owner, addr1, addr2] = await ethers.getSigners();
    energyToken = await EnergyToken.deploy(
      ethers.utils.parseEther("1000000"), // Initial supply
      "Solar" // Initial energy source
    );
    await energyToken.deployed();
  });

  it("Should set the right owner", async function () {
    expect(
      await energyToken.hasRole(
        await energyToken.DEFAULT_ADMIN_ROLE(),
        owner.address
      )
    ).to.be.true;
  });

  it("Should mint the initial supply", async function () {
    const ownerBalance = await energyToken.balanceOf(owner.address);
    expect(ownerBalance.toString()).to.equal(
      ethers.utils.parseEther("1000000").toString()
    );
  });

  it("Should transfer tokens between accounts with a fee deduction", async function () {
    const transferAmount = ethers.utils.parseEther("100");
    const fee = transferAmount.mul(2).div(100); // 2% fee
    const amountAfterFee = transferAmount.sub(fee);

    await energyToken.transfer(addr1.address, transferAmount);

    const addr1Balance = await energyToken.balanceOf(addr1.address);
    expect(parseFloat(ethers.utils.formatEther(addr1Balance))).to.equal(
      parseFloat(ethers.utils.formatEther(amountAfterFee))
    );

    const ownerBalance = await energyToken.balanceOf(owner.address);
    const expectedOwnerBalance = ethers.utils
      .parseEther("1000000")
      .sub(transferAmount);
    expect(parseFloat(ethers.utils.formatEther(ownerBalance))).to.equal(
      parseFloat(ethers.utils.formatEther(expectedOwnerBalance))
    );
  });

  it("Should revert transfer if sender balance is insufficient", async function () {
    await expect(
      energyToken
        .connect(addr1)
        .transfer(addr2.address, ethers.utils.parseEther("100"))
    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });

  it("Should update energy source if admin", async function () {
    await energyToken.setEnergySource("Wind");
    expect(await energyToken.energySource()).to.equal("Wind");
  });

  it("Should not update energy source if not admin", async function () {
    await expect(
      energyToken.connect(addr1).setEnergySource("Wind")
    ).to.be.revertedWith(
      "AccessControl: account is missing role" // Ensure this matches your contract's error message
    );
  });

  it("Should correctly burn tokens", async function () {
    const burnAmount = ethers.utils.parseEther("500");
    await energyToken.burn(burnAmount);

    const ownerBalance = await energyToken.balanceOf(owner.address);
    const expectedOwnerBalance = ethers.utils
      .parseEther("1000000")
      .sub(burnAmount);
    expect(parseFloat(ethers.utils.formatEther(ownerBalance))).to.equal(
      parseFloat(ethers.utils.formatEther(expectedOwnerBalance))
    );
  });

  it("Should stake tokens", async function () {
    const stakeAmount = ethers.utils.parseEther("200");
    await energyToken.stakeTokens(stakeAmount);

    const stakedBalance = await energyToken.stakedBalances(owner.address);
    expect(parseFloat(ethers.utils.formatEther(stakedBalance))).to.equal(
      parseFloat(ethers.utils.formatEther(stakeAmount))
    );
  });

  it("Should unstake tokens", async function () {
    const stakeAmount = ethers.utils.parseEther("200");
    await energyToken.stakeTokens(stakeAmount);
    await energyToken.unstakeTokens();

    const stakedBalance = await energyToken.stakedBalances(owner.address);
    expect(parseFloat(ethers.utils.formatEther(stakedBalance))).to.equal(0);

    const ownerBalance = await energyToken.balanceOf(owner.address);
    expect(parseFloat(ethers.utils.formatEther(ownerBalance))).to.equal(
      parseFloat(ethers.utils.formatEther(ethers.utils.parseEther("1000000")))
    );
  });
});