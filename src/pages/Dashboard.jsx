import { Link } from "react-router-dom";
import NiftyChart from "../components/NiftyCharts";
import InvestmentSummary from "../components/InvestmentSummary";
import MostBought from "../components/MostBought";
import InvestmentProducts from "../components/InvestmentProducts";
import InvestingTools from "../components/InvestingTools";
import MarketHeatmap from "../components/MarketHeatMap";
import SuperstarInvestors from "../components/SuperstarInvestors";
import DSFMAnalytics from "../components/DSFMAnalytics";

export default function Dashboard() {
  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      {/* Header row */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-blue-400">
          Investments Summary
        </h1>
        <Link
          to="/marketmovers"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200 text-sm"
        >
          View Market Movers
        </Link>
      </div>

      {/* Live NIFTY 50 chart */}
      <NiftyChart />

      {/* Equity / MF summary from backend */}
      <InvestmentSummary />

      {/* Most active stocks (by volume, live) */}
      <MostBought />

      {/* Investment product shortcuts */}
      <InvestmentProducts />

      {/* Market Heatmap */}
      <MarketHeatmap />

      {/* Tools section */}
      <InvestingTools />

      {/* DSFM teaser */}
      <DSFMAnalytics />

      {/* Superstar Investors */}
      <SuperstarInvestors />
    </div>
  );
}
