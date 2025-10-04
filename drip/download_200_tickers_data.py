#!/usr/bin/env python3
"""
Download Fed rate cut data for 200 tickers in proper long format
"""
import yfinance as yf
import pandas as pd
import time
import warnings

warnings.filterwarnings('ignore')

def main():
    # Read tickers
    with open('fed_strategy_200_tickers.txt', 'r') as f:
        tickers = f.read().strip().split(',')
    
    print(f"Downloading Fed rate cut data for {len(tickers)} tickers")
    print("Period: Dec 1, 2018 - Dec 31, 2019")
    print("Output: Clean long format (one row per ticker per date)")
    print()
    
    # Store all data in a list
    all_rows = []
    successful_downloads = 0
    failed_tickers = []
    
    for i, ticker in enumerate(tickers, 1):
        print(f"[{i:3}/{len(tickers)}] {ticker}...", end=" ")
        
        try:
            # Download data for one ticker at a time
            data = yf.download(ticker, start="2018-12-01", end="2019-12-31", 
                              progress=False, auto_adjust=True)
            
            if not data.empty and len(data) > 200:  # Ensure we have substantial data
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
                
                successful_downloads += 1
                print(f"OK - {len(data)} days")
            else:
                failed_tickers.append(ticker)
                if data.empty:
                    print("No data")
                else:
                    print(f"Insufficient data ({len(data)} days)")
                
        except Exception as e:
            failed_tickers.append(ticker)
            print(f"Error: {str(e)[:30]}")
        
        time.sleep(0.05)  # Rate limiting
        
        # Progress updates
        if i % 50 == 0:
            print(f"\nProgress: {i}/{len(tickers)} completed ({successful_downloads} successful)\n")
    
    print(f"\n" + "=" * 60)
    print("DOWNLOAD SUMMARY")
    print("=" * 60)
    print(f"Total tickers attempted: {len(tickers)}")
    print(f"Successful downloads: {successful_downloads}")
    print(f"Failed downloads: {len(failed_tickers)}")
    print(f"Success rate: {successful_downloads/len(tickers)*100:.1f}%")
    
    if failed_tickers:
        print(f"\nFailed tickers ({len(failed_tickers)}):")
        for i in range(0, len(failed_tickers), 10):
            chunk = failed_tickers[i:i+10]
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
        filename = 'fed_200_tickers_data_clean.csv'
        df.to_csv(filename, index=False)
        print(f"Data saved to: {filename}")
        
        # Show sample
        print(f"\nSample data:")
        print(df.head(5))
        
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
        
        print(f"\nTicker with most data: {ticker_summary.loc[ticker_summary['Days'].idxmax(), 'Ticker']} ({ticker_summary['Days'].max()} days)")
        print(f"Ticker with least data: {ticker_summary.loc[ticker_summary['Days'].idxmin(), 'Ticker']} ({ticker_summary['Days'].min()} days)")
        
        print(f"\n" + "=" * 60)
        print("SUCCESS! 200-ticker Fed rate cut data ready for analysis")
        print("=" * 60)
        
        return df, successful_downloads, failed_tickers
    else:
        print("No data downloaded")
        return None, 0, failed_tickers

if __name__ == "__main__":
    data, success_count, failed = main()