// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IEnergyToken is IERC20 {
    function isEcoFriendly(string memory source) external pure returns (bool);
}

// Peer-to-peer marketplace where producers sell green energy (kWh) to EV drivers for ENG.
// Payments are held in escrow until the buyer confirms the charge was delivered.
contract EnergyMarketplace is AccessControl, Pausable, ReentrancyGuard {
    enum OrderStatus { Pending, Completed, Refunded }

    struct Listing {
        uint256 id;
        address seller;
        uint256 totalKwh;
        uint256 remainingKwh;
        uint256 pricePerKwh; // in ENG (18 decimals)
        string energySource;
        string location;
        bool active;
        uint256 createdAt;
    }

    struct Order {
        uint256 id;
        uint256 listingId;
        address buyer;
        address seller;
        uint256 kwh;
        uint256 totalPrice;
        uint256 createdAt;
        OrderStatus status;
        uint8 rating; // 0 = not rated, otherwise 1-5
    }

    struct UserStats {
        uint256 kwhSold;
        uint256 kwhBought;
        uint256 earned;
        uint256 spent;
        uint256 ratingSum;
        uint256 ratingCount;
    }

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public constant MAX_PLATFORM_FEE_BPS = 500; // 5%

    IEnergyToken public immutable token;
    address public treasury;
    uint256 public platformFeeBps = 100; // 1%
    uint256 public deliveryWindow = 3 days; // after this the seller may claim an unconfirmed order

    Listing[] private listings;
    Order[] private orders;

    mapping(address => UserStats) public userStats;
    mapping(address => uint256[]) private sellerListingIds;
    mapping(address => uint256[]) private buyerOrderIds;
    mapping(address => uint256[]) private sellerOrderIds;
    mapping(string => uint256) public kwhTradedBySource;

    uint256 public totalKwhTraded;
    uint256 public totalVolume;
    uint256 public totalFeesCollected;

    event ListingCreated(uint256 indexed listingId, address indexed seller, uint256 kwh, uint256 pricePerKwh, string energySource, string location);
    event ListingPriceUpdated(uint256 indexed listingId, uint256 newPricePerKwh);
    event ListingCancelled(uint256 indexed listingId);
    event OrderPlaced(uint256 indexed orderId, uint256 indexed listingId, address indexed buyer, address seller, uint256 kwh, uint256 totalPrice);
    event OrderCompleted(uint256 indexed orderId, address indexed buyer, address indexed seller, uint256 sellerAmount, uint256 platformFee);
    event OrderRefunded(uint256 indexed orderId, address indexed buyer, uint256 amount);
    event SellerRated(uint256 indexed orderId, address indexed seller, uint8 rating);
    event PlatformFeeUpdated(uint256 newFeeBps);
    event TreasuryUpdated(address newTreasury);
    event DeliveryWindowUpdated(uint256 newWindow);

    constructor(address _token, address _treasury) {
        require(_token != address(0) && _treasury != address(0), "Zero address");
        token = IEnergyToken(_token);
        treasury = _treasury;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ---------------------------------------------------------------------
    // Listings
    // ---------------------------------------------------------------------

    function createListing(
        uint256 kwh,
        uint256 pricePerKwh,
        string calldata energySource,
        string calldata location
    ) external whenNotPaused returns (uint256 listingId) {
        require(kwh > 0, "Energy amount must be positive");
        require(pricePerKwh > 0, "Price must be positive");
        require(token.isEcoFriendly(energySource), "Energy source is not eco-friendly");

        listingId = listings.length;
        listings.push(Listing({
            id: listingId,
            seller: msg.sender,
            totalKwh: kwh,
            remainingKwh: kwh,
            pricePerKwh: pricePerKwh,
            energySource: energySource,
            location: location,
            active: true,
            createdAt: block.timestamp
        }));
        sellerListingIds[msg.sender].push(listingId);

        emit ListingCreated(listingId, msg.sender, kwh, pricePerKwh, energySource, location);
    }

    function updateListingPrice(uint256 listingId, uint256 newPricePerKwh) external {
        Listing storage listing = _activeListing(listingId);
        require(listing.seller == msg.sender, "Not the seller");
        require(newPricePerKwh > 0, "Price must be positive");
        listing.pricePerKwh = newPricePerKwh;
        emit ListingPriceUpdated(listingId, newPricePerKwh);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage listing = _activeListing(listingId);
        require(listing.seller == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "Not the seller");
        listing.active = false;
        emit ListingCancelled(listingId);
    }

    // ---------------------------------------------------------------------
    // Orders
    // ---------------------------------------------------------------------

    // Buy `kwh` from a listing. The buyer must first approve `kwh * pricePerKwh` ENG.
    function buyEnergy(uint256 listingId, uint256 kwh, uint256 maxPricePerKwh)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 orderId)
    {
        Listing storage listing = _activeListing(listingId);
        require(listing.seller != msg.sender, "Cannot buy your own energy");
        require(kwh > 0 && kwh <= listing.remainingKwh, "Invalid energy amount");
        // Protects the buyer from a seller raising the price before the order is mined
        require(listing.pricePerKwh <= maxPricePerKwh, "Price changed");

        uint256 totalPrice = kwh * listing.pricePerKwh;
        listing.remainingKwh -= kwh;
        if (listing.remainingKwh == 0) {
            listing.active = false;
        }

        orderId = orders.length;
        orders.push(Order({
            id: orderId,
            listingId: listingId,
            buyer: msg.sender,
            seller: listing.seller,
            kwh: kwh,
            totalPrice: totalPrice,
            createdAt: block.timestamp,
            status: OrderStatus.Pending,
            rating: 0
        }));
        buyerOrderIds[msg.sender].push(orderId);
        sellerOrderIds[listing.seller].push(orderId);

        require(token.transferFrom(msg.sender, address(this), totalPrice), "Payment failed");

        emit OrderPlaced(orderId, listingId, msg.sender, listing.seller, kwh, totalPrice);
    }

    // Buyer confirms the charge was delivered: releases escrow to the seller
    function confirmDelivery(uint256 orderId) external nonReentrant {
        Order storage order = _pendingOrder(orderId);
        require(order.buyer == msg.sender, "Not the buyer");
        _complete(order);
    }

    // Seller collects payment if the buyer did not confirm within the delivery window
    function claimPayment(uint256 orderId) external nonReentrant {
        Order storage order = _pendingOrder(orderId);
        require(order.seller == msg.sender, "Not the seller");
        require(block.timestamp >= order.createdAt + deliveryWindow, "Delivery window still open");
        _complete(order);
    }

    // Seller cannot deliver: refund the buyer in full and return the energy to the listing if still active
    function refundOrder(uint256 orderId) external nonReentrant {
        Order storage order = _pendingOrder(orderId);
        require(order.seller == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "Not the seller");
        order.status = OrderStatus.Refunded;

        Listing storage listing = listings[order.listingId];
        if (listing.active) {
            listing.remainingKwh += order.kwh;
        }

        require(token.transfer(order.buyer, order.totalPrice), "Refund failed");
        emit OrderRefunded(orderId, order.buyer, order.totalPrice);
    }

    // Buyer rates the seller (1-5 stars) once the order is completed
    function rateSeller(uint256 orderId, uint8 rating) external {
        require(orderId < orders.length, "Order does not exist");
        Order storage order = orders[orderId];
        require(order.buyer == msg.sender, "Not the buyer");
        require(order.status == OrderStatus.Completed, "Order not completed");
        require(order.rating == 0, "Already rated");
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");

        order.rating = rating;
        UserStats storage stats = userStats[order.seller];
        stats.ratingSum += rating;
        stats.ratingCount += 1;
        emit SellerRated(orderId, order.seller, rating);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function listingCount() external view returns (uint256) {
        return listings.length;
    }

    function orderCount() external view returns (uint256) {
        return orders.length;
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        require(listingId < listings.length, "Listing does not exist");
        return listings[listingId];
    }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        require(orderId < orders.length, "Order does not exist");
        return orders[orderId];
    }

    // Page through all listings (active and inactive)
    function getListings(uint256 offset, uint256 limit) external view returns (Listing[] memory page) {
        if (offset >= listings.length) return new Listing[](0);
        uint256 end = offset + limit > listings.length ? listings.length : offset + limit;
        page = new Listing[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = listings[i];
        }
    }

    function getSellerListings(address seller) external view returns (Listing[] memory result) {
        uint256[] storage ids = sellerListingIds[seller];
        result = new Listing[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = listings[ids[i]];
        }
    }

    function getBuyerOrders(address buyer) external view returns (Order[] memory) {
        return _ordersFor(buyerOrderIds[buyer]);
    }

    function getSellerOrders(address seller) external view returns (Order[] memory) {
        return _ordersFor(sellerOrderIds[seller]);
    }

    // Average rating scaled by 100 (e.g. 450 = 4.5 stars) and the number of ratings
    function getSellerRating(address seller) external view returns (uint256 average, uint256 count) {
        UserStats storage stats = userStats[seller];
        count = stats.ratingCount;
        average = count == 0 ? 0 : (stats.ratingSum * 100) / count;
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setPlatformFee(uint256 newFeeBps) external onlyRole(ADMIN_ROLE) {
        require(newFeeBps <= MAX_PLATFORM_FEE_BPS, "Fee cannot exceed 5%");
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        require(newTreasury != address(0), "Zero address");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setDeliveryWindow(uint256 newWindow) external onlyRole(ADMIN_ROLE) {
        require(newWindow >= 1 hours && newWindow <= 30 days, "Window must be 1 hour - 30 days");
        deliveryWindow = newWindow;
        emit DeliveryWindowUpdated(newWindow);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    function _activeListing(uint256 listingId) private view returns (Listing storage listing) {
        require(listingId < listings.length, "Listing does not exist");
        listing = listings[listingId];
        require(listing.active, "Listing is not active");
    }

    function _pendingOrder(uint256 orderId) private view returns (Order storage order) {
        require(orderId < orders.length, "Order does not exist");
        order = orders[orderId];
        require(order.status == OrderStatus.Pending, "Order is not pending");
    }

    function _complete(Order storage order) private {
        order.status = OrderStatus.Completed;

        uint256 fee = (order.totalPrice * platformFeeBps) / 10000;
        uint256 sellerAmount = order.totalPrice - fee;

        UserStats storage sellerStats = userStats[order.seller];
        sellerStats.kwhSold += order.kwh;
        sellerStats.earned += sellerAmount;
        UserStats storage buyerStats = userStats[order.buyer];
        buyerStats.kwhBought += order.kwh;
        buyerStats.spent += order.totalPrice;

        totalKwhTraded += order.kwh;
        totalVolume += order.totalPrice;
        totalFeesCollected += fee;
        kwhTradedBySource[listings[order.listingId].energySource] += order.kwh;

        if (fee > 0) {
            require(token.transfer(treasury, fee), "Fee transfer failed");
        }
        require(token.transfer(order.seller, sellerAmount), "Payment failed");
        emit OrderCompleted(order.id, order.buyer, order.seller, sellerAmount, fee);
    }

    function _ordersFor(uint256[] storage ids) private view returns (Order[] memory result) {
        result = new Order[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = orders[ids[i]];
        }
    }
}
