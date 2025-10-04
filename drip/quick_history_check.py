#!/usr/bin/env python3
"""
Quick check of historical data availability for ETFs
"""
import pandas as pd
import yfinance as yf
from datetime import datetime
import concurrent.futures
import time

def check_ticker(ticker):
    """Quick check if ticker has 2018 data"""
    try:
        # Use download for faster batch processing
        data = yf.download(ticker, start="2018-01-01", end="2018-02-01", 
                          progress=False, show_errors=False)
        if not data.empty:
            return ticker, True, data.index[0].date()
        return ticker, False, None
    except:
        return ticker, False, None

def main():
    # Read the ticker list
    df = pd.read_csv('combined_600_tickers_20250903_0749.csv')
    
    # Get unique tickers
    tickers = df['ticker'].unique().tolist()
    
    print(f"Checking {len(tickers)} unique tickers for 2018 data...")
    print("Using parallel processing for speed...\n")
    
    # Check tickers in parallel
    results = {}
    tickers_with_2018 = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        # Submit all tasks
        futures = {executor.submit(check_ticker, ticker): ticker for ticker in tickers}
        
        # Process results as they complete
        completed = 0
        for future in concurrent.futures.as_completed(futures):
            ticker, has_data, first_date = future.result()
            results[ticker] = (has_data, first_date)
            
            if has_data:
                tickers_with_2018.append(ticker)
            
            completed += 1
            if completed % 50 == 0:
                print(f"Processed {completed}/{len(tickers)} tickers... Found {len(tickers_with_2018)} with 2018 data")
    
    # Final summary
    print("\n" + "="*60)
    print("FINAL RESULTS")
    print("="*60)
    print(f"Total tickers checked: {len(tickers)}")
    print(f"Tickers with data from Jan 2018 or earlier: {len(tickers_with_2018)}")
    print(f"Percentage: {len(tickers_with_2018)/len(tickers)*100:.1f}%")
    
    # Group by category
    print("\n" + "="*60)
    print("BY CATEGORY")
    print("="*60)
    
    # Add results back to dataframe
    df['has_2018'] = df['ticker'].map(lambda x: results.get(x, (False, None))[0])
    
    category_summary = df.groupby('category')['has_2018'].agg(['sum', 'count'])
    category_summary['percentage'] = (category_summary['sum'] / category_summary['count'] * 100).round(1)
    print(category_summary)
    
    # List all tickers with 2018 data
    if tickers_with_2018:
        print("\n" + "="*60)
        print(f"ALL {len(tickers_with_2018)} TICKERS WITH 2018+ DATA:")
        print("="*60)
        
        # Sort and display
        tickers_with_2018.sort()
        
        # Print in chunks for readability
        for i in range(0, len(tickers_with_2018), 10):
            chunk = tickers_with_2018[i:i+10]
            print(', '.join(chunk))
        
        # Save to file
        with open('tickers_2018.txt', 'w') as f:
            f.write(','.join(tickers_with_2018))
        print(f"\nList saved to tickers_2018.txt")
    
    print("\n" + "="*60)
    print("Top weekly dividend ETFs with 2018 data:")
    print("="*60)
    
    # Check common weekly dividend ETFs
    weekly_etfs = ['SPY', 'QQQ', 'IWM', 'TSLY', 'NVDY', 'ULTY', 'MSTY', 'CONY', 
                   'JEPI', 'JEPQ', 'APLY', 'QQQI', 'IWMY', 'FEPI', 'DIPS',
                   'QQQY', 'XDTE', 'QDTE', 'RDTE', 'YMAX', 'YMAG', 'AMDY', 'AMZY',
                   'AIPY', 'NVDY', 'FBY', 'GOOG', 'GOOY', 'NFLY', 'MRNY', 'PYPY']
    
    for etf in weekly_etfs:
        if etf in results and results[etf][0]:
            print(f"  ✓ {etf}")

if __name__ == "__main__":
    main()