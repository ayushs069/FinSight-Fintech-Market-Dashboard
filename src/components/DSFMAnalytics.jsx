import { Link } from "react-router-dom";

export default function DSFMAnalytics() {
  return (
    <div className="bg-[#1B2029] border border-gray-800 p-5 rounded-xl mt-2">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-white">Analysis</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            ARIMA · SARIMA · GARCH forecasts with confidence bands · Sentiment · BUY/HOLD/SELL signals
          </p>
        </div>
        <Link
          to="/dsfm"
          className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg transition-all font-medium"
        >
          Open Analytics →
        </Link>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {/*
          { icon: "📈", title: "Forecasting", desc: "30-day ARIMA / SARIMA / GARCH price & volatility forecasts with confidence bands" },
          { icon: "🧠", title: "Sentiment",   desc: "Live news sentiment via TextBlob — Positive / Neutral / Negative" },
          { icon: "🎯", title: "Signal",      desc: "Combined BUY / WAIT / AVOID decision from forecast + sentiment" },
        */}
        <Link to="/dsfm"
          className="bg-[#242A36] hover:bg-[#2d3548] rounded-xl p-4 transition-colors cursor-pointer">
          <p className="text-2xl mb-1">📈</p>
          <p className="text-sm font-semibold text-white">Forecasting</p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">30-day ARIMA / SARIMA / GARCH price & volatility forecasts with confidence bands</p>
        </Link>
        <Link to="/dsfm"
          className="bg-[#242A36] hover:bg-[#2d3548] rounded-xl p-4 transition-colors cursor-pointer">
          <p className="text-2xl mb-1">🧠</p>
          <p className="text-sm font-semibold text-white">Sentiment</p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">Live news sentiment via TextBlob — Positive / Neutral / Negative</p>
        </Link>
        <Link to="/dsfm"
          className="bg-[#242A36] hover:bg-[#2d3548] rounded-xl p-4 transition-colors cursor-pointer">
          <p className="text-2xl mb-1">🎯</p>
          <p className="text-sm font-semibold text-white">Signal</p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">Combined BUY / WAIT / AVOID decision from forecast + sentiment</p>
        </Link>
      </div>
    </div>
  );
}
