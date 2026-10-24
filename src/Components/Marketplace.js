import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../utils/WalletContext";
import { useTransaction } from "../utils/useTransaction";
import { ECO_SOURCES, displayTokens, getErrorMessage, shortAddress } from "../utils/web3";
import RequireWallet from "./RequireWallet";
import StatusMessage from "./StatusMessage";
import Stars from "./Stars";

const sorters = {
  price: (a, b) => (a.pricePerKwh.lt(b.pricePerKwh) ? -1 : a.pricePerKwh.gt(b.pricePerKwh) ? 1 : 0),
  available: (a, b) => b.remainingKwh.toNumber() - a.remainingKwh.toNumber(),
  newest: (a, b) => b.id.toNumber() - a.id.toNumber(),
  rating: (a, b) => b.rating - a.rating,
};

const BuyPanel = ({ listing, onClose }) => {
  const { account, stats } = useWallet();
  const { run, status, pending } = useTransaction();
  const [kwh, setKwh] = useState("");

  const kwhNumber = Math.floor(Number(kwh));
  const valid = kwhNumber > 0 && kwhNumber <= listing.remainingKwh.toNumber();
  const total = valid ? listing.pricePerKwh.mul(kwhNumber) : null;
  const insufficient = total && stats.balance && total.gt(stats.balance);

  const buy = () =>
    run(async ({ token, market }, progress) => {
      const allowance = await token.allowance(account, market.address);
      if (allowance.lt(total)) {
        progress("Step 1/2: approve the ENG payment in your wallet...");
        await (await token.approve(market.address, total)).wait();
        progress("Step 2/2: confirm the purchase in your wallet...");
      }
      return market.buyEnergy(listing.id, kwhNumber, listing.pricePerKwh);
    }, `Order placed for ${kwhNumber} kWh! Payment is held in escrow until you confirm delivery in My Orders.`);

  return (
    <div className="card buy-panel">
      <h3>Buy from {listing.location || "listing #" + listing.id}</h3>
      <p className="muted">
        {listing.energySource} &middot; {displayTokens(listing.pricePerKwh)} ENG/kWh &middot;{" "}
        {listing.remainingKwh.toString()} kWh available
      </p>
      <input
        type="number"
        min="1"
        step="1"
        placeholder="kWh to buy"
        value={kwh}
        onChange={(e) => setKwh(e.target.value)}
      />
      {total && (
        <p>
          Total: <strong>{displayTokens(total)} ENG</strong>
          {insufficient && <span className="status status-error"> Insufficient balance</span>}
        </p>
      )}
      <button onClick={buy} disabled={pending || !valid || insufficient}>Buy Energy</button>
      <button className="secondary" onClick={onClose} disabled={pending}>Close</button>
      <StatusMessage status={status} />
    </div>
  );
};

const Marketplace = () => {
  const { market, account, blockNumber } = useWallet();
  const [listings, setListings] = useState([]);
  const [error, setError] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("price");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    if (!market) return;
    try {
      const count = (await market.listingCount()).toNumber();
      const all = count ? await market.getListings(0, count) : [];
      const active = all.filter((l) => l.active);
      const sellers = [...new Set(active.map((l) => l.seller))];
      const ratings = Object.fromEntries(
        await Promise.all(sellers.map(async (s) => [s, await market.getSellerRating(s)]))
      );
      setListings(
        active.map((l) => ({
          ...l,
          rating: ratings[l.seller][0].toNumber() / 100,
          ratingCount: ratings[l.seller][1].toNumber(),
        }))
      );
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [market]);

  useEffect(() => {
    load();
  }, [load, blockNumber]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return listings
      .filter((l) => !source || l.energySource === source)
      .filter((l) => !term || l.location.toLowerCase().includes(term))
      .sort(sorters[sortBy]);
  }, [listings, source, search, sortBy]);

  const selectedListing = selected !== null && listings.find((l) => l.id.toNumber() === selected);

  return (
    <div className="page page-wide">
      <RequireWallet>
        <div className="card">
          <h3>Energy Marketplace</h3>
          <p className="muted">
            Buy renewable charging energy directly from producers. Payments stay in escrow until you
            confirm delivery.
          </p>
          <div className="filters">
            <input
              type="text"
              placeholder="Search location"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">All sources</option>
              {ECO_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="price">Lowest price</option>
              <option value="available">Most available</option>
              <option value="rating">Best rated</option>
              <option value="newest">Newest</option>
            </select>
          </div>
          {error && <p className="status status-error">{error}</p>}
        </div>

        {selectedListing && (
          <BuyPanel key={selected} listing={selectedListing} onClose={() => setSelected(null)} />
        )}

        {visible.length === 0 ? (
          <div className="card"><p>No energy listings match. Be the first to <Link to="/sell">sell energy</Link>!</p></div>
        ) : (
          <div className="listing-grid">
            {visible.map((l) => {
              const own = l.seller.toLowerCase() === account.toLowerCase();
              const soldPct = 100 - (l.remainingKwh.toNumber() / l.totalKwh.toNumber()) * 100;
              return (
                <div className="card listing" key={l.id.toString()}>
                  <span className={`badge badge-${l.energySource.toLowerCase()}`}>{l.energySource}</span>
                  <h4>{l.location || `Listing #${l.id}`}</h4>
                  <p className="price">{displayTokens(l.pricePerKwh)} ENG <span className="muted">/ kWh</span></p>
                  <p className="muted">
                    {l.remainingKwh.toString()} of {l.totalKwh.toString()} kWh available
                  </p>
                  <div className="progress" title={`${soldPct.toFixed(0)}% sold`}>
                    <div style={{ width: `${soldPct}%` }} />
                  </div>
                  <p className="muted">
                    Seller {own ? "You" : shortAddress(l.seller)} <Stars value={l.rating} count={l.ratingCount} />
                  </p>
                  <button onClick={() => setSelected(l.id.toNumber())} disabled={own}>
                    {own ? "Your listing" : "Buy"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </RequireWallet>
    </div>
  );
};

export default Marketplace;
