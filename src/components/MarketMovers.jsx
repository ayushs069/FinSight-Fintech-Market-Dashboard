import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const backend = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

function fmtVol(v) {
  if (!v) return "—";
  if (v >= 1e7) return (v / 1e7).toFixed(1) + " Cr";
  return (v / 1e5).toFixed(1) + " L";
}

function StockTable({ data, isGainer }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-gray-300 min-w-[480px]">
        <thead>
          <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
            <th className="py-2 text-left w-6">#</th>
            <th className="py-2 text-left">Symbol</th>
            <th className="py-2 text-left">Company</th>
            <th className="py-2 text-right">LTP</th>
            <th className="py-2 text-right">Change %</th>
            <th className="py-2 text-right">High</th>
            <th className="py-2 text-right">Low</th>
            <th className="py-2 text-right">Volume</th>
          </tr>
        </thead>
        <tbody>
          {data.map((g, idx) => (
            <tr
              key={idx}
              className="border-b border-gray-800 hover:bg-[#242A36] transition-colors"
            >
              <td className="py-2 text-xs text-gray-600">{idx + 1}</td>
              <td className="py-2 font-mono font-semibold text-blue-300">{g.symbol}</td>
              <td className="py-2 text-xs text-gray-400 max-w-[140px] truncate">
                {g.name || g.symbol}
              </td>
              <td className="py-2 text-right font-medium">
                Rs.{Number(g.ltp).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </td>
              <td
                className={
                  "py-2 text-right font-semibold " +
                  (isGainer ? "text-green-400" : "text-red-400")
                }
              >
                {isGainer ? "+" : ""}
                {Number(g.pct_change).toFixed(2)}%
              </td>
              <td className="py-2 text-right text-gray-400 text-xs">
                {g.high ? "Rs." + Number(g.high).toFixed(0) : "—"}
              </td>
              <td className="py-2 text-right text-gray-400 text-xs">
                {g.low ? "Rs." + Number(g.low).toFixed(0) : "—"}
              </td>
              <td className="py-2 text-right text-gray-400 text-xs">
                {fmtVol(g.volume)}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={8} className="py-4 text-center text-gray-500">
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function MarketMovers() {
  const [movers, setMovers] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("gainers");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const [movRes, insRes] = await Promise.all([
          axios.get(backend + "/api/market-movers"),
          axios.get(backend + "/api/market-insights"),
        ]);
        setMovers(movRes.data);
        setInsights(insRes.data);
      } catch (err) {
        console.error("Market movers error", err);
        setError("Failed to load market data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-8 text-gray-400">
        <div className="w-5 h-5 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        Loading live market data...
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-400">{error}</div>;
  }

  if (!movers) {
    return <div className="p-4 text-gray-400">No data available.</div>;
  }

  const gainers = movers.gainers || [];
  const losers = movers.losers || [];
  const date = movers.date;
  const breadth = insights ? insights.breadth : null;
  const sectors = insights ? insights.sectors || [] : [];
  const momentum = insights ? insights.momentum || [] : [];
  const adRatio = breadth ? Number(breadth.adv_decl_ratio || 0) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-[#1B2029] border border-gray-800 p-5 rounded-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-white">Market Movers</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Top gainers and losers — live yfinance data
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400 animate-pulse">&#9679; LIVE</span>
            {date && <span className="text-gray-500">as of {date}</span>}
          </div>
        </div>
      </div>

      {/* Breadth cards */}
      {breadth && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#1B2029] border border-gray-800 p-4 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Advancers</p>
            <p className="text-2xl font-bold text-green-400">{breadth.advancers}</p>
          </div>
          <div className="bg-[#1B2029] border border-gray-800 p-4 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Decliners</p>
            <p className="text-2xl font-bold text-red-400">{breadth.decliners}</p>
          </div>
          <div className="bg-[#1B2029] border border-gray-800 p-4 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Unchanged</p>
            <p className="text-2xl font-bold text-gray-300">{breadth.unchanged}</p>
          </div>
          <div className="bg-[#1B2029] border border-gray-800 p-4 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">A/D Ratio</p>
            <p
              className={
                "text-2xl font-bold " +
                (adRatio >= 1 ? "text-green-400" : "text-red-400")
              }
            >
              {breadth.adv_decl_ratio
                ? Number(breadth.adv_decl_ratio).toFixed(2)
                : "N/A"}
            </p>
            <p className="text-[10px] text-gray-600 mt-0.5">
              {adRatio >= 1 ? "Bullish breadth" : "Bearish breadth"}
            </p>
          </div>
        </div>
      )}

      {/* Gainers / Losers tabs */}
      <div className="bg-[#1B2029] border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setTab("gainers")}
            className={
              "flex-1 py-2.5 text-sm font-medium transition-all " +
              (tab === "gainers"
                ? "text-green-400 border-b-2 border-green-500 bg-green-900/10"
                : "text-gray-400 hover:text-white")
            }
          >
            Top Gainers ({gainers.length})
          </button>
          <button
            onClick={() => setTab("losers")}
            className={
              "flex-1 py-2.5 text-sm font-medium transition-all " +
              (tab === "losers"
                ? "text-red-400 border-b-2 border-red-500 bg-red-900/10"
                : "text-gray-400 hover:text-white")
            }
          >
            Top Losers ({losers.length})
          </button>
        </div>
        <div className="p-4">
          {tab === "gainers" ? (
            <StockTable data={gainers} isGainer={true} />
          ) : (
            <StockTable data={losers} isGainer={false} />
          )}
        </div>
      </div>

      {/* Sector rotation + Momentum */}
      {(sectors.length > 0 || momentum.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {sectors.length > 0 && (
            <div className="bg-[#1B2029] border border-gray-800 p-4 rounded-xl">
              <h2 className="text-base font-semibold text-white mb-3">
                Sector Rotation
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-300">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
                      <th className="py-1.5 text-left">Sector</th>
                      <th className="py-1.5 text-right text-green-400">Up</th>
                      <th className="py-1.5 text-right text-red-400">Down</th>
                      <th className="py-1.5 text-right">Avg %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sectors]
                      .sort((a, b) => b.avg_move - a.avg_move)
                      .map((s, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-800 hover:bg-[#242A36]"
                        >
                          <td className="py-1.5 font-medium">{s.sector}</td>
                          <td className="py-1.5 text-right text-green-400">
                            {s.advancers}
                          </td>
                          <td className="py-1.5 text-right text-red-400">
                            {s.decliners}
                          </td>
                          <td
                            className={
                              "py-1.5 text-right font-semibold " +
                              (s.avg_move >= 0
                                ? "text-green-400"
                                : "text-red-400")
                            }
                          >
                            {s.avg_move >= 0 ? "+" : ""}
                            {s.avg_move.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {momentum.length > 0 && (
            <div className="bg-[#1B2029] border border-gray-800 p-4 rounded-xl">
              <h2 className="text-base font-semibold text-white mb-0.5">
                Short-Term Momentum
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                Score = 2x 5d% + 20d% (live data)
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={momentum} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="symbol"
                    tick={{ fill: "#9CA3AF", fontSize: 9 }}
                  />
                  <YAxis
                    tick={{ fill: "#9CA3AF", fontSize: 9 }}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid #374151",
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                    formatter={(v) => [Number(v).toFixed(2), "Score"]}
                  />
                  <Bar dataKey="momentum_score" radius={[4, 4, 0, 0]}>
                    {momentum.map((m, i) => (
                      <Cell
                        key={i}
                        fill={m.momentum_score >= 0 ? "#34D399" : "#F87171"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
