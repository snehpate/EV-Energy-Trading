import React, { useCallback, useEffect, useState } from "react";
import { useWallet } from "../utils/WalletContext";
import { useTransaction } from "../utils/useTransaction";
import { displayTokens, formatDuration, getErrorMessage, shortAddress } from "../utils/web3";
import RequireWallet from "./RequireWallet";
import StatusMessage from "./StatusMessage";
import Stars from "./Stars";

const STATUS = ["Pending", "Completed", "Refunded"];

const Orders = () => {
  const { market, contracts, account, stats, blockNumber } = useWallet();
  const { run, status, pending } = useTransaction();
  const [tab, setTab] = useState("purchases");
  const [orders, setOrders] = useState({ purchases: [], sales: [] });
  const [listings, setListings] = useState({});
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!market || !account) return;
    try {
      const [purchases, sales, block] = await Promise.all([
        market.getBuyerOrders(account),
        market.getSellerOrders(account),
        contracts.provider.getBlock("latest"),
      ]);
      const ids = [...new Set([...purchases, ...sales].map((o) => o.listingId.toNumber()))];
      const fetched = await Promise.all(ids.map((id) => market.getListing(id)));
      setListings(Object.fromEntries(fetched.map((l) => [l.id.toNumber(), l])));
      setOrders({ purchases: [...purchases].reverse(), sales: [...sales].reverse() });
      setNow(block.timestamp);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [market, contracts, account]);

  useEffect(() => {
    load();
  }, [load, blockNumber]);

  const deliveryWindow = stats.market.deliveryWindow;
  const list = orders[tab];

  const actionsFor = (o) => {
    const id = o.id.toString();
    const state = STATUS[o.status];
    if (tab === "purchases") {
      if (state === "Pending") {
        return (
          <button onClick={() => run(({ market }) => market.confirmDelivery(o.id), `Order #${id} confirmed. Payment released to the seller.`)} disabled={pending}>
            Confirm Delivery
          </button>
        );
      }
      if (state === "Completed" && o.rating === 0) {
        return <Stars onRate={(r) => run(({ market }) => market.rateSeller(o.id, r), `Thanks! You rated order #${id} ${r} stars.`)} disabled={pending} />;
      }
      if (o.rating > 0) return <Stars value={o.rating} />;
      return null;
    }
    if (state !== "Pending") return o.rating > 0 ? <Stars value={o.rating} /> : null;
    const claimableIn = o.createdAt.toNumber() + deliveryWindow - now;
    return (
      <>
        <button
          onClick={() => run(({ market }) => market.claimPayment(o.id), `Payment for order #${id} claimed.`)}
          disabled={pending || claimableIn > 0}
          title={claimableIn > 0 ? `Claimable in ${formatDuration(claimableIn)} if the buyer does not confirm` : ""}
        >
          {claimableIn > 0 ? `Claim in ${formatDuration(claimableIn)}` : "Claim Payment"}
        </button>
        <button className="danger" onClick={() => run(({ market }) => market.refundOrder(o.id), `Order #${id} refunded.`)} disabled={pending}>
          Refund
        </button>
      </>
    );
  };

  return (
    <div className="page page-wide">
      <RequireWallet>
        <div className="card">
          <h3>My Orders</h3>
          <div className="tabs">
            <button className={tab === "purchases" ? "tab active" : "tab"} onClick={() => setTab("purchases")}>
              Purchases ({orders.purchases.length})
            </button>
            <button className={tab === "sales" ? "tab active" : "tab"} onClick={() => setTab("sales")}>
              Sales ({orders.sales.length})
            </button>
          </div>
          <p className="muted">
            {tab === "purchases"
              ? "Confirm delivery once your EV has charged to release the escrowed payment, then rate the seller."
              : `If a buyer does not confirm within ${formatDuration(deliveryWindow)}, you can claim the payment. Refund orders you cannot deliver.`}
          </p>
          {error && <p className="status status-error">{error}</p>}
          {list.length === 0 ? (
            <p className="muted">No {tab} yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Location</th><th>Energy</th><th>Total</th>
                    <th>{tab === "purchases" ? "Seller" : "Buyer"}</th><th>Status</th><th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((o) => {
                    const listing = listings[o.listingId.toNumber()];
                    return (
                      <tr key={o.id.toString()}>
                        <td>{o.id.toString()}</td>
                        <td>{listing?.location || `Listing #${o.listingId}`}</td>
                        <td>{o.kwh.toString()} kWh {listing?.energySource}</td>
                        <td>{displayTokens(o.totalPrice)} ENG</td>
                        <td>{shortAddress(tab === "purchases" ? o.seller : o.buyer)}</td>
                        <td><span className={`pill pill-${STATUS[o.status].toLowerCase()}`}>{STATUS[o.status]}</span></td>
                        <td className="row-actions">{actionsFor(o)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <StatusMessage status={status} />
        </div>
      </RequireWallet>
    </div>
  );
};

export default Orders;
