import React, { useState } from "react";
import { useWallet } from "../utils/WalletContext";
import { useTransaction } from "../utils/useTransaction";
import { getErrorMessage } from "../utils/web3";
import RequireWallet from "./RequireWallet";
import StatusMessage from "./StatusMessage";
import EnergySourceSelect from "./EnergySourceSelect";

const Energy = () => {
  const { token, stats } = useWallet();
  const userTx = useTransaction();
  const networkTx = useTransaction();
  const [userSource, setUserSource] = useState("");
  const [networkSource, setNetworkSource] = useState("");
  const [check, setCheck] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const checkEcoFriendly = async () => {
    try {
      setError("");
      setResult({ source: check, ecoFriendly: await token.isEcoFriendly(check) });
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
            Network energy source: <strong>{stats.energySource}</strong> (eco-friendly). Every transfer earns an
            eco incentive of {stats.ecoIncentive?.toString()} wei ENG.
          </p>
          <p className="muted">Only Solar, Wind and Hydro energy can be set or traded on the marketplace.</p>
          <input
            type="text"
            placeholder="Check a source, e.g. Solar or Coal"
            value={check}
            onChange={(e) => setCheck(e.target.value)}
          />
          <button onClick={checkEcoFriendly} disabled={!check}>Check</button>
          {result && (
            <p className={`status ${result.ecoFriendly ? "status-success" : "status-error"}`}>
              {result.source} is {result.ecoFriendly ? "" : "not "}eco-friendly.
            </p>
          )}
          {error && <p className="status status-error">{error}</p>}
        </div>

        <div className="card">
          <h3>Your Energy Source</h3>
          <p className="muted">Current: {stats.userEnergySource || "Not set"}</p>
          <EnergySourceSelect value={userSource} onChange={setUserSource} />
          <button
            onClick={() => userTx.run(({ token }) => token.setUserEnergySource(userSource), "Your energy source was updated!")}
            disabled={userTx.pending || !userSource}
          >
            Set Source
          </button>
          <StatusMessage status={userTx.status} />
        </div>

        {stats.isAdmin && (
          <div className="card">
            <h3>Network Energy Source (Admin)</h3>
            <EnergySourceSelect value={networkSource} onChange={setNetworkSource} />
            <button
              onClick={() => networkTx.run(({ token }) => token.setEnergySource(networkSource), "Network energy source updated!")}
              disabled={networkTx.pending || !networkSource}
            >
              Update
            </button>
            <StatusMessage status={networkTx.status} />
          </div>
        )}
      </RequireWallet>
    </div>
  );
};

export default Energy;
