import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getContracts, getErrorMessage, switchNetwork as requestSwitch } from "./web3";

const WalletContext = createContext(null);

const emptyStats = {
  balance: null,
  staked: null,
  pendingRewards: null,
  stakingRewardRate: 0,
  totalStaked: null,
  energySource: "",
  userEnergySource: "",
  transferFee: null,
  ecoIncentive: null,
  minStake: null,
  paused: false,
  isAdmin: false,
  market: {
    kwhSold: 0,
    kwhBought: 0,
    earned: null,
    spent: null,
    rating: 0,
    ratingCount: 0,
    platformFeeBps: 0,
    deliveryWindow: 0,
    paused: false,
  },
  faucet: null, // { dripAmount, waitSeconds } on networks with a faucet
};

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState("");
  const [contracts, setContracts] = useState(null);
  const [stats, setStats] = useState(emptyStats);
  const [blockNumber, setBlockNumber] = useState(0);
  const [error, setError] = useState("");
  const loading = useRef(false);

  const [wrongNetwork, setWrongNetwork] = useState(false);

  const loadStats = useCallback(async ({ token, market, faucet }, addr) => {
    const [
      balance,
      staked,
      pendingRewards,
      stakingRewardRate,
      totalStaked,
      energySource,
      userEnergySource,
      transferFee,
      ecoIncentive,
      minStake,
      paused,
      isAdmin,
      userStats,
      [rating, ratingCount],
      platformFeeBps,
      deliveryWindow,
      marketPaused,
    ] = await Promise.all([
      token.balanceOf(addr),
      token.stakedBalances(addr),
      token.pendingRewards(addr),
      token.stakingRewardRate(),
      token.totalStaked(),
      token.energySource(),
      token.getUserEnergySource(addr),
      token.transferFeePercentage(),
      token.ecoIncentive(),
      token.MIN_STAKE(),
      token.paused(),
      token.ADMIN_ROLE().then((role) => token.hasRole(role, addr)),
      market.userStats(addr),
      market.getSellerRating(addr),
      market.platformFeeBps(),
      market.deliveryWindow(),
      market.paused(),
    ]);
    const faucetStats = faucet
      ? await Promise.all([
          faucet.dripAmount(),
          faucet.nextClaimTime(addr),
          faucet.provider.getBlock("latest"),
        ]).then(([dripAmount, next, block]) => ({
          dripAmount,
          // seconds until the next claim, measured in chain time
          waitSeconds: next.toNumber() - block.timestamp,
        }))
      : null;
    setStats({
      balance,
      staked,
      pendingRewards,
      stakingRewardRate: stakingRewardRate.toNumber(),
      totalStaked,
      energySource,
      userEnergySource,
      transferFee: transferFee.toNumber(),
      ecoIncentive,
      minStake,
      paused,
      isAdmin,
      market: {
        kwhSold: userStats.kwhSold.toNumber(),
        kwhBought: userStats.kwhBought.toNumber(),
        earned: userStats.earned,
        spent: userStats.spent,
        rating: rating.toNumber() / 100,
        ratingCount: ratingCount.toNumber(),
        platformFeeBps: platformFeeBps.toNumber(),
        deliveryWindow: deliveryWindow.toNumber(),
        paused: marketPaused,
      },
      faucet: faucetStats,
    });
  }, []);

  const connect = useCallback(async () => {
    try {
      setError("");
      setWrongNetwork(false);
      const c = await getContracts();
      const addr = await c.signer.getAddress();
      await loadStats(c, addr);
      setContracts(c);
      setAccount(addr);
      setBlockNumber(await c.provider.getBlockNumber());
    } catch (err) {
      setContracts(null);
      setAccount("");
      setStats(emptyStats);
      setWrongNetwork(err?.name === "WrongNetworkError");
      setError(getErrorMessage(err));
    }
  }, [loadStats]);

  const switchNetwork = useCallback(async () => {
    try {
      await requestSwitch();
      await connect();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [connect]);

  const refresh = useCallback(async () => {
    if (!contracts || !account || loading.current) return;
    loading.current = true;
    try {
      await loadStats(contracts, account);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      loading.current = false;
    }
  }, [contracts, account, loadStats]);

  // Live updates: reload balances whenever a new block is mined
  useEffect(() => {
    if (!contracts) return undefined;
    const onBlock = (n) => {
      setBlockNumber(n);
      refresh();
    };
    contracts.provider.on("block", onBlock);
    return () => contracts.provider.off("block", onBlock);
  }, [contracts, refresh]);

  // Reconnect when the user switches account or network in the wallet
  useEffect(() => {
    if (!window.ethereum?.on) return undefined;
    const handleChange = () => {
      if (account || wrongNetwork) connect();
    };
    window.ethereum.on("accountsChanged", handleChange);
    window.ethereum.on("chainChanged", handleChange);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleChange);
      window.ethereum.removeListener("chainChanged", handleChange);
    };
  }, [account, wrongNetwork, connect]);

  return (
    <WalletContext.Provider
      value={{
        account,
        contracts,
        token: contracts?.token,
        market: contracts?.market,
        faucet: contracts?.faucet,
        deployment: contracts?.deployment,
        wrongNetwork,
        switchNetwork,
        stats,
        blockNumber,
        error,
        connect,
        refresh,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
