import React, { useState } from "react";
import { useWallet } from "../utils/WalletContext";
import { useTransaction } from "../utils/useTransaction";
import { formatDuration, parseTokens } from "../utils/web3";
import RequireWallet from "./RequireWallet";
import StatusMessage from "./StatusMessage";

// One labelled input + submit button
const Setting = ({ label, placeholder, onSubmit, pending, step = "1" }) => {
  const [value, setValue] = useState("");
  return (
    <div className="setting">
      <h4>{label}</h4>
      <div className="inline-form">
        <input type="number" min="0" step={step} placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
        <button
          onClick={async () => {
            if (await onSubmit(value)) setValue("");
          }}
          disabled={pending || value === ""}
        >
          Update
        </button>
      </div>
    </div>
  );
};

const Admin = () => {
  const { stats } = useWallet();
  const { run, status, pending } = useTransaction();

  return (
    <div className="page">
      <RequireWallet>
        {!stats.isAdmin ? (
          <div className="card"><p>This page is only available to admins.</p></div>
        ) : (
          <>
            <div className="card">
              <h3>Token Controls</h3>
              <p>Token transfers are <strong>{stats.paused ? "paused" : "active"}</strong>.</p>
              <button
                onClick={() =>
                  stats.paused
                    ? run(({ token }) => token.unpause(), "Token unpaused.")
                    : run(({ token }) => token.pause(), "Token paused.")
                }
                disabled={pending}
              >
                {stats.paused ? "Unpause Token" : "Pause Token"}
              </button>
              <Setting
                label={`Transfer Fee (current ${stats.transferFee}%, max 10)`}
                placeholder="New fee %"
                pending={pending}
                onSubmit={(v) => run(({ token }) => token.setTransferFeePercentage(v), "Transfer fee updated.")}
              />
              <Setting
                label={`Eco Incentive (current ${stats.ecoIncentive?.toString()} wei, max 10)`}
                placeholder="New incentive"
                pending={pending}
                onSubmit={(v) => run(({ token }) => token.setEcoIncentive(v), "Eco incentive updated.")}
              />
              <Setting
                label={`Staking APR (current ${stats.stakingRewardRate / 100}%, max 20)`}
                placeholder="New APR %"
                step="0.01"
                pending={pending}
                onSubmit={(v) =>
                  run(({ token }) => token.setStakingRewardRate(Math.round(Number(v) * 100)), "Staking APR updated.")
                }
              />
              <Setting
                label="Burn Tokens (from your balance)"
                placeholder="Amount of ENG"
                step="any"
                pending={pending}
                onSubmit={(v) => run(({ token }) => token.burn(parseTokens(v)), "Tokens burned.")}
              />
            </div>

            <div className="card">
              <h3>Marketplace Controls</h3>
              <p>Marketplace is <strong>{stats.market.paused ? "paused" : "active"}</strong>.</p>
              <button
                onClick={() =>
                  stats.market.paused
                    ? run(({ market }) => market.unpause(), "Marketplace unpaused.")
                    : run(({ market }) => market.pause(), "Marketplace paused.")
                }
                disabled={pending}
              >
                {stats.market.paused ? "Unpause Marketplace" : "Pause Marketplace"}
              </button>
              <Setting
                label={`Platform Fee (current ${stats.market.platformFeeBps / 100}%, max 5)`}
                placeholder="New fee %"
                step="0.01"
                pending={pending}
                onSubmit={(v) =>
                  run(({ market }) => market.setPlatformFee(Math.round(Number(v) * 100)), "Platform fee updated.")
                }
              />
              <Setting
                label={`Delivery Window (current ${formatDuration(stats.market.deliveryWindow)})`}
                placeholder="Hours (1 - 720)"
                pending={pending}
                onSubmit={(v) =>
                  run(({ market }) => market.setDeliveryWindow(Math.round(Number(v) * 3600)), "Delivery window updated.")
                }
              />
            </div>
            <StatusMessage status={status} />
          </>
        )}
      </RequireWallet>
    </div>
  );
};

export default Admin;
