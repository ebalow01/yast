#!/usr/bin/env python3
"""
Analyze the data timeframes available in the monthly pipeline
"""
import pandas as pd
from datetime import datetime, date

def analyze_data_timeframes():
    # Read the ticker list
    df = pd.read_csv('combined_600_tickers_20250903_0749.csv')
    
    print(f"Analyzing data timeframes for {len(df)} tickers...")
    print("=" * 60)
    
    # Basic statistics
    print("Days of data statistics:")
    print(f"  Maximum: {df['days_of_data'].max()} days")
    print(f"  Minimum: {df['days_of_data'].min()} days") 
    print(f"  Average: {df['days_of_data'].mean():.1f} days")
    print(f"  Median: {df['days_of_data'].median():.1f} days")
    
    # Convert days to approximate years
    max_years = df['days_of_data'].max() / 252  # ~252 trading days per year
    print(f"  Maximum in years: ~{max_years:.1f} years")
    
    # Show distribution
    print(f"\nData age distribution:")
    bins = [0, 100, 200, 300, 500, 750, 1000, 1500, 10000]
    labels = ['<100d', '100-200d', '200-300d', '300-500d', '500-750d', '750d-1000d', '1000-1500d', '>1500d']
    df['data_range'] = pd.cut(df['days_of_data'], bins=bins, labels=labels, right=False)
    
    distribution = df['data_range'].value_counts().sort_index()
    print(distribution)
    
    # Show tickers with most historical data
    print(f"\nTop 20 tickers by data history:")
    print("-" * 60)
    top_20 = df.nlargest(20, 'days_of_data')
    for _, row in top_20.iterrows():
        years_approx = row['days_of_data'] / 252
        print(f"{row['ticker']:6} - {row['days_of_data']:4} days (~{years_approx:.1f} years) - {row['category']}")
    
    # Check if any get close to 2020
    days_since_2020 = (date.today() - date(2020, 1, 1)).days
    tickers_2020_plus = df[df['days_of_data'] >= days_since_2020 * 0.7]  # 70% of days since 2020
    
    print(f"\nTickers that might have data back to ~2020-2021:")
    print(f"(Need ~{days_since_2020 * 0.7:.0f} days, found {len(tickers_2020_plus)} tickers)")
    
    if len(tickers_2020_plus) > 0:
        print("\nTickers with potential 2020+ data:")
        for _, row in tickers_2020_plus.iterrows():
            years_approx = row['days_of_data'] / 252
            print(f"  {row['ticker']} - {row['days_of_data']} days (~{years_approx:.1f} years)")
    
    # Realistic assessment for Fed rate strategy
    print(f"\n" + "=" * 60)
    print("ASSESSMENT FOR FED RATE CUT STRATEGY:")
    print("=" * 60)
    
    # Last major rate cuts were March 2020 (COVID) and 2019
    days_since_2019 = (date.today() - date(2019, 1, 1)).days
    conservative_threshold = days_since_2019 * 0.8  # 80% of days since 2019
    
    potential_tickers = df[df['days_of_data'] >= conservative_threshold]
    
    print(f"For Fed rate cut analysis (need data from ~2019-2020):")
    print(f"  Minimum days needed: ~{conservative_threshold:.0f}")
    print(f"  Tickers meeting criteria: {len(potential_tickers)}")
    
    if len(potential_tickers) > 0:
        print(f"\nPotential tickers for Fed rate strategy:")
        potential_list = potential_tickers['ticker'].tolist()
        # Print in chunks of 10
        for i in range(0, len(potential_list), 10):
            chunk = potential_list[i:i+10]
            print("  " + ", ".join(chunk))
        
        # Save the list
        with open('potential_fed_strategy_tickers.txt', 'w') as f:
            f.write(','.join(potential_list))
        
        print(f"\nSaved {len(potential_list)} tickers to 'potential_fed_strategy_tickers.txt'")
        return potential_list
    else:
        print("No tickers have sufficient historical data for Fed rate cut analysis")
        print("Consider using well-established ETFs like SPY, QQQ, etc. instead")
        return []

if __name__ == "__main__":
    analyze_data_timeframes()