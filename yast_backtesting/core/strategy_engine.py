#!/usr/bin/env python3
"""
YAST Backtesting System - Strategy Engine
Unified backtesting engine for all YAST trading strategies.
Provides standardized interface and enhanced analytics.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import warnings
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum

@dataclass
class Trade:
    """Represents a single trade execution."""
    ticker: str
    entry_date: pd.Timestamp
    exit_date: pd.Timestamp
    entry_price: float
    exit_price: float
    shares: float
    dividend_amount: float = 0.0
    transaction_cost: float = 0.0
    trade_type: str = "LONG"
    
    @property
    def capital_gain(self) -> float:
        """Calculate capital gain/loss."""
        return (self.exit_price - self.entry_price) * self.shares
    
    @property
    def total_return(self) -> float:
        """Calculate total return including dividends."""
        return self.capital_gain + self.dividend_amount - self.transaction_cost
    
    @property
    def return_pct(self) -> float:
        """Calculate percentage return."""
        invested_capital = self.entry_price * self.shares
        return (self.total_return / invested_capital) if invested_capital > 0 else 0.0
    
    @property
    def holding_days(self) -> int:
        """Calculate holding period in days."""
        return (self.exit_date - self.entry_date).days

@dataclass
class BacktestResult:
    """Results from a strategy backtest."""
    strategy_name: str
    ticker: str
    start_date: pd.Timestamp
    end_date: pd.Timestamp
    initial_capital: float
    final_capital: float
    trades: List[Trade]
    daily_portfolio_value: pd.Series
    metadata: Dict[str, Any]
    
    @property
    def total_return(self) -> float:
        """Total portfolio return."""
        return self.final_capital - self.initial_capital
    
    @property
    def total_return_pct(self) -> float:
        """Total percentage return."""
        return (self.final_capital / self.initial_capital - 1) if self.initial_capital > 0 else 0.0
    
    @property
    def num_trades(self) -> int:
        """Number of trades executed."""
        return len(self.trades)
    
    @property
    def win_rate(self) -> float:
        """Percentage of winning trades."""
        if not self.trades:
            return 0.0
        winning_trades = sum(1 for trade in self.trades if trade.total_return > 0)
        return winning_trades / len(self.trades)
    
    @property
    def avg_return_per_trade(self) -> float:
        """Average return per trade."""
        if not self.trades:
            return 0.0
        return sum(trade.total_return for trade in self.trades) / len(self.trades)

class StrategyType(Enum):
    """Supported strategy types."""
    BUY_HOLD = "Buy & Hold"
    DIVIDEND_CAPTURE = "Dividend Capture"
    DD_TO_DD4 = "DD to DD+4"
    DD2_TO_DD4 = "DD+2 to DD+4"
    CUSTOM_DIVIDEND = "Custom Dividend Strategy"

class BaseStrategy(ABC):
    """Abstract base class for all trading strategies."""
    
    def __init__(self, name: str, strategy_type: StrategyType):
        self.name = name
        self.strategy_type = strategy_type
        
    @abstractmethod
    def generate_signals(self, data: pd.DataFrame, ticker: str) -> pd.DataFrame:
        """
        Generate trading signals for the strategy.
        
        Args:
            data: Price and dividend data
            ticker: ETF symbol
            
        Returns:
            DataFrame with 'signal' column (1=buy, -1=sell, 0=hold)
        """
        pass
    
    @abstractmethod
    def get_position_size(self, available_capital: float, price: float) -> int:
        """
        Calculate position size based on available capital.
        
        Args:
            available_capital: Available cash
            price: Current price per share
            
        Returns:
            Number of shares to trade
        """
        pass

class BuyHoldStrategy(BaseStrategy):
    """Buy and hold strategy implementation."""
    
    def __init__(self):
        super().__init__("Buy & Hold", StrategyType.BUY_HOLD)
    
    def generate_signals(self, data: pd.DataFrame, ticker: str) -> pd.DataFrame:
        """Generate buy at start, hold throughout, sell at end signals."""
        signals = pd.DataFrame(index=data.index)
        signals['signal'] = 0
        
        if len(data) > 0:
            signals.iloc[0, signals.columns.get_loc('signal')] = 1  # Buy at start
            signals.iloc[-1, signals.columns.get_loc('signal')] = -1  # Sell at end
            
        return signals
    
    def get_position_size(self, available_capital: float, price: float) -> int:
        """Invest all available capital."""
        return int(available_capital / price)

class DividendCaptureStrategy(BaseStrategy):
    """Dividend capture strategy implementation."""
    
    def __init__(self, entry_days_before: int = 2, exit_days_after: int = 1):
        super().__init__("Dividend Capture", StrategyType.DIVIDEND_CAPTURE)
        self.entry_days_before = entry_days_before
        self.exit_days_after = exit_days_after
    
    def generate_signals(self, data: pd.DataFrame, ticker: str) -> pd.DataFrame:
        """Generate signals around dividend dates."""
        signals = pd.DataFrame(index=data.index)
        signals['signal'] = 0
        
        if 'Dividends' not in data.columns:
            return signals
            
        dividend_dates = data[data['Dividends'] > 0].index
        
        for div_date in dividend_dates:
            try:
                entry_date = div_date - pd.Timedelta(days=self.entry_days_before)
                exit_date = div_date + pd.Timedelta(days=self.exit_days_after)
                
                entry_idx = data.index.get_indexer([entry_date], method='ffill')[0]
                exit_idx = data.index.get_indexer([exit_date], method='ffill')[0]
                
                if entry_idx >= 0 and entry_idx < len(signals):
                    signals.iloc[entry_idx, signals.columns.get_loc('signal')] = 1
                    
                if exit_idx >= 0 and exit_idx < len(signals):
                    signals.iloc[exit_idx, signals.columns.get_loc('signal')] = -1
                    
            except (IndexError, KeyError):
                continue
                
        return signals
    
    def get_position_size(self, available_capital: float, price: float) -> int:
        """Invest all available capital for each capture."""
        return int(available_capital / price)

class YASTStrategyEngine:
    """
    Main backtesting engine for YAST strategies.
    """
    
    def __init__(self, initial_capital: float = 100000, transaction_cost_pct: float = 0.0):
        """
        Initialize the strategy engine.
        
        Args:
            initial_capital: Starting capital for backtests
            transaction_cost_pct: Transaction cost as percentage of trade value
        """
        self.initial_capital = initial_capital
        self.transaction_cost_pct = transaction_cost_pct
        
        # Import custom strategy here to avoid circular imports
        try:
            from ..strategies.custom_dividend_strategy import CustomDividendStrategy
            custom_strategy = CustomDividendStrategy()
        except ImportError:
            custom_strategy = None
        
        self.strategies = {
            StrategyType.BUY_HOLD: BuyHoldStrategy(),
            StrategyType.DIVIDEND_CAPTURE: DividendCaptureStrategy()
        }
        
        if custom_strategy:
            self.strategies[StrategyType.CUSTOM_DIVIDEND] = custom_strategy
    
    def add_strategy(self, strategy: BaseStrategy):
        """Add a custom strategy to the engine."""
        self.strategies[strategy.strategy_type] = strategy
    
    def backtest_strategy(self, 
                         strategy_type: StrategyType,
                         data: pd.DataFrame, 
                         ticker: str,
                         start_date: str = None,
                         end_date: str = None) -> BacktestResult:
        """
        Backtest a specific strategy on given data.
        
        Args:
            strategy_type: Type of strategy to test
            data: Price and dividend data
            ticker: ETF symbol
            start_date: Start date for backtest (optional)
            end_date: End date for backtest (optional)
            
        Returns:
            BacktestResult object with detailed results
        """
        if strategy_type not in self.strategies:
            raise ValueError(f"Strategy {strategy_type} not available")
            
        strategy = self.strategies[strategy_type]
        
        if data is None or data.empty:
            raise ValueError("No data provided for backtesting")
        
        if start_date:
            data = data[data.index >= pd.to_datetime(start_date)]
        if end_date:
            data = data[data.index <= pd.to_datetime(end_date)]
            
        if data.empty:
            raise ValueError("No data available for specified date range")
        
        signals = strategy.generate_signals(data, ticker)
        
        # Check if this is a custom strategy that needs special handling
        strategy_name = strategy.name if hasattr(strategy, 'name') else str(strategy.__class__.__name__)
        if "Custom" in strategy_name:
            return self._backtest_custom_strategy(strategy, data, ticker, signals)
        
        # Standard strategy execution
        trades = []
        current_position = 0
        current_shares = 0
        cash = self.initial_capital
        portfolio_values = []
        
        pending_entry = None
        
        for date, row in data.iterrows():
            signal = signals.loc[date, 'signal'] if date in signals.index else 0
            current_price = row['Close']
            dividend = row.get('Dividends', 0)
            
            # Buy signal
            if signal == 1 and current_position == 0:
                shares_to_buy = strategy.get_position_size(cash, current_price)
                if shares_to_buy > 0:
                    trade_value = shares_to_buy * current_price
                    transaction_cost = trade_value * self.transaction_cost_pct
                    
                    if cash >= trade_value + transaction_cost:
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
            
            elif signal == -1 and current_position == 1 and pending_entry:
                trade_value = current_shares * current_price
                transaction_cost = trade_value * self.transaction_cost_pct
                
                # Total dividends collected during holding period
                total_dividends = pending_entry['collected_dividends']
                if dividend > 0:  # Add dividend from exit date if any
                    total_dividends += current_shares * dividend
                
                trade = Trade(
                    ticker=ticker,
                    entry_date=pending_entry['date'],
                    exit_date=date,
                    entry_price=pending_entry['price'],
                    exit_price=current_price,
                    shares=current_shares,
                    dividend_amount=total_dividends,
                    transaction_cost=pending_entry['entry_cost'] + transaction_cost  # Entry + exit costs
                )
                
                trades.append(trade)
                cash += trade_value - transaction_cost  # Dividends already added to cash when received
                current_position = 0
                current_shares = 0
                pending_entry = None
            
            # Collect dividends if holding position  
            elif current_position == 1 and dividend > 0 and pending_entry:
                dividend_amount = current_shares * dividend
                cash += dividend_amount
                pending_entry['collected_dividends'] += dividend_amount
            
            portfolio_value = cash + (current_shares * current_price if current_shares > 0 else 0)
            portfolio_values.append(portfolio_value)
        
        # Handle any open position at the end
        if current_position == 1 and pending_entry:
            final_date = data.index[-1]
            final_price = data.iloc[-1]['Close']
            trade_value = current_shares * final_price
            final_transaction_cost = trade_value * self.transaction_cost_pct
            
            final_trade = Trade(
                ticker=ticker,
                entry_date=pending_entry['date'],
                exit_date=final_date,
                entry_price=pending_entry['price'],
                exit_price=final_price,
                shares=current_shares,
                dividend_amount=pending_entry['collected_dividends'],
                transaction_cost=pending_entry['entry_cost'] + final_transaction_cost
            )
            
            trades.append(final_trade)
            cash += trade_value - final_transaction_cost
            
            # Update final portfolio value
            portfolio_values[-1] = cash
        
        daily_portfolio_value = pd.Series(portfolio_values, index=data.index)
        final_capital = portfolio_values[-1] if portfolio_values else self.initial_capital
        
        metadata = {
            'transaction_cost_pct': self.transaction_cost_pct,
            'strategy_params': {
                'name': strategy.name,
                'type': strategy.strategy_type.value
            }
        }
        
        if isinstance(strategy, DividendCaptureStrategy):
            metadata['strategy_params'].update({
                'entry_days_before': strategy.entry_days_before,
                'exit_days_after': strategy.exit_days_after
            })
        
        return BacktestResult(
            strategy_name=strategy.name,
            ticker=ticker,
            start_date=data.index[0] if not data.empty else None,
            end_date=data.index[-1] if not data.empty else None,
            initial_capital=self.initial_capital,
            final_capital=final_capital,
            trades=trades,
            daily_portfolio_value=daily_portfolio_value,
            metadata=metadata
        )
    
    def compare_strategies(self, 
                          data: pd.DataFrame, 
                          ticker: str,
                          strategies: List[StrategyType] = None,
                          start_date: str = None,
                          end_date: str = None) -> Dict[str, BacktestResult]:
        """
        Compare multiple strategies on the same data.
        
        Args:
            data: Price and dividend data
            ticker: ETF symbol
            strategies: List of strategies to compare (defaults to all)
            start_date: Start date for comparison
            end_date: End date for comparison
            
        Returns:
            Dictionary mapping strategy names to BacktestResult objects
        """
        if strategies is None:
            strategies = list(self.strategies.keys())
        
        results = {}
        
        for strategy_type in strategies:
            try:
                result = self.backtest_strategy(
                    strategy_type=strategy_type,
                    data=data,
                    ticker=ticker,
                    start_date=start_date,
                    end_date=end_date
                )
                results[strategy_type.value] = result
                
            except Exception as e:
                warnings.warn(f"Error backtesting {strategy_type.value} for {ticker}: {str(e)}")
                continue
        
        return results
    
    def get_strategy_summary(self, results: Dict[str, BacktestResult]) -> pd.DataFrame:
        """
        Create a summary comparison of strategy results.
        
        Args:
            results: Dictionary of strategy results
            
        Returns:
            DataFrame with strategy comparison metrics
        """
        summary_data = []
        
        for strategy_name, result in results.items():
            summary_data.append({
                'Strategy': strategy_name,
                'Total_Return_Pct': result.total_return_pct * 100,
                'Total_Return_Dollar': result.total_return,
                'Final_Capital': result.final_capital,
                'Num_Trades': result.num_trades,
                'Win_Rate_Pct': result.win_rate * 100,
                'Avg_Return_Per_Trade': result.avg_return_per_trade,
                'Start_Date': result.start_date,
                'End_Date': result.end_date
            })
        
        return pd.DataFrame(summary_data)
    
    def _backtest_custom_strategy(self, 
                                 strategy, 
                                 data: pd.DataFrame, 
                                 ticker: str,
                                 signals: pd.DataFrame) -> BacktestResult:
        """
        Backtest custom dividend strategy with partial position building.
        """
        trades = []
        current_position = 0  # 0 = no position, 0.5 = half position, 1 = full position
        current_shares = 0
        cash = self.initial_capital
        portfolio_values = []
        
        active_positions = []  # Track multiple partial entries
        
        for date, row in data.iterrows():
            signal = signals.loc[date, 'signal'] if date in signals.index else 0
            signal_type = signals.loc[date, 'signal_type'] if 'signal_type' in signals.columns and date in signals.index else ''
            current_price = row['Close']
            dividend = row.get('Dividends', 0)
            
            # Handle buy signals (0.5 for half position, 1.0 for full position)
            if signal > 0:
                # Determine position size based on signal strength
                if signal == 0.5:  # Half position
                    target_shares = int((cash * 0.5) / current_price)
                elif signal == 1.0:  # Full position (shouldn't happen in custom strategy)
                    target_shares = int(cash / current_price)
                else:  # Fractional signal
                    target_shares = int((cash * signal) / current_price)
                
                if target_shares > 0 and cash >= target_shares * current_price:
                    trade_value = target_shares * current_price
                    transaction_cost = trade_value * self.transaction_cost_pct
                    
                    # Create position entry
                    position_entry = {
                        'entry_date': date,
                        'entry_price': current_price,
                        'shares': target_shares,
                        'entry_cost': transaction_cost,
                        'collected_dividends': 0.0,
                        'signal_type': signal_type
                    }
                    
                    active_positions.append(position_entry)
                    current_shares += target_shares
                    current_position = min(1.0, current_position + signal)  # Cap at 1.0
                    cash -= (trade_value + transaction_cost)
            
            # Handle sell signal (exit all positions)
            elif signal == -1 and active_positions:
                total_exit_value = 0
                total_dividends = 0
                total_transaction_costs = 0
                
                # Close all active positions as separate trades
                for position in active_positions:
                    shares = position['shares']
                    exit_value = shares * current_price
                    exit_transaction_cost = exit_value * self.transaction_cost_pct
                    
                    trade = Trade(
                        ticker=ticker,
                        entry_date=position['entry_date'],
                        exit_date=date,
                        entry_price=position['entry_price'],
                        exit_price=current_price,
                        shares=shares,
                        dividend_amount=position['collected_dividends'],
                        transaction_cost=position['entry_cost'] + exit_transaction_cost
                    )
                    
                    trades.append(trade)
                    total_exit_value += exit_value
                    total_dividends += position['collected_dividends']
                    total_transaction_costs += exit_transaction_cost
                
                # Update cash and reset positions
                cash += total_exit_value - total_transaction_costs
                current_shares = 0
                current_position = 0
                active_positions = []
            
            # Collect dividends for all active positions
            elif dividend > 0 and active_positions:
                dividend_amount = current_shares * dividend
                cash += dividend_amount
                
                # Distribute dividends proportionally to positions
                for position in active_positions:
                    position_dividend = position['shares'] * dividend
                    position['collected_dividends'] += position_dividend
            
            portfolio_value = cash + (current_shares * current_price if current_shares > 0 else 0)
            portfolio_values.append(portfolio_value)
        
        # Handle any remaining open positions at the end
        if active_positions:
            final_date = data.index[-1]
            final_price = data.iloc[-1]['Close']
            
            for position in active_positions:
                shares = position['shares']
                exit_value = shares * final_price
                exit_transaction_cost = exit_value * self.transaction_cost_pct
                
                final_trade = Trade(
                    ticker=ticker,
                    entry_date=position['entry_date'],
                    exit_date=final_date,
                    entry_price=position['entry_price'],
                    exit_price=final_price,
                    shares=shares,
                    dividend_amount=position['collected_dividends'],
                    transaction_cost=position['entry_cost'] + exit_transaction_cost
                )
                
                trades.append(final_trade)
                cash += exit_value - exit_transaction_cost
            
            # Update final portfolio value
            portfolio_values[-1] = cash
        
        daily_portfolio_value = pd.Series(portfolio_values, index=data.index)
        final_capital = portfolio_values[-1] if portfolio_values else self.initial_capital
        
        metadata = {
            'transaction_cost_pct': self.transaction_cost_pct,
            'strategy_params': {
                'name': strategy.name,
                'type': 'Custom Dividend Strategy',
                'description': 'Buy 1/2 on ex-date-2, buy other 1/2 if price lower/equal on ex-date-1'
            }
        }
        
        return BacktestResult(
            strategy_name=strategy.name,
            ticker=ticker,
            start_date=data.index[0] if not data.empty else None,
            end_date=data.index[-1] if not data.empty else None,
            initial_capital=self.initial_capital,
            final_capital=final_capital,
            trades=trades,
            daily_portfolio_value=daily_portfolio_value,
            metadata=metadata
        )