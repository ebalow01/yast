import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import calendar
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def find_first_monday(year, month):
    """Find the first Monday of a given month"""
    first_date = datetime(year, month, 1)
    while first_date.weekday() != 0:  # 0 = Monday
        first_date += timedelta(days=1)
    return first_date.date()

def find_second_monday(year, month):
    """Find the second Monday of a given month"""
    first_monday = find_first_monday(year, month)
    second_monday = first_monday + timedelta(days=7)
    return second_monday

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

def test_smci_strategy_for_year(year, df_year, config):
    """Test SMCI first Monday to second Monday strategy for a specific year"""
    
    if len(df_year) == 0:
        return None
    
    # Create daily data
    daily_data = df_year.groupby('date').agg({
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        'volume': 'sum',
        'day_of_week': 'first',
        'rsi_14': 'last'  # Use end-of-day RSI
    }).reset_index()
    
    date_to_prices = {row['date']: row for _, row in daily_data.iterrows()}
    
    # Run SMCI first Monday to second Monday strategy
    trades = []
    
    for month in range(1, 13):
        first_monday = find_first_monday(year, month)
        second_monday = find_second_monday(year, month)
        
        # Find actual trading days
        actual_buy_date = None
        actual_sell_date = None
        
        # Find first Monday (buy date)
        for i in range(14):
            check_date = first_monday + timedelta(days=i)
            if check_date in date_to_prices and date_to_prices[check_date]['day_of_week'] == 'Monday':
                actual_buy_date = check_date
                break
        
        # Find second Monday (sell date)
        for i in range(14):
            check_date = second_monday + timedelta(days=i)
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
                    
                    # Check for early sell or double-down based on Thursday RSI
                    thursday_date = find_thursday_after_monday(actual_buy_date, date_to_prices)
                    if thursday_date and thursday_date in date_to_prices:
                        thursday_data = date_to_prices[thursday_date]
                        thursday_rsi = thursday_data['rsi_14']
                        thursday_price = thursday_data['close']
                        
                        # Early sell if RSI gets too high by Thursday (stop-loss on momentum)
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
                    'year': year,
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
    
    if trades:
        trades_df = pd.DataFrame(trades)
        
        # Calculate compound return
        compound_return = 1
        for _, trade in trades_df.iterrows():
            compound_return *= (1 + trade['return_pct'] / 100)
        
        total_return = (compound_return - 1) * 100
        avg_return = trades_df['return_pct'].mean()
        win_rate = (trades_df['return_pct'] > 0).mean() * 100
        
        return {
            'year': year,
            'total_trades': len(trades_df),
            'total_return': total_return,
            'avg_return': avg_return,
            'win_rate': win_rate,
            'best_trade': trades_df['return_pct'].max(),
            'worst_trade': trades_df['return_pct'].min(),
            'early_sells': len(trades_df[trades_df['action'] == 'early_sell']),
            'double_downs': len(trades_df[trades_df['action'] == 'double_down']),
            'trades_df': trades_df
        }
    else:
        return {
            'year': year,
            'total_trades': 0,
            'total_return': 0,
            'avg_return': 0,
            'win_rate': 0,
            'best_trade': 0,
            'worst_trade': 0,
            'early_sells': 0,
            'double_downs': 0,
            'trades_df': pd.DataFrame()
        }

def test_smci_simple_strategy_for_year(year, df_year):
    """Test simple SMCI first Monday to second Monday (no RSI) for comparison"""
    
    if len(df_year) == 0:
        return None
    
    # Create daily data
    daily_data = df_year.groupby('date').agg({
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        'volume': 'sum',
        'day_of_week': 'first'
    }).reset_index()
    
    date_to_prices = {row['date']: row for _, row in daily_data.iterrows()}
    
    trades = []
    
    for month in range(1, 13):
        first_monday = find_first_monday(year, month)
        second_monday = find_second_monday(year, month)
        
        # Find actual trading days
        actual_buy_date = None
        actual_sell_date = None
        
        for i in range(14):
            check_date = first_monday + timedelta(days=i)
            if check_date in date_to_prices and date_to_prices[check_date]['day_of_week'] == 'Monday':
                actual_buy_date = check_date
                break
        
        for i in range(14):
            check_date = second_monday + timedelta(days=i)
            if check_date in date_to_prices and date_to_prices[check_date]['day_of_week'] == 'Monday':
                actual_sell_date = check_date
                break
        
        if actual_buy_date and actual_sell_date:
            buy_data = date_to_prices[actual_buy_date]
            sell_data = date_to_prices[actual_sell_date]
            
            buy_price = buy_data['close']
            sell_price = sell_data['open']
            return_pct = ((sell_price - buy_price) / buy_price) * 100
            
            trades.append({
                'year': year,
                'month': calendar.month_name[month],
                'return_pct': return_pct
            })
    
    if trades:
        trades_df = pd.DataFrame(trades)
        compound_return = 1
        for _, trade in trades_df.iterrows():
            compound_return *= (1 + trade['return_pct'] / 100)
        
        return (compound_return - 1) * 100
    else:
        return 0

def analyze_smci_strategies():
    """Analyze SMCI first Monday to second Monday strategies with RSI"""
    
    # Load SMCI data
    df = pd.read_csv('smci_15min_data.csv')
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['day_of_week'] = df['timestamp'].dt.day_name()
    df['date'] = df['timestamp'].dt.date
    df['year'] = df['timestamp'].dt.year
    
    print("SMCI First Monday → Second Monday Strategy Analysis")
    print("=" * 80)
    print("Testing RSI-enhanced strategies (buy 1st Monday, sell 2nd Monday)")
    print()
    
    # Test different RSI configurations
    rsi_configs = [
        {'name': 'Conservative', 'buy_below': 50, 'skip_above': 60, 'sell_above': 70, 'double_below': 30},
        {'name': 'Moderate', 'buy_below': 40, 'skip_above': 70, 'sell_above': 75, 'double_below': 25},
        {'name': 'Aggressive', 'buy_below': 35, 'skip_above': 75, 'sell_above': 80, 'double_below': 20},
        {'name': 'Relaxed', 'buy_below': 60, 'skip_above': 80, 'sell_above': 85, 'double_below': 35}
    ]
    
    # Available years in SMCI data
    years = sorted(df['year'].unique())
    print(f"Available years: {years}")
    print()
    
    all_results = []
    simple_results = []
    
    # Test simple strategy first (no RSI)
    print("📊 Simple Strategy (No RSI) Results:")
    print("-" * 40)
    for year in years:
        df_year = df[df['year'] == year].copy()
        simple_return = test_smci_simple_strategy_for_year(year, df_year)
        simple_results.append({'year': year, 'return': simple_return})
        print(f"   {year}: {simple_return:+8.2f}%")
    
    # Calculate simple strategy compound return
    simple_compound = 1
    for result in simple_results:
        simple_compound *= (1 + result['return'] / 100)
    simple_total = (simple_compound - 1) * 100
    print(f"   → Total: {simple_total:+8.2f}%")
    print()
    
    # Test RSI strategies
    for config in rsi_configs:
        print(f"📊 Testing {config['name']} RSI Strategy:")
        print(f"   Buy if RSI < {config['buy_below']} | Skip if RSI > {config['skip_above']}")
        print(f"   Early sell if RSI > {config['sell_above']} | Double-down if RSI < {config['double_below']}")
        print("-" * 60)
        
        strategy_results = []
        
        for year in years:
            df_year = df[df['year'] == year].copy()
            result = test_smci_strategy_for_year(year, df_year, config)
            
            if result:
                strategy_results.append(result)
                print(f"   {year}: {result['total_trades']:2d} trades | "
                      f"{result['total_return']:+8.2f}% | "
                      f"Win: {result['win_rate']:5.1f}% | "
                      f"Early/Double: {result['early_sells']}/{result['double_downs']}")
        
        # Calculate overall strategy performance
        if strategy_results:
            total_compound = 1
            total_trades = sum(r['total_trades'] for r in strategy_results)
            avg_yearly_return = np.mean([r['total_return'] for r in strategy_results])
            
            for result in strategy_results:
                total_compound *= (1 + result['total_return'] / 100)
            
            total_compound_return = (total_compound - 1) * 100
            
            strategy_summary = {
                'strategy': config['name'],
                'total_trades_all_years': total_trades,
                'compound_return': total_compound_return,
                'avg_yearly_return': avg_yearly_return,
                'yearly_results': strategy_results,
                'config': config
            }
            
            all_results.append(strategy_summary)
            print(f"   → Total: {total_compound_return:+8.2f}% | Avg/Year: {avg_yearly_return:+.2f}%")
        
        print()
    
    # Compare all strategies
    if all_results:
        print("📈 SMCI STRATEGY COMPARISON")
        print("=" * 80)
        print(f"{'Strategy':<12} {'Total Return':<13} {'Avg/Year':<10} {'Tot Trades':<11} {'vs Simple':<10}")
        print("-" * 80)
        
        # Add simple strategy to comparison
        print(f"{'Simple':<12} {simple_total:+12.2f}% {simple_total/len(years):9.2f}% {len(years)*12:10d} {'—':<10}")
        
        for result in all_results:
            vs_simple = result['compound_return'] - simple_total
            print(f"{result['strategy']:<12} {result['compound_return']:+12.2f}% "
                  f"{result['avg_yearly_return']:9.2f}% {result['total_trades_all_years']:10d} "
                  f"{vs_simple:+9.2f}%")
        
        # Find best strategy
        best_strategy = max(all_results, key=lambda x: x['compound_return'])
        print("-" * 80)
        print(f"🏆 Best RSI Strategy: {best_strategy['strategy']} with {best_strategy['compound_return']:+.2f}% total return")
        print(f"   Improvement over Simple: {best_strategy['compound_return'] - simple_total:+.2f}%")
        
        # Year-by-year breakdown for best strategy
        print(f"\n📅 YEAR-BY-YEAR BREAKDOWN - {best_strategy['strategy']} Strategy:")
        print("-" * 80)
        print(f"{'Year':<6} {'Trades':<7} {'Return':<10} {'Simple':<10} {'Difference':<11} {'Win%':<6} {'E.Sell':<7} {'Double'}")
        print("-" * 80)
        
        for i, result in enumerate(best_strategy['yearly_results']):
            simple_ret = simple_results[i]['return'] if i < len(simple_results) else 0
            diff = result['total_return'] - simple_ret
            
            print(f"{result['year']:<6} {result['total_trades']:<7} {result['total_return']:+9.2f}% "
                  f"{simple_ret:+9.2f}% {diff:+10.2f}% {result['win_rate']:5.1f}% "
                  f"{result['early_sells']:<7} {result['double_downs']}")
        
        print("-" * 80)
        
        # Calculate buy and hold comparison
        if len(df) > 0:
            first_price = df.iloc[0]['close']
            last_price = df.iloc[-1]['close']
            buy_hold_return = ((last_price - first_price) / first_price) * 100
            
            print(f"\n📊 STRATEGY vs BUY & HOLD COMPARISON:")
            print("-" * 50)
            print(f"Best RSI Strategy: {best_strategy['compound_return']:+.2f}%")
            print(f"Simple 1st→2nd Mon: {simple_total:+.2f}%")
            print(f"Buy & Hold SMCI: {buy_hold_return:+.2f}%")
            print(f"RSI vs Buy&Hold: {best_strategy['compound_return'] - buy_hold_return:+.2f}%")
        
        # Save results
        summary_data = []
        summary_data.append({
            'strategy': 'Simple',
            'total_return': simple_total,
            'avg_yearly_return': simple_total / len(years),
            'total_trades': len(years) * 12
        })
        
        for result in all_results:
            summary_data.append({
                'strategy': result['strategy'],
                'total_return': result['compound_return'],
                'avg_yearly_return': result['avg_yearly_return'],
                'total_trades': result['total_trades_all_years']
            })
        
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_csv('smci_strategy_comparison.csv', index=False)
        
        # Save detailed results for best strategy
        if best_strategy['yearly_results']:
            detailed_trades = []
            for year_result in best_strategy['yearly_results']:
                if not year_result['trades_df'].empty:
                    detailed_trades.append(year_result['trades_df'])
            
            if detailed_trades:
                all_trades_df = pd.concat(detailed_trades, ignore_index=True)
                all_trades_df.to_csv(f"smci_{best_strategy['strategy'].lower()}_trades.csv", index=False)
        
        print(f"\n✅ Results saved:")
        print(f"   - 'smci_strategy_comparison.csv' (summary)")
        print(f"   - 'smci_{best_strategy['strategy'].lower()}_trades.csv' (detailed trades)")
    
    return all_results, simple_results

if __name__ == "__main__":
    analyze_smci_strategies()