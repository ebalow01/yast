#!/usr/bin/env python3
"""
Check which tickers from the monthly pipeline likely have data back to 2018
Based on the days_of_data column in the CSV
"""
import pandas as pd
from datetime import datetime, date

def check_2018_data_from_csv():
    # Read the ticker list
    df = pd.read_csv('combined_600_tickers_20250903_0749.csv')
    
    print(f"Analyzing {len(df)} tickers for potential 2018 data availability...")
    print("=" * 70)
    
    # Calculate days since 2018-01-01
    today = date.today()
    days_since_2018 = (today - date(2018, 1, 1)).days
    print(f"Days since 2018-01-01: {days_since_2018}")
    
    # Trading days are roughly 252 per year, so ~7 years * 252 = ~1764 days
    # But let's be conservative and say 1500+ days likely means 2018 data
    min_days_for_2018 = 1500
    
    # Find tickers with enough historical data
    likely_2018_tickers = df[df['days_of_data'] >= min_days_for_2018].copy()
    
    print(f"\nTickers with >= {min_days_for_2018} days of data (likely have 2018 data):")
    print("=" * 70)
    print(f"Found: {len(likely_2018_tickers)} out of {len(df)} tickers ({len(likely_2018_tickers)/len(df)*100:.1f}%)")
    
    if len(likely_2018_tickers) > 0:
        # Sort by days of data (most to least)
        likely_2018_tickers = likely_2018_tickers.sort_values('days_of_data', ascending=False)
        
        print(f"\nTop 20 tickers by data history:")
        print("-" * 70)
        top_20 = likely_2018_tickers.head(20)
        for _, row in top_20.iterrows():
            years_approx = row['days_of_data'] / 252
            print(f"{row['ticker']:6} - {row['days_of_data']:4} days (~{years_approx:.1f} years) - {row['category']}")
        
        print(f"\nBreakdown by category:")
        print("-" * 50)
        category_breakdown = likely_2018_tickers.groupby('category').agg({
            'ticker': 'count',
            'days_of_data': 'mean'
        }).round(0)
        category_breakdown.columns = ['Count', 'Avg Days']
        category_breakdown = category_breakdown.sort_values('Count', ascending=False)
        print(category_breakdown)
        
        print(f"\nAll {len(likely_2018_tickers)} tickers with likely 2018 data:")
        print("=" * 70)
        
        # Group by category for better organization
        for category in likely_2018_tickers['category'].unique():
            category_tickers = likely_2018_tickers[likely_2018_tickers['category'] == category]['ticker'].tolist()
            print(f"\n{category} ({len(category_tickers)}):")
            # Print in rows of 8 for readability
            for i in range(0, len(category_tickers), 8):
                chunk = category_tickers[i:i+8]
                print("  " + ", ".join(chunk))
        
        # Save results
        likely_2018_tickers[['ticker', 'category', 'days_of_data']].to_csv('likely_2018_tickers.csv', index=False)
        
        # Save just the ticker list for use in other scripts
        ticker_list = likely_2018_tickers['ticker'].tolist()
        with open('likely_2018_tickers.txt', 'w') as f:
            f.write(','.join(ticker_list))
        
        print(f"\n" + "=" * 70)
        print("FILES CREATED:")
        print("  likely_2018_tickers.csv - Detailed data")
        print("  likely_2018_tickers.txt - Comma-separated ticker list")
        print(f"\nReady for Fed rate cut strategy testing with {len(ticker_list)} tickers!")
        
        return ticker_list
    else:
        print("\nNo tickers found with sufficient historical data")
        return []

if __name__ == "__main__":
    tickers_2018 = check_2018_data_from_csv()