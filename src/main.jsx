import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

const TICKERS = [
  "NIFTY 50  ▲ 0.42%", "RELIANCE  ▲ 1.2%", "TCS  ▼ 0.3%", "INFY  ▲ 0.8%",
  "HDFCBANK  ▲ 0.6%", "ICICIBANK  ▲ 1.1%", "SBIN  ▼ 0.5%", "BAJFINANCE  ▲ 2.1%",
  "WIPRO  ▼ 0.2%", "MARUTI  ▲ 0.9%", "HCLTECH  ▲ 0.7%", "SENSEX  ▲ 0.38%",
];

function Splash({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase]       = useState("enter"); // enter | exit

  useEffect(() => {
    // Animate progress bar
    const step = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(step); return 100; }
        return p + (p < 60 ? 2.5 : p < 85 ? 1.2 : 0.6);
      });
    }, 30);

    // After 2.7s start exit animation, then unmount
    const exitTimer = setTimeout(() => setPhase("exit"), 2700);
    const doneTimer = setTimeout(onDone, 3200);

    return () => { clearInterval(step); clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  const tickerText = TICKERS.join("   •   ");

  return (
    <div
      className={phase === "enter" ? "splash-enter" : "splash-exit"}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "linear-gradient(135deg, #0a0e14 0%, #0E1117 50%, #111827 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Background grid */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: "linear-gradient(#60A5FA 1px,transparent 1px),linear-gradient(90deg,#60A5FA 1px,transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Glow orbs */}
      <div style={{ position:"absolute", top:"20%", left:"30%", width:340, height:340, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.18) 0%,transparent 70%)", filter:"blur(40px)" }} />
      <div style={{ position:"absolute", bottom:"25%", right:"28%", width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.14) 0%,transparent 70%)", filter:"blur(40px)" }} />

      {/* Logo area */}
      <div style={{ textAlign:"center", marginBottom:40, position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:12 }}>
          {/* Icon */}
          <div style={{ width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#3B82F6,#6366F1)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 30px rgba(99,102,241,0.5)" }}>
            <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize:36, fontWeight:800, letterSpacing:"-0.03em", color:"white" }}>
              Fin<span style={{ color:"#3B82F6" }}>Sight</span>
              <span style={{ fontSize:13, fontWeight:600, color:"#6366F1", marginLeft:6, verticalAlign:"super" }}>PRO</span>
            </div>
          </div>
        </div>
        <p style={{ color:"#6B7280", fontSize:14, letterSpacing:"0.15em", textTransform:"uppercase" }}>
          Market Intelligence Platform
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ width:300, marginBottom:16 }}>
        <div style={{ height:3, background:"rgba(255,255,255,0.08)", borderRadius:999, overflow:"hidden" }}>
          <div
            className="splash-bar"
            style={{ height:"100%", borderRadius:999, background:"linear-gradient(90deg,#3B82F6,#6366F1,#8B5CF6)", boxShadow:"0 0 8px rgba(99,102,241,0.6)" }}
          />
        </div>
        <div style={{ marginTop:10, display:"flex", justifyContent:"space-between", color:"#4B5563", fontSize:11 }}>
          <span>Loading live market data...</span>
          <span style={{ color:"#6366F1" }}>{Math.min(100, Math.round(progress))}%</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:"flex", gap:32, marginBottom:40 }}>
        {[["30", "NIFTY Stocks"], ["Live", "yFinance Feed"], ["AI", "Analysis Engine"]].map(([val, lbl]) => (
          <div key={lbl} style={{ textAlign:"center" }}>
            <div style={{ fontSize:18, fontWeight:700, color:"#60A5FA" }}>{val}</div>
            <div style={{ fontSize:10, color:"#4B5563", letterSpacing:"0.05em" }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Ticker tape */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:36, background:"rgba(59,130,246,0.07)", borderTop:"1px solid rgba(59,130,246,0.15)", display:"flex", alignItems:"center", overflow:"hidden" }}>
        <div className="ticker-scroll" style={{ display:"flex", whiteSpace:"nowrap", gap:0 }}>
          {[tickerText, tickerText].map((t, i) => (
            <span key={i} style={{ paddingRight:80, color:"#9CA3AF", fontSize:11, letterSpacing:"0.05em" }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Root() {
  const [ready, setReady] = useState(false);
  return (
    <BrowserRouter>
      {/* Splash sits on top as a fixed overlay — router is always alive underneath */}
      {!ready && <Splash onDone={() => setReady(true)} />}
      <div
        className={ready ? "page-enter" : ""}
        style={{ visibility: ready ? "visible" : "hidden", minHeight: "100vh" }}
      >
        <App />
      </div>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
