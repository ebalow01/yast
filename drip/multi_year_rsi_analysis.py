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

def test_rsi_strategy_for_year(year, df_year, config):
    """Test RSI strategy for a specific year"""
    
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
    
    # Run RSI-enhanced Monday-to-Monday strategy
    trades = []
    
    for month in range(1, 13):
        last_monday = find_last_monday(year, month)
        if month < 12:
            first_monday = find_first_monday(year, month + 1)
        else:
            first_monday = find_first_monday(year + 1, 1) if year < 2025 else None
        
        if not first_monday:
            continue
        
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

def multi_year_rsi_analysis():
    """Analyze RSI strategies across all years 2021-2025"""
    
    # Load the data with RSI
    df = pd.read_csv('drip_15min_data.csv')
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['day_of_week'] = df['timestamp'].dt.day_name()
    df['date'] = df['timestamp'].dt.date
    df['year'] = df['timestamp'].dt.year
    
    print("Multi-Year RSI-Enhanced DRIP Strategy Analysis (2021-2025)")
    print("=" * 80)
    print("Testing RSI filters on Monday-to-Monday strategy across all years")
    print()
    
    # Test different RSI threshold combinations
    rsi_configs = [
        {'name': 'Conservative', 'buy_below': 50, 'skip_above': 60, 'sell_above': 70, 'double_below': 30},
        {'name': 'Moderate', 'buy_below': 40, 'skip_above': 70, 'sell_above': 75, 'double_below': 25},
        {'name': 'Aggressive', 'buy_below': 35, 'skip_above': 75, 'sell_above': 80, 'double_below': 20},
        {'name': 'Relaxed', 'buy_below': 60, 'skip_above': 80, 'sell_above': 85, 'double_below': 35}
    ]
    
    years = [2021, 2022, 2023, 2024, 2025]
    all_results = []
    
    for config in rsi_configs:
        print(f"📊 Testing {config['name']} RSI Strategy Across All Years:")
        print(f"   Buy if RSI < {config['buy_below']} | Skip if RSI > {config['skip_above']}")
        print(f"   Early sell if RSI > {config['sell_above']} | Double-down if RSI < {config['double_below']}")
        print("-" * 60)
        
        strategy_results = []
        
        for year in years:
            df_year = df[df['year'] == year].copy()
            
            if len(df_year) == 0:
                print(f"   {year}: No data available")
                continue
            
            result = test_rsi_strategy_for_year(year, df_year, config)
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
            
            # Calculate compound return across all years
            for result in strategy_results:
                total_compound *= (1 + result['total_return'] / 100)
            
            total_compound_return = (total_compound - 1) * 100
            
            strategy_summary = {
                'strategy': config['name'],
                'total_trades_all_years': total_trades,
                'compound_return_5years': total_compound_return,
                'avg_yearly_return': avg_yearly_return,
                'yearly_results': strategy_results,
                'config': config
            }
            
            all_results.append(strategy_summary)
            
            print(f"   → 5-Year Total: {total_compound_return:+.2f}% | Avg/Year: {avg_yearly_return:+.2f}%")
        
        print()
    
    # Compare all strategies
    if all_results:
        print("📈 MULTI-YEAR RSI STRATEGY COMPARISON (2021-2025)")
        print("=" * 80)
        print(f"{'Strategy':<12} {'5yr Return':<12} {'Avg/Year':<10} {'Tot Trades':<11} {'Best Year':<10} {'Worst Year'}")
        print("-" * 80)
        
        for result in all_results:
            yearly_returns = [r['total_return'] for r in result['yearly_results']]
            best_year = max(yearly_returns) if yearly_returns else 0
            worst_year = min(yearly_returns) if yearly_returns else 0
            
            print(f"{result['strategy']:<12} {result['compound_return_5years']:+11.2f}% "
                  f"{result['avg_yearly_return']:9.2f}% {result['total_trades_all_years']:10d} "
                  f"{best_year:9.2f}% {worst_year:9.2f}%")
        
        # Find best strategy
        best_strategy = max(all_results, key=lambda x: x['compound_return_5years'])
        print("-" * 80)
        print(f"🏆 Best 5-Year Strategy: {best_strategy['strategy']} with {best_strategy['compound_return_5years']:+.2f}% total return")
        
        # Year-by-year breakdown for best strategy
        print(f"\n📅 YEAR-BY-YEAR BREAKDOWN - {best_strategy['strategy']} Strategy:")
        print("-" * 70)
        print(f"{'Year':<6} {'Trades':<7} {'Return':<10} {'Win%':<6} {'Best':<8} {'Worst':<8} {'E.Sell':<7} {'Double'}")
        print("-" * 70)
        
        for result in best_strategy['yearly_results']:
            print(f"{result['year']:<6} {result['total_trades']:<7} {result['total_return']:+9.2f}% "
                  f"{result['win_rate']:5.1f}% {result['best_trade']:7.2f}% {result['worst_trade']:7.2f}% "
                  f"{result['early_sells']:<7} {result['double_downs']}")
        
        print("-" * 70)
        
        # Load simple strategy results for comparison
        try:
            simple_results = pd.read_csv('multi_year_strategy_results.csv')
            simple_monday = simple_results['monday_to_monday'].values
            
            print(f"\n📊 RSI vs SIMPLE STRATEGY COMPARISON:")
            print("-" * 60)
            print(f"{'Year':<6} {'RSI Best':<12} {'Simple Mon→Mon':<15} {'Difference':<12}")
            print("-" * 60)
            
            for i, year in enumerate(years):
                if i < len(simple_monday) and i < len(best_strategy['yearly_results']):
                    rsi_return = best_strategy['yearly_results'][i]['total_return']
                    simple_return = simple_monday[i]
                    difference = rsi_return - simple_return
                    
                    print(f"{year:<6} {rsi_return:+11.2f}% {simple_return:14.2f}% {difference:+11.2f}%")
            
            # Overall comparison
            simple_compound = 1
            for ret in simple_monday:
                simple_compound *= (1 + ret / 100)
            simple_5year = (simple_compound - 1) * 100
            
            print("-" * 60)
            print(f"5-Year: {best_strategy['compound_return_5years']:+11.2f}% {simple_5year:14.2f}% {best_strategy['compound_return_5years'] - simple_5year:+11.2f}%")
            
        except Exception as e:
            print(f"\n⚠️ Could not load simple strategy results for comparison: {e}")
        
        # Save results
        summary_data = []
        for result in all_results:
            summary_data.append({
                'strategy': result['strategy'],
                'compound_return_5years': result['compound_return_5years'],
                'avg_yearly_return': result['avg_yearly_return'],
                'total_trades': result['total_trades_all_years']
            })
        
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_csv('multi_year_rsi_strategy_summary.csv', index=False)
        
        # Save detailed yearly results for best strategy
        if best_strategy['yearly_results']:
            yearly_df = pd.DataFrame([{
                'year': r['year'],
                'total_trades': r['total_trades'],
                'total_return': r['total_return'],
                'avg_return': r['avg_return'],
                'win_rate': r['win_rate'],
                'best_trade': r['best_trade'],
                'worst_trade': r['worst_trade'],
                'early_sells': r['early_sells'],
                'double_downs': r['double_downs']
            } for r in best_strategy['yearly_results']])
            
            yearly_df.to_csv(f"multi_year_rsi_{best_strategy['strategy'].lower()}_details.csv", index=False)
        
        print(f"\n✅ Results saved:")
        print(f"   - 'multi_year_rsi_strategy_summary.csv' (strategy comparison)")
        print(f"   - 'multi_year_rsi_{best_strategy['strategy'].lower()}_details.csv' (yearly details)")
    
    return all_results

if __name__ == "__main__":
    multi_year_rsi_analysis()