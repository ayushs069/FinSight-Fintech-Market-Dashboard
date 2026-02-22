export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#141A22] p-4 border-r border-gray-800 h-screen hidden md:block">
      <div className="mb-4">
        <h2 className="text-sm text-gray-400 mb-2">Indices</h2>
        <div className="text-sm">NIFTY: <span className="text-green-400">26053.90 (+0.45%)</span></div>
        <div className="text-sm">SENSEX: <span className="text-green-400">84997.13 (+0.44%)</span></div>
      </div>
      <input
        type="text"
        placeholder="Default portfolio watchlist"
        className="w-full p-2 bg-gray-800 rounded mb-3 text-sm"
      />
      <div className="text-sm text-gray-300 space-y-2">
        <div className="flex justify-between">
          <span>NTPC</span>
          <span className="text-green-400">+2.46%</span>
        </div>
      </div>
    </aside>
  );
}
