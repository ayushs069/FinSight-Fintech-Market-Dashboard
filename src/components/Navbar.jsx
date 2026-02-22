import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import axios from "axios";

const backend = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const NAV_LINKS = [
  { to: "/",            label: "Dashboard"      },
  { to: "/market",      label: "Market Overview" },
  { to: "/marketmovers",label: "Market Movers"  },
  { to: "/portfolio",   label: "Portfolio"      },
  { to: "/dsfm",        label: "Analysis" },
];

export default function Navbar() {
  const location  = useLocation();
  const [nifty,   setNifty]   = useState(null);
  const [open,    setOpen]    = useState(false);
  const dropRef   = useRef(null);

  // Live NIFTY ticker
  useEffect(() => {
    const fetch = () =>
      axios.get(`${backend}/api/nifty`).then(r => setNifty(r.data)).catch(() => {});
    fetch();
    const id = setInterval(fetch, 60_000);
    return () => clearInterval(id);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isUp = nifty?.change_pct >= 0;

  return (
    <nav className="bg-[#141A22] px-5 py-3 border-b border-gray-800 flex items-center justify-between gap-4 sticky top-0 z-50">

      {/* Brand */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-red-500 font-bold text-xl tracking-tight">FinSight</span>
        <span className="text-xs text-gray-500 mt-0.5">PRO</span>
      </div>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`px-3 py-1.5 rounded-md text-sm transition-all ${
              location.pathname === to
                ? "bg-blue-600/20 text-blue-400 font-medium"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">

        {/* Live NIFTY chip */}
        {nifty && (
          <div className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
            isUp ? "border-green-700 bg-green-900/20 text-green-400" : "border-red-700 bg-red-900/20 text-red-400"
          }`}>
            <span className="animate-pulse">●</span>
            <span className="font-medium">NIFTY {nifty.nifty_value?.toLocaleString("en-IN")}</span>
            <span>{isUp ? "▲" : "▼"} {Math.abs(nifty.change_pct).toFixed(2)}%</span>
          </div>
        )}

        {/* Notification bell */}
        <button className="relative text-gray-400 hover:text-white transition p-1.5 rounded-lg hover:bg-white/5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Profile dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-white/5 transition"
          >              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold select-none">
              AS
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-white leading-tight">Ayush S.</p>
              <p className="text-[10px] text-gray-400 leading-tight">Pro Investor</p>
            </div>
            <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-52 bg-[#1B2029] border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-gray-700 bg-[#141A22]">
                <p className="text-sm font-semibold text-white">Ayush Singh</p>
                <p className="text-xs text-gray-400">github.com/ayush</p>
                <span className="inline-block mt-1 text-[10px] bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded-full">Pro Plan</span>
              </div>

              {/* Menu items */}
              <div className="py-1">
                {[
                  { icon: "👤", label: "My Profile"     },
                  { icon: "⚙️", label: "Settings"        },
                  { icon: "🔔", label: "Notifications"   },
                  { icon: "📊", label: "My Portfolio",  to: "/portfolio" },
                  { icon: "🌙", label: "Dark Mode",     toggle: true    },
                ].map((item, i) =>
                  item.to ? (
                    <Link key={i} to={item.to} onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition">
                      <span>{item.icon}</span>{item.label}
                    </Link>
                  ) : (
                    <button key={i}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition">
                      <span>{item.icon}</span>{item.label}
                      {item.toggle && <span className="ml-auto text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">ON</span>}
                    </button>
                  )
                )}
              </div>

              {/* Logout */}
              <div className="border-t border-gray-700 py-1">
                <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition">
                  <span>🚪</span> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
