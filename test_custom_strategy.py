#!/usr/bin/env python3
"""
Test the custom dividend strategy
"""

import pandas as pd
import numpy as np
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from yast_backtesting.core import (
    YASTDataManager, 
    YASTStrategyEngine, 
    StrategyType,
    YASTPerformanceAnalyzer
)

def test_custom_strategy():
    """Test the custom dividend strategy."""
    
    print("Testing Custom Dividend Strategy...")
    print("=" * 50)
    
    # Initialize components
    data_manager = YASTDataManager()
    strategy_engine = YASTStrategyEngine(initial_capital=100000)
    performance_analyzer = YASTPerformanceAnalyzer()
    
    # Get test data
    test_ticker = 'AAPW'  # Known good ticker
    test_data = data_manager.load_ticker_data(test_ticker, 'full')
    
    print(f"Testing with {test_ticker}")
    print(f"Data range: {test_data.index[0]} to {test_data.index[-1]}")
    print(f"Total dividends: {len(test_data[test_data['Dividends'] > 0])}")
    
    # Test all strategies including custom
    strategies_to_test = [
        StrategyType.BUY_HOLD, 
        StrategyType.DIVIDEND_CAPTURE,
        StrategyType.CUSTOM_DIVIDEND
    ]
    
    strategy_results = {}
    
    for strategy_type in strategies_to_test:
        try:
            print(f"\nTesting {strategy_type.value}...")
            result = strategy_engine.backtest_strategy(
                strategy_type=strategy_type,
                data=test_data,
                ticker=test_ticker
            )
            strategy_results[strategy_type.value] = result
            
            print(f"  Total Return: {result.total_return_pct:.2%}")
            print(f"  Number of Trades: {result.num_trades}")
            print(f"  Win Rate: {result.win_rate:.1%}")
            
            # Show some trade details for custom strategy
            if strategy_type == StrategyType.CUSTOM_DIVIDEND and result.trades:
                print(f"  First few trades:")
                for i, trade in enumerate(result.trades[:3]):
                    print(f"    Trade {i+1}: {trade.entry_date.strftime('%Y-%m-%d')} to {trade.exit_date.strftime('%Y-%m-%d')}")
                    print(f"             {trade.shares} shares, ${trade.total_return:.2f} profit, {trade.return_pct:.2%} return")
            
        except Exception as e:
            print(f"  Error testing {strategy_type.value}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Compare all strategies
    if strategy_results:
        print(f"\n" + "=" * 50)
        print("STRATEGY COMPARISON")
        print("=" * 50)
        
        comparison = performance_analyzer.compare_strategies(strategy_results)
        
        # Format and display results
        pd.set_option('display.float_format', '{:.2f}'.format)
        print(comparison[['Strategy', 'Total_Return_%', 'Annualized_Return_%', 'Sharpe_Ratio', 'Max_Drawdown_%', 'Win_Rate_%', 'Num_Trades']])
        
        # Find best strategy
        best_strategy = comparison.loc[comparison['Total_Return_%'].idxmax(), 'Strategy']
        best_return = comparison.loc[comparison['Total_Return_%'].idxmax(), 'Total_Return_%']
        
        print(f"\nBest Performing Strategy: {best_strategy} ({best_return:.2f}% return)")
        
        # Show custom strategy details if it performed well
        if 'Custom Dividend Strategy' in strategy_results:
            custom_result = strategy_results['Custom Dividend Strategy']
            custom_metrics = performance_analyzer.analyze_backtest_result(custom_result)
            
            print(f"\nCustom Strategy Detailed Analysis:")
            print(f"  Annualized Return: {custom_metrics.annualized_return:.2%}")
            print(f"  Volatility: {custom_metrics.volatility:.2%}")
            print(f"  Sharpe Ratio: {custom_metrics.sharpe_ratio:.2f}")
            print(f"  Max Drawdown: {custom_metrics.max_drawdown:.2%}")
            print(f"  Profit Factor: {custom_metrics.profit_factor:.2f}")

if __name__ == "__main__":
    test_custom_strategy()