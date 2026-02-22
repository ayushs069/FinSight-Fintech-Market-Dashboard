import { useEffect, useState } from "react";
import axios from "axios";

export default function InvestmentSummary() {
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const backend = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

  useEffect(() => {
    async function fetchTotals() {
      try {
        const res = await axios.get(`${backend}/api/portfolio`);
        setTotals(res.data.totals || null);
      } catch (err) {
        console.error("portfolio totals fetch error", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTotals();
  }, [backend]);

  let equityLine = "—";
  let plLine = "—";
  let plClass = "text-gray-400";

  if (totals) {
    const equity = totals.total_current_value || 0;
    const invested = totals.total_invested || 0;
    const pl = totals.total_profit_loss || 0;
    const plPct = invested !== 0 ? (pl / invested) * 100 : 0;

    equityLine = `₹${equity.toFixed(2)}`;
    plLine = `${pl >= 0 ? "+" : ""}${pl.toFixed(2)} (${plPct.toFixed(2)}%)`;
    plClass = pl >= 0 ? "text-green-400" : "text-red-400";
  }

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#1B2029] p-4 rounded-lg shadow gap-4">
      {/* Equity */}
      <div>
        <h3 className="text-sm text-gray-400">Equity</h3>
        {loading ? (
          <p className="text-sm text-gray-500 mt-1">Loading...</p>
        ) : totals ? (
          <p className="text-xl font-semibold mt-1">
            {equityLine}{" "}
            <span className={plClass}>
              {plLine}
            </span>
          </p>
        ) : (
          <p className="text-sm text-gray-500 mt-1">
            No portfolio data available
          </p>
        )}
      </div>

      {/* Mutual funds block stays as future placeholder */}
      <div>
        <h3 className="text-sm text-gray-400">Mutual Funds</h3>
        <p className="text-xl font-semibold mt-1">
          ₹0{" "}
          <span className="text-gray-500 text-sm align-middle">
            Start SIP ₹100
          </span>
        </p>
      </div>
    </div>
  );
}
