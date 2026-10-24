import React from "react";
import './Components/navbar.css';

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider } from "./utils/WalletContext";
import Header from "./Components/Header";
import Footer from "./Components/Footer";
import Home from './Components/home';
import Marketplace from "./Components/Marketplace";
import SellEnergy from "./Components/SellEnergy";
import Orders from "./Components/Orders";
import StakeTokens from "./Components/StakeTokens";
import TransferTokensWithFee from "./Components/TransferTokensWithFee";
import Energy from "./Components/Energy";
import Analytics from "./Components/Analytics";
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
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/sell" element={<SellEnergy />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/stake" element={<StakeTokens />} />
            <Route path="/transfer" element={<TransferTokensWithFee />} />
            <Route path="/energy" element={<Energy />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/admin" element={<Admin />} />
            {/* Older links */}
            <Route path="/EcoFriendlyStatus" element={<Navigate to="/energy" replace />} />
            <Route path="/UserEnergySource" element={<Navigate to="/energy" replace />} />
            <Route path="/energy-source" element={<Navigate to="/energy" replace />} />
            <Route path="/burn" element={<Navigate to="/admin" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </Router>
    </WalletProvider>
  );
};

export default App;
