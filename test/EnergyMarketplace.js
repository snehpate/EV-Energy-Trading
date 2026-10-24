const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("EnergyMarketplace Contract", function () {
  const eng = (n) => ethers.utils.parseEther(String(n));
  const PRICE = eng("0.5"); // 0.5 ENG per kWh
  const DAY = 24 * 60 * 60;

  let token, market, owner, seller, buyer, treasury, other, buyerStart;

  beforeEach(async function () {
    [owner, seller, buyer, treasury, other] = await ethers.getSigners();

    const EnergyToken = await ethers.getContractFactory("EnergyToken");
    token = await EnergyToken.deploy(eng("1000000"), "Solar");
    await token.deployed();

    const EnergyMarketplace = await ethers.getContractFactory("EnergyMarketplace");
    market = await EnergyMarketplace.deploy(token.address, treasury.address);
    await market.deployed();
    await token.setFeeExempt(market.address, true);

    await token.transfer(buyer.address, eng("1000"));
    buyerStart = await token.balanceOf(buyer.address); // 1000 ENG minus the 2% transfer fee
    await token.connect(buyer).approve(market.address, ethers.constants.MaxUint256);
  });

  const createListing = (kwh = 100, price = PRICE, source = "Solar") =>
    market.connect(seller).createListing(kwh, price, source, "Station A, Berlin");

  describe("Listings", function () {
    it("Should create a listing", async function () {
      await expect(createListing())
        .to.emit(market, "ListingCreated")
        .withArgs(0, seller.address, 100, PRICE, "Solar", "Station A, Berlin");

      const listing = await market.getListing(0);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.remainingKwh).to.equal(100);
      expect(listing.active).to.be.true;
      expect(await market.listingCount()).to.equal(1);
      expect((await market.getSellerListings(seller.address)).length).to.equal(1);
    });

    it("Should reject invalid listings", async function () {
      await expect(createListing(0)).to.be.revertedWith("Energy amount must be positive");
      await expect(createListing(10, 0)).to.be.revertedWith("Price must be positive");
      await expect(createListing(10, PRICE, "Coal")).to.be.revertedWith("Energy source is not eco-friendly");
    });

    it("Should let the seller update the price and cancel", async function () {
      await createListing();
      await expect(market.connect(other).updateListingPrice(0, eng(1))).to.be.revertedWith("Not the seller");
      await market.connect(seller).updateListingPrice(0, eng(1));
      expect((await market.getListing(0)).pricePerKwh).to.equal(eng(1));

      await expect(market.connect(other).cancelListing(0)).to.be.revertedWith("Not the seller");
      await expect(market.connect(seller).cancelListing(0)).to.emit(market, "ListingCancelled").withArgs(0);
      expect((await market.getListing(0)).active).to.be.false;
      await expect(market.connect(buyer).buyEnergy(0, 1, PRICE)).to.be.revertedWith("Listing is not active");
    });

    it("Should page through listings", async function () {
      await createListing(10);
      await createListing(20);
      await createListing(30);
      const page = await market.getListings(1, 5);
      expect(page.map((l) => l.totalKwh.toNumber())).to.deep.equal([20, 30]);
      expect((await market.getListings(5, 5)).length).to.equal(0);
    });
  });

  describe("Buying", function () {
    beforeEach(async function () {
      await createListing();
    });

    it("Should escrow the payment and create a pending order", async function () {
      const total = PRICE.mul(40);
      await expect(market.connect(buyer).buyEnergy(0, 40, PRICE))
        .to.emit(market, "OrderPlaced")
        .withArgs(0, 0, buyer.address, seller.address, 40, total);

      expect(await token.balanceOf(market.address)).to.equal(total);
      expect(await token.balanceOf(buyer.address)).to.equal(buyerStart.sub(total));
      expect((await market.getListing(0)).remainingKwh).to.equal(60);

      const order = await market.getOrder(0);
      expect(order.status).to.equal(0); // Pending
      expect((await market.getBuyerOrders(buyer.address)).length).to.equal(1);
      expect((await market.getSellerOrders(seller.address)).length).to.equal(1);
    });

    it("Should deactivate a sold-out listing", async function () {
      await market.connect(buyer).buyEnergy(0, 100, PRICE);
      expect((await market.getListing(0)).active).to.be.false;
    });

    it("Should reject invalid purchases", async function () {
      await expect(market.connect(seller).buyEnergy(0, 1, PRICE)).to.be.revertedWith("Cannot buy your own energy");
      await expect(market.connect(buyer).buyEnergy(0, 0, PRICE)).to.be.revertedWith("Invalid energy amount");
      await expect(market.connect(buyer).buyEnergy(0, 101, PRICE)).to.be.revertedWith("Invalid energy amount");
      await expect(market.connect(buyer).buyEnergy(5, 1, PRICE)).to.be.revertedWith("Listing does not exist");
    });

    it("Should protect buyers from price increases", async function () {
      await market.connect(seller).updateListingPrice(0, eng(2));
      await expect(market.connect(buyer).buyEnergy(0, 10, PRICE)).to.be.revertedWith("Price changed");
    });

    it("Should require enough allowance", async function () {
      await token.transfer(other.address, eng("100"));
      await expect(market.connect(other).buyEnergy(0, 10, PRICE)).to.be.revertedWithCustomError(
        token,
        "ERC20InsufficientAllowance"
      );
    });
  });

  describe("Settlement", function () {
    const KWH = 40;
    const total = PRICE.mul(KWH);
    const fee = total.mul(100).div(10000); // 1%

    beforeEach(async function () {
      await createListing();
      await market.connect(buyer).buyEnergy(0, KWH, PRICE);
    });

    it("Should release escrow to the seller and fee to the treasury on confirmation", async function () {
      await expect(market.connect(other).confirmDelivery(0)).to.be.revertedWith("Not the buyer");
      await expect(market.connect(buyer).confirmDelivery(0))
        .to.emit(market, "OrderCompleted")
        .withArgs(0, buyer.address, seller.address, total.sub(fee), fee);

      expect(await token.balanceOf(seller.address)).to.equal(total.sub(fee));
      expect(await token.balanceOf(treasury.address)).to.equal(fee);
      expect(await token.balanceOf(market.address)).to.equal(0);
      expect((await market.getOrder(0)).status).to.equal(1); // Completed

      expect(await market.totalKwhTraded()).to.equal(KWH);
      expect(await market.totalVolume()).to.equal(total);
      expect(await market.totalFeesCollected()).to.equal(fee);
      expect(await market.kwhTradedBySource("Solar")).to.equal(KWH);
      const sellerStats = await market.userStats(seller.address);
      expect(sellerStats.kwhSold).to.equal(KWH);
      expect(sellerStats.earned).to.equal(total.sub(fee));
      const buyerStats = await market.userStats(buyer.address);
      expect(buyerStats.kwhBought).to.equal(KWH);
      expect(buyerStats.spent).to.equal(total);

      await expect(market.connect(buyer).confirmDelivery(0)).to.be.revertedWith("Order is not pending");
    });

    it("Should let the seller claim only after the delivery window", async function () {
      await expect(market.connect(seller).claimPayment(0)).to.be.revertedWith("Delivery window still open");
      await expect(market.connect(buyer).claimPayment(0)).to.be.revertedWith("Not the seller");
      await time.increase(3 * DAY);
      await expect(market.connect(seller).claimPayment(0)).to.emit(market, "OrderCompleted");
      expect(await token.balanceOf(seller.address)).to.equal(total.sub(fee));
    });

    it("Should refund the buyer and restock the listing", async function () {
      await expect(market.connect(buyer).refundOrder(0)).to.be.revertedWith("Not the seller");
      await expect(market.connect(seller).refundOrder(0))
        .to.emit(market, "OrderRefunded")
        .withArgs(0, buyer.address, total);

      expect(await token.balanceOf(buyer.address)).to.equal(buyerStart);
      expect((await market.getListing(0)).remainingKwh).to.equal(100);
      expect((await market.getOrder(0)).status).to.equal(2); // Refunded
      await expect(market.connect(buyer).confirmDelivery(0)).to.be.revertedWith("Order is not pending");
    });

    it("Should let the admin refund disputed orders", async function () {
      await expect(market.connect(owner).refundOrder(0)).to.emit(market, "OrderRefunded");
    });
  });

  describe("Ratings", function () {
    beforeEach(async function () {
      await createListing();
      await market.connect(buyer).buyEnergy(0, 10, PRICE);
      await market.connect(buyer).buyEnergy(0, 10, PRICE);
    });

    it("Should rate sellers after completed orders", async function () {
      await expect(market.connect(buyer).rateSeller(0, 5)).to.be.revertedWith("Order not completed");
      await market.connect(buyer).confirmDelivery(0);
      await market.connect(buyer).confirmDelivery(1);

      await expect(market.connect(other).rateSeller(0, 5)).to.be.revertedWith("Not the buyer");
      await expect(market.connect(buyer).rateSeller(0, 6)).to.be.revertedWith("Rating must be 1-5");
      await expect(market.connect(buyer).rateSeller(0, 5))
        .to.emit(market, "SellerRated")
        .withArgs(0, seller.address, 5);
      await expect(market.connect(buyer).rateSeller(0, 4)).to.be.revertedWith("Already rated");
      await market.connect(buyer).rateSeller(1, 4);

      const [average, count] = await market.getSellerRating(seller.address);
      expect(average).to.equal(450);
      expect(count).to.equal(2);
    });
  });

  describe("Admin", function () {
    it("Should update fee, treasury and delivery window within limits", async function () {
      await expect(market.setPlatformFee(501)).to.be.revertedWith("Fee cannot exceed 5%");
      await expect(market.setPlatformFee(250)).to.emit(market, "PlatformFeeUpdated").withArgs(250);
      await expect(market.setTreasury(ethers.constants.AddressZero)).to.be.revertedWith("Zero address");
      await market.setTreasury(other.address);
      expect(await market.treasury()).to.equal(other.address);
      await expect(market.setDeliveryWindow(60)).to.be.revertedWith("Window must be 1 hour - 30 days");
      await market.setDeliveryWindow(DAY);
      expect(await market.deliveryWindow()).to.equal(DAY);
    });

    it("Should block admin functions for other accounts", async function () {
      await expect(market.connect(other).setPlatformFee(10)).to.be.revertedWithCustomError(
        market,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should block trading while paused", async function () {
      await createListing();
      await market.pause();
      await expect(createListing()).to.be.revertedWithCustomError(market, "EnforcedPause");
      await expect(market.connect(buyer).buyEnergy(0, 1, PRICE)).to.be.revertedWithCustomError(
        market,
        "EnforcedPause"
      );
      await market.unpause();
      await market.connect(buyer).buyEnergy(0, 1, PRICE);
    });
  });
});
