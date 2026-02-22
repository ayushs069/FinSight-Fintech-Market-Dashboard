// src/components/MarketHeatmap.jsx
import { useEffect, useState } from "react";
import axios from "axios";

export default function MarketHeatmap() {
  const [movers, setMovers] = useState([]);
  const [date, setDate] = useState(null);
  const [loading, setLoading] = useState(true);

  const backend = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

  useEffect(() => {
    async function fetchMovers() {
      try {
        const res = await axios.get(`${backend}/api/market-movers`);
        const { gainers = [], losers = [], date } = res.data || {};

        // combine gainers + losers into one list for the heatmap
        const combined = [...gainers, ...losers];
        setMovers(combined);
        setDate(date || null);
      } catch (err) {
        console.error("market movers fetch error", err);
      } finally {
        setLoading(false);
      }
    }

    fetchMovers();
  }, [backend]);

  function getTileBg(pct) {
    if (pct >= 4) return "bg-green-600";
    if (pct > 0) return "bg-green-500";
    if (pct === 0) return "bg-gray-600";
    if (pct > -4) return "bg-red-500";
    return "bg-red-600";
  }

  return (
    <div className="bg-[#1B2029] p-4 rounded-lg mt-2">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-sm text-gray-400">Market Heatmap</h2>
          <p className="text-xs text-gray-500">
            Color-coded snapshot of top gainers & losers.
          </p>
        </div>
        {date && (
          <div className="text-xs text-gray-500">
            As of: <span className="text-gray-300">{date}</span>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading market data…</p>
      ) : movers.length === 0 ? (
        <p className="text-sm text-gray-500">No market data available.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {movers.map((m, idx) => (
            <div
              key={`${m.symbol}-${idx}`}
              className={`rounded-md p-2 text-xs text-white ${getTileBg(
                m.pct_change
              )}`}
            >
              <div className="font-semibold truncate">{m.symbol}</div>
              <div className="mt-1">
                {m.pct_change >= 0 ? "+" : ""}
                {m.pct_change.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
