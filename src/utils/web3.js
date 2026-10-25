import { ethers } from "ethers";

// Every deployments/<chainId>.json written by scripts/deploy.js is bundled automatically
const deploymentFiles = require.context("./deployments", false, /^\.\/\d+\.json$/);
const deployments = Object.fromEntries(
  deploymentFiles.keys().map((key) => {
    const d = deploymentFiles(key);
    return [Number(d.chainId), d];
  })
);

const NETWORKS = {
  1: { name: "Ethereum Mainnet" },
  11155111: {
    name: "Sepolia testnet",
    params: {
      chainId: "0xaa36a7",
      chainName: "Sepolia",
      nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://rpc.sepolia.org"],
      blockExplorerUrls: ["https://sepolia.etherscan.io"],
    },
  },
  31337: { name: "Local Hardhat node" },
};

export const ECO_SOURCES = ["Solar", "Wind", "Hydro"];

// Estimated CO2 avoided per kWh of renewable energy vs. average grid electricity
export const CO2_KG_PER_KWH = 0.4;

export const isDeployed = () => Object.keys(deployments).length > 0;

export const getDeployment = (chainId) => deployments[chainId];

export const networkName = (chainId) => NETWORKS[chainId]?.name || `chain ${chainId}`;

// The network the app asks wallets to use: a public deployment when one exists, else local
export const preferredChainId = () => {
  const ids = Object.keys(deployments).map(Number);
  const configured = Number(process.env.REACT_APP_DEFAULT_CHAIN_ID);
  if (ids.includes(configured)) return configured;
  return ids.find((id) => id !== 31337) || ids[0];
};

export class WrongNetworkError extends Error {
  constructor(chainId) {
    super(
      `This app is not deployed on ${networkName(chainId)}. Switch your wallet to ${networkName(preferredChainId())}.`
    );
    this.name = "WrongNetworkError";
  }
}

export const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Opens the current page inside the MetaMask mobile app's browser
export const metaMaskDeepLink = () =>
  `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;

// Ask the wallet to switch to (or add) the app's network
export const switchNetwork = async () => {
  const chainId = preferredChainId();
  const hexId = `0x${chainId.toString(16)}`;
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  } catch (error) {
    // 4902: the wallet does not know this chain yet
    if (error?.code === 4902 && NETWORKS[chainId]?.params) {
      await window.ethereum.request({ method: "wallet_addEthereumChain", params: [NETWORKS[chainId].params] });
    } else {
      throw error;
    }
  }
};

// Ask the wallet for access and return signer-backed contracts for its network
export const getContracts = async () => {
  if (!window.ethereum) {
    throw new Error(
      isMobile()
        ? "Open this page in the MetaMask app to connect."
        : "No Ethereum wallet found. Please install MetaMask."
    );
  }
  if (!isDeployed()) {
    throw new Error("Contracts not deployed. Run `npm run deploy:local` first.");
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  await provider.send("eth_requestAccounts", []);

  const { chainId } = await provider.getNetwork();
  const deployment = deployments[chainId];
  if (!deployment) {
    throw new WrongNetworkError(chainId);
  }

  const signer = provider.getSigner();
  return {
    provider,
    signer,
    chainId,
    deployment,
    token: new ethers.Contract(deployment.token.address, deployment.token.abi, signer),
    market: new ethers.Contract(deployment.marketplace.address, deployment.marketplace.abi, signer),
    faucet: deployment.faucet
      ? new ethers.Contract(deployment.faucet.address, deployment.faucet.abi, signer)
      : null,
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
