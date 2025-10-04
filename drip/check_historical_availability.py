#!/usr/bin/env python3
"""
Check how many ETFs/stocks from the monthly pipeline have data going back to 2018
Only downloads daily close data to check availability
"""
import pandas as pd
import yfinance as yf
from datetime import datetime
import time

def check_ticker_history(ticker, start_date="2018-01-01"):
    """
    Check if a ticker has data going back to the start date
    Returns (has_data, first_date, days_available)
    """
    try:
        stock = yf.Ticker(ticker)
        # Only download Close price to minimize data
        hist = stock.history(start=start_date, end=datetime.now().strftime("%Y-%m-%d"))
        
        if hist.empty:
            return False, None, 0
        
        first_date = hist.index[0].date()
        days_available = len(hist)
        
        # Check if data actually goes back to 2018
        target_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        has_2018_data = first_date <= target_date
        
        return has_2018_data, first_date, days_available
        
    except Exception as e:
        print(f"Error checking {ticker}: {e}")
        return False, None, 0

def main():
    # Read the ticker list
    df = pd.read_csv('combined_600_tickers_20250903_0749.csv')
    
    print(f"Total tickers to check: {len(df)}")
    print("Checking which tickers have data back to 2018-01-01...")
    print("This will take a few minutes...\n")
    
    # Results storage
    results = []
    tickers_with_2018 = []
    
    # Process in batches with progress updates
    batch_size = 50
    for i in range(0, len(df), batch_size):
        batch = df.iloc[i:min(i+batch_size, len(df))]
        print(f"Processing batch {i//batch_size + 1}/{(len(df)-1)//batch_size + 1}...")
        
        for _, row in batch.iterrows():
            ticker = row['ticker']
            has_data, first_date, days = check_ticker_history(ticker)
            
            results.append({
                'ticker': ticker,
                'category': row['category'],
                'has_2018_data': has_data,
                'first_date': first_date,
                'days_available': days
            })
            
            if has_data:
                tickers_with_2018.append(ticker)
                print(f"  ✓ {ticker}: Data from {first_date}")
            
            # Small delay to avoid rate limiting
            time.sleep(0.1)
    
    # Create results DataFrame
    results_df = pd.DataFrame(results)
    
    # Summary statistics
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Total tickers analyzed: {len(results_df)}")
    print(f"Tickers with data since 2018: {len(tickers_with_2018)}")
    print(f"Percentage: {len(tickers_with_2018)/len(results_df)*100:.1f}%")
    
    # Show distribution by category
    print("\n" + "="*60)
    print("BREAKDOWN BY CATEGORY")
    print("="*60)
    
    category_stats = results_df.groupby('category')['has_2018_data'].agg(['sum', 'count', lambda x: f"{x.mean()*100:.1f}%"])
    category_stats.columns = ['Has 2018 Data', 'Total', 'Percentage']
    print(category_stats)
    
    # Show all tickers with 2018 data
    print("\n" + "="*60)
    print(f"ALL {len(tickers_with_2018)} TICKERS WITH DATA SINCE 2018")
    print("="*60)
    
    if tickers_with_2018:
        # Sort by first date
        with_2018 = results_df[results_df['has_2018_data']].sort_values('first_date')
        
        print("\nOldest ETFs/Stocks (earliest data):")
        print(with_2018.head(20)[['ticker', 'category', 'first_date', 'days_available']].to_string(index=False))
        
        print("\nFull list (alphabetical):")
        print(', '.join(sorted(tickers_with_2018)))
    else:
        print("No tickers found with data back to 2018")
    
    # Save results to CSV for future reference
    results_df.to_csv('ticker_historical_availability.csv', index=False)
    print(f"\nDetailed results saved to ticker_historical_availability.csv")
    
    # Save list of 2018 tickers
    if tickers_with_2018:
        with open('tickers_with_2018_data.txt', 'w') as f:
            f.write(','.join(sorted(tickers_with_2018)))
        print(f"List of {len(tickers_with_2018)} tickers with 2018 data saved to tickers_with_2018_data.txt")

if __name__ == "__main__":
    main()