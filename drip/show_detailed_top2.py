import pandas as pd
import numpy as np
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def show_detailed_top2():
    """Show detailed metrics for top 2 performers from each strategy"""
    
    # Load the detailed analysis
    df = pd.read_csv('enhanced_analysis_20250903_0820.csv')
    
    print("🏆 TOP 2 INDIVIDUAL PERFORMERS (DETAILED METRICS):")
    print("=" * 150)
    print(f"{'Rank':<6} {'Strategy':<12} {'Variant':<18} {'Ticker':<8} {'Price':<10} "
          f"{'Train: Ret%':<12} {'WinR%':<8} {'Trades':<8} {'Test: Ret%':<12} {'WinR%':<8} {'Trades':<8}")
    print("-" * 150)
    
    strategies = ['1st_to_2nd', '2nd_to_3rd', '3rd_to_4th', 'last_to_1st']
    strategy_names = {
        '1st_to_2nd': '1ST→2ND',
        '2nd_to_3rd': '2ND→3RD', 
        '3rd_to_4th': '3RD→4TH',
        'last_to_1st': 'LAST→1ST'
    }
    
    variants = ['basic', 'rsi_filter', 'double_down', 'stop_loss']
    variant_names = {
        'basic': 'Basic Strategy',
        'rsi_filter': 'RSI Filter (≤70)',
        'double_down': 'Double Down (Thu)',
        'stop_loss': 'Stop Loss (Thu)'
    }
    
    all_performers = []
    
    for strategy in strategies:
        # Collect all performers for this strategy across all variants
        strategy_performers = []
        
        for variant in variants:
            # Get columns for this strategy/variant combination
            test_return_col = f'{strategy}_{variant}_testing_return'
            train_return_col = f'{strategy}_{variant}_training_return'
            train_win_col = f'{strategy}_{variant}_training_win_rate'
            train_trades_col = f'{strategy}_{variant}_training_trades'
            test_win_col = f'{strategy}_{variant}_testing_win_rate'
            test_trades_col = f'{strategy}_{variant}_testing_trades'
            
            if test_return_col in df.columns:
                # Filter for tickers that have data for this strategy variant
                variant_data = df[df[test_return_col].notna()].copy()
                
                for idx, row in variant_data.iterrows():
                    strategy_performers.append({
                        'ticker': row['ticker'],
                        'strategy': strategy,
                        'variant': variant,
                        'variant_name': variant_names[variant],
                        'training_return': row[train_return_col],
                        'training_win_rate': row.get(train_win_col, 0),
                        'training_trades': row.get(train_trades_col, 0),
                        'testing_return': row[test_return_col],
                        'testing_win_rate': row.get(test_win_col, 0),
                        'testing_trades': row.get(test_trades_col, 0),
                        'current_price': row['current_price']
                    })
        
        if strategy_performers:
            # Sort by testing return and get top 2
            strategy_performers.sort(key=lambda x: x['testing_return'], reverse=True)
            top_2 = strategy_performers[:2]
            
            for i, perf in enumerate(top_2, 1):
                rank_prefix = f"#{i}" if i == 1 else f"   #{i}"
                strategy_display = strategy_names[strategy] if i == 1 else ""
                variant_display = perf['variant_name'] if i == 1 else ""
                
                print(f"{rank_prefix} {strategy_display:<12} {variant_display:<18} "
                      f"{perf['ticker']:<8} ${perf['current_price']:<9.2f} "
                      f"{perf['training_return']:+10.1f}% {perf['training_win_rate']:>6.0f}% {perf['training_trades']:>6.0f}   "
                      f"{perf['testing_return']:+10.1f}% {perf['testing_win_rate']:>6.0f}% {perf['testing_trades']:>6.0f}")
                
                # Add to overall list
                all_performers.append(perf)
            
            print()  # Add space between strategies
    
    # Show overall summary
    testing_returns = [p['testing_return'] for p in all_performers]
    avg_testing = np.mean(testing_returns)
    
    print(f"🎯 SUMMARY OF ALL TOP PERFORMERS:")
    print(f"   Total performers shown: {len(all_performers)}")
    print(f"   Average testing return: {avg_testing:+.1f}%")
    print(f"   Best individual performer: {max(testing_returns):+.1f}%")
    print(f"   Range: {min(testing_returns):+.1f}% to {max(testing_returns):+.1f}%")

if __name__ == "__main__":
    show_detailed_top2()