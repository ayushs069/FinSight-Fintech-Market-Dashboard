// src/components/MostBought.jsx
import { useEffect, useState } from "react";
import axios from "axios";

export default function MostBought() {
  const [watch, setWatch] = useState([]);
  const backend = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const [mostBought, setMostBought] = useState(null);

useEffect(() => {
  axios.get(`${backend}/api/most-bought`)
    .then(res => setMostBought(res.data))
    .catch(() => setMostBought(null));
}, []);

  async function fetchWatch() {
    try {
      const res = await axios.get(`${backend}/api/watchlist`);
      setWatch(res.data.watchlist || []);
    } catch (err) {
      console.error("watchlist fetch error", err);
    }
  }

  return (
    <div className="bg-[#1B2029] p-4 rounded-lg">
      <h3 className="text-sm text-gray-400 mb-2">Most bought on Kotak</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {watch.map((w, i) => (
          <div key={i} className="bg-[#242A36] p-3 rounded">
            <div className="font-semibold">{w.symbol}</div>
            <div className="text-sm text-gray-300">₹{Number(w.ltp).toFixed(2)}</div>
          </div>
        ))}
       <div className="text-gray-300">
  {mostBought
    ? `${mostBought.symbol}  (+${mostBought.pct_change}%)`
    : "No items"}
</div>

      </div>
    </div>
  );
}
