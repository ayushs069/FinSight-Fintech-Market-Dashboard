export default function MarketMovers() {
  const topGainers = [
    { name: "ADANIPORTS", price: 1454.8, change: "+36.90 (+2.60%)" },
    { name: "POWERGRID", price: 295.35, change: "+7.10 (+2.46%)" },
    { name: "NTPC", price: 347.5, change: "+8.35 (+2.46%)" },
    { name: "HCLTECH", price: 1557.3, change: "+35.20 (+2.31%)" },
    { name: "SHRIRAMFIN", price: 738.45, change: "+14.75 (+2.04%)" },
  ];

  const topLosers = [
    { name: "DRREDDY", price: 1250.9, change: "-38.50 (-2.99%)" },
    { name: "COALINDIA", price: 382.0, change: "-9.40 (-2.40%)" },
    { name: "BEL", price: 407.2, change: "-6.35 (-1.54%)" },
    { name: "M&M", price: 3534.7, change: "-44.40 (-1.24%)" },
    { name: "ETERNAL", price: 330.45, change: "-4.15 (-1.24%)" },
  ];

  return (
    <div className="bg-[#1B2029] p-6 rounded-lg min-h-screen">
      <h2 className="text-2xl font-semibold text-blue-400 mb-4">Market movers</h2>

      <div className="flex justify-end mb-4 space-x-2">
        <select className="bg-gray-800 text-gray-300 text-sm rounded px-3 py-1">
          <option>Nifty 50</option>
          <option>Sensex</option>
        </select>
        <select className="bg-gray-800 text-gray-300 text-sm rounded px-3 py-1">
          <option>1 Day</option>
          <option>1 Week</option>
          <option>1 Month</option>
        </select>
      </div>

      <div className="flex space-x-8">
        {/* Top Gainers */}
        <div className="w-1/2">
          <h3 className="text-gray-300 mb-2">Top gainers (33)</h3>
          <table className="w-full text-sm">
            <tbody>
              {topGainers.map((g, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-[#242A36]">
                  <td className="py-2 text-white">{g.name}</td>
                  <td className="text-right text-white">{g.price}</td>
                  <td className="text-green-400 text-right">{g.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Losers */}
        <div className="w-1/2">
          <h3 className="text-gray-300 mb-2">Top losers (17)</h3>
          <table className="w-full text-sm">
            <tbody>
              {topLosers.map((l, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-[#242A36]">
                  <td className="py-2 text-white">{l.name}</td>
                  <td className="text-right text-white">{l.price}</td>
                  <td className="text-red-400 text-right">{l.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
