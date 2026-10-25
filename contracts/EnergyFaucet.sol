// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Testnet faucet: anyone can claim a fixed amount of ENG once per cooldown period,
// so public testers can try the marketplace without asking the admin for tokens.
contract EnergyFaucet is Ownable {
    IERC20 public immutable token;
    uint256 public dripAmount = 100 * 10**18;
    uint256 public cooldown = 1 days;

    mapping(address => uint256) public lastClaim;

    event Claimed(address indexed account, uint256 amount);
    event DripAmountUpdated(uint256 newAmount);
    event CooldownUpdated(uint256 newCooldown);

    constructor(address _token) Ownable(msg.sender) {
        require(_token != address(0), "Zero address");
        token = IERC20(_token);
    }

    // When `account` may claim next (0 = now)
    function nextClaimTime(address account) public view returns (uint256) {
        uint256 last = lastClaim[account];
        return last == 0 ? 0 : last + cooldown;
    }

    function claim() external {
        require(block.timestamp >= nextClaimTime(msg.sender), "Already claimed, try again later");
        require(token.balanceOf(address(this)) >= dripAmount, "Faucet is empty");
        lastClaim[msg.sender] = block.timestamp;
        require(token.transfer(msg.sender, dripAmount), "Transfer failed");
        emit Claimed(msg.sender, dripAmount);
    }

    function setDripAmount(uint256 newAmount) external onlyOwner {
        require(newAmount > 0, "Amount must be positive");
        dripAmount = newAmount;
        emit DripAmountUpdated(newAmount);
    }

    function setCooldown(uint256 newCooldown) external onlyOwner {
        require(newCooldown <= 30 days, "Cooldown too long");
        cooldown = newCooldown;
        emit CooldownUpdated(newCooldown);
    }

    // Return unused tokens to the owner
    function withdraw(uint256 amount) external onlyOwner {
        require(token.transfer(owner(), amount), "Transfer failed");
    }
}
