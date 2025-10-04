#!/usr/bin/env python3
"""
Create summary statistics for Fed strategy data
"""
import pandas as pd

def create_summary():
    print("Creating Fed Strategy Summary...")
    print("=" * 40)
    
    # Read the data
    df = pd.read_csv('fed_strategy_data_20181201_to_20191231.csv')
    
    print(f"Dataset shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print(f"Date range: {df['Date'].min()} to {df['Date'].max()}")
    print(f"Unique tickers: {df['Ticker'].nunique()}")
    print()
    
    # Create summary by ticker
    summary_stats = df.groupby('Ticker').agg({
        'Close': ['count', 'first', 'last'],
        'Volume': 'mean',
        'Date': ['min', 'max']
    }).round(2)
    
    # Flatten column names
    summary_stats.columns = ['Days', 'First_Price', 'Last_Price', 'Avg_Volume', 'First_Date', 'Last_Date']
    summary_stats['Total_Return_Pct'] = ((summary_stats['Last_Price'] / summary_stats['First_Price'] - 1) * 100).round(2)
    
    # Save summary
    summary_filename = 'fed_strategy_summary_20181201_to_20191231.csv'
    summary_stats.to_csv(summary_filename)
    print(f"Summary saved to: {summary_filename}")
    
    # Show performance statistics
    print(f"\nPERFORMANCE STATISTICS (Dec 2018 - Dec 2019):")
    print("=" * 50)
    print(f"Average return: {summary_stats['Total_Return_Pct'].mean():.2f}%")
    print(f"Median return: {summary_stats['Total_Return_Pct'].median():.2f}%")
    print(f"Best performer: {summary_stats['Total_Return_Pct'].max():.2f}%")
    print(f"Worst performer: {summary_stats['Total_Return_Pct'].min():.2f}%")
    
    print(f"\nTop 10 performers:")
    print("-" * 40)
    top_10 = summary_stats.nlargest(10, 'Total_Return_Pct')[['First_Price', 'Last_Price', 'Total_Return_Pct']]
    print(top_10.to_string())
    
    print(f"\nBottom 10 performers:")
    print("-" * 40)
    bottom_10 = summary_stats.nsmallest(10, 'Total_Return_Pct')[['First_Price', 'Last_Price', 'Total_Return_Pct']]
    print(bottom_10.to_string())
    
    # Key dates analysis (rate cut dates)
    rate_cut_dates = [
        '2018-12-19',  # Fed cut 2.50% -> 2.25%
        '2019-07-31',  # Fed cut 2.25% -> 2.00%
        '2019-09-18',  # Fed cut 2.00% -> 1.75%
        '2019-10-30'   # Fed cut 1.75% -> 1.50%
    ]
    
    print(f"\n" + "=" * 50)
    print("DATA READY FOR RATE CUT ANALYSIS!")
    print("=" * 50)
    print("Key rate cut dates to analyze:")
    for date in rate_cut_dates:
        print(f"  - {date}")
    
    print(f"\nNext steps:")
    print("1. Analyze performance around each rate cut date")
    print("2. Compare sector performance (tech vs utilities vs bonds)")
    print("3. Look for dividend vs growth patterns")
    print("4. Test monthly entry/exit strategies")
    
    return summary_stats

if __name__ == "__main__":
    summary = create_summary()