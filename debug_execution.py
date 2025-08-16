#!/usr/bin/env python3
"""
Debug execution logic for YAST backtesting
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

def debug_execution():
    """Debug execution logic."""
    
    print("Debugging YAST Execution Logic...")
    
    # Initialize components
    data_manager = YASTDataManager()
    strategy_engine = YASTStrategyEngine(initial_capital=100000)
    
    # Get test data - use just first few weeks for debugging
    test_data = data_manager.load_ticker_data('AAPW', 'full')
    test_data = test_data.head(20)  # Just first 20 days
    
    print(f"Data shape: {test_data.shape}")
    print(f"Initial capital: {strategy_engine.initial_capital}")
    
    # Debug Buy & Hold execution step by step
    print("\n=== Buy & Hold Strategy Debug ===")
    bh_strategy = strategy_engine.strategies[StrategyType.BUY_HOLD]
    bh_signals = bh_strategy.generate_signals(test_data, 'AAPW')
    
    print("Signals:")
    print(bh_signals[bh_signals['signal'] != 0])
    
    # Manual execution debug
    cash = strategy_engine.initial_capital
    current_position = 0
    current_shares = 0
    pending_entry = None
    
    for i, (date, row) in enumerate(test_data.iterrows()):
        signal = bh_signals.loc[date, 'signal'] if date in bh_signals.index else 0
        current_price = row['Close']
        
        print(f"\nDay {i+1}: {date.strftime('%Y-%m-%d')}")
        print(f"  Price: ${current_price:.2f}")
        print(f"  Signal: {signal}")
        print(f"  Cash: ${cash:.2f}")
        print(f"  Position: {current_position}, Shares: {current_shares}")
        
        if signal == 1 and current_position == 0:
            shares_to_buy = bh_strategy.get_position_size(cash, current_price)
            trade_value = shares_to_buy * current_price
            transaction_cost = trade_value * strategy_engine.transaction_cost_pct
            
            print(f"  BUY SIGNAL:")
            print(f"    Shares to buy: {shares_to_buy}")
            print(f"    Trade value: ${trade_value:.2f}")
            print(f"    Transaction cost: ${transaction_cost:.2f}")
            print(f"    Total cost: ${trade_value + transaction_cost:.2f}")
            print(f"    Can afford: {cash >= trade_value + transaction_cost}")
            
            if shares_to_buy > 0 and cash >= trade_value + transaction_cost:
                pending_entry = {
                    'date': date,
                    'price': current_price,
                    'shares': shares_to_buy,
                    'entry_cost': transaction_cost,
                    'collected_dividends': 0.0
                }
                current_position = 1
                current_shares = shares_to_buy
                cash -= (trade_value + transaction_cost)
                print(f"    EXECUTED BUY: {shares_to_buy} shares at ${current_price:.2f}")
                print(f"    New cash: ${cash:.2f}")
        
        elif signal == -1 and current_position == 1 and pending_entry:
            trade_value = current_shares * current_price
            transaction_cost = trade_value * strategy_engine.transaction_cost_pct
            
            print(f"  SELL SIGNAL:")
            print(f"    Shares to sell: {current_shares}")
            print(f"    Trade value: ${trade_value:.2f}")
            print(f"    Transaction cost: ${transaction_cost:.2f}")
            print(f"    Net proceeds: ${trade_value - transaction_cost:.2f}")
            
            profit = (current_price - pending_entry['price']) * current_shares - pending_entry['entry_cost'] - transaction_cost
            print(f"    Trade profit: ${profit:.2f}")
            
            cash += trade_value - transaction_cost
            current_position = 0
            current_shares = 0
            pending_entry = None
            
            print(f"    EXECUTED SELL: New cash: ${cash:.2f}")
        
        portfolio_value = cash + (current_shares * current_price if current_shares > 0 else 0)
        print(f"  Portfolio value: ${portfolio_value:.2f}")
        
        if i >= 5:  # Just show first few days
            break
    
    print(f"\nFinal cash: ${cash:.2f}")
    print(f"Final portfolio value: ${cash + (current_shares * test_data.iloc[-1]['Close'] if current_shares > 0 else 0):.2f}")
    print(f"Total return: ${cash + (current_shares * test_data.iloc[-1]['Close'] if current_shares > 0 else 0) - strategy_engine.initial_capital:.2f}")

if __name__ == "__main__":
    debug_execution()