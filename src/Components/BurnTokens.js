import React, { useState } from "react";
import { getContract } from "../utils/web3";

const BurnTokens = () => {
  const [amount, setAmount] = useState("");

  const burnTokens = async () => {
    const contract = getContract();
    await contract.burn(amount);
    alert("Tokens burned successfully!");
  };

  return (
    <div>
      <h3>Burn Tokens</h3>
      <input
        type="number"
        placeholder="Amount to burn"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={burnTokens}>Burn</button>
    </div>
  );
};

export default BurnTokens;
