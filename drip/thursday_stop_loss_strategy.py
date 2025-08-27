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

def backtest_thursday_stop_loss_strategy():
    """
    Backtest strategy with Thursday stop-loss:
    1. Buy on last Monday of month
    2. If price is down on Thursday, sell on Thursday (stop-loss)
    3. Otherwise, sell on first Monday of next month as planned
    """
    
    # Load the data
    df = pd.read_csv('drip_15min_data.csv')
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Filter for 2025 only
    df_2025 = df[df['timestamp'].dt.year == 2025].copy()
    
    # Add day of week and date
    df_2025['day_of_week'] = df_2025['timestamp'].dt.day_name()
    df_2025['date'] = df_2025['timestamp'].dt.date
    
    print("DRIP Thursday Stop-Loss Strategy: Last Monday → Thursday (if down) OR First Monday (2025)")
    print("=" * 95)
    print(f"Data range: {df_2025['timestamp'].min()} to {df_2025['timestamp'].max()}")
    print("Strategy: Buy on last Monday, sell on Thursday if price is lower, otherwise sell on first Monday")
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
            normal_sell_found = False
            
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
                    actual_normal_sell_date = check_date
                    normal_sell_data = date_to_prices[actual_normal_sell_date]
                    normal_sell_found = True
                    break
            
            if buy_found and normal_sell_found:
                # Find Thursday after the buy Monday
                thursday_date = find_thursday_after_monday(actual_buy_date, date_to_prices)
                
                buy_price = buy_data['close']
                normal_sell_price = normal_sell_data['open']
                
                sold_on_thursday = False
                thursday_sell_price = 0
                actual_sell_date = actual_normal_sell_date
                actual_sell_price = normal_sell_price
                
                # Check if we should sell on Thursday (stop-loss)
                if thursday_date and thursday_date in date_to_prices:
                    thursday_data = date_to_prices[thursday_date]
                    thursday_price = thursday_data['close']
                    
                    if thursday_price < buy_price:
                        # Trigger stop-loss: sell on Thursday
                        sold_on_thursday = True
                        thursday_sell_price = thursday_price
                        actual_sell_date = thursday_date
                        actual_sell_price = thursday_sell_price
                
                # Calculate returns
                return_dollar = actual_sell_price - buy_price
                return_pct = (return_dollar / buy_price) * 100
                
                trades.append({
                    'month': calendar.month_name[month],
                    'buy_date': actual_buy_date,
                    'buy_price': buy_price,
                    'thursday_date': thursday_date,
                    'thursday_price': thursday_data['close'] if thursday_date and thursday_date in date_to_prices else None,
                    'sold_on_thursday': sold_on_thursday,
                    'actual_sell_date': actual_sell_date,
                    'actual_sell_price': actual_sell_price,
                    'normal_sell_date': actual_normal_sell_date,
                    'normal_sell_price': normal_sell_price,
                    'return_dollar': return_dollar,
                    'return_pct': return_pct,
                    'days_held': (actual_sell_date - actual_buy_date).days,
                    'stop_loss_triggered': sold_on_thursday
                })
            
            else:
                print(f"⚠️ Could not find trading days for {calendar.month_name[month]}")
    
    # Convert to DataFrame
    trades_df = pd.DataFrame(trades)
    
    if len(trades_df) == 0:
        print("No trades found for 2025")
        return
    
    # Calculate cumulative returns for comparison
    initial_capital = 10000
    capital = initial_capital
    trades_df['capital'] = 0.0
    
    for idx, trade in trades_df.iterrows():
        capital = capital * (1 + trade['return_pct'] / 100)
        trades_df.loc[idx, 'capital'] = capital
    
    # Print detailed trade log
    print("📊 DETAILED TRADE LOG:")
    print("-" * 120)
    print(f"{'Month':<9} {'Buy Date':<11} {'Buy $':<8} {'Thu Date':<11} {'Thu $':<8} {'Stop?':<5} {'Sell Date':<11} {'Sell $':<8} {'Return':<9} {'vs Normal':<10}")
    print("-" * 120)
    
    for _, trade in trades_df.iterrows():
        thu_date = str(trade['thursday_date'])[:10] if trade['thursday_date'] else "N/A"
        thu_price = f"${trade['thursday_price']:.2f}" if trade['thursday_price'] else "N/A"
        stop_indicator = "YES" if trade['stop_loss_triggered'] else "NO"
        
        # Calculate what would have happened with normal sell
        if trade['stop_loss_triggered']:
            normal_return = ((trade['normal_sell_price'] - trade['buy_price']) / trade['buy_price']) * 100
            vs_normal = trade['return_pct'] - normal_return
            vs_normal_str = f"{vs_normal:+8.2f}%"
        else:
            vs_normal_str = "Same"
        
        print(f"{trade['month'][:8]:<9} {str(trade['buy_date']):<11} ${trade['buy_price']:7.2f} {thu_date:<11} {thu_price:<8} {stop_indicator:<5} "
              f"{str(trade['actual_sell_date']):<11} ${trade['actual_sell_price']:7.2f} {trade['return_pct']:8.2f}% {vs_normal_str:<10}")
    
    print("-" * 120)
    
    # Summary statistics
    stop_loss_trades = trades_df[trades_df['stop_loss_triggered'] == True]
    normal_trades = trades_df[trades_df['stop_loss_triggered'] == False]
    
    print("\n📈 PERFORMANCE SUMMARY:")
    print("-" * 50)
    print(f"Total trades: {len(trades_df)}")
    print(f"Stop-loss triggered: {len(stop_loss_trades)} ({len(stop_loss_trades)/len(trades_df)*100:.1f}%)")
    print(f"Normal exit trades: {len(normal_trades)} ({len(normal_trades)/len(trades_df)*100:.1f}%)")
    
    winning_trades = trades_df[trades_df['return_pct'] > 0]
    losing_trades = trades_df[trades_df['return_pct'] < 0]
    
    print(f"\nWinning trades: {len(winning_trades)} ({len(winning_trades)/len(trades_df)*100:.1f}%)")
    print(f"Losing trades: {len(losing_trades)} ({len(losing_trades)/len(trades_df)*100:.1f}%)")
    
    print(f"\nAverage return per trade: {trades_df['return_pct'].mean():.2f}%")
    print(f"Best trade: {trades_df['return_pct'].max():.2f}%")
    print(f"Worst trade: {trades_df['return_pct'].min():.2f}%")
    
    # Performance of stop-loss vs normal trades
    if len(stop_loss_trades) > 0:
        print(f"\nStop-loss trade performance:")
        print(f"  Average return: {stop_loss_trades['return_pct'].mean():.2f}%")
        print(f"  Count: {len(stop_loss_trades)} trades")
        
        # Calculate how much the stop-loss saved/cost
        total_stop_loss_impact = 0
        for _, trade in stop_loss_trades.iterrows():
            normal_return = ((trade['normal_sell_price'] - trade['buy_price']) / trade['buy_price']) * 100
            impact = trade['return_pct'] - normal_return
            total_stop_loss_impact += impact
        
        print(f"  Impact vs holding: {total_stop_loss_impact:+.2f}% total")
    
    if len(normal_trades) > 0:
        print(f"\nNormal exit trade performance:")
        print(f"  Average return: {normal_trades['return_pct'].mean():.2f}%")
        print(f"  Count: {len(normal_trades)} trades")
    
    # Total performance
    total_return_pct = ((capital - initial_capital) / initial_capital) * 100
    
    print(f"\n💰 CAPITAL PERFORMANCE:")
    print("-" * 40)
    print(f"Starting capital: ${initial_capital:,.2f}")
    print(f"Ending capital: ${capital:,.2f}")
    print(f"Total return: ${capital - initial_capital:,.2f} ({total_return_pct:.2f}%)")
    
    # Compare with simple Monday-to-Monday and buy & hold
    first_price = df_2025.iloc[0]['close']
    last_price = df_2025.iloc[-1]['close']
    buy_hold_return = ((last_price - first_price) / first_price) * 100
    
    print(f"\n📊 STRATEGY COMPARISON:")
    print("-" * 60)
    
    # Load previous strategy results
    strategy_results = []
    strategy_results.append(["Thursday Stop-Loss", total_return_pct, len(trades_df)])
    
    try:
        simple_df = pd.read_csv('monday_to_monday_trades_2025.csv')
        simple_return = ((simple_df['capital'].iloc[-1] - initial_capital) / initial_capital) * 100
        strategy_results.append(["Simple Monday-Monday", simple_return, len(simple_df)])
    except:
        pass
    
    try:
        monthly_df = pd.read_csv('monthly_thursday_monday_trades_2025.csv')
        monthly_return = ((monthly_df['capital'].iloc[-1] - initial_capital) / initial_capital) * 100
        strategy_results.append(["Monthly Thu→Mon", monthly_return, len(monthly_df)])
    except:
        pass
    
    strategy_results.append(["Buy & Hold", buy_hold_return, 1])
    
    print(f"{'Strategy':<20} {'Return':<10} {'Trades':<8} {'vs B&H':<10}")
    print("-" * 60)
    for strategy, return_pct, trades in strategy_results:
        vs_bh = return_pct - buy_hold_return
        print(f"{strategy:<20} {return_pct:9.2f}% {trades:7d} {vs_bh:9.2f}%")
    
    # Risk metrics
    if len(trades_df) > 0:
        print(f"\n⚠️ RISK METRICS:")
        print("-" * 40)
        sharpe_ratio = trades_df['return_pct'].mean() / trades_df['return_pct'].std() if trades_df['return_pct'].std() > 0 else 0
        print(f"Sharpe Ratio: {sharpe_ratio:.2f}")
        print(f"Max single trade loss: {trades_df['return_pct'].min():.2f}%")
        print(f"Standard deviation: {trades_df['return_pct'].std():.2f}%")
        print(f"Average days held: {trades_df['days_held'].mean():.1f}")
        
        if len(winning_trades) > 0 and len(losing_trades) > 0:
            avg_win = winning_trades['return_pct'].mean()
            avg_loss = abs(losing_trades['return_pct'].mean()) if len(losing_trades) > 0 else 0
            if avg_loss > 0:
                profit_factor = (avg_win * len(winning_trades)) / (avg_loss * len(losing_trades))
                print(f"Profit factor: {profit_factor:.2f}")
    
    # Save results
    trades_df.to_csv('thursday_stop_loss_trades_2025.csv', index=False)
    print(f"\n✅ Detailed results saved to 'thursday_stop_loss_trades_2025.csv'")
    
    return trades_df

if __name__ == "__main__":
    backtest_thursday_stop_loss_strategy()