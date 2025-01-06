import { ethers } from "ethers";
import deployment from "./deployment.json";

export const getContract = async () => {
  // Connect to the blockchain
  if (window.ethereum) {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await window.ethereum.enable();
    const signer = provider.getSigner();

    // Load the contract
    const contract = new ethers.Contract(
      deployment.address,
      deployment.abi,
      signer
    ); 
    return contract;
  } else {
    throw new Error("Ethereum wallet is not connected");
  }
};