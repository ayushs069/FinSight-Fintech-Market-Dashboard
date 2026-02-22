import { useEffect, useState } from "react";

export default function SuperstarInvestors() {
  const [data, setData] = useState([]);

  // Static data for now (later you can fetch from backend API)
  const investors = [
    { name: "Rakesh Jhunjhunwala Portfolio", top: "TITAN", change: +1.45 },
    { name: "Radhakishan Damani", top: "DMART", change: -0.42 },
    { name: "Ashish Kacholia", top: "MOLDTKPAC", change: +0.90 },
    { name: "Dolly Khanna", top: "RAIN", change: +2.10 },
    { name: "Porinju Veliyath", top: "TARC", change: -0.20 },
    { name: "Mohnish Pabrai", top: "RENUKA", change: +3.50 },
    { name: "Vijay Kedia", top: "CERA", change: +1.00 },
    { name: "Sunil Singhania", top: "JUBLFOOD", change: -0.60 },
    { name: "Utpal Sheth", top: "EICHERMOT", change: +2.00 },
    { name: "Nemish Shah", top: "VOLTAS", change: -0.30 },
  ];

  return (
    <div className="bg-[#1B2029] p-4 rounded-lg">
      <h3 className="text-sm text-gray-400 mb-3">Superstar Investors</h3>

      <div className="space-y-2">
        {investors.map((inv, i) => (
          <div
            key={i}
            className="flex justify-between bg-[#242A36] p-3 rounded items-center"
          >
            <div>
              <div className="font-semibold text-gray-200">{inv.name}</div>
              <div className="text-xs text-gray-400">
                Top holding: {inv.top}
              </div>
            </div>

            <div
              className={
                inv.change >= 0
                  ? "text-green-400 font-semibold"
                  : "text-red-400 font-semibold"
              }
            >
              {inv.change >= 0 ? "+" : ""}
              {inv.change}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
