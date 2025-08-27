import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def backtest_thursday_monday_strategy():
    """Backtest buying every Thursday and selling every Monday in 2025"""
    
    # Load the data
    df = pd.read_csv('drip_15min_data.csv')
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Filter for 2025 only
    df_2025 = df[df['timestamp'].dt.year == 2025].copy()
    
    # Add day of week
    df_2025['day_of_week'] = df_2025['timestamp'].dt.day_name()
    df_2025['date'] = df_2025['timestamp'].dt.date
    
    print("DRIP Thursday Buy → Monday Sell Strategy Backtest (2025)")
    print("=" * 80)
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
    
    # Find all Thursdays and following Mondays
    trades = []
    
    for idx, row in daily_data.iterrows():
        if row['day_of_week'] == 'Thursday':
            buy_date = row['date']
            buy_price = row['close']  # Buy at Thursday close
            
            # Find the next Monday
            # Look for the next Monday in the data (should be 4 days later, but account for holidays)
            for future_idx in range(idx + 1, min(idx + 10, len(daily_data))):
                future_row = daily_data.iloc[future_idx]
                if future_row['day_of_week'] == 'Monday':
                    sell_date = future_row['date']
                    sell_price = future_row['open']  # Sell at Monday open
                    
                    # Calculate return
                    return_pct = ((sell_price - buy_price) / buy_price) * 100
                    return_dollar = sell_price - buy_price
                    
                    trades.append({
                        'buy_date': buy_date,
                        'buy_price': buy_price,
                        'sell_date': sell_date,
                        'sell_price': sell_price,
                        'return_dollar': return_dollar,
                        'return_pct': return_pct,
                        'days_held': (sell_date - buy_date).days
                    })
                    break
    
    # Convert to DataFrame
    trades_df = pd.DataFrame(trades)
    
    if len(trades_df) == 0:
        print("No trades found for 2025")
        return
    
    # Calculate cumulative returns
    initial_capital = 10000  # Start with $10,000
    capital = initial_capital
    trades_df['capital'] = 0
    
    for idx, trade in trades_df.iterrows():
        capital = capital * (1 + trade['return_pct'] / 100)
        trades_df.loc[idx, 'capital'] = capital
    
    # Print trade log
    print("📊 TRADE LOG:")
    print("-" * 80)
    print(f"{'Buy Date':<12} {'Buy $':<8} {'Sell Date':<12} {'Sell $':<8} {'Return $':<9} {'Return %':<9} {'Capital'}")
    print("-" * 80)
    
    for _, trade in trades_df.iterrows():
        print(f"{str(trade['buy_date']):<12} ${trade['buy_price']:7.2f} {str(trade['sell_date']):<12} ${trade['sell_price']:7.2f} ${trade['return_dollar']:8.3f} {trade['return_pct']:8.2f}% ${trade['capital']:10.2f}")
    
    print("-" * 80)
    
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
    
    print(f"\n📊 COMPARISON:")
    print("-" * 40)
    print(f"Strategy return: {total_return_pct:.2f}%")
    print(f"Buy & hold return: {buy_hold_return:.2f}%")
    print(f"Outperformance: {total_return_pct - buy_hold_return:.2f}%")
    
    # Monthly breakdown
    trades_df['buy_month'] = pd.to_datetime(trades_df['buy_date']).dt.to_period('M')
    monthly_returns = trades_df.groupby('buy_month')['return_pct'].agg(['mean', 'sum', 'count'])
    
    print(f"\n📅 MONTHLY BREAKDOWN:")
    print("-" * 40)
    print(f"{'Month':<10} {'Trades':<8} {'Avg Return':<12} {'Total Return'}")
    print("-" * 40)
    for month, row in monthly_returns.iterrows():
        print(f"{str(month):<10} {int(row['count']):<8} {row['mean']:11.2f}% {row['sum']:11.2f}%")
    
    # Risk metrics
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
    trades_df.to_csv('thursday_monday_trades_2025.csv', index=False)
    print(f"\n✅ Detailed trade log saved to 'thursday_monday_trades_2025.csv'")
    
    return trades_df

if __name__ == "__main__":
    backtest_thursday_monday_strategy()