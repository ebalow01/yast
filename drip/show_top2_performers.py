import pandas as pd
import numpy as np
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def show_top2_performers():
    """Extract and display top 2 performers from each strategy"""
    
    # Load the detailed analysis
    df = pd.read_csv('enhanced_analysis_20250903_0749.csv')
    
    print("🏆 TOP 2 INDIVIDUAL PERFORMERS BY STRATEGY:")
    print("=" * 100)
    
    strategies = ['1st_to_2nd', '2nd_to_3rd', '3rd_to_4th', 'last_to_1st']
    strategy_names = {
        '1st_to_2nd': '1ST→2ND MONDAY',
        '2nd_to_3rd': '2ND→3RD MONDAY', 
        '3rd_to_4th': '3RD→4TH MONDAY',
        'last_to_1st': 'LAST→1ST MONDAY'
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
        print(f"\n🎯 {strategy_names[strategy]}:")
        print("=" * 80)
        
        # Collect all performers for this strategy across all variants
        strategy_performers = []
        
        for variant in variants:
            # Get columns for this strategy/variant combination
            test_return_col = f'{strategy}_{variant}_testing_return'
            train_return_col = f'{strategy}_{variant}_training_return'
            
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
                        'testing_return': row[test_return_col],
                        'current_price': row['current_price']
                    })
        
        if strategy_performers:
            # Sort by testing return and get top 2
            strategy_performers.sort(key=lambda x: x['testing_return'], reverse=True)
            top_2 = strategy_performers[:2]
            
            for i, perf in enumerate(top_2, 1):
                rank_prefix = f"#{i}" if i == 1 else f"   #{i}"
                
                print(f"{rank_prefix} {perf['variant_name']:<18} "
                      f"{perf['ticker']:<8} "
                      f"Test: {perf['testing_return']:+8.1f}% "
                      f"Train: {perf['training_return']:+8.1f}% "
                      f"Price: ${perf['current_price']:>8.2f}")
                
                # Add to overall list
                all_performers.append(perf)
            
            print()  # Add space between strategies
    
    # Show overall summary
    testing_returns = [p['testing_return'] for p in all_performers]
    avg_testing = np.mean(testing_returns)
    
    print(f"\n🎯 SUMMARY OF ALL TOP PERFORMERS:")
    print(f"   Total performers shown: {len(all_performers)}")
    print(f"   Average testing return: {avg_testing:+.1f}%")
    print(f"   Best individual performer: {max(testing_returns):+.1f}%")
    print(f"   Range: {min(testing_returns):+.1f}% to {max(testing_returns):+.1f}%")
    
    # Save top performers to CSV
    top_performers_df = pd.DataFrame(all_performers)
    filename = 'top_2_performers_each_strategy_20250903.csv'
    top_performers_df.to_csv(filename, index=False)
    print(f"\n✅ Top performers saved to: {filename}")

if __name__ == "__main__":
    show_top2_performers()