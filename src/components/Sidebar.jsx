import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Sidebar() {
  const [nifty, setNifty] = useState(null);
  const [ntpc, setNtpc] = useState(null);
  const [loading, setLoading] = useState(true);

  const backend = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch NIFTY data
        const niftyRes = await fetch(`${backend}/api/nifty`);
        const niftyData = await niftyRes.json();
        setNifty(niftyData);

        // Fetch NTPC stock data (PWR_NTPC column from CSV)
        const ntpcRes = await fetch(`${backend}/api/stock/PWR_NTPC`);
        const ntpcData = await ntpcRes.json();
        setNtpc(ntpcData);

        setLoading(false);
      } catch (error) {
        console.error("Sidebar data fetch error:", error);
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 60000); // auto-refresh every 60s
    return () => clearInterval(interval);
  }, [backend]);

  return (
    <aside className="w-64 bg-[#141A22] p-4 border-r border-gray-800 h-screen hidden md:flex flex-col justify-between">
      {/* Top Section - Indices */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm text-gray-400 mb-1">NIFTY 50</h2>

          {loading && <div className="text-gray-400 text-sm">Loading...</div>}

          {!loading && nifty && !nifty.error && (
            <>
              <div className="text-xs text-gray-400">
                {nifty.date || "Latest data"}
              </div>
              <div className="text-sm mt-1">
                <span className="text-gray-300">Value: </span>
                <span
                  className={
                    nifty.change_pct >= 0 ? "text-green-400" : "text-red-400"
                  }
                >
                  {nifty.nifty_value?.toFixed(2)}{" "}
                  ({nifty.change_pct?.toFixed(2)}%)
                </span>
              </div>
            </>
          )}

          {!loading && (!nifty || nifty.error) && (
            <div className="text-xs text-red-400 mt-1">
              Unable to load NIFTY data
            </div>
          )}
        </div>

        {/* Watchlist Input */}
        <input
          type="text"
          placeholder="Default portfolio watchlist"
          className="w-full p-2 bg-gray-800 rounded mb-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-600"
        />

        {/* Single-stock watch (NTPC example) */}
        <div className="text-sm text-gray-300 space-y-2">
          {loading && <div className="text-gray-400">Loading...</div>}

          {!loading && ntpc && !ntpc.error && (
            <div className="flex justify-between">
              <span>NTPC</span>
              <span
                className={
                  ntpc.change_pct >= 0 ? "text-green-400" : "text-red-400"
                }
              >
                {ntpc.change_pct >= 0 ? "+" : ""}
                {ntpc.change_pct?.toFixed(2)}%
              </span>
            </div>
          )}

          {!loading && (!ntpc || ntpc.error) && (
            <div className="text-xs text-red-400">
              NTPC data not available
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section - Navigation Links */}
      <div className="space-y-3 text-sm text-gray-400 border-t border-gray-800 pt-3">
        <Link
          to="/"
          className="block hover:text-white transition-colors duration-150"
        >
          📊 Home / Summary
        </Link>
        <Link
          to="/portfolio"
          className="block hover:text-white transition-colors duration-150"
        >
          📁 Portfolio
        </Link>
        <Link
          to="/marketmovers"
          className="block hover:text-white transition-colors duration-150"
        >
          🚀 Market Movers
        </Link>
        <Link
          to="/market"
          className="block hover:text-white transition-colors duration-150"
        >
          📈 Market Overview
        </Link>
        <Link
          to="/dsfm"
          className="block hover:text-white transition-colors duration-150"
        >
          🧠 DSFM Analytics
        </Link>
      </div>
    </aside>
  );
}
