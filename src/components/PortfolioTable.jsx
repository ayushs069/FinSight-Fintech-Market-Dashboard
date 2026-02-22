import { useEffect, useState } from "react";
import axios from "axios";

export default function PortfolioTable() {
  const [holdings, setHoldings] = useState([]);
  const [filteredHoldings, setFilteredHoldings] = useState([]); // for search
  const [searchQuery, setSearchQuery] = useState("");
  const [totals, setTotals] = useState(null);
  const backend = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchPortfolio();
  }, []);

  // Fetch data from backend
  async function fetchPortfolio() {
    try {
      const res = await axios.get(`${backend}/api/portfolio`);
      const data = res.data.holdings || [];
      setHoldings(data);
      setFilteredHoldings(data); // initialize filtered list
      setTotals(res.data.totals || null);
    } catch (err) {
      console.error("portfolio fetch error", err);
    }
  }

  // Handle search input
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredHoldings(holdings);
    } else {
      const filtered = holdings.filter((item) =>
        item.symbol.toLowerCase().includes(query)
      );
      setFilteredHoldings(filtered);
    }
  };

  return (
    <div className="bg-[#1B2029] rounded-lg p-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-4">
        <h2 className="text-lg font-semibold text-white">Investments</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search in stocks"
            className="bg-gray-800 text-sm p-2 rounded text-gray-300"
          />
          <button
            onClick={fetchPortfolio}
            className="bg-gray-700 px-3 py-2 rounded text-sm"
          >
            ⟳
          </button>
        </div>
      </div>

      {/* Totals Section */}
      {totals && (
        <div className="flex justify-between text-sm mb-3">
          <div>
            <p className="text-gray-400">Current value</p>
            <p className="text-white text-base">
              ₹{Number(totals.total_current_value).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Total invested</p>
            <p className="text-white text-base">
              ₹{Number(totals.total_invested).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Profit/Loss</p>
            <p
              className={
                Number(totals.total_profit_loss) >= 0
                  ? "text-green-400 text-base"
                  : "text-red-400 text-base"
              }
            >
              {Number(totals.total_profit_loss).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Today's P/L</p>
            <p className="text-green-400 text-base">
              {Number(totals.total_today_pl).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <table className="w-full text-sm text-gray-300 border-t border-gray-700">
        <thead>
          <tr className="text-left border-b border-gray-700 text-gray-400">
            <th className="py-2">Name</th>
            <th>Quantity</th>
            <th>Avg cost</th>
            <th>LTP</th>
            <th>Current value</th>
            <th>Invested</th>
            <th>Profit/Loss (%)</th>
            <th>Today's P/L</th>
          </tr>
        </thead>
        <tbody>
          {filteredHoldings.map((item, idx) => (
            <tr
              key={idx}
              className="border-b border-gray-800 hover:bg-[#242A36]"
            >
              <td className="py-2">
                <div className="font-medium">{item.symbol}</div>
              </td>
              <td>{Number(item.quantity)}</td>
              <td>{Number(item.avg_cost).toFixed(2)}</td>
              <td>{item.ltp !== null ? Number(item.ltp).toFixed(2) : "-"}</td>
              <td>{Number(item.current_value).toFixed(2)}</td>
              <td>{Number(item.invested).toFixed(2)}</td>
              <td
                className={
                  Number(item.profit_loss_pct) >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }
              >
                {Number(item.profit_loss).toFixed(2)} (
                {Number(item.profit_loss_pct).toFixed(2)}%)
              </td>
              <td
                className={
                  Number(item.today_pl) >= 0 ? "text-green-400" : "text-red-400"
                }
              >
                {Number(item.today_pl).toFixed(2)}
              </td>
            </tr>
          ))}
          {filteredHoldings.length === 0 && (
            <tr>
              <td className="py-4 text-gray-400">No holdings match your search</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
