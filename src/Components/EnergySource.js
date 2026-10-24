import React, { useState } from "react";
import { useWallet } from "../utils/WalletContext";
import { useTransaction } from "../utils/useTransaction";
import RequireWallet from "./RequireWallet";
import StatusMessage from "./StatusMessage";
import EnergySourceSelect from "./EnergySourceSelect";

const EnergySource = () => {
  const [source, setSource] = useState("");
  const { stats } = useWallet();
  const { run, status, pending } = useTransaction();

  const setEnergySource = () =>
    run((c) => c.setEnergySource(source), "Energy source updated successfully!");

  return (
    <div className="page">
      <RequireWallet>
        <div className="card">
          <h3>Set Energy Source</h3>
          <p className="muted">Current network energy source: {stats.energySource}</p>
          {!stats.isAdmin && <p className="muted">Only admins can change the network energy source.</p>}
          <EnergySourceSelect value={source} onChange={setSource} />
          <button onClick={setEnergySource} disabled={pending || !source || !stats.isAdmin}>Update</button>
          <StatusMessage status={status} />
        </div>
      </RequireWallet>
    </div>
  );
};

export default EnergySource;
