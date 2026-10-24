import { useState } from "react";
import { getErrorMessage } from "./web3";
import { useWallet } from "./WalletContext";

// Runs one or more contract writes, waits for them to be mined and tracks status for the UI.
// `send` receives { token, market } plus a progress(message) callback for multi-step flows,
// and returns the final transaction.
export const useTransaction = () => {
  const { contracts, refresh } = useWallet();
  const [status, setStatus] = useState({ type: "", message: "" });
  const [pending, setPending] = useState(false);

  const run = async (send, successMessage) => {
    if (!contracts) {
      setStatus({ type: "error", message: "Connect your wallet first." });
      return false;
    }
    setPending(true);
    setStatus({ type: "info", message: "Waiting for confirmation..." });
    try {
      const tx = await send(contracts, (message) => setStatus({ type: "info", message }));
      if (tx?.wait) await tx.wait();
      setStatus({ type: "success", message: successMessage });
      await refresh();
      return true;
    } catch (err) {
      setStatus({ type: "error", message: getErrorMessage(err) });
      return false;
    } finally {
      setPending(false);
    }
  };

  return { run, status, pending, setStatus };
};
