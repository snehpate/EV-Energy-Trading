import React, { useState } from "react";
import { getContract } from "../utils/web3";

const StakeTokens = () => {
  const [amount, setAmount] = useState("");

  const stakeTokens = async () => {
    const contract = getContract();
    await contract.stakeTokens(amount);
    alert("Tokens staked successfully!");
  };

  return (
    <div>
      <h3>Stake Tokens</h3>
      <input
        type="number"
        placeholder="Amount to stake"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={stakeTokens}>Stake</button>
    </div>
  );
};

export default StakeTokens;
