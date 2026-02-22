# backend/realtime.py
"""
Real-time data layer using yfinance.
All stocks are identified by their clean Yahoo Finance ticker (e.g. RELIANCE.NS).
Display names are human-readable (e.g. "Reliance Industries").
"""

import yfinance as yf
import pandas as pd
import threading
import time

# ─────────────────────────────────────────────────────────────────────────────
#  Master stock registry
#  key       = clean short symbol used everywhere in the app
#  yf_ticker = Yahoo Finance ticker
#  name      = full human-readable name
#  sector    = sector tag
# ─────────────────────────────────────────────────────────────────────────────
STOCKS = {
    "RELIANCE":    {"yf": "RELIANCE.NS",   "name": "Reliance Industries",      "sector": "Oil & Gas"},
    "TCS":         {"yf": "TCS.NS",        "name": "Tata Consultancy Services", "sector": "IT"},
    "HDFCBANK":    {"yf": "HDFCBANK.NS",   "name": "HDFC Bank",                "sector": "Finance"},
    "INFY":        {"yf": "INFY.NS",       "name": "Infosys",                  "sector": "IT"},
    "ICICIBANK":   {"yf": "ICICIBANK.NS",  "name": "ICICI Bank",               "sector": "Finance"},
    "HINDUNILVR":  {"yf": "HINDUNILVR.NS", "name": "Hindustan Unilever",       "sector": "FMCG"},
    "SBIN":        {"yf": "SBIN.NS",       "name": "State Bank of India",      "sector": "Finance"},
    "BHARTIARTL":  {"yf": "BHARTIARTL.NS", "name": "Bharti Airtel",            "sector": "Telecom"},
    "KOTAKBANK":   {"yf": "KOTAKBANK.NS",  "name": "Kotak Mahindra Bank",      "sector": "Finance"},
    "WIPRO":       {"yf": "WIPRO.NS",      "name": "Wipro",                    "sector": "IT"},
    "HCLTECH":     {"yf": "HCLTECH.NS",    "name": "HCL Technologies",         "sector": "IT"},
    "AXISBANK":    {"yf": "AXISBANK.NS",   "name": "Axis Bank",                "sector": "Finance"},
    "ASIANPAINT":  {"yf": "ASIANPAINT.NS", "name": "Asian Paints",             "sector": "Consumer Durables"},
    "MARUTI":      {"yf": "MARUTI.NS",     "name": "Maruti Suzuki",            "sector": "Auto"},
    "BAJAJ-AUTO":  {"yf": "BAJAJ-AUTO.NS", "name": "Bajaj Auto",               "sector": "Auto"},
    "MM":          {"yf": "M&M.NS",         "name": "Mahindra & Mahindra",      "sector": "Auto"},
    "TATASTEEL":   {"yf": "TATASTEEL.NS",  "name": "Tata Steel",               "sector": "Metal"},
    "HINDALCO":    {"yf": "HINDALCO.NS",   "name": "Hindalco Industries",      "sector": "Metal"},
    "SUNPHARMA":   {"yf": "SUNPHARMA.NS",  "name": "Sun Pharmaceutical",       "sector": "Healthcare"},
    "DRREDDY":     {"yf": "DRREDDY.NS",    "name": "Dr. Reddy's Laboratories", "sector": "Healthcare"},
    "CIPLA":       {"yf": "CIPLA.NS",      "name": "Cipla",                    "sector": "Healthcare"},
    "NTPC":        {"yf": "NTPC.NS",       "name": "NTPC",                     "sector": "Power"},
    "POWERGRID":   {"yf": "POWERGRID.NS",  "name": "Power Grid Corporation",   "sector": "Power"},
    "COALINDIA":   {"yf": "COALINDIA.NS",  "name": "Coal India",               "sector": "Oil & Gas"},
    "ONGC":        {"yf": "ONGC.NS",       "name": "Oil & Natural Gas Corp",   "sector": "Oil & Gas"},
    "ITC":         {"yf": "ITC.NS",        "name": "ITC",                      "sector": "FMCG"},
    "LT":          {"yf": "LT.NS",         "name": "Larsen & Toubro",          "sector": "Construction"},
    "ULTRACEMCO":  {"yf": "ULTRACEMCO.NS", "name": "UltraTech Cement",         "sector": "Construction"},
    "TECHM":       {"yf": "TECHM.NS",      "name": "Tech Mahindra",            "sector": "IT"},
    "ADANIPORTS":  {"yf": "ADANIPORTS.NS", "name": "Adani Ports & SEZ",        "sector": "Services"},
}

# Convenience lookups
SYMBOL_LIST    = list(STOCKS.keys())
YF_TICKERS     = [v["yf"] for v in STOCKS.values()]
YF_TO_SYMBOL   = {v["yf"]: k for k, v in STOCKS.items()}

# Legacy CSV column → clean symbol (for backward compatibility)
CSV_TO_SYMBOL = {
    "SERV_ADANIPORTS":  "ADANIPORTS",
    "CDUR_ASIANPAINT":  "ASIANPAINT",
    "FIN_AXISBANK":     "AXISBANK",
    "AUTO_BAJAJ-AUTO":  "BAJAJ-AUTO",
    "TELL_BHARTIARTL":  "BHARTIARTL",
    "HLTH_CIPLA":       "CIPLA",
    "OILGAS_COALINDIA": "COALINDIA",
    "HLTH_DRREDDY":     "DRREDDY",
    "IT_HCLTECH":       "HCLTECH",
    "FIN_HDFCBANK":     "HDFCBANK",
    "METAL_HINDALCO":   "HINDALCO",
    "FMCG_HINDUNILVR":  "HINDUNILVR",
    "FIN_ICICIBANK":    "ICICIBANK",
    "IT_INFY":          "INFY",
    "FMCG_ITC":         "ITC",
    "FIN_KOTAKBANK":    "KOTAKBANK",
    "CONST_LT":         "LT",
    "AUTO_M&M":         "MM",
    "AUTO_MARUTI":      "MARUTI",
    "PWR_NTPC":         "NTPC",
    "OILGAS_ONGC":      "ONGC",
    "PWR_POWERGRID":    "POWERGRID",
    "OILGAS_RELIANCE":  "RELIANCE",
    "FIN_SBIN":         "SBIN",
    "HLTH_SUNPHARMA":   "SUNPHARMA",
    "IT_TCS":           "TCS",
    "METAL_TATASTEEL":  "TATASTEEL",
    "IT_TECHM":         "TECHM",
    "CONST_ULTRACEMCO": "ULTRACEMCO",
    "IT_WIPRO":         "WIPRO",
}

# ─────────────────────────────────────────────────────────────────────────────
#  Resolve any input (CSV col, clean symbol, yf ticker) → clean symbol
# ─────────────────────────────────────────────────────────────────────────────
def resolve(symbol: str) -> str | None:
    if symbol in STOCKS:
        return symbol
    if symbol in CSV_TO_SYMBOL:
        return CSV_TO_SYMBOL[symbol]
    if symbol in YF_TO_SYMBOL:
        return YF_TO_SYMBOL[symbol]
    return None


def get_yf_ticker(symbol: str) -> str | None:
    clean = resolve(symbol)
    return STOCKS[clean]["yf"] if clean else None


def get_display_name(symbol: str) -> str:
    clean = resolve(symbol)
    if clean and clean in STOCKS:
        return STOCKS[clean]["name"]
    return symbol


# ─────────────────────────────────────────────────────────────────────────────
#  In-memory quote cache  (NON-BLOCKING design)
#
#  • Requests NEVER block waiting for yfinance — they always get the current
#    (possibly stale) cache instantly.
#  • A single background thread performs the actual yf.download when the
#    cache is stale or force_refresh is requested.
#  • yf.download is wrapped in a hard timeout via a daemon thread so even
#    if yfinance hangs, the refresh thread is not stuck forever.
# ─────────────────────────────────────────────────────────────────────────────
LIVE_CACHE_TTL = 300          # 5 minutes — avoids hammering yfinance
_quote_cache: dict = {}
_cache_ts: float  = 0.0
_cache_lock = threading.Lock()        # protects _quote_cache / _cache_ts
_refreshing = False                   # True while a background refresh is in progress


def _download_with_timeout(tickers, timeout_secs=30, **kwargs):
    """Run yf.download in a daemon thread with a hard wall-clock timeout.
    Extra kwargs are forwarded to yf.download (period, interval, etc.)."""
    dl_kwargs = dict(
        period="2d", interval="1d",
        auto_adjust=True, progress=False, threads=True, timeout=15,
    )
    dl_kwargs.update(kwargs)  # caller can override period, interval, etc.

    result = [None]
    err    = [None]

    def worker():
        try:
            result[0] = yf.download(tickers, **dl_kwargs)
        except Exception as e:
            err[0] = e

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    t.join(timeout=timeout_secs)
    if t.is_alive():
        print(f"[realtime] yf.download HARD TIMEOUT ({timeout_secs}s) — returning empty")
        return pd.DataFrame()
    if err[0]:
        print(f"[realtime] yf.download error: {err[0]}")
        return pd.DataFrame()
    return result[0] if result[0] is not None else pd.DataFrame()


def _parse_quotes_from_df(raw, syms_to_check) -> dict:
    """Parse quote data from a yfinance DataFrame for the given symbols."""
    quotes = {}
    if raw is None or (hasattr(raw, "empty") and raw.empty):
        return quotes

    is_multi = isinstance(raw.columns, pd.MultiIndex)

    def get_col(field, ticker):
        try:
            if is_multi:
                return raw[field][ticker].dropna()
            else:
                return raw[field].dropna()
        except Exception:
            return pd.Series(dtype=float)

    for sym in syms_to_check:
        if sym not in STOCKS:
            continue
        info   = STOCKS[sym]
        ticker = info["yf"]
        try:
            close_s = get_col("Close",  ticker)
            open_s  = get_col("Open",   ticker)
            high_s  = get_col("High",   ticker)
            low_s   = get_col("Low",    ticker)
            vol_s   = get_col("Volume", ticker)

            if close_s.empty:
                continue

            last  = float(close_s.iloc[-1])
            prev  = float(close_s.iloc[-2]) if len(close_s) >= 2 else last
            change     = round(last - prev, 2)
            change_pct = round((last - prev) / prev * 100, 2) if prev else 0.0
            quotes[sym] = {
                "symbol":     sym,
                "name":       info["name"],
                "sector":     info["sector"],
                "yf_ticker":  ticker,
                "ltp":        round(last, 2),
                "prev_close": round(prev, 2),
                "change":     change,
                "change_pct": change_pct,
                "open":       round(float(open_s.iloc[-1]),  2) if not open_s.empty else None,
                "high":       round(float(high_s.iloc[-1]),  2) if not high_s.empty else None,
                "low":        round(float(low_s.iloc[-1]),   2) if not low_s.empty else None,
                "volume":     int(vol_s.iloc[-1]) if not vol_s.empty and not pd.isna(vol_s.iloc[-1]) else 0,
                "source":     "live",
            }
        except Exception:
            pass
    return quotes


def _fetch_all_quotes() -> dict:
    """Download quotes for all tickers.
    Strategy: try one bulk download first (fastest). If that fails/times out,
    fall back to 3 smaller batches of ~10 tickers each."""
    try:
        # ── Attempt 1: single bulk download for all tickers ──
        print(f"[realtime] Fetching {len(YF_TICKERS)} tickers in one bulk call...")
        raw = _download_with_timeout(YF_TICKERS, timeout_secs=30)
        if raw is not None and not (hasattr(raw, "empty") and raw.empty):
            quotes = _parse_quotes_from_df(raw, SYMBOL_LIST)
            if len(quotes) >= len(SYMBOL_LIST) * 0.5:   # got at least half
                print(f"[realtime] Bulk download OK — {len(quotes)} quotes parsed.")
                return quotes
            print(f"[realtime] Bulk download parsed only {len(quotes)}, trying batches...")

        # ── Attempt 2: smaller batches ──
        batch_size = 10
        all_quotes = {}
        for i in range(0, len(YF_TICKERS), batch_size):
            batch_tickers = YF_TICKERS[i:i + batch_size]
            batch_syms    = SYMBOL_LIST[i:i + batch_size]
            print(f"[realtime]   batch {i//batch_size + 1}: {batch_syms[:3]}... ({len(batch_tickers)} tickers)")
            raw = _download_with_timeout(batch_tickers, timeout_secs=20)
            parsed = _parse_quotes_from_df(raw, batch_syms)
            all_quotes.update(parsed)
            time.sleep(0.5)       # small pause between batches

        print(f"[realtime] Batch download — {len(all_quotes)} quotes total.")
        return all_quotes

    except Exception as e:
        print(f"[realtime] bulk fetch failed: {e}")
        return {}


def _background_refresh():
    """Run the actual fetch and update the cache. Called from a background thread."""
    global _quote_cache, _cache_ts, _refreshing
    try:
        fresh = _fetch_all_quotes()
        if fresh:
            with _cache_lock:
                _quote_cache = fresh
                _cache_ts = time.time()
            print(f"[realtime] Refreshed {len(fresh)} live quotes.")
    except Exception as e:
        print(f"[realtime] Background refresh error: {e}")
    finally:
        _refreshing = False


def get_all_quotes(force_refresh=False) -> dict:
    """
    Non-blocking.  Always returns the current cache instantly.
    If the cache is stale (or force_refresh), kicks off a background refresh
    so the *next* call gets fresh data.
    """
    global _refreshing
    need_refresh = force_refresh or (time.time() - _cache_ts) > LIVE_CACHE_TTL

    if need_refresh and not _refreshing:
        _refreshing = True
        threading.Thread(target=_background_refresh, daemon=True).start()

    with _cache_lock:
        return dict(_quote_cache)


def get_quote(symbol: str) -> dict | None:
    clean = resolve(symbol)
    if not clean:
        return None
    quotes = get_all_quotes()
    return quotes.get(clean)


def get_history(symbol: str, period: str = "5y") -> list:
    """Daily OHLCV history for a stock. Returns [{date, price, open, high, low, volume}]"""
    yf_ticker = get_yf_ticker(symbol)
    if not yf_ticker:
        return []
    try:
        df = yf.download(yf_ticker, period=period, interval="1d",
                         auto_adjust=True, progress=False, timeout=15)
        if df.empty:
            return []

        # Flatten MultiIndex columns if present (single-ticker download sometimes produces them)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        records = []
        for ts, row in df.iterrows():
            try:
                close  = _safe_float(row["Close"])
                open_  = _safe_float(row["Open"])
                high   = _safe_float(row["High"])
                low    = _safe_float(row["Low"])
                try:
                    vol_val = int(_safe_float(row["Volume"]))
                except Exception:
                    vol_val = 0
                records.append({
                    "date":   ts.strftime("%Y-%m-%d"),
                    "price":  round(close, 2),
                    "open":   round(open_, 2),
                    "high":   round(high,  2),
                    "low":    round(low,   2),
                    "volume": vol_val,
                })
            except Exception:
                continue
        return records
    except Exception as e:
        print(f"[realtime] history failed for {symbol}: {e}")
        return []


def get_intraday(symbol: str, interval: str = "5m") -> list:
    yf_ticker = get_yf_ticker(symbol)
    if not yf_ticker:
        return []
    try:
        df = yf.download(yf_ticker, period="1d", interval=interval,
                         auto_adjust=True, progress=False, timeout=15)
        if df.empty:
            return []

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        records = []
        for ts, row in df.iterrows():
            try:
                try:
                    vol_val = int(_safe_float(row["Volume"]))
                except Exception:
                    vol_val = 0
                records.append({
                    "time":   ts.strftime("%H:%M"),
                    "open":   round(_safe_float(row["Open"]),  2),
                    "high":   round(_safe_float(row["High"]),  2),
                    "low":    round(_safe_float(row["Low"]),   2),
                    "close":  round(_safe_float(row["Close"]), 2),
                    "volume": vol_val,
                })
            except Exception:
                continue
        return records
    except Exception as e:
        print(f"[realtime] intraday failed for {symbol}: {e}")
        return []


def _safe_float(val) -> float:
    """Convert a numpy scalar, single-element Series, or plain float safely."""
    if hasattr(val, "values"):       # pandas Series
        val = val.values
    if hasattr(val, "flatten"):      # numpy array
        val = val.flatten()
        if len(val) == 1:
            return float(val[0])
        return float(val[-1])        # take last element if multiple
    if hasattr(val, "item"):
        return float(val.item())
    return float(val)


def get_nifty50_index() -> dict | None:
    try:
        df = yf.download("^NSEI", period="2d", interval="1d",
                         auto_adjust=True, progress=False, timeout=15)
        if df.empty:
            return None
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        # De-duplicate any repeated column names (yfinance quirk)
        df = df.loc[:, ~df.columns.duplicated()]
        close = df["Close"].dropna()
        last = _safe_float(close.iloc[-1])
        prev = _safe_float(close.iloc[-2]) if len(close) >= 2 else last
        return {
            "nifty_value": round(last, 2),
            "change":      round(last - prev, 2),
            "change_pct":  round((last - prev) / prev * 100, 2),
            "source":      "live",
        }
    except Exception as e:
        print(f"[realtime] NIFTY index failed: {e}")
        return None


def get_nifty50_history(period: str = "1y") -> list:
    try:
        df = yf.download("^NSEI", period=period, interval="1d",
                         auto_adjust=True, progress=False, timeout=15)
        if df.empty:
            return []
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df = df.loc[:, ~df.columns.duplicated()]
        records = []
        for ts, row in df.iterrows():
            val = _safe_float(row["Close"])
            records.append({"Date": ts.strftime("%Y-%m-%d"), "NIFTY": round(val, 2)})
        return records
    except Exception as e:
        print(f"[realtime] NIFTY history failed: {e}")
        return []


# Legacy compat — old code used TICKER_MAP
TICKER_MAP = {k: v["yf"] for k, v in STOCKS.items()}


def warmup():
    """Synchronous warmup — blocks until the first set of quotes is loaded."""
    time.sleep(1)
    print("[realtime] Warming up live quotes (synchronous)...")
    global _quote_cache, _cache_ts, _refreshing
    try:
        fresh = _fetch_all_quotes()
        if fresh:
            with _cache_lock:
                _quote_cache = fresh
                _cache_ts = time.time()
            print(f"[realtime] Warmup complete — {len(fresh)} quotes loaded.")
        else:
            print("[realtime] Warmup: no quotes returned (yfinance may be slow).")
    except Exception as e:
        print(f"[realtime] Warmup error: {e}")
    _refreshing = False
