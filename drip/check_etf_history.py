#!/usr/bin/env python3
"""
Check how many ETFs in the monthly pipeline have data going back to 2018
"""
import pandas as pd
from datetime import datetime
import yfinance as yf

def check_etf_history():
    # Read the ticker list
    df = pd.read_csv('combined_600_tickers_20250903_0749.csv')
    
    # Trading days from 2018-01-01 to now (roughly)
    # ~252 trading days per year * 7 years = ~1764 days
    min_days_for_2018 = 1500  # Conservative estimate
    
    # Check using days_of_data column
    etfs_since_2018 = df[df['days_of_data'] >= min_days_for_2018]
    
    print(f"Total tickers: {len(df)}")
    print(f"Tickers with data since ~2018 (>={min_days_for_2018} days): {len(etfs_since_2018)}")
    print(f"Percentage: {len(etfs_since_2018)/len(df)*100:.1f}%")
    
    # Let's also check actual inception dates for a sample
    print("\n" + "="*50)
    print("Verifying inception dates for a sample of tickers:")
    print("="*50)
    
    # Take a sample to verify
    sample_tickers = df.nlargest(10, 'days_of_data')['ticker'].tolist()[:5]
    
    for ticker in sample_tickers:
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period="max")
            if not hist.empty:
                first_date = hist.index[0].date()
                days_of_history = (datetime.now().date() - first_date).days
                print(f"{ticker}: First data from {first_date} ({days_of_history} days ago)")
        except Exception as e:
            print(f"{ticker}: Error checking history - {e}")
    
    print("\n" + "="*50)
    print("ETFs/Stocks with longest history (most likely to have 2018 data):")
    print("="*50)
    
    # Show top 20 by days of data
    top_20 = df.nlargest(20, 'days_of_data')[['ticker', 'days_of_data', 'category']]
    print(top_20.to_string(index=False))
    
    print("\n" + "="*50)
    print("Distribution of data availability:")
    print("="*50)
    
    # Create bins for days of data
    bins = [0, 250, 500, 750, 1000, 1250, 1500, 2000, 10000]
    labels = ['<1yr', '1-2yr', '2-3yr', '3-4yr', '4-5yr', '5-6yr', '6-8yr', '>8yr']
    df['data_range'] = pd.cut(df['days_of_data'], bins=bins, labels=labels, right=False)
    
    distribution = df['data_range'].value_counts().sort_index()
    print(distribution)
    
    # List all tickers with 2018+ data
    print("\n" + "="*50)
    print(f"All {len(etfs_since_2018)} tickers with data since ~2018:")
    print("="*50)
    print(', '.join(etfs_since_2018['ticker'].tolist()))

if __name__ == "__main__":
    check_etf_history()