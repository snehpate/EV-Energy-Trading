import { ethers } from "ethers";
import deployment from "./deployment.json";

export const ECO_SOURCES = ["Solar", "Wind", "Hydro"];

// Estimated CO2 avoided per kWh of renewable energy vs. average grid electricity
export const CO2_KG_PER_KWH = 0.4;

export const isDeployed = () =>
  Boolean(deployment.token?.address && deployment.marketplace?.address);

export const getDeployment = () => deployment;

// Ask the wallet for access and return signer-backed contracts
export const getContracts = async () => {
  if (!window.ethereum) {
    throw new Error("No Ethereum wallet found. Please install MetaMask.");
  }
  if (!isDeployed()) {
    throw new Error("Contracts not deployed. Run `npm run deploy:local` first.");
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
  return {
    provider,
    signer,
    token: new ethers.Contract(deployment.token.address, deployment.token.abi, signer),
    market: new ethers.Contract(deployment.marketplace.address, deployment.marketplace.abi, signer),
  };
};

export const parseTokens = (amount) => ethers.utils.parseEther(String(amount));

export const formatTokens = (amount) => ethers.utils.formatEther(amount);

// Human friendly token amount, e.g. "1,234.5678"
export const displayTokens = (amount, maxDecimals = 4) =>
  Number(ethers.utils.formatEther(amount || 0)).toLocaleString(undefined, {
    maximumFractionDigits: maxDecimals,
  });

export const shortAddress = (address) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

export const formatDuration = (seconds) => {
  const s = Math.max(0, Math.round(seconds));
  if (s >= 86400) return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.ceil(s / 60)}m`;
};

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
