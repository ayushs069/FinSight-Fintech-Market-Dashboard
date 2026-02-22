import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  const linkClass = (path) =>
    `px-3 py-2 rounded-md transition ${
      location.pathname === path ? "text-blue-400 font-semibold" : "text-gray-300 hover:text-blue-400"
    }`;

  return (
    <nav className="bg-[#141A22] p-4 border-b border-gray-800 flex justify-between items-center">
      <div className="text-red-500 font-bold text-xl">
        kotak <span className="text-white">neo</span>
      </div>

      <div className="flex space-x-6">
        <Link className={linkClass("/")} to="/">Home</Link>
        <Link className={linkClass("/portfolio")} to="/portfolio">Portfolio</Link>
        <Link className={linkClass("/marketmovers")} to="/marketmovers">Market Movers</Link>

        {/* ✅ New DSFM tab */}
        <Link className={linkClass("/dsfm")} to="/dsfm">
          DSFM Analytics
        </Link>
      </div>

      <div className="rounded-full bg-gray-700 px-3 py-1 text-sm">PY</div>
    </nav>
  );
}
