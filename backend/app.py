# backend/app.py
from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
from statsmodels.tsa.arima.model import ARIMA
from math import sqrt
from datetime import timedelta
from textblob import TextBlob

app = Flask(__name__)
CORS(app)

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

# FIX: Fill missing stock prices
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
#  STOCK API
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
#  PORTFOLIO API
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
#  FORECAST (ARIMA)
# ===========================================================
def forecast_arima(symbol, steps=30):
    s = get_price_series(symbol)
    if s.empty:
        return None

    series = s["Price"]

    # Use log returns instead of price
    log_returns = np.log(series / series.shift(1)).dropna()

    model = ARIMA(log_returns, order=(1, 0, 1))
    fit = model.fit()

    forecast_returns = fit.forecast(steps=steps)
    last_price = series.iloc[-1]

    # Convert back to price
    forecast_prices = []
    price = last_price
    for r in forecast_returns:
        price = price * np.exp(r)
        forecast_prices.append(price)

    future_dates = [
        s["Date"].iloc[-1] + timedelta(days=i + 1) for i in range(steps)
    ]

    direction = "UP" if forecast_prices[-1] > last_price else "DOWN"

    return {
        "symbol": symbol,
        "last_actual": float(last_price),
        "future": [
            {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
            for d, p in zip(future_dates, forecast_prices)
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
#  SENTIMENT
# ===========================================================
def get_sentiment(symbol):
    """
    Returns sentiment for a stock using a sentiment CSV.
    Handles:
    - missing file
    - missing symbol in file
    - sector prefix (e.g., CDUR_ASIANPAINT → ASIANPAINT)
    """

    sym_clean = symbol.split("_")[-1].upper()  # clean symbol name

    # If no sentiment CSV → return NEUTRAL
    if not os.path.exists(SENTIMENT_CSV):
        return {"symbol": symbol, "score": 0.0, "label": "NEUTRAL"}

    # Load sentiment CSV safely
    sdf = pd.read_csv(SENTIMENT_CSV)
    sdf.columns = [c.strip().lower() for c in sdf.columns]

    # Normalize symbol column
    if "symbol" not in sdf.columns:
        return {"symbol": symbol, "score": 0.0, "label": "NEUTRAL"}

    # Filter rows for this stock
    sdf = sdf[sdf["symbol"].str.upper() == sym_clean]

    # No sentiment for this stock → return neutral
    if sdf.empty:
        return {"symbol": symbol, "score": 0.0, "label": "NEUTRAL"}

    # Case 1: direct sentiment scores
    if "sentiment_score" in sdf.columns:
        score = float(sdf["sentiment_score"].mean())
    # Case 2: compute polarity from headlines
    elif "headline" in sdf.columns:
        from textblob import TextBlob
        scores = [TextBlob(str(h)).sentiment.polarity for h in sdf["headline"]]
        score = float(np.mean(scores)) if scores else 0.0
    else:
        score = 0.0

    # Convert score → label
    if score > 0.1:
        label = "POSITIVE"
    elif score < -0.1:
        label = "NEGATIVE"
    else:
        label = "NEUTRAL"

    return {"symbol": symbol, "score": score, "label": label}



@app.route("/api/dsfm/sentiment/<symbol>")
def api_dsfm_sentiment(symbol):
    return jsonify(get_sentiment(symbol))


# ===========================================================
#  FINAL DECISION ENGINE
# ===========================================================
@app.route("/api/dsfm/decision/<symbol>")
def api_dsfm_decision(symbol):
    forecast = forecast_arima(symbol)
    if not forecast:
        return jsonify({"error": "No forecast"}), 404

    sentiment = get_sentiment(symbol)
    direction = forecast["direction"]
    s_label = sentiment["label"]

    # Generate history for last 200 days
    history_df = get_price_series(symbol).tail(800)
    history = [
        {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
        for d, p in zip(history_df["Date"], history_df["Price"])
    ]

    # Decision logic
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
        "forecast": forecast["future"],
        "history": history        # 👈 IMPORTANT
    })

# ===========================================================
#  MOST BOUGHT STOCK (based on demand from market_data)
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

    # stock with largest percentage gain = most bought
    most_bought = df_changes.sort_values("pct_change", ascending=False).iloc[0]

    return jsonify({
        "date": date,
        "symbol": most_bought["symbol"],
        "ltp": most_bought["ltp"],
        "pct_change": most_bought["pct_change"]
    })


# ===========================================================
#  RUN SERVER
# ===========================================================
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
