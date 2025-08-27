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

def find_last_thursday(year, month):
    """Find the last Thursday of a given month"""
    last_day = calendar.monthrange(year, month)[1]
    last_date = datetime(year, month, last_day)
    while last_date.weekday() != 3:
        last_date -= timedelta(days=1)
    return last_date.date()

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

def backtest_year_strategies(year, df_year, daily_data, date_to_prices):
    """Backtest all 4 strategies for a given year"""
    
    results = {
        'year': year,
        'buy_hold': 0,
        'weekly_thu_mon': 0,
        'monthly_thu_mon': 0,
        'monday_to_monday': 0,
        'thursday_stop_loss': 0
    }
    
    # Buy and Hold
    if len(df_year) > 0:
        first_price = df_year.iloc[0]['close']
        last_price = df_year.iloc[-1]['close']
        results['buy_hold'] = ((last_price - first_price) / first_price) * 100
    
    # 1. Weekly Thursday -> Monday Strategy
    weekly_trades = []
    for idx, row in daily_data.iterrows():
        if row['day_of_week'] == 'Thursday':
            buy_date = row['date']
            buy_price = row['close']
            
            # Find next Monday
            for future_idx in range(idx + 1, min(idx + 10, len(daily_data))):
                future_row = daily_data.iloc[future_idx]
                if future_row['day_of_week'] == 'Monday':
                    sell_date = future_row['date']
                    sell_price = future_row['open']
                    return_pct = ((sell_price - buy_price) / buy_price) * 100
                    weekly_trades.append(return_pct)
                    break
    
    if weekly_trades:
        # Calculate compound return
        weekly_compound = 1
        for ret in weekly_trades:
            weekly_compound *= (1 + ret / 100)
        results['weekly_thu_mon'] = (weekly_compound - 1) * 100
    
    # 2. Monthly Thursday -> Monday Strategy (last Thursday to first Monday)
    monthly_thu_trades = []
    for month in range(1, 13):
        last_thursday = find_last_thursday(year, month)
        if month < 12:
            first_monday = find_first_monday(year, month + 1)
        else:
            first_monday = find_first_monday(year + 1, 1) if year < 2025 else None
        
        if first_monday and last_thursday in date_to_prices and first_monday in date_to_prices:
            buy_price = date_to_prices[last_thursday]['close']
            sell_price = date_to_prices[first_monday]['open']
            return_pct = ((sell_price - buy_price) / buy_price) * 100
            monthly_thu_trades.append(return_pct)
    
    if monthly_thu_trades:
        monthly_thu_compound = 1
        for ret in monthly_thu_trades:
            monthly_thu_compound *= (1 + ret / 100)
        results['monthly_thu_mon'] = (monthly_thu_compound - 1) * 100
    
    # 3. Monday to Monday Strategy (last Monday to first Monday)
    monday_trades = []
    for month in range(1, 13):
        last_monday = find_last_monday(year, month)
        if month < 12:
            first_monday = find_first_monday(year, month + 1)
        else:
            first_monday = find_first_monday(year + 1, 1) if year < 2025 else None
        
        # Find actual trading days
        actual_buy_date = None
        actual_sell_date = None
        
        for i in range(14):
            check_date = last_monday - timedelta(days=i)
            if check_date in date_to_prices and date_to_prices[check_date]['day_of_week'] == 'Monday':
                actual_buy_date = check_date
                break
        
        if first_monday:
            for i in range(14):
                check_date = first_monday + timedelta(days=i)
                if check_date in date_to_prices and date_to_prices[check_date]['day_of_week'] == 'Monday':
                    actual_sell_date = check_date
                    break
        
        if actual_buy_date and actual_sell_date:
            buy_price = date_to_prices[actual_buy_date]['close']
            sell_price = date_to_prices[actual_sell_date]['open']
            return_pct = ((sell_price - buy_price) / buy_price) * 100
            monday_trades.append(return_pct)
    
    if monday_trades:
        monday_compound = 1
        for ret in monday_trades:
            monday_compound *= (1 + ret / 100)
        results['monday_to_monday'] = (monday_compound - 1) * 100
    
    # 4. Thursday Stop-Loss Strategy
    stop_loss_trades = []
    for month in range(1, 13):
        last_monday = find_last_monday(year, month)
        if month < 12:
            first_monday = find_first_monday(year, month + 1)
        else:
            first_monday = find_first_monday(year + 1, 1) if year < 2025 else None
        
        # Find actual trading days
        actual_buy_date = None
        actual_sell_date = None
        
        for i in range(14):
            check_date = last_monday - timedelta(days=i)
            if check_date in date_to_prices and date_to_prices[check_date]['day_of_week'] == 'Monday':
                actual_buy_date = check_date
                break
        
        if first_monday:
            for i in range(14):
                check_date = first_monday + timedelta(days=i)
                if check_date in date_to_prices and date_to_prices[check_date]['day_of_week'] == 'Monday':
                    actual_sell_date = check_date
                    break
        
        if actual_buy_date and actual_sell_date:
            buy_price = date_to_prices[actual_buy_date]['close']
            normal_sell_price = date_to_prices[actual_sell_date]['open']
            
            # Check for Thursday stop-loss
            thursday_date = find_thursday_after_monday(actual_buy_date, date_to_prices)
            sold_on_thursday = False
            final_sell_price = normal_sell_price
            
            if thursday_date and thursday_date in date_to_prices:
                thursday_price = date_to_prices[thursday_date]['close']
                if thursday_price < buy_price:
                    sold_on_thursday = True
                    final_sell_price = thursday_price
            
            return_pct = ((final_sell_price - buy_price) / buy_price) * 100
            stop_loss_trades.append(return_pct)
    
    if stop_loss_trades:
        stop_loss_compound = 1
        for ret in stop_loss_trades:
            stop_loss_compound *= (1 + ret / 100)
        results['thursday_stop_loss'] = (stop_loss_compound - 1) * 100
    
    return results

def analyze_all_years():
    """Analyze all strategies across all years 2021-2025"""
    
    # Load the data
    df = pd.read_csv('drip_15min_data.csv')
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['day_of_week'] = df['timestamp'].dt.day_name()
    df['date'] = df['timestamp'].dt.date
    df['year'] = df['timestamp'].dt.year
    
    print("DRIP Multi-Year Strategy Analysis (2021-2025)")
    print("=" * 80)
    print("Testing 4 strategies across all available years")
    print()
    
    all_results = []
    years = [2021, 2022, 2023, 2024, 2025]
    
    for year in years:
        df_year = df[df['year'] == year].copy()
        
        if len(df_year) == 0:
            print(f"⚠️ No data available for {year}")
            continue
        
        print(f"📊 Analyzing {year}...")
        print(f"   Data range: {df_year['timestamp'].min()} to {df_year['timestamp'].max()}")
        print(f"   Total records: {len(df_year):,}")
        
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
        
        # Run all strategies
        year_results = backtest_year_strategies(year, df_year, daily_data, date_to_prices)
        all_results.append(year_results)
        
        print(f"   ✅ Completed {year}")
        print()
    
    # Convert to DataFrame for analysis
    results_df = pd.DataFrame(all_results)
    
    # Display results table
    print("📈 YEARLY PERFORMANCE SUMMARY")
    print("=" * 100)
    print(f"{'Year':<6} {'Buy & Hold':<12} {'Weekly Thu→Mon':<15} {'Monthly Thu→Mon':<16} {'Monday→Monday':<14} {'Thu Stop-Loss':<13}")
    print("-" * 100)
    
    for _, row in results_df.iterrows():
        year = int(row['year'])
        print(f"{year:<6} {row['buy_hold']:11.2f}% {row['weekly_thu_mon']:14.2f}% {row['monthly_thu_mon']:15.2f}% {row['monday_to_monday']:13.2f}% {row['thursday_stop_loss']:12.2f}%")
    
    print("-" * 100)
    
    # Calculate summary statistics
    print("\n📊 STRATEGY SUMMARY STATISTICS")
    print("=" * 80)
    
    strategies = ['buy_hold', 'weekly_thu_mon', 'monthly_thu_mon', 'monday_to_monday', 'thursday_stop_loss']
    strategy_names = ['Buy & Hold', 'Weekly Thu→Mon', 'Monthly Thu→Mon', 'Monday→Monday', 'Thu Stop-Loss']
    
    print(f"{'Metric':<20} {'Buy & Hold':<12} {'Weekly':<10} {'Monthly':<10} {'Monday':<10} {'Stop-Loss':<10}")
    print("-" * 80)
    
    # Average returns
    avg_returns = [results_df[strategy].mean() for strategy in strategies]
    print(f"{'Average Return':<20}", end="")
    for i, avg in enumerate(avg_returns):
        print(f"{avg:11.2f}%", end=" ")
    print()
    
    # Best year
    best_years = [results_df[strategy].max() for strategy in strategies]
    print(f"{'Best Year':<20}", end="")
    for i, best in enumerate(best_years):
        print(f"{best:11.2f}%", end=" ")
    print()
    
    # Worst year
    worst_years = [results_df[strategy].min() for strategy in strategies]
    print(f"{'Worst Year':<20}", end="")
    for i, worst in enumerate(worst_years):
        print(f"{worst:11.2f}%", end=" ")
    print()
    
    # Standard deviation (volatility)
    std_devs = [results_df[strategy].std() for strategy in strategies]
    print(f"{'Volatility (Std)':<20}", end="")
    for i, std in enumerate(std_devs):
        print(f"{std:11.2f}%", end=" ")
    print()
    
    # Win rate (years with positive returns)
    win_rates = [(results_df[strategy] > 0).mean() * 100 for strategy in strategies]
    print(f"{'Win Rate':<20}", end="")
    for i, win_rate in enumerate(win_rates):
        print(f"{win_rate:11.1f}%", end=" ")
    print()
    
    # Compound Annual Growth Rate (CAGR) - approximation
    print(f"{'CAGR (approx)':<20}", end="")
    for i, strategy in enumerate(strategies):
        returns = results_df[strategy].values
        compound = 1
        for ret in returns:
            compound *= (1 + ret / 100)
        years_count = len(returns)
        if years_count > 0:
            cagr = ((compound) ** (1/years_count) - 1) * 100
            print(f"{cagr:11.2f}%", end=" ")
        else:
            print(f"{'N/A':>11}", end=" ")
    print()
    
    print("-" * 80)
    
    # Find best performing strategy overall
    total_compound_returns = []
    for strategy in strategies:
        returns = results_df[strategy].values
        compound = 1
        for ret in returns:
            compound *= (1 + ret / 100)
        total_compound_returns.append(compound - 1)
    
    best_strategy_idx = np.argmax(total_compound_returns)
    best_strategy_name = strategy_names[best_strategy_idx]
    best_total_return = total_compound_returns[best_strategy_idx] * 100
    
    print(f"\n🏆 BEST OVERALL STRATEGY: {best_strategy_name}")
    print(f"    Total Compound Return: {best_total_return:.2f}%")
    print(f"    Average Annual Return: {avg_returns[best_strategy_idx]:.2f}%")
    print(f"    Win Rate: {win_rates[best_strategy_idx]:.1f}%")
    
    # Year-by-year winner
    print(f"\n📅 YEAR-BY-YEAR WINNERS:")
    print("-" * 50)
    for _, row in results_df.iterrows():
        year = int(row['year'])
        year_returns = [row[strategy] for strategy in strategies]
        best_idx = np.argmax(year_returns)
        best_name = strategy_names[best_idx]
        best_return = year_returns[best_idx]
        print(f"{year}: {best_name:<15} ({best_return:+7.2f}%)")
    
    # Save detailed results
    results_df.to_csv('multi_year_strategy_results.csv', index=False)
    print(f"\n✅ Detailed results saved to 'multi_year_strategy_results.csv'")
    
    return results_df

if __name__ == "__main__":
    analyze_all_years()