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

def backtest_monday_to_monday_strategy():
    """Backtest buying on last Monday of month and selling on first Monday of next month"""
    
    # Load the data
    df = pd.read_csv('drip_15min_data.csv')
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Filter for 2025 only
    df_2025 = df[df['timestamp'].dt.year == 2025].copy()
    
    # Add day of week and date
    df_2025['day_of_week'] = df_2025['timestamp'].dt.day_name()
    df_2025['date'] = df_2025['timestamp'].dt.date
    
    print("DRIP Monday-to-Monday Strategy: Last Monday → First Monday Backtest (2025)")
    print("=" * 90)
    print(f"Data range: {df_2025['timestamp'].min()} to {df_2025['timestamp'].max()}")
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
    
    # Find all last Mondays and first Mondays for 2025
    trades = []
    
    for month in range(1, 9):  # January through August 2025
        # Find last Monday of this month
        last_monday = find_last_monday(2025, month)
        
        # Find first Monday of next month (or September for August)
        if month < 12:
            next_month = month + 1
            next_year = 2025
        else:
            next_month = 1
            next_year = 2026
        
        if next_year == 2025 or (next_year == 2026 and next_month == 1):
            first_monday = find_first_monday(next_year, next_month)
            
            # Check if we have data for both dates
            buy_found = False
            sell_found = False
            
            # Find actual last Monday trading day (search backwards)
            for i in range(14):  # Look back up to 2 weeks
                check_date = last_monday - timedelta(days=i)
                if check_date in date_to_prices and date_to_prices[check_date]['day_of_week'] == 'Monday':
                    actual_buy_date = check_date
                    buy_data = date_to_prices[actual_buy_date]
                    buy_found = True
                    break
            
            # Find actual first Monday trading day (search forward)
            for i in range(14):  # Look forward up to 2 weeks
                check_date = first_monday + timedelta(days=i)
                if check_date in date_to_prices and date_to_prices[check_date]['day_of_week'] == 'Monday':
                    actual_sell_date = check_date
                    sell_data = date_to_prices[actual_sell_date]
                    sell_found = True
                    break
            
            if buy_found and sell_found:
                buy_price = buy_data['close']  # Buy at close of last Monday
                sell_price = sell_data['open']  # Sell at open of first Monday
                
                # Calculate return
                return_pct = ((sell_price - buy_price) / buy_price) * 100
                return_dollar = sell_price - buy_price
                
                note = ""
                if actual_buy_date != last_monday or actual_sell_date != first_monday:
                    note = f"Adjusted: {last_monday}→{actual_buy_date}, {first_monday}→{actual_sell_date}"
                
                trades.append({
                    'month': calendar.month_name[month],
                    'target_buy_date': last_monday,
                    'actual_buy_date': actual_buy_date,
                    'buy_price': buy_price,
                    'target_sell_date': first_monday,
                    'actual_sell_date': actual_sell_date,
                    'sell_price': sell_price,
                    'return_dollar': return_dollar,
                    'return_pct': return_pct,
                    'days_held': (actual_sell_date - actual_buy_date).days,
                    'note': note
                })
            else:
                print(f"⚠️ Could not find trading days for {calendar.month_name[month]}:")
                if not buy_found:
                    print(f"   No Monday found near last Monday {last_monday}")
                if not sell_found:
                    print(f"   No Monday found near first Monday {first_monday}")
    
    # Convert to DataFrame
    trades_df = pd.DataFrame(trades)
    
    if len(trades_df) == 0:
        print("No trades found for 2025")
        return
    
    # Calculate cumulative returns
    initial_capital = 10000  # Start with $10,000
    capital = initial_capital
    trades_df['capital'] = 0.0
    
    for idx, trade in trades_df.iterrows():
        capital = capital * (1 + trade['return_pct'] / 100)
        trades_df.loc[idx, 'capital'] = capital
    
    # Print trade log
    print("📊 TRADE LOG (Last Monday → First Monday):")
    print("-" * 90)
    print(f"{'Month':<9} {'Buy Date':<12} {'Buy $':<8} {'Sell Date':<12} {'Sell $':<8} {'Return $':<9} {'Return %':<9} {'Days':<5} {'Capital'}")
    print("-" * 90)
    
    for _, trade in trades_df.iterrows():
        note = " *" if trade['note'] else ""
        print(f"{trade['month'][:8]:<9} {str(trade['actual_buy_date']):<12} ${trade['buy_price']:7.2f} {str(trade['actual_sell_date']):<12} ${trade['sell_price']:7.2f} ${trade['return_dollar']:8.3f} {trade['return_pct']:8.2f}% {trade['days_held']:4d} ${trade['capital']:10.2f}{note}")
    
    print("-" * 90)
    if any(trades_df['note']):
        print("* = Adjusted dates due to market closure/holidays")
    
    # Calculate statistics
    winning_trades = trades_df[trades_df['return_pct'] > 0]
    losing_trades = trades_df[trades_df['return_pct'] < 0]
    
    print("\n📈 PERFORMANCE SUMMARY:")
    print("-" * 40)
    print(f"Total trades: {len(trades_df)}")
    print(f"Winning trades: {len(winning_trades)} ({len(winning_trades)/len(trades_df)*100:.1f}%)")
    print(f"Losing trades: {len(losing_trades)} ({len(losing_trades)/len(trades_df)*100:.1f}%)")
    print(f"Breakeven trades: {len(trades_df) - len(winning_trades) - len(losing_trades)}")
    
    print(f"\nAverage return per trade: {trades_df['return_pct'].mean():.2f}%")
    print(f"Median return per trade: {trades_df['return_pct'].median():.2f}%")
    print(f"Best trade: {trades_df['return_pct'].max():.2f}%")
    print(f"Worst trade: {trades_df['return_pct'].min():.2f}%")
    print(f"Standard deviation: {trades_df['return_pct'].std():.2f}%")
    print(f"Average days held: {trades_df['days_held'].mean():.1f} days")
    
    # Calculate total return
    total_return_pct = ((capital - initial_capital) / initial_capital) * 100
    
    print(f"\n💰 CAPITAL PERFORMANCE:")
    print("-" * 40)
    print(f"Starting capital: ${initial_capital:,.2f}")
    print(f"Ending capital: ${capital:,.2f}")
    print(f"Total return: ${capital - initial_capital:,.2f} ({total_return_pct:.2f}%)")
    
    # Calculate buy and hold comparison
    first_price = df_2025.iloc[0]['close']
    last_price = df_2025.iloc[-1]['close']
    buy_hold_return = ((last_price - first_price) / first_price) * 100
    
    print(f"\n📊 ALL STRATEGIES COMPARISON:")
    print("-" * 60)
    
    # Load previous strategy results
    strategy_results = []
    strategy_results.append(["Monday-to-Monday", total_return_pct, len(trades_df)])
    
    try:
        monthly_df = pd.read_csv('monthly_thursday_monday_trades_2025.csv')
        monthly_return = ((monthly_df['capital'].iloc[-1] - initial_capital) / initial_capital) * 100
        strategy_results.append(["Monthly Thu→Mon", monthly_return, len(monthly_df)])
    except:
        pass
    
    try:
        weekly_df = pd.read_csv('thursday_monday_trades_2025.csv')
        weekly_return = ((weekly_df['capital'].iloc[-1] - initial_capital) / initial_capital) * 100
        strategy_results.append(["Weekly Thu→Mon", weekly_return, len(weekly_df)])
    except:
        pass
    
    strategy_results.append(["Buy & Hold", buy_hold_return, 1])
    
    print(f"{'Strategy':<18} {'Return':<10} {'Trades':<8} {'vs B&H':<10}")
    print("-" * 60)
    for strategy, return_pct, trades in strategy_results:
        vs_bh = return_pct - buy_hold_return
        print(f"{strategy:<18} {return_pct:9.2f}% {trades:7d} {vs_bh:9.2f}%")
    
    # Risk metrics
    if len(trades_df) > 0:
        sharpe_ratio = (trades_df['return_pct'].mean() / trades_df['return_pct'].std()) if trades_df['return_pct'].std() > 0 else 0
        max_drawdown = min(trades_df['return_pct'].min(), 0)
        
        print(f"\n⚠️ RISK METRICS:")
        print("-" * 40)
        print(f"Sharpe Ratio (simplified): {sharpe_ratio:.2f}")
        print(f"Maximum single trade loss: {max_drawdown:.2f}%")
        print(f"Win rate: {len(winning_trades)/len(trades_df)*100:.1f}%")
        
        if len(winning_trades) > 0 and len(losing_trades) > 0:
            avg_win = winning_trades['return_pct'].mean()
            avg_loss = abs(losing_trades['return_pct'].mean())
            profit_factor = (avg_win * len(winning_trades)) / (avg_loss * len(losing_trades))
            print(f"Average win: {avg_win:.2f}%")
            print(f"Average loss: {avg_loss:.2f}%")
            print(f"Profit factor: {profit_factor:.2f}")
    
    # Save results
    trades_df.to_csv('monday_to_monday_trades_2025.csv', index=False)
    print(f"\n✅ Detailed trade log saved to 'monday_to_monday_trades_2025.csv'")
    
    return trades_df

if __name__ == "__main__":
    backtest_monday_to_monday_strategy()