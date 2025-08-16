#!/usr/bin/env python3
"""
Verify dividend yields calculation
"""

import yfinance as yf
from datetime import datetime, timedelta

# Test ULTY
ticker = "ULTY"
stock = yf.Ticker(ticker)

# Get current price
info = stock.info
current_price = info.get('regularMarketPrice', 0)

# Get dividends
dividends = stock.dividends
if not dividends.empty:
    # Get last year of dividends
    one_year_ago = datetime.now() - timedelta(days=365)
    dividends.index = dividends.index.tz_localize(None)
    recent_dividends = dividends[dividends.index >= one_year_ago]
    
    print(f"\n{ticker} Analysis:")
    print(f"Current Price: ${current_price}")
    print(f"Dividends in last year: {len(recent_dividends)}")
    print(f"Total annual dividends: ${recent_dividends.sum():.4f}")
    print(f"Average weekly dividend: ${recent_dividends.mean():.4f}")
    print(f"Median weekly dividend: ${recent_dividends.median():.4f}")
    
    # Calculate yield correctly
    annual_dividends = recent_dividends.sum()
    actual_yield = (annual_dividends / current_price) * 100
    
    print(f"\nYield Calculation:")
    print(f"${annual_dividends:.4f} / ${current_price} * 100 = {actual_yield:.2f}%")
    
    # Check if these are truly weekly
    print(f"\nDividend frequency: {len(recent_dividends)} payments in 365 days")
    print(f"Average days between dividends: {365 / len(recent_dividends):.1f}")
    
    # Show recent dividends
    print(f"\nLast 5 dividends:")
    print(recent_dividends.tail())