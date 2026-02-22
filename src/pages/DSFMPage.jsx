// src/pages/DSFMPage.jsx
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  ComposedChart, Line, Area,
  XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

const backend = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const MODEL_COLORS = {
  history: "#60A5FA",
  arima:   "#FACC15",
  sarima:  "#FB923C",
  garch:   "#34D399",
};

const SIGNAL_STYLES = {
  BUY:   { cls: "bg-green-500/20 text-green-400 border-green-600", emoji: "🟢" },
  AVOID: { cls: "bg-red-500/20 text-red-400 border-red-600",       emoji: "🔴" },
  WAIT:  { cls: "bg-yellow-500/20 text-yellow-300 border-yellow-600", emoji: "🟡" },
  HOLD:  { cls: "bg-blue-500/20 text-blue-400 border-blue-600",    emoji: "🔵" },
};

export default function DSFMPage() {
  const [topStocks, setTopStocks] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [decision,  setDecision]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [elapsed,   setElapsed]   = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const [activeModels, setActiveModels] = useState({ history: true, arima: true, sarima: true, garch: true });
  const timerRef = useRef(null);

  useEffect(() => { fetchTopStocks(); }, []);

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
    setDecision(null);
    setError(null);
    setFromCache(false);
    setElapsed(0);

    let isCached = false;
    try {
      const statusRes = await axios.get(`${backend}/api/dsfm/forecast-status/${symbol}`);
      isCached = statusRes.data.cached === true;
    } catch (_) {}

    setLoading(true);
    const startTime = Date.now();

    if (!isCached) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    try {
      const res = await axios.get(`${backend}/api/dsfm/decision/${symbol}`);
      setDecision(res.data);
      setFromCache(isCached);
    } catch (err) {
      setError("Failed to load analysis. Please try again.");
    } finally {
      setLoading(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }

  // ── Build merged chart data with confidence bands ──────────────────────────
  const combinedData = decision ? (() => {
    const map = new Map();

    const add = (items, priceKey, lowerKey, upperKey) => {
      (items || []).forEach(d => {
        if (!map.has(d.date)) map.set(d.date, { date: d.date });
        const obj = map.get(d.date);
        if (d.price  != null) obj[priceKey] = d.price;
        if (d.lower  != null) obj[lowerKey] = d.lower;
        if (d.upper  != null) obj[upperKey] = d.upper;
      });
    };

    add(decision.history || [],          "h",  null,    null);
    add(decision.forecast_arima  || [],  "a",  "a_lo",  "a_hi");
    add(decision.forecast_sarima || [],  "s",  "s_lo",  "s_hi");
    add(decision.forecast_garch  || [],  "g",  "g_lo",  "g_hi");

    // For history items, set band to undefined (recharts skips nulls in Areas)
    return Array.from(map.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  })() : [];

  const newsList = decision?.news ?? [];
  const sig = SIGNAL_STYLES[decision?.signal] || SIGNAL_STYLES.HOLD;

  const toggleModel = (key) => setActiveModels(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-5">
      {/* ── Hero header ── */}
      <div className="bg-gradient-to-r from-[#1B2029] to-[#1a2235] p-5 rounded-xl border border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-1">Analysis — Smart Stock Screener</h1>
        <p className="text-gray-400 text-sm">
          Sharpe &amp; volatility ranking → ARIMA / SARIMA / GARCH 30-day forecasts → sentiment signal → final BUY / WAIT / AVOID decision
        </p>
      </div>

      {/* ── Top 10 table ── */}
      <div className="bg-[#1B2029] p-4 rounded-xl border border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Top 10 NIFTY Stocks — Risk-Adjusted Ranking</h2>
          <span className="text-xs text-green-400">● Live yfinance data</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-300 min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
                <th className="py-2 text-left w-6">#</th>
                <th className="py-2 text-left">Symbol</th>
                <th className="py-2 text-left">Company</th>
                <th className="py-2 text-left">Sector</th>
                <th className="py-2 text-right">Annual Ret %</th>
                <th className="py-2 text-right">Volatility %</th>
                <th className="py-2 text-right">Sharpe</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {topStocks.map((s, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-gray-800 hover:bg-[#242A36] transition-colors ${selected === s.symbol ? "bg-[#242A36] ring-1 ring-blue-700/40" : ""}`}
                >
                  <td className="py-2 text-gray-600 text-xs">{idx + 1}</td>
                  <td className="py-2 font-mono font-semibold text-blue-300">{s.symbol}</td>
                  <td className="py-2 text-gray-200 text-xs">{s.name}</td>
                  <td className="py-2">
                    <span className="text-[10px] bg-gray-700/50 text-gray-400 px-1.5 py-0.5 rounded">{s.sector}</span>
                  </td>
                  <td className={`py-2 text-right font-medium ${s.annual_return >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {s.annual_return >= 0 ? "+" : ""}{s.annual_return.toFixed(1)}%
                  </td>
                  <td className="py-2 text-right text-orange-300">{s.volatility.toFixed(1)}%</td>
                  <td className={`py-2 text-right font-semibold ${s.sharpe >= 1 ? "text-green-400" : s.sharpe >= 0 ? "text-yellow-400" : "text-red-400"}`}>
                    {s.sharpe.toFixed(2)}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleSelect(s.symbol)}
                      disabled={loading && selected === s.symbol}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        loading && selected === s.symbol
                          ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      {loading && selected === s.symbol ? "⏳" : "Analyse →"}
                    </button>
                  </td>
                </tr>
              ))}
              {topStocks.length === 0 && (
                <tr><td colSpan={8} className="py-6 text-center text-gray-500 text-sm">Loading ranking data…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Loading spinner ── */}
      {loading && (
        <div className="bg-[#1B2029] border border-gray-700 p-6 rounded-xl flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-300 text-sm">
              Training ARIMA / SARIMA / GARCH for{" "}
              <span className="text-blue-400 font-semibold">{selected}</span>
              {elapsed > 0 && <span className="text-gray-500 ml-2">({elapsed}s)</span>}
            </p>
          </div>
          {elapsed >= 5 && (
            <p className="text-xs text-yellow-400 text-center max-w-md">
              ⚡ First-time fit takes 20–60s on 3 years of live data. Results are disk-cached — future runs are instant.
            </p>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="bg-red-900/20 border border-red-700 p-4 rounded-xl">
          <p className="text-red-400 text-sm">⚠ {error}</p>
        </div>
      )}

      {/* ── Results panel ── */}
      {decision && !loading && (
        <>
          {/* Stock identity + signal banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#1B2029] border border-gray-800 p-4 rounded-xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-blue-300">{decision.symbol}</span>
                {fromCache && <span className="text-xs bg-green-800/50 text-green-300 px-2 py-0.5 rounded-full">⚡ cached</span>}
              </div>
              <p className="text-sm text-gray-300 mt-0.5">{decision.display_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Current price: <span className="text-white font-medium">₹{Number(decision.last_price).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                {" · "}ARIMA 30d confidence: <span className="text-yellow-400 font-medium">{decision.confidence_pct}%</span>
              </p>
            </div>
            <div className={`px-5 py-3 rounded-xl border text-center shrink-0 ${sig.cls}`}>
              <p className="text-2xl font-black">{sig.emoji} {decision.signal}</p>
              <p className="text-xs mt-0.5 opacity-70">
                {decision.forecast_direction} forecast · {decision.sentiment_label} sentiment
              </p>
            </div>
          </div>

          {/* Chart + Sentiment */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* ── FORECAST CHART ── */}
            <div className="xl:col-span-2 bg-[#1B2029] p-4 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-white font-semibold">Price History + 30-Day Forecasts</h3>
                {/* Model toggles */}
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { key: "history", label: "History",   color: MODEL_COLORS.history },
                    { key: "arima",   label: "ARIMA",     color: MODEL_COLORS.arima   },
                    { key: "sarima",  label: "SARIMA",    color: MODEL_COLORS.sarima  },
                    { key: "garch",   label: "GARCH",     color: MODEL_COLORS.garch   },
                  ].map(m => (
                    <button
                      key={m.key}
                      onClick={() => toggleModel(m.key)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                        activeModels[m.key]
                          ? "border-current opacity-100"
                          : "opacity-40 border-gray-600"
                      }`}
                      style={{ color: m.color, borderColor: activeModels[m.key] ? m.color : undefined }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {combinedData.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart data={combinedData}>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#9CA3AF", fontSize: 9 }}
                      tickFormatter={d => {
                        const dt = new Date(d);
                        return dt.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: "#9CA3AF", fontSize: 9 }}
                      domain={["auto", "auto"]}
                      tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                      width={52}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: "#E5E7EB", marginBottom: 4 }}
                      formatter={(value, name) => {
                        const labels = { h: "History", a: "ARIMA", s: "SARIMA", g: "GARCH" };
                        const colors = { h: MODEL_COLORS.history, a: MODEL_COLORS.arima, s: MODEL_COLORS.sarima, g: MODEL_COLORS.garch };
                        const band_keys = ["a_lo","a_hi","s_lo","s_hi","g_lo","g_hi"];
                        if (band_keys.includes(name)) return null; // hide band keys from tooltip
                        return [
                          <span style={{ color: colors[name] }}>₹{Number(value).toFixed(2)}</span>,
                          labels[name] || name,
                        ];
                      }}
                    />

                    {/* History */}
                    {activeModels.history && (
                      <Line type="monotone" dataKey="h" stroke={MODEL_COLORS.history} strokeWidth={1.5} dot={false} connectNulls />
                    )}

                    {/* ARIMA band + line */}
                    {activeModels.arima && (
                      <>
                        <Area type="monotone" dataKey="a_hi" stroke="none" fill={MODEL_COLORS.arima} fillOpacity={0.08} connectNulls />
                        <Area type="monotone" dataKey="a_lo" stroke="none" fill="#1B2029" fillOpacity={1} connectNulls />
                        <Line type="monotone" dataKey="a" stroke={MODEL_COLORS.arima} strokeWidth={2} dot={false} strokeDasharray="4 2" connectNulls />
                      </>
                    )}

                    {/* SARIMA band + line */}
                    {activeModels.sarima && (
                      <>
                        <Area type="monotone" dataKey="s_hi" stroke="none" fill={MODEL_COLORS.sarima} fillOpacity={0.08} connectNulls />
                        <Area type="monotone" dataKey="s_lo" stroke="none" fill="#1B2029" fillOpacity={1} connectNulls />
                        <Line type="monotone" dataKey="s" stroke={MODEL_COLORS.sarima} strokeWidth={2} dot={false} strokeDasharray="4 2" connectNulls />
                      </>
                    )}

                    {/* GARCH band + line */}
                    {activeModels.garch && (
                      <>
                        <Area type="monotone" dataKey="g_hi" stroke="none" fill={MODEL_COLORS.garch} fillOpacity={0.08} connectNulls />
                        <Area type="monotone" dataKey="g_lo" stroke="none" fill="#1B2029" fillOpacity={1} connectNulls />
                        <Line type="monotone" dataKey="g" stroke={MODEL_COLORS.garch} strokeWidth={2} dot={false} strokeDasharray="4 2" connectNulls />
                      </>
                    )}

                    {/* Separator between history and forecast */}
                    {decision.history?.length > 0 && (
                      <ReferenceLine
                        x={decision.history[decision.history.length - 1]?.date}
                        stroke="#4B5563"
                        strokeDasharray="3 3"
                        label={{ value: "Today", fill: "#6B7280", fontSize: 10, position: "top" }}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-sm">No chart data</p>
              )}

              {/* Legend row */}
              <div className="flex gap-4 mt-2 flex-wrap">
                {[
                  { color: MODEL_COLORS.history, label: "Historical price" },
                  { color: MODEL_COLORS.arima,   label: "ARIMA (w/ 95% CI)" },
                  { color: MODEL_COLORS.sarima,  label: "SARIMA (m=5)" },
                  { color: MODEL_COLORS.garch,   label: "GARCH sim. (p5–p95)" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 rounded" style={{ background: l.color }}></span>
                    <span className="text-[10px] text-gray-400">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Sentiment + Signal panel ── */}
            <div className="bg-[#1B2029] p-4 rounded-xl border border-gray-800 flex flex-col gap-4">
              <div>
                <h3 className="text-white font-semibold mb-3">Sentiment Analysis</h3>
                {/* Score gauge */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-2 rounded-full bg-gray-700 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${decision.sentiment_score > 0.1 ? "bg-green-500" : decision.sentiment_score < -0.1 ? "bg-red-500" : "bg-yellow-400"}`}
                      style={{ width: `${Math.min(Math.abs(decision.sentiment_score) * 200, 100)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-semibold ${
                    decision.sentiment_label === "POSITIVE" ? "text-green-400"
                    : decision.sentiment_label === "NEGATIVE" ? "text-red-400"
                    : "text-yellow-400"
                  }`}>
                    {decision.sentiment_label}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Score: {Number(decision.sentiment_score).toFixed(3)} (TextBlob on live news)</p>
              </div>

              {/* Model 30-day terminal prices */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">30-Day Forecasts</p>
                <div className="space-y-1.5">
                  {[
                    { label: "ARIMA",  key: "forecast_arima",  color: MODEL_COLORS.arima  },
                    { label: "SARIMA", key: "forecast_sarima", color: MODEL_COLORS.sarima },
                    { label: "GARCH",  key: "forecast_garch",  color: MODEL_COLORS.garch  },
                  ].map(({ label, key, color }) => {
                    const arr = decision[key];
                    if (!arr || arr.length === 0) return null;
                    const end = arr[arr.length - 1];
                    const chg = ((end.price - decision.last_price) / decision.last_price * 100);
                    return (
                      <div key={key} className="flex items-center justify-between bg-[#242A36] px-3 py-2 rounded-lg">
                        <span className="text-xs font-medium" style={{ color }}>{label}</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-white">₹{Number(end.price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                          <span className={`text-xs ml-1.5 ${chg >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {chg >= 0 ? "+" : ""}{chg.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* News feed */}
              <div className="flex-1 overflow-hidden">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Latest News</p>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                  {newsList.length > 0 ? (
                    newsList.slice(0, 6).map((item, idx) => (
                      <div key={idx} className="bg-[#0E1117] p-2 rounded-lg border border-gray-800">
                        <p className="text-xs text-gray-200 leading-snug line-clamp-2">{item.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10px] text-gray-600">{item.published?.slice(0, 10)}</p>
                          <span className={`text-[10px] font-semibold ${item.sentiment_score > 0.1 ? "text-green-400" : item.sentiment_score < -0.1 ? "text-red-400" : "text-yellow-400"}`}>
                            {item.sentiment_score > 0.1 ? "+" : ""}{Number(item.sentiment_score).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-600 italic">No recent news found.</p>
                  )}
                </div>
              </div>

              <p className="text-[9px] text-gray-700 mt-auto">* Educational demo — not financial advice.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
