const express = require('express');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const port = 3000;

// Smart Contract Configuration
const contractAddress = 'your_contract_address'; // Replace with your Sepolia contract address
const abi = [ /* Paste your contract ABI here */ ];

// Initialize Provider and Wallet
const provider = new ethers.providers.JsonRpcProvider('https://rpc.sepolia.org');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);

// Route: Check Token Balance
app.get('/balance/:address', async (req, res) => {
  try {
    const address = req.params.address;
    const balance = await contract.balanceOf(address);
    res.json({ address, balance: ethers.utils.formatEther(balance) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Route: Transfer Tokens
app.post('/transfer', express.json(), async (req, res) => {
  const { to, amount } = req.body;
  try {
    const tx = await contract.transfer(to, ethers.utils.parseEther(amount));
    await tx.wait(); // Wait for the transaction to be mined
    res.json({ message: 'Transfer successful', txHash: tx.hash });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// Start the Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
