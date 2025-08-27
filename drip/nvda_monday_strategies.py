import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import calendar
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def get_nth_monday_of_month(year, month, n):
    """Get the nth Monday of a given month"""
    first_day = datetime(year, month, 1)
    first_monday = first_day + timedelta(days=(7 - first_day.weekday()) % 7)
    
    nth_monday = first_monday + timedelta(weeks=n-1)
    
    # Check if the nth Monday is still in the same month
    if nth_monday.month != month:
        return None
    return nth_monday

def analyze_nvda_monday_strategies():
    """Analyze NVDA 2nd Monday to 3rd Monday strategies with RSI enhancements"""
    
    # Load NVDA data
    df = pd.read_csv('nvda_15min_data.csv')
    df['timestamp'] = pd.to_datetime(df['timestamp'], utc=True)
    df['date'] = df['timestamp'].dt.date
    df['year'] = df['timestamp'].dt.year
    df['month'] = df['timestamp'].dt.month
    df['day_of_week'] = df['timestamp'].dt.dayofweek  # Monday = 0
    
    print("NVDA 2nd Monday → 3rd Monday Trading Strategies")
    print("=" * 80)
    
    # Get daily closing prices (last price of each trading day)
    daily_df = df.groupby('date').agg({
        'close': 'last',
        'rsi': 'last',
        'year': 'first',
        'month': 'first',
        'day_of_week': 'first'
    }).reset_index()
    
    daily_df['timestamp'] = pd.to_datetime(daily_df['date'])
    
    # Generate all trading periods
    trades = []
    
    for year in range(2022, 2026):  # 2022-2025
        for month in range(1, 13):
            # Get 2nd Monday (buy) and 3rd Monday (sell)
            buy_monday = get_nth_monday_of_month(year, month, 2)
            sell_monday = get_nth_monday_of_month(year, month, 3)
            
            if buy_monday and sell_monday:
                buy_date = buy_monday.date()
                sell_date = sell_monday.date()
                
                # Find actual trading data for these dates (or closest)
                buy_data = daily_df[daily_df['date'] >= buy_date].head(1)
                sell_data = daily_df[daily_df['date'] >= sell_date].head(1)
                
                if len(buy_data) > 0 and len(sell_data) > 0:
                    buy_row = buy_data.iloc[0]
                    sell_row = sell_data.iloc[0]
                    
                    buy_price = buy_row['close']
                    sell_price = sell_row['close']
                    buy_rsi = buy_row['rsi']
                    sell_rsi = sell_row['rsi']
                    
                    actual_buy_date = buy_row['date']
                    actual_sell_date = sell_row['date']
                    days_held = (actual_sell_date - actual_buy_date).days
                    
                    return_pct = ((sell_price - buy_price) / buy_price) * 100
                    
                    trades.append({
                        'year': year,
                        'month': calendar.month_name[month],
                        'buy_date': actual_buy_date,
                        'buy_price': buy_price,
                        'buy_rsi': buy_rsi,
                        'sell_date': actual_sell_date,
                        'sell_price': sell_price,
                        'sell_rsi': sell_rsi,
                        'return_pct': return_pct,
                        'days_held': days_held,
                        'action': 'buy'
                    })
    
    if not trades:
        print("❌ No trades found!")
        return
    
    trades_df = pd.DataFrame(trades)
    
    # Strategy Implementations
    strategies = {}
    
    # 1. Simple Strategy - Buy every 2nd Monday, sell every 3rd Monday
    simple_trades = trades_df.copy()
    simple_return = ((simple_trades['return_pct'] / 100 + 1).prod() - 1) * 100
    strategies['Simple'] = {
        'trades': simple_trades,
        'total_return': simple_return,
        'trade_count': len(simple_trades),
        'description': 'Buy every 2nd Monday, sell every 3rd Monday'
    }
    
    # 2. RSI Filtering Strategy - Skip buys if RSI > 70
    rsi_trades = trades_df[trades_df['buy_rsi'] <= 70].copy()
    if len(rsi_trades) > 0:
        rsi_return = ((rsi_trades['return_pct'] / 100 + 1).prod() - 1) * 100
    else:
        rsi_return = 0
    strategies['RSI Filter'] = {
        'trades': rsi_trades,
        'total_return': rsi_return,
        'trade_count': len(rsi_trades),
        'description': 'Skip buys if RSI > 70'
    }
    
    # 3. Relaxed RSI Strategy - Buy if RSI < 60, skip if RSI > 80
    relaxed_trades = trades_df[trades_df['buy_rsi'] <= 80].copy()
    relaxed_trades = relaxed_trades[relaxed_trades['buy_rsi'] >= 20].copy()  # Avoid extreme oversold
    if len(relaxed_trades) > 0:
        relaxed_return = ((relaxed_trades['return_pct'] / 100 + 1).prod() - 1) * 100
    else:
        relaxed_return = 0
    strategies['Relaxed RSI'] = {
        'trades': relaxed_trades,
        'total_return': relaxed_return,
        'trade_count': len(relaxed_trades),
        'description': 'Buy if RSI 20-80, focus on RSI < 60'
    }
    
    # 4. Double Down Strategy - Double position if RSI < 30
    double_down_trades = []
    for _, trade in trades_df.iterrows():
        if trade['buy_rsi'] <= 80:  # Only trade if not extremely overbought
            if trade['buy_rsi'] < 30:  # Double down on oversold
                # Double down trade
                double_trade = trade.copy()
                double_trade['action'] = 'double_down'
                double_trade['return_pct'] = trade['return_pct'] * 2  # Double the return
                double_down_trades.append(double_trade)
            else:
                # Regular trade
                regular_trade = trade.copy()
                regular_trade['action'] = 'buy'
                double_down_trades.append(regular_trade)
    
    if double_down_trades:
        dd_df = pd.DataFrame(double_down_trades)
        dd_return = ((dd_df['return_pct'] / 100 + 1).prod() - 1) * 100
    else:
        dd_df = pd.DataFrame()
        dd_return = 0
    strategies['Double Down'] = {
        'trades': dd_df,
        'total_return': dd_return,
        'trade_count': len(dd_df),
        'description': 'Double position if RSI < 30'
    }
    
    # Display Results
    print("\n📊 STRATEGY COMPARISON:")
    print("-" * 80)
    print(f"{'Strategy':<15} {'Return':<12} {'Trades':<8} {'Win Rate':<10} {'Description'}")
    print("-" * 80)
    
    for name, strategy in strategies.items():
        if len(strategy['trades']) > 0:
            win_rate = (strategy['trades']['return_pct'] > 0).mean() * 100
            print(f"{name:<15} {strategy['total_return']:+10.2f}% {strategy['trade_count']:<8} {win_rate:8.1f}% {strategy['description']}")
        else:
            print(f"{name:<15} {'N/A':<12} {0:<8} {'N/A':<10} {strategy['description']}")
    
    # Year-by-year analysis for best strategy
    best_strategy_name = max(strategies.keys(), key=lambda x: strategies[x]['total_return'] if len(strategies[x]['trades']) > 0 else -999)
    best_strategy = strategies[best_strategy_name]
    
    if len(best_strategy['trades']) > 0:
        print(f"\n📈 YEAR-BY-YEAR BREAKDOWN ({best_strategy_name}):")
        print("-" * 60)
        print(f"{'Year':<6} {'Return':<10} {'Trades':<8} {'Win Rate':<10} {'Best Month'}")
        print("-" * 60)
        
        yearly_performance = {}
        for year in sorted(best_strategy['trades']['year'].unique()):
            year_trades = best_strategy['trades'][best_strategy['trades']['year'] == year]
            year_return = ((year_trades['return_pct'] / 100 + 1).prod() - 1) * 100
            win_rate = (year_trades['return_pct'] > 0).mean() * 100
            best_month = year_trades.loc[year_trades['return_pct'].idxmax(), 'month'] if len(year_trades) > 0 else 'None'
            
            yearly_performance[year] = year_return
            print(f"{year:<6} {year_return:+8.2f}% {len(year_trades):<8} {win_rate:8.1f}% {best_month}")
    
    # Save detailed results
    if len(best_strategy['trades']) > 0:
        best_strategy['trades'].to_csv('nvda_monday_trades.csv', index=False)
        print(f"\n✅ Detailed trades saved to 'nvda_monday_trades.csv'")
    
    # Save strategy comparison
    comparison_data = []
    for name, strategy in strategies.items():
        if len(strategy['trades']) > 0:
            win_rate = (strategy['trades']['return_pct'] > 0).mean() * 100
            avg_return = strategy['trades']['return_pct'].mean()
            comparison_data.append({
                'strategy': name,
                'total_return': strategy['total_return'],
                'trade_count': strategy['trade_count'],
                'win_rate': win_rate,
                'avg_return_per_trade': avg_return,
                'description': strategy['description']
            })
    
    if comparison_data:
        comparison_df = pd.DataFrame(comparison_data)
        comparison_df.to_csv('nvda_strategy_comparison.csv', index=False)
        print(f"✅ Strategy comparison saved to 'nvda_strategy_comparison.csv'")
    
    # Market context
    print(f"\n📊 MARKET CONTEXT:")
    print("-" * 40)
    start_price = df.iloc[0]['close']
    end_price = df.iloc[-1]['close']
    buy_hold_return = ((end_price - start_price) / start_price) * 100
    
    print(f"Buy & Hold Return: {buy_hold_return:+.2f}%")
    print(f"Best Strategy ({best_strategy_name}): {best_strategy['total_return']:+.2f}%")
    print(f"Strategy vs Buy & Hold: {best_strategy['total_return'] - buy_hold_return:+.2f}%")
    
    return strategies

if __name__ == "__main__":
    analyze_nvda_monday_strategies()