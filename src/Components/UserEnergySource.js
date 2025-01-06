import React, { useState } from "react";
import { getContract } from "../utils/web3";

const UserEnergySource = () => {
  const [source, setSource] = useState("");

  const setUserSource = async () => {
    const contract = getContract();
    await contract.setUserEnergySource(source);
    alert("User energy source set successfully!");
  };

  return (
    <div>
      <h3>Set Your Energy Source</h3>
      <input
        type="text"
        placeholder="Energy Source"
        value={source}
        onChange={(e) => setSource(e.target.value)}
      />
      <button onClick={setUserSource}>Set Source</button>
    </div>
  );
};

export default UserEnergySource;
