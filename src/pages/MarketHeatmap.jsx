import MarketHeatmap from "../components/MarketHeatMap";

export default function MarketHeatmapPage() {
  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-blue-400">Market Heatmap</h1>
      <MarketHeatmap />
    </div>
  );
}
