import React from "react";
import './Components/navbar.css';

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./utils/WalletContext";
import Header from "./Components/Header";
import Footer from "./Components/Footer";
import StakeTokens from "./Components/StakeTokens";
import Home from './Components/home';
import BurnTokens from "./Components/BurnTokens";
import TransferTokensWithFee from "./Components/TransferTokensWithFee";
import EnergySource from "./Components/EnergySource";
import EcoFriendlyStatus from "./Components/EcoFriendlyStatus";
import UserEnergySource from "./Components/UserEnergySource";
import Admin from "./Components/Admin";
import Navbar from './Components/navbar';

const App = () => {
  return (
    <WalletProvider>
      <Router>
        <Header />
        <Navbar /> {/* Navbar stays visible on all pages */}
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/EcoFriendlyStatus" element={<EcoFriendlyStatus />} />
            <Route path="/UserEnergySource" element={<UserEnergySource />} />
            <Route path="/stake" element={<StakeTokens />} />
            <Route path="/burn" element={<BurnTokens />} />
            <Route path="/transfer" element={<TransferTokensWithFee />} />
            <Route path="/energy-source" element={<EnergySource />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <Footer />
      </Router>
    </WalletProvider>
  );
};

export default App;
