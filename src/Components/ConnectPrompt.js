import React from "react";
import { useWallet } from "../utils/WalletContext";
import { isMobile, metaMaskDeepLink, networkName, preferredChainId } from "../utils/web3";

// Connect button plus the fixes for the usual blockers: no wallet, or the wrong network
const ConnectPrompt = ({ message = "Connect your wallet to use this feature." }) => {
  const { connect, error, wrongNetwork, switchNetwork } = useWallet();
  const noWallet = !window.ethereum;

  return (
    <div className="card connect-prompt">
      <p>{message}</p>
      {noWallet && isMobile() ? (
        <a className="button-link" href={metaMaskDeepLink()}>Open in MetaMask app</a>
      ) : wrongNetwork ? (
        <button onClick={switchNetwork}>Switch to {networkName(preferredChainId())}</button>
      ) : (
        <button onClick={connect}>Connect Wallet</button>
      )}
      {noWallet && !isMobile() && (
        <p className="muted">
          You need a browser wallet such as <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">MetaMask</a>.
        </p>
      )}
      {error && <p className="status status-error">{error}</p>}
    </div>
  );
};

export default ConnectPrompt;
