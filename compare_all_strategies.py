#!/usr/bin/env python3
"""
Compare all strategies on any ticker
"""

from yast_backtesting.core import (
    YASTDataManager, 
    YASTStrategyEngine, 
    StrategyType,
    YASTPerformanceAnalyzer
)

def compare_strategies_on_ticker(ticker_symbol):
    """Compare all strategies on a specific ticker."""
    
    # Initialize
    data_manager = YASTDataManager()
    strategy_engine = YASTStrategyEngine()
    performance_analyzer = YASTPerformanceAnalyzer()
    
    # Load data
    data = data_manager.load_ticker_data(ticker_symbol, 'full')
    if data is None:
        print(f"No data found for {ticker_symbol}")
        return
    
    print(f"Analyzing {ticker_symbol}")
    print(f"Data: {data.index[0].strftime('%Y-%m-%d')} to {data.index[-1].strftime('%Y-%m-%d')}")
    print(f"Dividends: {len(data[data['Dividends'] > 0])}")
    print("-" * 60)
    
    # Test all strategies
    strategies = [
        StrategyType.BUY_HOLD,
        StrategyType.DIVIDEND_CAPTURE, 
        StrategyType.CUSTOM_DIVIDEND
    ]
    
    results = {}
    for strategy in strategies:
        try:
            result = strategy_engine.backtest_strategy(strategy, data, ticker_symbol)
            results[strategy.value] = result
            
            metrics = performance_analyzer.analyze_backtest_result(result)
            
            print(f"{strategy.value:25} | {result.total_return_pct:>7.2%} | {metrics.sharpe_ratio:>6.2f} | {metrics.max_drawdown:>7.2%} | {result.num_trades:>6}")
            
        except Exception as e:
            print(f"{strategy.value:25} | ERROR: {str(e)}")
    
    # Find best strategy
    if results:
        best = max(results.items(), key=lambda x: x[1].total_return_pct)
        print(f"\nBest Strategy: {best[0]} ({best[1].total_return_pct:.2%})")
    
    return results

if __name__ == "__main__":
    print("Strategy Comparison")
    print("=" * 60)
    print(f"{'Strategy':<25} | {'Return':>7} | {'Sharpe':>6} | {'Drawdn':>7} | {'Trades':>6}")
    print("-" * 60)
    
    # Get all available tickers
    data_manager = YASTDataManager()
    tickers_to_test = data_manager.get_available_tickers()
    
    print(f"Testing {len(tickers_to_test)} tickers...")
    print()
    
    for ticker in tickers_to_test:
        try:
            compare_strategies_on_ticker(ticker)
            print()
        except Exception as e:
            print(f"Error with {ticker}: {e}")
            print()