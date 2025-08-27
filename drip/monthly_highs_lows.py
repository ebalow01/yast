import pandas as pd
from datetime import datetime
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def analyze_monthly_highs_lows():
    """Find the high and low price points for each month with timestamps and day of week"""
    
    # Load the data
    df = pd.read_csv('drip_15min_data.csv')
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Create month-year column for grouping
    df['month_year'] = df['timestamp'].dt.to_period('M')
    
    print("DRIP Monthly Highs and Lows Analysis (with Day of Week)")
    print("=" * 100)
    print(f"{'Month':<12} {'High':>10} {'High Date/Time':<20} {'Day':<9} {'Low':>10} {'Low Date/Time':<20} {'Day':<9} {'Range':>8}")
    print("-" * 100)
    
    # Store results for CSV export
    results = []
    
    # Group by month and find highs/lows
    for month in df['month_year'].unique():
        month_data = df[df['month_year'] == month]
        
        # Find the highest high
        max_high = month_data['high'].max()
        max_high_row = month_data[month_data['high'] == max_high].iloc[0]
        max_high_time = max_high_row['timestamp']
        max_high_day = max_high_time.strftime('%A')  # Get day name (Monday, Tuesday, etc.)
        
        # Find the lowest low
        min_low = month_data['low'].min()
        min_low_row = month_data[month_data['low'] == min_low].iloc[0]
        min_low_time = min_low_row['timestamp']
        min_low_day = min_low_time.strftime('%A')  # Get day name
        
        # Calculate range
        price_range = max_high - min_low
        range_pct = (price_range / min_low) * 100
        
        # Print formatted output
        print(f"{str(month):<12} ${max_high:>9.2f} {max_high_time.strftime('%Y-%m-%d %H:%M'):<20} {max_high_day:<9} ${min_low:>9.2f} {min_low_time.strftime('%Y-%m-%d %H:%M'):<20} {min_low_day:<9} ${price_range:>7.2f}")
        
        # Store for export
        results.append({
            'month': str(month),
            'high': max_high,
            'high_timestamp': max_high_time,
            'high_day_of_week': max_high_day,
            'low': min_low,
            'low_timestamp': min_low_time,
            'low_day_of_week': min_low_day,
            'range': price_range,
            'range_pct': range_pct
        })
    
    # Create DataFrame and save to CSV
    results_df = pd.DataFrame(results)
    results_df.to_csv('monthly_highs_lows.csv', index=False)
    
    print("\n" + "=" * 100)
    print("\nSummary Statistics:")
    print(f"Average monthly range: ${results_df['range'].mean():.2f}")
    print(f"Average monthly range %: {results_df['range_pct'].mean():.2f}%")
    print(f"Largest monthly range: ${results_df['range'].max():.2f} ({results_df.loc[results_df['range'].idxmax(), 'month']})")
    print(f"Smallest monthly range: ${results_df['range'].min():.2f} ({results_df.loc[results_df['range'].idxmin(), 'month']})")
    
    # Find overall high and low
    overall_high_idx = results_df['high'].idxmax()
    overall_low_idx = results_df['low'].idxmin()
    
    print(f"\nAll-time high: ${results_df.loc[overall_high_idx, 'high']:.2f} on {results_df.loc[overall_high_idx, 'high_timestamp'].strftime('%Y-%m-%d %H:%M')} ({results_df.loc[overall_high_idx, 'high_day_of_week']})")
    print(f"All-time low: ${results_df.loc[overall_low_idx, 'low']:.2f} on {results_df.loc[overall_low_idx, 'low_timestamp'].strftime('%Y-%m-%d %H:%M')} ({results_df.loc[overall_low_idx, 'low_day_of_week']})")
    
    # Day of week analysis
    print("\nDay of Week Frequency Analysis:")
    print("High occurrences by day:")
    high_days = results_df['high_day_of_week'].value_counts()
    for day, count in high_days.items():
        print(f"  {day}: {count} times ({count/len(results_df)*100:.1f}%)")
    
    print("\nLow occurrences by day:")
    low_days = results_df['low_day_of_week'].value_counts()
    for day, count in low_days.items():
        print(f"  {day}: {count} times ({count/len(results_df)*100:.1f}%)")
    
    print(f"\n✅ Results saved to 'monthly_highs_lows.csv'")
    
    return results_df

if __name__ == "__main__":
    analyze_monthly_highs_lows()