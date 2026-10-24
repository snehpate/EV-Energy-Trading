import React, { useState } from "react";
import { parseTokens } from "../utils/web3";
import { useWallet } from "../utils/WalletContext";
import { useTransaction } from "../utils/useTransaction";
import RequireWallet from "./RequireWallet";
import StatusMessage from "./StatusMessage";

const BurnTokens = () => {
  const [amount, setAmount] = useState("");
  const { stats } = useWallet();
  const { run, status, pending } = useTransaction();

  const burnTokens = async () => {
    if (!amount || Number(amount) <= 0) return;
    const ok = await run((c) => c.burn(parseTokens(amount)), "Tokens burned successfully!");
    if (ok) setAmount("");
  };

  return (
    <div className="page">
      <RequireWallet>
        <div className="card">
          <h3>Burn Tokens</h3>
          {!stats.isAdmin && <p className="muted">Only admins can burn tokens.</p>}
          <input
            type="number"
            min="0"
            placeholder="Amount to burn"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button onClick={burnTokens} disabled={pending || !amount || !stats.isAdmin}>Burn</button>
          <StatusMessage status={status} />
        </div>
      </RequireWallet>
    </div>
  );
};

export default BurnTokens;
