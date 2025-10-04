#!/usr/bin/env python3
"""
Download historical data for Fed rate cut strategy analysis
Period: December 2018 - December 2019
"""
import pandas as pd
import yfinance as yf
from datetime import datetime
import time
import warnings
import os

# Suppress yfinance warnings
warnings.filterwarnings('ignore')

def download_ticker_data(ticker, start_date, end_date):
    """Download data for a single ticker"""
    try:
        data = yf.download(ticker, start=start_date, end=end_date, 
                          progress=False, auto_adjust=True)
        if not data.empty:
            # Add ticker column
            data['Ticker'] = ticker
            return data
        else:
            print(f"  No data found for {ticker}")
            return None
    except Exception as e:
        print(f"  Error downloading {ticker}: {e}")
        return None

def main():
    # Read the ticker list
    with open('fed_strategy_100_tickers.txt', 'r') as f:
        tickers = f.read().strip().split(',')
    
    print("FED RATE CUT STRATEGY - DATA DOWNLOAD")
    print("=" * 50)
    print(f"Tickers to download: {len(tickers)}")
    print("Period: December 1, 2018 - December 31, 2019")
    print("Rate cut dates in this period:")
    print("  - Dec 19, 2018: 2.50% -> 2.25%")
    print("  - Jul 31, 2019: 2.25% -> 2.00%")
    print("  - Sep 18, 2019: 2.00% -> 1.75%")
    print("  - Oct 30, 2019: 1.75% -> 1.50%")
    print()
    
    # Date range
    start_date = "2018-12-01"
    end_date = "2019-12-31"
    
    # Download data
    all_data = []
    successful_downloads = 0
    failed_tickers = []
    
    print("Downloading data...")
    print("-" * 50)
    
    for i, ticker in enumerate(tickers, 1):
        print(f"[{i:3}/{len(tickers)}] {ticker}...", end=" ")
        
        data = download_ticker_data(ticker, start_date, end_date)
        
        if data is not None:
            all_data.append(data)
            successful_downloads += 1
            days_count = len(data)
            print(f"OK {days_count} days")
        else:
            failed_tickers.append(ticker)
            print("X Failed")
        
        # Small delay to be respectful to the API
        time.sleep(0.1)
        
        # Progress update every 25 tickers
        if i % 25 == 0:
            print(f"\nProgress: {i}/{len(tickers)} completed ({successful_downloads} successful)\n")
    
    print("\n" + "=" * 50)
    print("DOWNLOAD SUMMARY")
    print("=" * 50)
    print(f"Total tickers attempted: {len(tickers)}")
    print(f"Successful downloads: {successful_downloads}")
    print(f"Failed downloads: {len(failed_tickers)}")
    print(f"Success rate: {successful_downloads/len(tickers)*100:.1f}%")
    
    if failed_tickers:
        print(f"\nFailed tickers: {', '.join(failed_tickers)}")
    
    if all_data:
        # Combine all data
        print(f"\nCombining data from {len(all_data)} tickers...")
        combined_data = pd.concat(all_data, ignore_index=False)
        
        # Reset index to make Date a column
        combined_data = combined_data.reset_index()
        
        # Reorder columns
        columns_order = ['Date', 'Ticker', 'Open', 'High', 'Low', 'Close', 'Volume']
        combined_data = combined_data[columns_order]
        
        # Sort by Date and Ticker
        combined_data = combined_data.sort_values(['Date', 'Ticker'])
        
        print(f"Combined dataset shape: {combined_data.shape}")
        print(f"Date range: {combined_data['Date'].min()} to {combined_data['Date'].max()}")
        print(f"Unique tickers: {combined_data['Ticker'].nunique()}")
        
        # Save to CSV
        filename = f"fed_strategy_data_{start_date.replace('-', '')}_to_{end_date.replace('-', '')}.csv"
        combined_data.to_csv(filename, index=False)
        print(f"\nData saved to: {filename}")
        
        # Create summary statistics
        summary_stats = combined_data.groupby('Ticker').agg({
            'Close': ['count', 'first', 'last'],
            'Volume': 'mean',
            'Date': ['min', 'max']
        }).round(2)
        
        summary_stats.columns = ['Days', 'First_Price', 'Last_Price', 'Avg_Volume', 'First_Date', 'Last_Date']
        summary_stats['Total_Return_Pct'] = ((summary_stats['Last_Price'] / summary_stats['First_Price'] - 1) * 100).round(2)
        
        # Save summary
        summary_filename = f"fed_strategy_summary_{start_date.replace('-', '')}_to_{end_date.replace('-', '')}.csv"
        summary_stats.to_csv(summary_filename)
        print(f"Summary statistics saved to: {summary_filename}")
        
        # Show top performers
        print(f"\nTop 10 performers in the period:")
        top_performers = summary_stats.nlargest(10, 'Total_Return_Pct')[['First_Price', 'Last_Price', 'Total_Return_Pct']]
        print(top_performers.to_string())
        
        print(f"\nBottom 10 performers in the period:")
        bottom_performers = summary_stats.nsmallest(10, 'Total_Return_Pct')[['First_Price', 'Last_Price', 'Total_Return_Pct']]
        print(bottom_performers.to_string())
        
        print(f"\n" + "=" * 50)
        print("DATA READY FOR ANALYSIS!")
        print("=" * 50)
        print("Next steps:")
        print("1. Analyze performance around each rate cut date")
        print("2. Compare dividend vs growth performance")
        print("3. Look for sector rotation patterns")
        print("4. Test entry/exit strategies")
        print(f"5. Build monthly strategy based on patterns found")
        
        return filename, summary_filename
    else:
        print("\nNo data was successfully downloaded.")
        return None, None

if __name__ == "__main__":
    data_file, summary_file = main()