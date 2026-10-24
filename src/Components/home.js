import React from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../utils/WalletContext";
import { CO2_KG_PER_KWH, displayTokens, getDeployment, isDeployed } from "../utils/web3";
import StatTile from "./StatTile";
import Stars from "./Stars";

const Home = () => {
  const { account, stats, connect, error } = useWallet();
  const deployment = getDeployment();
  const co2Saved = stats.market.kwhBought * CO2_KG_PER_KWH;

  return (
    <div className="page">
      <div className="hero">
        <h1>Welcome to the EV Marketplace</h1>
        <p>Buy and sell renewable energy for your electric vehicle, peer to peer, on the blockchain.</p>
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
        <>
          <div className="card">
            <h3>Your Wallet</h3>
            <div className="stats">
              <StatTile label="Balance" value={`${displayTokens(stats.balance)} ENG`} />
              <StatTile label="Staked" value={`${displayTokens(stats.staked)} ENG`} />
              <StatTile
                label="Staking Rewards"
                value={`${displayTokens(stats.pendingRewards, 6)} ENG`}
                hint={`${stats.stakingRewardRate / 100}% APR`}
              />
              <StatTile label="Your Energy Source" value={stats.userEnergySource || "Not set"} />
            </div>
          </div>

          <div className="card">
            <h3>Your Energy Trading</h3>
            <div className="stats">
              <StatTile label="Energy Bought" value={`${stats.market.kwhBought.toLocaleString()} kWh`} />
              <StatTile label="Energy Sold" value={`${stats.market.kwhSold.toLocaleString()} kWh`} />
              <StatTile label="Earned from Sales" value={`${displayTokens(stats.market.earned)} ENG`} />
              <StatTile
                label="CO₂ Avoided"
                value={`${co2Saved.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`}
                hint="Estimated vs. grid electricity"
              />
            </div>
            <p>
              Seller rating: <Stars value={stats.market.rating} count={stats.market.ratingCount} />
            </p>
            <div className="actions">
              <Link className="button-link" to="/marketplace">Buy Energy</Link>
              <Link className="button-link" to="/sell">Sell Energy</Link>
              <Link className="button-link" to="/orders">View Orders</Link>
            </div>
          </div>

          <p className="muted footnote">
            Network: {deployment.network} &middot; Token {deployment.token?.address} &middot; Marketplace{" "}
            {deployment.marketplace?.address}
            {stats.paused && " · Token transfers are paused"}
            {stats.market.paused && " · Marketplace is paused"}
          </p>
        </>
      ) : (
        <div className="card" style={{ textAlign: "center" }}>
          <p>Connect your wallet to start trading energy.</p>
          <button onClick={connect}>Connect Wallet</button>
          {error && <p className="status status-error">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default Home;
