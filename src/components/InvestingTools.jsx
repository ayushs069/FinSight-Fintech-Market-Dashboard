export default function InvestingTools() {
  const tools = ["Screeners", "Results", "Superstar Investors", "Trade from Charts"];
  return (
    <div>
      <h2 className="text-gray-400 text-sm mb-2">Investing Tools</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      {tools.map((t) => (
        <div key={t} className="bg-[#1B2029] p-3 text-center rounded-lg">{t}</div>
      ))}
    </div>
    </div>
  );
}
