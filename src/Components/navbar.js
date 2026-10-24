import React from "react";
import './navbar.css';
import { NavLink } from "react-router-dom";
import { useWallet } from "../utils/WalletContext";
import { displayTokens, shortAddress } from "../utils/web3";

const Navbar = () => {
  const { account, connect, stats } = useWallet();

  return (
    <nav className="navbar">
      <ul className="nav-links">
        <li><NavLink to="/" end>Dashboard</NavLink></li>
        <li><NavLink to="/marketplace">Marketplace</NavLink></li>
        <li><NavLink to="/sell">Sell Energy</NavLink></li>
        <li><NavLink to="/orders">My Orders</NavLink></li>
        <li><NavLink to="/stake">Stake</NavLink></li>
        <li><NavLink to="/transfer">Transfer</NavLink></li>
        <li><NavLink to="/energy">Energy Sources</NavLink></li>
        <li><NavLink to="/analytics">Analytics</NavLink></li>
        {stats.isAdmin && <li><NavLink to="/admin">Admin</NavLink></li>}
      </ul>
      {account ? (
        <span className="wallet-address" title={account}>
          {displayTokens(stats.balance, 2)} ENG &middot; {shortAddress(account)}
        </span>
      ) : (
        <button className="connect-button" onClick={connect}>Connect Wallet</button>
      )}
    </nav>
  );
};

export default Navbar;
