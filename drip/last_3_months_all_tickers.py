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
    # Get all Mondays in the month
    mondays = []
    for n in range(1, 6):  # Max 5 Mondays possible
        monday = get_nth_monday_of_month(year, month, n)
        if monday:
            mondays.append(monday)
    
    return mondays[-1] if mondays else None

def analyze_last_3_months_all_tickers():
    """Analyze last 3 months performance for all 4 tickers with their specific strategies"""
    
    print("🚀 LAST 3 MONTHS PERFORMANCE - ALL TICKERS")
    print("=" * 100)
    print("📅 Analysis Period: May 2025 - July 2025")
    print("📊 Each ticker uses its optimal strategy timing:")
    print("   • DRIP: Last Monday → First Monday (next month)")
    print("   • SMCI: First Monday → Second Monday")  
    print("   • NVDA: Second Monday → Third Monday")
    print("   • CRM: Third Monday → Fourth Monday")
    print("=" * 100)
    
    # Load all datasets
    tickers = {
        'DRIP': {
            'file': 'drip_15min_data.csv',
            'buy_monday': 'last',
            'sell_monday': 'first_next'
        },
        'SMCI': {
            'file': 'smci_15min_data.csv', 
            'buy_monday': 1,
            'sell_monday': 2
        },
        'NVDA': {
            'file': 'nvda_15min_data.csv',
            'buy_monday': 2, 
            'sell_monday': 3
        },
        'CRM': {
            'file': 'crm_15min_data.csv',
            'buy_monday': 3,
            'sell_monday': 4
        }
    }
    
    # Get last 3 complete months (May, June, July 2025)
    target_months = [(2025, 5), (2025, 6), (2025, 7)]
    
    all_results = {}
    
    for ticker, config in tickers.items():
        print(f"\n🏷️  {ticker} ANALYSIS:")
        print("-" * 60)
        
        try:
            # Load data
            df = pd.read_csv(config['file'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], utc=True)
            df['date'] = df['timestamp'].dt.date
            df['year'] = df['timestamp'].dt.year
            df['month'] = df['timestamp'].dt.month
            
            # Get daily closing prices - handle different RSI column names
            rsi_col = 'rsi' if 'rsi' in df.columns else 'rsi_14'
            daily_df = df.groupby('date').agg({
                'close': 'last',
                rsi_col: 'last',
                'year': 'first',
                'month': 'first'
            }).reset_index()
            
            # Rename RSI column to standard name
            daily_df = daily_df.rename(columns={rsi_col: 'rsi'})
            
            trades = []
            
            for year, month in target_months:
                month_name = calendar.month_name[month]
                
                # Determine buy and sell dates based on ticker strategy
                if ticker == 'DRIP':
                    # DRIP: Last Monday of month → First Monday of next month
                    buy_monday = get_last_monday_of_month(year, month)
                    next_month = month + 1 if month < 12 else 1
                    next_year = year if month < 12 else year + 1
                    sell_monday = get_nth_monday_of_month(next_year, next_month, 1)
                else:
                    # Other tickers: nth Monday → (n+1)th Monday
                    buy_monday = get_nth_monday_of_month(year, month, config['buy_monday'])
                    sell_monday = get_nth_monday_of_month(year, month, config['sell_monday'])
                    
                    # If no sell Monday in same month, use first Monday of next month
                    if buy_monday and not sell_monday:
                        next_month = month + 1 if month < 12 else 1
                        next_year = year if month < 12 else year + 1
                        sell_monday = get_nth_monday_of_month(next_year, next_month, 1)
                
                if buy_monday and sell_monday:
                    buy_date = buy_monday.date()
                    sell_date = sell_monday.date()
                    
                    # Find actual trading data
                    buy_data = daily_df[daily_df['date'] >= buy_date].head(1)
                    sell_data = daily_df[daily_df['date'] >= sell_date].head(1)
                    
                    if len(buy_data) > 0 and len(sell_data) > 0:
                        buy_row = buy_data.iloc[0]
                        sell_row = sell_data.iloc[0]
                        
                        buy_price = buy_row['close']
                        sell_price = sell_row['close']
                        buy_rsi = buy_row['rsi']
                        
                        actual_buy_date = buy_row['date']
                        actual_sell_date = sell_row['date']
                        days_held = (actual_sell_date - actual_buy_date).days
                        
                        return_pct = ((sell_price - buy_price) / buy_price) * 100
                        
                        # Apply RSI filtering (skip if RSI > 80 for extreme overbought)
                        skip_reason = ""
                        if pd.notna(buy_rsi) and buy_rsi > 80:
                            skip_reason = "RSI > 80 (overbought)"
                        
                        trade_data = {
                            'month': month_name,
                            'buy_date': actual_buy_date,
                            'sell_date': actual_sell_date,
                            'buy_price': buy_price,
                            'sell_price': sell_price,
                            'buy_rsi': buy_rsi,
                            'return_pct': return_pct,
                            'days_held': days_held,
                            'skip_reason': skip_reason
                        }
                        
                        trades.append(trade_data)
                        
                        # Print individual trade
                        status = "SKIP" if skip_reason else "TRADE"
                        rsi_str = f"{buy_rsi:.1f}" if pd.notna(buy_rsi) else "N/A"
                        
                        if skip_reason:
                            print(f"   {month_name}: SKIP - {skip_reason}")
                        else:
                            color = "✅" if return_pct > 0 else "❌"
                            print(f"   {month_name}: {color} {return_pct:+6.2f}% | RSI: {rsi_str} | ${buy_price:.2f} → ${sell_price:.2f} | {days_held} days")
            
            # Calculate overall performance for executed trades
            executed_trades = [t for t in trades if not t['skip_reason']]
            
            if executed_trades:
                total_return = ((pd.Series([t['return_pct'] for t in executed_trades]) / 100 + 1).prod() - 1) * 100
                win_rate = sum(1 for t in executed_trades if t['return_pct'] > 0) / len(executed_trades) * 100
                avg_return = np.mean([t['return_pct'] for t in executed_trades])
            else:
                total_return = 0
                win_rate = 0
                avg_return = 0
            
            all_results[ticker] = {
                'trades': trades,
                'executed_trades': executed_trades,
                'total_return': total_return,
                'win_rate': win_rate,
                'avg_return': avg_return,
                'trades_executed': len(executed_trades),
                'trades_skipped': len(trades) - len(executed_trades)
            }
            
            print(f"   📊 Summary: {total_return:+.2f}% total | {win_rate:.0f}% win rate | {len(executed_trades)}/3 trades executed")
            
        except Exception as e:
            print(f"   ❌ Error loading {ticker}: {e}")
            all_results[ticker] = {'error': str(e)}
    
    # Overall comparison
    print(f"\n📈 3-MONTH STRATEGY COMPARISON:")
    print("-" * 80)
    print(f"{'Ticker':<8} {'Strategy':<25} {'Return':<10} {'Trades':<8} {'Win%':<6} {'Avg/Trade'}")
    print("-" * 80)
    
    for ticker in ['DRIP', 'SMCI', 'NVDA', 'CRM']:
        if ticker in all_results and 'error' not in all_results[ticker]:
            result = all_results[ticker]
            
            if ticker == 'DRIP':
                strategy_desc = "Last→First Monday"
            elif ticker == 'SMCI':
                strategy_desc = "1st→2nd Monday"
            elif ticker == 'NVDA':
                strategy_desc = "2nd→3rd Monday"
            else:  # CRM
                strategy_desc = "3rd→4th Monday"
            
            print(f"{ticker:<8} {strategy_desc:<25} {result['total_return']:+8.2f}% {result['trades_executed']:<8} {result['win_rate']:4.0f}% {result['avg_return']:+8.2f}%")
        else:
            print(f"{ticker:<8} {'ERROR':<25} {'N/A':<10} {'N/A':<8} {'N/A':<6} {'N/A'}")
    
    print("-" * 80)
    
    # Best performing ticker
    valid_results = {k: v for k, v in all_results.items() if 'error' not in v and v['trades_executed'] > 0}
    if valid_results:
        best_ticker = max(valid_results.keys(), key=lambda x: valid_results[x]['total_return'])
        best_return = valid_results[best_ticker]['total_return']
        print(f"🏆 Best Performer: {best_ticker} ({best_return:+.2f}%)")
    
    # Risk analysis
    print(f"\n⚖️  RISK ANALYSIS:")
    print("-" * 50)
    for ticker, result in valid_results.items():
        if result['trades_executed'] > 0:
            returns = [t['return_pct'] for t in result['executed_trades']]
            volatility = np.std(returns) if len(returns) > 1 else 0
            max_loss = min(returns) if returns else 0
            max_gain = max(returns) if returns else 0
            
            print(f"{ticker}: Volatility: {volatility:.2f}% | Max Loss: {max_loss:+.2f}% | Max Gain: {max_gain:+.2f}%")
    
    # Month-by-month breakdown
    print(f"\n📅 MONTH-BY-MONTH BREAKDOWN:")
    print("-" * 60)
    for month_name in ['May', 'June', 'July']:
        print(f"\n{month_name} 2025:")
        for ticker, result in valid_results.items():
            month_trades = [t for t in result['trades'] if t['month'] == month_name]
            if month_trades:
                trade = month_trades[0]
                if trade['skip_reason']:
                    print(f"  {ticker}: SKIP ({trade['skip_reason']})")
                else:
                    print(f"  {ticker}: {trade['return_pct']:+6.2f}% (RSI: {trade['buy_rsi']:.1f})")
            else:
                print(f"  {ticker}: No trade data")
    
    return all_results

if __name__ == "__main__":
    analyze_last_3_months_all_tickers()