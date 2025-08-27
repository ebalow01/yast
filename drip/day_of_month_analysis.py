import pandas as pd
from datetime import datetime
import matplotlib.pyplot as plt
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def analyze_day_of_month_distribution():
    """Analyze the distribution of highs and lows by day of month"""
    
    # Load the monthly highs/lows data
    df = pd.read_csv('monthly_highs_lows.csv')
    df['high_timestamp'] = pd.to_datetime(df['high_timestamp'])
    df['low_timestamp'] = pd.to_datetime(df['low_timestamp'])
    
    # Extract day of month
    df['high_day_of_month'] = df['high_timestamp'].dt.day
    df['low_day_of_month'] = df['low_timestamp'].dt.day
    
    print("DRIP Day of Month Distribution Analysis")
    print("=" * 70)
    
    # Count occurrences by day of month for highs
    high_day_counts = df['high_day_of_month'].value_counts().sort_index()
    low_day_counts = df['low_day_of_month'].value_counts().sort_index()
    
    print("\n📈 Monthly HIGHS by Day of Month:")
    print("-" * 40)
    
    # Group days into segments
    early_month = range(1, 11)  # Days 1-10
    mid_month = range(11, 21)   # Days 11-20
    late_month = range(21, 32)  # Days 21-31
    
    high_early = sum(high_day_counts.get(d, 0) for d in early_month)
    high_mid = sum(high_day_counts.get(d, 0) for d in mid_month)
    high_late = sum(high_day_counts.get(d, 0) for d in late_month)
    
    print(f"Days 1-10:   {high_early} occurrences ({high_early/len(df)*100:.1f}%)")
    print(f"Days 11-20:  {high_mid} occurrences ({high_mid/len(df)*100:.1f}%)")
    print(f"Days 21-31:  {high_late} occurrences ({high_late/len(df)*100:.1f}%)")
    
    print("\nTop 5 days for monthly highs:")
    for day, count in high_day_counts.head(5).items():
        print(f"  Day {day:2d}: {count} times ({count/len(df)*100:.1f}%)")
    
    print("\n📉 Monthly LOWS by Day of Month:")
    print("-" * 40)
    
    low_early = sum(low_day_counts.get(d, 0) for d in early_month)
    low_mid = sum(low_day_counts.get(d, 0) for d in mid_month)
    low_late = sum(low_day_counts.get(d, 0) for d in late_month)
    
    print(f"Days 1-10:   {low_early} occurrences ({low_early/len(df)*100:.1f}%)")
    print(f"Days 11-20:  {low_mid} occurrences ({low_mid/len(df)*100:.1f}%)")
    print(f"Days 21-31:  {low_late} occurrences ({low_late/len(df)*100:.1f}%)")
    
    print("\nTop 5 days for monthly lows:")
    for day, count in low_day_counts.head(5).items():
        print(f"  Day {day:2d}: {count} times ({count/len(df)*100:.1f}%)")
    
    # Statistical analysis
    print("\n📊 Statistical Summary:")
    print("-" * 40)
    print(f"Average day of month for highs: {df['high_day_of_month'].mean():.1f}")
    print(f"Median day of month for highs:  {df['high_day_of_month'].median():.0f}")
    print(f"Average day of month for lows:  {df['low_day_of_month'].mean():.1f}")
    print(f"Median day of month for lows:   {df['low_day_of_month'].median():.0f}")
    
    # Check for patterns around month boundaries
    print("\n🗓️ Month Boundary Analysis:")
    print("-" * 40)
    
    # First 3 days and last 3 days
    first_three = [1, 2, 3]
    last_three = [28, 29, 30, 31]
    
    high_first = sum(high_day_counts.get(d, 0) for d in first_three)
    high_last = sum(high_day_counts.get(d, 0) for d in last_three)
    low_first = sum(low_day_counts.get(d, 0) for d in first_three)
    low_last = sum(low_day_counts.get(d, 0) for d in last_three)
    
    print(f"Highs in first 3 days:  {high_first} ({high_first/len(df)*100:.1f}%)")
    print(f"Highs in last 3 days:   {high_last} ({high_last/len(df)*100:.1f}%)")
    print(f"Lows in first 3 days:   {low_first} ({low_first/len(df)*100:.1f}%)")
    print(f"Lows in last 3 days:    {low_last} ({low_last/len(df)*100:.1f}%)")
    
    # Create a detailed distribution table
    print("\n📋 Complete Day Distribution:")
    print("-" * 70)
    print(f"{'Day':>3} | {'Highs':>6} | {'High %':>7} | {'Lows':>6} | {'Low %':>7} | {'Total':>6}")
    print("-" * 70)
    
    all_days = sorted(set(high_day_counts.index) | set(low_day_counts.index))
    for day in all_days:
        high_count = high_day_counts.get(day, 0)
        low_count = low_day_counts.get(day, 0)
        total = high_count + low_count
        high_pct = high_count / len(df) * 100
        low_pct = low_count / len(df) * 100
        print(f"{day:3d} | {high_count:6d} | {high_pct:6.1f}% | {low_count:6d} | {low_pct:6.1f}% | {total:6d}")
    
    # Save enhanced CSV with day of month
    df.to_csv('monthly_highs_lows_with_day_of_month.csv', index=False)
    print("\n✅ Enhanced results saved to 'monthly_highs_lows_with_day_of_month.csv'")
    
    # Create visualization
    try:
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
        
        # Plot highs distribution
        days = list(range(1, 32))
        high_counts = [high_day_counts.get(d, 0) for d in days]
        ax1.bar(days, high_counts, color='green', alpha=0.7)
        ax1.set_xlabel('Day of Month')
        ax1.set_ylabel('Frequency')
        ax1.set_title('Distribution of Monthly Highs by Day of Month')
        ax1.grid(True, alpha=0.3)
        
        # Plot lows distribution
        low_counts = [low_day_counts.get(d, 0) for d in days]
        ax2.bar(days, low_counts, color='red', alpha=0.7)
        ax2.set_xlabel('Day of Month')
        ax2.set_ylabel('Frequency')
        ax2.set_title('Distribution of Monthly Lows by Day of Month')
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig('day_of_month_distribution.png', dpi=100)
        print("📈 Visualization saved to 'day_of_month_distribution.png'")
    except:
        print("⚠️ Could not create visualization (matplotlib may not be installed)")
    
    return df

if __name__ == "__main__":
    analyze_day_of_month_distribution()