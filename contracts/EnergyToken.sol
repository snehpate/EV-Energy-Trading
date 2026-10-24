// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract EnergyToken is ERC20, AccessControl, Pausable {
    string public energySource;
    uint256 public transferFeePercentage = 2; // 2% transfer fee
    uint256 public ecoIncentive = 1; // Reward (smallest token unit) per transfer while the source is eco-friendly
    uint256 public constant MIN_STAKE = 10 * (10**18); // Minimum staking threshold

    mapping(address => uint256) public stakedBalances;
    mapping(address => string) public userEnergySources;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ENERGY_SUPPLIER_ROLE = keccak256("ENERGY_SUPPLIER_ROLE");

    bytes32 private constant SOLAR_HASH = keccak256("Solar");
    bytes32 private constant WIND_HASH = keccak256("Wind");
    bytes32 private constant HYDRO_HASH = keccak256("Hydro");

    event TokensBurned(address indexed account, uint256 amount);
    event TokensStaked(address indexed account, uint256 amount);
    event TokensUnstaked(address indexed account, uint256 amount);
    event EnergySourceUpdated(string newSource);
    event TransferWithFee(address indexed sender, address indexed recipient, uint256 amountAfterFee, uint256 fee);
    event EcoIncentiveAwarded(address indexed account, uint256 amount);
    event UserEnergySourceUpdated(address indexed account, string source);
    event TransferFeeUpdated(uint256 newFee);
    event EcoIncentiveUpdated(uint256 newIncentive);

    constructor(uint256 initialSupply, string memory _energySource) ERC20("EnergyToken", "ENG") {
        require(isEcoFriendly(_energySource), "Initial energy source must be eco-friendly");
        _mint(msg.sender, initialSupply);
        energySource = _energySource;

        // Assign roles using _grantRole
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ENERGY_SUPPLIER_ROLE, msg.sender);
    }

    // Modifier to check eco-friendly sources
    modifier ecoFriendly(string memory _energySource) {
        require(
            isEcoFriendly(_energySource),
            "Provided energy source is not eco-friendly"
        );
        _;
    }

    // Function to update the energy source
    function setEnergySource(string memory _energySource) public onlyRole(ADMIN_ROLE) ecoFriendly(_energySource) {
        energySource = _energySource;
        emit EnergySourceUpdated(_energySource);
    }

    // Override transfer to include fee and eco-incentive
    function transfer(address recipient, uint256 amount) public override whenNotPaused returns (bool) {
        _transferWithFee(_msgSender(), recipient, amount);
        return true;
    }

    // Override transferFrom so allowance-based transfers pay the same fee
    function transferFrom(address sender, address recipient, uint256 amount) public override whenNotPaused returns (bool) {
        _spendAllowance(sender, _msgSender(), amount);
        _transferWithFee(sender, recipient, amount);
        return true;
    }

    // Moves `amount` out of `sender`: the recipient gets it minus the fee, and the fee is burned
    function _transferWithFee(address sender, address recipient, uint256 amount) internal {
        uint256 fee = (amount * transferFeePercentage) / 100;
        uint256 amountAfterFee = amount - fee;

        _transfer(sender, recipient, amountAfterFee);
        _burn(sender, fee);
        emit TransferWithFee(sender, recipient, amountAfterFee, fee);

        // Apply eco-incentive (in the token's smallest unit)
        if (isEcoFriendly(energySource) && ecoIncentive > 0) {
            _mint(sender, ecoIncentive);
            emit EcoIncentiveAwarded(sender, ecoIncentive);
        }
    }

    // Helper function to verify eco-friendly sources
    function isEcoFriendly(string memory _source) public pure returns (bool) {
        bytes32 sourceHash = keccak256(abi.encodePacked(_source));
        return (sourceHash == SOLAR_HASH || sourceHash == WIND_HASH || sourceHash == HYDRO_HASH);
    }

    // Burn tokens (only ADMIN_ROLE)
    function burn(uint256 amount) public onlyRole(ADMIN_ROLE) {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    // Stake tokens
    function stakeTokens(uint256 amount) public whenNotPaused {
        require(amount >= MIN_STAKE, "Amount below minimum staking threshold");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance to stake");
        _transfer(msg.sender, address(this), amount);
        stakedBalances[msg.sender] += amount;
        emit TokensStaked(msg.sender, amount);
    }

    // Unstake tokens
    function unstakeTokens() public whenNotPaused {
        uint256 stakedAmount = stakedBalances[msg.sender];
        require(stakedAmount > 0, "No staked balance to withdraw");
        stakedBalances[msg.sender] = 0;
        _transfer(address(this), msg.sender, stakedAmount);
        emit TokensUnstaked(msg.sender, stakedAmount);
    }

    // Pause contract (only ADMIN_ROLE)
    function pause() public onlyRole(ADMIN_ROLE) {
        _pause();
    }

    // Unpause contract (only ADMIN_ROLE)
    function unpause() public onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // Set user-specific energy source
    function setUserEnergySource(string memory _energySource) public ecoFriendly(_energySource) {
        userEnergySources[msg.sender] = _energySource;
        emit UserEnergySourceUpdated(msg.sender, _energySource);
    }

    // Get the amount of tokens staked by a user
    function getStakedBalance(address user) public view returns (uint256) {
        return stakedBalances[user];
    }

    // Get user-specific energy source
    function getUserEnergySource(address user) public view returns (string memory) {
        return userEnergySources[user];
    }

    // Update transfer fee percentage
    function setTransferFeePercentage(uint256 newFee) public onlyRole(ADMIN_ROLE) {
        require(newFee <= 10, "Transfer fee cannot exceed 10%");
        transferFeePercentage = newFee;
        emit TransferFeeUpdated(newFee);
    }

    // Update eco incentive
    function setEcoIncentive(uint256 newIncentive) public onlyRole(ADMIN_ROLE) {
        require(newIncentive <= 10, "Eco incentive cannot exceed 10 tokens");
        ecoIncentive = newIncentive;
        emit EcoIncentiveUpdated(newIncentive);
    }
}
