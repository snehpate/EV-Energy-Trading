import React from "react";
import { useWallet } from "../utils/WalletContext";

// Shows a connect prompt until a wallet is connected
const RequireWallet = ({ children }) => {
  const { account, connect, error } = useWallet();
  if (account) return children;
  return (
    <div className="card">
      <p>Connect your wallet to use this feature.</p>
      <button onClick={connect}>Connect Wallet</button>
      {error && <p className="status status-error">{error}</p>}
    </div>
  );
};

export default RequireWallet;
