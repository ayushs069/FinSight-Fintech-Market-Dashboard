import { Link } from "react-router-dom";

export default function InvestingTools() {
  const tools = [
    "Screeners",
    "Results",
    "Trade from Charts",
  ];

  return (
    <div>
      <h2 className="text-gray-400 text-sm mb-2">Investing Tools</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {tools.map((t) => (
          <div
            key={t}
            className="bg-[#1B2029] p-3 text-center rounded-lg cursor-pointer hover:bg-[#242A36] transition-colors"
          >
            {t}
          </div>
        ))}

        {/* DSFM entry as a navigation card, not analytics on home */}
        <Link
          to="/dsfm"
          className="bg-[#1B2029] p-3 text-center rounded-lg cursor-pointer hover:bg-[#242A36] transition-colors text-sm text-blue-300"
        >
          DSFM Analytics
        </Link>
      </div>
    </div>
  );
}
