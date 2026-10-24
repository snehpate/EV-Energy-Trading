import React, { useCallback, useEffect, useState } from "react";
import { useWallet } from "../utils/WalletContext";
import { useTransaction } from "../utils/useTransaction";
import { displayTokens, getErrorMessage, parseTokens } from "../utils/web3";
import RequireWallet from "./RequireWallet";
import StatusMessage from "./StatusMessage";
import EnergySourceSelect from "./EnergySourceSelect";

const SellEnergy = () => {
  const { market, account, stats, blockNumber } = useWallet();
  const { run, status, pending } = useTransaction();
  const [form, setForm] = useState({ kwh: "", price: "", source: "", location: "" });
  const [myListings, setMyListings] = useState([]);
  const [newPrices, setNewPrices] = useState({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!market || !account) return;
    try {
      setMyListings([...(await market.getSellerListings(account))].reverse());
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [market, account]);

  useEffect(() => {
    load();
  }, [load, blockNumber]);

  const update = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));
  const kwh = Math.floor(Number(form.kwh));
  const valid = kwh > 0 && Number(form.price) > 0 && form.source;
  const feePct = stats.market.platformFeeBps / 100;

  const createListing = async () => {
    const ok = await run(
      ({ market }) => market.createListing(kwh, parseTokens(form.price), form.source, form.location.trim()),
      "Listing created! It is now visible in the marketplace."
    );
    if (ok) setForm({ kwh: "", price: "", source: "", location: "" });
  };

  return (
    <div className="page">
      <RequireWallet>
        <div className="card">
          <h3>Sell Renewable Energy</h3>
          <p className="muted">
            List surplus energy from your solar panels, wind turbine or hydro plant. Buyers pay into escrow;
            you receive the payment minus a {feePct}% platform fee when they confirm the charge.
          </p>
          <input
            type="number"
            min="1"
            step="1"
            placeholder="Energy available (kWh)"
            value={form.kwh}
            onChange={(e) => update("kwh")(e.target.value)}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Price per kWh (ENG)"
            value={form.price}
            onChange={(e) => update("price")(e.target.value)}
          />
          <EnergySourceSelect value={form.source} onChange={update("source")} />
          <input
            type="text"
            placeholder="Charging location (e.g. Station 4, Main St)"
            value={form.location}
            maxLength={80}
            onChange={(e) => update("location")(e.target.value)}
          />
          {valid && (
            <p className="muted">
              Full sale value: {(kwh * Number(form.price)).toLocaleString()} ENG &middot; you receive ~
              {(kwh * Number(form.price) * (1 - feePct / 100)).toLocaleString()} ENG
            </p>
          )}
          <button onClick={createListing} disabled={pending || !valid}>Create Listing</button>
          <StatusMessage status={status} />
        </div>

        <div className="card">
          <h3>My Listings</h3>
          {error && <p className="status status-error">{error}</p>}
          {myListings.length === 0 ? (
            <p className="muted">You have no listings yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Location</th><th>Source</th><th>Sold</th><th>Price</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {myListings.map((l) => {
                    const id = l.id.toString();
                    return (
                      <tr key={id}>
                        <td>{id}</td>
                        <td>{l.location || "-"}</td>
                        <td>{l.energySource}</td>
                        <td>{l.totalKwh.sub(l.remainingKwh).toString()} / {l.totalKwh.toString()} kWh</td>
                        <td>{displayTokens(l.pricePerKwh)} ENG</td>
                        <td>{l.active ? "Active" : l.remainingKwh.isZero() ? "Sold out" : "Closed"}</td>
                        <td className="row-actions">
                          {l.active && (
                            <>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="New price"
                                value={newPrices[id] || ""}
                                onChange={(e) => setNewPrices((p) => ({ ...p, [id]: e.target.value }))}
                              />
                              <button
                                onClick={() =>
                                  run(
                                    ({ market }) => market.updateListingPrice(l.id, parseTokens(newPrices[id])),
                                    `Price of listing #${id} updated.`
                                  )
                                }
                                disabled={pending || !(Number(newPrices[id]) > 0)}
                              >
                                Update
                              </button>
                              <button
                                className="danger"
                                onClick={() => run(({ market }) => market.cancelListing(l.id), `Listing #${id} cancelled.`)}
                                disabled={pending}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </RequireWallet>
    </div>
  );
};

export default SellEnergy;
