# EV Marketplace - Blockchain Project

## Introduction
The EV Marketplace project is a blockchain-based platform designed for energy trading. It leverages Ethereum smart contracts to facilitate secure and transparent transactions for staking, burning, and transferring energy tokens. The project also includes a React-based front-end to provide a user-friendly interface.

## Features
- **EnergyToken (ENG)** – an ERC-20 token built on OpenZeppelin v5 with role-based access control and pausing.
- **Transfers with fees** – every `transfer` / `transferFrom` burns a configurable fee (default 2%, max 10%).
- **Eco incentive** – senders earn a small reward while the network energy source is eco-friendly (Solar, Wind or Hydro).
- **Staking** – stake at least 10 ENG and unstake at any time.
- **Energy source tracking** – a network-wide source (admin only) plus a per-user source.
- **Admin controls** – burn tokens, pause/unpause, set the transfer fee and eco incentive.
- **React dashboard** – MetaMask integration, live balances, transaction status and readable error messages.

---

## Project Structure
```
contracts/EnergyToken.sol   Smart contract
scripts/deploy.js           Deploys the contract and writes src/utils/deployment.json (address + ABI)
test/EnergyToken.js         Contract test suite (Hardhat + Chai)
hardhat.config.js           Hardhat configuration (localhost + Sepolia)
src/                        React front-end
  utils/web3.js             Wallet / contract helpers
  utils/WalletContext.js    Shared wallet state (account, balances, roles)
  Components/               Pages: Home, Eco Status, Stake, Burn, Transfer, Energy Sources, Admin
```

---

## Prerequisites
1. **Node.js** 18 or newer – [nodejs.org](https://nodejs.org/).
2. **MetaMask** browser extension.

---

## Installation
```bash
npm install
```

---

## Usage (local blockchain)

### Step 1: Compile and test the contract
```bash
npm run compile
npm test
```

### Step 2: Start a local Hardhat node
```bash
npm run node
```
Leave it running. It prints 20 funded test accounts with their private keys.

### Step 3: Deploy the contract
In a second terminal:
```bash
npm run deploy:local
```
This deploys `EnergyToken` (1,000,000 ENG, energy source `Solar`) and writes the address and ABI to `src/utils/deployment.json` for the front-end.

### Step 4: Configure MetaMask
- Add a network: RPC URL `http://127.0.0.1:8545`, chain ID `31337`, currency `ETH`.
- Import **Account #0** from the `npm run node` output – it is the deployer and holds all tokens and admin roles.
- Optionally add the token using the contract address from `deployment.json` (symbol `ENG`, 18 decimals).

### Step 5: Start the front-end
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) and click **Connect Wallet**.

> Restarting `npm run node` wipes the chain: redeploy and, in MetaMask, use *Settings → Advanced → Clear activity tab data* to reset the account nonce.

---

## Deploying to Sepolia
1. Copy `.env.example` to `.env` and fill in:
   ```env
   PRIVATE_KEY=<your-private-key>
   INFURA_API_KEY=<your-infura-api-key>
   ```
   Optional: `INITIAL_SUPPLY` (whole tokens) and `ENERGY_SOURCE` (`Solar`, `Wind` or `Hydro`).
2. Deploy:
   ```bash
   npm run deploy:sepolia
   ```
3. Rebuild/restart the front-end and switch MetaMask to Sepolia.

---

## Contract Overview
| Function | Access | Description |
| --- | --- | --- |
| `transfer`, `transferFrom` | anyone (when not paused) | Transfer with a burned fee and eco incentive |
| `stakeTokens(amount)` / `unstakeTokens()` | anyone (when not paused) | Stake ≥ 10 ENG / withdraw the full stake |
| `setUserEnergySource(source)` | anyone | Set your own eco-friendly energy source |
| `setEnergySource(source)` | `ADMIN_ROLE` | Set the network energy source |
| `burn(amount)` | `ADMIN_ROLE` | Burn tokens from the caller |
| `pause()` / `unpause()` | `ADMIN_ROLE` | Pause transfers and staking |
| `setTransferFeePercentage(fee)` | `ADMIN_ROLE` | Fee in percent, max 10 |
| `setEcoIncentive(amount)` | `ADMIN_ROLE` | Incentive in the token's smallest unit (wei), max 10 |
| `isEcoFriendly(source)` | view | `true` for Solar, Wind, Hydro |

---

## Scripts
| Command | Description |
| --- | --- |
| `npm run compile` | Compile contracts |
| `npm test` | Run the contract tests |
| `npm run node` | Start a local Hardhat node |
| `npm run deploy:local` | Deploy to the local node |
| `npm run deploy:sepolia` | Deploy to Sepolia (requires `.env`) |
| `npm start` | Start the React dev server |
| `npm run build` | Production build of the front-end |

---

## Troubleshooting
1. **"Contract not deployed"** – run `npm run deploy:local` (with the node running), then restart `npm start`.
2. **"Wrong network"** – switch MetaMask to the chain the contract was deployed to (31337 for local).
3. **Transactions fail after restarting the node** – redeploy and reset MetaMask activity data (see above).
4. **Admin pages are disabled** – only the deployer account has `ADMIN_ROLE`.

---

## Technologies Used
- **Blockchain**: Ethereum, Solidity 0.8.24, OpenZeppelin Contracts v5
- **Front-End**: React 18, React Router 6, Ethers.js 5, CSS
- **Tooling**: Hardhat, Chai

---

![image](https://github.com/user-attachments/assets/349d5cd7-4ad3-47c9-919f-00454584b76d)
