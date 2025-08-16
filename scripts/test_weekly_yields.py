#!/usr/bin/env python3
"""
Test weekly dividend yield calculation
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
            median_div = recent_dividends.median()
            dividend_count = len(recent_dividends)
            
            print(f"\n{ticker}:")
            print(f"  Price: ${current_price}")
            print(f"  Dividends in last year: {dividend_count}")
            print(f"  Median weekly dividend: ${median_div:.4f}")
            print(f"  Projected annual (52 weeks): ${median_div * 52:.4f}")
            print(f"  Projected yield: {(median_div * 52 / current_price * 100):.2f}%")
            
            # Also show actual if different
            actual_sum = recent_dividends.sum()
            if dividend_count < 52:
                print(f"  Actual sum (partial year): ${actual_sum:.4f}")
                print(f"  Actual yield (not annualized): {(actual_sum / current_price * 100):.2f}%")