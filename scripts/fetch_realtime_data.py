#!/usr/bin/env python3
"""
Fetch real-time stock prices and dividend data from Yahoo Finance
"""

import yfinance as yf
import json
import os
from datetime import datetime, timedelta
import pandas as pd
from typing import Dict, List, Optional

def get_ticker_list() -> List[str]:
    """Get list of tickers to fetch data for"""
    return [
        'ULTY', 'YMAX', 'YMAG', 'LFGY', 'GPTY', 'SDTY', 'QDTY', 'RDTY', 
        'CHPY', 'NFLW', 'IWMY', 'AMZW', 'MSII', 'RDTE', 'AAPW', 'COII', 
        'MST', 'BLOX', 'BRKW', 'COIW', 'HOOW', 'METW', 'NVDW', 'PLTW', 
        'TSLW', 'QDTE', 'XDTE', 'WDTE', 'YSPY', 'NVYY', 'TSYY', 'YETH',
        'YBTC', 'XBTY', 'QQQY', 'NVII', 'TSII', 'MAGY', 'TQQY', 'GLDY',
        'BCCC', 'USOY', 'MMKT', 'WEEK'
    ]

def fetch_ticker_data(ticker: str) -> Optional[Dict]:
    """Fetch real-time data for a single ticker"""
    try:
        # Create ticker object
        stock = yf.Ticker(ticker)
        
        # Get current price
        info = stock.info
        current_price = info.get('regularMarketPrice') or info.get('previousClose') or 0
        
        # Get dividend data
        dividends = stock.dividends
        
        # Calculate recent dividend metrics
        if not dividends.empty:
            # Get last year of dividends
            one_year_ago = datetime.now() - timedelta(days=365)
            # Convert to timezone-naive for comparison
            dividends.index = dividends.index.tz_localize(None)
            recent_dividends = dividends[dividends.index >= one_year_ago]
            
            if not recent_dividends.empty:
                last_dividend = float(recent_dividends.iloc[-1])
                
                # Calculate median of the last 3 dividends for more current yield
                last_3_dividends = recent_dividends.tail(3)
                if len(last_3_dividends) >= 3:
                    median_last_3 = float(last_3_dividends.median())
                elif len(last_3_dividends) >= 1:
                    # If less than 3 dividends, use what we have
                    median_last_3 = float(last_3_dividends.median())
                else:
                    median_last_3 = last_dividend
                
                # Use overall median for comparison
                median_dividend = float(recent_dividends.median())
                
                # For weekly dividend ETFs, calculate annualized based on last 3 median
                dividend_count = len(recent_dividends)
                
                # Use median of last 3 dividends * 52 for current annual projection
                total_dividends = median_last_3 * 52
                
                # Calculate actual yield based on most recent dividend trend
                if current_price > 0:
                    annual_yield = (total_dividends / current_price) * 100
                else:
                    annual_yield = 0
            else:
                # No dividends in last year, check all history
                last_dividend = float(dividends.iloc[-1]) if not dividends.empty else 0
                median_dividend = float(dividends.median()) if not dividends.empty else 0
                median_last_3 = median_dividend  # Use overall median if no recent data
                total_dividends = 0
                dividend_count = 0
                annual_yield = 0
        else:
            last_dividend = 0
            median_dividend = 0
            median_last_3 = 0
            total_dividends = 0
            dividend_count = 0
            annual_yield = 0
        
        # Get additional info
        market_cap = info.get('marketCap', 0)
        volume = info.get('regularMarketVolume', 0)
        
        return {
            'ticker': ticker,
            'currentPrice': round(current_price, 2),
            'lastDividend': round(last_dividend, 4),
            'medianDividend': round(median_dividend, 4),
            'medianLast3': round(median_last_3, 4),  # Median of last 3 dividends
            'annualDividends': round(total_dividends, 4),
            'dividendCount': dividend_count,
            'actualYield': round(annual_yield, 2),
            'weeklyDividend': round(median_last_3, 4),  # Current weekly dividend trend
            'projectedAnnual': round(median_last_3 * 52, 4),  # Projected based on last 3
            'marketCap': market_cap,
            'volume': volume,
            'lastUpdate': datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Error fetching data for {ticker}: {str(e)}")
        return None

def fetch_all_realtime_data():
    """Fetch real-time data for all tickers"""
    tickers = get_ticker_list()
    realtime_data = {}
    
    print(f"Fetching real-time data for {len(tickers)} tickers...")
    
    for i, ticker in enumerate(tickers):
        print(f"Fetching {ticker} ({i+1}/{len(tickers)})...")
        data = fetch_ticker_data(ticker)
        if data:
            realtime_data[ticker] = data
    
    return realtime_data

def save_realtime_data(data: Dict, output_path: str):
    """Save real-time data to JSON file"""
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Create summary
    summary = {
        'lastUpdate': datetime.now().isoformat(),
        'tickerCount': len(data),
        'data': data
    }
    
    # Save to file
    with open(output_path, 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"Saved real-time data to {output_path}")

def main():
    """Main function"""
    # Fetch real-time data
    realtime_data = fetch_all_realtime_data()
    
    # Save to public directory for React app
    output_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'yast-react', 'public', 'data', 'realtime_data.json'
    )
    save_realtime_data(realtime_data, output_path)
    
    # Also save to main data directory
    backup_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'data', 'realtime_data.json'
    )
    save_realtime_data(realtime_data, backup_path)
    
    print(f"\nSuccessfully fetched data for {len(realtime_data)} tickers")
    
    # Print summary
    total_with_dividends = sum(1 for data in realtime_data.values() if data['lastDividend'] > 0)
    avg_yield = sum(data['actualYield'] for data in realtime_data.values()) / len(realtime_data) if realtime_data else 0
    
    print(f"Tickers with dividends: {total_with_dividends}")
    print(f"Average yield: {avg_yield:.2f}%")

if __name__ == "__main__":
    main()