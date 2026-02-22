export default function DSFMAnalytics() {
  return (
    <div className="bg-[#1B2029] p-4 rounded-lg mt-6">
      <h2 className="text-lg font-semibold mb-3">DSFM Analytics</h2>
      <p className="text-gray-400 text-sm mb-2">
        Sentiment, Portfolio & Forecasting Insights (to be linked with Flask backend)
      </p>
      <div className="grid md:grid-cols-3 gap-3">
        <div className="h-40 bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">Sentiment Chart</div>
        <div className="h-40 bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">Portfolio Trends</div>
        <div className="h-40 bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">Forecasting</div>
      </div>
    </div>
  );
}
