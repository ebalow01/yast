#!/usr/bin/env python3
"""
Custom Dividend Strategy - User's Proven Strategy
Buy 1/2 on ex-date - 2, then if price is lower or close on ex-date - 1, buy the other half
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from yast_backtesting.core.strategy_engine import BaseStrategy, StrategyType

class CustomDividendStrategy(BaseStrategy):
    """
    User's proven custom dividend strategy:
    - Buy 1/2 position on ex-dividend date - 2
    - If price is lower or equal on ex-dividend date - 1, buy other 1/2
    - Exit 1 day after ex-dividend date
    """
    
    def __init__(self, exit_days_after: int = 1):
        super().__init__("Custom Dividend Strategy", StrategyType.DIVIDEND_CAPTURE)
        self.exit_days_after = exit_days_after
    
    def generate_signals(self, data: pd.DataFrame, ticker: str) -> pd.DataFrame:
        """Generate signals for the custom dividend strategy."""
        signals = pd.DataFrame(index=data.index)
        signals['signal'] = 0.0  # Use float type to support fractional signals
        signals['signal_type'] = ''  # Track what type of signal this is
        
        if 'Dividends' not in data.columns:
            return signals
            
        dividend_dates = data[data['Dividends'] > 0].index
        
        for div_date in dividend_dates:
            try:
                # Calculate key dates
                entry_date_1 = div_date - pd.Timedelta(days=2)  # Ex-date - 2
                entry_date_2 = div_date - pd.Timedelta(days=1)  # Ex-date - 1
                exit_date = div_date + pd.Timedelta(days=self.exit_days_after)  # Ex-date + 1
                
                # Find actual trading dates (forward fill to next available day)
                entry_idx_1 = data.index.get_indexer([entry_date_1], method='ffill')[0]
                entry_idx_2 = data.index.get_indexer([entry_date_2], method='ffill')[0]
                exit_idx = data.index.get_indexer([exit_date], method='ffill')[0]
                
                # First entry signal (buy 1/2 position)
                if entry_idx_1 >= 0 and entry_idx_1 < len(signals):
                    actual_entry_date_1 = data.index[entry_idx_1]
                    signals.loc[actual_entry_date_1, 'signal'] = 0.5  # Buy half position
                    signals.loc[actual_entry_date_1, 'signal_type'] = 'first_entry'
                
                # Second entry signal (conditional buy other 1/2)
                if entry_idx_2 >= 0 and entry_idx_2 < len(signals) and entry_idx_1 >= 0:
                    actual_entry_date_2 = data.index[entry_idx_2]
                    
                    # Check if price is lower or equal compared to first entry day
                    if entry_idx_1 < len(data) and entry_idx_2 < len(data):
                        price_1 = data.iloc[entry_idx_1]['Close']
                        price_2 = data.iloc[entry_idx_2]['Close']
                        
                        if price_2 <= price_1:  # Price is lower or equal
                            signals.loc[actual_entry_date_2, 'signal'] = 0.5  # Buy other half
                            signals.loc[actual_entry_date_2, 'signal_type'] = 'second_entry'
                
                # Exit signal
                if exit_idx >= 0 and exit_idx < len(signals):
                    actual_exit_date = data.index[exit_idx]
                    signals.loc[actual_exit_date, 'signal'] = -1  # Sell all
                    signals.loc[actual_exit_date, 'signal_type'] = 'exit'
                    
            except (IndexError, KeyError) as e:
                continue
                
        return signals
    
    def get_position_size(self, available_capital: float, price: float) -> int:
        """Calculate position size for custom strategy."""
        # This will be used for each signal, so the signal magnitude (0.5 or 1.0) 
        # will determine the actual position size
        return int(available_capital / price)

# Add the new strategy type to the enum (we'll need to register this)
class CustomStrategyType:
    CUSTOM_DIVIDEND = "Custom Dividend Strategy"