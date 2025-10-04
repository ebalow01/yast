#!/usr/bin/env python3
"""
Debug the data structure to understand the issue
"""
import pandas as pd

def debug_data():
    print("DEBUGGING DATA STRUCTURE")
    print("=" * 40)
    
    # Load data
    df = pd.read_csv('fed_strategy_clean.csv')
    print(f"Original shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    
    # Check first few rows
    print(f"\nFirst 5 rows:")
    print(df.head())
    
    # Check data types
    print(f"\nData types:")
    print(df.dtypes)
    
    # Check for a specific ticker
    print(f"\nSample data for AAPL:")
    aapl_data = df[df['Ticker'] == 'AAPL'].head(10)
    print(aapl_data[['Date', 'Ticker', 'Close']])
    
    # Check specific dates around rate cuts
    print(f"\nData around Dec 24, 2018 (first rate cut Monday):")
    df['Date'] = pd.to_datetime(df['Date'])
    dec_data = df[(df['Date'] >= '2018-12-20') & (df['Date'] <= '2018-12-28')]
    if not dec_data.empty:
        print(dec_data[['Date', 'Ticker', 'Close']].head(10))
    else:
        print("No data found for this period")
        
    # Check unique dates
    print(f"\nUnique dates around Christmas 2018:")
    unique_dates = df[(df['Date'] >= '2018-12-20') & (df['Date'] <= '2018-12-31')]['Date'].unique()
    for date in sorted(unique_dates):
        print(f"  {date.strftime('%Y-%m-%d %A')}")

if __name__ == "__main__":
    debug_data()