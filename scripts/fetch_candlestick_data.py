#!/usr/bin/env python3
"""
Fetch 7-day 15-minute candlestick data for a given ticker using yfinance
"""

import yfinance as yf
import json
import sys
from datetime import datetime, timedelta
import pandas as pd

def fetch_candlestick_data(ticker):
    """
    Fetch 7-day 15-minute candlestick data for a ticker
    Returns JSON formatted OHLCV data
    """
    try:
        # Create yfinance ticker object
        yf_ticker = yf.Ticker(ticker)
        
        # Get 7 days of 15-minute data
        # 15-minute intervals have much better rate limiting than 1-minute
        data = yf_ticker.history(period="7d", interval="15m")
        
        if data.empty:
            return {"error": f"No data found for ticker {ticker}"}
        
        # Convert to list of candlestick objects
        candlesticks = []
        for timestamp, row in data.iterrows():
            candlesticks.append({
                "timestamp": timestamp.isoformat(),
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": int(row['Volume'])
            })
        
        result = {
            "ticker": ticker,
            "period": "7d",
            "interval": "15m",
            "data_points": len(candlesticks),
            "first_timestamp": candlesticks[0]["timestamp"] if candlesticks else None,
            "last_timestamp": candlesticks[-1]["timestamp"] if candlesticks else None,
            "candlesticks": candlesticks
        }
        
        return result
        
    except Exception as e:
        return {"error": f"Failed to fetch data for {ticker}: {str(e)}"}

def main():
    if len(sys.argv) != 2:
        print("Usage: python fetch_candlestick_data.py <TICKER>")
        sys.exit(1)
    
    ticker = sys.argv[1].upper()
    result = fetch_candlestick_data(ticker)
    
    # Print JSON result
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()