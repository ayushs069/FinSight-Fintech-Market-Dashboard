# 📊 FinSight Pro — Fintech Market Dashboard & Analysis

A modern full-stack fintech dashboard for Indian stock market analysis, built with **React 19 + Vite** and a **Python Flask** backend. Features real-time stock quotes via yfinance, ARIMA / SARIMA / GARCH forecasting, sentiment analysis, and portfolio tracking for **30 NIFTY 50 stocks**.

![Tech](https://img.shields.io/badge/React-19-blue?logo=react) ![Tech](https://img.shields.io/badge/Flask-2.3-green?logo=flask) ![Tech](https://img.shields.io/badge/TailwindCSS-3.4-blue?logo=tailwindcss) ![Tech](https://img.shields.io/badge/Python-3.9+-yellow?logo=python)

---

## ✨ Features

### Frontend
- **Dashboard** — Investment summary, NIFTY 50 live chart, most bought stocks, market heatmap, superstar investors, investment products & tools
- **Market Overview** — Interactive NIFTY index chart with historical price data
- **Market Movers** — Live top gainers & losers with real-time data
- **Market Heatmap** — Color-coded sector heatmap of 30 NIFTY stocks
- **Portfolio** — Holdings tracker with live P&L, search & filtering
- **Analysis (DSFM)** — ARIMA / SARIMA / GARCH price forecasting with confidence bands, sentiment scoring, and automated BUY / WAIT / AVOID decisions
- **Splash Screen** — Animated loading screen with live ticker tape

### Backend
- **Live Quotes** — Real-time stock prices via yfinance with 5-minute cache & background refresh
- **Forecasting Engine** — ARIMA, SARIMA (seasonal m=5), GARCH(1,1) Monte Carlo simulation with disk-based forecast cache
- **Sentiment Analysis** — TextBlob NLP on live news headlines via NewsData.io API
- **Portfolio Engine** — CSV-based holdings with live price overlay and P&L computation
- **Risk Metrics** — Sharpe ratio, volatility, beta calculation for stock ranking

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite (Rolldown), Tailwind CSS 3.4, Recharts, Axios, React Router v7 |
| **Backend** | Python 3.9+, Flask, Flask-CORS, pandas, NumPy |
| **Forecasting** | pmdarima (ARIMA), statsmodels (SARIMAX), arch (GARCH 1,1 Monte Carlo) |
| **Live Data** | yfinance — 30 NIFTY 50 stocks, real-time quotes + 3-year history |
| **Sentiment** | TextBlob, NewsData.io API |
| **Caching** | In-memory quote cache (5 min TTL), disk-based forecast cache |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/nifty` | Latest NIFTY 50 index value & daily change |
| `GET` | `/api/nifty/history` | Historical NIFTY data (1 year, for charts) |
| `GET` | `/api/stock/<symbol>` | Single stock snapshot |
| `GET` | `/api/market-movers` | Top gainers & losers (live) |
| `GET` | `/api/portfolio` | Portfolio holdings with live P&L |
| `GET` | `/api/most-bought` | Most bought stocks |
| `GET` | `/api/market-insights` | Market-wide analytics & momentum signals |
| `GET` | `/api/dsfm/top-stocks` | Ranked stocks by Sharpe, volatility, beta |
| `GET` | `/api/dsfm/forecast/<sym>` | ARIMA / SARIMA / GARCH 30-day price forecast |
| `GET` | `/api/dsfm/sentiment/<sym>` | News sentiment score for a stock |
| `GET` | `/api/dsfm/decision/<sym>` | Automated BUY / WAIT / AVOID decision |
| `GET` | `/api/live/quotes` | Bulk live quotes for all 30 stocks |
| `GET` | `/api/live/intraday/<sym>` | Intraday price data |
| `GET` | `/api/live/history/<sym>` | Multi-year historical price data |

---

## 📦 Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **Python** ≥ 3.9
- **NewsData.io API key** (free tier) → [newsdata.io](https://newsdata.io)

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/Fintech-Market-Dashboard-Analysis.git
cd Fintech-Market-Dashboard-Analysis
```

### 2. Frontend setup
```bash
npm install
npm run dev
```
Runs on **http://localhost:5173**

### 3. Backend setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```
Runs on **http://localhost:8000**

### 4. Environment variables

**Frontend** — create `.env` in the project root:
```env
VITE_API_BASE=http://localhost:8000
```

**Backend** — create `.env` in `backend/`:
```env
NEWSCATCHER_API_KEY=your_newsdata_api_key
```

---

## 📁 Project Structure

```
Fintech-Market-Dashboard-Analysis/
├── src/
│   ├── main.jsx                  # Entry point + splash screen animation
│   ├── index.css                 # Global styles + Tailwind + animations
│   ├── App.jsx                   # Router & layout (Sidebar + Navbar + Routes)
│   ├── components/
│   │   ├── Navbar.jsx            # Top navigation bar with NIFTY ticker
│   │   ├── Sidebar.jsx           # Left sidebar navigation
│   │   ├── NiftyCharts.jsx       # NIFTY 50 interactive line chart
│   │   ├── MarketMovers.jsx      # Top gainers / losers cards
│   │   ├── MarketHeatMap.jsx     # Color-coded market heatmap
│   │   ├── PortfolioTable.jsx    # Holdings table with search & P&L
│   │   ├── InvestmentSummary.jsx # Equity + MF summary cards
│   │   ├── MostBought.jsx        # Most bought stocks list
│   │   ├── DSFMAnalytics.jsx     # Analysis widget for dashboard
│   │   ├── SuperstarInvestors.jsx# Superstar investor portfolios
│   │   ├── InvestmentProducts.jsx# Investment product cards
│   │   └── InvestingTools.jsx    # Tools + Analysis link
│   └── pages/
│       ├── Dashboard.jsx         # Home page (all widgets)
│       ├── Portfolio.jsx         # Portfolio page
│       ├── MarketPage.jsx        # Market movers page
│       ├── MarketOverview.jsx    # NIFTY chart page
│       ├── MarketHeatmap.jsx     # Dedicated heatmap page
│       └── DSFMPage.jsx          # Full analysis page (forecasts + sentiment)
├── backend/
│   ├── app.py                    # Flask API server (14 endpoints)
│   ├── realtime.py               # yfinance live data module + caching
│   ├── requirements.txt          # Python dependencies
│   └── data/
│       ├── market_data.csv       # Historical CSV fallback (30 stocks)
│       └── sentiment_sample.csv  # Sample sentiment data
├── public/
│   └── vite.svg                  # Favicon
├── index.html                    # HTML entry point
├── vite.config.js                # Vite config with API proxy
├── tailwind.config.js            # Tailwind configuration
├── postcss.config.js             # PostCSS config
├── eslint.config.js              # ESLint config
├── package.json                  # Node dependencies & scripts
└── .gitignore
```

---

## 🧠 How Analysis (DSFM) Works

1. **Stock Ranking** — All 30 stocks are ranked by Sharpe ratio, annualized volatility, and beta (computed from live 1-year data via CSV fallback for speed)
2. **Forecasting** — Select a stock → backend fits 3 models on 3 years of daily closing prices:
   - **ARIMA** — Auto-fitted via `pmdarima` with 95% confidence intervals
   - **SARIMA** — Seasonal ARIMA (m=5, weekly trading cycle) via `statsmodels.SARIMAX`
   - **GARCH(1,1)** — Monte Carlo simulation (500 paths) using GARCH-forecasted daily volatility → median price prediction line with p5–p95 confidence bands
3. **Sentiment** — Live news headlines fetched from NewsData.io, scored via TextBlob polarity
4. **Decision** — Combined forecast direction + sentiment signal → **BUY** / **WAIT** / **AVOID** with reasoning

---

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend dev server (port 5173) |
| `npm run build` | Build for production → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `python backend/app.py` | Start Flask backend (port 8000) |

---

## ⚡ Performance Notes

- Backend caches live quotes for **5 minutes** to avoid yfinance rate-limiting
- Forecasts are **disk-cached** — first request takes ~10–15s per stock, subsequent requests are instant
- Forecast cache is **pre-warmed** on server start for the top 5 stocks
- CSV fallback ensures `/api/dsfm/top-stocks` responds in **< 2 seconds** even without internet
- Non-blocking quote refresh prevents slow yfinance calls from blocking API responses

---

## 📝 License

This project is for **educational and portfolio demonstration purposes**.

---

## 👤 Author

**Ayush Singh**

Built as a fintech market dashboard for learning full-stack development, quantitative finance, and data-driven decision making.
