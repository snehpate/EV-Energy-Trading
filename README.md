# EV Marketplace - Blockchain Project

## Introduction
The EV Marketplace project is a blockchain-based platform designed for energy trading. It leverages Ethereum smart contracts to facilitate secure and transparent transactions for staking, burning, and transferring energy tokens. The project also includes a React-based front-end to provide a user-friendly interface.

## Features
- Token staking, burning, and transferring with fees.
- Integration with Ethereum wallets (e.g., MetaMask).
- Environment-friendly energy source tracking.
- Front-end developed using React and styled with modern CSS.

---

## Prerequisites
1. **Node.js**: Ensure Node.js version **14.x** is installed.
   - Download from [Node.js Official Site](https://nodejs.org/).
2. **MetaMask Wallet**: Install the MetaMask browser extension and connect it to a test network (e.g., Goerli).

---

## Installation

```

### Step 1: Install Dependencies
Run the following command in the project directory:
```bash
npm install
```
This will install all required dependencies, including:
- `hardhat@2.16.1`
- `react@18`
- `react-dom@18`
- `webpack@5`
- `ethers@5.7.2`
- `dotenv@16.1.4`
- `react-router-dom@6.14.2`

---

## Configuration
1. Create a `.env` file in the root directory and add your environment variables:
   ```env
   PRIVATE_KEY=<your-private-key>
   INFURA_API_KEY=<your-infura-api-key>
   CONTRACT_ADDRESS=<deployed-contract-address>
   ```

2. Modify the `hardhat.config.js` file to include your network details.

---

## Usage

### Step 1: Compile Smart Contracts
Compile your smart contracts using Hardhat:
```bash
npx hardhat compile
```

### Step 2: Deploy Smart Contracts
Deploy the contracts to your desired network (e.g., Goerli):
```bash
npx hardhat run scripts/deploy.js --network goerli
```

### Step 3: Start the Front-End
Run the development server for the React application:
```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser to interact with the app.

---

## Troubleshooting
1. **Blank Screen**:
   - Ensure all dependencies are installed correctly.
   - Verify the paths for imported components and CSS files.
---

## Technologies Used
- **Blockchain**: Ethereum, Solidity
- **Front-End**: React, CSS, Webpack
- **Back-End**: Hardhat, Ethers.js

---

![image](https://github.com/user-attachments/assets/349d5cd7-4ad3-47c9-919f-00454584b76d)
