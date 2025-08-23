#!/usr/bin/env python3
"""
Bitcoin Weekend vs Weekday Performance Analysis
Analyzes Bitcoin price patterns from Bitcoin ETF launch date (Jan 11, 2024) to present
"""

import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def fetch_bitcoin_data(api_key, start_date, end_date):
    """
    Fetch Bitcoin daily data from Polygon.io
    """
    url = f"https://api.polygon.io/v2/aggs/ticker/X:BTCUSD/range/1/day/{start_date}/{end_date}"
    params = {
        'adjusted': 'true',
        'sort': 'asc',
        'apiKey': api_key
    }
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    
    # Accept both 'OK' and 'DELAYED' as valid statuses
    if data['status'] not in ['OK', 'DELAYED']:
        print(f"API Status: {data['status']}")
        if 'message' in data:
            print(f"API Message: {data['message']}")
        raise Exception(f"API Error: {data}")
    
    if 'results' not in data:
        print("No results in API response")
        raise Exception(f"No results returned: {data}")
    
    print(f"Successfully fetched {len(data['results'])} data points (Status: {data['status']})")
    return data['results']

def analyze_weekend_weekday_patterns(df):
    """
    Analyze Bitcoin performance patterns between weekends and weekdays
    """
    # Add day of week (0=Monday, 6=Sunday)
    df['day_of_week'] = df['date'].dt.dayofweek
    df['is_weekend'] = df['day_of_week'].isin([5, 6])  # Saturday, Sunday
    
    # Calculate daily returns
    df['daily_return'] = (df['close'] - df['open']) / df['open'] * 100
    df['overnight_return'] = df['open'].pct_change() * 100  # Gap from prev close to open
    
    # Weekend periods (Friday close to Monday open)
    friday_closes = df[df['day_of_week'] == 4]['close'].values
    monday_opens = df[df['day_of_week'] == 0]['open'].values
    
    # Align arrays (Monday opens should follow Friday closes)
    min_len = min(len(friday_closes), len(monday_opens))
    if len(monday_opens) > 0 and len(friday_closes) > 0:
        # Check if we need to offset (first Monday might not have preceding Friday)
        friday_dates = df[df['day_of_week'] == 4]['date'].values[:min_len]
        monday_dates = df[df['day_of_week'] == 0]['date'].values[:min_len]
        
        weekend_returns = []
        weekend_periods = []
        
        for i in range(min_len):
            if i < len(friday_closes) and i < len(monday_opens):
                friday_close = friday_closes[i]
                monday_open = monday_opens[i]
                weekend_return = (monday_open - friday_close) / friday_close * 100
                weekend_returns.append(weekend_return)
                weekend_periods.append((friday_dates[i], monday_dates[i]))
    
    # Calculate statistics
    weekend_stats = {
        'weekend_returns': weekend_returns,
        'avg_weekend_return': np.mean(weekend_returns) if weekend_returns else 0,
        'weekend_win_rate': (np.array(weekend_returns) > 0).mean() * 100 if weekend_returns else 0,
        'weekend_count': len(weekend_returns)
    }
    
    # Weekday returns (Monday-Friday intraday)
    weekday_data = df[~df['is_weekend']]
    weekday_stats = {
        'avg_weekday_return': weekday_data['daily_return'].mean(),
        'weekday_win_rate': (weekday_data['daily_return'] > 0).mean() * 100,
        'weekday_count': len(weekday_data)
    }
    
    # Day-specific analysis
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    daily_stats = {}
    
    for day in range(7):
        day_data = df[df['day_of_week'] == day]
        if len(day_data) > 0:
            daily_stats[day_names[day]] = {
                'avg_return': day_data['daily_return'].mean(),
                'win_rate': (day_data['daily_return'] > 0).mean() * 100,
                'count': len(day_data),
                'avg_overnight_gap': day_data['overnight_return'].mean()
            }
    
    return weekend_stats, weekday_stats, daily_stats

def main():
    # Configuration
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        raise Exception("POLYGON_API_KEY not found in environment variables")
    
    # Bitcoin ETF launch date (first Bitcoin ETF approvals)
    start_date = "2024-01-11"
    end_date = datetime.now().strftime("%Y-%m-%d")
    
    print(f"Fetching Bitcoin data from {start_date} to {end_date}...")
    
    # Fetch data
    raw_data = fetch_bitcoin_data(api_key, start_date, end_date)
    
    # Convert to DataFrame
    df = pd.DataFrame(raw_data)
    df['date'] = pd.to_datetime(df['t'], unit='ms')
    df = df.rename(columns={'o': 'open', 'h': 'high', 'l': 'low', 'c': 'close', 'v': 'volume'})
    df = df.sort_values('date').reset_index(drop=True)
    
    print(f"Analyzing {len(df)} days of Bitcoin data...")
    
    # Analyze patterns
    weekend_stats, weekday_stats, daily_stats = analyze_weekend_weekday_patterns(df)
    
    # Print results
    print("\n" + "="*60)
    print("BITCOIN WEEKEND vs WEEKDAY ANALYSIS")
    print(f"Period: {start_date} to {end_date}")
    print("="*60)
    
    print(f"\n[WEEKEND] WEEKEND PERFORMANCE (Friday Close -> Monday Open)")
    print(f"Average Weekend Return: {weekend_stats['avg_weekend_return']:.2f}%")
    print(f"Weekend Win Rate: {weekend_stats['weekend_win_rate']:.1f}%")
    print(f"Total Weekends: {weekend_stats['weekend_count']}")
    
    print(f"\n[WEEKDAY] WEEKDAY PERFORMANCE (Intraday Mon-Fri)")
    print(f"Average Weekday Return: {weekday_stats['avg_weekday_return']:.2f}%")
    print(f"Weekday Win Rate: {weekday_stats['weekday_win_rate']:.1f}%")
    print(f"Total Weekdays: {weekday_stats['weekday_count']}")
    
    print(f"\n[DAILY] DAY-BY-DAY BREAKDOWN:")
    for day, stats in daily_stats.items():
        print(f"{day:>9}: Avg Return {stats['avg_return']:>6.2f}% | Win Rate {stats['win_rate']:>5.1f}% | Gap {stats['avg_overnight_gap']:>6.2f}% | Days {stats['count']:>3}")
    
    # Additional insights
    print(f"\n[INSIGHTS] KEY INSIGHTS:")
    weekend_vs_weekday = weekend_stats['avg_weekend_return'] - weekday_stats['avg_weekday_return']
    print(f"Weekend vs Weekday Difference: {weekend_vs_weekday:+.2f}%")
    
    if weekend_stats['avg_weekend_return'] > weekday_stats['avg_weekday_return']:
        print("[+] Weekends outperform weekdays on average")
    else:
        print("[-] Weekdays outperform weekends on average")
    
    # Recent trend (last 4 weeks)
    recent_data = df.tail(28)  # Last ~4 weeks
    recent_weekend_stats, recent_weekday_stats, _ = analyze_weekend_weekday_patterns(recent_data)
    
    print(f"\n[RECENT] RECENT TREND (Last 4 weeks):")
    print(f"Recent Weekend Avg: {recent_weekend_stats['avg_weekend_return']:+.2f}%")
    print(f"Recent Weekday Avg: {recent_weekday_stats['avg_weekday_return']:+.2f}%")
    
    # Save detailed data
    output_file = f"bitcoin_analysis_{datetime.now().strftime('%Y%m%d')}.csv"
    df.to_csv(output_file, index=False)
    print(f"\n[SAVE] Detailed data saved to: {output_file}")

if __name__ == "__main__":
    main()