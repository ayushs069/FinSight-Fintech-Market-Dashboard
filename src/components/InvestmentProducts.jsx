export default function InvestmentProducts() {
  const items = ["Mutual funds", "IPO", "Stockcase", "Sipit"];
  return (
    <div>
    <h2 className="text-gray-400 text-sm mb-2">Investment Products</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      {items.map((i) => (
        <div key={i} className="bg-[#1B2029] p-3 text-center rounded-lg">{i}</div>
      ))}
    </div>
    </div>
  );
}
