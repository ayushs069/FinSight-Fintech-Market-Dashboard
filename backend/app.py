# backend/app.py
from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from arch import arch_model
from datetime import timedelta
from math import sqrt
from textblob import TextBlob
from dotenv import load_dotenv
import requests
from pmdarima import auto_arima

app = Flask(__name__)
CORS(app)

# ============================
#  SYMBOL → REAL COMPANY NAME MAP (for news query)
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
    "BAJAJAUTO": "Bajaj Auto",
    "MM": "Mahindra and Mahindra",
    "LT": "Larsen and Toubro",
}

# ============================
#  PATHS
# ============================
BASE_DIR = os.path.dirname(__file__)
DATA_CSV = os.path.join(BASE_DIR, "data", "market_data.csv")
HOLDINGS_CSV = os.path.join(BASE_DIR, "data", "holdings.csv")

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
#  PORTFOLIO (synthetic)
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
        series = pd.to_numeric(df[sym], errors="coerce").dropna()
        if series.empty:
            continue

        first_price = series.iloc[0]

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
        if daily.empty:
            continue

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
#  FORECAST MODELS (ARIMA, SARIMA, GARCH on log-returns)
# ===========================================================
forecast_cache = {}


def forecast_models(symbol, steps=30):
    if symbol in forecast_cache:
        return forecast_cache[symbol]

    s = get_price_series(symbol)
    if s.empty or len(s) < 2:
        return None

    prices = s["Price"]
    if prices.empty or len(prices) < 2:
        return None

    last_date = s["Date"].iloc[-1]

    # Log returns (stationary)
    returns = np.log(prices).diff().dropna()
    if returns.empty:
        return None

    # Use values to avoid weird index warnings
    r_values = returns.values

    # ---------- ARIMA ----------
    arima_model = auto_arima(
        r_values,
        seasonal=False,
        stepwise=True,
        suppress_warnings=True,
        error_action="ignore"
    )
    arima_r = arima_model.predict(n_periods=steps)
    arima_prices = prices.iloc[-1] * np.exp(np.cumsum(arima_r))
    arima_prices = np.asarray(arima_prices)

    # ---------- SARIMA ----------
    sarima_model = auto_arima(
        r_values,
        seasonal=True,
        m=12,
        stepwise=True,
        suppress_warnings=True,
        error_action="ignore"
    )
    sarima_r = sarima_model.predict(n_periods=steps)
    sarima_prices = prices.iloc[-1] * np.exp(np.cumsum(sarima_r))
    sarima_prices = np.asarray(sarima_prices)

    # ---------- GARCH ----------
    garch_mod = arch_model(r_values, vol="Garch", p=1, q=1, mean="Zero")
    garch_fit = garch_mod.fit(disp="off")

    # Forecast variance specific to the stock
    garch_forecast = garch_fit.forecast(horizon=steps)
    garch_var = garch_forecast.variance.values[-1]

    # Generate random noise based on stock-specific variance
    garch_r = np.random.normal(0, np.sqrt(garch_var), steps)

    # Convert log returns to prices
    garch_prices = prices.iloc[-1] * np.exp(np.cumsum(garch_r))
    garch_prices = np.asarray(garch_prices)

    future_dates = [last_date + timedelta(days=i + 1) for i in range(steps)]

    direction = "UP" if len(arima_prices) > 0 and arima_prices[-1] > prices.iloc[-1] else "DOWN"

    forecast_cache[symbol] = {
        "arima": [
            {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
            for d, p in zip(future_dates, arima_prices)
        ],
        "sarima": [
            {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
            for d, p in zip(future_dates, sarima_prices)
        ],
        "garch": [
            {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
            for d, p in zip(future_dates, garch_prices)
        ],
        "direction": direction
    }
    return forecast_cache[symbol]


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


# ===========================================================
#  SENTIMENT (newsdata.io + TextBlob)
# ===========================================================
load_dotenv()
NEWS_API_KEY = os.getenv("NEWSCATCHER_API_KEY")  # make sure .env has this


def get_dynamic_sentiment(symbol):
    clean_symbol = symbol.split("_")[-1].upper()
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
    df = read_timeseries()
    if df.empty:
        return jsonify({"error": "No data"}), 404

    last, prev, last_date = latest_and_prev_prices(df)
    advancers = decliners = unchanged = 0
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

    price_cols = [c for c in df.columns if c != "Date"]
    momentum_rows = []

    for sym in price_cols:
        pct_5d = _pct_change_over_days(df, sym, 5)
        pct_20d = _pct_change_over_days(df, sym, 20)
        if pct_5d is None or pct_20d is None:
            continue

        score = 2 * pct_5d + pct_20d
        momentum_rows.append({
            "symbol": sym,
            "pct_5d": round(pct_5d, 2),
            "pct_20d": round(pct_20d, 2),
            "momentum_score": round(score, 2),
        })

    momentum_rows = sorted(momentum_rows, key=lambda x: x["momentum_score"], reverse=True)[:10]

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
#  FINAL DECISION ENGINE (history + ARIMA/SARIMA/GARCH + sentiment)
# ===========================================================
@app.route("/api/dsfm/decision/<symbol>")
def api_dsfm_decision(symbol):
    forecast = forecast_models(symbol)
    if not forecast:
        return jsonify({"error": "No forecast"}), 404

    sentiment = get_dynamic_sentiment(symbol)
    s_label = sentiment["label"]
    direction = forecast["direction"]

    # History for last ~800 days
    history_df = get_price_series(symbol).tail(800)
    history = [
        {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
        for d, p in zip(history_df["Date"], history_df["Price"])
    ]

    # Simple rule
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
        "news": sentiment.get("news", []),

        "forecast": forecast["arima"],        # main forecast
        "forecast_arima": forecast["arima"],
        "forecast_sarima": forecast["sarima"],
        "forecast_garch": forecast["garch"],
        "history": history,
    })


# ===========================================================
#  RUN SERVER
# ===========================================================
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
