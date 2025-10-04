#!/usr/bin/env python3
"""
Download Fed rate cut data in PROPER long format
One row per ticker per date
"""
import yfinance as yf
import pandas as pd
import time
import warnings

warnings.filterwarnings('ignore')

def main():
    # Read tickers
    with open('fed_strategy_100_tickers.txt', 'r') as f:
        tickers = f.read().strip().split(',')
    
    print(f"Downloading Fed rate cut data for {len(tickers)} tickers")
    print("Period: Dec 1, 2018 - Dec 31, 2019")
    print("Output: Clean long format (one row per ticker per date)")
    print()
    
    # Store all data in a list
    all_rows = []
    
    for i, ticker in enumerate(tickers, 1):
        print(f"[{i:3}/{len(tickers)}] {ticker}...", end=" ")
        
        try:
            # Download data for one ticker at a time
            data = yf.download(ticker, start="2018-12-01", end="2019-12-31", 
                              progress=False, auto_adjust=True)
            
            if not data.empty:
                # Process each day for this ticker
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
                
                print(f"OK - {len(data)} days")
            else:
                print("No data")
                
        except Exception as e:
            print(f"Error: {str(e)[:30]}")
        
        time.sleep(0.05)  # Rate limiting
    
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
        filename = 'fed_rate_cut_data_clean.csv'
        df.to_csv(filename, index=False)
        print(f"Data saved to: {filename}")
        
        # Show sample
        print(f"\nSample data:")
        print(df.head(10))
        
        # Quick validation
        print(f"\nValidation:")
        print(f"  All Close prices are numeric: {df['Close'].dtype}")
        print(f"  Date format: {df['Date'].iloc[0]} (string)")
        print(f"  No NaN values in Close: {df['Close'].isna().sum() == 0}")
        
        print(f"\n" + "=" * 50)
        print("SUCCESS! Clean Fed rate cut data ready for analysis")
        print("=" * 50)
        
        return df
    else:
        print("No data downloaded")
        return None

if __name__ == "__main__":
    clean_data = main()