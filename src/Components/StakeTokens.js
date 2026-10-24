import React, { useState } from "react";
import { displayTokens, formatTokens, parseTokens } from "../utils/web3";
import { useWallet } from "../utils/WalletContext";
import { useTransaction } from "../utils/useTransaction";
import RequireWallet from "./RequireWallet";
import StatusMessage from "./StatusMessage";
import StatTile from "./StatTile";

const StakeTokens = () => {
  const [amount, setAmount] = useState("");
  const { stats } = useWallet();
  const { run, status, pending } = useTransaction();

  const apr = stats.stakingRewardRate / 100;
  const yearlyEstimate = amount > 0 ? (Number(amount) * apr) / 100 : 0;
  const hasStake = stats.staked && !stats.staked.isZero();
  const hasRewards = stats.pendingRewards && !stats.pendingRewards.isZero();

  const stakeTokens = async () => {
    if (!amount || Number(amount) <= 0) return;
    const ok = await run(({ token }) => token.stakeTokens(parseTokens(amount)), "Tokens staked successfully!");
    if (ok) setAmount("");
  };

  return (
    <div className="page">
      <RequireWallet>
        <div className="card">
          <h3>Stake Tokens</h3>
          <div className="stats">
            <StatTile label="Your Stake" value={`${displayTokens(stats.staked)} ENG`} />
            <StatTile label="Pending Rewards" value={`${displayTokens(stats.pendingRewards, 6)} ENG`} />
            <StatTile label="Reward Rate" value={`${apr}% APR`} />
            <StatTile label="Total Staked" value={`${displayTokens(stats.totalStaked, 0)} ENG`} />
          </div>
          <p className="muted">
            Minimum stake: {formatTokens(stats.minStake || 0)} ENG. Rewards accrue every second and can be
            claimed at any time, even after unstaking.
          </p>
          <input
            type="number"
            min="0"
            placeholder="Amount to stake"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {yearlyEstimate > 0 && (
            <p className="muted">Estimated rewards: ~{yearlyEstimate.toLocaleString()} ENG per year</p>
          )}
          <button onClick={stakeTokens} disabled={pending || !amount}>Stake</button>
          <button
            onClick={() => run(({ token }) => token.unstakeTokens(), "Tokens unstaked successfully!")}
            disabled={pending || !hasStake}
          >
            Unstake All
          </button>
          <button
            onClick={() => run(({ token }) => token.claimRewards(), "Rewards claimed!")}
            disabled={pending || !hasRewards}
          >
            Claim Rewards
          </button>
          <StatusMessage status={status} />
        </div>
      </RequireWallet>
    </div>
  );
};

export default StakeTokens;
