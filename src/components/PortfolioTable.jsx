export default function PortfolioTable() {
  const portfolio = [
    {
      name: "NTPC",
      avgCost: 418.45,
      quantity: 1,
      ltp: 347.5,
      currentValue: 348,
      invested: 418,
      profitLoss: -71,
      profitLossPct: -16.96,
      todayPL: +8,
      todayPLPct: +2.46,
    },
  ];

  return (
    <div className="bg-[#1B2029] rounded-lg p-4">
      <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-4">
        <h2 className="text-lg font-semibold text-white">Investments</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search in stocks"
            className="bg-gray-800 text-sm p-2 rounded text-gray-300"
          />
          <button className="bg-gray-700 px-3 py-2 rounded text-sm">⟳</button>
        </div>
      </div>

      <div className="flex justify-between text-sm mb-3">
        <div>
          <p className="text-gray-400">Current value</p>
          <p className="text-white text-base">₹348</p>
        </div>
        <div>
          <p className="text-gray-400">Total invested</p>
          <p className="text-white text-base">₹418</p>
        </div>
        <div>
          <p className="text-gray-400">Profit/Loss</p>
          <p className="text-red-400 text-base">-71 (-16.96%)</p>
        </div>
        <div>
          <p className="text-gray-400">Today's profit/loss</p>
          <p className="text-green-400 text-base">+8 (+2.46%)</p>
        </div>
      </div>

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
            <th>Today's P/L (%)</th>
          </tr>
        </thead>
        <tbody>
          {portfolio.map((item, index) => (
            <tr key={index} className="border-b border-gray-800 hover:bg-[#242A36]">
              <td className="py-2 flex items-center space-x-2">
                <span className="text-white font-medium">{item.name}</span>
                <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">RESULT</span>
              </td>
              <td>{item.quantity}</td>
              <td>{item.avgCost.toFixed(2)}</td>
              <td>{item.ltp.toFixed(2)}</td>
              <td>{item.currentValue}</td>
              <td>{item.invested}</td>
              <td className={item.profitLossPct >= 0 ? "text-green-400" : "text-red-400"}>
                {item.profitLoss} ({item.profitLossPct}%)
              </td>
              <td className={item.todayPLPct >= 0 ? "text-green-400" : "text-red-400"}>
                +{item.todayPL} ({item.todayPLPct}%)
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
