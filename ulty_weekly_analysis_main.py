#!/usr/bin/env python3
"""
ULTY Weekly Analysis Module
Analyzes weekly dividend patterns and performance.
"""

import pandas as pd
import numpy as np
from datetime import datetime
import os

def analyze_weekly_dividend_pattern(hist_data):
    """
    Analyze the weekly dividend pattern for ULTY stock.
    """
    if hist_data is None:
        print("No data available for analysis")
        return None
    
    print("\n" + "=" * 60)
    print("WEEKLY DIVIDEND PATTERN ANALYSIS")
    print("=" * 60)
    
    # Clean the data
    hist_data_clean = hist_data.copy()
    hist_data_clean.index = pd.to_datetime(hist_data_clean.index.date)
    
    # Find dividend payments
    dividends = hist_data_clean[hist_data_clean['Dividends'] > 0]
    
    if dividends.empty:
        print("No dividend payments found")
        return None
    
    print(f"Found {len(dividends)} dividend payments")
    
    # Show dividend dates
    print("Dividend dates:")
    for date, row in dividends.iterrows():
        day_name = date.strftime('%A')
        print(f"  {date.strftime('%Y-%m-%d')} ({day_name}): ${row['Dividends']:.3f}")
    
    # Analyze each dividend week
    weekly_analysis = []
    
    for div_date, div_row in dividends.iterrows():
        div_date_clean = pd.to_datetime(div_date.date())
        
        # Find the trading days around the dividend date
        all_dates = hist_data_clean.index.tolist()
        
        try:
            div_position = all_dates.index(div_date_clean)
            
            # Check if we have enough data for dd+1 to dd+4
            if div_position + 4 >= len(all_dates):
                continue
            
            # Get the dates for dd, dd+1, dd+2, dd+3, dd+4
            dd_date = all_dates[div_position]
            dd1_date = all_dates[div_position + 1]
            dd2_date = all_dates[div_position + 2]
            dd3_date = all_dates[div_position + 3]
            dd4_date = all_dates[div_position + 4]
            
            # Get the closing prices
            dd_price = hist_data_clean.loc[dd_date, 'Close']
            dd1_price = hist_data_clean.loc[dd1_date, 'Close']
            dd2_price = hist_data_clean.loc[dd2_date, 'Close']
            dd3_price = hist_data_clean.loc[dd3_date, 'Close']
            dd4_price = hist_data_clean.loc[dd4_date, 'Close']
            
            # Calculate percent gains from dividend day
            dd_gain = 0.0
            dd1_gain = ((dd1_price - dd_price) / dd_price) * 100
            dd2_gain = ((dd2_price - dd_price) / dd_price) * 100
            dd3_gain = ((dd3_price - dd_price) / dd_price) * 100
            dd4_gain = ((dd4_price - dd_price) / dd_price) * 100
            
            week_data = {
                'dividend_date': div_date_clean,
                'dividend_amount': div_row['Dividends'],
                'dd_price': dd_price,
                'dd1_price': dd1_price,
                'dd2_price': dd2_price,
                'dd3_price': dd3_price,
                'dd4_price': dd4_price,
                'dd_gain': dd_gain,
                'dd1_gain': dd1_gain,
                'dd2_gain': dd2_gain,
                'dd3_gain': dd3_gain,
                'dd4_gain': dd4_gain
            }
            
            weekly_analysis.append(week_data)
            
        except (ValueError, KeyError):
            continue
    
    if not weekly_analysis:
        print("No complete weeks available for analysis")
        return None
    
    # Display individual week analysis
    print("\nIndividual Week Analysis:")
    print("-" * 80)
    
    for i, week in enumerate(weekly_analysis, 1):
        print(f"\nWeek {i}: Dividend Date {week['dividend_date'].strftime('%Y-%m-%d')} (${week['dividend_amount']:.3f})")
        print("Day    Date         Price    Gain%")
        print("-" * 40)
        print(f"dd   {week['dividend_date'].strftime('%Y-%m-%d')} $  {week['dd_price']:.3f}  {week['dd_gain']:+.2f}%")
        print(f"dd+1 {(week['dividend_date'] + pd.Timedelta(days=1)).strftime('%Y-%m-%d')} $  {week['dd1_price']:.3f}  {week['dd1_gain']:+.2f}%")
        print(f"dd+2 {(week['dividend_date'] + pd.Timedelta(days=2)).strftime('%Y-%m-%d')} $  {week['dd2_price']:.3f}  {week['dd2_gain']:+.2f}%")
        print(f"dd+3 {(week['dividend_date'] + pd.Timedelta(days=3)).strftime('%Y-%m-%d')} $  {week['dd3_price']:.3f}  {week['dd3_gain']:+.2f}%")
        print(f"dd+4 {(week['dividend_date'] + pd.Timedelta(days=4)).strftime('%Y-%m-%d')} $  {week['dd4_price']:.3f}  {week['dd4_gain']:+.2f}%")
    
    # Calculate average performance
    print("\n" + "="*60)
    print("AVERAGE PERFORMANCE ACROSS ALL DIVIDEND WEEKS")
    print("="*60)
    
    num_weeks = len(weekly_analysis)
    print(f"Number of complete weeks analyzed: {num_weeks}")
    
    # Calculate statistics for each day
    days = ['dd', 'dd+1', 'dd+2', 'dd+3', 'dd+4']
    gains = {
        'dd': [w['dd_gain'] for w in weekly_analysis],
        'dd+1': [w['dd1_gain'] for w in weekly_analysis],
        'dd+2': [w['dd2_gain'] for w in weekly_analysis],
        'dd+3': [w['dd3_gain'] for w in weekly_analysis],
        'dd+4': [w['dd4_gain'] for w in weekly_analysis]
    }
    
    print("Day     Avg Gain%   Median%   Min%     Max%     Std Dev%")
    print("-" * 60)
    
    for day in days:
        avg_gain = np.mean(gains[day])
        median_gain = np.median(gains[day])
        min_gain = np.min(gains[day])
        max_gain = np.max(gains[day])
        std_gain = np.std(gains[day])
        
        print(f"{day:7} {avg_gain:+8.2f}   {median_gain:+8.2f}   {min_gain:+8.2f}   {max_gain:+8.2f}   {std_gain:8.2f}")
    
    # Find best and worst performing days
    avg_gains = {day: np.mean(gains[day]) for day in days}
    sorted_days = sorted(avg_gains.items(), key=lambda x: float(x[1]), reverse=True)
    
    print(f"\nBEST PERFORMING DAYS (by average gain):")
    for i, (day, gain) in enumerate(sorted_days[:3]):
        print(f"{i+1}. {day}: {gain:+.2f}% average gain")
    
    print(f"\nWORST PERFORMING DAYS (by average gain):")
    for i, (day, gain) in enumerate(sorted_days[-3:]):
        print(f"{i+1}. {day}: {gain:+.2f}% average gain")
    
    # Save analysis to CSV
    save_weekly_analysis_to_csv(weekly_analysis, gains)
    
    return weekly_analysis

def save_weekly_analysis_to_csv(weekly_analysis, gains):
    """
    Save weekly analysis results to CSV files.
    """
    output_dir = "data"
    os.makedirs(output_dir, exist_ok=True)
    
    # Save detailed analysis
    detailed_data = []
    for week in weekly_analysis:
        day_labels = ['dd', 'dd+1', 'dd+2', 'dd+3', 'dd+4']
        prices = [week['dd_price'], week['dd1_price'], week['dd2_price'], week['dd3_price'], week['dd4_price']]
        gains_list = [week['dd_gain'], week['dd1_gain'], week['dd2_gain'], week['dd3_gain'], week['dd4_gain']]
        
        for day_label, price, gain in zip(day_labels, prices, gains_list):
            detailed_data.append({
                'dividend_date': week['dividend_date'],
                'dividend_amount': week['dividend_amount'],
                'trading_day': day_label,
                'price': price,
                'percent_gain_from_dd': gain
            })
    
    detailed_df = pd.DataFrame(detailed_data)
    detailed_file = os.path.join(output_dir, "ULTY_dividend_week_analysis.csv")
    detailed_df.to_csv(detailed_file, index=False)
    print(f"\nDetailed analysis saved to: {detailed_file}")
    
    # Save summary statistics
    summary_data = []
    for day in ['dd', 'dd+1', 'dd+2', 'dd+3', 'dd+4']:
        summary_data.append({
            'trading_day': day,
            'avg_gain_percent': np.mean(gains[day]),
            'median_gain_percent': np.median(gains[day]),
            'min_gain_percent': np.min(gains[day]),
            'max_gain_percent': np.max(gains[day]),
            'std_dev_percent': np.std(gains[day]),
            'sample_size': len(gains[day])
        })
    
    summary_df = pd.DataFrame(summary_data)
    summary_file = os.path.join(output_dir, "ULTY_dividend_week_summary.csv")
    summary_df.to_csv(summary_file, index=False)
    print(f"Summary statistics saved to: {summary_file}")

if __name__ == "__main__":
    # Test the weekly analysis module
    print("Testing Weekly Analysis Module...")
    
    # Would normally import from the data processor
    import sys
    sys.path.append('.')
    
    try:
        from multi_ticker_data_processor import download_ticker_data
        hist_data = download_ticker_data('ULTY')
        
        if hist_data is not None:
            print("\nTesting Weekly Dividend Pattern Analysis...")
            weekly_results = analyze_weekly_dividend_pattern(hist_data)
            
            if weekly_results:
                print(f"\nAnalyzed {len(weekly_results)} dividend weeks")
            else:
                print("No weekly analysis results")
    except ImportError:
        print("Could not import data processor - run as part of main script")
