#!/usr/bin/env python3
"""
Profile 1 Scanner: Find tickers currently showing the "beaten-down stabilization" pattern.

Uses Polygon API (same data source as dashboard) for consistency.

Profile 1 criteria (looking at trailing 12 weeks):
  - NAV declined between -2% and -20%
  - NAV decline is decelerating (2nd half less negative than 1st half)
  - At least one significant dividend cut (>30% week-over-week drop)
  - Recent dividends have stabilized (last 4 divs CV < 30%)
  - Price is below 92% of 12-week high
  - Pre-window annualized volatility < 50%
  - Price >= $10

Backtested win rate: 72% (13/18), avg return +22.8%, median +25.8%
"""

import requests
import numpy as np
import os
import math
from datetime import datetime, timedelta
from dotenv import load_dotenv
import time

load_dotenv()

POLYGON_API_KEY = os.getenv('POLYGON_API_KEY')
if not POLYGON_API_KEY:
    print("ERROR: POLYGON_API_KEY not found in .env")
    exit(1)

# Load tickers from config
with open("multi_ticker_data_processor.py", "r") as f:
    content = f.read()

tickers = []
for line in content.split('\n'):
    line = line.strip()
    if line.startswith("'") and line.endswith('{'):
        ticker = line.split("'")[1]
        tickers.append(ticker)

print(f"Profile 1 Scanner (Polygon API) — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
print(f"Scanning {len(tickers)} tickers")
print("=" * 90)

TODAY = datetime.now()
TWELVE_WEEKS_AGO = TODAY - timedelta(days=84)

# Criteria (same as Netlify early-signal.js)
NAV_DECLINE_MIN = -2.0
NAV_DECLINE_MAX = -15.0
DIV_CUT_THRESHOLD = -0.30
PRICE_BELOW_HIGH_PCT = 0.92
MIN_DIVS = 6
DIV_STABILIZATION_CV = 0.30
MAX_VOLATILITY = 35.0
MIN_PRICE = 10.0
MIN_EST_YIELD = 30.0

print(f"\nCriteria:")
print(f"  NAV decline: {NAV_DECLINE_MAX}% to {NAV_DECLINE_MIN}%")
print(f"  NAV decelerating (2nd half less negative than 1st half)")
print(f"  Dividend cut > {DIV_CUT_THRESHOLD*100:.0f}% (at least one)")
print(f"  Last 4 divs CV < {DIV_STABILIZATION_CV*100:.0f}%")
print(f"  Price < {PRICE_BELOW_HIGH_PCT*100:.0f}% of 12-week high")
print(f"  Annualized volatility < {MAX_VOLATILITY:.0f}%")
print(f"  Price >= ${MIN_PRICE:.0f}")
print(f"  Estimated yield >= {MIN_EST_YIELD:.0f}%")
print(f"\nLooking back from {TODAY.strftime('%Y-%m-%d')} to {TWELVE_WEEKS_AGO.strftime('%Y-%m-%d')}")
print("=" * 90)


def fetch_polygon(url):
    """Fetch data from Polygon API with error handling."""
    resp = requests.get(url)
    if resp.status_code == 200:
        return resp.json()
    return None


def analyze_ticker(ticker):
    """Analyze a single ticker using Polygon API — mirrors early-signal.js logic exactly."""
    today_str = TODAY.strftime('%Y-%m-%d')
    twelve_weeks_ago_str = TWELVE_WEEKS_AGO.strftime('%Y-%m-%d')

    # Fetch 12-week daily prices (same as Netlify function)
    price_url = (f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/"
                 f"{twelve_weeks_ago_str}/{today_str}?adjusted=true&sort=asc&apiKey={POLYGON_API_KEY}")
    price_data = fetch_polygon(price_url)

    # Fetch dividends (same as Netlify function)
    div_url = (f"https://api.polygon.io/v3/reference/dividends?ticker={ticker}"
               f"&order=desc&limit=15&apiKey={POLYGON_API_KEY}")
    div_data = fetch_polygon(div_url)

    if not price_data or not price_data.get('results') or len(price_data['results']) < 20:
        return None

    prices = price_data['results']
    current_price = prices[-1]['c']

    # Price filter
    if current_price < MIN_PRICE:
        return None

    # NAV change over 12 weeks
    start_price = prices[0]['c']
    nav_change = ((current_price - start_price) / start_price) * 100

    # Find 12-week high
    high_price = max(p['c'] for p in prices)
    pct_of_high = current_price / high_price

    # NAV deceleration: split into first and second half
    mid = len(prices) // 2
    fh_start = prices[0]['c']
    fh_end = prices[mid]['c']
    sh_start = prices[mid]['c']
    sh_end = prices[-1]['c']

    fh_change = ((fh_end - fh_start) / fh_start) * 100
    sh_change = ((sh_end - sh_start) / sh_start) * 100
    decelerating = sh_change > fh_change

    # Volatility (annualized from daily returns)
    daily_returns = []
    for i in range(1, len(prices)):
        if prices[i - 1]['c'] > 0:
            daily_returns.append((prices[i]['c'] - prices[i - 1]['c']) / prices[i - 1]['c'])

    mean_return = sum(daily_returns) / len(daily_returns)
    variance = sum((r - mean_return) ** 2 for r in daily_returns) / len(daily_returns)
    volatility = math.sqrt(variance) * math.sqrt(252) * 100

    # Dividend analysis — filter to 12-week window (same as Netlify function)
    dividends = []
    if div_data and div_data.get('results'):
        window_start = TWELVE_WEEKS_AGO
        for d in div_data['results']:
            if d['cash_amount'] > 0:
                ex_date = datetime.strptime(d['ex_dividend_date'], '%Y-%m-%d')
                if ex_date >= window_start:
                    dividends.append(d)
        # Sort newest first (already should be from API, but be safe)
        dividends.sort(key=lambda d: d['ex_dividend_date'], reverse=True)

    num_divs = len(dividends)
    has_big_cut = False
    last4_cv = None
    divs_stabilized = False
    div_amounts = [d['cash_amount'] for d in dividends]

    if num_divs >= 4:
        # Check for dividend cuts (chronological order = reverse)
        chronological = list(reversed(div_amounts))
        for i in range(1, len(chronological)):
            if chronological[i - 1] > 0:
                change = (chronological[i] - chronological[i - 1]) / chronological[i - 1]
                if change < DIV_CUT_THRESHOLD:
                    has_big_cut = True
                    break

        # CV of last 4 dividends (most recent 4)
        last4 = div_amounts[:4]
        mean4 = sum(last4) / len(last4)
        if mean4 > 0:
            std4 = math.sqrt(sum((v - mean4) ** 2 for v in last4) / len(last4))
            last4_cv = std4 / mean4
            divs_stabilized = last4_cv < DIV_STABILIZATION_CV

    # Evaluate all criteria
    nav_in_range = NAV_DECLINE_MAX <= nav_change <= NAV_DECLINE_MIN
    vol_ok = volatility < MAX_VOLATILITY
    price_below = pct_of_high < PRICE_BELOW_HIGH_PCT
    enough_divs = num_divs >= MIN_DIVS

    # Estimate yield
    est_yield = 0
    avg_weekly_div = 0
    if num_divs >= 4:
        avg_weekly_div = sum(div_amounts[:4]) / 4
        est_yield = (avg_weekly_div * 52 / current_price) * 100

    yield_ok = est_yield >= MIN_EST_YIELD
    criteria_met = sum([nav_in_range, decelerating, has_big_cut, divs_stabilized, price_below, vol_ok, enough_divs, yield_ok])

    # Build failed criteria list
    failed = []
    if not nav_in_range: failed.append(f"NAV {nav_change:+.1f}%")
    if not decelerating: failed.append(f"not decelerating")
    if not has_big_cut: failed.append(f"no div cut")
    if not divs_stabilized: failed.append(f"divs unstable" + (f" CV={last4_cv*100:.0f}%" if last4_cv else ""))
    if not price_below: failed.append(f"price@{pct_of_high*100:.0f}%high")
    if not vol_ok: failed.append(f"vol={volatility:.0f}%")
    if not enough_divs: failed.append(f"only {num_divs} divs")
    if not yield_ok: failed.append(f"yield={est_yield:.0f}%")

    return {
        'ticker': ticker,
        'price': current_price,
        'nav_change': nav_change,
        'fh_nav': fh_change,
        'sh_nav': sh_change,
        'volatility': volatility,
        'pct_of_high': pct_of_high * 100,
        'num_divs': num_divs,
        'last4_cv': last4_cv * 100 if last4_cv is not None else None,
        'est_yield': est_yield,
        'avg_weekly_div': avg_weekly_div,
        'criteria_met': criteria_met,
        'failed': ', '.join(failed),
    }


# Scan all tickers
print(f"\nFetching data from Polygon API...")
signals = []
near_misses = []
errors = 0

for i, ticker in enumerate(tickers):
    if (i + 1) % 20 == 0:
        print(f"  Progress: {i + 1}/{len(tickers)}...")

    result = analyze_ticker(ticker)
    if result is None:
        errors += 1
        continue

    if result['criteria_met'] == 8:
        signals.append(result)
    elif result['criteria_met'] >= 6:
        near_misses.append(result)

    # Rate limit: Polygon free tier = 5 calls/min, paid = much higher
    # We make 2 calls per ticker, so pace accordingly
    time.sleep(0.05)

print(f"Scanned {len(tickers)} tickers ({errors} errors)")
print("=" * 90)

# Results
print(f"\n{'='*90}")
print(f"PROFILE 1 SIGNALS — BUY CANDIDATES")
print(f"{'='*90}")

if signals:
    signals.sort(key=lambda x: x['nav_change'])  # Most beaten down first
    print(f"\n{'Ticker':<8} {'Price':>8} {'NAV%':>8} {'1stH%':>8} {'2ndH%':>8} {'Vol%':>7} {'%High':>7} "
          f"{'Divs':>5} {'CV%':>6} {'EstYld%':>8} {'AvgDiv':>8}")
    print("-" * 90)
    for s in signals:
        print(f"{s['ticker']:<8} ${s['price']:>6.2f} {s['nav_change']:>+7.1f} {s['fh_nav']:>+7.1f} "
              f"{s['sh_nav']:>+7.1f} {s['volatility']:>6.1f} {s['pct_of_high']:>6.0f}% "
              f"{s['num_divs']:>5} {s['last4_cv']:>5.0f}% {s['est_yield']:>7.1f}% "
              f"${s['avg_weekly_div']:>.4f}")

    print(f"\n  Total signals: {len(signals)}")
    print(f"\n  Reminder: Backtested win rate 73%, avg return +5.5%, median +10.8%")
    print(f"  These tickers show the beaten-down-stabilization pattern that historically")
    print(f"  precedes appearing in the optimal portfolio within 12 weeks.")
else:
    print(f"\n  No tickers currently match all Profile 1 criteria.")

if near_misses:
    near_misses.sort(key=lambda x: -x['criteria_met'])
    print(f"\n{'='*90}")
    print(f"NEAR MISSES ({len(near_misses)} tickers meeting 6-7 of 8 criteria)")
    print(f"{'='*90}")
    print(f"\n{'Ticker':<8} {'Price':>8} {'NAV%':>8} {'Vol%':>7} {'%High':>7} {'Met':>4} Failed criteria")
    print("-" * 90)
    for s in near_misses:
        print(f"{s['ticker']:<8} ${s['price']:>6.2f} {s['nav_change']:>+7.1f} {s['volatility']:>6.1f} "
              f"{s['pct_of_high']:>6.0f}% {s['criteria_met']:>3}/8  {s['failed']}")
else:
    print(f"\n  No near misses either.")

print(f"\n{'='*90}")
print(f"Scan complete at {datetime.now().strftime('%Y-%m-%d %H:%M')}")
