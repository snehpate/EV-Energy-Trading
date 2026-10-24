import { ethers } from "ethers";
import deployment from "./deployment.json";

export const ECO_SOURCES = ["Solar", "Wind", "Hydro"];

export const isDeployed = () => Boolean(deployment.address && deployment.abi);

export const getDeployment = () => deployment;

// Ask the wallet for access and return a signer-backed contract
export const getContract = async () => {
  if (!window.ethereum) {
    throw new Error("No Ethereum wallet found. Please install MetaMask.");
  }
  if (!isDeployed()) {
    throw new Error("Contract not deployed. Run `npm run deploy:local` first.");
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  await provider.send("eth_requestAccounts", []);

  const { chainId } = await provider.getNetwork();
  if (deployment.chainId && chainId !== deployment.chainId) {
    throw new Error(
      `Wrong network: switch your wallet to chain ${deployment.chainId} (${deployment.network}).`
    );
  }

  const signer = provider.getSigner();
  return new ethers.Contract(deployment.address, deployment.abi, signer);
};

export const parseTokens = (amount) => ethers.utils.parseEther(String(amount));

export const formatTokens = (amount) => ethers.utils.formatEther(amount);

// Turn wallet / contract errors into a short human readable message
export const getErrorMessage = (error) => {
  if (error?.code === 4001 || error?.code === "ACTION_REJECTED") {
    return "Transaction rejected in wallet.";
  }
  const message =
    error?.reason ||
    error?.data?.message ||
    error?.error?.message ||
    error?.message ||
    "Unknown error";
  // Strip node / wallet prefixes and keep only the contract's revert reason
  const match =
    message.match(/reverted with reason string '(.*)'/) ||
    message.match(/execution reverted: (.*)/);
  return match ? match[1] : message;
};
