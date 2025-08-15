#!/usr/bin/env python3
"""
Test script to verify 45-day volatility calculation
"""

import yfinance as yf
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def test_45day_volatility(ticker="ULTY"):
    """Test the 45-day volatility calculation for a ticker"""
    
    print(f"\nTesting 45-day volatility calculation for {ticker}")
    print("=" * 60)
    
    # Download data
    stock = yf.Ticker(ticker)
    hist_data = stock.history(period="6mo")  # Get 6 months to ensure we have enough data
    
    if hist_data.empty:
        print(f"No data available for {ticker}")
        return
    
    # Calculate daily returns
    hist_data['Daily_Return'] = hist_data['Close'].pct_change()
    
    # Full period volatility
    daily_returns_all = hist_data['Daily_Return'].dropna()
    full_volatility = daily_returns_all.std() * np.sqrt(252) * 100
    
    # 45-day volatility
    last_45_days = hist_data['Daily_Return'].tail(45).dropna()
    volatility_45day = last_45_days.std() * np.sqrt(252) * 100
    
    # Display results
    print(f"Total trading days available: {len(hist_data)}")
    print(f"Days used for 45-day calculation: {len(last_45_days)}")
    print(f"\nVolatility Comparison:")
    print(f"  Full period volatility: {full_volatility:.2f}%")
    print(f"  45-day volatility: {volatility_45day:.2f}%")
    print(f"  Difference: {volatility_45day - full_volatility:+.2f}%")
    
    # Show date range for 45-day calculation
    if len(last_45_days) > 0:
        start_date = hist_data.tail(45).index[0]
        end_date = hist_data.index[-1]
        print(f"\n45-day period: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    
    # Calculate some statistics on the 45-day returns
    print(f"\n45-day Return Statistics:")
    print(f"  Mean daily return: {last_45_days.mean()*100:.3f}%")
    print(f"  Std dev (daily): {last_45_days.std()*100:.3f}%")
    print(f"  Min daily return: {last_45_days.min()*100:.3f}%")
    print(f"  Max daily return: {last_45_days.max()*100:.3f}%")
    
    return volatility_45day

if __name__ == "__main__":
    # Test with a few tickers
    test_tickers = ["ULTY", "COTY", "SPY"]
    
    print("Testing 45-Day Volatility Calculation")
    print("=" * 60)
    
    results = {}
    for ticker in test_tickers:
        vol = test_45day_volatility(ticker)
        if vol is not None:
            results[ticker] = vol
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY - 45-Day Volatility Results:")
    print("=" * 60)
    for ticker, vol in results.items():
        print(f"{ticker}: {vol:.2f}%")