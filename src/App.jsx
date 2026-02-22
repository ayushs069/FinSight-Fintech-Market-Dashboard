import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Portfolio from "./pages/Portfolio";
import MarketPage from "./pages/MarketPage";
import DSFMPage from "./pages/DSFMPage";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import MarketOverview from "./pages/MarketOverview";

function App() {
  return (
    <div className="flex bg-[#0E1117] min-h-screen text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-6 bg-[#0E1117]">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/marketmovers" element={<MarketPage />} />
            <Route path="/dsfm" element={<DSFMPage />} />
            <Route path="/market" element={<MarketOverview />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
