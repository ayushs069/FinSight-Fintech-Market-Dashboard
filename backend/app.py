# backend/app.py
from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
from statsmodels.tsa.arima.model import ARIMA
from arch import arch_model
from math import sqrt
from datetime import timedelta
from textblob import TextBlob
from dotenv import load_dotenv
import requests


app = Flask(__name__)
CORS(app)

# ============================
#  SYMBOL → REAL COMPANY NAME MAP
# ============================
SYMBOL_MAP = {
    "ASIANPAINT": "Asian Paints",
    "HDFCBANK": "HDFC Bank",
    "NTPC": "NTPC",
    "MARUTI": "Maruti Suzuki",
    "WIPRO": "Wipro",
    "SUNPHARMA": "Sun Pharma",
    "ULTRACEMCO": "Ultratech Cement",
    "SHREECEM": "Shree Cement",
    "TECHM": "Tech Mahindra",
    "TATAMTRDVR": "Tata Motors DVR",
    "HINDUNILVR": "Hindustan Unilever",
    "HINDUNILVR": "HUL",  # optional alias
    "BAJAJ-AUTO": "Bajaj Auto",
    "BAJAJAUTO": "Bajaj Auto",
    "M&M": "Mahindra and Mahindra",
    "MM": "Mahindra and Mahindra",
    "LT": "Larsen and Toubro",
}

# ============================
#  PATHS
# ============================
BASE_DIR = os.path.dirname(__file__)
DATA_CSV = os.path.join(BASE_DIR, "data", "market_data.csv")
HOLDINGS_CSV = os.path.join(BASE_DIR, "data", "holdings.csv")
SENTIMENT_CSV = os.path.join(BASE_DIR, "data", "sentiment_sample.csv")


# ============================
#  HELPERS
# ============================
def read_timeseries():
    """Reads the wide CSV: Date + many tickers."""
    if not os.path.exists(DATA_CSV):
        return pd.DataFrame()

    df = pd.read_csv(DATA_CSV)

    # Normalize date column
    if "Date" not in df.columns:
        return pd.DataFrame()

    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df = df.dropna(how="all", subset=[c for c in df.columns if c != "Date"])
    df = df.sort_values("Date").reset_index(drop=True)

    # Fill missing stock prices
    df = df.ffill().bfill()
    return df


def latest_and_prev_prices(df):
    """Return last and previous row price series."""
    if df.empty:
        return pd.Series(dtype=float), pd.Series(dtype=float), None

    last_row = df.iloc[-1]
    prev_row = df.iloc[-2] if len(df) >= 2 else df.iloc[-1]

    last_date = last_row["Date"]

    last = pd.to_numeric(last_row.drop("Date"), errors="coerce")
    prev = pd.to_numeric(prev_row.drop("Date"), errors="coerce")

    return last, prev, last_date.strftime("%d-%m-%Y")


def get_price_series(symbol):
    """Return a clean Date + Price series for one symbol."""
    df = read_timeseries()
    if df.empty or symbol not in df.columns:
        return pd.DataFrame()

    df = df[["Date", symbol]].dropna()
    df = df.rename(columns={symbol: "Price"})
    df["Price"] = pd.to_numeric(df["Price"], errors="coerce")
    df = df.dropna()

    return df


# ===========================================================
#  NIFTY API
# ===========================================================
@app.route("/api/nifty")
def api_nifty():
    df = read_timeseries()
    if df.empty:
        return jsonify({"error": "No data"}), 404

    df["NIFTY"] = df.drop(columns=["Date"]).mean(axis=1)

    latest = df.iloc[-1]["NIFTY"]
    prev = df.iloc[-2]["NIFTY"]
    change_pct = (latest - prev) / prev * 100

    date = df.iloc[-1]["Date"].strftime("%d-%m-%Y")

    return jsonify({
        "nifty_value": round(latest, 2),
        "change_pct": round(change_pct, 2),
        "date": date
    })


# ===========================================================
#  STOCK API (single symbol snapshot)
# ===========================================================
@app.route("/api/stock/<symbol>")
def api_stock(symbol):
    df = read_timeseries()
    if df.empty or symbol not in df.columns:
        return jsonify({"error": "Symbol not found"}), 404

    df = df.dropna(subset=[symbol])
    df["Date"] = pd.to_datetime(df["Date"])

    latest = df.iloc[-1][symbol]
    prev = df.iloc[-2][symbol]

    change = latest - prev
    change_pct = change / prev * 100

    return jsonify({
        "symbol": symbol,
        "latest_value": round(latest, 2),
        "change": round(change, 2),
        "change_pct": round(change_pct, 2),
        "date": df.iloc[-1]["Date"].strftime("%d-%m-%Y")
    })


# ===========================================================
#  MARKET MOVERS (TOP GAINERS / LOSERS)
# ===========================================================
@app.route("/api/market-movers")
def api_market_movers():
    df = read_timeseries()
    last, prev, last_date = latest_and_prev_prices(df)
    if last.empty:
        return jsonify({"gainers": [], "losers": []})

    movers = []
    for sym in last.index:
        if pd.isna(last[sym]) or pd.isna(prev[sym]):
            continue

        pct = (last[sym] - prev[sym]) / prev[sym] * 100
        movers.append({
            "symbol": sym,
            "ltp": float(last[sym]),
            "pct_change": round(pct, 2)
        })

    movers_df = pd.DataFrame(movers)

    gainers = movers_df.sort_values("pct_change", ascending=False).head(10).to_dict("records")
    losers = movers_df.sort_values("pct_change", ascending=True).head(10).to_dict("records")

    return jsonify({"date": last_date, "gainers": gainers, "losers": losers})


# ===========================================================
#  PORTFOLIO (simple synthetic holdings)
# ===========================================================
@app.route("/api/portfolio")
def api_portfolio():
    df = read_timeseries()
    if df.empty:
        return jsonify({"holdings": [], "totals": {}})

    last, prev, date = latest_and_prev_prices(df)

    rows = []
    for sym in last.index:
        ltp = float(last[sym])
        first_price = pd.to_numeric(df[sym], errors="coerce").dropna().iloc[0]

        invested = first_price * 1
        current_value = ltp * 1

        today_pl = (ltp - float(prev[sym])) if not pd.isna(prev[sym]) else 0
        profit_loss = current_value - invested
        profit_loss_pct = (profit_loss / invested * 100) if invested != 0 else 0

        rows.append({
            "symbol": sym,
            "quantity": 1,
            "avg_cost": round(first_price, 2),
            "ltp": ltp,
            "invested": round(invested, 2),
            "current_value": round(current_value, 2),
            "profit_loss": round(profit_loss, 2),
            "profit_loss_pct": round(profit_loss_pct, 2),
            "today_pl": round(today_pl, 2)
        })

    totals = {
        "total_invested": sum(r["invested"] for r in rows),
        "total_current_value": sum(r["current_value"] for r in rows),
        "total_profit_loss": sum(r["profit_loss"] for r in rows),
        "total_today_pl": sum(r["today_pl"] for r in rows),
        "date": date
    }

    return jsonify({"holdings": rows, "totals": totals})


# ===========================================================
#  NIFTY HISTORY FOR CHART
# ===========================================================
@app.route("/api/nifty/history")
def api_nifty_history():
    df = read_timeseries()
    df["NIFTY"] = df.drop(columns=["Date"]).mean(axis=1)
    df = df[["Date", "NIFTY"]].tail(200)
    return jsonify(df.to_dict("records"))


# ===========================================================
#  DSFM TOP STOCKS  (Sharpe / Volatility)
# ===========================================================
def compute_risk_metrics():
    df = read_timeseries()
    if df.empty:
        return []

    df = df.sort_values("Date")
    price_cols = [c for c in df.columns if c != "Date"]

    trading_days = 252
    results = []

    for sym in price_cols:
        series = pd.to_numeric(df[sym], errors="coerce").dropna()
        if len(series) < 300:
            continue

        daily = series.pct_change().dropna()
        mean_ret = daily.mean()
        vol = daily.std()

        annual_return = (1 + mean_ret) ** trading_days - 1
        annual_vol = vol * sqrt(trading_days)
        sharpe = (annual_return / annual_vol) if annual_vol != 0 else 0

        results.append({
            "symbol": sym,
            "annual_return": round(annual_return * 100, 2),
            "volatility": round(annual_vol * 100, 2),
            "sharpe": round(sharpe, 2)
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
#  FORECAST (ARIMA on log-returns)
# ===========================================================
def forecast_arima(symbol, steps=30):
    s = get_price_series(symbol)
    if s.empty:
        return None

    series = s["Price"]

    # ARIMA on prices, ARIMA(p=5, d=1, q=0) is a stable general-purpose model
    model = ARIMA(series, order=(5, 1, 0))
    fit = model.fit()

    # Forecast future prices
    forecast = fit.forecast(steps=steps)

    last_price = series.iloc[-1]

    future_dates = [
        s["Date"].iloc[-1] + timedelta(days=i+1)
        for i in range(steps)
    ]

    # Last forecasted price decides direction
    direction = "UP" if forecast.iloc[-1] > last_price else "DOWN"

    return {
        "symbol": symbol,
        "last_actual": float(last_price),
        "future": [
            {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
            for d, p in zip(future_dates, forecast)
        ],
        "direction": direction
    }


@app.route("/api/dsfm/forecast/<symbol>")
def api_dsfm_forecast(symbol):
    data = forecast_arima(symbol)
    if not data:
        return jsonify({"error": "No forecast"}), 404
    return jsonify(data)



# ===========================================================
#  SENTIMENT (with news display integration)
# ===========================================================

load_dotenv()
NEWS_API_KEY = os.getenv("NEWSCATCHER_API_KEY")

def get_dynamic_sentiment(symbol):
    clean_symbol = symbol.split("_")[-1].upper()
    keyword = SYMBOL_MAP.get(clean_symbol, clean_symbol)  # Extract keyword from symbol

    url = "https://newsdata.io/api/1/news"
    params = {
        "apikey": NEWS_API_KEY,
        "q": keyword,
        "language": "en",
        "country": "in"
    }

    try:
        res = requests.get(url, params=params)
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
            desc = article.get("description", "")
            published_date = article.get("published_date", "")

            # Combine title and description for sentiment analysis
            text = title + " " + desc
            polarity = TextBlob(text).sentiment.polarity
            sentiments.append(polarity)

            # Add article details to the news list
            news_list.append({
                "title": title,
                "description": desc,
                "published_date": published_date,
                "sentiment_score": round(polarity, 3)
            })

        score = sum(sentiments) / len(sentiments) if sentiments else 0.0
        label = (
            "POSITIVE" if score > 0.1 else
            "NEGATIVE" if score < -0.1 else
            "NEUTRAL"
        )

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
    df = read_timeseries()
    if df.empty:
        return jsonify({"most_bought": None})

    last, prev, date = latest_and_prev_prices(df)

    changes = []
    for sym in last.index:
        if pd.isna(last[sym]) or pd.isna(prev[sym]):
            continue
        pct = (last[sym] - prev[sym]) / prev[sym] * 100
        changes.append({
            "symbol": sym,
            "ltp": float(last[sym]),
            "pct_change": round(pct, 2)
        })

    if not changes:
        return jsonify({"most_bought": None})

    df_changes = pd.DataFrame(changes)
    most_bought = df_changes.sort_values("pct_change", ascending=False).iloc[0]

    return jsonify({
        "date": date,
        "symbol": most_bought["symbol"],
        "ltp": most_bought["ltp"],
        "pct_change": most_bought["pct_change"]
    })

# ========= helpers for market insights =========

def _pct_change_over_days(df: pd.DataFrame, sym: str, days: int):
    """
    Percentage change over `days` for a single symbol.
    Returns None if not enough data.
    """
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
    """
    Deep Market Insights on top of market_movers:
    - Market breadth (advancers vs decliners)
    - Sector-wise breadth & average move
    - Momentum table (5-day & 20-day)
    """
    df = read_timeseries()
    if df.empty:
        return jsonify({"error": "No data"}), 404

    # -------------- breadth for the last day --------------
    last, prev, last_date = latest_and_prev_prices(df)
    advancers = 0
    decliners = 0
    unchanged = 0

    breadth_rows = []
    for sym in last.index:
        if pd.isna(last[sym]) or pd.isna(prev[sym]):
            continue

        change = last[sym] - prev[sym]
        pct = (change / prev[sym]) * 100.0 if prev[sym] != 0 else 0.0

        if change > 0:
            advancers += 1
        elif change < 0:
            decliners += 1
        else:
            unchanged += 1

        breadth_rows.append({"symbol": sym, "pct_change": pct})

    adv_decl_ratio = (advancers / decliners) if decliners != 0 else None

    # -------------- sector-wise stats --------------
    # Sector = text before first "_", e.g. "AUTO_MARUTI" -> "AUTO"
    sector_stats = {}

    for row in breadth_rows:
        sym = row["symbol"]
        pct = row["pct_change"]
        sector = sym.split("_", 1)[0] if "_" in sym else "OTHER"

        if sector not in sector_stats:
            sector_stats[sector] = {
                "sector": sector,
                "advancers": 0,
                "decliners": 0,
                "unchanged": 0,
                "sum_pct_change": 0.0,
                "count": 0,
            }

        stat = sector_stats[sector]
        if pct > 0:
            stat["advancers"] += 1
        elif pct < 0:
            stat["decliners"] += 1
        else:
            stat["unchanged"] += 1

        stat["sum_pct_change"] += pct
        stat["count"] += 1

    sectors = []
    for sec, stat in sector_stats.items():
        avg_move = stat["sum_pct_change"] / stat["count"] if stat["count"] > 0 else 0.0
        sectors.append({
            "sector": sec,
            "advancers": stat["advancers"],
            "decliners": stat["decliners"],
            "unchanged": stat["unchanged"],
            "avg_move": round(avg_move, 2),
        })

    # -------------- momentum table (5d & 20d) --------------
    price_cols = [c for c in df.columns if c != "Date"]
    momentum_rows = []

    for sym in price_cols:
        pct_5d = _pct_change_over_days(df, sym, 5)
        pct_20d = _pct_change_over_days(df, sym, 20)
        if pct_5d is None or pct_20d is None:
            continue

        # simple momentum score: recent 5d has double weight
        score = 2 * pct_5d + pct_20d

        momentum_rows.append({
            "symbol": sym,
            "pct_5d": round(pct_5d, 2),
            "pct_20d": round(pct_20d, 2),
            "momentum_score": round(score, 2),
        })

    # top 10 strongest momentum
    momentum_rows = sorted(momentum_rows, key=lambda x: x["momentum_score"], reverse=True)[:10]

    # -------------- final payload --------------
    return jsonify({
        "date": last_date,
        "breadth": {
            "advancers": advancers,
            "decliners": decliners,
            "unchanged": unchanged,
            "adv_decl_ratio": adv_decl_ratio,
        },
        "sectors": sectors,
        "momentum": momentum_rows,
    })


# ===========================================================
#  FINAL DECISION ENGINE (history + ARIMA only)
# ===========================================================
@app.route("/api/dsfm/decision/<symbol>")
def api_dsfm_decision(symbol):

    # Run ARIMA forecast
    arima = forecast_arima(symbol)

    if not arima:
        return jsonify({"error": "No forecast"}), 404

    # Get sentiment (FIXED)
    sentiment = get_dynamic_sentiment(symbol)
    direction = arima["direction"]
    s_label = sentiment["label"]

    # Build 800-day historical series
    history_df = get_price_series(symbol).tail(800)
    history = [
        {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
        for d, p in zip(history_df["Date"], history_df["Price"])
    ]

    # Final decision rule
    if direction == "UP" and s_label == "POSITIVE":
        signal = "BUY"
    elif direction == "UP" and s_label == "NEGATIVE":
        signal = "WAIT"
    elif direction == "DOWN" and s_label == "NEGATIVE":
        signal = "AVOID"
    else:
        signal = "HOLD"

    return jsonify({
        "symbol": symbol,
        "signal": signal,
        "forecast_direction": direction,
        "sentiment_label": s_label,
        "sentiment_score": sentiment["score"],

        # Forecast used by frontend
        "forecast": arima["future"],

        # For compatibility (frontend can ignore these)
        "forecast_arima": arima["future"],
        "forecast_garch": [],

        "history": history
    })


# ===========================================================
#  RUN SERVER
# ===========================================================
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
