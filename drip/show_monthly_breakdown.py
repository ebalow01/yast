import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import sys
import calendar
import pickle

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

def calculate_rsi(prices, period=14):
    """Calculate RSI using Wilder's smoothing method"""
    if len(prices) < period + 1:
        return [np.nan] * len(prices)
    
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])
    
    rsi_values = [np.nan] * (period)
    
    if avg_loss == 0:
        rsi_values.append(100)
    else:
        rs = avg_gain / avg_loss
        rsi_values.append(100 - (100 / (1 + rs)))
    
    for i in range(period + 1, len(prices)):
        gain = max(prices[i] - prices[i-1], 0)
        loss = max(prices[i-1] - prices[i], 0)
        
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        
        if avg_loss == 0:
            rsi_values.append(100)
        else:
            rs = avg_gain / avg_loss
            rsi_values.append(100 - (100 / (1 + rs)))
    
    return rsi_values

def get_nth_monday_of_month(year, month, n):
    """Get the nth Monday of a given month"""
    first_day = datetime(year, month, 1)
    first_monday = first_day + timedelta(days=(7 - first_day.weekday()) % 7)
    nth_monday = first_monday + timedelta(weeks=n-1)
    if nth_monday.month != month:
        return None
    return nth_monday

def get_last_monday_of_month(year, month):
    """Get the last Monday of a given month"""
    mondays = []
    for n in range(1, 6):
        monday = get_nth_monday_of_month(year, month, n)
        if monday:
            mondays.append(monday)
    return mondays[-1] if mondays else None

def get_thursday_of_week(monday_date):
    """Get Thursday of the same week as Monday"""
    return monday_date + timedelta(days=3)

def load_cached_data(ticker):
    """Load cached ticker data if available"""
    cache_file = f"cache_{ticker}.pkl"
    try:
        if os.path.exists(cache_file):
            with open(cache_file, 'rb') as f:
                return pickle.load(f)
    except:
        pass
    return None

def get_monthly_trade_details(ticker, strategy_type, variant):
    """Get individual monthly trade results for a ticker"""
    
    # Load cached data
    df = load_cached_data(ticker)
    if df is None:
        return None
    
    # Define strategy parameters
    if strategy_type == "1st_to_2nd":
        buy_monday, sell_monday = 1, 2
    elif strategy_type == "2nd_to_3rd":
        buy_monday, sell_monday = 2, 3
    elif strategy_type == "3rd_to_4th":
        buy_monday, sell_monday = 3, 4
    elif strategy_type == "last_to_1st":
        buy_monday, sell_monday = "last", 1
    
    # Training months: March, April, May 2025
    train_months = [(2025, 3), (2025, 4), (2025, 5)]
    # Testing months: June, July, August 2025
    test_months = [(2025, 6), (2025, 7), (2025, 8)]
    
    def get_trade_for_month(year, month):
        try:
            # Get buy date
            if buy_monday == "last":
                buy_date_dt = get_last_monday_of_month(year, month)
            else:
                buy_date_dt = get_nth_monday_of_month(year, month, buy_monday)
            
            # Get sell date
            if sell_monday == 1:
                # Next month's first Monday
                next_month = month + 1 if month < 12 else 1
                next_year = year if month < 12 else year + 1
                sell_date_dt = get_nth_monday_of_month(next_year, next_month, 1)
            else:
                sell_date_dt = get_nth_monday_of_month(year, month, sell_monday)
            
            if buy_date_dt and sell_date_dt:
                buy_date = buy_date_dt.date()
                sell_date = sell_date_dt.date()
                thursday_date = get_thursday_of_week(buy_date_dt).date()
                
                # Find trading data
                buy_data = df[df['date'].dt.date >= buy_date].head(1)
                sell_data = df[df['date'].dt.date >= sell_date].head(1)
                thursday_data = df[df['date'].dt.date >= thursday_date].head(1)
                
                if len(buy_data) > 0 and len(sell_data) > 0:
                    buy_row = buy_data.iloc[0]
                    sell_row = sell_data.iloc[0]
                    
                    buy_price = buy_row['close']
                    sell_price = sell_row['close']
                    buy_rsi = buy_row['rsi']
                    
                    # Calculate return based on variant
                    if variant == 'basic':
                        return_pct = ((sell_price - buy_price) / buy_price) * 100
                    elif variant == 'rsi_filter':
                        if pd.notna(buy_rsi) and buy_rsi <= 70:
                            return_pct = ((sell_price - buy_price) / buy_price) * 100
                        else:
                            return None  # Skip trade
                    elif variant == 'double_down':
                        if len(thursday_data) > 0:
                            thursday_row = thursday_data.iloc[0]
                            thursday_price = thursday_row['close']
                            thursday_return = ((thursday_price - buy_price) / buy_price) * 100
                            
                            if thursday_return <= -5:  # Double down
                                avg_buy_price = (buy_price + thursday_price) / 2
                                return_pct = ((sell_price - avg_buy_price) / avg_buy_price) * 100
                            else:
                                return_pct = ((sell_price - buy_price) / buy_price) * 100
                        else:
                            return_pct = ((sell_price - buy_price) / buy_price) * 100
                    elif variant == 'stop_loss':
                        if len(thursday_data) > 0:
                            thursday_row = thursday_data.iloc[0]
                            thursday_price = thursday_row['close']
                            thursday_return = ((thursday_price - buy_price) / buy_price) * 100
                            
                            if thursday_return <= -10:  # Stop loss
                                return_pct = thursday_return
                            else:
                                return_pct = ((sell_price - buy_price) / buy_price) * 100
                        else:
                            return_pct = ((sell_price - buy_price) / buy_price) * 100
                    
                    return return_pct
        except:
            pass
        
        return None
    
    # Get monthly results
    monthly_results = {}
    
    # Training months
    for year, month in train_months:
        result = get_trade_for_month(year, month)
        monthly_results[f"{calendar.month_name[month][:3]}"] = result
    
    # Testing months  
    for year, month in test_months:
        result = get_trade_for_month(year, month)
        monthly_results[f"{calendar.month_name[month][:3]}"] = result
    
    return monthly_results

def show_monthly_breakdown():
    """Show top 2 performers with monthly breakdown"""
    
    # Load the detailed analysis to get top performers
    df = pd.read_csv('enhanced_analysis_20250903_0820.csv')
    
    print("🏆 TOP 2 PERFORMERS WITH MONTHLY BREAKDOWN:")
    print("=" * 140)
    
    strategies = ['1st_to_2nd', '2nd_to_3rd', '3rd_to_4th', 'last_to_1st']
    strategy_names = {
        '1st_to_2nd': '1ST→2ND',
        '2nd_to_3rd': '2ND→3RD', 
        '3rd_to_4th': '3RD→4TH',
        'last_to_1st': 'LAST→1ST'
    }
    
    variants = ['basic', 'rsi_filter', 'double_down', 'stop_loss']
    variant_names = {
        'basic': 'Basic',
        'rsi_filter': 'RSI≤70',
        'double_down': 'DblDown',
        'stop_loss': 'StopLoss'
    }
    
    for strategy in strategies:
        print(f"\n🎯 {strategy_names[strategy]}:")
        print("-" * 140)
        print(f"{'Rank':<6} {'Variant':<10} {'Ticker':<8} {'Price':<8} "
              f"{'Mar':<8} {'Apr':<8} {'May':<8} {'Jun':<8} {'Jul':<8} {'Aug':<8}")
        print("-" * 140)
        
        # Collect all performers for this strategy
        strategy_performers = []
        
        for variant in variants:
            test_return_col = f'{strategy}_{variant}_testing_return'
            
            if test_return_col in df.columns:
                variant_data = df[df[test_return_col].notna()].copy()
                
                for idx, row in variant_data.iterrows():
                    strategy_performers.append({
                        'ticker': row['ticker'],
                        'variant': variant,
                        'testing_return': row[test_return_col],
                        'current_price': row['current_price']
                    })
        
        if strategy_performers:
            # Sort by testing return and get top 2
            strategy_performers.sort(key=lambda x: x['testing_return'], reverse=True)
            top_2 = strategy_performers[:2]
            
            for i, perf in enumerate(top_2, 1):
                # Get monthly breakdown
                monthly_results = get_monthly_trade_details(
                    perf['ticker'], strategy, perf['variant']
                )
                
                if monthly_results:
                    rank_prefix = f"#{i}"
                    
                    # Format monthly results
                    mar = f"{monthly_results.get('Mar', 0):+6.1f}%" if monthly_results.get('Mar') is not None else "  --  "
                    apr = f"{monthly_results.get('Apr', 0):+6.1f}%" if monthly_results.get('Apr') is not None else "  --  "
                    may = f"{monthly_results.get('May', 0):+6.1f}%" if monthly_results.get('May') is not None else "  --  "
                    jun = f"{monthly_results.get('Jun', 0):+6.1f}%" if monthly_results.get('Jun') is not None else "  --  "
                    jul = f"{monthly_results.get('Jul', 0):+6.1f}%" if monthly_results.get('Jul') is not None else "  --  "
                    aug = f"{monthly_results.get('Aug', 0):+6.1f}%" if monthly_results.get('Aug') is not None else "  --  "
                    
                    print(f"{rank_prefix:<6} {variant_names[perf['variant']]:<10} {perf['ticker']:<8} "
                          f"${perf['current_price']:<7.2f} {mar:<8} {apr:<8} {may:<8} {jun:<8} {jul:<8} {aug:<8}")
                else:
                    print(f"#{i:<5} {variant_names[perf['variant']]:<10} {perf['ticker']:<8} "
                          f"${perf['current_price']:<7.2f} [No cached data available]")
        
        print()  # Space between strategies

if __name__ == "__main__":
    show_monthly_breakdown()