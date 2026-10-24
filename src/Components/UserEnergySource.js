import React, { useState } from "react";
import { useWallet } from "../utils/WalletContext";
import { useTransaction } from "../utils/useTransaction";
import RequireWallet from "./RequireWallet";
import StatusMessage from "./StatusMessage";
import EnergySourceSelect from "./EnergySourceSelect";

const UserEnergySource = () => {
  const [source, setSource] = useState("");
  const { stats } = useWallet();
  const { run, status, pending } = useTransaction();

  const setUserSource = () =>
    run((c) => c.setUserEnergySource(source), "User energy source set successfully!");

  return (
    <div className="page">
      <RequireWallet>
        <div className="card">
          <h3>Set Your Energy Source</h3>
          <p className="muted">Your current energy source: {stats.userEnergySource || "Not set"}</p>
          <EnergySourceSelect value={source} onChange={setSource} />
          <button onClick={setUserSource} disabled={pending || !source}>Set Source</button>
          <StatusMessage status={status} />
        </div>
      </RequireWallet>
    </div>
  );
};

export default UserEnergySource;
