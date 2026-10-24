const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EnergyToken Contract", function () {
  const INITIAL_SUPPLY = ethers.utils.parseEther("1000000");
  let EnergyToken, energyToken, owner, addr1, addr2;

  beforeEach(async function () {
    EnergyToken = await ethers.getContractFactory("EnergyToken");
    [owner, addr1, addr2] = await ethers.getSigners();
    energyToken = await EnergyToken.deploy(INITIAL_SUPPLY, "Solar");
    await energyToken.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner and roles", async function () {
      expect(await energyToken.hasRole(await energyToken.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
      expect(await energyToken.hasRole(await energyToken.ADMIN_ROLE(), owner.address)).to.be.true;
      expect(await energyToken.hasRole(await energyToken.ENERGY_SUPPLIER_ROLE(), owner.address)).to.be.true;
    });

    it("Should mint the initial supply", async function () {
      expect(await energyToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
      expect(await energyToken.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("Should set token metadata and energy source", async function () {
      expect(await energyToken.name()).to.equal("EnergyToken");
      expect(await energyToken.symbol()).to.equal("ENG");
      expect(await energyToken.energySource()).to.equal("Solar");
    });

    it("Should reject a non eco-friendly initial energy source", async function () {
      await expect(EnergyToken.deploy(INITIAL_SUPPLY, "Coal")).to.be.revertedWith(
        "Initial energy source must be eco-friendly"
      );
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts with a fee deduction", async function () {
      const transferAmount = ethers.utils.parseEther("100");
      const fee = transferAmount.mul(2).div(100); // 2% fee
      const amountAfterFee = transferAmount.sub(fee);
      const incentive = await energyToken.ecoIncentive();

      await expect(energyToken.transfer(addr1.address, transferAmount))
        .to.emit(energyToken, "TransferWithFee")
        .withArgs(owner.address, addr1.address, amountAfterFee, fee)
        .and.to.emit(energyToken, "EcoIncentiveAwarded")
        .withArgs(owner.address, incentive);

      expect(await energyToken.balanceOf(addr1.address)).to.equal(amountAfterFee);
      expect(await energyToken.balanceOf(owner.address)).to.equal(
        INITIAL_SUPPLY.sub(transferAmount).add(incentive)
      );
      // Fee is burned, incentive is minted
      expect(await energyToken.totalSupply()).to.equal(INITIAL_SUPPLY.sub(fee).add(incentive));
    });

    it("Should revert transfer if sender balance is insufficient", async function () {
      await expect(
        energyToken.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("100"))
      ).to.be.revertedWithCustomError(energyToken, "ERC20InsufficientBalance");
    });

    it("Should charge the fee on transferFrom as well", async function () {
      const amount = ethers.utils.parseEther("50");
      const fee = amount.mul(2).div(100);
      await energyToken.approve(addr1.address, amount);

      await energyToken.connect(addr1).transferFrom(owner.address, addr2.address, amount);

      expect(await energyToken.balanceOf(addr2.address)).to.equal(amount.sub(fee));
      expect(await energyToken.allowance(owner.address, addr1.address)).to.equal(0);
    });

    it("Should revert transferFrom without enough allowance", async function () {
      await expect(
        energyToken.connect(addr1).transferFrom(owner.address, addr2.address, 1)
      ).to.be.revertedWithCustomError(energyToken, "ERC20InsufficientAllowance");
    });

    it("Should use the updated transfer fee", async function () {
      await energyToken.setTransferFeePercentage(5);
      const amount = ethers.utils.parseEther("100");
      await energyToken.transfer(addr1.address, amount);
      expect(await energyToken.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("95"));
    });
  });

  describe("Energy sources", function () {
    it("Should update energy source if admin", async function () {
      await expect(energyToken.setEnergySource("Wind"))
        .to.emit(energyToken, "EnergySourceUpdated")
        .withArgs("Wind");
      expect(await energyToken.energySource()).to.equal("Wind");
    });

    it("Should not update energy source if not admin", async function () {
      await expect(energyToken.connect(addr1).setEnergySource("Wind"))
        .to.be.revertedWithCustomError(energyToken, "AccessControlUnauthorizedAccount")
        .withArgs(addr1.address, await energyToken.ADMIN_ROLE());
    });

    it("Should reject a non eco-friendly energy source", async function () {
      await expect(energyToken.setEnergySource("Coal")).to.be.revertedWith(
        "Provided energy source is not eco-friendly"
      );
    });

    it("Should report eco-friendly sources", async function () {
      expect(await energyToken.isEcoFriendly("Solar")).to.be.true;
      expect(await energyToken.isEcoFriendly("Wind")).to.be.true;
      expect(await energyToken.isEcoFriendly("Hydro")).to.be.true;
      expect(await energyToken.isEcoFriendly("Coal")).to.be.false;
    });

    it("Should let any user set their own eco-friendly energy source", async function () {
      await expect(energyToken.connect(addr1).setUserEnergySource("Hydro"))
        .to.emit(energyToken, "UserEnergySourceUpdated")
        .withArgs(addr1.address, "Hydro");
      expect(await energyToken.getUserEnergySource(addr1.address)).to.equal("Hydro");
      await expect(energyToken.connect(addr1).setUserEnergySource("Gas")).to.be.revertedWith(
        "Provided energy source is not eco-friendly"
      );
    });
  });

  describe("Burning", function () {
    it("Should correctly burn tokens", async function () {
      const burnAmount = ethers.utils.parseEther("500");
      await expect(energyToken.burn(burnAmount))
        .to.emit(energyToken, "TokensBurned")
        .withArgs(owner.address, burnAmount);
      expect(await energyToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY.sub(burnAmount));
    });

    it("Should not allow non-admins to burn", async function () {
      await expect(energyToken.connect(addr1).burn(1)).to.be.revertedWithCustomError(
        energyToken,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Staking", function () {
    it("Should stake tokens", async function () {
      const stakeAmount = ethers.utils.parseEther("200");
      await expect(energyToken.stakeTokens(stakeAmount))
        .to.emit(energyToken, "TokensStaked")
        .withArgs(owner.address, stakeAmount);

      expect(await energyToken.stakedBalances(owner.address)).to.equal(stakeAmount);
      expect(await energyToken.getStakedBalance(owner.address)).to.equal(stakeAmount);
      expect(await energyToken.balanceOf(energyToken.address)).to.equal(stakeAmount);
    });

    it("Should unstake tokens", async function () {
      const stakeAmount = ethers.utils.parseEther("200");
      await energyToken.stakeTokens(stakeAmount);
      await expect(energyToken.unstakeTokens())
        .to.emit(energyToken, "TokensUnstaked")
        .withArgs(owner.address, stakeAmount);

      expect(await energyToken.stakedBalances(owner.address)).to.equal(0);
      expect(await energyToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });

    it("Should reject stakes below the minimum", async function () {
      await expect(energyToken.stakeTokens(ethers.utils.parseEther("9"))).to.be.revertedWith(
        "Amount below minimum staking threshold"
      );
    });

    it("Should reject stakes larger than the balance", async function () {
      await expect(
        energyToken.connect(addr1).stakeTokens(ethers.utils.parseEther("10"))
      ).to.be.revertedWith("Insufficient balance to stake");
    });

    it("Should reject unstaking with nothing staked", async function () {
      await expect(energyToken.connect(addr1).unstakeTokens()).to.be.revertedWith(
        "No staked balance to withdraw"
      );
    });
  });

  describe("Pausing", function () {
    it("Should block transfers and staking while paused", async function () {
      await energyToken.pause();
      await expect(energyToken.transfer(addr1.address, 1)).to.be.revertedWithCustomError(
        energyToken,
        "EnforcedPause"
      );
      await expect(
        energyToken.stakeTokens(ethers.utils.parseEther("10"))
      ).to.be.revertedWithCustomError(energyToken, "EnforcedPause");

      await energyToken.unpause();
      await energyToken.transfer(addr1.address, 100);
      expect(await energyToken.balanceOf(addr1.address)).to.equal(98);
    });

    it("Should not allow non-admins to pause", async function () {
      await expect(energyToken.connect(addr1).pause()).to.be.revertedWithCustomError(
        energyToken,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Admin settings", function () {
    it("Should cap the transfer fee at 10%", async function () {
      await expect(energyToken.setTransferFeePercentage(11)).to.be.revertedWith(
        "Transfer fee cannot exceed 10%"
      );
      await expect(energyToken.setTransferFeePercentage(10))
        .to.emit(energyToken, "TransferFeeUpdated")
        .withArgs(10);
    });

    it("Should cap the eco incentive", async function () {
      await expect(energyToken.setEcoIncentive(11)).to.be.revertedWith(
        "Eco incentive cannot exceed 10 tokens"
      );
      await expect(energyToken.setEcoIncentive(0))
        .to.emit(energyToken, "EcoIncentiveUpdated")
        .withArgs(0);
    });
  });
});
