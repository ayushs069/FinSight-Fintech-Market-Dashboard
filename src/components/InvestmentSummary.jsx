export default function InvestmentSummary() {
  return (
    <div className="flex justify-between items-center bg-[#1B2029] p-4 rounded-lg shadow">
      <div>
        <h3 className="text-sm text-gray-400">Equity</h3>
        <p className="text-xl font-semibold">₹348 <span className="text-green-400">(+2.46%)</span></p>
      </div>
      <div>
        <h3 className="text-sm text-gray-400">Mutual Funds</h3>
        <p className="text-xl font-semibold">₹0 <span className="text-gray-500">Start SIP ₹100</span></p>
      </div>
    </div>
  );
}
