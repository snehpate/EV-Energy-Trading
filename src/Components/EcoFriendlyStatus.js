import React, { useState } from "react";
import { useWallet } from "../utils/WalletContext";
import { getErrorMessage } from "../utils/web3";
import RequireWallet from "./RequireWallet";

const EcoFriendlyStatus = () => {
  const { contract, stats } = useWallet();
  const [source, setSource] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const checkEcoFriendly = async () => {
    try {
      setError("");
      setResult({ source, ecoFriendly: await contract.isEcoFriendly(source) });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="page">
      <RequireWallet>
        <div className="card">
          <h3>Eco-Friendly Status</h3>
          <p>
            Network energy source: <strong>{stats.energySource}</strong> &mdash; Is Eco-Friendly: Yes
          </p>
          <p>
            Your energy source: <strong>{stats.userEnergySource || "Not set"}</strong>
          </p>
          <p className="muted">
            Every transfer earns an eco incentive of {stats.ecoIncentive?.toString()} wei ENG
            while the network runs on an eco-friendly source.
          </p>
        </div>
        <div className="card">
          <h3>Check an Energy Source</h3>
          <input
            type="text"
            placeholder="e.g. Solar, Coal"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <button onClick={checkEcoFriendly} disabled={!source}>Check</button>
          {result && (
            <p className={`status ${result.ecoFriendly ? "status-success" : "status-error"}`}>
              {result.source} is {result.ecoFriendly ? "" : "not "}eco-friendly.
            </p>
          )}
          {error && <p className="status status-error">{error}</p>}
        </div>
      </RequireWallet>
    </div>
  );
};

export default EcoFriendlyStatus;
