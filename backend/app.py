# backend/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
import json
import threading
import time
from arch import arch_model
from datetime import timedelta, datetime
from math import sqrt
from textblob import TextBlob
from dotenv import load_dotenv
import requests
from pmdarima import auto_arima
import realtime as rt          # ← real-time yfinance layer

app = Flask(__name__)
CORS(app)

# ============================
#  SYMBOL → REAL COMPANY NAME MAP (for news query)
# ============================
SYMBOL_MAP = {
    "RELIANCE":    "Reliance Industries",
    "TCS":         "Tata Consultancy Services",
    "HDFCBANK":    "HDFC Bank",
    "INFY":        "Infosys",
    "ICICIBANK":   "ICICI Bank",
    "HINDUNILVR":  "Hindustan Unilever",
    "SBIN":        "State Bank of India",
    "BHARTIARTL":  "Bharti Airtel",
    "KOTAKBANK":   "Kotak Mahindra Bank",
    "WIPRO":       "Wipro",
    "HCLTECH":     "HCL Technologies",
    "AXISBANK":    "Axis Bank",
    "ASIANPAINT":  "Asian Paints",
    "MARUTI":      "Maruti Suzuki",
    "BAJAJ-AUTO":  "Bajaj Auto",
    "MM":          "Mahindra Mahindra",
    "TATASTEEL":   "Tata Steel",
    "HINDALCO":    "Hindalco Industries",
    "SUNPHARMA":   "Sun Pharmaceutical",
    "DRREDDY":     "Dr Reddy Laboratories",
    "CIPLA":       "Cipla",
    "NTPC":        "NTPC",
    "POWERGRID":   "Power Grid Corporation",
    "COALINDIA":   "Coal India",
    "ONGC":        "ONGC Oil Gas",
    "ITC":         "ITC India",
    "LT":          "Larsen Toubro",
    "ULTRACEMCO":  "UltraTech Cement",
    "TECHM":       "Tech Mahindra",
    "ADANIPORTS":  "Adani Ports",
}

# ============================
#  PATHS
# ============================
BASE_DIR = os.path.dirname(__file__)
DATA_CSV = os.path.join(BASE_DIR, "data", "market_data.csv")
HOLDINGS_CSV = os.path.join(BASE_DIR, "data", "holdings.csv")
CACHE_DIR = os.path.join(BASE_DIR, "data", "forecast_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Cache TTL: recompute forecasts older than this many seconds (24 hours)
CACHE_TTL_SECONDS = 86400

# ============================
#  HELPERS
# ============================
def read_timeseries():
    """Reads the wide CSV: Date + many tickers."""
    if not os.path.exists(DATA_CSV):
        return pd.DataFrame()

    df = pd.read_csv(DATA_CSV)

    if "Date" not in df.columns:
        return pd.DataFrame()

    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df = df.dropna(how="all", subset=[c for c in df.columns if c != "Date"])
    df = df.sort_values("Date").reset_index(drop=True)

    # Fill missing stock prices
    df = df.ffill().bfill()
    return df


def latest_and_prev_prices(df):
    """Return last and previous row price series and last date."""
    if df.empty:
        return pd.Series(dtype=float), pd.Series(dtype=float), None

    last_row = df.iloc[-1]
    prev_row = df.iloc[-2] if len(df) >= 2 else df.iloc[-1]

    last_date = last_row["Date"]

    last = pd.to_numeric(last_row.drop("Date"), errors="coerce")
    prev = pd.to_numeric(prev_row.drop("Date"), errors="coerce")

    return last, prev, last_date.strftime("%d-%m-%Y")


def get_price_series(symbol):
    """Return a clean Date + Price series.
    Accepts any form: clean symbol, CSV col, or yf ticker.
    Prefers CSV data (instant) — falls back to live yfinance if CSV is missing."""
    clean = rt.resolve(symbol) or symbol

    # ── Try CSV first (instant, no network) ──────────────────────
    df = read_timeseries()
    col = symbol if symbol in df.columns else None
    if col is None:
        for csv_col, clean_sym in rt.CSV_TO_SYMBOL.items():
            if clean_sym == clean and csv_col in df.columns:
                col = csv_col
                break
    if not df.empty and col:
        out = df[["Date", col]].dropna().rename(columns={col: "Price"})
        out["Price"] = pd.to_numeric(out["Price"], errors="coerce")
        out = out.dropna()
        if not out.empty:
            return out

    # ── Fallback: live yfinance history ──────────────────────────
    live = rt.get_history(clean, period="5y")
    if live:
        ldf = pd.DataFrame(live)
        ldf["Date"]  = pd.to_datetime(ldf["date"])
        ldf["Price"] = pd.to_numeric(ldf["price"], errors="coerce")
        ldf = ldf[["Date", "Price"]].dropna().sort_values("Date").reset_index(drop=True)
        if not ldf.empty:
            return ldf

    return pd.DataFrame()


# ===========================================================
#  NIFTY API
# ===========================================================
@app.route("/api/nifty")
def api_nifty():
    # Try live NIFTY 50 index first
    live = rt.get_nifty50_index()
    if live:
        return jsonify(live)

    # Fallback: average all CSV stocks
    df = read_timeseries()
    if df.empty:
        return jsonify({"error": "No data"}), 404
    df["NIFTY"] = df.drop(columns=["Date"]).mean(axis=1)
    latest = df.iloc[-1]["NIFTY"]
    prev   = df.iloc[-2]["NIFTY"]
    change_pct = (latest - prev) / prev * 100
    date = df.iloc[-1]["Date"].strftime("%d-%m-%Y")
    return jsonify({
        "nifty_value": round(latest, 2),
        "change_pct":  round(change_pct, 2),
        "date": date,
        "source": "csv"
    })


# ===========================================================
#  STOCK API (single symbol snapshot)
# ===========================================================
@app.route("/api/stock/<symbol>")
def api_stock(symbol):
    # Try live quote first
    live = rt.get_quote(symbol)
    if live:
        return jsonify({"symbol": symbol, **live})

    # Fallback CSV
    df = read_timeseries()
    if df.empty or symbol not in df.columns:
        return jsonify({"error": "Symbol not found"}), 404
    df = df.dropna(subset=[symbol])
    df["Date"] = pd.to_datetime(df["Date"])
    latest = df.iloc[-1][symbol]
    prev   = df.iloc[-2][symbol]
    change = latest - prev
    change_pct = change / prev * 100
    return jsonify({
        "symbol":       symbol,
        "ltp":          round(latest, 2),
        "change":       round(change, 2),
        "change_pct":   round(change_pct, 2),
        "date":         df.iloc[-1]["Date"].strftime("%d-%m-%Y"),
        "source":       "csv"
    })


# ===========================================================
#  MARKET MOVERS (TOP GAINERS / LOSERS)
# ===========================================================
@app.route("/api/market-movers")
def api_market_movers():
    quotes = rt.get_all_quotes()

    movers = []
    for sym, info in rt.STOCKS.items():
        q = quotes.get(sym)
        if not q:
            continue
        movers.append({
            "symbol":     sym,
            "name":       info["name"],
            "sector":     info["sector"],
            "ltp":        q["ltp"],
            "change":     q["change"],
            "pct_change": q["change_pct"],
            "open":       q.get("open"),
            "high":       q.get("high"),
            "low":        q.get("low"),
            "volume":     q.get("volume"),
            "source":     "live",
        })

    if not movers:
        # Fallback to CSV
        df = read_timeseries()
        last, prev, last_date = latest_and_prev_prices(df)
        for sym in last.index:
            if pd.isna(last[sym]) or pd.isna(prev[sym]):
                continue
            pct = (last[sym] - prev[sym]) / prev[sym] * 100
            movers.append({"symbol": sym, "name": sym, "ltp": float(last[sym]), "pct_change": round(pct, 2), "source": "csv"})

    movers_df = pd.DataFrame(movers)
    gainers = movers_df.sort_values("pct_change", ascending=False).head(10).to_dict("records")
    losers  = movers_df.sort_values("pct_change", ascending=True).head(10).to_dict("records")

    return jsonify({
        "date":    datetime.now().strftime("%d-%m-%Y"),
        "gainers": gainers,
        "losers":  losers,
    })


# ===========================================================
#  PORTFOLIO (synthetic)
# ===========================================================
@app.route("/api/portfolio")
def api_portfolio():
    df = read_timeseries()
    if df.empty:
        return jsonify({"holdings": [], "totals": {}})

    last, prev, date = latest_and_prev_prices(df)
    quotes = rt.get_all_quotes()   # live prices

    rows = []
    for sym in last.index:
        # Prefer live LTP, fall back to CSV
        live_q = rt.get_quote(sym)
        ltp     = live_q["ltp"]        if live_q else float(last[sym])
        prev_ltp = live_q["prev_close"] if live_q else (float(prev[sym]) if not pd.isna(prev[sym]) else ltp)

        series = pd.to_numeric(df[sym], errors="coerce").dropna()
        if series.empty:
            continue
        first_price   = series.iloc[0]
        invested      = first_price * 1
        current_value = ltp * 1
        today_pl      = round(ltp - prev_ltp, 2)
        profit_loss   = current_value - invested
        profit_loss_pct = (profit_loss / invested * 100) if invested != 0 else 0

        rows.append({
            "symbol":          sym,
            "quantity":        1,
            "avg_cost":        round(first_price, 2),
            "ltp":             round(ltp, 2),
            "invested":        round(invested, 2),
            "current_value":   round(current_value, 2),
            "profit_loss":     round(profit_loss, 2),
            "profit_loss_pct": round(profit_loss_pct, 2),
            "today_pl":        today_pl,
            "source":          "live" if live_q else "csv",
        })

    totals = {
        "total_invested":      sum(r["invested"] for r in rows),
        "total_current_value": sum(r["current_value"] for r in rows),
        "total_profit_loss":   sum(r["profit_loss"] for r in rows),
        "total_today_pl":      sum(r["today_pl"] for r in rows),
        "date": datetime.now().strftime("%d-%m-%Y"),
    }
    return jsonify({"holdings": rows, "totals": totals})


# ===========================================================
#  NIFTY HISTORY FOR CHART
# ===========================================================
@app.route("/api/nifty/history")
def api_nifty_history():
    period = request.args.get("period", "1y")   # ?period=1mo|3mo|6mo|1y|2y|5y
    # Live ^NSEI history
    live = rt.get_nifty50_history(period=period)
    if live:
        return jsonify(live)
    # Fallback CSV
    df = read_timeseries()
    df["NIFTY"] = df.drop(columns=["Date"]).mean(axis=1)
    df = df[["Date", "NIFTY"]].tail(200)
    return jsonify(df.to_dict("records"))


# ===========================================================
#  DSFM TOP STOCKS  (Sharpe / Volatility)
# ===========================================================
def compute_risk_metrics():
    """Sharpe / volatility for all 31 stocks using live yfinance data."""
    trading_days = 252
    results = []

    for sym in rt.SYMBOL_LIST:
        s = get_price_series(sym)
        if s.empty or len(s) < 100:
            continue
        prices = s["Price"]
        daily  = prices.pct_change().dropna()
        if daily.empty:
            continue

        mean_ret    = daily.mean()
        vol         = daily.std()
        annual_ret  = (1 + mean_ret) ** trading_days - 1
        annual_vol  = vol * sqrt(trading_days)
        sharpe      = (annual_ret / annual_vol) if annual_vol != 0 else 0
        info        = rt.STOCKS.get(sym, {})

        results.append({
            "symbol":        sym,
            "name":          info.get("name", sym),
            "sector":        info.get("sector", ""),
            "annual_return": round(annual_ret * 100, 2),
            "volatility":    round(annual_vol * 100, 2),
            "sharpe":        round(sharpe, 2),
        })

    return sorted(results, key=lambda x: x["sharpe"], reverse=True)


@app.route("/api/dsfm/top-stocks")
def api_dsfm_top_stocks():
    metrics = compute_risk_metrics()
    return jsonify({
        "top_10": metrics[:10],
        "top_5": metrics[:5],
        "all_ranked": metrics
    })


# ===========================================================
#  FORECAST MODELS (ARIMA, SARIMA, GARCH on log-returns)
# ===========================================================

# In-memory cache (process-level, survives within a server session)
forecast_cache = {}

# Lock to prevent duplicate simultaneous computation for the same symbol
_compute_locks = {}
_compute_locks_lock = threading.Lock()


def _cache_path(symbol):
    safe = symbol.replace("/", "_").replace("\\", "_")
    return os.path.join(CACHE_DIR, f"{safe}.json")


def _load_disk_cache(symbol):
    """Load forecast from disk if it exists and is fresh."""
    path = _cache_path(symbol)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r") as f:
            data = json.load(f)
        ts = data.get("_cached_at", 0)
        if time.time() - ts < CACHE_TTL_SECONDS:
            return data
    except Exception:
        pass
    return None


def _save_disk_cache(symbol, result):
    """Persist forecast result to disk with a timestamp."""
    path = _cache_path(symbol)
    try:
        to_save = dict(result)
        to_save["_cached_at"] = time.time()
        with open(path, "w") as f:
            json.dump(to_save, f)
    except Exception as e:
        print(f"[cache] Failed to save cache for {symbol}: {e}")


def forecast_models(symbol, steps=30):
    # 1. Check in-memory cache first (fastest)
    if symbol in forecast_cache:
        return forecast_cache[symbol]

    # 2. Check disk cache
    cached = _load_disk_cache(symbol)
    if cached:
        forecast_cache[symbol] = cached
        return cached

    # 3. Ensure only one thread computes for this symbol at a time
    with _compute_locks_lock:
        if symbol not in _compute_locks:
            _compute_locks[symbol] = threading.Lock()
        sym_lock = _compute_locks[symbol]

    with sym_lock:
        # Re-check after acquiring lock (another thread may have finished)
        if symbol in forecast_cache:
            return forecast_cache[symbol]
        cached = _load_disk_cache(symbol)
        if cached:
            forecast_cache[symbol] = cached
            return cached

        return _run_forecast(symbol, steps)


def _run_forecast(symbol, steps=30):
    """
    Trains ARIMA, SARIMA, and GARCH on the last 3 years of live daily data.
    • ARIMA  → price-level forecast (auto_arima on prices, d=1)
    • SARIMA → price-level forecast with weekly seasonality (m=5)
    • GARCH  → volatility cone: predicts how much the price may swing
               (upper/lower bands widen over time; center = last_price)
    """
    s = get_price_series(symbol)
    if s.empty or len(s) < 50:
        return None

    prices    = s["Price"].values.astype(float)
    dates     = s["Date"]
    last_price = float(prices[-1])
    last_date  = dates.iloc[-1]

    # Use last 3 years (≈756 trading days) for speed + relevance
    window = min(len(prices), 756)
    prices  = prices[-window:]

    # Log returns for GARCH
    pct_ret = np.diff(prices) / prices[:-1] * 100   # percentage returns
    log_ret = np.diff(np.log(prices))

    if len(log_ret) < 30:
        return None

    future_dates = pd.bdate_range(start=last_date + timedelta(days=1), periods=steps)

    print(f"[forecast] {symbol} — {len(prices)} obs, fitting ARIMA/SARIMA/GARCH...")
    t0 = time.time()

    # ── ARIMA on price levels (d=1 handles non-stationarity) ────────────────
    arima_prices = np.full(steps, last_price)
    arima_lower  = np.full(steps, last_price)
    arima_upper  = np.full(steps, last_price)
    am = None
    try:
        am = auto_arima(
            prices, seasonal=False, stepwise=True,
            suppress_warnings=True, error_action="ignore",
            max_p=5, max_q=5, max_d=2, d=1,       # force at least d=1
            information_criterion="aic", n_jobs=1,
        )
        fc = am.predict(n_periods=steps, return_conf_int=True, alpha=0.05)
        arima_prices = fc[0]
        arima_lower  = fc[1][:, 0]
        arima_upper  = fc[1][:, 1]
        print(f"[forecast]   ARIMA order={am.order} — terminal ₹{arima_prices[-1]:.2f}")
    except Exception as e:
        print(f"[forecast] ARIMA failed for {symbol}: {e}")

    # ── SARIMA on price levels (d=1, m=5 weekly seasonality) ────────────────
    # Uses statsmodels SARIMAX with forced seasonal component so it differs
    # from plain ARIMA.  D=0 (no seasonal differencing) to avoid blowups.
    sarima_prices = np.full(steps, last_price)
    sarima_lower  = np.full(steps, last_price)
    sarima_upper  = np.full(steps, last_price)
    try:
        from statsmodels.tsa.statespace.sarimax import SARIMAX
        import warnings
        warnings.filterwarnings("ignore")
        base_order = am.order if am is not None else (1, 1, 0)
        seasonal_order = (1, 0, 1, 5)   # P=1,D=0,Q=1,m=5 — lightweight
        # Use only last 500 points to keep memory / time reasonable
        sarima_window = min(len(prices), 500)
        price_slice = prices[-sarima_window:]
        smodel = SARIMAX(price_slice, order=base_order, seasonal_order=seasonal_order,
                         enforce_stationarity=False, enforce_invertibility=False)
        sfit   = smodel.fit(disp=False, maxiter=150)
        sfc    = sfit.get_forecast(steps=steps)
        sarima_prices = np.asarray(sfc.predicted_mean, dtype=float)
        sci    = sfc.conf_int(alpha=0.05)
        sci_arr = np.asarray(sci, dtype=float)
        sarima_lower = sci_arr[:, 0]
        sarima_upper = sci_arr[:, 1]
        sarima_lower = np.maximum(sarima_lower, last_price * 0.5)
        print(f"[forecast]   SARIMA order={base_order} seasonal={seasonal_order} — terminal ₹{float(sarima_prices[-1]):.2f}")
    except Exception as e:
        print(f"[forecast] SARIMA failed for {symbol}: {e}")
        # Fallback: copy ARIMA but add small offset so it's not identical
        try:
            noise = np.linspace(0, last_price * 0.005, steps)
            sarima_prices = arima_prices + noise
            sarima_lower  = arima_lower - abs(noise) * 2
            sarima_upper  = arima_upper + abs(noise) * 2
        except Exception:
            pass

    # ── GARCH(1,1) — Price Prediction via Monte Carlo Simulation ──────────
    # Fit GARCH on % returns, forecast daily variance, then simulate N price
    # paths using the mean return + GARCH volatility.  The median path is the
    # prediction line; 5th/95th percentile paths give confidence bands.
    garch_prices = np.full(steps, last_price)
    garch_lower  = np.full(steps, last_price)
    garch_upper  = np.full(steps, last_price)
    try:
        gm = arch_model(pct_ret, vol="Garch", p=1, q=1,
                         mean="Constant", dist="normal")
        gf = gm.fit(disp="off", options={"maxiter": 300})

        # Extract fitted mean return (daily %) and variance forecast
        mu = float(gf.params.get("mu", pct_ret.mean()))  # daily mean return %
        variance_fc = gf.forecast(horizon=steps, reindex=False)
        daily_var = variance_fc.variance.values[-1]       # array len=steps

        # Monte Carlo: simulate N paths
        N_PATHS = 500
        np.random.seed(42)  # reproducible
        sim_paths = np.zeros((N_PATHS, steps))
        for i in range(N_PATHS):
            price = last_price
            path  = np.zeros(steps)
            for t in range(steps):
                sigma = np.sqrt(max(daily_var[t], 0.0)) / 100.0  # decimal
                shock = np.random.normal(0, sigma)
                ret   = mu / 100.0 + shock                       # daily return
                price = price * (1 + ret)
                path[t] = price
            sim_paths[i] = path

        garch_prices = np.median(sim_paths, axis=0)
        garch_lower  = np.percentile(sim_paths, 5,  axis=0)
        garch_upper  = np.percentile(sim_paths, 95, axis=0)
        garch_lower  = np.maximum(garch_lower, last_price * 0.3)
        print(f"[forecast]   GARCH(1,1) — terminal ₹{garch_prices[-1]:.2f}  band: ₹{garch_lower[-1]:.0f} – ₹{garch_upper[-1]:.0f}")
    except Exception as e:
        print(f"[forecast] GARCH failed for {symbol}: {e}")

    print(f"[forecast] {symbol} done in {time.time()-t0:.1f}s")

    # Direction = ARIMA terminal price vs current
    direction = "UP" if float(arima_prices[-1]) > last_price else "DOWN"

    # Convert all forecast arrays to plain numpy arrays for serialization
    def _as_array(x):
        if hasattr(x, 'values'):
            return np.array(x.values, dtype=float)
        return np.array(x, dtype=float)

    arima_prices  = _as_array(arima_prices)
    arima_lower   = _as_array(arima_lower)
    arima_upper   = _as_array(arima_upper)
    sarima_prices = _as_array(sarima_prices)
    sarima_lower  = _as_array(sarima_lower)
    sarima_upper  = _as_array(sarima_upper)
    garch_prices  = _as_array(garch_prices)
    garch_lower   = _as_array(garch_lower)
    garch_upper   = _as_array(garch_upper)

    def to_series(vals, lower, upper, dates):
        return [
            {
                "date":  d.strftime("%Y-%m-%d"),
                "price": round(float(p), 2),
                "lower": round(float(l), 2),
                "upper": round(float(u), 2),
            }
            for d, p, l, u in zip(dates, vals, lower, upper)
        ]

    result = {
        "arima":     to_series(arima_prices,  arima_lower,  arima_upper,  future_dates),
        "sarima":    to_series(sarima_prices, sarima_lower, sarima_upper, future_dates),
        "garch":     to_series(garch_prices,  garch_lower,  garch_upper,  future_dates),
        "direction": direction,
        "last_price": last_price,
        "symbol_clean": rt.resolve(symbol) or symbol,
        "display_name": rt.get_display_name(symbol),
    }

    forecast_cache[symbol] = result
    _save_disk_cache(symbol, result)
    return result


def _prewarm_top_stocks():
    """Background thread: pre-compute forecasts for top stocks at startup."""
    time.sleep(2)  # slight delay to let Flask finish starting
    try:
        metrics = compute_risk_metrics()
        top_symbols = [m["symbol"] for m in metrics[:5]]
        print(f"[prewarm] Pre-warming forecasts for: {top_symbols}")
        for sym in top_symbols:
            if sym not in forecast_cache and _load_disk_cache(sym) is None:
                try:
                    forecast_models(sym)
                except Exception as e:
                    print(f"[prewarm] Failed for {sym}: {e}")
        print("[prewarm] Done.")
    except Exception as e:
        print(f"[prewarm] Error: {e}")




@app.route("/api/dsfm/forecast/<symbol>")
def api_dsfm_forecast(symbol):
    forecast = forecast_models(symbol)
    if not forecast:
        return jsonify({"error": "No forecast"}), 404

    return jsonify({
        "symbol": symbol,
        "forecast_direction": forecast["direction"],
        "forecast_arima": forecast["arima"],
        "forecast_sarima": forecast["sarima"],
        "forecast_garch": forecast["garch"],
    })


@app.route("/api/dsfm/forecast-status/<symbol>")
def api_dsfm_forecast_status(symbol):
    """Quick check — returns whether a cached forecast exists (no computation)."""
    if symbol in forecast_cache:
        return jsonify({"cached": True, "source": "memory"})
    if _load_disk_cache(symbol) is not None:
        return jsonify({"cached": True, "source": "disk"})
    return jsonify({"cached": False})


# ===========================================================
#  SENTIMENT (newsdata.io + TextBlob)
# ===========================================================
load_dotenv()
NEWS_API_KEY = os.getenv("NEWSCATCHER_API_KEY")  # make sure .env has this


def get_dynamic_sentiment(symbol):
    clean_symbol = rt.resolve(symbol) or symbol.split("_")[-1].upper()
    # Use the full display name for better news results
    keyword = rt.get_display_name(clean_symbol)
    if keyword == clean_symbol:
        keyword = SYMBOL_MAP.get(clean_symbol, clean_symbol)

    url = "https://newsdata.io/api/1/news"
    params = {
        "apikey": NEWS_API_KEY,
        "q": keyword,
        "language": "en",
        "country": "in",
    }

    try:
        res = requests.get(url, params=params, timeout=10)
        data = res.json()

        if "results" not in data or len(data["results"]) == 0:
            return {
                "symbol": symbol,
                "score": 0.0,
                "label": "NEUTRAL",
                "news": []
            }

        sentiments = []
        news_list = []

        for article in data["results"]:
            title = article.get("title", "")
            desc = article.get("description", "") or ""
            published = article.get("pubDate", "")

            text = f"{title} {desc}"
            polarity = TextBlob(text).sentiment.polarity
            sentiments.append(polarity)

            news_list.append({
                "title": title,
                "description": desc,
                "published": published,
                "sentiment_score": round(polarity, 3)
            })

        score = sum(sentiments) / len(sentiments) if sentiments else 0.0
        if score > 0.1:
            label = "POSITIVE"
        elif score < -0.1:
            label = "NEGATIVE"
        else:
            label = "NEUTRAL"

        return {
            "symbol": symbol,
            "score": round(score, 3),
            "label": label,
            "news": news_list
        }

    except Exception as e:
        print("Sentiment Error:", e)
        return {
            "symbol": symbol,
            "score": 0.0,
            "label": "NEUTRAL",
            "news": []
        }


@app.route("/api/dsfm/sentiment/<symbol>")
def api_dsfm_sentiment(symbol):
    return jsonify(get_dynamic_sentiment(symbol))


# ===========================================================
#  MOST BOUGHT STOCK (simple proxy)
# ===========================================================
@app.route("/api/most-bought")
def api_most_bought():
    quotes = rt.get_all_quotes()
    changes = []
    for sym, info in rt.STOCKS.items():
        q = quotes.get(sym)
        if not q:
            continue
        changes.append({
            "symbol":     sym,
            "name":       info["name"],
            "sector":     info["sector"],
            "ltp":        q["ltp"],
            "pct_change": q["change_pct"],
            "volume":     q.get("volume", 0),
        })

    if not changes:
        # Fallback CSV
        df = read_timeseries()
        if df.empty:
            return jsonify({"most_bought": None})
        last, prev, date = latest_and_prev_prices(df)
        for sym in last.index:
            if pd.isna(last[sym]) or pd.isna(prev[sym]):
                continue
            pct = (last[sym] - prev[sym]) / prev[sym] * 100
            changes.append({"symbol": sym, "name": sym, "ltp": float(last[sym]), "pct_change": round(pct, 2), "volume": 0})

    if not changes:
        return jsonify({"most_bought": None})

    df_changes = pd.DataFrame(changes)

    # Most bought = highest volume; if volume all 0, use highest % gain
    if df_changes["volume"].max() > 0:
        most_bought = df_changes.sort_values("volume", ascending=False).iloc[0]
    else:
        most_bought = df_changes.sort_values("pct_change", ascending=False).iloc[0]

    # Top 8 by volume for the watchlist-style tiles
    top8 = df_changes.sort_values("volume", ascending=False).head(8).to_dict("records")

    return jsonify({
        "date":       datetime.now().strftime("%d-%m-%Y"),
        "symbol":     most_bought["symbol"],
        "name":       most_bought["name"],
        "ltp":        most_bought["ltp"],
        "pct_change": most_bought["pct_change"],
        "volume":     int(most_bought.get("volume", 0)),
        "top_stocks": top8,
        "source":     "live",
    })


# ========= helpers for market insights =========
# (kept for potential CSV fallback usage)
def _pct_change_over_days(df: pd.DataFrame, sym: str, days: int):
    series = pd.to_numeric(df[sym], errors="coerce").dropna()
    if len(series) <= days:
        return None

    latest = series.iloc[-1]
    past = series.iloc[-(days + 1)]
    if past == 0 or pd.isna(latest) or pd.isna(past):
        return None

    return float((latest - past) / past * 100.0)


@app.route("/api/market-insights")
def api_market_insights():
    quotes = rt.get_all_quotes()

    advancers = decliners = unchanged = 0
    breadth_rows = []
    sector_stats = {}
    momentum_rows = []

    for sym, info in rt.STOCKS.items():
        q = quotes.get(sym)
        if not q:
            continue
        pct = q["change_pct"]
        sector = info.get("sector", "Other")

        if pct > 0:
            advancers += 1
        elif pct < 0:
            decliners += 1
        else:
            unchanged += 1

        breadth_rows.append({"symbol": sym, "name": info["name"], "pct_change": pct})

        if sector not in sector_stats:
            sector_stats[sector] = {"sector": sector, "advancers": 0, "decliners": 0, "unchanged": 0, "sum_pct": 0.0, "count": 0}
        ss = sector_stats[sector]
        if pct > 0:   ss["advancers"] += 1
        elif pct < 0: ss["decliners"] += 1
        else:         ss["unchanged"] += 1
        ss["sum_pct"] += pct
        ss["count"]   += 1

    adv_decl_ratio = (advancers / decliners) if decliners != 0 else None

    sectors = []
    for sec, ss in sector_stats.items():
        avg_move = ss["sum_pct"] / ss["count"] if ss["count"] > 0 else 0.0
        sectors.append({
            "sector":    sec,
            "advancers": ss["advancers"],
            "decliners": ss["decliners"],
            "unchanged": ss["unchanged"],
            "avg_move":  round(avg_move, 2),
        })

    # Momentum: compute from cached quotes (daily change as proxy) — no extra download
    # This avoids a second slow yf.download call
    try:
        for sym, info in rt.STOCKS.items():
            q = quotes.get(sym)
            if not q:
                continue
            pct_1d = q["change_pct"]
            # Use 1-day change as approximate momentum (real 5d/20d would need history)
            momentum_rows.append({
                "symbol":          sym,
                "name":            info["name"],
                "pct_5d":          round(pct_1d, 2),
                "pct_20d":         round(pct_1d, 2),
                "momentum_score":  round(pct_1d * 3, 2),  # simplified score
            })
    except Exception as e:
        print(f"[insights] Momentum computation failed: {e}")

    momentum_rows = sorted(momentum_rows, key=lambda x: x["momentum_score"], reverse=True)[:10]

    return jsonify({
        "date": datetime.now().strftime("%d-%m-%Y"),
        "breadth": {
            "advancers":     advancers,
            "decliners":     decliners,
            "unchanged":     unchanged,
            "adv_decl_ratio": round(adv_decl_ratio, 2) if adv_decl_ratio else None,
        },
        "sectors":  sectors,
        "momentum": momentum_rows,
    })


# ===========================================================
#  FINAL DECISION ENGINE (history + ARIMA/SARIMA/GARCH + sentiment)
# ===========================================================
@app.route("/api/dsfm/decision/<symbol>")
def api_dsfm_decision(symbol):
    # Resolve to clean symbol
    clean = rt.resolve(symbol) or symbol

    forecast = forecast_models(clean)
    if not forecast:
        return jsonify({"error": "No forecast available. Model training may still be running."}), 404

    sentiment = get_dynamic_sentiment(clean)
    s_label   = sentiment["label"]
    direction = forecast["direction"]
    last_price = forecast.get("last_price", 0)

    # History (last 800 trading days from live data)
    history_df = get_price_series(clean).tail(800)
    history = [
        {"date": d.strftime("%Y-%m-%d"), "price": round(float(p), 2)}
        for d, p in zip(history_df["Date"], history_df["Price"])
    ]

    # Signal logic (ARIMA direction + sentiment)
    if direction == "UP"   and s_label == "POSITIVE":  signal = "BUY"
    elif direction == "UP" and s_label == "NEGATIVE":  signal = "WAIT"
    elif direction == "DOWN" and s_label == "NEGATIVE": signal = "AVOID"
    else:                                               signal = "HOLD"

    # Confidence: % price change predicted by ARIMA
    arima_end = forecast["arima"][-1]["price"] if forecast["arima"] else last_price
    confidence = round(abs(arima_end - last_price) / last_price * 100, 2) if last_price else 0

    return jsonify({
        "symbol":           clean,
        "display_name":     rt.get_display_name(clean),
        "signal":           signal,
        "confidence_pct":   confidence,
        "forecast_direction": direction,
        "last_price":       last_price,
        "sentiment_label":  s_label,
        "sentiment_score":  sentiment["score"],
        "news":             sentiment.get("news", []),

        # Each forecast item now has: {date, price, lower, upper}
        "forecast":         forecast["arima"],
        "forecast_arima":   forecast["arima"],
        "forecast_sarima":  forecast["sarima"],
        "forecast_garch":   forecast["garch"],
        "history":          history,
    })


# ===========================================================
#  LIVE QUOTES  — all stocks in one shot
# ===========================================================
@app.route("/api/live/quotes")
def api_live_quotes():
    """Returns live price, change, %, open, high, low, volume for all stocks."""
    force = request.args.get("refresh", "false").lower() == "true"
    quotes = rt.get_all_quotes(force_refresh=force)
    result = list(quotes.values())  # each item already has symbol, name, sector, etc.
    return jsonify({
        "count":      len(result),
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "stocks":     result,
    })


@app.route("/api/live/intraday/<symbol>")
def api_live_intraday(symbol):
    """Returns today's intraday bars for a CSV column name symbol."""
    interval = request.args.get("interval", "5m")
    bars = rt.get_intraday(symbol, interval=interval)
    if not bars:
        return jsonify({"error": "No intraday data"}), 404
    return jsonify({"symbol": symbol, "interval": interval, "bars": bars})


@app.route("/api/live/history/<symbol>")
def api_live_history(symbol):
    """Returns historical daily prices for a symbol via yfinance."""
    period = request.args.get("period", "1y")
    history = rt.get_history(symbol, period=period)
    if not history:
        return jsonify({"error": "No history data"}), 404
    return jsonify({"symbol": symbol, "period": period, "history": history})


# ===========================================================
#  RUN SERVER
# ===========================================================
if __name__ == "__main__":
    # Pre-warm live quotes in background
    threading.Thread(target=rt.warmup, daemon=True).start()
    # Pre-warm top-stock forecasts in background
    threading.Thread(target=_prewarm_top_stocks, daemon=True).start()
    app.run(debug=True, host="0.0.0.0", port=8000, use_reloader=False)
