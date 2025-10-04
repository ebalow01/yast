#!/usr/bin/env python3
"""
Clean download of Fed strategy data in proper long format
"""
import pandas as pd
import yfinance as yf
import time
import warnings

warnings.filterwarnings('ignore')

def main():
    # Read tickers
    with open('fed_strategy_100_tickers.txt', 'r') as f:
        tickers = f.read().strip().split(',')
    
    print(f"Downloading data for {len(tickers)} tickers...")
    print("Period: December 2018 - December 2019")
    print()
    
    # Initialize list to store all data
    all_data = []
    
    for i, ticker in enumerate(tickers, 1):
        print(f"[{i:3}/{len(tickers)}] {ticker}...", end=" ")
        
        try:
            # Download data for this ticker
            data = yf.download(ticker, start="2018-12-01", end="2019-12-31", 
                              progress=False, auto_adjust=True)
            
            if not data.empty:
                # Convert to long format immediately
                data_long = data.reset_index()
                data_long['Ticker'] = ticker
                
                # Select and reorder columns
                data_long = data_long[['Date', 'Ticker', 'Open', 'High', 'Low', 'Close', 'Volume']]
                
                all_data.append(data_long)
                print(f"OK - {len(data_long)} days")
            else:
                print("No data")
                
        except Exception as e:
            print(f"Error: {str(e)[:50]}")
        
        time.sleep(0.05)
    
    # Combine all data
    if all_data:
        print(f"\nCombining data from {len(all_data)} tickers...")
        final_data = pd.concat(all_data, ignore_index=True)
        final_data = final_data.sort_values(['Date', 'Ticker']).reset_index(drop=True)
        
        print(f"Final dataset shape: {final_data.shape}")
        print(f"Columns: {list(final_data.columns)}")
        print(f"Date range: {final_data['Date'].min()} to {final_data['Date'].max()}")
        print(f"Unique tickers: {final_data['Ticker'].nunique()}")
        
        # Save data
        filename = 'fed_strategy_clean.csv'
        final_data.to_csv(filename, index=False)
        print(f"\nData saved to: {filename}")
        
        # Quick performance summary
        print(f"\nQuick performance summary:")
        first_close = final_data.groupby('Ticker')['Close'].first()
        last_close = final_data.groupby('Ticker')['Close'].last()
        returns = ((last_close / first_close - 1) * 100).round(2)
        
        print(f"Average return: {returns.mean():.2f}%")
        print(f"Best performer: {returns.max():.2f}% ({returns.idxmax()})")
        print(f"Worst performer: {returns.min():.2f}% ({returns.idxmin()})")
        
        print(f"\n" + "=" * 50)
        print("SUCCESS! Clean data ready for Fed rate cut analysis")
        print("Key dates to analyze:")
        print("  - 2018-12-19: Fed cut (2.50% -> 2.25%)")
        print("  - 2019-07-31: Fed cut (2.25% -> 2.00%)")
        print("  - 2019-09-18: Fed cut (2.00% -> 1.75%)")
        print("  - 2019-10-30: Fed cut (1.75% -> 1.50%)")
        
        return final_data
    else:
        print("No data was downloaded successfully")
        return None

if __name__ == "__main__":
    data = main()