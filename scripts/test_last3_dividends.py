#!/usr/bin/env python3
"""
Test last 3 dividends calculation
"""

import yfinance as yf
from datetime import datetime, timedelta

tickers = ['ULTY', 'YMAX', 'QDTE']

for ticker in tickers:
    stock = yf.Ticker(ticker)
    info = stock.info
    current_price = info.get('regularMarketPrice', 0)
    
    dividends = stock.dividends
    if not dividends.empty:
        one_year_ago = datetime.now() - timedelta(days=365)
        dividends.index = dividends.index.tz_localize(None)
        recent_dividends = dividends[dividends.index >= one_year_ago]
        
        if not recent_dividends.empty:
            last_3 = recent_dividends.tail(3)
            overall_median = recent_dividends.median()
            last_3_median = last_3.median()
            
            print(f"\n{ticker}:")
            print(f"  Price: ${current_price}")
            print(f"  Total dividends in last year: {len(recent_dividends)}")
            print(f"  Last 3 dividends: {list(last_3.values)}")
            print(f"  Median of last 3: ${last_3_median:.4f}")
            print(f"  Overall median: ${overall_median:.4f}")
            print(f"  Old yield (overall median): {(overall_median * 52 / current_price * 100):.2f}%")
            print(f"  New yield (last 3 median): {(last_3_median * 52 / current_price * 100):.2f}%")