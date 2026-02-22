import InvestmentSummary from "../components/InvestmentSummary";
import MostBought from "../components/MostBought";
import InvestmentProducts from "../components/InvestmentProducts";
import InvestingTools from "../components/InvestingTools";
import DSFMAnalytics from "../components/DSFMAnalytics";
import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="p-4 space-y-4">
         <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-blue-400">Investments Summary</h1>

        {/* ✅ New Market Movers Button */}
        <Link
          to="/marketmovers"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200"
        >
          View Market Movers
        </Link>
      </div>
      <InvestmentSummary />
      <MostBought />
      <InvestmentProducts />
      <InvestingTools />
      <DSFMAnalytics />
    </div>
  );
}
