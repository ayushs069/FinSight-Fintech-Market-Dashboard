import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Sidebar() {
  const [nifty, setNifty] = useState(null);
  const [ntpc, setNtpc] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch NIFTY data
        const niftyRes = await fetch("http://127.0.0.1:8000/api/nifty");
        const niftyData = await niftyRes.json();
        setNifty(niftyData);

        // Fetch NTPC stock data
        const ntpcRes = await fetch("http://127.0.0.1:8000/api/stock/PWR_NTPC");
        const ntpcData = await ntpcRes.json();
        setNtpc(ntpcData);
      } catch (error) {
        console.error("Sidebar data fetch error:", error);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 60000); // auto-refresh every 60s
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-64 bg-[#141A22] p-4 border-r border-gray-800 h-screen hidden md:flex flex-col justify-between ">
      {/* Top Section - Indices */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm text-gray-400 mb-2">NIFTY 50</h2>
          {nifty ? (
            <>
              <div className="text-sm text-gray-300">
                {nifty.date ? nifty.date : "Latest data"}
              </div>
              <div className="text-sm mt-1">
                <span className="text-gray-300">Value: </span>
                <span
                  className={
                    nifty.change >= 0 ? "text-green-400" : "text-red-400"
                  }
                >
                  {nifty.latest_value?.toFixed(2)}{" "}
                  ({nifty.change_pct?.toFixed(2)}%)
                </span>
              </div>
            </>
          ) : (
            <div className="text-gray-400">Loading...</div>
          )}
        </div>

        {/* Watchlist Input */}
        <input
          type="text"
          placeholder="Default portfolio watchlist"
          className="w-full p-2 bg-gray-800 rounded mb-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-600"
        />

        {/* Stock Watchlist */}
        <div className="text-sm text-gray-300 space-y-2">
          {ntpc ? (
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
          ) : (
            <div className="text-gray-400">Loading...</div>
          )}
        </div>
      </div>

      {/* Bottom Section - Navigation Links */}
      <div className="space-y-3 text-sm text-gray-400 border-t border-gray-800 pt-3">
        <Link
          to="/"
          className="block hover:text-white transition-colors duration-150"
        >
          📊 Portfolio
        </Link>
        <Link
          to="/market"
          className="block hover:text-white transition-colors duration-150"
        >
          📈 Market Overview
        </Link>
      </div>
    </aside>
  );
}
