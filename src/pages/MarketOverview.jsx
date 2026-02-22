import { useEffect, useState } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function MarketOverview() {
  const [data, setData] = useState([]);
  const backend = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

  useEffect(() => {
    axios.get(`${backend}/api/nifty/history`)
      .then(res => setData(res.data))
      .catch(err => console.error("Error fetching NIFTY history:", err));
  }, []);

  return (
    <div className="bg-[#1B2029] p-6 rounded-lg text-white">
      <h2 className="text-xl font-semibold mb-2">NIFTY 50 Market Overview</h2>
      <p className="text-gray-400 mb-4">Historical performance trend of NIFTY 50 Index</p>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <XAxis dataKey="Date" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
          <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
          <Line type="monotone" dataKey="NIFTY" stroke="#60A5FA" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
