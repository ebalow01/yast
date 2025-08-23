#!/usr/bin/env python3
"""
Bitcoin Weekend Gap vs Market Week Performance Analysis
Compares Bitcoin performance during:
- Weekend Gaps: Friday 4PM ET close -> Monday 9:30AM ET open (market closed)
- Market Weeks: Monday 9:30AM ET open -> Friday 4PM ET close (market open)

Analyzes data from Bitcoin ETF launch date (Jan 11, 2024) to present
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
    Analyze Bitcoin performance: Weekend Gaps vs Market Week Performance
    Weekend Gap: Friday 4PM close -> Monday 9:30AM open
    Market Week: Monday 9:30AM open -> Friday 4PM close
    """
    # Make a copy to avoid SettingWithCopyWarning
    df = df.copy()
    
    # Add day of week (0=Monday, 6=Sunday)
    df.loc[:, 'day_of_week'] = df['date'].dt.dayofweek
    
    # WEEKEND GAPS: Friday Close -> Monday Open (market closed period)
    friday_data = df[df['day_of_week'] == 4].copy()  # Friday
    monday_data = df[df['day_of_week'] == 0].copy()  # Monday
    
    weekend_returns = []
    weekend_periods = []
    
    # Match Fridays to following Mondays
    for _, friday_row in friday_data.iterrows():
        friday_date = friday_row['date']
        friday_close = friday_row['close']
        
        # Find the next Monday after this Friday
        next_monday = monday_data[monday_data['date'] > friday_date]
        if not next_monday.empty:
            next_monday_row = next_monday.iloc[0]
            monday_open = next_monday_row['open']
            monday_date = next_monday_row['date']
            
            # Calculate weekend gap return (Friday close to Monday open)
            weekend_return = (monday_open - friday_close) / friday_close * 100
            weekend_returns.append(weekend_return)
            weekend_periods.append((friday_date, monday_date))
    
    # MARKET WEEK PERFORMANCE: Monday Open -> Friday Close (market open period)
    market_week_returns = []
    market_week_periods = []
    
    # Match Mondays to following Fridays
    for _, monday_row in monday_data.iterrows():
        monday_date = monday_row['date']
        monday_open = monday_row['open']
        
        # Find the next Friday after this Monday
        next_friday = friday_data[friday_data['date'] > monday_date]
        if not next_friday.empty:
            next_friday_row = next_friday.iloc[0]
            friday_close = next_friday_row['close']
            friday_date = next_friday_row['date']
            
            # Calculate market week return (Monday open to Friday close)
            market_week_return = (friday_close - monday_open) / monday_open * 100
            market_week_returns.append(market_week_return)
            market_week_periods.append((monday_date, friday_date))
    
    # Calculate weekend gap statistics
    weekend_stats = {
        'weekend_returns': weekend_returns,
        'avg_weekend_return': np.mean(weekend_returns) if weekend_returns else 0,
        'weekend_win_rate': (np.array(weekend_returns) > 0).mean() * 100 if weekend_returns else 0,
        'weekend_count': len(weekend_returns),
        'weekend_volatility': np.std(weekend_returns) if weekend_returns else 0
    }
    
    # Calculate market week statistics
    market_week_stats = {
        'market_week_returns': market_week_returns,
        'avg_market_week_return': np.mean(market_week_returns) if market_week_returns else 0,
        'market_week_win_rate': (np.array(market_week_returns) > 0).mean() * 100 if market_week_returns else 0,
        'market_week_count': len(market_week_returns),
        'market_week_volatility': np.std(market_week_returns) if market_week_returns else 0
    }
    
    # Day-specific intraday analysis (for reference)
    df.loc[:, 'daily_return'] = (df['close'] - df['open']) / df['open'] * 100
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    daily_stats = {}
    
    for day in range(7):
        day_data = df[df['day_of_week'] == day]
        if len(day_data) > 0:
            daily_stats[day_names[day]] = {
                'avg_return': day_data['daily_return'].mean(),
                'win_rate': (day_data['daily_return'] > 0).mean() * 100,
                'count': len(day_data)
            }
    
    return weekend_stats, market_week_stats, daily_stats

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
    weekend_stats, market_week_stats, daily_stats = analyze_weekend_weekday_patterns(df)
    
    # Print results
    print("\n" + "="*70)
    print("BITCOIN MARKET GAPS vs MARKET WEEK ANALYSIS")
    print(f"Period: {start_date} to {end_date}")
    print("="*70)
    
    print(f"\n[WEEKEND GAP] FRIDAY 4PM CLOSE -> MONDAY 9:30AM OPEN (Market Closed)")
    print(f"Average Weekend Gap Return: {weekend_stats['avg_weekend_return']:+.2f}%")
    print(f"Weekend Gap Win Rate: {weekend_stats['weekend_win_rate']:.1f}%")
    print(f"Weekend Gap Volatility: {weekend_stats['weekend_volatility']:.2f}%")
    print(f"Total Weekend Periods: {weekend_stats['weekend_count']}")
    
    print(f"\n[MARKET WEEK] MONDAY 9:30AM OPEN -> FRIDAY 4PM CLOSE (Market Open)")
    print(f"Average Market Week Return: {market_week_stats['avg_market_week_return']:+.2f}%")
    print(f"Market Week Win Rate: {market_week_stats['market_week_win_rate']:.1f}%")
    print(f"Market Week Volatility: {market_week_stats['market_week_volatility']:.2f}%")
    print(f"Total Market Weeks: {market_week_stats['market_week_count']}")
    
    print(f"\n[DAILY] INDIVIDUAL DAY PERFORMANCE (for reference):")
    for day, stats in daily_stats.items():
        print(f"{day:>9}: Avg Return {stats['avg_return']:>6.2f}% | Win Rate {stats['win_rate']:>5.1f}% | Days {stats['count']:>3}")
    
    # Additional insights
    print(f"\n[INSIGHTS] KEY INSIGHTS:")
    gap_vs_week = weekend_stats['avg_weekend_return'] - market_week_stats['avg_market_week_return']
    print(f"Weekend Gap vs Market Week Difference: {gap_vs_week:+.2f}%")
    
    # Risk-adjusted comparison (Return / Volatility)
    weekend_risk_adj = weekend_stats['avg_weekend_return'] / weekend_stats['weekend_volatility'] if weekend_stats['weekend_volatility'] > 0 else 0
    market_week_risk_adj = market_week_stats['avg_market_week_return'] / market_week_stats['market_week_volatility'] if market_week_stats['market_week_volatility'] > 0 else 0
    
    print(f"Weekend Gap Risk-Adjusted Return: {weekend_risk_adj:.3f}")
    print(f"Market Week Risk-Adjusted Return: {market_week_risk_adj:.3f}")
    
    if weekend_stats['avg_weekend_return'] > market_week_stats['avg_market_week_return']:
        print("[+] Weekend gaps outperform market weeks on average")
        print("    -> Bitcoin tends to gap higher over weekends")
    else:
        print("[-] Market weeks outperform weekend gaps on average") 
        print("    -> Bitcoin performs better during market hours")
    
    # Recent trend (last 4 weeks)
    recent_data = df.tail(28)  # Last ~4 weeks
    recent_weekend_stats, recent_market_week_stats, _ = analyze_weekend_weekday_patterns(recent_data)
    
    print(f"\n[RECENT] RECENT TREND (Last 4 weeks):")
    print(f"Recent Weekend Gap Avg: {recent_weekend_stats['avg_weekend_return']:+.2f}%")
    print(f"Recent Market Week Avg: {recent_market_week_stats['avg_market_week_return']:+.2f}%")
    
    # Save detailed data
    output_file = f"bitcoin_analysis_{datetime.now().strftime('%Y%m%d')}.csv"
    df.to_csv(output_file, index=False)
    print(f"\n[SAVE] Detailed data saved to: {output_file}")

if __name__ == "__main__":
    main()