#!/usr/bin/env python3
"""
Download Fed rate cut data for 300 tickers using caching system
Uses same caching approach as monthly pipeline for efficiency
"""
import yfinance as yf
import pandas as pd
import time
import warnings
import pickle
import os
from datetime import datetime, timedelta

warnings.filterwarnings('ignore')

def is_cache_fresh(cache_file, max_age_days=30):
    """Check if cached data is fresh enough - 30 days for historical data"""
    try:
        if not os.path.exists(cache_file):
            return False
        
        file_age = datetime.now() - datetime.fromtimestamp(os.path.getmtime(cache_file))
        return file_age.days < max_age_days
    except:
        return False

def load_cached_ticker_data(ticker):
    """Load cached ticker data if available and fresh"""
    cache_file = f"cache_{ticker}.pkl"
    
    if is_cache_fresh(cache_file):
        try:
            with open(cache_file, 'rb') as f:
                data = pickle.load(f)
                # Check if data contains 2018-2019 period
                if hasattr(data, 'index') and len(data) > 0:
                    data_start = pd.to_datetime(data.index.min())
                    data_end = pd.to_datetime(data.index.max())
                    
                    # Need data from at least Dec 1, 2018 to Dec 31, 2019
                    required_start = pd.to_datetime('2018-12-01')
                    required_end = pd.to_datetime('2019-12-31')
                    
                    if data_start <= required_start and data_end >= required_end:
                        print(f"    Using cached data ({len(data)} days)")
                        return data
                    else:
                        print(f"    Cache exists but missing 2018-2019 data (range: {data_start.strftime('%Y-%m-%d')} to {data_end.strftime('%Y-%m-%d')})")
                        return None
        except Exception as e:
            print(f"    Cache read error: {str(e)[:30]}")
            pass
    
    return None

def save_cached_ticker_data(ticker, data):
    """Save ticker data to cache"""
    cache_file = f"cache_{ticker}.pkl"
    try:
        with open(cache_file, 'wb') as f:
            pickle.dump(data, f)
    except:
        pass

def download_ticker_data(ticker):
    """Download or load cached data for a single ticker"""
    print(f"  {ticker}...", end=" ")
    
    # Try to load from cache first
    cached_data = load_cached_ticker_data(ticker)
    if cached_data is not None:
        return ticker, cached_data, True
    
    # Download fresh data
    try:
        print("Downloading...", end=" ")
        data = yf.download(ticker, start="2018-12-01", end="2019-12-31", 
                          progress=False, auto_adjust=True)
        
        if not data.empty and len(data) > 200:
            # Save to cache
            save_cached_ticker_data(ticker, data)
            print(f"OK - {len(data)} days (cached)")
            return ticker, data, False
        else:
            if data.empty:
                print("No data")
            else:
                print(f"Insufficient data ({len(data)} days)")
            return ticker, None, False
                
    except Exception as e:
        print(f"Error: {str(e)[:30]}")
        return ticker, None, False

def main():
    # Read tickers
    try:
        with open('fed_strategy_300_tickers.txt', 'r') as f:
            tickers = f.read().strip().split(',')
    except:
        print("Error: Could not load 300-ticker list")
        print("Falling back to 200-ticker list...")
        try:
            with open('fed_strategy_200_tickers.txt', 'r') as f:
                tickers = f.read().strip().split(',')
        except:
            print("Error: Could not load any ticker list")
            return
    
    print(f"CACHED FED RATE CUT DATA DOWNLOAD")
    print("=" * 50)
    print(f"Tickers to process: {len(tickers)}")
    print("Period: Dec 1, 2018 - Dec 31, 2019")
    print("Using cache system (30-day freshness for historical data)")
    print()
    
    # Check existing cache files
    existing_caches = 0
    for ticker in tickers:
        if os.path.exists(f"cache_{ticker}.pkl"):
            existing_caches += 1
    
    print(f"Existing cache files: {existing_caches}/{len(tickers)}")
    print()
    
    # Process all tickers
    all_rows = []
    successful_downloads = 0
    cached_loads = 0
    failed_tickers = []
    
    for i, ticker in enumerate(tickers, 1):
        print(f"[{i:3}/{len(tickers)}]", end=" ")
        
        ticker_symbol, data, was_cached = download_ticker_data(ticker)
        
        if data is not None:
            # Process data into long format
            for date, row in data.iterrows():
                all_rows.append({
                    'Date': date.strftime('%Y-%m-%d'),
                    'Ticker': ticker,
                    'Open': float(row['Open']),
                    'High': float(row['High']),
                    'Low': float(row['Low']),
                    'Close': float(row['Close']),
                    'Volume': int(row['Volume'])
                })
            
            if was_cached:
                cached_loads += 1
            else:
                successful_downloads += 1
        else:
            failed_tickers.append(ticker)
        
        # Minimal delay for downloads (not needed for cached loads)
        if not was_cached:
            time.sleep(0.03)
        
        # Progress updates every 50 tickers
        if i % 50 == 0:
            print(f"\nProgress: {i}/{len(tickers)} completed ({cached_loads} cached, {successful_downloads} downloaded)\n")
    
    print(f"\n" + "=" * 60)
    print("DOWNLOAD SUMMARY")
    print("=" * 60)
    print(f"Total tickers attempted: {len(tickers)}")
    print(f"Loaded from cache: {cached_loads}")
    print(f"Fresh downloads: {successful_downloads}")
    print(f"Failed: {len(failed_tickers)}")
    print(f"Success rate: {(cached_loads + successful_downloads)/len(tickers)*100:.1f}%")
    
    if failed_tickers:
        print(f"\nFailed tickers ({len(failed_tickers)}):")
        for i in range(0, len(failed_tickers), 15):
            chunk = failed_tickers[i:i+15]
            print("  " + ", ".join(chunk))
    
    # Create DataFrame
    if all_rows:
        print(f"\nCreating final dataset with {len(all_rows):,} rows...")
        df = pd.DataFrame(all_rows)
        
        # Sort by date and ticker
        df = df.sort_values(['Date', 'Ticker']).reset_index(drop=True)
        
        print(f"Final shape: {df.shape}")
        print(f"Date range: {df['Date'].min()} to {df['Date'].max()}")
        print(f"Unique tickers: {df['Ticker'].nunique()}")
        
        # Save clean data
        filename = f'fed_{len(df["Ticker"].unique())}_tickers_data_clean.csv'
        df.to_csv(filename, index=False)
        print(f"Data saved to: {filename}")
        
        # Show sample
        print(f"\nSample data:")
        print(df.head(3))
        
        # Quick validation
        print(f"\nValidation:")
        print(f"  All Close prices are numeric: {df['Close'].dtype}")
        print(f"  Date format: {df['Date'].iloc[0]} (string)")
        print(f"  No NaN values in Close: {df['Close'].isna().sum() == 0}")
        print(f"  Average trading days per ticker: {len(df) / df['Ticker'].nunique():.0f}")
        
        # Create a summary by ticker
        ticker_summary = df.groupby('Ticker').agg({
            'Close': 'count',
            'Date': ['min', 'max']
        }).reset_index()
        ticker_summary.columns = ['Ticker', 'Days', 'First_Date', 'Last_Date']
        
        print(f"\nData completeness:")
        print(f"  Ticker with most data: {ticker_summary.loc[ticker_summary['Days'].idxmax(), 'Ticker']} ({ticker_summary['Days'].max()} days)")
        print(f"  Ticker with least data: {ticker_summary.loc[ticker_summary['Days'].idxmin(), 'Ticker']} ({ticker_summary['Days'].min()} days)")
        print(f"  Median days per ticker: {ticker_summary['Days'].median():.0f}")
        
        print(f"\n" + "=" * 60)
        print(f"SUCCESS! {len(df['Ticker'].unique())}-ticker Fed rate cut data ready (with caching)")
        print("=" * 60)
        print("Next: Run fed_rate_cut_strategy.py with enhanced dataset")
        
        return df, cached_loads, successful_downloads, failed_tickers
    else:
        print("No data downloaded")
        return None, 0, 0, failed_tickers

if __name__ == "__main__":
    data, cached_count, download_count, failed = main()