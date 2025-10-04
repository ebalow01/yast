#!/usr/bin/env python3
"""
Fix the Fed strategy data format
Convert from wide format (separate columns per ticker) to long format
"""
import pandas as pd
import yfinance as yf
from datetime import datetime
import time
import warnings

warnings.filterwarnings('ignore')

def download_and_fix_data():
    """Re-download data in correct format"""
    
    # Read the ticker list
    with open('fed_strategy_100_tickers.txt', 'r') as f:
        tickers = f.read().strip().split(',')
    
    print("FIXING FED STRATEGY DATA FORMAT")
    print("=" * 50)
    print(f"Re-downloading {len(tickers)} tickers in correct format...")
    
    # Date range
    start_date = "2018-12-01"
    end_date = "2019-12-31"
    
    # Download data correctly
    all_data = []
    successful = 0
    
    for i, ticker in enumerate(tickers, 1):
        print(f"[{i:3}/{len(tickers)}] {ticker}...", end=" ")
        
        try:
            data = yf.download(ticker, start=start_date, end=end_date, 
                              progress=False, auto_adjust=True)
            
            if not data.empty:
                # Reset index to make Date a column
                data = data.reset_index()
                # Add ticker column
                data['Ticker'] = ticker
                # Reorder columns
                data = data[['Date', 'Ticker', 'Open', 'High', 'Low', 'Close', 'Volume']]
                all_data.append(data)
                successful += 1
                print(f"OK {len(data)} days")
            else:
                print("No data")
                
        except Exception as e:
            print(f"Error: {e}")
        
        time.sleep(0.05)  # Small delay
    
    if all_data:
        # Combine all data
        combined_data = pd.concat(all_data, ignore_index=True)
        
        # Sort by Date and Ticker
        combined_data = combined_data.sort_values(['Date', 'Ticker'])
        
        print(f"\nCombined dataset:")
        print(f"  Shape: {combined_data.shape}")
        print(f"  Date range: {combined_data['Date'].min()} to {combined_data['Date'].max()}")
        print(f"  Unique tickers: {combined_data['Ticker'].nunique()}")
        
        # Save the corrected data
        filename = 'fed_strategy_data_fixed_20181201_to_20191231.csv'
        combined_data.to_csv(filename, index=False)
        print(f"\nCorrected data saved to: {filename}")
        
        # Create summary statistics
        print("\nCreating summary statistics...")
        
        summary_stats = combined_data.groupby('Ticker').agg({
            'Close': ['count', 'first', 'last'],
            'Volume': 'mean',
            'Date': ['min', 'max']
        }).round(2)
        
        # Flatten column names
        summary_stats.columns = ['Days', 'First_Price', 'Last_Price', 'Avg_Volume', 'First_Date', 'Last_Date']
        summary_stats['Total_Return_Pct'] = ((summary_stats['Last_Price'] / summary_stats['First_Price'] - 1) * 100).round(2)
        
        # Save summary
        summary_filename = 'fed_strategy_summary_fixed_20181201_to_20191231.csv'
        summary_stats.to_csv(summary_filename)
        print(f"Summary saved to: {summary_filename}")
        
        # Show key statistics
        print(f"\nPERFORMANCE SUMMARY (Dec 2018 - Dec 2019):")
        print("=" * 50)
        print(f"Successful downloads: {successful}/{len(tickers)}")
        print(f"Average return: {summary_stats['Total_Return_Pct'].mean():.2f}%")
        print(f"Median return: {summary_stats['Total_Return_Pct'].median():.2f}%")
        print(f"Best performer: {summary_stats.loc[summary_stats['Total_Return_Pct'].idxmax(), 'Total_Return_Pct']:.2f}% ({summary_stats['Total_Return_Pct'].idxmax()})")
        print(f"Worst performer: {summary_stats.loc[summary_stats['Total_Return_Pct'].idxmin(), 'Total_Return_Pct']:.2f}% ({summary_stats['Total_Return_Pct'].idxmin()})")
        
        print(f"\nTop 10 performers:")
        top_10 = summary_stats.nlargest(10, 'Total_Return_Pct')[['First_Price', 'Last_Price', 'Total_Return_Pct']]
        print(top_10.to_string())
        
        print(f"\n" + "=" * 50)
        print("DATA READY FOR ANALYSIS!")
        print("Fed rate cut dates to analyze:")
        print("  - 2018-12-19: First cut (2.50% -> 2.25%)")
        print("  - 2019-07-31: Second cut (2.25% -> 2.00%)")
        print("  - 2019-09-18: Third cut (2.00% -> 1.75%)")
        print("  - 2019-10-30: Fourth cut (1.75% -> 1.50%)")
        
        return combined_data, summary_stats
    else:
        print("No data downloaded successfully")
        return None, None

if __name__ == "__main__":
    data, summary = download_and_fix_data()