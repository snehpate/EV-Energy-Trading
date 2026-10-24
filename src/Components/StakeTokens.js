import React, { useState } from "react";
import { formatTokens, parseTokens } from "../utils/web3";
import { useWallet } from "../utils/WalletContext";
import { useTransaction } from "../utils/useTransaction";
import RequireWallet from "./RequireWallet";
import StatusMessage from "./StatusMessage";

const StakeTokens = () => {
  const [amount, setAmount] = useState("");
  const { stats } = useWallet();
  const { run, status, pending } = useTransaction();

  const stakeTokens = async () => {
    if (!amount || Number(amount) <= 0) return;
    const ok = await run((c) => c.stakeTokens(parseTokens(amount)), "Tokens staked successfully!");
    if (ok) setAmount("");
  };

  const unstakeTokens = () => run((c) => c.unstakeTokens(), "Tokens unstaked successfully!");

  return (
    <div className="page">
      <RequireWallet>
        <div className="card">
          <h3>Stake Tokens</h3>
          <p className="muted">
            Currently staked: {formatTokens(stats.staked || 0)} ENG &middot; Minimum stake:{" "}
            {formatTokens(stats.minStake || 0)} ENG
          </p>
          <input
            type="number"
            min="0"
            placeholder="Amount to stake"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button onClick={stakeTokens} disabled={pending || !amount}>Stake</button>
          <button onClick={unstakeTokens} disabled={pending || !stats.staked || stats.staked.isZero()}>
            Unstake All
          </button>
          <StatusMessage status={status} />
        </div>
      </RequireWallet>
    </div>
  );
};

export default StakeTokens;
