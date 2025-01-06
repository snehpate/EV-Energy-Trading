import React, { useState } from "react";
import { getContract } from "../utils/web3";

const TransferTokensWithFee = () => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const transferTokens = async () => {
    const contract = getContract();
    await contract.transfer(recipient, amount);
    alert("Tokens transferred with fee successfully!");
  };

  return (
    <div>
      <h3>Transfer Tokens with Fee</h3>
      <input
        type="text"
        placeholder="Recipient Address"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />
      <input
        type="number"
        placeholder="Amount to transfer"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={transferTokens}>Transfer</button>
    </div>
  );
};

export default TransferTokensWithFee;
