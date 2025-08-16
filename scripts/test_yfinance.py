#!/usr/bin/env python3
"""
Test Yahoo Finance data fetching for a single ticker
"""

import yfinance as yf
from datetime import datetime, timedelta
import pandas as pd

def test_ticker(symbol):
    """Test fetching data for a single ticker"""
    print(f"\n{'='*50}")
    print(f"Testing {symbol}")
    print('='*50)
    
    try:
        # Create ticker object
        stock = yf.Ticker(symbol)
        
        # Get all available info
        info = stock.info
        print("\nAvailable price fields:")
        price_fields = ['currentPrice', 'regularMarketPrice', 'previousClose', 
                       'open', 'dayHigh', 'dayLow', 'bid', 'ask']
        for field in price_fields:
            if field in info:
                print(f"  {field}: ${info[field]}")
        
        # Try to get quote data directly
        print("\nTrying fast_info:")
        try:
            fast_info = stock.fast_info
            print(f"  last_price: ${fast_info.last_price}")
            print(f"  previous_close: ${fast_info.previous_close}")
        except:
            print("  fast_info not available")
        
        # Get historical data for recent prices
        print("\nRecent price history (last 5 days):")
        hist = stock.history(period="5d")
        if not hist.empty:
            print(hist[['Close', 'Volume']].tail())
            print(f"\nMost recent close: ${hist['Close'].iloc[-1]:.2f}")
        
        # Get dividend data
        print("\nDividend Information:")
        dividends = stock.dividends
        if not dividends.empty:
            print(f"Total dividend entries: {len(dividends)}")
            print(f"\nLast 10 dividends:")
            print(dividends.tail(10))
            
            # Calculate annual dividends
            one_year_ago = datetime.now() - timedelta(days=365)
            dividends.index = dividends.index.tz_localize(None)
            recent_divs = dividends[dividends.index >= one_year_ago]
            
            if not recent_divs.empty:
                print(f"\nDividends in last 12 months: {len(recent_divs)}")
                print(f"Total annual dividends: ${recent_divs.sum():.4f}")
                print(f"Average dividend: ${recent_divs.mean():.4f}")
                print(f"Median dividend: ${recent_divs.median():.4f}")
        else:
            print("No dividend data available")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

# Test a few tickers
test_tickers = ['ULTY', 'YMAX', 'QDTE', 'SPY']
for ticker in test_tickers:
    test_ticker(ticker)