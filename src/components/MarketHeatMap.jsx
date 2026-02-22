// src/components/MarketHeatmap.jsx
import { useEffect, useState } from "react";
import axios from "axios";

const backend = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

function getTileBg(pct) {
  if (pct >= 4) return "bg-green-700";
  if (pct >= 2) return "bg-green-600";
  if (pct > 0) return "bg-green-500";
  if (pct === 0) return "bg-gray-600";
  if (pct > -2) return "bg-red-500";
  if (pct > -4) return "bg-red-600";
  return "bg-red-700";
}

export default function MarketHeatmap() {
  const [movers, setMovers] = useState([]);
  const [date, setDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${backend}/api/market-movers`)
      .then((res) => {
        const { gainers = [], losers = [], date } = res.data || {};
        // Merge gainers + losers deduplicated by symbol
        const seen = new Set();
        const combined = [];
        [...gainers, ...losers].forEach((m) => {
          if (!seen.has(m.symbol)) {
            seen.add(m.symbol);
            combined.push(m);
          }
        });
        // Sort by absolute % change so biggest movers are first
        combined.sort(
          (a, b) => Math.abs(b.pct_change) - Math.abs(a.pct_change)
        );
        setMovers(combined);
        setDate(date || null);
      })
      .catch((err) => console.error("market movers fetch error", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-[#1B2029] p-4 rounded-lg mt-2">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Market Heatmap</h2>
          <p className="text-xs text-gray-500">
            Color-coded by daily % change — all 31 NIFTY stocks
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          {date && <span>as of {date}</span>}
          <span className="text-green-400">● Live</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/*
          <div key={l.label} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded-sm ${l.color}`}></span>
            <span className="text-[10px] text-gray-400">{l.label}</span>
          </div>
        */}
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-700"></span>
          <span className="text-[10px] text-gray-400">{" > +4%"}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-600"></span>
          <span className="text-[10px] text-gray-400">{" 0 to +4%"}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-600"></span>
          <span className="text-[10px] text-gray-400">{" 0%"}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-500"></span>
          <span className="text-[10px] text-gray-400">{" 0 to -4%"}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-700"></span>
          <span className="text-[10px] text-gray-400">{" < -4%"}</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {Array(12)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="rounded-md p-2 h-14 bg-gray-700 animate-pulse"
              />
            ))}
        </div>
      ) : movers.length === 0 ? (
        <p className="text-sm text-gray-500">No market data available.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {movers.map((m, idx) => (
            <div
              key={`${m.symbol}-${idx}`}
              className={`rounded-md p-2 text-white cursor-default transition-transform hover:scale-105 ${getTileBg(
                m.pct_change
              )}`}
              title={`${m.name || m.symbol}\n₹${m.ltp} | ${
                m.pct_change >= 0 ? "+" : ""
              }${m.pct_change.toFixed(2)}%`}
            >
              <div className="text-[11px] font-bold truncate">{m.symbol}</div>
              {m.name && (
                <div className="text-[9px] opacity-75 truncate leading-tight">
                  {m.name.split(" ").slice(0, 2).join(" ")}
                </div>
              )}
              <div className="text-xs mt-1 font-semibold">
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
