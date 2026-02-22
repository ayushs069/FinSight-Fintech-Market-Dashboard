// src/pages/DSFMPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const backend = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export default function DSFMPage() {
  const [topStocks, setTopStocks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState(null);

  useEffect(() => {
    fetchTopStocks();
  }, []);

  async function fetchTopStocks() {
    try {
      const res = await axios.get(`${backend}/api/dsfm/top-stocks`);
      setTopStocks(res.data.top_10 || []);
    } catch (err) {
      console.error("Top stocks fetch error", err);
    }
  }

  async function handleSelect(symbol) {
    setSelected(symbol);
    try {
      const res = await axios.get(`${backend}/api/dsfm/decision/${symbol}`);
      setDecision(res.data);
    } catch (err) {
      console.error("Decision fetch error", err);
    }
  }

  // ----------------------------
  // ✅ MERGED TIMELINE (HISTORY + FORECAST)
  // ----------------------------
  const combinedData = decision
    ? [
        ...decision.history.map((d) => ({
          date: d.date,
          price_history: d.price,
          price_forecast: null,
        })),
        ...decision.forecast.map((d) => ({
          date: d.date,
          price_history: null,
          price_forecast: d.price,
        })),
      ].sort((a, b) => new Date(a.date) - new Date(b.date))
    : [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-[#1B2029] p-4 rounded-lg">
        <h1 className="text-2xl font-semibold text-white mb-1">
          DSFM Analytics – Smart Stock Screener
        </h1>
        <p className="text-gray-400 text-sm">
          Past reality (Sharpe & volatility) → Future forecast (ARIMA) → Market
          mood (sentiment) → Final BUY / WAIT / AVOID signal.
        </p>
      </div>

      {/* Top stocks table */}
      <div className="bg-[#1B2029] p-4 rounded-lg">
        <h2 className="text-lg text-white mb-3">
          Top 10 NIFTY Stocks (Risk-adjusted)
        </h2>
        <table className="w-full text-sm text-gray-300">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="py-2 text-left">Symbol</th>
              <th className="text-right">Annual Return (%)</th>
              <th className="text-right">Volatility (%)</th>
              <th className="text-right">Sharpe</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {topStocks.map((s, idx) => (
              <tr
                key={idx}
                className={`border-b border-gray-800 hover:bg-[#242A36] ${
                  selected === s.symbol ? "bg-[#242A36]" : ""
                }`}
              >
                <td className="py-2">{s.symbol}</td>
                <td className="text-right">{s.annual_return.toFixed(2)}</td>
                <td className="text-right">{s.volatility.toFixed(2)}</td>
                <td className="text-right">{s.sharpe.toFixed(2)}</td>
                <td className="text-right">
                  <button
                    onClick={() => handleSelect(s.symbol)}
                    className="px-3 py-1 bg-blue-600 rounded text-xs"
                  >
                    Analyse
                  </button>
                </td>
              </tr>
            ))}
            {topStocks.length === 0 && (
              <tr>
                <td className="py-4 text-gray-400">No data loaded yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Forecast + Sentiment panel */}
      {decision && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Forecast Chart */}
          <div className="bg-[#1B2029] p-4 rounded-lg">
            <h3 className="text-white text-lg mb-2">
              {decision.symbol} – Price History + 30-Day Forecast
            </h3>

            {combinedData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={combinedData}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9CA3AF", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "none",
                    }}
                    labelStyle={{ color: "#E5E7EB" }}
                  />

                  {/* History line */}
                  <Line
                    type="monotone"
                    dataKey="price_history"
                    stroke="#60A5FA"
                    strokeWidth={2}
                    dot={false}
                    name="Historical"
                  />

                  {/* Forecast line */}
                  <Line
                    type="monotone"
                    dataKey="price_forecast"
                    stroke="#FACC15"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4, stroke: "#FDE047", strokeWidth: 2 }}
                    name="Forecast"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500">Loading chart...</p>
            )}
          </div>

          {/* Sentiment + Signal */}
          <div className="bg-[#1B2029] p-4 rounded-lg flex flex-col justify-between">
            <div>
              <h3 className="text-white text-lg mb-3">Sentiment & Decision</h3>
              <p className="text-gray-300 mb-2">
                <span className="text-gray-400">Sentiment label:</span>{" "}
                <span
                  className={
                    decision.sentiment_label === "POSITIVE"
                      ? "text-green-400"
                      : decision.sentiment_label === "NEGATIVE"
                      ? "text-red-400"
                      : "text-yellow-300"
                  }
                >
                  {decision.sentiment_label}
                </span>
              </p>
              <p className="text-gray-300 mb-4">
                <span className="text-gray-400">Sentiment score:</span>{" "}
                {decision.sentiment_score.toFixed(3)}
              </p>
            </div>

            <div>
              <p className="text-gray-400 mb-1 text-sm">
                Combined rule: Forecast ({decision.forecast_direction}) +
                Sentiment ({decision.sentiment_label})
              </p>
              <p className="text-xl font-bold">
                Final Signal:{" "}
                <span
                  className={
                    decision.signal === "BUY"
                      ? "text-green-400"
                      : decision.signal === "AVOID"
                      ? "text-red-400"
                      : decision.signal === "WAIT"
                      ? "text-yellow-300"
                      : "text-blue-300"
                  }
                >
                  {decision.signal}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                * Educational demo only – not real trading advice.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
