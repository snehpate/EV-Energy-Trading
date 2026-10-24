import React, { useState } from "react";
import { useWallet } from "../utils/WalletContext";
import { useTransaction } from "../utils/useTransaction";
import RequireWallet from "./RequireWallet";
import StatusMessage from "./StatusMessage";

const Admin = () => {
  const { stats } = useWallet();
  const { run, status, pending } = useTransaction();
  const [fee, setFee] = useState("");
  const [incentive, setIncentive] = useState("");

  return (
    <div className="page">
      <RequireWallet>
        {!stats.isAdmin ? (
          <div className="card"><p>This page is only available to admins.</p></div>
        ) : (
          <div className="card">
            <h3>Admin Controls</h3>
            <p>Contract is currently <strong>{stats.paused ? "paused" : "active"}</strong>.</p>
            <button
              onClick={() =>
                stats.paused
                  ? run((c) => c.unpause(), "Contract unpaused.")
                  : run((c) => c.pause(), "Contract paused.")
              }
              disabled={pending}
            >
              {stats.paused ? "Unpause" : "Pause"}
            </button>

            <h4>Transfer Fee (current {stats.transferFee}%)</h4>
            <input
              type="number"
              min="0"
              max="10"
              placeholder="New fee % (0-10)"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
            <button
              onClick={() => run((c) => c.setTransferFeePercentage(fee), "Transfer fee updated.")}
              disabled={pending || fee === ""}
            >
              Update Fee
            </button>

            <h4>Eco Incentive (current {stats.ecoIncentive?.toString()} wei)</h4>
            <input
              type="number"
              min="0"
              max="10"
              placeholder="New incentive (0-10)"
              value={incentive}
              onChange={(e) => setIncentive(e.target.value)}
            />
            <button
              onClick={() => run((c) => c.setEcoIncentive(incentive), "Eco incentive updated.")}
              disabled={pending || incentive === ""}
            >
              Update Incentive
            </button>
            <StatusMessage status={status} />
          </div>
        )}
      </RequireWallet>
    </div>
  );
};

export default Admin;
