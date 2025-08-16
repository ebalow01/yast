#!/usr/bin/env python3
"""
Analyze all tickers and provide a comprehensive summary
"""

import pandas as pd
from yast_backtesting.core import (
    YASTDataManager, 
    YASTStrategyEngine, 
    StrategyType,
    YASTPerformanceAnalyzer
)

def analyze_all_tickers():
    """Analyze all available tickers and create summary."""
    
    # Initialize
    data_manager = YASTDataManager()
    strategy_engine = YASTStrategyEngine()
    performance_analyzer = YASTPerformanceAnalyzer()
    
    # Get all tickers
    all_tickers = data_manager.get_available_tickers()
    print(f"Analyzing {len(all_tickers)} tickers...")
    print("=" * 80)
    
    # Store results for summary
    all_results = []
    
    # Test each ticker
    for ticker in all_tickers:
        try:
            # Load data
            data = data_manager.load_ticker_data(ticker, 'full')
            if data is None or len(data) < 30:
                continue
            
            # Test each strategy
            ticker_results = {'Ticker': ticker}
            
            for strategy_type in [StrategyType.BUY_HOLD, StrategyType.DIVIDEND_CAPTURE, StrategyType.CUSTOM_DIVIDEND]:
                try:
                    result = strategy_engine.backtest_strategy(strategy_type, data, ticker)
                    metrics = performance_analyzer.analyze_backtest_result(result)
                    
                    # Store key metrics
                    strategy_name = strategy_type.value.replace(' ', '_').replace('&', 'and')
                    ticker_results[f'{strategy_name}_Return'] = result.total_return_pct * 100
                    ticker_results[f'{strategy_name}_Sharpe'] = metrics.sharpe_ratio
                    ticker_results[f'{strategy_name}_Drawdown'] = metrics.max_drawdown * 100
                    ticker_results[f'{strategy_name}_Trades'] = result.num_trades
                    
                except Exception as e:
                    # Handle errors gracefully
                    strategy_name = strategy_type.value.replace(' ', '_').replace('&', 'and')
                    ticker_results[f'{strategy_name}_Return'] = None
                    ticker_results[f'{strategy_name}_Sharpe'] = None
                    ticker_results[f'{strategy_name}_Drawdown'] = None
                    ticker_results[f'{strategy_name}_Trades'] = None
            
            all_results.append(ticker_results)
            print(f"+ {ticker}")
            
        except Exception as e:
            print(f"- {ticker}: {str(e)}")
    
    # Create summary DataFrame
    results_df = pd.DataFrame(all_results)
    
    print("\n" + "=" * 80)
    print("SUMMARY STATISTICS")
    print("=" * 80)
    
    # Strategy comparison
    strategies = ['Buy_and_Hold', 'Dividend_Capture', 'Custom_Dividend_Strategy']
    
    for strategy in strategies:
        print(f"\n{strategy.replace('_', ' ')}:")
        print("-" * 40)
        
        return_col = f'{strategy}_Return'
        sharpe_col = f'{strategy}_Sharpe'
        drawdown_col = f'{strategy}_Drawdown'
        
        if return_col in results_df.columns:
            valid_returns = results_df[return_col].dropna()
            valid_sharpes = results_df[sharpe_col].dropna()
            valid_drawdowns = results_df[drawdown_col].dropna()
            
            print(f"  Average Return: {valid_returns.mean():.2f}%")
            print(f"  Best Return: {valid_returns.max():.2f}% ({results_df.loc[valid_returns.idxmax(), 'Ticker']})")
            print(f"  Worst Return: {valid_returns.min():.2f}% ({results_df.loc[valid_returns.idxmin(), 'Ticker']})")
            print(f"  Average Sharpe: {valid_sharpes.mean():.2f}")
            print(f"  Average Max Drawdown: {valid_drawdowns.mean():.2f}%")
            print(f"  Tickers Tested: {len(valid_returns)}")
    
    # Find best strategy for each ticker
    print("\n" + "=" * 80)
    print("BEST STRATEGY PER TICKER")
    print("=" * 80)
    
    best_strategies = []
    for _, row in results_df.iterrows():
        ticker = row['Ticker']
        
        # Get returns for each strategy
        returns = {}
        for strategy in strategies:
            return_col = f'{strategy}_Return'
            if return_col in row and pd.notna(row[return_col]):
                returns[strategy] = row[return_col]
        
        if returns:
            best_strategy = max(returns.items(), key=lambda x: x[1])
            best_strategies.append({
                'Ticker': ticker,
                'Best_Strategy': best_strategy[0].replace('_', ' '),
                'Return': best_strategy[1]
            })
    
    best_df = pd.DataFrame(best_strategies)
    
    # Count wins per strategy
    strategy_wins = best_df['Best_Strategy'].value_counts()
    print("\nStrategy Win Counts:")
    for strategy, count in strategy_wins.items():
        pct = (count / len(best_df)) * 100
        print(f"  {strategy}: {count} tickers ({pct:.1f}%)")
    
    # Show top performers
    print("\n" + "=" * 80)
    print("TOP 10 PERFORMERS (Any Strategy)")
    print("=" * 80)
    
    top_10 = best_df.nlargest(10, 'Return')
    for _, row in top_10.iterrows():
        print(f"  {row['Ticker']:6} | {row['Best_Strategy']:25} | {row['Return']:>7.2f}%")
    
    # Custom strategy special analysis
    print("\n" + "=" * 80)
    print("CUSTOM STRATEGY RISK ANALYSIS")
    print("=" * 80)
    
    custom_drawdowns = results_df['Custom_Dividend_Strategy_Drawdown'].dropna()
    other_drawdowns = pd.concat([
        results_df['Buy_and_Hold_Drawdown'].dropna(),
        results_df['Dividend_Capture_Drawdown'].dropna()
    ])
    
    print(f"Custom Strategy Average Drawdown: {custom_drawdowns.mean():.2f}%")
    print(f"Other Strategies Average Drawdown: {other_drawdowns.mean():.2f}%")
    print(f"Risk Reduction: {(other_drawdowns.mean() - custom_drawdowns.mean()):.2f}% less drawdown")
    
    # Save results to CSV
    results_df.to_csv('backtesting_results_all_tickers.csv', index=False)
    print(f"\n+ Full results saved to backtesting_results_all_tickers.csv")
    
    return results_df

if __name__ == "__main__":
    results = analyze_all_tickers()