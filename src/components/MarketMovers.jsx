// src/pages/MarketMoversPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const backend = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export default function MarketMoversPage() {
  const [movers, setMovers] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const [movRes, insRes] = await Promise.all([
          axios.get(`${backend}/api/market-movers`),
          axios.get(`${backend}/api/market-insights`),
        ]);

        setMovers(movRes.data);
        setInsights(insRes.data);
      } catch (err) {
        console.error("Market movers/insights error", err);
        setError("Failed to load market data");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-gray-300">
        Loading market movers…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-400">
        {error}
      </div>
    );
  }

  if (!movers || !insights) {
    return (
      <div className="p-4 text-gray-400">
        No data available
      </div>
    );
  }

  const { gainers = [], losers = [], date } = movers;
  const { breadth, sectors, momentum } = insights;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1B2029] p-4 rounded-lg">
        <h1 className="text-2xl font-semibold text-white mb-1">
          Market Movers – Daily Heatmap & Deep Insights
        </h1>
        <p className="text-gray-400 text-sm">
          Top gainers & losers, market breadth, sector rotation and short-term momentum.
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Data as of {date}
        </p>
      </div>

      {/* 1) Top Gainers / Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gainers */}
        <div className="bg-[#1B2029] p-4 rounded-lg">
          <h2 className="text-lg text-green-400 mb-2">Top 10 Gainers</h2>
          <table className="w-full text-sm text-gray-300">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="py-1 text-left">Symbol</th>
                <th className="py-1 text-right">LTP</th>
                <th className="py-1 text-right">% Change</th>
              </tr>
            </thead>
            <tbody>
              {gainers.map((g, idx) => (
                <tr key={idx} className="border-b border-gray-800">
                  <td className="py-1">{g.symbol}</td>
                  <td className="py-1 text-right">{g.ltp.toFixed(2)}</td>
                  <td className="py-1 text-right text-green-400">
                    {g.pct_change.toFixed(2)}%
                  </td>
                </tr>
              ))}
              {gainers.length === 0 && (
                <tr>
                  <td className="py-2 text-gray-500">No gainers data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Losers */}
        <div className="bg-[#1B2029] p-4 rounded-lg">
          <h2 className="text-lg text-red-400 mb-2">Top 10 Losers</h2>
          <table className="w-full text-sm text-gray-300">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="py-1 text-left">Symbol</th>
                <th className="py-1 text-right">LTP</th>
                <th className="py-1 text-right">% Change</th>
              </tr>
            </thead>
            <tbody>
              {losers.map((g, idx) => (
                <tr key={idx} className="border-b border-gray-800">
                  <td className="py-1">{g.symbol}</td>
                  <td className="py-1 text-right">{g.ltp.toFixed(2)}</td>
                  <td className="py-1 text-right text-red-400">
                    {g.pct_change.toFixed(2)}%
                  </td>
                </tr>
              ))}
              {losers.length === 0 && (
                <tr>
                  <td className="py-2 text-gray-500">No losers data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2) Market breadth summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#1B2029] p-4 rounded-lg">
          <h3 className="text-sm text-gray-400">Advancers</h3>
          <p className="text-2xl text-green-400 font-semibold">
            {breadth.advancers}
          </p>
        </div>
        <div className="bg-[#1B2029] p-4 rounded-lg">
          <h3 className="text-sm text-gray-400">Decliners</h3>
          <p className="text-2xl text-red-400 font-semibold">
            {breadth.decliners}
          </p>
        </div>
        <div className="bg-[#1B2029] p-4 rounded-lg">
          <h3 className="text-sm text-gray-400">Advance / Decline Ratio</h3>
          <p className="text-2xl text-blue-400 font-semibold">
            {breadth.adv_decl_ratio
              ? breadth.adv_decl_ratio.toFixed(2)
              : "∞"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            &gt; 1 = bullish breadth, &lt; 1 = bearish breadth.
          </p>
        </div>
      </div>

      {/* 3) Sector rotation table */}
      <div className="bg-[#1B2029] p-4 rounded-lg">
        <h2 className="text-lg text-white mb-2">Sector Rotation</h2>
        <table className="w-full text-sm text-gray-300">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="py-1 text-left">Sector</th>
              <th className="py-1 text-right">Advancers</th>
              <th className="py-1 text-right">Decliners</th>
              <th className="py-1 text-right">Avg Move (%)</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((s, idx) => (
              <tr key={idx} className="border-b border-gray-800">
                <td className="py-1">{s.sector}</td>
                <td className="py-1 text-right text-green-400">
                  {s.advancers}
                </td>
                <td className="py-1 text-right text-red-400">
                  {s.decliners}
                </td>
                <td
                  className={`py-1 text-right ${
                    s.avg_move >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {s.avg_move.toFixed(2)}%
                </td>
              </tr>
            ))}
            {sectors.length === 0 && (
              <tr>
                <td className="py-2 text-gray-500">No sector data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4) Momentum – mini bar chart + table */}
      <div className="bg-[#1B2029] p-4 rounded-lg">
        <h2 className="text-lg text-white mb-2">Short-Term Momentum (Top 10)</h2>

        {momentum.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* left: small chart of momentum scores */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={momentum}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="symbol"
                    tick={{ fill: "#9CA3AF", fontSize: 10 }}
                  />
                  <YAxis
                    tick={{ fill: "#9CA3AF", fontSize: 10 }}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "none",
                    }}
                    labelStyle={{ color: "#E5E7EB" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="momentum_score"
                    stroke="#F97316"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Momentum score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* right: table */}
            <div>
              <table className="w-full text-sm text-gray-300">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="py-1 text-left">Symbol</th>
                    <th className="py-1 text-right">5-Day (%)</th>
                    <th className="py-1 text-right">20-Day (%)</th>
                    <th className="py-1 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {momentum.map((m, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="py-1">{m.symbol}</td>
                      <td
                        className={`py-1 text-right ${
                          m.pct_5d >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {m.pct_5d.toFixed(2)}%
                      </td>
                      <td
                        className={`py-1 text-right ${
                          m.pct_20d >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {m.pct_20d.toFixed(2)}%
                      </td>
                      <td className="py-1 text-right text-orange-400">
                        {m.momentum_score.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No momentum data available.</p>
        )}
      </div>
    </div>
  );
}
