import React from "react";
import { useWallet } from "../utils/WalletContext";
import { useTransaction } from "../utils/useTransaction";
import { displayTokens, formatDuration } from "../utils/web3";
import StatusMessage from "./StatusMessage";

// Test networks only: lets anyone claim free ENG to try the marketplace
const FaucetCard = () => {
  const { stats, faucet } = useWallet();
  const { run, status, pending } = useTransaction();
  if (!faucet || !stats.faucet) return null;

  const { waitSeconds } = stats.faucet;
  const canClaim = waitSeconds <= 0;

  return (
    <div className="card">
      <h3>Test Tokens</h3>
      <p className="muted">
        This is a test network. Claim {displayTokens(stats.faucet.dripAmount)} free ENG once a day to try buying,
        selling and staking. You also need a little test ETH for gas from a Sepolia faucet.
      </p>
      <button
        onClick={() => run(({ faucet }) => faucet.claim(), `${displayTokens(stats.faucet.dripAmount)} ENG added to your wallet!`)}
        disabled={pending || !canClaim}
      >
        {canClaim ? "Claim Free ENG" : `Next claim in ${formatDuration(waitSeconds)}`}
      </button>
      <StatusMessage status={status} />
    </div>
  );
};

export default FaucetCard;
