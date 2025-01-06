import React, { useState } from "react";
import { getContract } from "../utils/web3";

const EnergySource = () => {
  const [source, setSource] = useState("");

  const setEnergySource = async () => {
    const contract = getContract();
    await contract.setEnergySource(source);
    alert("Energy source updated successfully!");
  };

  return (
    <div>
      <h3>Set Energy Source</h3>
      <input
        type="text"
        placeholder="Energy Source"
        value={source}
        onChange={(e) => setSource(e.target.value)}
      />
      <button onClick={setEnergySource}>Update</button>
    </div>
  );
};

export default EnergySource;
