import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";

const backend = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const PERIODS = [
  { label: "1M",  value: "1mo"  },
  { label: "3M",  value: "3mo"  },
  { label: "6M",  value: "6mo"  },
  { label: "1Y",  value: "1y"   },
  { label: "2Y",  value: "2y"   },
  { label: "5Y",  value: "5y"   },
];

export default function NiftyChart() {
  const [data,       setData]       = useState([]);
  const [period,     setPeriod]     = useState("1y");
  const [nifty,      setNifty]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchNifty = useCallback(async () => {
    try {
      const [histRes, liveRes] = await Promise.all([
        axios.get(`${backend}/api/nifty/history?period=${period}`),
        axios.get(`${backend}/api/nifty`),
      ]);
      const histData = Array.isArray(histRes.data) ? histRes.data : [];
      console.log(`[NiftyChart] Loaded ${histData.length} data points for period=${period}`);
      setData(histData);
      setNifty(liveRes.data);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("NiftyChart error", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchNifty();
  }, [fetchNifty]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const id = setInterval(fetchNifty, 60_000);
    return () => clearInterval(id);
  }, [fetchNifty]);

  const isUp = nifty?.change_pct >= 0;
  const lineColor = isUp ? "#34D399" : "#F87171";

  return (
    <div className="bg-[#1B2029] p-4 rounded-lg">
      {/* Header row */}
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-white text-lg font-semibold">NIFTY 50</h2>
          {nifty && (
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold text-white">
                {nifty.nifty_value?.toLocaleString("en-IN")}
              </span>
              <span className={`text-sm font-medium ${isUp ? "text-green-400" : "text-red-400"}`}>
                {isUp ? "▲" : "▼"} {Math.abs(nifty.change_pct).toFixed(2)}%
              </span>
              {nifty.source === "live" && (
                <span className="text-xs bg-green-900 text-green-300 px-1.5 py-0.5 rounded-full ml-1">
                  ● LIVE
                </span>
              )}
            </div>
          )}
          {lastUpdate && (
            <p className="text-xs text-gray-500 mt-0.5">Updated {lastUpdate}</p>
          )}
        </div>

        {/* Period buttons */}
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-2 py-1 rounded text-xs transition-all ${
                period === p.value
                  ? "bg-blue-600 text-white"
                  : "bg-[#242A36] text-gray-400 hover:bg-[#2d3548]"
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={fetchNifty}
            className="px-2 py-1 rounded text-xs bg-[#242A36] text-gray-400 hover:bg-[#2d3548] ml-1"
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-[280px] flex items-center justify-center text-gray-500 text-sm">
          Loading chart...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <XAxis
              dataKey="Date"
              tick={{ fill: "#9CA3AF", fontSize: 10 }}
              tickFormatter={d => {
                const date = new Date(d);
                return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
              }}
              minTickGap={40}
            />
            <YAxis
              tick={{ fill: "#9CA3AF", fontSize: 10 }}
              domain={["dataMin - 100", "dataMax + 100"]}
              tickFormatter={v => v.toLocaleString("en-IN")}
              width={70}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151" }}
              labelStyle={{ color: "#E5E7EB", fontSize: 11 }}
              formatter={v => [`₹${Number(v).toLocaleString("en-IN")}`, "NIFTY"]}
            />
            <Line
              type="monotone"
              dataKey="NIFTY"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
