import React from "react";
import './navbar.css';
import { NavLink } from "react-router-dom";
import { useWallet } from "../utils/WalletContext";

const shortAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

const Navbar = () => {
  const { account, connect, stats } = useWallet();

  return (
    <nav className="navbar">
      <ul className="nav-links">
        <li><NavLink to="/" end>Home</NavLink></li>
        <li><NavLink to="/EcoFriendlyStatus">Eco Status</NavLink></li>
        <li><NavLink to="/stake">Stake Tokens</NavLink></li>
        <li><NavLink to="/burn">Burn Tokens</NavLink></li>
        <li><NavLink to="/transfer">Transfer Tokens</NavLink></li>
        <li><NavLink to="/UserEnergySource">My Energy Source</NavLink></li>
        <li><NavLink to="/energy-source">Energy Source</NavLink></li>
        {stats.isAdmin && <li><NavLink to="/admin">Admin</NavLink></li>}
      </ul>
      {account ? (
        <span className="wallet-address" title={account}>{shortAddress(account)}</span>
      ) : (
        <button className="connect-button" onClick={connect}>Connect Wallet</button>
      )}
    </nav>
  );
};

export default Navbar;
