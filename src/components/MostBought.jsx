// src/components/MostBought.jsx
import { useEffect, useState } from "react";
import axios from "axios";

const backend = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const SECTOR_COLORS = {
  "IT":               "bg-blue-600/20 text-blue-300",
  "Finance":          "bg-emerald-600/20 text-emerald-300",
  "Oil & Gas":        "bg-orange-600/20 text-orange-300",
  "Auto":             "bg-yellow-600/20 text-yellow-300",
  "Healthcare":       "bg-rose-600/20 text-rose-300",
  "FMCG":             "bg-purple-600/20 text-purple-300",
  "Metal":            "bg-gray-500/20 text-gray-300",
  "Power":            "bg-cyan-600/20 text-cyan-300",
  "Telecom":          "bg-pink-600/20 text-pink-300",
  "Construction":     "bg-amber-600/20 text-amber-300",
  "Consumer Durables":"bg-indigo-600/20 text-indigo-300",
  "Services":         "bg-teal-600/20 text-teal-300",
};

export default function MostBought() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${backend}/api/most-bought`)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const topStocks = data?.top_stocks || [];

  return (
    <div className="bg-[#1B2029] p-4 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Most Active on NIFTY 50</h3>
          <p className="text-xs text-gray-500 mt-0.5">Top stocks by volume — live data</p>
        </div>
        {data?.date && (
          <span className="text-[10px] text-gray-500">as of {data.date}</span>
        )}
      </div>

      {/* #1 most bought — big hero card */}
      {data?.symbol && (
        <div className="flex items-center justify-between bg-[#242A36] rounded-lg px-4 py-3 mb-3 border border-blue-800/40">
          <div>
            <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-0.5">🔥 Highest Volume</p>
            <p className="text-base font-bold text-white">{data.symbol}</p>
            <p className="text-xs text-gray-400">{data.name || data.symbol}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-white">₹{Number(data.ltp).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
            <p className={`text-sm font-medium ${data.pct_change >= 0 ? "text-green-400" : "text-red-400"}`}>
              {data.pct_change >= 0 ? "+" : ""}{Number(data.pct_change).toFixed(2)}%
            </p>
            {data.volume > 0 && (
              <p className="text-[10px] text-gray-500">{(data.volume / 1e5).toFixed(1)}L shares</p>
            )}
          </div>
        </div>
      )}

      {/* Top 8 grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-[#242A36] rounded-lg p-3 animate-pulse h-16" />
          ))}
        </div>
      ) : topStocks.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {topStocks.map((s, i) => {
            const up = s.pct_change >= 0;
            const sectorClass = SECTOR_COLORS[s.sector] || "bg-gray-700/20 text-gray-400";
            return (
              <div key={i} className="bg-[#242A36] rounded-lg p-3 hover:bg-[#2d3548] transition-colors cursor-default">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-100 truncate">{s.symbol}</p>
                    <p className="text-[10px] text-gray-500 truncate leading-tight">{s.name}</p>
                  </div>
                  <span className={`text-[9px] px-1 py-0.5 rounded shrink-0 leading-tight ${sectorClass}`}>
                    {s.sector?.split(" ")[0]}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1.5">
                  <p className="text-sm font-medium text-white">₹{Number(s.ltp).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                  <p className={`text-xs font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
                    {up ? "+" : ""}{Number(s.pct_change).toFixed(2)}%
                  </p>
                </div>
                {s.volume > 0 && (
                  <p className="text-[9px] text-gray-600 mt-0.5">{(s.volume / 1e5).toFixed(1)}L vol</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No live data available</p>
      )}
    </div>
  );
}
