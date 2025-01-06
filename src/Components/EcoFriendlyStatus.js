import React, { useEffect, useState } from "react";
import { getContract } from "../utils/web3";

const EcoFriendlyStatus = () => {
  const [isEcoFriendly, setIsEcoFriendly] = useState(false);

  useEffect(() => {
    const checkEcoFriendly = async () => {
      const contract = getContract();
      const ecoFriendly = await contract.isEcoFriendly("Solar");
      setIsEcoFriendly(ecoFriendly);
    };
    checkEcoFriendly();
  }, []);

  return <div>Is Eco-Friendly: {isEcoFriendly ? "Yes" : "No"}</div>;
};

export default EcoFriendlyStatus;
