const stocks = [
  { name: "GOLDBEES", price: 99.95, change: "+3.21%" },
  { name: "HDFCAMC", price: 5398, change: "-4.40%" },
  { name: "ADANIGREEN", price: 1112.6, change: "+10.79%" },
  { name: "BLUEDART", price: 6572, change: "+18.68%" },
];

export default function MostBought() {
  return (
    <div>
      <h2 className="text-gray-400 text-sm mb-2">Most Bought on Kotak</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stocks.map((s, i) => (
          <div key={i} className="bg-[#1B2029] p-3 rounded-lg text-center">
            <p className="font-semibold">{s.name}</p>
            <p className="text-sm">₹{s.price}</p>
            <p className={s.change.startsWith("+") ? "text-green-400" : "text-red-400"}>{s.change}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
