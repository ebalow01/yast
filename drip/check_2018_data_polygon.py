#!/usr/bin/env python3
"""
Check which tickers from the monthly pipeline have data back to 2018 using Polygon API
"""
import pandas as pd
import requests
import time
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Polygon API key from environment
POLYGON_API_KEY = os.getenv('POLYGON_API_KEY')
if not POLYGON_API_KEY:
    print("Error: POLYGON_API_KEY environment variable not set")
    exit(1)

def check_ticker_2018_data(ticker):
    """Check if ticker has data from 2018-01-01 using Polygon API"""
    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/2018-01-01/2018-01-31"
    params = {'apikey': POLYGON_API_KEY}
    
    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if response.status_code == 200 and data.get('status') == 'OK':
            results = data.get('results', [])
            if results:
                # Convert timestamp to date
                first_timestamp = results[0]['t']
                first_date = datetime.fromtimestamp(first_timestamp / 1000).date()
                return True, first_date, len(results)
        elif response.status_code == 429:
            print(f"    Rate limited on {ticker}, waiting...")
            time.sleep(60)  # Wait 1 minute for rate limit
            return check_ticker_2018_data(ticker)  # Retry
        else:
            print(f"    API response for {ticker}: {response.status_code} - {data.get('status', 'unknown')}")
        
        return False, None, 0
        
    except Exception as e:
        print(f"    Error checking {ticker}: {e}")
        return False, None, 0

def main():
    # Read the ticker list
    df = pd.read_csv('combined_600_tickers_20250903_0749.csv')
    
    # For testing, limit to first 10 tickers
    df_test = df.head(10)
    
    print(f"Testing with first {len(df_test)} tickers for 2018 data using Polygon API...")
    print("=" * 60)
    
    results = []
    tickers_with_2018 = []
    
    for i, row in df_test.iterrows():
        ticker = row['ticker']
        category = row['category']
        
        print(f"Checking {i+1}/{len(df_test)}: {ticker}...", end=" ")
        has_data, first_date, days_count = check_ticker_2018_data(ticker)
        
        results.append({
            'ticker': ticker,
            'category': category,
            'has_2018_data': has_data,
            'first_date': first_date,
            'days_in_jan_2018': days_count
        })
        
        if has_data:
            tickers_with_2018.append(ticker)
            print(f"[OK] {ticker}: Data from {first_date} ({days_count} days in Jan 2018)")
        else:
            print(f"[NO] {ticker}: No 2018 data")
        
        # Progress update
        if (i + 1) % 50 == 0:
            print(f"\nProcessed {i + 1}/{len(df)} tickers... Found {len(tickers_with_2018)} with 2018 data\n")
        
        # Rate limiting - Polygon allows 5 calls per minute on free tier
        time.sleep(0.1)
    
    # Create results DataFrame
    results_df = pd.DataFrame(results)
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total tickers checked: {len(results_df)}")
    print(f"Tickers with 2018 data: {len(tickers_with_2018)}")
    print(f"Percentage: {len(tickers_with_2018)/len(results_df)*100:.1f}%")
    
    # Breakdown by category
    if len(tickers_with_2018) > 0:
        print("\n" + "=" * 60)
        print("BREAKDOWN BY CATEGORY")
        print("=" * 60)
        
        category_stats = results_df.groupby('category')['has_2018_data'].agg(['sum', 'count'])
        category_stats['percentage'] = (category_stats['sum'] / category_stats['count'] * 100).round(1)
        category_stats.columns = ['Has 2018 Data', 'Total', 'Percentage']
        print(category_stats)
        
        print("\n" + "=" * 60)
        print(f"ALL {len(tickers_with_2018)} TICKERS WITH 2018+ DATA:")
        print("=" * 60)
        
        # Sort and display
        tickers_with_2018.sort()
        for i in range(0, len(tickers_with_2018), 10):
            chunk = tickers_with_2018[i:i+10]
            print(', '.join(chunk))
        
        # Save results
        results_df.to_csv('polygon_2018_data_check.csv', index=False)
        print(f"\nDetailed results saved to polygon_2018_data_check.csv")
        
        with open('tickers_with_2018_polygon.txt', 'w') as f:
            f.write(','.join(tickers_with_2018))
        print(f"List of {len(tickers_with_2018)} tickers saved to tickers_with_2018_polygon.txt")
    else:
        print("\nNo tickers found with 2018 data")

if __name__ == "__main__":
    main()