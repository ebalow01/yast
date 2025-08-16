#!/usr/bin/env python3
"""
Example: How to use your custom dividend strategy
"""

import pandas as pd
from yast_backtesting.core import (
    YASTDataManager, 
    YASTStrategyEngine, 
    StrategyType,
    YASTPerformanceAnalyzer
)

# Initialize the system
data_manager = YASTDataManager()
strategy_engine = YASTStrategyEngine(initial_capital=100000)
performance_analyzer = YASTPerformanceAnalyzer()

# Test on a specific ticker
ticker = 'YMAX'  # Or any ticker you want
data = data_manager.load_ticker_data(ticker, 'full')

print(f"Testing Custom Strategy on {ticker}")
print(f"Data: {len(data)} days, {len(data[data['Dividends'] > 0])} dividends")

# Run your custom strategy
result = strategy_engine.backtest_strategy(
    strategy_type=StrategyType.CUSTOM_DIVIDEND,
    data=data,
    ticker=ticker
)

print(f"\nResults:")
print(f"Total Return: {result.total_return_pct:.2%}")
print(f"Number of Trades: {result.num_trades}")
print(f"Win Rate: {result.win_rate:.1%}")

# Get detailed metrics
metrics = performance_analyzer.analyze_backtest_result(result)
print(f"Annualized Return: {metrics.annualized_return:.2%}")
print(f"Sharpe Ratio: {metrics.sharpe_ratio:.2f}")
print(f"Max Drawdown: {metrics.max_drawdown:.2%}")

# Show individual trades
print(f"\nFirst 5 trades:")
for i, trade in enumerate(result.trades[:5]):
    profit_loss = "PROFIT" if trade.total_return > 0 else "LOSS"
    print(f"Trade {i+1}: {trade.entry_date.strftime('%m/%d')} → {trade.exit_date.strftime('%m/%d')}")
    print(f"  {trade.shares} shares, ${trade.total_return:.2f} ({trade.return_pct:.2%}) {profit_loss}")