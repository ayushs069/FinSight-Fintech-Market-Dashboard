import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Portfolio from "./pages/Portfolio";
import MarketPage from "./pages/MarketPage";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

function App() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 bg-[#0E1117] min-h-screen text-white">
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/marketmovers" element={<MarketPage />} /> {/* ✅ New */}
        </Routes>
      </div>
    </div>
  );
}

export default App;
