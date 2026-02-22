import PortfolioTable from "../components/PortfolioTable";

export default function Portfolio() {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-[#1B2029] p-4 rounded-lg shadow">
        <div className="flex space-x-4 border-b border-gray-700 pb-2 mb-4">
          <button className="text-blue-400 border-b-2 border-blue-400 pb-1">Stocks</button>
          <button className="text-gray-400">Mutual Funds</button>
        </div>
        <PortfolioTable />
      </div>
    </div>
  );
}
