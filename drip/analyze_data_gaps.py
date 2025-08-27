import pandas as pd
from datetime import datetime, timedelta
import numpy as np

def analyze_data_gaps():
    """Analyze the DRIP data to find gaps and potentially delayed periods"""
    
    # Load the data
    df = pd.read_csv('drip_15min_data.csv')
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp')
    
    print("DRIP Data Analysis")
    print("=" * 50)
    print(f"Total records: {len(df)}")
    print(f"Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    print()
    
    # Calculate time differences between consecutive records
    df['time_diff'] = df['timestamp'].diff()
    
    # Expected gap for 15-minute intervals
    expected_gap = timedelta(minutes=15)
    
    # Find gaps larger than expected (accounting for market close/weekends)
    # A gap > 1 hour during market hours is unusual
    large_gaps = df[df['time_diff'] > timedelta(hours=1)]
    
    print("Analyzing data gaps and coverage...")
    print("-" * 50)
    
    # Group by date to see daily coverage
    df['date'] = df['timestamp'].dt.date
    daily_counts = df.groupby('date').size()
    
    # Expected bars per day (9:30 AM to 4:00 PM = 6.5 hours * 4 bars/hour = 26 bars)
    expected_bars_per_day = 26
    
    # Find days with significantly fewer bars than expected
    incomplete_days = daily_counts[daily_counts < expected_bars_per_day * 0.8]  # Less than 80% of expected
    
    print(f"\nDays with incomplete data (< {int(expected_bars_per_day * 0.8)} bars):")
    if len(incomplete_days) > 0:
        for date, count in incomplete_days.items():
            print(f"  {date}: {count} bars (expected ~{expected_bars_per_day})")
    else:
        print("  None found")
    
    # Check for specific date ranges mentioned as "DELAYED"
    # Based on the script output, data from 2025-06-04 onwards was marked as DELAYED
    delayed_start = datetime(2025, 6, 4).date()
    delayed_data = df[df['date'] >= delayed_start]
    
    print(f"\nData marked as 'DELAYED' by API:")
    print(f"  From: {delayed_start}")
    print(f"  To: {df['timestamp'].max().date()}")
    print(f"  Records in delayed period: {len(delayed_data)}")
    print(f"  Days covered: {delayed_data['date'].nunique()}")
    
    # Check the last few days specifically
    last_date = df['timestamp'].max().date()
    last_week_start = last_date - timedelta(days=7)
    last_week_data = df[df['date'] >= last_week_start]
    
    print(f"\nLast week's data coverage:")
    last_week_daily = last_week_data.groupby('date').size()
    for date, count in last_week_daily.items():
        completeness = (count / expected_bars_per_day) * 100
        status = "DELAYED" if date >= delayed_start else "OK"
        print(f"  {date}: {count} bars ({completeness:.1f}% complete) - {status}")
    
    # Find any missing trading days
    all_dates = pd.date_range(start=df['timestamp'].min().date(), 
                              end=df['timestamp'].max().date(), 
                              freq='B')  # Business days only
    
    actual_dates = set(df['date'].unique())
    expected_dates = set(all_dates.date)
    missing_dates = expected_dates - actual_dates
    
    print(f"\nMissing trading days (if any):")
    if missing_dates:
        for date in sorted(missing_dates)[:20]:  # Show first 20
            print(f"  {date}")
        if len(missing_dates) > 20:
            print(f"  ... and {len(missing_dates) - 20} more")
    else:
        print("  None (all business days have data)")
    
    # Check data quality for the delayed period
    print(f"\nData quality check for DELAYED period (June 4, 2025 onwards):")
    if len(delayed_data) > 0:
        print(f"  Volume stats:")
        print(f"    Mean: {delayed_data['volume'].mean():.2f}")
        print(f"    Median: {delayed_data['volume'].median():.2f}")
        print(f"    Min: {delayed_data['volume'].min():.2f}")
        print(f"    Max: {delayed_data['volume'].max():.2f}")
        
        # Check for any null values
        null_counts = delayed_data.isnull().sum()
        if null_counts.any():
            print(f"  Null values found:")
            for col, count in null_counts[null_counts > 0].items():
                print(f"    {col}: {count}")
        else:
            print(f"  No null values in core fields")

if __name__ == "__main__":
    analyze_data_gaps()