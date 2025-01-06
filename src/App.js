import React from "react";
import './Components/navbar.css';

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./Components/Header";
import Footer from "./Components/Footer";
import StakeTokens from "./Components/StakeTokens";
import Home from './Components/home';
import BurnTokens from "./Components/BurnTokens";
import TransferTokensWithFee from "./Components/TransferTokensWithFee";
import EnergySource from "./Components/EnergySource";
import EcoFriendlyStatus from "./Components/EcoFriendlyStatus";
import UserEnergySource from "./Components/UserEnergySource";
import Navbar from './Components/navbar';

const App = () => {
  return (
    <div>
      <Router>
        <Navbar /> {/* Navbar stays visible on all pages */}
        <Routes>
          {/* Define each route */}
          <Route path="/" element={<Home />} /> {/* Set Home as the default route */}
          <Route path="/EcoFriendlyStatus" element={<EcoFriendlyStatus />} />
          <Route path="/UserEnergySource" element={<UserEnergySource />} />
          <Route path="/Header" element={<Header />} />
          <Route path="/Footer" element={<Footer />} />
          <Route path="/stake" element={<StakeTokens />} />
          <Route path="/burn" element={<BurnTokens />} />
          <Route path="/transfer" element={<TransferTokensWithFee />} />
          <Route path="/energy-source" element={<EnergySource />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
