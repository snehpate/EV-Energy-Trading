import React, { useState } from "react";
import { ethers } from "ethers";
import { parseTokens } from "../utils/web3";
import { useWallet } from "../utils/WalletContext";
import { useTransaction } from "../utils/useTransaction";
import RequireWallet from "./RequireWallet";
import StatusMessage from "./StatusMessage";

const TransferTokensWithFee = () => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const { stats } = useWallet();
  const { run, status, pending } = useTransaction();

  const validRecipient = ethers.utils.isAddress(recipient);
  const fee = amount > 0 ? (Number(amount) * stats.transferFee) / 100 : 0;

  const transferTokens = async () => {
    if (!validRecipient || !amount || Number(amount) <= 0) return;
    const ok = await run(
      ({ token }) => token.transfer(recipient, parseTokens(amount)),
      "Tokens transferred with fee successfully!"
    );
    if (ok) setAmount("");
  };

  return (
    <div className="page">
      <RequireWallet>
        <div className="card">
          <h3>Transfer Tokens with Fee</h3>
          <input
            type="text"
            placeholder="Recipient Address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
          />
          <input
            type="number"
            min="0"
            placeholder="Amount to transfer"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {recipient && !validRecipient && <p className="status status-error">Invalid address.</p>}
          {amount > 0 && (
            <p className="muted">
              Fee ({stats.transferFee}%, burned): {fee} ENG &middot; Recipient receives:{" "}
              {Number(amount) - fee} ENG
            </p>
          )}
          <button onClick={transferTokens} disabled={pending || !validRecipient || !amount}>
            Transfer
          </button>
          <StatusMessage status={status} />
        </div>
      </RequireWallet>
    </div>
  );
};

export default TransferTokensWithFee;
