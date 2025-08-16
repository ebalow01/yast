#!/usr/bin/env python3
"""
Debug signal generation for YAST backtesting
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

def debug_signals():
    """Debug signal generation."""
    
    print("Debugging YAST Signal Generation...")
    
    # Initialize components
    data_manager = YASTDataManager()
    strategy_engine = YASTStrategyEngine(initial_capital=100000)
    
    # Get test data
    test_data = data_manager.load_ticker_data('AAPW', 'full')
    print(f"Data shape: {test_data.shape}")
    print(f"Date range: {test_data.index[0]} to {test_data.index[-1]}")
    print(f"Dividend days: {len(test_data[test_data['Dividends'] > 0])}")
    
    # Test Buy & Hold signals
    print("\n=== Buy & Hold Strategy ===")
    bh_strategy = strategy_engine.strategies[StrategyType.BUY_HOLD]
    bh_signals = bh_strategy.generate_signals(test_data, 'AAPW')
    
    print(f"Signals shape: {bh_signals.shape}")
    print("Non-zero signals:")
    print(bh_signals[bh_signals['signal'] != 0])
    
    # Test Dividend Capture signals
    print("\n=== Dividend Capture Strategy ===")
    dc_strategy = strategy_engine.strategies[StrategyType.DIVIDEND_CAPTURE]
    dc_signals = dc_strategy.generate_signals(test_data, 'AAPW')
    
    print(f"Signals shape: {dc_signals.shape}")
    print("Non-zero signals:")
    print(dc_signals[dc_signals['signal'] != 0])
    
    # Show dividend dates for reference
    print("\n=== Dividend Dates ===")
    dividend_dates = test_data[test_data['Dividends'] > 0]
    print(dividend_dates[['Close', 'Dividends']].head(10))

if __name__ == "__main__":
    debug_signals()