#!/usr/bin/env python3
"""
Quick test of YAST backtesting core functionality
"""

import pandas as pd
import numpy as np
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from yast_backtesting.core import (
    YASTDataManager, 
    YASTStrategyEngine, 
    StrategyType
)

def test_core_functionality():
    """Test core backtesting functionality with minimal data."""
    
    print("Testing YAST Backtesting Core...")
    
    # Initialize components
    data_manager = YASTDataManager()
    strategy_engine = YASTStrategyEngine(initial_capital=100000)
    
    # Find a ticker with good data
    available_tickers = data_manager.get_available_tickers()
    print(f"Available tickers: {len(available_tickers)}")
    
    test_ticker = None
    for ticker in available_tickers:
        try:
            data = data_manager.load_ticker_data(ticker, 'full')
            if data is not None and len(data) > 50:  # Need enough data
                dividend_count = len(data[data['Dividends'] > 0])
                if dividend_count > 2:  # Need some dividends
                    test_ticker = ticker
                    test_data = data
                    print(f"Using {ticker}: {len(data)} days, {dividend_count} dividends")
                    print(f"Date range: {data.index[0]} to {data.index[-1]}")
                    break
        except Exception as e:
            continue
    
    if test_ticker is None:
        print("No suitable ticker found for testing")
        return False
    
    # Test Buy & Hold strategy
    print("\nTesting Buy & Hold strategy...")
    try:
        bh_result = strategy_engine.backtest_strategy(
            strategy_type=StrategyType.BUY_HOLD,
            data=test_data,
            ticker=test_ticker
        )
        print(f"  Success: {bh_result.num_trades} trades, {bh_result.total_return_pct:.2%} return")
        
    except Exception as e:
        print(f"  Error: {e}")
        return False
    
    # Test Dividend Capture strategy  
    print("\nTesting Dividend Capture strategy...")
    try:
        dc_result = strategy_engine.backtest_strategy(
            strategy_type=StrategyType.DIVIDEND_CAPTURE,
            data=test_data,
            ticker=test_ticker
        )
        print(f"  Success: {dc_result.num_trades} trades, {dc_result.total_return_pct:.2%} return")
        
    except Exception as e:
        print(f"  Error: {e}")
        return False
    
    # Test strategy comparison
    print("\nTesting strategy comparison...")
    try:
        results = strategy_engine.compare_strategies(
            data=test_data,
            ticker=test_ticker,
            strategies=[StrategyType.BUY_HOLD, StrategyType.DIVIDEND_CAPTURE]
        )
        print(f"  Success: Compared {len(results)} strategies")
        
        summary = strategy_engine.get_strategy_summary(results)
        print("  Strategy Summary:")
        print(summary[['Strategy', 'Total_Return_Pct', 'Num_Trades']])
        
    except Exception as e:
        print(f"  Error: {e}")
        return False
    
    print("\n+ All core tests passed!")
    return True

if __name__ == "__main__":
    try:
        success = test_core_functionality()
        if success:
            print("\n[SUCCESS] YAST Backtesting System is working correctly!")
        else:
            print("\n[FAILED] Tests failed - check implementation")
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()