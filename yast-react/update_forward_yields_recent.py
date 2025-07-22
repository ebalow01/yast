#!/usr/bin/env python3
"""
Update forward yields using median of RECENT dividends instead of all-time median.
This provides more realistic forward yield estimates.
"""

import yfinance as yf
import json
import re
import sys
from typing import Dict, Any

def fetch_recent_dividend_medians(tickers: list) -> Dict[str, float]:
    """Fetch median of last 3 dividends for each ticker."""
    dividend_medians = {}
    print("Fetching recent dividend data...")
    
    for ticker in tickers:
        try:
            if ticker == 'SPY':
                dividend_medians[ticker] = 0.0  # SPY doesn't pay weekly dividends
                continue
                
            stock = yf.Ticker(ticker)
            dividends = stock.dividends
            
            if not dividends.empty and len(dividends) >= 3:
                # Use median of last 3 dividends for more recent estimate
                recent_3 = dividends.tail(3)
                median_recent = float(recent_3.median())
                dividend_medians[ticker] = median_recent
                print(f"{ticker}: Last 3 dividends {recent_3.values} -> median ${median_recent:.3f}")
            else:
                # Fallback to 0 if insufficient data
                dividend_medians[ticker] = 0.0
                print(f"{ticker}: Insufficient dividend data - using 0")
                
        except Exception as e:
            print(f"{ticker}: Error - {e} - using 0")
            dividend_medians[ticker] = 0.0
    
    return dividend_medians

def fetch_current_prices(tickers: list) -> Dict[str, float]:
    """Fetch current stock prices for all tickers."""
    prices = {}
    print("\nFetching current prices...")
    
    for ticker in tickers:
        try:
            stock = yf.Ticker(ticker)
            data = stock.history(period="2d")
            if not data.empty:
                price = float(data['Close'].iloc[-1])
                prices[ticker] = price
                print(f"{ticker}: ${price:.2f}")
            else:
                print(f"{ticker}: No price data - using 1.0")
                prices[ticker] = 1.0
        except Exception as e:
            print(f"{ticker}: Error - {e} - using 1.0")
            prices[ticker] = 1.0
    
    return prices

def calculate_forward_yield(median_dividend: float, current_price: float) -> float:
    """Calculate forward yield: (median dividend * 52) / current price * 100"""
    if current_price <= 0:
        return 0.0
    return (median_dividend * 52 / current_price) * 100

def extract_tickers_from_ts_file(file_path: str) -> list:
    """Extract ticker symbols from TypeScript file."""
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Find all ticker entries
    ticker_matches = re.findall(r'"ticker":\s*"([^"]+)"', content)
    return ticker_matches

def update_forward_yields_in_file(file_path: str, forward_yields: Dict[str, float]):
    """Update forward yield values in the TypeScript file."""
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Update each forward yield value
    for ticker, yield_value in forward_yields.items():
        # Pattern to match the forwardYield line for this ticker
        pattern = rf'("ticker":\s*"{ticker}".*?"forwardYield":\s*)[0-9]+\.?[0-9]*'
        replacement = rf'\g<1>{yield_value:.1f}'
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # Write back to file
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(content)

def main():
    file_path = r"c:\Users\ebalo\yast\yast-react\src\data\dividendData.ts"
    
    try:
        # Extract tickers
        print("Extracting tickers from TypeScript file...")
        tickers = extract_tickers_from_ts_file(file_path)
        print(f"Found {len(tickers)} tickers")
        
        # Get recent dividend medians
        dividend_medians = fetch_recent_dividend_medians(tickers)
        
        # Get current prices
        current_prices = fetch_current_prices(tickers)
        
        # Calculate forward yields
        print("\nCalculating updated forward yields...")
        forward_yields = {}
        
        for ticker in tickers:
            median_dividend = dividend_medians.get(ticker, 0.0)
            current_price = current_prices.get(ticker, 1.0)
            
            forward_yield = calculate_forward_yield(median_dividend, current_price)
            forward_yields[ticker] = forward_yield
            
            print(f"{ticker}: {median_dividend:.3f} * 52 / ${current_price:.2f} = {forward_yield:.1f}%")
        
        # Update the file
        print("\nUpdating TypeScript file with corrected forward yields...")
        update_forward_yields_in_file(file_path, forward_yields)
        
        print(f"\nSuccessfully updated {file_path} with realistic forward yields!")
        
        # Show summary of major changes
        print("\nMost notable corrections:")
        sorted_yields = sorted(forward_yields.items(), key=lambda x: x[1], reverse=True)
        for ticker, yield_val in sorted_yields[:10]:
            if yield_val > 0:
                print(f"{ticker:5s}: {yield_val:5.1f}%")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
