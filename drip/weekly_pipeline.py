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

def get_last_monday_of_month(year, month):
    """Get the last Monday of a given month"""
    mondays = []
    for n in range(1, 6):
        monday = get_nth_monday_of_month(year, month, n)
        if monday:
            mondays.append(monday)
    return mondays[-1] if mondays else None

def execute_strategy_pipeline():
    """Execute weekly compounding pipeline across all 4 strategies"""
    
    print("🔄 WEEKLY COMPOUNDING PIPELINE - ALL STRATEGIES")
    print("=" * 100)
    print("📅 Period: May 2025 → July 2025 (Weekly Execution)")
    print("💰 Starting Capital: $100,000")
    print("🔁 Method: Compound weekly gains across strategies")
    print("📈 Order: SMCI → NVDA → DRIP → CRM (based on 3-month performance)")
    print("=" * 100)
    
    # Load all datasets with proper RSI column handling
    datasets = {}
    for ticker in ['DRIP', 'SMCI', 'NVDA', 'CRM']:
        try:
            if ticker in ['DRIP', 'SMCI']:
                file_name = f'{ticker.lower()}_15min_data.csv'
            else:
                file_name = f'{ticker.lower()}_15min_data.csv'
                
            df = pd.read_csv(file_name)
            df['timestamp'] = pd.to_datetime(df['timestamp'], utc=True)
            df['date'] = df['timestamp'].dt.date
            df['year'] = df['timestamp'].dt.year
            df['month'] = df['timestamp'].dt.month
            df['week'] = df['timestamp'].dt.isocalendar().week
            
            # Handle different RSI column names
            rsi_col = 'rsi' if 'rsi' in df.columns else 'rsi_14'
            df['rsi'] = df[rsi_col]
            
            # Get daily closing prices
            daily_df = df.groupby('date').agg({
                'close': 'last',
                'rsi': 'last',
                'year': 'first',
                'month': 'first',
                'week': 'first'
            }).reset_index()
            
            datasets[ticker] = daily_df
            print(f"✅ Loaded {ticker}: {len(daily_df)} daily records")
            
        except Exception as e:
            print(f"❌ Error loading {ticker}: {e}")
            return
    
    # Define strategy configurations
    strategies = {
        'SMCI': {'buy': 1, 'sell': 2},      # 1st → 2nd Monday
        'NVDA': {'buy': 2, 'sell': 3},      # 2nd → 3rd Monday  
        'DRIP': {'buy': 'last', 'sell': 'first_next'},  # Last → First (next month)
        'CRM': {'buy': 3, 'sell': 4}        # 3rd → 4th Monday
    }
    
    # Get all possible trading weeks in our period
    target_months = [(2025, 5), (2025, 6), (2025, 7)]
    
    # Generate all trading opportunities
    all_trades = []
    
    for ticker, config in strategies.items():
        for year, month in target_months:
            month_name = calendar.month_name[month]
            
            if ticker == 'DRIP':
                # DRIP: Last Monday → First Monday next month
                buy_monday = get_last_monday_of_month(year, month)
                next_month = month + 1 if month < 12 else 1
                next_year = year if month < 12 else year + 1
                sell_monday = get_nth_monday_of_month(next_year, next_month, 1)
            else:
                # Other strategies
                buy_monday = get_nth_monday_of_month(year, month, config['buy'])
                sell_monday = get_nth_monday_of_month(year, month, config['sell'])
                
                # If no sell Monday in same month, use first Monday of next month
                if buy_monday and not sell_monday:
                    next_month = month + 1 if month < 12 else 1
                    next_year = year if month < 12 else year + 1
                    sell_monday = get_nth_monday_of_month(next_year, next_month, 1)
            
            if buy_monday and sell_monday:
                buy_date = buy_monday.date()
                sell_date = sell_monday.date()
                
                # Find actual trading data
                daily_df = datasets[ticker]
                buy_data = daily_df[daily_df['date'] >= buy_date].head(1)
                sell_data = daily_df[daily_df['date'] >= sell_date].head(1)
                
                if len(buy_data) > 0 and len(sell_data) > 0:
                    buy_row = buy_data.iloc[0]
                    sell_row = sell_data.iloc[0]
                    
                    trade = {
                        'ticker': ticker,
                        'month': month_name,
                        'buy_date': buy_row['date'],
                        'sell_date': sell_row['date'],
                        'buy_price': buy_row['close'],
                        'sell_price': sell_row['close'],
                        'buy_rsi': buy_row['rsi'],
                        'return_pct': ((sell_row['close'] - buy_row['close']) / buy_row['close']) * 100,
                        'days_held': (sell_row['date'] - buy_row['date']).days,
                        'trade_start': buy_monday,
                        'trade_end': sell_monday
                    }
                    
                    all_trades.append(trade)
    
    # Sort all trades by start date for pipeline execution
    all_trades.sort(key=lambda x: x['trade_start'])
    
    print(f"\n📋 PIPELINE EXECUTION ORDER:")
    print("-" * 80)
    print(f"{'#':<3} {'Ticker':<6} {'Month':<10} {'Start':<12} {'End':<12} {'RSI':<6} {'Expected Return'}")
    print("-" * 80)
    
    for i, trade in enumerate(all_trades, 1):
        rsi_str = f"{trade['buy_rsi']:.1f}" if pd.notna(trade['buy_rsi']) else "N/A"
        print(f"{i:<3} {trade['ticker']:<6} {trade['month']:<10} {trade['buy_date']!s:<12} "
              f"{trade['sell_date']!s:<12} {rsi_str:<6} {trade['return_pct']:+7.2f}%")
    
    # Execute pipeline with compounding
    starting_capital = 100000
    current_capital = starting_capital
    portfolio_history = [{'step': 0, 'ticker': 'START', 'capital': current_capital, 'return': 0, 'cumulative_return': 0}]
    
    print(f"\n💰 PIPELINE EXECUTION WITH COMPOUNDING:")
    print("-" * 100)
    print(f"{'Step':<5} {'Ticker':<6} {'Trade':<20} {'Capital In':<12} {'Return':<8} {'Capital Out':<12} {'Cumulative'}")
    print("-" * 100)
    
    for i, trade in enumerate(all_trades, 1):
        # Apply RSI filtering (skip if extremely overbought)
        skip_trade = False
        skip_reason = ""
        
        if pd.notna(trade['buy_rsi']) and trade['buy_rsi'] > 80:
            skip_trade = True
            skip_reason = "RSI > 80"
        
        if skip_trade:
            print(f"{i:<5} {trade['ticker']:<6} {'SKIP: ' + skip_reason:<20} ${current_capital:<11,.0f} {'N/A':<8} ${current_capital:<11,.0f} {((current_capital - starting_capital) / starting_capital * 100):+7.1f}%")
            portfolio_history.append({
                'step': i,
                'ticker': trade['ticker'],
                'capital': current_capital,
                'return': 0,
                'cumulative_return': (current_capital - starting_capital) / starting_capital * 100,
                'skipped': True,
                'skip_reason': skip_reason
            })
        else:
            # Execute trade
            return_multiplier = 1 + (trade['return_pct'] / 100)
            new_capital = current_capital * return_multiplier
            profit = new_capital - current_capital
            cumulative_return = (new_capital - starting_capital) / starting_capital * 100
            
            trade_desc = f"{trade['month'][:3]} ({trade['return_pct']:+.1f}%)"
            
            print(f"{i:<5} {trade['ticker']:<6} {trade_desc:<20} ${current_capital:<11,.0f} {trade['return_pct']:+7.2f}% ${new_capital:<11,.0f} {cumulative_return:+7.1f}%")
            
            portfolio_history.append({
                'step': i,
                'ticker': trade['ticker'],
                'capital': new_capital,
                'return': trade['return_pct'],
                'cumulative_return': cumulative_return,
                'skipped': False
            })
            
            current_capital = new_capital
    
    print("-" * 100)
    
    # Final results
    final_profit = current_capital - starting_capital
    final_return = (final_profit / starting_capital) * 100
    
    print(f"\n🎯 FINAL PIPELINE RESULTS:")
    print("-" * 50)
    print(f"Starting Capital:     ${starting_capital:,.0f}")
    print(f"Final Capital:        ${current_capital:,.0f}")
    print(f"Total Profit:         ${final_profit:+,.0f}")
    print(f"Total Return:         {final_return:+.1f}%")
    print(f"Number of Trades:     {len([h for h in portfolio_history[1:] if not h.get('skipped', False)])}")
    print(f"Trades Skipped:       {len([h for h in portfolio_history[1:] if h.get('skipped', False)])}")
    
    # Compare to individual strategies
    print(f"\n📊 COMPARISON TO INDIVIDUAL STRATEGIES:")
    print("-" * 60)
    
    individual_results = {
        'SMCI': 142520,
        'NVDA': 117236, 
        'DRIP': 110699,
        'CRM': 99166
    }
    
    for ticker, value in individual_results.items():
        difference = current_capital - value
        print(f"vs {ticker} only:     ${value:,.0f} | Pipeline {'+' if difference >= 0 else ''}{difference:,.0f}")
    
    # Weekly breakdown
    print(f"\n📅 WEEKLY PERFORMANCE BREAKDOWN:")
    print("-" * 60)
    
    weeks_performance = []
    for i, history in enumerate(portfolio_history[1:], 1):
        if not history.get('skipped', False):
            weeks_performance.append({
                'week': i,
                'ticker': history['ticker'],
                'return': history['return'],
                'capital': history['capital']
            })
    
    if len(weeks_performance) > 1:
        best_week = max(weeks_performance, key=lambda x: x['return'])
        worst_week = min(weeks_performance, key=lambda x: x['return'])
        
        print(f"Best Week:   {best_week['ticker']} Week {best_week['week']} ({best_week['return']:+.2f}%)")
        print(f"Worst Week:  {worst_week['ticker']} Week {worst_week['week']} ({worst_week['return']:+.2f}%)")
        
        returns = [w['return'] for w in weeks_performance]
        avg_return = np.mean(returns)
        volatility = np.std(returns)
        
        print(f"Average Weekly Return: {avg_return:+.2f}%")
        print(f"Weekly Volatility:     {volatility:.2f}%")
        
        if volatility > 0:
            print(f"Risk-Adjusted Return:  {avg_return/volatility:.2f}")
    
    # Save detailed results
    pipeline_df = pd.DataFrame(portfolio_history[1:])  # Skip starting row
    pipeline_df.to_csv('weekly_pipeline_results.csv', index=False)
    print(f"\n✅ Detailed results saved to 'weekly_pipeline_results.csv'")
    
    return current_capital, portfolio_history

if __name__ == "__main__":
    execute_strategy_pipeline()