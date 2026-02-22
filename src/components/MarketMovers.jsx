// src/components/MarketMovers.jsx
import { useEffect, useState } from "react";
import axios from "axios";

export default function MarketMovers() {
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [date, setDate] = useState(null);
  const backend = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchMovers();
    const id = setInterval(fetchMovers, 60 * 1000); // refresh every 60s (optional)
    return () => clearInterval(id);
  }, []);

  async function fetchMovers() {
    try {
      const res = await axios.get(`${backend}/api/market-movers`);
      setDate(res.data.date);
      setGainers(res.data.gainers || []);
      setLosers(res.data.losers || []);
    } catch (err) {
      console.error("market movers fetch error", err);
    }
  }

  return (
    <div className="bg-[#1B2029] p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-blue-400">Market movers</h2>
        <div className="text-sm text-gray-400">Latest: {date ? new Date(date).toLocaleDateString() : "—"}</div>
      </div>

      <div className="flex space-x-8">
        <div className="w-1/2">
          <h3 className="text-gray-300 mb-2">Top gainers</h3>
          <table className="w-full text-sm">
            <tbody>
              {gainers.map((g, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-[#242A36]">
                  <td className="py-2 text-white">{g.symbol}</td>
                  <td className="text-right text-white">{Number(g.ltp).toFixed(2)}</td>
                  <td className="text-green-400 text-right">{g.pct_change}%</td>
                </tr>
              ))}
              {gainers.length === 0 && <tr><td className="py-4 text-gray-400">No data</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="w-1/2">
          <h3 className="text-gray-300 mb-2">Top losers</h3>
          <table className="w-full text-sm">
            <tbody>
              {losers.map((l, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-[#242A36]">
                  <td className="py-2 text-white">{l.symbol}</td>
                  <td className="text-right text-white">{Number(l.ltp).toFixed(2)}</td>
                  <td className="text-red-400 text-right">{l.pct_change}%</td>
                </tr>
              ))}
              {losers.length === 0 && <tr><td className="py-4 text-gray-400">No data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
