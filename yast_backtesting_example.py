#!/usr/bin/env python3
"""
YAST Backtesting System - Example Usage
=======================================

Demonstrates how to use the YAST backtesting system to analyze strategies
and optimize portfolios. This example integrates with your existing data
without modifying the original YAST system.

Usage:
    python yast_backtesting_example.py

Requirements:
    - Existing YAST data in data/ directory
    - pandas, numpy, scipy
"""

import pandas as pd
import numpy as np
from datetime import datetime
import warnings
import sys
import os

# Add the current directory to Python path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from yast_backtesting.core import (
    YASTDataManager, 
    YASTStrategyEngine, 
    YASTPortfolioOptimizer,
    YASTPerformanceAnalyzer,
    StrategyType,
    PortfolioETF
)

def main():
    """Main demonstration of YAST backtesting capabilities."""
    
    print("YAST Backtesting System - Example Usage")
    print("=" * 50)
    
    # Initialize core components
    print("\n1. Initializing backtesting components...")
    data_manager = YASTDataManager()
    strategy_engine = YASTStrategyEngine(initial_capital=100000)
    portfolio_optimizer = YASTPortfolioOptimizer()
    performance_analyzer = YASTPerformanceAnalyzer()
    
    # Get available tickers
    available_tickers = data_manager.get_available_tickers()
    print(f"Found {len(available_tickers)} tickers with data: {', '.join(available_tickers[:5])}...")
    
    if not available_tickers:
        print("ERROR: No ticker data found. Please ensure data files exist in the data/ directory.")
        return
    
    # Demonstrate data analysis
    print("\n2. Data Summary Analysis...")
    data_summary = data_manager.get_data_summary()
    print(data_summary[['Ticker', 'Days_Available', 'Dividend_Count', 'Current_45Day_Vol', 'Data_Valid']].head())
    
    # Pick a sample ticker with valid data for detailed analysis
    sample_ticker = None
    for ticker in available_tickers:
        test_data = data_manager.load_ticker_data(ticker, 'full')
        if test_data is not None and not test_data.empty and len(test_data) > 30:
            sample_ticker = ticker
            break
    
    if not sample_ticker:
        print("No valid ticker found for analysis.")
        return
        
    print(f"\n3. Analyzing strategies for {sample_ticker}...")
    
    # Load data for sample ticker
    ticker_data = data_manager.load_ticker_data(sample_ticker, 'full')
    if ticker_data is None or ticker_data.empty:
        print(f"No data available for {sample_ticker}")
        return
    
    print(f"Data range: {ticker_data.index[0].strftime('%Y-%m-%d')} to {ticker_data.index[-1].strftime('%Y-%m-%d')}")
    
    # Test multiple strategies including your custom strategy
    strategies_to_test = [StrategyType.BUY_HOLD, StrategyType.DIVIDEND_CAPTURE, StrategyType.CUSTOM_DIVIDEND]
    strategy_results = {}
    
    for strategy_type in strategies_to_test:
        try:
            print(f"  Testing {strategy_type.value}...")
            result = strategy_engine.backtest_strategy(
                strategy_type=strategy_type,
                data=ticker_data,
                ticker=sample_ticker
            )
            strategy_results[strategy_type.value] = result
            
            print(f"    Total Return: {result.total_return_pct:.1%}")
            print(f"    Number of Trades: {result.num_trades}")
            print(f"    Win Rate: {result.win_rate:.1%}")
            
        except Exception as e:
            print(f"    Error testing {strategy_type.value}: {str(e)}")
    
    # Performance Analysis
    if strategy_results:
        print("\n4. Performance Analysis...")
        
        # Analyze best performing strategy
        best_strategy_name = max(strategy_results.keys(), 
                               key=lambda x: strategy_results[x].total_return_pct)
        best_result = strategy_results[best_strategy_name]
        
        print(f"Best performing strategy: {best_strategy_name}")
        
        # Detailed performance metrics
        metrics = performance_analyzer.analyze_backtest_result(best_result)
        print(f"  Annualized Return: {metrics.annualized_return:.1%}")
        print(f"  Volatility: {metrics.volatility:.1%}")
        print(f"  Sharpe Ratio: {metrics.sharpe_ratio:.2f}")
        print(f"  Max Drawdown: {metrics.max_drawdown:.1%}")
        
        # Strategy comparison
        comparison = performance_analyzer.compare_strategies(strategy_results)
        print("\n5. Strategy Comparison:")
        print(comparison[['Strategy', 'Total_Return_%', 'Sharpe_Ratio', 'Max_Drawdown_%', 'Win_Rate_%']])
    
    # Portfolio Optimization Demo
    print("\n6. Portfolio Optimization Demo...")
    
    # Prepare ETF data for optimization (using sample of available tickers)
    sample_tickers = available_tickers[:5]  # Use first 5 tickers for demo
    portfolio_etfs = []
    
    for ticker in sample_tickers:
        try:
            ticker_data = data_manager.load_ticker_data(ticker, 'full')
            if ticker_data is None or ticker_data.empty:
                continue
                
            # Calculate simple returns for demo
            daily_returns = ticker_data['Close'].pct_change().dropna()
            if len(daily_returns) < 30:  # Need sufficient data
                continue
                
            annual_return = daily_returns.mean() * 252
            volatility = daily_returns.std() * np.sqrt(252)
            
            # Simulate dividend capture return (for demo purposes)
            dividend_capture_return = annual_return * 1.2  # Assume 20% boost from DC
            
            etf = PortfolioETF(
                ticker=ticker,
                expected_return=annual_return,
                volatility=volatility,
                dividend_capture_return=dividend_capture_return,
                buy_hold_return=annual_return,
                ex_dividend_day='Thursday'  # Default for demo
            )
            portfolio_etfs.append(etf)
            
        except Exception as e:
            print(f"  Error processing {ticker}: {str(e)}")
            continue
    
    if len(portfolio_etfs) >= 2:
        try:
            # Run portfolio optimization
            optimization_result = portfolio_optimizer.optimize_portfolio(
                portfolio_etfs, 
                method='max_sharpe'
            )
            
            print(f"Optimal Portfolio (Max Sharpe):")
            print(f"  Expected Return: {optimization_result.expected_return:.1%}")
            print(f"  Portfolio Volatility: {optimization_result.portfolio_volatility:.1%}")
            print(f"  Sharpe Ratio: {optimization_result.sharpe_ratio:.2f}")
            
            print("  Weights:")
            for ticker, weight in optimization_result.weights.items():
                if weight > 0.01:  # Only show meaningful weights
                    print(f"    {ticker}: {weight:.1%}")
                    
        except Exception as e:
            print(f"  Portfolio optimization error: {str(e)}")
    else:
        print("  Insufficient data for portfolio optimization demo")
    
    # Generate sample report
    if strategy_results:
        print("\n7. Performance Report Sample...")
        
        report = performance_analyzer.generate_performance_report(best_result)
        
        print("Summary:")
        for key, value in report['summary'].items():
            if isinstance(value, (int, float)):
                if 'pct' in key or 'ratio' in key:
                    print(f"  {key}: {value:.2f}")
                else:
                    print(f"  {key}: {value:.0f}")
            else:
                print(f"  {key}: {value}")
    
    print("\n" + "=" * 50)
    print("YAST Backtesting System demonstration complete!")
    print("\nNext steps:")
    print("- Customize strategies in yast_backtesting/strategies/")
    print("- Add validation frameworks in yast_backtesting/validation/")
    print("- Implement Monte Carlo and walk-forward analysis")
    print("- Integrate with existing YAST workflow")

def validate_environment():
    """Validate that the environment is ready for backtesting."""
    try:
        import pandas as pd
        import numpy as np
        from scipy.optimize import minimize
        print("+ Required packages available")
        return True
    except ImportError as e:
        print(f"- Missing required package: {e}")
        return False

if __name__ == "__main__":
    print("Validating environment...")
    if validate_environment():
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", category=RuntimeWarning)
                main()
        except KeyboardInterrupt:
            print("\nOperation cancelled by user.")
        except Exception as e:
            print(f"\nUnexpected error: {str(e)}")
            print("Please check your data files and try again.")
    else:
        print("Environment validation failed. Please install required packages.")
        print("Required: pandas, numpy, scipy")