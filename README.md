# 📊 FinSight — Fintech Market Dashboard

A full-stack fintech market dashboard inspired by platforms like **Kotak Neo**. Built with **React + Vite** on the frontend and a **Python Flask** backend with real-time-style stock analysis, ARIMA/SARIMAX forecasting, sentiment analysis, and portfolio tracking across **31 NIFTY 50 stocks**.

---

## 🚀 Features

| Page | Description |
|------|-------------|
| 🏠 **Dashboard** | Investment summary, most bought stocks, market heatmap, superstar investors |
| � **Market Overview** | NIFTY index chart, historical price trends |
| � **Market Movers** | Top gainers & losers from live backend data |
| 🗺️ **Market Heatmap** | Color-coded heatmap of all 31 NIFTY stocks |
| 💼 **Portfolio** | Holdings tracker with P&L breakdown |
| � **DSFM Analytics** | ARIMA / SARIMAX / GARCH forecasting, buy-sell decisions, sentiment analysis |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Tailwind CSS, Recharts |
| Backend | Python, Flask, Flask-CORS |
| Forecasting | ARIMA, SARIMAX, GARCH (arch), pmdarima (auto_arima) |
| Sentiment | TextBlob, NewsAPI |
| Data | pandas, numpy, CSV (31 NIFTY stocks, 2007–present) |
| Routing | React Router DOM v7 |
| HTTP | Axios |

---

## 🔌 Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/nifty` | Latest NIFTY index value & % change |
| GET | `/api/nifty/history` | Historical NIFTY data for charts |
| GET | `/api/stock/<symbol>` | Single stock snapshot |
| GET | `/api/market-movers` | Top gainers & losers |
| GET | `/api/portfolio` | Portfolio holdings & P&L |
| GET | `/api/most-bought` | Most bought stocks |
| GET | `/api/market-insights` | Market-wide insights |
| GET | `/api/dsfm/top-stocks` | Top ranked stocks via DSFM |
| GET | `/api/dsfm/forecast/<symbol>` | ARIMA/SARIMAX price forecast |
| GET | `/api/dsfm/sentiment/<symbol>` | News sentiment score |
| GET | `/api/dsfm/decision/<symbol>` | Buy / Sell / Hold decision |

---

## 📦 Getting Started

### Prerequisites
- Node.js >= 18
- Python >= 3.9
- NewsAPI key (for sentiment) → [newsapi.org](https://newsapi.org)

### 1. Frontend
```bash
npm install
npm run dev
```
Runs on `http://localhost:5173`

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```
Runs on `http://localhost:5000`

### 3. Environment Variables
Create a `.env` file in the `backend/` folder:
```
NEWS_API_KEY=your_newsapi_key_here
```

---

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── DSFMAnalytics.jsx
│   │   ├── MarketHeatMap.jsx
│   │   ├── MarketMovers.jsx
│   │   ├── NiftyCharts.jsx
│   │   ├── PortfolioTable.jsx
│   │   ├── SuperstarInvestors.jsx
│   │   └── ...
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── DSFMPage.jsx
│   │   ├── MarketOverview.jsx
│   │   ├── MarketPage.jsx
│   │   ├── MarketHeatmap.jsx
│   │   └── Portfolio.jsx
│   └── main.jsx
├── backend/
│   ├── app.py              # Flask API (11 endpoints)
│   ├── requirements.txt
│   └── data/
│       ├── market_data.csv      # 31 NIFTY stocks historical data
│       └── sentiment_sample.csv
├── index.html
├── vite.config.js
└── tailwind.config.js
```

---

## 👤 Author

**[ayushs069](https://github.com/ayushs069)**
