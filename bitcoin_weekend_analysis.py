#!/usr/bin/env python3
"""
Bitcoin ALL-DAY COMBINATION Trading Analysis
Tests all 49 possible buy/sell day combinations at noon ET to find optimal patterns.

Analyzes every possible combination:
- Buy on any day of the week (Monday-Sunday) 
- Sell on any day of the week (Monday-Sunday)
- Uses noon ET prices (approximated from daily high/low midpoint)

Finds best strategies by:
- Highest average return
- Highest win rate  
- Best risk-adjusted return
- Lowest volatility

Data from Bitcoin ETF launch date (Jan 11, 2024) to present
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

def analyze_weekly_month_patterns(df):
    """
    Analyze which week of the month performs best for Bitcoin
    Tests holding Bitcoin for exactly one week in each of the 4 weeks of the month
    """
    df = df.copy()
    df.loc[:, 'day_of_week'] = df['date'].dt.dayofweek
    df.loc[:, 'noon_price'] = (df['high'] + df['low']) / 2  # Noon proxy
    
    # Add week of month (1, 2, 3, 4)
    def get_week_of_month(date):
        first_day = date.replace(day=1)
        first_monday = first_day + pd.Timedelta(days=(7 - first_day.weekday()) % 7)
        if first_day.weekday() == 0:  # If first day is Monday
            first_monday = first_day
        
        days_diff = (date - first_monday).days
        week_num = (days_diff // 7) + 1
        return max(1, min(4, week_num))  # Keep within 1-4 range
    
    df.loc[:, 'week_of_month'] = df['date'].apply(get_week_of_month)
    
    # Results for each week of the month
    weekly_results = {}
    
    # Test each week of the month (1-4)
    for week_num in range(1, 5):
        week_name = f"Week {week_num}"
        
        # Get all Mondays in this week of the month
        week_mondays = df[(df['day_of_week'] == 0) & (df['week_of_month'] == week_num)].copy()
        
        returns = []
        trade_periods = []
        trade_details = []
        
        for _, monday_row in week_mondays.iterrows():
            buy_date = monday_row['date']
            buy_price = monday_row['noon_price']
            
            # Find the next Monday (exactly 7 days later)
            next_monday_date = buy_date + pd.Timedelta(days=7)
            next_monday = df[(df['date'] == next_monday_date) & (df['day_of_week'] == 0)]
            
            if not next_monday.empty:
                sell_row = next_monday.iloc[0]
                sell_price = sell_row['noon_price']
                
                # Calculate weekly return
                weekly_return = (sell_price - buy_price) / buy_price * 100
                returns.append(weekly_return)
                trade_periods.append((buy_date, next_monday_date))
                
                # Store detailed trade info
                trade_details.append({
                    'buy_date': buy_date.strftime('%Y-%m-%d'),
                    'sell_date': next_monday_date.strftime('%Y-%m-%d'),
                    'buy_price': buy_price,
                    'sell_price': sell_price,
                    'return_pct': weekly_return,
                    'month': buy_date.strftime('%B %Y')
                })
        
        # Store results
        if returns:
            weekly_results[week_name] = {
                'week_number': week_num,
                'avg_return': np.mean(returns),
                'win_rate': (np.array(returns) > 0).mean() * 100,
                'volatility': np.std(returns),
                'total_trades': len(returns),
                'best_return': max(returns),
                'worst_return': min(returns),
                'risk_adjusted_return': np.mean(returns) / np.std(returns) if np.std(returns) > 0 else 0,
                'returns': returns,
                'trade_details': trade_details
            }
    
    return weekly_results

def analyze_calendar_days_1to7(df):
    """
    Analyze holding Bitcoin only during calendar days 1-7 of each month
    Compare this to the "Week 1" Monday-to-Monday strategy
    """
    df = df.copy()
    df.loc[:, 'noon_price'] = (df['high'] + df['low']) / 2  # Noon proxy
    df.loc[:, 'day_of_month'] = df['date'].dt.day
    
    # Get all days 1-7 of each month, find buy/sell pairs
    buy_sell_pairs = []
    
    # Group by year and month
    for (year, month), group in df.groupby([df['date'].dt.year, df['date'].dt.month]):
        # Get days 1-7 of this month
        month_days_1to7 = group[group['day_of_month'] <= 7].sort_values('date')
        
        if len(month_days_1to7) >= 2:
            # Buy on first available day (1-7), sell on last available day (1-7)
            buy_day = month_days_1to7.iloc[0]
            sell_day = month_days_1to7.iloc[-1]
            
            buy_date = buy_day['date']
            sell_date = sell_day['date']
            buy_price = buy_day['noon_price']
            sell_price = sell_day['noon_price']
            
            # Only include if we have at least 2 different days
            if buy_date != sell_date:
                days_held = (sell_date - buy_date).days
                return_pct = (sell_price - buy_price) / buy_price * 100
                
                buy_sell_pairs.append({
                    'buy_date': buy_date.strftime('%Y-%m-%d'),
                    'sell_date': sell_date.strftime('%Y-%m-%d'),
                    'buy_price': buy_price,
                    'sell_price': sell_price,
                    'return_pct': return_pct,
                    'days_held': days_held,
                    'month': buy_date.strftime('%B %Y')
                })
    
    # Calculate statistics
    if buy_sell_pairs:
        returns = [pair['return_pct'] for pair in buy_sell_pairs]
        calendar_days_results = {
            'strategy_name': 'Calendar Days 1-7',
            'avg_return': np.mean(returns),
            'win_rate': (np.array(returns) > 0).mean() * 100,
            'volatility': np.std(returns),
            'total_trades': len(returns),
            'best_return': max(returns),
            'worst_return': min(returns),
            'risk_adjusted_return': np.mean(returns) / np.std(returns) if np.std(returns) > 0 else 0,
            'avg_days_held': np.mean([pair['days_held'] for pair in buy_sell_pairs]),
            'returns': returns,
            'trade_details': buy_sell_pairs
        }
    else:
        calendar_days_results = {}
    
    return calendar_days_results

def analyze_rolling_4week_patterns(df):
    """
    Analyze rolling 4-week cycle patterns
    Tests which week in a rolling 4-week cycle performs best
    Week 1: Weeks 1, 5, 9, 13... (every 4th week starting from first Monday)
    Week 2: Weeks 2, 6, 10, 14... (every 4th week + 1)
    etc.
    """
    df = df.copy()
    df.loc[:, 'day_of_week'] = df['date'].dt.dayofweek
    df.loc[:, 'noon_price'] = (df['high'] + df['low']) / 2  # Noon proxy
    
    # Get all Mondays and assign rolling 4-week cycle numbers
    mondays = df[df['day_of_week'] == 0].copy().reset_index(drop=True)
    
    # Assign rolling week numbers (1, 2, 3, 4, 1, 2, 3, 4, ...)
    mondays.loc[:, 'rolling_week'] = [(i % 4) + 1 for i in range(len(mondays))]
    
    # Results for each week in the rolling cycle
    rolling_results = {}
    
    # Test each week of the rolling 4-week cycle
    for week_num in range(1, 5):
        week_name = f"Rolling Week {week_num}"
        
        # Get all Mondays in this rolling week
        week_mondays = mondays[mondays['rolling_week'] == week_num].copy()
        
        returns = []
        trade_periods = []
        
        for idx, monday_row in week_mondays.iterrows():
            buy_date = monday_row['date']
            buy_price = monday_row['noon_price']
            
            # Find the next Monday (exactly 7 days later)
            next_monday_date = buy_date + pd.Timedelta(days=7)
            next_monday = df[(df['date'] == next_monday_date) & (df['day_of_week'] == 0)]
            
            if not next_monday.empty:
                sell_row = next_monday.iloc[0]
                sell_price = sell_row['noon_price']
                
                # Calculate weekly return
                weekly_return = (sell_price - buy_price) / buy_price * 100
                returns.append(weekly_return)
                trade_periods.append((buy_date, next_monday_date))
        
        # Store results
        if returns:
            rolling_results[week_name] = {
                'week_number': week_num,
                'avg_return': np.mean(returns),
                'win_rate': (np.array(returns) > 0).mean() * 100,
                'volatility': np.std(returns),
                'total_trades': len(returns),
                'best_return': max(returns),
                'worst_return': min(returns),
                'risk_adjusted_return': np.mean(returns) / np.std(returns) if np.std(returns) > 0 else 0,
                'returns': returns
            }
    
    return rolling_results

def analyze_all_day_combinations(df):
    """
    Analyze ALL possible buy/sell day combinations at noon ET
    Tests all 7x7 = 49 combinations to find optimal trading patterns
    """
    df = df.copy()
    df.loc[:, 'day_of_week'] = df['date'].dt.dayofweek
    
    # For simplicity, use daily close prices as proxy for "noon" prices
    # (Real implementation would need intraday data for exact noon prices)
    df.loc[:, 'noon_price'] = (df['high'] + df['low']) / 2  # Midpoint as noon proxy
    
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    # Dictionary to store all combination results
    combination_results = {}
    
    # Test all 7x7 = 49 combinations
    for buy_day in range(7):
        for sell_day in range(7):
            buy_day_name = day_names[buy_day]
            sell_day_name = day_names[sell_day]
            combination_name = f"{buy_day_name} -> {sell_day_name}"
            
            returns = []
            trade_periods = []
            
            # Get all instances of the buy day
            buy_day_data = df[df['day_of_week'] == buy_day].copy()
            
            for _, buy_row in buy_day_data.iterrows():
                buy_date = buy_row['date']
                buy_price = buy_row['noon_price']
                
                # Find the next occurrence of the sell day after the buy day
                if buy_day == sell_day:
                    # Same day strategy (not very useful, but for completeness)
                    # Skip to next week's same day
                    next_sell_day = df[(df['day_of_week'] == sell_day) & 
                                     (df['date'] > buy_date + pd.Timedelta(days=1))]
                else:
                    # Different day strategy
                    if sell_day > buy_day:
                        # Sell day is later in the same week
                        next_sell_day = df[(df['day_of_week'] == sell_day) & 
                                         (df['date'] > buy_date) &
                                         (df['date'] <= buy_date + pd.Timedelta(days=(sell_day - buy_day)))]
                    else:
                        # Sell day is in the next week
                        next_sell_day = df[(df['day_of_week'] == sell_day) & 
                                         (df['date'] > buy_date)]
                
                if not next_sell_day.empty:
                    sell_row = next_sell_day.iloc[0]
                    sell_date = sell_row['date']
                    sell_price = sell_row['noon_price']
                    
                    # Calculate return
                    trade_return = (sell_price - buy_price) / buy_price * 100
                    returns.append(trade_return)
                    trade_periods.append((buy_date, sell_date))
            
            # Calculate statistics for this combination
            if returns:
                combination_results[combination_name] = {
                    'buy_day': buy_day_name,
                    'sell_day': sell_day_name,
                    'avg_return': np.mean(returns),
                    'win_rate': (np.array(returns) > 0).mean() * 100,
                    'volatility': np.std(returns),
                    'total_trades': len(returns),
                    'risk_adjusted_return': np.mean(returns) / np.std(returns) if np.std(returns) > 0 else 0,
                    'best_return': max(returns),
                    'worst_return': min(returns),
                    'returns': returns
                }
    
    return combination_results

def find_optimal_strategies(combination_results):
    """
    Find the best trading strategies based on different criteria
    """
    if not combination_results:
        return {}
    
    # Convert to list for sorting
    strategies = list(combination_results.items())
    
    # Find best strategies by different criteria
    best_by_return = max(strategies, key=lambda x: x[1]['avg_return'])
    best_by_win_rate = max(strategies, key=lambda x: x[1]['win_rate'])
    best_by_risk_adjusted = max(strategies, key=lambda x: x[1]['risk_adjusted_return'])
    
    # Find strategies with minimum volatility (among profitable ones)
    profitable_strategies = [s for s in strategies if s[1]['avg_return'] > 0]
    if profitable_strategies:
        lowest_risk = min(profitable_strategies, key=lambda x: x[1]['volatility'])
    else:
        lowest_risk = min(strategies, key=lambda x: x[1]['volatility'])
    
    return {
        'best_return': best_by_return,
        'best_win_rate': best_by_win_rate,
        'best_risk_adjusted': best_by_risk_adjusted,
        'lowest_risk': lowest_risk
    }

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
    print("Testing Week 1 strategy vs Calendar Days 1-7 strategy...")
    
    # Run focused analyses comparing different "first week" approaches
    weekly_month_results = analyze_weekly_month_patterns(df)
    calendar_days_results = analyze_calendar_days_1to7(df)
    
    # Skip the comprehensive analysis for this focused comparison
    combination_results = {}
    optimal_strategies = {}
    
    # Print results
    print("\n" + "="*80)
    print("BITCOIN COMPREHENSIVE TRADING ANALYSIS (Buy/Sell at Noon ET)")
    print(f"Period: {start_date} to {end_date}")
    print("="*80)
    
    # Print focused comparison of "first week" strategies
    print(f"\n[STRATEGY SHOWDOWN] First Monday vs Calendar Days 1-7")
    print("="*75)
    print("Testing two different 'first week' approaches:")
    print()
    
    # Week 1 (Monday-to-Monday) results
    if 'Week 1' in weekly_month_results:
        week1_stats = weekly_month_results['Week 1']
        print(f"STRATEGY A - 'FIRST MONDAY' (Monday to Monday):")
        print(f"   Strategy: Buy first Monday of each month, sell exactly 7 days later")
        print(f"   Average Return: {week1_stats['avg_return']:+.2f}% per trade")
        print(f"   Win Rate: {week1_stats['win_rate']:.1f}%")
        print(f"   Volatility: {week1_stats['volatility']:.2f}%")
        print(f"   Risk-Adjusted: {week1_stats['risk_adjusted_return']:.3f}")
        print(f"   Total Trades: {week1_stats['total_trades']}")
        print()
    
    # Calendar days 1-7 results
    if calendar_days_results:
        print(f"STRATEGY B - 'CALENDAR DAYS 1-7' (Days 1-7 of each month):")
        print(f"   Strategy: Buy first available day (1-7), sell last available day (1-7)")
        print(f"   Average Return: {calendar_days_results['avg_return']:+.2f}% per trade")
        print(f"   Win Rate: {calendar_days_results['win_rate']:.1f}%")
        print(f"   Volatility: {calendar_days_results['volatility']:.2f}%")
        print(f"   Risk-Adjusted: {calendar_days_results['risk_adjusted_return']:.3f}")
        print(f"   Total Trades: {calendar_days_results['total_trades']}")
        print(f"   Avg Days Held: {calendar_days_results['avg_days_held']:.1f} days")
        print()
        
        # Head-to-head comparison
        if 'Week 1' in weekly_month_results:
            week1_stats = weekly_month_results['Week 1']
            
            print(f"[HEAD-TO-HEAD COMPARISON]")
            print("="*50)
            print(f"First Monday Strategy: {week1_stats['avg_return']:+.2f}% avg return ({week1_stats['total_trades']} trades)")
            print(f"Calendar Days 1-7:    {calendar_days_results['avg_return']:+.2f}% avg return ({calendar_days_results['total_trades']} trades)")
            
            return_diff = week1_stats['avg_return'] - calendar_days_results['avg_return']
            if return_diff > 0:
                winner = "First Monday Strategy"
            else:
                winner = "Calendar Days 1-7 Strategy" 
                return_diff = abs(return_diff)
                
            print(f"\n[WINNER] {winner} wins by {return_diff:.2f}%!")
            
            # Calculate theoretical annual returns
            week1_annual = (1 + week1_stats['avg_return']/100) ** 12 - 1
            calendar_annual = (1 + calendar_days_results['avg_return']/100) ** 12 - 1
            
            print(f"\n[ANNUAL PROJECTIONS]")
            print(f"   First Monday Strategy: {week1_annual*100:+.1f}% annually (12 trades)")
            print(f"   Calendar Days 1-7:    {calendar_annual*100:+.1f}% annually (12 trades)")
            annual_diff = (week1_annual - calendar_annual) * 100
            print(f"   Advantage: {annual_diff:+.1f}% annually for the winner!")
    
    # Show detailed trade history for the best calendar strategy (Week 1)
    print(f"\n[DETAILED TRADE HISTORY] Week 1 Calendar Strategy Trades:")
    print("="*80)
    print("Every trade you would have made following the 'Week 1 only' strategy:")
    print()
    
    if 'Week 1' in weekly_month_results and 'trade_details' in weekly_month_results['Week 1']:
        trade_details = weekly_month_results['Week 1']['trade_details']
        
        print(f"{'#':>2} {'Month':>15} {'Buy Date':>12} {'Sell Date':>12} {'Buy $':>8} {'Sell $':>8} {'Return':>8}")
        print("-" * 80)
        
        total_return = 1.0
        wins = 0
        
        for i, trade in enumerate(trade_details, 1):
            return_str = f"{trade['return_pct']:+.1f}%"
            if trade['return_pct'] > 0:
                wins += 1
                
            print(f"{i:>2} {trade['month']:>15} {trade['buy_date']:>12} {trade['sell_date']:>12} "
                  f"${trade['buy_price']:>7.0f} ${trade['sell_price']:>7.0f} {return_str:>8}")
            
            # Calculate cumulative performance
            total_return *= (1 + trade['return_pct'] / 100)
        
        print("-" * 80)
        print(f"SUMMARY: {len(trade_details)} trades, {wins} winners ({wins/len(trade_details)*100:.1f}% win rate)")
        print(f"CUMULATIVE RETURN: {(total_return - 1) * 100:+.1f}% total gain")
        print(f"If you started with $10,000, you'd have ${10000 * total_return:,.0f}")
    
    # Show Calendar Days 1-7 trade history for comparison
    if calendar_days_results and 'trade_details' in calendar_days_results:
        print(f"\n[CALENDAR DAYS 1-7 TRADE HISTORY] For Comparison:")
        print("="*80)
        print("Every trade using the 'Calendar Days 1-7' strategy:")
        print()
        
        trade_details = calendar_days_results['trade_details']
        
        print(f"{'#':>2} {'Month':>15} {'Buy Date':>12} {'Sell Date':>12} {'Days':>5} {'Buy $':>8} {'Sell $':>8} {'Return':>8}")
        print("-" * 80)
        
        calendar_total_return = 1.0
        calendar_wins = 0
        
        for i, trade in enumerate(trade_details, 1):
            return_str = f"{trade['return_pct']:+.1f}%"
            if trade['return_pct'] > 0:
                calendar_wins += 1
                
            print(f"{i:>2} {trade['month']:>15} {trade['buy_date']:>12} {trade['sell_date']:>12} "
                  f"{trade['days_held']:>5} ${trade['buy_price']:>7.0f} ${trade['sell_price']:>7.0f} {return_str:>8}")
            
            # Calculate cumulative performance
            calendar_total_return *= (1 + trade['return_pct'] / 100)
        
        print("-" * 80)
        print(f"SUMMARY: {len(trade_details)} trades, {calendar_wins} winners ({calendar_wins/len(trade_details)*100:.1f}% win rate)")
        print(f"CUMULATIVE RETURN: {(calendar_total_return - 1) * 100:+.1f}% total gain")
        print(f"If you started with $10,000, you'd have ${10000 * calendar_total_return:,.0f}")
    
    # Compare with buy-and-hold performance
    print(f"\n[PERFORMANCE COMPARISON] Week 1 Strategy vs Buy & Hold:")
    print("="*80)
    
    # Calculate Bitcoin buy-and-hold performance
    first_date = df['date'].min()
    last_date = df['date'].max()
    # Use (high + low) / 2 as noon proxy
    first_price = (df.loc[df['date'] == first_date, 'high'].iloc[0] + df.loc[df['date'] == first_date, 'low'].iloc[0]) / 2
    last_price = (df.loc[df['date'] == last_date, 'high'].iloc[0] + df.loc[df['date'] == last_date, 'low'].iloc[0]) / 2
    
    bitcoin_bh_return = (last_price - first_price) / first_price * 100
    bitcoin_bh_final = 10000 * (1 + bitcoin_bh_return / 100)
    
    print(f"BITCOIN BUY & HOLD ({first_date.strftime('%Y-%m-%d')} to {last_date.strftime('%Y-%m-%d')}):")
    print(f"   Start Price: ${first_price:,.0f}")
    print(f"   End Price: ${last_price:,.0f}")  
    print(f"   Total Return: {bitcoin_bh_return:+.1f}%")
    print(f"   $10,000 becomes: ${bitcoin_bh_final:,.0f}")
    print()
    
    # Fetch SPY data for comparison (approximate using a simple calculation)
    # SPY typically returns ~10% annually, but let's be more precise for this period
    days_in_period = (last_date - first_date).days
    years_in_period = days_in_period / 365.25
    
    # Conservative estimate: SPY ~12% annual return during this period (bull market)
    spy_annual_return = 12  # percent
    spy_total_return = (1 + spy_annual_return/100) ** years_in_period - 1
    spy_bh_final = 10000 * (1 + spy_total_return)
    
    print(f"SPY BUY & HOLD (estimated {spy_annual_return}% annually for {years_in_period:.1f} years):")
    print(f"   Estimated Total Return: {spy_total_return*100:+.1f}%")
    print(f"   $10,000 becomes: ${spy_bh_final:,.0f}")
    print()
    
    # Week 1 strategy results
    week1_return = (total_return - 1) * 100
    week1_final = 10000 * total_return
    
    print(f"WEEK 1 STRATEGY (only ~25% market exposure):")
    print(f"   Total Return: {week1_return:+.1f}%") 
    print(f"   $10,000 becomes: ${week1_final:,.0f}")
    print()
    
    # Calculate risk-adjusted metrics
    print(f"RISK-ADJUSTED COMPARISON:")
    print(f"   Week 1 Strategy: {week1_return:+.1f}% with ~25% market exposure")
    print(f"   Bitcoin B&H: {bitcoin_bh_return:+.1f}% with 100% market exposure")
    print(f"   SPY B&H: {spy_total_return*100:+.1f}% with 100% market exposure")
    print()
    
    # Performance rankings
    strategies = [
        ("Week 1 Strategy", week1_return, week1_final),
        ("Bitcoin Buy & Hold", bitcoin_bh_return, bitcoin_bh_final), 
        ("SPY Buy & Hold", spy_total_return*100, spy_bh_final)
    ]
    strategies.sort(key=lambda x: x[1], reverse=True)
    
    print(f"PERFORMANCE RANKING:")
    for i, (name, return_pct, final_value) in enumerate(strategies, 1):
        print(f"   {i}. {name}: {return_pct:+.1f}% (${final_value:,.0f})")
    
    # Calculate efficiency (return per unit of market exposure)
    week1_efficiency = week1_return / 25  # 25% market exposure
    bitcoin_efficiency = bitcoin_bh_return / 100  # 100% market exposure  
    spy_efficiency = spy_total_return * 100 / 100  # 100% market exposure
    
    print(f"\nEFFICIENCY (Return per % of Market Exposure):")
    print(f"   Week 1 Strategy: {week1_efficiency:.2f}% return per 1% exposure")
    print(f"   Bitcoin B&H: {bitcoin_efficiency:.2f}% return per 1% exposure")
    print(f"   SPY B&H: {spy_efficiency:.2f}% return per 1% exposure")
    
    print(f"\n" + "="*80)
    
    # Print optimal strategies
    print(f"\n[OPTIMAL STRATEGIES]")
    print("="*50)
    
    if 'best_return' in optimal_strategies:
        strategy_name, stats = optimal_strategies['best_return']
        print(f"\n[WINNER] HIGHEST RETURN STRATEGY: {strategy_name}")
        print(f"   Average Return: {stats['avg_return']:+.2f}%")
        print(f"   Win Rate: {stats['win_rate']:.1f}%")
        print(f"   Volatility: {stats['volatility']:.2f}%")
        print(f"   Risk-Adjusted: {stats['risk_adjusted_return']:.3f}")
        print(f"   Total Trades: {stats['total_trades']}")
    
    if 'best_win_rate' in optimal_strategies:
        strategy_name, stats = optimal_strategies['best_win_rate']
        print(f"\n[TARGET] HIGHEST WIN RATE STRATEGY: {strategy_name}")
        print(f"   Win Rate: {stats['win_rate']:.1f}%")
        print(f"   Average Return: {stats['avg_return']:+.2f}%")
        print(f"   Volatility: {stats['volatility']:.2f}%")
        print(f"   Risk-Adjusted: {stats['risk_adjusted_return']:.3f}")
        print(f"   Total Trades: {stats['total_trades']}")
    
    if 'best_risk_adjusted' in optimal_strategies:
        strategy_name, stats = optimal_strategies['best_risk_adjusted']
        print(f"\n[BALANCE] BEST RISK-ADJUSTED STRATEGY: {strategy_name}")
        print(f"   Risk-Adjusted Return: {stats['risk_adjusted_return']:.3f}")
        print(f"   Average Return: {stats['avg_return']:+.2f}%")
        print(f"   Win Rate: {stats['win_rate']:.1f}%")
        print(f"   Volatility: {stats['volatility']:.2f}%")
        print(f"   Total Trades: {stats['total_trades']}")
    
    if 'lowest_risk' in optimal_strategies:
        strategy_name, stats = optimal_strategies['lowest_risk']
        print(f"\n[SAFE] LOWEST RISK STRATEGY: {strategy_name}")
        print(f"   Volatility: {stats['volatility']:.2f}%")
        print(f"   Average Return: {stats['avg_return']:+.2f}%")
        print(f"   Win Rate: {stats['win_rate']:.1f}%")
        print(f"   Risk-Adjusted: {stats['risk_adjusted_return']:.3f}")
        print(f"   Total Trades: {stats['total_trades']}")
    
    # Top 10 strategies by return
    print(f"\n[TOP 10 STRATEGIES BY RETURN]")
    print("="*50)
    sorted_strategies = sorted(combination_results.items(), key=lambda x: x[1]['avg_return'], reverse=True)
    
    for i, (strategy_name, stats) in enumerate(sorted_strategies[:10], 1):
        print(f"{i:2d}. {strategy_name:>20}: "
              f"Return {stats['avg_return']:+6.2f}% | "
              f"Win {stats['win_rate']:5.1f}% | "
              f"Vol {stats['volatility']:5.2f}% | "
              f"Trades {stats['total_trades']:3d}")
    
    # Worst 5 strategies (for context)
    print(f"\n[WORST 5 STRATEGIES BY RETURN]")
    print("="*50)
    for i, (strategy_name, stats) in enumerate(sorted_strategies[-5:], 1):
        print(f"{i:2d}. {strategy_name:>20}: "
              f"Return {stats['avg_return']:+6.2f}% | "
              f"Win {stats['win_rate']:5.1f}% | "
              f"Vol {stats['volatility']:5.2f}% | "
              f"Trades {stats['total_trades']:3d}")
    
    # Analysis summary
    print(f"\n[ANALYSIS SUMMARY]")
    print("="*50)
    positive_strategies = len([s for s in combination_results.values() if s['avg_return'] > 0])
    total_strategies = len(combination_results)
    
    print(f"Total Strategies Tested: {total_strategies}")
    print(f"Profitable Strategies: {positive_strategies}")
    print(f"Success Rate: {positive_strategies/total_strategies*100:.1f}%")
    
    # Find best same-week vs cross-week strategies
    same_week_strategies = {k: v for k, v in combination_results.items() 
                           if not (k.endswith('-> Monday') and not k.startswith('Monday'))}
    cross_week_strategies = {k: v for k, v in combination_results.items()
                           if k.endswith('-> Monday') and not k.startswith('Monday')}
    
    if same_week_strategies:
        best_same_week = max(same_week_strategies.items(), key=lambda x: x[1]['avg_return'])
        print(f"\nBest Same-Week Strategy: {best_same_week[0]} ({best_same_week[1]['avg_return']:+.2f}%)")
    
    if cross_week_strategies:
        best_cross_week = max(cross_week_strategies.items(), key=lambda x: x[1]['avg_return'])
        print(f"Best Cross-Week Strategy: {best_cross_week[0]} ({best_cross_week[1]['avg_return']:+.2f}%)")
    
    # Save detailed results
    results_df = pd.DataFrame.from_dict(combination_results, orient='index')
    results_df = results_df.drop('returns', axis=1)  # Remove raw returns for CSV
    results_file = f"bitcoin_day_combinations_{datetime.now().strftime('%Y%m%d')}.csv"
    results_df.to_csv(results_file)
    print(f"\n[SAVE] Detailed combination results saved to: {results_file}")
    
    # Save both weekly analyses
    weekly_df = pd.DataFrame.from_dict(weekly_month_results, orient='index')
    weekly_df = weekly_df.drop(['returns', 'trade_details'], axis=1, errors='ignore')  # Remove complex data for CSV
    weekly_file = f"bitcoin_calendar_weeks_{datetime.now().strftime('%Y%m%d')}.csv"
    weekly_df.to_csv(weekly_file)
    print(f"[SAVE] Calendar week analysis saved to: {weekly_file}")
    
    rolling_df = pd.DataFrame.from_dict(rolling_4week_results, orient='index')
    rolling_df = rolling_df.drop('returns', axis=1)  # Remove raw returns for CSV  
    rolling_file = f"bitcoin_rolling_4weeks_{datetime.now().strftime('%Y%m%d')}.csv"
    rolling_df.to_csv(rolling_file)
    print(f"[SAVE] Rolling 4-week analysis saved to: {rolling_file}")
    
    # Save detailed data
    output_file = f"bitcoin_analysis_{datetime.now().strftime('%Y%m%d')}.csv"
    df.to_csv(output_file, index=False)
    print(f"\n[SAVE] Detailed data saved to: {output_file}")

if __name__ == "__main__":
    main()