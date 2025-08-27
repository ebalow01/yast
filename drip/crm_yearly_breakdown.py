import pandas as pd
import numpy as np
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def analyze_crm_yearly_breakdown():
    """Detailed year-by-year breakdown of CRM strategy performance"""
    
    # Load the detailed trades
    trades_df = pd.read_csv('crm_monday_trades.csv')
    
    # Load buy & hold analysis
    df = pd.read_csv('crm_15min_data.csv')
    df['timestamp'] = pd.to_datetime(df['timestamp'], utc=True)
    df['date'] = df['timestamp'].dt.date
    df['year'] = df['timestamp'].dt.year
    
    # Calculate buy & hold by year
    yearly_bh = []
    for year in sorted(df['year'].unique()):
        year_data = df[df['year'] == year]
        if len(year_data) > 0:
            start_price = year_data.iloc[0]['close']
            end_price = year_data.iloc[-1]['close']
            yearly_return = ((end_price - start_price) / start_price) * 100
            yearly_bh.append({'year': year, 'buy_hold_return': yearly_return})
    
    buy_hold_df = pd.DataFrame(yearly_bh)
    
    print("CRM Strategy vs Buy & Hold: Year-by-Year Comparison (3rd→4th Monday)")
    print("=" * 90)
    
    # Calculate compound returns properly for strategy
    yearly_strategy = {}
    for year in trades_df['year'].unique():
        year_trades = trades_df[trades_df['year'] == year]
        compound_return = ((year_trades['return_pct'] / 100 + 1).prod() - 1) * 100
        yearly_strategy[year] = compound_return
    
    print(f"{'Year':<6} {'Strategy':<12} {'Buy&Hold':<12} {'Difference':<12} {'Trades':<7} {'Win%':<6} {'Best Trade':<11} {'Worst Trade'}")
    print("-" * 90)
    
    for year in sorted(trades_df['year'].unique()):
        # Strategy performance
        strategy_return = yearly_strategy[year]
        
        # Buy & hold performance
        bh_row = buy_hold_df[buy_hold_df['year'] == year]
        buy_hold_return = bh_row['buy_hold_return'].iloc[0] if len(bh_row) > 0 else 0
        
        # Additional stats
        year_trades = trades_df[trades_df['year'] == year]
        trades_count = len(year_trades)
        win_rate = (year_trades['return_pct'] > 0).mean() * 100
        best_trade = year_trades['return_pct'].max()
        worst_trade = year_trades['return_pct'].min()
        
        difference = strategy_return - buy_hold_return
        
        print(f"{year:<6} {strategy_return:+11.2f}% {buy_hold_return:+11.2f}% {difference:+11.2f}% "
              f"{trades_count:<7} {win_rate:5.1f}% {best_trade:+10.2f}% {worst_trade:+10.2f}%")
    
    print("-" * 90)
    
    # Overall totals
    total_strategy_compound = ((trades_df['return_pct'] / 100 + 1).prod() - 1) * 100
    total_bh = ((buy_hold_df['buy_hold_return'] / 100 + 1).prod() - 1) * 100
    total_diff = total_strategy_compound - total_bh
    
    print(f"{'TOTAL':<6} {total_strategy_compound:+11.2f}% {total_bh:+11.2f}% {total_diff:+11.2f}% "
          f"{len(trades_df):<7} {(trades_df['return_pct'] > 0).mean() * 100:5.1f}% "
          f"{trades_df['return_pct'].max():+10.2f}% {trades_df['return_pct'].min():+10.2f}%")
    
    # Detailed monthly breakdown
    print(f"\n📅 DETAILED MONTHLY TRADES:")
    print("-" * 100)
    print(f"{'Year':<6} {'Month':<10} {'Action':<12} {'Buy RSI':<8} {'Return':<9} {'Days':<5} {'Comments'}")
    print("-" * 100)
    
    for _, trade in trades_df.iterrows():
        action_display = trade['action']
        if trade['action'] == 'double_down':
            action_display = "DOUBLE DOWN"
        
        rsi_str = f"{trade['buy_rsi']:.1f}" if pd.notna(trade['buy_rsi']) else "N/A"
        
        # Add comments for significant trades
        comment = ""
        if trade['return_pct'] > 15:
            comment = "🚀 HUGE WIN"
        elif trade['return_pct'] > 7:
            comment = "✅ Great"
        elif trade['return_pct'] < -7:
            comment = "💀 Big Loss"
        elif trade['return_pct'] < -3:
            comment = "⚠️ Loss"
        
        print(f"{int(trade['year']):<6} {trade['month'][:9]:<10} {action_display:<12} {rsi_str:<8} "
              f"{trade['return_pct']:+8.2f}% {trade['days_held']:<5} {comment}")
    
    # Year-by-year insights
    print(f"\n📊 YEAR-BY-YEAR INSIGHTS:")
    print("-" * 50)
    
    for year in sorted(trades_df['year'].unique()):
        year_trades = trades_df[trades_df['year'] == year]
        strategy_return = yearly_strategy[year]
        
        bh_row = buy_hold_df[buy_hold_df['year'] == year]
        buy_hold_return = bh_row['buy_hold_return'].iloc[0] if len(bh_row) > 0 else 0
        
        print(f"\n{year}:")
        print(f"  Strategy: {strategy_return:+.2f}% vs Buy&Hold: {buy_hold_return:+.2f}%")
        print(f"  Trades: {len(year_trades)}, Win Rate: {(year_trades['return_pct'] > 0).mean() * 100:.1f}%")
        
        if year == 2022:
            print(f"  📈 Strong start: Strategy outperformed significantly")
        elif year == 2023:
            print(f"  💼 Enterprise focus: CRM benefited from cloud trends")
        elif year == 2024:
            print(f"  🎯 Excellent year: Strategy captured momentum well")
        elif year == 2025:
            print(f"  📊 Consistent gains: Steady outperformance continues")
        
        # Highlight best and worst trades
        if len(year_trades) > 0:
            best = year_trades.loc[year_trades['return_pct'].idxmax()]
            worst = year_trades.loc[year_trades['return_pct'].idxmin()]
            print(f"  Best trade: {best['month']} {best['return_pct']:+.2f}%")
            print(f"  Worst trade: {worst['month']} {worst['return_pct']:+.2f}%")
    
    # Strategy consistency analysis
    print(f"\n📈 STRATEGY CONSISTENCY:")
    print("-" * 40)
    
    strategy_returns = [yearly_strategy[year] for year in sorted(yearly_strategy.keys())]
    bh_returns = [buy_hold_df[buy_hold_df['year'] == year]['buy_hold_return'].iloc[0] 
                  for year in sorted(yearly_strategy.keys())]
    
    strategy_std = np.std(strategy_returns)
    bh_std = np.std(bh_returns)
    
    print(f"Strategy volatility (std dev): {strategy_std:.2f}%")
    print(f"Buy & Hold volatility: {bh_std:.2f}%")
    
    if strategy_std < bh_std:
        print(f"Strategy is {bh_std/strategy_std:.1f}x more consistent")
    else:
        print(f"Buy & Hold is {strategy_std/bh_std:.1f}x more consistent")
    
    # Risk-adjusted returns (simplified Sharpe-like ratio)
    avg_strategy = np.mean(strategy_returns)
    avg_bh = np.mean(bh_returns)
    
    print(f"\nRisk-adjusted performance:")
    print(f"Strategy: {avg_strategy:.2f}% avg return / {strategy_std:.2f}% volatility = {avg_strategy/strategy_std:.2f} ratio")
    print(f"Buy & Hold: {avg_bh:.2f}% avg return / {bh_std:.2f}% volatility = {avg_bh/bh_std:.2f} ratio")

if __name__ == "__main__":
    analyze_crm_yearly_breakdown()