#!/usr/bin/env python3
"""
Compact analysis format for all tickers
"""

import pandas as pd
from yast_backtesting.core import (
    YASTDataManager, 
    YASTStrategyEngine, 
    StrategyType,
    YASTPerformanceAnalyzer
)

def analyze_compact_format():
    """Analyze all tickers with compact output format."""
    
    # Initialize
    data_manager = YASTDataManager()
    strategy_engine = YASTStrategyEngine()
    performance_analyzer = YASTPerformanceAnalyzer()
    
    # Get all tickers
    all_tickers = data_manager.get_available_tickers()
    
    # Results table
    results = []
    
    for ticker in all_tickers:
        try:
            data = data_manager.load_ticker_data(ticker, 'full')
            if data is None or len(data) < 30:
                continue
            
            # Get data info
            date_range = f"{data.index[0].strftime('%m/%d')} - {data.index[-1].strftime('%m/%d')}"
            div_count = len(data[data['Dividends'] > 0])
            
            # Test strategies
            strategy_results = {}
            best_return = 0
            best_strategy = ""
            
            for strategy_type in [StrategyType.BUY_HOLD, StrategyType.DIVIDEND_CAPTURE, StrategyType.CUSTOM_DIVIDEND]:
                try:
                    result = strategy_engine.backtest_strategy(strategy_type, data, ticker)
                    metrics = performance_analyzer.analyze_backtest_result(result)
                    
                    # Short strategy names
                    short_name = {
                        'Buy & Hold': 'B&H',
                        'Dividend Capture': 'DC',
                        'Custom Dividend Strategy': 'Custom'
                    }[strategy_type.value]
                    
                    return_pct = result.total_return_pct * 100
                    strategy_results[short_name] = {
                        'return': return_pct,
                        'sharpe': metrics.sharpe_ratio,
                        'drawdown': metrics.max_drawdown * 100
                    }
                    
                    if return_pct > best_return:
                        best_return = return_pct
                        best_strategy = short_name
                        
                except Exception:
                    continue
            
            if strategy_results:
                results.append({
                    'Ticker': ticker,
                    'Period': date_range,
                    'Divs': div_count,
                    'BH_Ret': strategy_results.get('B&H', {}).get('return', 0),
                    'BH_Sharp': strategy_results.get('B&H', {}).get('sharpe', 0),
                    'BH_DD': strategy_results.get('B&H', {}).get('drawdown', 0),
                    'DC_Ret': strategy_results.get('DC', {}).get('return', 0),
                    'DC_Sharp': strategy_results.get('DC', {}).get('sharpe', 0),
                    'DC_DD': strategy_results.get('DC', {}).get('drawdown', 0),
                    'Cu_Ret': strategy_results.get('Custom', {}).get('return', 0),
                    'Cu_Sharp': strategy_results.get('Custom', {}).get('sharpe', 0),
                    'Cu_DD': strategy_results.get('Custom', {}).get('drawdown', 0),
                    'Best': best_strategy,
                    'Best_Ret': best_return
                })
                
        except Exception as e:
            continue
    
    # Convert to DataFrame and display
    df = pd.DataFrame(results)
    
    print(f"\nStrategy Performance Summary ({len(df)} tickers)")
    print("=" * 120)
    print(f"{'Ticker':<6} {'Period':<11} {'Div':<3} {'B&H %':<6} {'DC %':<6} {'Cust %':<6} {'Best':<6} {'Best %':<7} {'B&H Sharpe':<9} {'DC Sharpe':<8} {'Cust Sharpe':<9}")
    print("-" * 120)
    
    for _, row in df.iterrows():
        print(f"{row['Ticker']:<6} {row['Period']:<11} {row['Divs']:<3.0f} "
              f"{row['BH_Ret']:<6.1f} {row['DC_Ret']:<6.1f} {row['Cu_Ret']:<6.1f} "
              f"{row['Best']:<6} {row['Best_Ret']:<7.1f} "
              f"{row['BH_Sharp']:<9.2f} {row['DC_Sharp']:<8.2f} {row['Cu_Sharp']:<9.2f}")
    
    print("-" * 120)
    
    # Summary stats
    print(f"\nSummary Statistics:")
    print(f"Average Returns: B&H {df['BH_Ret'].mean():.1f}%, DC {df['DC_Ret'].mean():.1f}%, Custom {df['Cu_Ret'].mean():.1f}%")
    print(f"Best Strategy Wins: {df['Best'].value_counts().to_dict()}")
    print(f"Risk (Avg Drawdown): B&H {df['BH_DD'].mean():.1f}%, DC {df['DC_DD'].mean():.1f}%, Custom {df['Cu_DD'].mean():.1f}%")
    
    # Top performers
    print(f"\nTop 5 Performers:")
    top5 = df.nlargest(5, 'Best_Ret')[['Ticker', 'Best', 'Best_Ret']]
    for _, row in top5.iterrows():
        print(f"  {row['Ticker']} ({row['Best']}): {row['Best_Ret']:.1f}%")
    
    return df

if __name__ == "__main__":
    results = analyze_compact_format()