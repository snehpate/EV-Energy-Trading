# EV Marketplace - Blockchain Energy Trading

## Introduction
The EV Marketplace is a blockchain platform for **peer-to-peer renewable energy trading for electric vehicles**. Producers (solar farms, wind co-ops, home owners with rooftop panels) list surplus energy; EV drivers buy charging energy with the **EnergyToken (ENG)**. Payments are held in an on-chain escrow until the buyer confirms the charge was delivered. The platform also offers staking with rewards, seller reputation, and live market analytics, all through a React dashboard connected to MetaMask.

![image](https://github.com/user-attachments/assets/349d5cd7-4ad3-47c9-919f-00454584b76d)

## Features

### Smart contracts
**EnergyToken (ERC-20, OpenZeppelin v5)**
- Transfers burn a configurable fee (default 2%, max 10%); senders earn an eco incentive while the network runs on renewable energy.
- **Staking with rewards**: stake ≥ 10 ENG and earn a time-based APR (default 5%, max 20%). Rewards accrue every second, survive unstaking and are claimed on demand. APR changes only apply going forward.
- Network-wide and per-user energy sources (only Solar, Wind and Hydro are accepted).
- Role-based admin (burn, pause, fees, APR) and fee exemptions for system contracts such as the escrow.

**EnergyMarketplace**
- **Listings**: sellers list kWh with a price per kWh, energy source and charging location; they can reprice or cancel.
- **Escrowed orders**: partial purchases, with slippage protection (`maxPricePerKwh`) so a seller can't raise the price before your order is mined.
- **Settlement**: the buyer confirms delivery → seller is paid minus a platform fee (default 1%, max 5%) sent to the treasury. If the buyer never confirms, the seller can claim after the delivery window (default 3 days). Sellers (or admins, for disputes) can refund.
- **Reputation**: buyers rate sellers 1–5 stars once per completed order.
- **On-chain statistics**: kWh traded (total and per source), volume, fees, and per-user bought/sold/earned/spent.
- Reentrancy protection, pausing and admin limits on every parameter.

### Front-end (React)
- **Dashboard**: balances, staking rewards, energy bought/sold, estimated CO₂ avoided, seller rating.
- **Marketplace**: browse listings with search, source filter and sorting; buy with an automatic approve → buy flow.
- **Sell Energy**: create listings, reprice and cancel.
- **My Orders**: confirm deliveries and rate sellers; claim payments (with a countdown) or refund as a seller.
- **Stake**: stake, unstake, see rewards accrue and claim them.
- **Analytics**: market KPIs, kWh-by-source chart, top-sellers leaderboard and a live activity feed read from contract events.
- **Energy Sources / Transfer / Admin**: eco-status checks, fee-aware transfers, and admin controls for both contracts.
- Live updates on every new block, readable revert messages, account and network change handling, responsive layout.

---

## Project Structure
```
contracts/
  EnergyToken.sol          ERC-20 token: fees, eco incentive, staking rewards, roles
  EnergyMarketplace.sol    P2P energy marketplace with escrow, ratings and stats
  EnergyFaucet.sol         Test networks only: free daily ENG for testers
scripts/
  deploy.js                Deploys the contracts, exempts escrow/faucet from fees and
                           writes src/utils/deployments/<chainId>.json (addresses + ABIs)
  seed.js                  Fills a local chain with demo accounts, listings and orders
test/                      Contract test suites (51 tests)
src/
  utils/deployments/       One file per network; the app uses the one matching the wallet
  utils/                   web3 helpers, wallet context, transaction hook
  Components/              Pages and shared UI components
.github/workflows/
  ci.yml                   Compiles, tests and builds on every push / PR
  pages.yml                Publishes the website to GitHub Pages
  deploy-contracts.yml     Deploys the contracts to Sepolia (run manually)
```

---

## Prerequisites
1. **Node.js** 18 or newer – [nodejs.org](https://nodejs.org/).
2. **MetaMask** browser extension.

## Installation
```bash
npm install
```

---

## Quick Start (local blockchain)

```bash
# Terminal 1 - local Ethereum node (prints 20 funded test accounts + private keys)
npm run node

# Terminal 2
npm run deploy:local   # deploy EnergyToken + EnergyMarketplace
npm run seed:local     # optional: demo listings, orders, ratings and stake
npm start              # open http://localhost:3000
```

### Configure MetaMask
1. Add a network: RPC URL `http://127.0.0.1:8545`, chain ID `31337`, currency `ETH`.
2. Import accounts using the private keys printed by `npm run node`:
   | Account | Role in the demo data |
   | --- | --- |
   | #0 | Deployer – holds the ENG supply and all admin roles |
   | #1 | Solar farm (seller) |
   | #2 | Wind co-op (seller, has a pending order to claim) |
   | #3, #4 | EV drivers (buyers) |
3. Optionally add the token to MetaMask with the token address from `src/utils/deployments/31337.json` (symbol `ENG`, 18 decimals).

> Restarting `npm run node` wipes the chain: redeploy (and reseed), then in MetaMask use *Settings → Advanced → Clear activity tab data* to reset the account nonces.

### Try it
1. As account #3, open **Marketplace**, buy some kWh (MetaMask asks you to approve the ENG payment first, then to buy).
2. Open **My Orders → Purchases**, confirm delivery and rate the seller.
3. As a seller, open **Sell Energy** to list energy and **My Orders → Sales** to refund or claim payments.
4. Stake ENG on **Stake** and watch rewards accrue; check **Analytics** for market-wide stats.

---

## Going Live (Sepolia testnet + GitHub Pages)

The public version runs on **Sepolia**, Ethereum's free test network, and the website is hosted on **GitHub Pages**. Testers use MetaMask (desktop extension or the MetaMask mobile app) and claim free ENG from the built-in faucet.

### One-time setup
1. **Create a deployer wallet.** In MetaMask, add a new account used only for this project. Never use a wallet that holds real funds.
2. **Get Sepolia ETH** for gas (about 0.05 ETH is plenty) from a public faucet, e.g. [Google Cloud](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) or [Alchemy](https://www.alchemy.com/faucets/ethereum-sepolia).
3. **Get an RPC URL.** Create a free app at [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/) and copy its Sepolia HTTPS URL.
4. **Add repository secrets** (GitHub → Settings → Secrets and variables → Actions → New repository secret):
   - `DEPLOYER_PRIVATE_KEY` – the deployer account's private key (MetaMask → account details → Show private key)
   - `SEPOLIA_RPC_URL` – the URL from step 3
5. **Enable GitHub Pages:** Settings → Pages → Build and deployment → Source: **GitHub Actions**.

### Deploy
1. GitHub → **Actions** → **Deploy contracts to Sepolia** → **Run workflow**, type `deploy`.
   The workflow runs the tests, deploys the token, marketplace and faucet (funded with 100,000 ENG), commits `src/utils/deployments/11155111.json`, and publishes the website.
2. Open `https://<your-username>.github.io/EV-Energy-Trading/`. On a phone, tap **Open in MetaMask app**.

Every later push to `main` republishes the website automatically. Re-run the contract workflow only when the contracts change; it creates fresh contracts and the site switches to them.

### Deploying from your own computer instead
Copy `.env.example` to `.env`, fill in `PRIVATE_KEY` and `SEPOLIA_RPC_URL`, then run `npm run deploy:sepolia`. Commit the generated `src/utils/deployments/11155111.json` and push.

---

## Contract Reference

### EnergyToken
| Function | Access | Description |
| --- | --- | --- |
| `transfer`, `transferFrom` | anyone (not paused) | Transfer with burned fee and eco incentive |
| `stakeTokens(amount)` / `unstakeTokens()` | anyone (not paused) | Stake ≥ 10 ENG / withdraw full stake |
| `claimRewards()` / `pendingRewards(user)` | anyone | Claim / view staking rewards |
| `setUserEnergySource(source)` | anyone | Set your own eco-friendly source |
| `setEnergySource(source)` | `ADMIN_ROLE` | Set the network energy source |
| `burn(amount)`, `pause()`, `unpause()` | `ADMIN_ROLE` | Supply and emergency controls |
| `setTransferFeePercentage`, `setEcoIncentive`, `setStakingRewardRate` | `ADMIN_ROLE` | Economics (capped at 10%, 10 wei, 20%) |
| `setFeeExempt(account, exempt)` | `ADMIN_ROLE` | Fee-free transfers for system contracts |

### EnergyMarketplace
| Function | Access | Description |
| --- | --- | --- |
| `createListing(kwh, pricePerKwh, source, location)` | anyone | List renewable energy |
| `updateListingPrice(id, price)` / `cancelListing(id)` | seller (admin can cancel) | Manage listings |
| `buyEnergy(listingId, kwh, maxPricePerKwh)` | anyone except seller | Pay into escrow (approve ENG first) |
| `confirmDelivery(orderId)` | buyer | Release payment to seller |
| `claimPayment(orderId)` | seller, after delivery window | Collect an unconfirmed order |
| `refundOrder(orderId)` | seller or admin | Refund buyer, restock listing |
| `rateSeller(orderId, 1-5)` | buyer, once per completed order | Seller reputation |
| `getListings`, `getSellerListings`, `getBuyerOrders`, `getSellerOrders`, `getSellerRating`, `userStats` | view | Read data |
| `setPlatformFee`, `setTreasury`, `setDeliveryWindow`, `pause`, `unpause` | `ADMIN_ROLE` | Admin settings |

---

## Scripts
| Command | Description |
| --- | --- |
| `npm run compile` | Compile contracts |
| `npm test` | Run the contract tests |
| `npm run test:all` | Contract tests + production front-end build |
| `npm run node` | Start a local Hardhat node |
| `npm run deploy:local` / `npm run deploy:sepolia` | Deploy contracts |
| `npm run seed:local` | Load demo data into the local deployment |
| `npm start` | Start the React dev server |
| `npm run build` | Production build of the front-end |

---

## Troubleshooting
1. **"Contracts not deployed"** – run `npm run deploy:local` with the node running, then restart `npm start`.
2. **"This app is not deployed on …"** – tap **Switch to …** or switch MetaMask to the network you deployed to (31337 locally, Sepolia online).
3. **Transactions fail after restarting the node** – redeploy and reset MetaMask activity data (see above).
4. **Admin page missing** – only the deployer account has `ADMIN_ROLE`.
5. **"Price changed"** when buying – the seller updated the price; reopen the listing and try again.

---

## Technologies Used
- **Blockchain**: Ethereum, Solidity 0.8.24, OpenZeppelin Contracts v5
- **Front-End**: React 18, React Router 6, Ethers.js 5, CSS
- **Tooling**: Hardhat, Chai, GitHub Actions
