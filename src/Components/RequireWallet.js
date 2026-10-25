import React from "react";
import { useWallet } from "../utils/WalletContext";
import ConnectPrompt from "./ConnectPrompt";

// Shows a connect prompt until a wallet is connected
const RequireWallet = ({ children }) => {
  const { account } = useWallet();
  return account ? children : <ConnectPrompt />;
};

export default RequireWallet;
