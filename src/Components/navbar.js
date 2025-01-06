import React from "react";
import './navbar.css';
import { Link } from "react-router-dom"; // Import Link to handle navigation

const Navbar = () => {
  return (
    <nav className="navbar"> {/* Apply the navbar class here */}
      <ul className="nav-links"> {/* Apply the nav-links class here */}
        <li><Link to="/">Home</Link></li>
        <li><Link to="EcoFriendlyStatus">Eco Status</Link></li>
        <li><Link to="/stake">Stake Tokens</Link></li>
        <li><Link to="/burn">Burn Tokens</Link></li>
        <li><Link to="/transfer">Transfer Tokens</Link></li>
        <li><Link to="/energy-source">Energy Source</Link></li>
      </ul>
    </nav>
  );
};


export default Navbar;
