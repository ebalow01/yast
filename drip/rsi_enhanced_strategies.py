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
    while last_date.weekday() != 0:
        last_date -= timedelta(days=1)
    return last_date.date()

def find_first_monday(year, month):
    """Find the first Monday of a given month"""
    first_date = datetime(year, month, 1)
    while first_date.weekday() != 0:
        first_date += timedelta(days=1)
    return first_date.date()

def find_thursday_after_monday(monday_date, daily_data_dict):
    """Find the Thursday after the given Monday"""
    target_thursday = monday_date + timedelta(days=3)
    for i in range(7):
        check_date = target_thursday + timedelta(days=i)
        if check_date in daily_data_dict:
            day_data = daily_data_dict[check_date]
            if day_data['day_of_week'] == 'Thursday':
                return check_date
    return None

def test_rsi_enhanced_strategies():
    """Test RSI-enhanced strategies with various thresholds"""
    
    # Load the data with RSI
    df = pd.read_csv('drip_15min_data.csv')
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['day_of_week'] = df['timestamp'].dt.day_name()
    df['date'] = df['timestamp'].dt.date
    df['year'] = df['timestamp'].dt.year
    
    print("RSI-Enhanced DRIP Trading Strategies Analysis")
    print("=" * 80)
    print("Testing RSI filters on Monday-to-Monday and Double-Down strategies")
    print()
    
    # Test different RSI threshold combinations
    rsi_configs = [
        {'name': 'Conservative', 'buy_below': 50, 'skip_above': 60, 'sell_above': 70, 'double_below': 30},
        {'name': 'Moderate', 'buy_below': 40, 'skip_above': 70, 'sell_above': 75, 'double_below': 25},
        {'name': 'Aggressive', 'buy_below': 35, 'skip_above': 75, 'sell_above': 80, 'double_below': 20},
        {'name': 'Simple_Baseline', 'buy_below': 100, 'skip_above': 0, 'sell_above': 100, 'double_below': 0}  # No RSI filter
    ]
    
    results = []
    
    for config in rsi_configs:
        print(f"📊 Testing {config['name']} RSI Strategy:")
        print(f"   Buy only if RSI < {config['buy_below']} | Skip if RSI > {config['skip_above']}")
        print(f"   Sell early if RSI > {config['sell_above']} | Double-down if RSI < {config['double_below']}")
        print()
        
        # Test on 2025 data (most recent and complete year)
        df_2025 = df[df['year'] == 2025].copy()
        
        if len(df_2025) == 0:
            print("   No 2025 data available")
            continue
        
        # Create daily data
        daily_data = df_2025.groupby('date').agg({
            'open': 'first',
            'high': 'max',
            'low': 'min',
            'close': 'last',
            'volume': 'sum',
            'day_of_week': 'first',
            'rsi_14': 'last'  # Use end-of-day RSI
        }).reset_index()
        
        date_to_prices = {row['date']: row for _, row in daily_data.iterrows()}
        
        # Run RSI-enhanced Monday-to-Monday strategy
        trades = []
        
        for month in range(1, 9):  # Jan through Aug 2025
            last_monday = find_last_monday(2025, month)
            if month < 12:
                first_monday = find_first_monday(2025, month + 1)
            else:
                continue  # Skip December for now
            
            # Find actual trading days
            actual_buy_date = None
            actual_sell_date = None
            
            for i in range(14):
                check_date = last_monday - timedelta(days=i)
                if check_date in date_to_prices and date_to_prices[check_date]['day_of_week'] == 'Monday':
                    actual_buy_date = check_date
                    break
            
            for i in range(14):
                check_date = first_monday + timedelta(days=i)
                if check_date in date_to_prices and date_to_prices[check_date]['day_of_week'] == 'Monday':
                    actual_sell_date = check_date
                    break
            
            if actual_buy_date and actual_sell_date:
                buy_data = date_to_prices[actual_buy_date]
                sell_data = date_to_prices[actual_sell_date]
                
                buy_price = buy_data['close']
                sell_price = sell_data['open']
                buy_rsi = buy_data['rsi_14']
                sell_rsi = sell_data['rsi_14']
                
                # RSI-based decision logic
                trade_action = 'skip'  # Default
                position_size = 0
                actual_sell_price = sell_price
                
                # Check if we should buy based on RSI
                if pd.notna(buy_rsi):
                    if buy_rsi < config['buy_below'] and buy_rsi <= config['skip_above']:
                        trade_action = 'buy'
                        position_size = 1
                        
                        # Check for early sell based on Thursday RSI
                        thursday_date = find_thursday_after_monday(actual_buy_date, date_to_prices)
                        if thursday_date and thursday_date in date_to_prices:
                            thursday_data = date_to_prices[thursday_date]
                            thursday_rsi = thursday_data['rsi_14']
                            thursday_price = thursday_data['close']
                            
                            # Early sell if RSI gets too high by Thursday
                            if pd.notna(thursday_rsi) and thursday_rsi > config['sell_above']:
                                trade_action = 'early_sell'
                                actual_sell_date = thursday_date
                                actual_sell_price = thursday_price
                            
                            # Double down if RSI gets very low by Thursday and price is down
                            elif (pd.notna(thursday_rsi) and thursday_rsi < config['double_below'] 
                                  and thursday_price < buy_price):
                                trade_action = 'double_down'
                                position_size = 2
                                # Weighted average price for double-down
                                avg_cost = (buy_price + thursday_price) / 2
                                buy_price = avg_cost  # Adjust for return calculation
                
                # Record trade
                if trade_action != 'skip':
                    return_pct = ((actual_sell_price - buy_price) / buy_price) * 100
                    trades.append({
                        'month': calendar.month_name[month],
                        'action': trade_action,
                        'buy_date': actual_buy_date,
                        'buy_price': buy_price,
                        'buy_rsi': buy_rsi,
                        'sell_date': actual_sell_date,
                        'sell_price': actual_sell_price,
                        'sell_rsi': sell_rsi,
                        'position_size': position_size,
                        'return_pct': return_pct,
                        'days_held': (actual_sell_date - actual_buy_date).days
                    })
        
        # Calculate performance
        if trades:
            trades_df = pd.DataFrame(trades)
            
            # Calculate compound return
            compound_return = 1
            for _, trade in trades_df.iterrows():
                compound_return *= (1 + trade['return_pct'] / 100)
            
            total_return = (compound_return - 1) * 100
            avg_return = trades_df['return_pct'].mean()
            win_rate = (trades_df['return_pct'] > 0).mean() * 100
            
            result = {
                'strategy': config['name'],
                'total_trades': len(trades_df),
                'skipped_trades': 7 - len(trades_df),  # 7 months possible
                'total_return': total_return,
                'avg_return': avg_return,
                'win_rate': win_rate,
                'best_trade': trades_df['return_pct'].max(),
                'worst_trade': trades_df['return_pct'].min(),
                'buy_threshold': config['buy_below'],
                'skip_threshold': config['skip_above'],
                'early_sells': len(trades_df[trades_df['action'] == 'early_sell']),
                'double_downs': len(trades_df[trades_df['action'] == 'double_down']),
                'trades_df': trades_df
            }
            
            results.append(result)
            
            print(f"   ✅ Results: {len(trades_df)} trades, {7-len(trades_df)} skipped")
            print(f"      Total Return: {total_return:+.2f}%")
            print(f"      Win Rate: {win_rate:.1f}%")
            print(f"      Early sells: {result['early_sells']}, Double-downs: {result['double_downs']}")
            print()
        else:
            print("   ⚠️ No trades executed (all skipped)")
            print()
    
    # Compare all strategies
    if results:
        print("📈 RSI STRATEGY COMPARISON (2025)")
        print("=" * 100)
        print(f"{'Strategy':<15} {'Trades':<7} {'Skip':<5} {'Return':<10} {'Avg':<8} {'Win%':<6} {'Best':<8} {'Worst':<8} {'E.Sell':<7} {'Double'}")
        print("-" * 100)
        
        for result in results:
            print(f"{result['strategy']:<15} {result['total_trades']:<7} {result['skipped_trades']:<5} "
                  f"{result['total_return']:+9.2f}% {result['avg_return']:7.2f}% {result['win_rate']:5.1f}% "
                  f"{result['best_trade']:7.2f}% {result['worst_trade']:7.2f}% {result['early_sells']:<7} {result['double_downs']}")
        
        # Find best strategy
        best_strategy = max(results, key=lambda x: x['total_return'])
        print("-" * 100)
        print(f"🏆 Best Strategy: {best_strategy['strategy']} with {best_strategy['total_return']:+.2f}% return")
        
        # Show detailed trades for best strategy
        print(f"\n📊 DETAILED TRADES - {best_strategy['strategy']} Strategy:")
        print("-" * 90)
        print(f"{'Month':<10} {'Action':<12} {'Buy RSI':<8} {'Sell RSI':<9} {'Return':<9} {'Days'}")
        print("-" * 90)
        
        for _, trade in best_strategy['trades_df'].iterrows():
            buy_rsi_str = f"{trade['buy_rsi']:.1f}" if pd.notna(trade['buy_rsi']) else "N/A"
            sell_rsi_str = f"{trade['sell_rsi']:.1f}" if pd.notna(trade['sell_rsi']) else "N/A"
            
            print(f"{trade['month'][:9]:<10} {trade['action']:<12} {buy_rsi_str:<8} {sell_rsi_str:<9} "
                  f"{trade['return_pct']:8.2f}% {trade['days_held']:<4}")
        
        print("-" * 90)
        
        # Save results
        summary_df = pd.DataFrame([{k: v for k, v in result.items() if k != 'trades_df'} for result in results])
        summary_df.to_csv('rsi_strategy_comparison.csv', index=False)
        
        # Save detailed trades for best strategy
        best_strategy['trades_df'].to_csv(f"rsi_{best_strategy['strategy'].lower()}_trades_2025.csv", index=False)
        
        print(f"\n✅ Results saved:")
        print(f"   - 'rsi_strategy_comparison.csv' (summary)")
        print(f"   - 'rsi_{best_strategy['strategy'].lower()}_trades_2025.csv' (detailed trades)")
    
    return results

if __name__ == "__main__":
    test_rsi_enhanced_strategies()