import React from "react";
import { useWallet } from "../utils/WalletContext";
import { formatTokens, getDeployment, isDeployed } from "../utils/web3";

const Stat = ({ label, value }) => (
  <div className="stat">
    <span className="stat-label">{label}</span>
    <span className="stat-value">{value}</span>
  </div>
);

const Home = () => {
  const { account, stats, connect, error } = useWallet();
  const deployment = getDeployment();

  return (
    <div className="page">
      <div className="hero">
        <h1>Welcome to the EV Marketplace</h1>
        <p>Your one-stop platform for eco-friendly transactions and energy solutions.</p>
      </div>

      {!isDeployed() && (
        <div className="card">
          <p className="status status-error">
            No contract deployment found. Start a node with <code>npm run node</code> and
            deploy with <code>npm run deploy:local</code>.
          </p>
        </div>
      )}

      {account ? (
        <div className="card">
          <h3>Your Account</h3>
          <div className="stats">
            <Stat label="Balance" value={`${formatTokens(stats.balance || 0)} ENG`} />
            <Stat label="Staked" value={`${formatTokens(stats.staked || 0)} ENG`} />
            <Stat label="Your Energy Source" value={stats.userEnergySource || "Not set"} />
            <Stat label="Network Energy Source" value={stats.energySource} />
            <Stat label="Transfer Fee" value={`${stats.transferFee}%`} />
            <Stat label="Contract Status" value={stats.paused ? "Paused" : "Active"} />
          </div>
          <p className="muted">
            Contract {deployment.address} on {deployment.network}
          </p>
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center" }}>
          <p>Connect your wallet to see your EnergyToken balance.</p>
          <button onClick={connect}>Connect Wallet</button>
          {error && <p className="status status-error">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default Home;
