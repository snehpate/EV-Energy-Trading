import React, { useCallback, useEffect, useState } from "react";
import { useWallet } from "../utils/WalletContext";
import { CO2_KG_PER_KWH, ECO_SOURCES, displayTokens, getDeployment, getErrorMessage, shortAddress } from "../utils/web3";
import RequireWallet from "./RequireWallet";
import StatTile from "./StatTile";

// Horizontal bar chart: kWh traded per energy source (single series, direct labels, hover tooltip)
const SourceChart = ({ data }) => {
  const [hover, setHover] = useState(null);
  const max = Math.max(...data.map((d) => d.kwh), 1);
  const total = data.reduce((sum, d) => sum + d.kwh, 0);

  return (
    <div className="bar-chart" role="img" aria-label="Energy traded by source">
      {data.map((d) => (
        <div
          key={d.source}
          className="bar-row"
          onMouseEnter={() => setHover(d.source)}
          onMouseLeave={() => setHover(null)}
        >
          <span className="bar-label">{d.source}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(d.kwh / max) * 100}%` }} />
            {hover === d.source && (
              <div className="bar-tooltip">
                <strong>{d.source}</strong>: {d.kwh.toLocaleString()} kWh
                {total > 0 && ` (${((d.kwh / total) * 100).toFixed(1)}% of all trades)`}
              </div>
            )}
          </div>
          <span className="bar-value">{d.kwh.toLocaleString()} kWh</span>
        </div>
      ))}
    </div>
  );
};

const describe = (e, kwhByOrder) => {
  const a = e.args;
  switch (e.event) {
    case "ListingCreated":
      return `${shortAddress(a.seller)} listed ${a.kwh} kWh of ${a.energySource} at ${displayTokens(a.pricePerKwh)} ENG/kWh`;
    case "OrderPlaced":
      return `${shortAddress(a.buyer)} ordered ${a.kwh} kWh for ${displayTokens(a.totalPrice)} ENG`;
    case "OrderCompleted":
      return `Order #${a.orderId} delivered: ${kwhByOrder[a.orderId.toString()] || "?"} kWh, seller paid ${displayTokens(a.sellerAmount)} ENG`;
    case "OrderRefunded":
      return `Order #${a.orderId} refunded (${displayTokens(a.amount)} ENG)`;
    case "SellerRated":
      return `${shortAddress(a.seller)} received a ${a.rating}-star rating`;
    default:
      return e.event;
  }
};

const Analytics = () => {
  const { market, token, contracts, blockNumber } = useWallet();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!market) return;
    try {
      const fromBlock = getDeployment().deployBlock || 0;
      const [kwhTraded, volume, fees, orderCount, listingCount, supply, staked, bySource, events] =
        await Promise.all([
          market.totalKwhTraded(),
          market.totalVolume(),
          market.totalFeesCollected(),
          market.orderCount(),
          market.listingCount(),
          token.totalSupply(),
          token.totalStaked(),
          Promise.all(ECO_SOURCES.map((s) => market.kwhTradedBySource(s))),
          Promise.all(
            ["ListingCreated", "OrderPlaced", "OrderCompleted", "OrderRefunded", "SellerRated"].map((name) =>
              market.queryFilter(market.filters[name](), fromBlock)
            )
          ),
        ]);

      const all = events.flat();
      const kwhByOrder = {};
      all.filter((e) => e.event === "OrderPlaced").forEach((e) => {
        kwhByOrder[e.args.orderId.toString()] = e.args.kwh.toNumber();
      });

      // Leaderboard: delivered kWh per seller
      const sellers = {};
      all.filter((e) => e.event === "OrderCompleted").forEach((e) => {
        const s = e.args.seller;
        sellers[s] = sellers[s] || { seller: s, kwh: 0, earned: e.args.sellerAmount.mul(0) };
        sellers[s].kwh += kwhByOrder[e.args.orderId.toString()] || 0;
        sellers[s].earned = sellers[s].earned.add(e.args.sellerAmount);
      });
      const leaderboard = await Promise.all(
        Object.values(sellers)
          .sort((a, b) => b.kwh - a.kwh)
          .slice(0, 5)
          .map(async (s) => {
            const [avg, count] = await market.getSellerRating(s.seller);
            return { ...s, rating: avg.toNumber() / 100, ratingCount: count.toNumber() };
          })
      );

      const recent = all
        .sort((a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex)
        .slice(0, 12);
      const blocks = Object.fromEntries(
        await Promise.all(
          [...new Set(recent.map((e) => e.blockNumber))].map(async (n) => [n, await contracts.provider.getBlock(n)])
        )
      );

      setData({
        kwhTraded: kwhTraded.toNumber(),
        volume,
        fees,
        orderCount: orderCount.toNumber(),
        listingCount: listingCount.toNumber(),
        supply,
        staked,
        bySource: ECO_SOURCES.map((source, i) => ({ source, kwh: bySource[i].toNumber() })),
        leaderboard,
        activity: recent.map((e) => ({
          key: `${e.transactionHash}-${e.logIndex}`,
          time: new Date(blocks[e.blockNumber].timestamp * 1000),
          text: describe(e, kwhByOrder),
          type: e.event,
        })),
      });
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [market, token, contracts]);

  useEffect(() => {
    load();
  }, [load, blockNumber]);

  return (
    <div className="page page-wide">
      <RequireWallet>
        {error && <div className="card"><p className="status status-error">{error}</p></div>}
        {!data ? (
          <div className="card"><p>Loading analytics...</p></div>
        ) : (
          <>
            <div className="card">
              <h3>Marketplace Overview</h3>
              <div className="stats">
                <StatTile label="Energy Traded" value={`${data.kwhTraded.toLocaleString()} kWh`} />
                <StatTile label="Trading Volume" value={`${displayTokens(data.volume, 2)} ENG`} />
                <StatTile
                  label="CO₂ Avoided"
                  value={`${(data.kwhTraded * CO2_KG_PER_KWH).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`}
                  hint="Estimated vs. grid electricity"
                />
                <StatTile label="Orders / Listings" value={`${data.orderCount} / ${data.listingCount}`} />
                <StatTile label="Platform Fees" value={`${displayTokens(data.fees, 2)} ENG`} />
                <StatTile label="ENG Supply" value={displayTokens(data.supply, 0)} />
                <StatTile
                  label="Staked"
                  value={`${displayTokens(data.staked, 0)} ENG`}
                  hint={data.supply.isZero() ? "" : `${(data.staked.mul(10000).div(data.supply).toNumber() / 100).toFixed(2)}% of supply`}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="card">
                <h3>Energy Traded by Source</h3>
                <SourceChart data={data.bySource} />
              </div>

              <div className="card">
                <h3>Top Sellers</h3>
                {data.leaderboard.length === 0 ? (
                  <p className="muted">No completed trades yet.</p>
                ) : (
                  <table>
                    <thead><tr><th>Seller</th><th>Delivered</th><th>Earned</th><th>Rating</th></tr></thead>
                    <tbody>
                      {data.leaderboard.map((s) => (
                        <tr key={s.seller}>
                          <td>{shortAddress(s.seller)}</td>
                          <td>{s.kwh.toLocaleString()} kWh</td>
                          <td>{displayTokens(s.earned, 2)} ENG</td>
                          <td>{s.ratingCount ? `${s.rating.toFixed(1)} ★ (${s.ratingCount})` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="card">
              <h3>Recent Activity</h3>
              {data.activity.length === 0 ? (
                <p className="muted">No marketplace activity yet.</p>
              ) : (
                <ul className="activity">
                  {data.activity.map((a) => (
                    <li key={a.key}>
                      <span className={`pill pill-${a.type.toLowerCase()}`}>{a.type.replace(/([A-Z])/g, " $1").trim()}</span>
                      <span>{a.text}</span>
                      <span className="muted">{a.time.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </RequireWallet>
    </div>
  );
};

export default Analytics;
