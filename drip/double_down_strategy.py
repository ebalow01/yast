import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import calendar
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def find_last_monday(year, month):
    """Find the last Monday of a given month"""
    last_day = calendar.monthrange(year, month)[1]
    last_date = datetime(year, month, last_day)
    
    # Find the last Monday
    while last_date.weekday() != 0:  # 0 = Monday
        last_date -= timedelta(days=1)
    
    return last_date.date()

def find_first_monday(year, month):
    """Find the first Monday of a given month"""
    first_date = datetime(year, month, 1)
    
    # Find the first Monday
    while first_date.weekday() != 0:  # 0 = Monday
        first_date += timedelta(days=1)
    
    return first_date.date()

def find_thursday_after_monday(monday_date, daily_data_dict):
    """Find the Thursday after the given Monday"""
    # Thursday is 3 days after Monday
    target_thursday = monday_date + timedelta(days=3)
    
    # Look for trading day on or after target Thursday
    for i in range(7):  # Search up to a week
        check_date = target_thursday + timedelta(days=i)
        if check_date in daily_data_dict:
            day_data = daily_data_dict[check_date]
            if day_data['day_of_week'] == 'Thursday':
                return check_date
    
    return None

def backtest_double_down_strategy():
    """
    Backtest strategy:
    1. Buy $100k worth on last Monday of month
    2. If price is lower on Thursday, buy another $100k worth
    3. Sell everything on first Monday of next month
    """
    
    # Load the data
    df = pd.read_csv('drip_15min_data.csv')
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Filter for 2025 only
    df_2025 = df[df['timestamp'].dt.year == 2025].copy()
    
    # Add day of week and date
    df_2025['day_of_week'] = df_2025['timestamp'].dt.day_name()
    df_2025['date'] = df_2025['timestamp'].dt.date
    
    print("DRIP Double-Down Strategy: Last Monday + Thursday (if lower) → First Monday (2025)")
    print("=" * 95)
    print(f"Data range: {df_2025['timestamp'].min()} to {df_2025['timestamp'].max()}")
    print("Strategy: Buy $100k on last Monday, buy another $100k on Thursday if lower, sell all on first Monday")
    print()
    
    # Group by date to get daily data
    daily_data = df_2025.groupby('date').agg({
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        'volume': 'sum',
        'day_of_week': 'first'
    }).reset_index()
    
    # Create date lookup
    date_to_prices = {row['date']: row for _, row in daily_data.iterrows()}
    
    # Track trades
    trades = []
    initial_capital = 1000000  # Start with $1M to handle $100k positions
    capital = initial_capital
    
    for month in range(1, 9):  # January through August 2025
        # Find last Monday of this month
        last_monday = find_last_monday(2025, month)
        
        # Find first Monday of next month
        if month < 12:
            next_month = month + 1
            next_year = 2025
        else:
            next_month = 1
            next_year = 2026
        
        if next_year == 2025 or (next_year == 2026 and next_month == 1):
            first_monday = find_first_monday(next_year, next_month)
            
            # Find actual trading days
            buy_found = False
            sell_found = False
            thursday_found = False
            
            # Find actual last Monday trading day
            for i in range(14):
                check_date = last_monday - timedelta(days=i)
                if check_date in date_to_prices and date_to_prices[check_date]['day_of_week'] == 'Monday':
                    actual_buy_date = check_date
                    buy_data = date_to_prices[actual_buy_date]
                    buy_found = True
                    break
            
            # Find actual first Monday trading day (next month)
            for i in range(14):
                check_date = first_monday + timedelta(days=i)
                if check_date in date_to_prices and date_to_prices[check_date]['day_of_week'] == 'Monday':
                    actual_sell_date = check_date
                    sell_data = date_to_prices[actual_sell_date]
                    sell_found = True
                    break
            
            if buy_found and sell_found:
                # Find Thursday after the buy Monday
                thursday_date = find_thursday_after_monday(actual_buy_date, date_to_prices)
                thursday_data = None
                if thursday_date and thursday_date in date_to_prices:
                    thursday_data = date_to_prices[thursday_date]
                    thursday_found = True
                
                # Execute the strategy
                buy_price_monday = buy_data['close']
                sell_price_monday = sell_data['open']
                
                # Initial position: $100k worth of shares
                position_size_1 = 100000 / buy_price_monday
                total_shares = position_size_1
                total_cost = 100000
                
                double_down = False
                thursday_buy_price = 0
                position_size_2 = 0
                
                # Check if we should double down on Thursday
                if thursday_found and thursday_data is not None:
                    thursday_buy_price = thursday_data['close']
                    if thursday_buy_price < buy_price_monday:
                        # Double down: buy another $100k worth
                        position_size_2 = 100000 / thursday_buy_price
                        total_shares += position_size_2
                        total_cost += 100000
                        double_down = True
                
                # Calculate returns
                total_proceeds = total_shares * sell_price_monday
                total_return_dollar = total_proceeds - total_cost
                total_return_pct = (total_return_dollar / total_cost) * 100
                
                # Average cost basis
                avg_cost = total_cost / total_shares
                
                trades.append({
                    'month': calendar.month_name[month],
                    'buy_date': actual_buy_date,
                    'buy_price': buy_price_monday,
                    'thursday_date': thursday_date if thursday_found else None,
                    'thursday_price': thursday_buy_price if thursday_found else None,
                    'double_down': double_down,
                    'sell_date': actual_sell_date,
                    'sell_price': sell_price_monday,
                    'shares_bought_monday': position_size_1,
                    'shares_bought_thursday': position_size_2,
                    'total_shares': total_shares,
                    'total_cost': total_cost,
                    'avg_cost': avg_cost,
                    'total_proceeds': total_proceeds,
                    'return_dollar': total_return_dollar,
                    'return_pct': total_return_pct,
                    'days_held': (actual_sell_date - actual_buy_date).days
                })
                
                # Update capital (assume we reinvest gains)
                capital = capital + total_return_dollar
            
            else:
                print(f"⚠️ Could not find trading days for {calendar.month_name[month]}")
    
    # Convert to DataFrame
    trades_df = pd.DataFrame(trades)
    
    if len(trades_df) == 0:
        print("No trades found for 2025")
        return
    
    # Print detailed trade log
    print("📊 DETAILED TRADE LOG:")
    print("-" * 130)
    print(f"{'Month':<9} {'Mon Buy':<10} {'Mon $':<8} {'Thu Date':<10} {'Thu $':<8} {'Dbl?':<4} {'Sell Date':<10} {'Sell $':<8} {'Tot Cost':<9} {'Avg Cost':<8} {'Return':<10}")
    print("-" * 130)
    
    for _, trade in trades_df.iterrows():
        thu_date = str(trade['thursday_date'])[:10] if trade['thursday_date'] else "N/A"
        thu_price = f"${trade['thursday_price']:.2f}" if trade['thursday_price'] else "N/A"
        double_indicator = "YES" if trade['double_down'] else "NO"
        
        print(f"{trade['month'][:8]:<9} {str(trade['buy_date']):<10} ${trade['buy_price']:7.2f} {thu_date:<10} {thu_price:<8} {double_indicator:<4} "
              f"{str(trade['sell_date']):<10} ${trade['sell_price']:7.2f} ${trade['total_cost']:8.0f} ${trade['avg_cost']:7.2f} {trade['return_pct']:9.2f}%")
    
    print("-" * 130)
    
    # Summary statistics
    double_down_trades = trades_df[trades_df['double_down'] == True]
    single_trades = trades_df[trades_df['double_down'] == False]
    
    print("\n📈 PERFORMANCE SUMMARY:")
    print("-" * 50)
    print(f"Total trades: {len(trades_df)}")
    print(f"Double-down trades: {len(double_down_trades)} ({len(double_down_trades)/len(trades_df)*100:.1f}%)")
    print(f"Single-entry trades: {len(single_trades)} ({len(single_trades)/len(trades_df)*100:.1f}%)")
    
    winning_trades = trades_df[trades_df['return_pct'] > 0]
    losing_trades = trades_df[trades_df['return_pct'] < 0]
    
    print(f"\nWinning trades: {len(winning_trades)} ({len(winning_trades)/len(trades_df)*100:.1f}%)")
    print(f"Losing trades: {len(losing_trades)} ({len(losing_trades)/len(trades_df)*100:.1f}%)")
    
    print(f"\nAverage return per trade: {trades_df['return_pct'].mean():.2f}%")
    print(f"Best trade: {trades_df['return_pct'].max():.2f}%")
    print(f"Worst trade: {trades_df['return_pct'].min():.2f}%")
    
    # Performance of double-down vs single trades
    if len(double_down_trades) > 0:
        print(f"\nDouble-down trade performance:")
        print(f"  Average return: {double_down_trades['return_pct'].mean():.2f}%")
        print(f"  Win rate: {len(double_down_trades[double_down_trades['return_pct'] > 0])/len(double_down_trades)*100:.1f}%")
    
    if len(single_trades) > 0:
        print(f"\nSingle-entry trade performance:")
        print(f"  Average return: {single_trades['return_pct'].mean():.2f}%")
        print(f"  Win rate: {len(single_trades[single_trades['return_pct'] > 0])/len(single_trades)*100:.1f}%")
    
    # Total dollar returns
    total_dollar_return = trades_df['return_dollar'].sum()
    
    print(f"\n💰 CAPITAL PERFORMANCE:")
    print("-" * 40)
    print(f"Total dollar return: ${total_dollar_return:,.2f}")
    print(f"Average per trade: ${total_dollar_return/len(trades_df):,.2f}")
    print(f"Total percentage return: {(total_dollar_return/(len(trades_df)*100000))*100:.2f}%")
    
    # Compare with simple Monday-to-Monday
    try:
        simple_df = pd.read_csv('monday_to_monday_trades_2025.csv')
        simple_total_return_pct = ((simple_df['capital'].iloc[-1] - 10000) / 10000) * 100
        
        # Scale up the comparison (simple strategy return on $200k average position)
        avg_position = trades_df['total_cost'].mean()
        scaled_simple_return = (simple_total_return_pct / 100) * avg_position
        
        print(f"\n📊 STRATEGY COMPARISON:")
        print("-" * 50)
        print(f"Double-down strategy return: ${total_dollar_return:,.2f}")
        print(f"Simple Monday-Monday (scaled): ${scaled_simple_return:,.2f}")
        print(f"Difference: ${total_dollar_return - scaled_simple_return:,.2f}")
        
    except:
        print("\n📊 Could not load simple Monday-Monday results for comparison")
    
    # Risk analysis
    if len(trades_df) > 0:
        print(f"\n⚠️ RISK METRICS:")
        print("-" * 40)
        sharpe_ratio = trades_df['return_pct'].mean() / trades_df['return_pct'].std() if trades_df['return_pct'].std() > 0 else 0
        print(f"Sharpe Ratio: {sharpe_ratio:.2f}")
        print(f"Max single trade loss: {trades_df['return_pct'].min():.2f}%")
        print(f"Standard deviation: {trades_df['return_pct'].std():.2f}%")
        print(f"Average investment per trade: ${trades_df['total_cost'].mean():,.0f}")
        print(f"Maximum investment: ${trades_df['total_cost'].max():,.0f}")
    
    # Save results
    trades_df.to_csv('double_down_strategy_2025.csv', index=False)
    print(f"\n✅ Detailed results saved to 'double_down_strategy_2025.csv'")
    
    return trades_df

if __name__ == "__main__":
    backtest_double_down_strategy()