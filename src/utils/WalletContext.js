import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getContract, getErrorMessage } from "./web3";

const WalletContext = createContext(null);

const emptyStats = {
  balance: null,
  staked: null,
  energySource: "",
  userEnergySource: "",
  transferFee: null,
  ecoIncentive: null,
  minStake: null,
  paused: false,
  isAdmin: false,
};

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [stats, setStats] = useState(emptyStats);
  const [error, setError] = useState("");

  const loadStats = useCallback(async (c, addr) => {
    const [
      balance,
      staked,
      energySource,
      userEnergySource,
      transferFee,
      ecoIncentive,
      minStake,
      paused,
      adminRole,
    ] = await Promise.all([
      c.balanceOf(addr),
      c.stakedBalances(addr),
      c.energySource(),
      c.getUserEnergySource(addr),
      c.transferFeePercentage(),
      c.ecoIncentive(),
      c.MIN_STAKE(),
      c.paused(),
      c.ADMIN_ROLE(),
    ]);
    const isAdmin = await c.hasRole(adminRole, addr);
    setStats({
      balance,
      staked,
      energySource,
      userEnergySource,
      transferFee: transferFee.toNumber(),
      ecoIncentive,
      minStake,
      paused,
      isAdmin,
    });
  }, []);

  const connect = useCallback(async () => {
    try {
      setError("");
      const c = await getContract();
      const addr = await c.signer.getAddress();
      await loadStats(c, addr);
      setContract(c);
      setAccount(addr);
    } catch (err) {
      setContract(null);
      setAccount("");
      setStats(emptyStats);
      setError(getErrorMessage(err));
    }
  }, [loadStats]);

  const refresh = useCallback(async () => {
    if (contract && account) {
      try {
        await loadStats(contract, account);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    }
  }, [contract, account, loadStats]);

  // Reconnect when the user switches account or network in the wallet
  useEffect(() => {
    if (!window.ethereum?.on) return undefined;
    const handleChange = () => {
      if (account) connect();
    };
    window.ethereum.on("accountsChanged", handleChange);
    window.ethereum.on("chainChanged", handleChange);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleChange);
      window.ethereum.removeListener("chainChanged", handleChange);
    };
  }, [account, connect]);

  return (
    <WalletContext.Provider value={{ account, contract, stats, error, connect, refresh }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
