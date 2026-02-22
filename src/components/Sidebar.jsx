import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";

const backend = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const WATCHLIST = [
  { col: "RELIANCE",  label: "Reliance" },
  { col: "TCS",       label: "TCS"      },
  { col: "HDFCBANK",  label: "HDFC Bank"},
  { col: "INFY",      label: "Infosys"  },
  { col: "MARUTI",    label: "Maruti"   },
  { col: "SBIN",      label: "SBI"      },
];

const NAV_LINKS = [
  { to: "/",             icon: "🏠", label: "Dashboard"       },
  { to: "/market",       icon: "📈", label: "Market Overview" },
  { to: "/marketmovers", icon: "🚀", label: "Market Movers"   },
  { to: "/market/heatmap",icon:"🗺️", label: "Heatmap"         },
  { to: "/portfolio",    icon: "💼", label: "Portfolio"       },
  { to: "/dsfm",         icon: "🧠", label: "Analysis"  },
];

export default function Sidebar() {
  const location = useLocation();
  const [nifty,   setNifty]   = useState(null);
  const [quotes,  setQuotes]  = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [nRes, qRes] = await Promise.all([
          axios.get(`${backend}/api/nifty`),
          axios.get(`${backend}/api/live/quotes`),
        ]);
        setNifty(nRes.data);
        // Build a map: csv_col → quote
        const map = {};
        (qRes.data.stocks || []).forEach(s => { map[s.symbol] = s; });
        setQuotes(map);
      } catch (e) {
        console.error("Sidebar fetch error", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
  }, []);

  const isUp = nifty?.change_pct >= 0;

  return (
    <aside className="w-60 bg-[#141A22] border-r border-gray-800 h-screen hidden md:flex flex-col shrink-0">

      {/* ── NIFTY 50 banner ── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800">
        <p className="text-xs text-gray-500 mb-0.5 uppercase tracking-wider">NIFTY 50 Index</p>
        {loading ? (
          <p className="text-gray-500 text-xs">Loading...</p>
        ) : nifty ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-white">
                {nifty.nifty_value?.toLocaleString("en-IN")}
              </span>
              <span className={`text-xs font-semibold ${isUp ? "text-green-400" : "text-red-400"}`}>
                {isUp ? "▲" : "▼"} {Math.abs(nifty.change_pct).toFixed(2)}%
              </span>
            </div>
            {nifty.source === "live" && (
              <span className="text-[10px] text-green-400">● Live</span>
            )}
          </div>
        ) : (
          <p className="text-red-400 text-xs">Unavailable</p>
        )}
      </div>

      {/* ── Watchlist ── */}
      <div className="px-4 py-3 flex-1 overflow-y-auto">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Watchlist</p>
        <div className="space-y-1.5">
          {WATCHLIST.map(({ col, label }) => {
            const q = quotes[col];
            const up = q && q.change_pct >= 0;
            return (
              <div key={col} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-white/5 transition cursor-default">
                <div>
                  <p className="text-xs font-medium text-gray-200">{label}</p>
                  {q && <p className="text-[10px] text-gray-500">₹{q.ltp?.toLocaleString("en-IN")}</p>}
                </div>
                {q ? (
                  <span className={`text-xs font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
                    {up ? "+" : ""}{q.change_pct?.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-600">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom navigation ── */}
      <div className="border-t border-gray-800 px-3 py-3">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2 px-1">Navigation</p>
        <nav className="space-y-0.5">
          {NAV_LINKS.map(({ to, icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-blue-600/20 text-blue-400 font-medium"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="text-base leading-none">{icon}</span>
                {label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400"></span>}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            AS
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">Ayush Singh</p>
            <p className="text-[10px] text-gray-400 truncate">Pro Investor</p>
          </div>
          <Link to="/portfolio" className="ml-auto text-gray-500 hover:text-white transition shrink-0" title="My Portfolio">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </aside>
  );
}
