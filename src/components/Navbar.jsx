import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  const linkClass = (path) =>
    `flex items-center space-x-1 ${
      location.pathname === path ? "text-blue-400" : "text-gray-300"
    }`;

  return (
    <nav className="flex justify-between items-center bg-[#141A22] p-4 border-b border-gray-800">
      <div className="text-xl font-bold text-red-500">
        kotak <span className="text-white">neo</span>
      </div>
      <div className="flex space-x-6 text-gray-300">
        <Link className={linkClass("/")} to="/">Home</Link>
        <Link className={linkClass("/portfolio")} to="/portfolio">Portfolio</Link>
        <a href="#">Orders</a>
        <a href="#">Invest</a>
        <a href="#">Funds</a>
      </div>
      <div className="rounded-full bg-gray-700 px-3 py-1 text-sm">PY</div>
    </nav>
  );
}
