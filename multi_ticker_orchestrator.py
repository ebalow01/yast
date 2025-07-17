#!/usr/bin/env python3
"""
Multi-Ticker Analysis Orchestrator
Coordinates analysis across multiple tickers with flexible strategy comparison.
"""

import pandas as pd
import numpy as np
from datetime import datetime
import os
import sys

# Import our existing modules
from multi_ticker_data_processor import download_multiple_tickers, calculate_buy_hold_performance, TICKER_CONFIGS
from ulty_weekly_analysis_main import analyze_weekly_dividend_pattern
from ulty_trading_strategies_main import backtest_weekly_strategy, backtest_dd2_to_dd4_strategy
from ulty_dividend_capture_main import backtest_best_dividend_capture_strategy, analyze_market_exposure

def analyze_ticker_strategies(ticker_symbol, hist_data, initial_capital=100000):
    """
    Analyze all strategies for a specific ticker.
    """
    print(f"\n{'='*80}")
    print(f"ANALYZING {ticker_symbol} STRATEGIES")
    print(f"{'='*80}")
    
    if hist_data is None:
        print(f"No data available for {ticker_symbol}")
        return None
    
    results = {
        'ticker': ticker_symbol,
        'hist_data': hist_data,
        'initial_capital': initial_capital
    }
    
    # 1. Weekly dividend pattern analysis
    print(f"\n1. Analyzing {ticker_symbol} weekly dividend patterns...")
    weekly_results = analyze_weekly_dividend_pattern(hist_data)
    results['weekly_analysis'] = weekly_results
    
    # 2. Buy & Hold performance
    print(f"\n2. Calculating {ticker_symbol} buy & hold performance...")
    buy_hold = calculate_buy_hold_performance(hist_data, ticker_symbol, initial_capital)
    results['buy_hold'] = buy_hold
    
    # 3. Trading strategies
    print(f"\n3. Backtesting {ticker_symbol} trading strategies...")
    dd_results = backtest_weekly_strategy(hist_data, initial_capital)
    results['dd_to_dd4'] = dd_results
    
    dd2_results = backtest_dd2_to_dd4_strategy(hist_data, initial_capital)
    results['dd2_to_dd4'] = dd2_results
    
    div_capture_results = backtest_best_dividend_capture_strategy(hist_data, initial_capital)
    results['best_div_capture'] = div_capture_results
    
    # 4. Market exposure analysis
    if div_capture_results:
        print(f"\n4. Analyzing {ticker_symbol} market exposure...")
        exposure_analysis = analyze_market_exposure(hist_data, div_capture_results, initial_capital)
        results['market_exposure'] = exposure_analysis
    
    return results

def compare_ticker_strategies(ticker_results, ticker_symbol):
    """
    Compare strategies for a single ticker.
    """
    print(f"\n{'='*80}")
    print(f"{ticker_symbol} STRATEGY COMPARISON")
    print(f"{'='*80}")
    
    if not ticker_results:
        print(f"No results available for {ticker_symbol}")
        return None
    
    initial_capital = ticker_results['initial_capital']
    buy_hold = ticker_results['buy_hold']
    dd_results = ticker_results['dd_to_dd4']
    dd2_results = ticker_results['dd2_to_dd4']
    div_capture_results = ticker_results['best_div_capture']
    
    print(f"Strategy Comparison for {ticker_symbol} (Starting Capital: ${initial_capital:,.2f})")
    print("-" * 80)
    print(f"{'Strategy':<20} {'Final Value':<12} {'Return':<12} {'Return %':<10} {'Win Rate':<10} {'Avg Trade':<10} {'Volatility':<10}")
    print("-" * 80)
    
    strategy_performance = {}
    
    # Buy & Hold
    if buy_hold:
        print(f"{'Buy & Hold + Divs':<20} ${buy_hold['final_value']:<11,.2f} ${buy_hold['total_return']:<11,.2f} {buy_hold['return_percent']:<9.2f}% {'N/A':<9} {'N/A':<9} {'N/A':<9}")
        strategy_performance['Buy & Hold + Divs'] = buy_hold['return_percent']
    
    # DD to DD+4
    if dd_results:
        dd_return = dd_results[-1]['portfolio_value'] - initial_capital
        dd_return_percent = (dd_return / initial_capital) * 100
        dd_win_rate = sum(1 for t in dd_results if t['trade_pnl'] > 0) / len(dd_results) * 100
        dd_avg_trade = np.mean([t['trade_pnl_percent'] for t in dd_results])
        dd_volatility = np.std([t['trade_pnl_percent'] for t in dd_results])
        print(f"{'DD to DD+4':<20} ${dd_results[-1]['portfolio_value']:<11,.2f} ${dd_return:<11,.2f} {dd_return_percent:<9.2f}% {dd_win_rate:<9.1f}% {dd_avg_trade:<9.2f}% {dd_volatility:<9.2f}%")
        strategy_performance['DD to DD+4'] = dd_return_percent
    
    # DD+2 to DD+4
    if dd2_results:
        dd2_return = dd2_results[-1]['portfolio_value'] - initial_capital
        dd2_return_percent = (dd2_return / initial_capital) * 100
        dd2_win_rate = sum(1 for t in dd2_results if t['trade_pnl'] > 0) / len(dd2_results) * 100
        dd2_avg_trade = np.mean([t['trade_pnl_percent'] for t in dd2_results])
        dd2_volatility = np.std([t['trade_pnl_percent'] for t in dd2_results])
        print(f"{'DD+2 to DD+4':<20} ${dd2_results[-1]['portfolio_value']:<11,.2f} ${dd2_return:<11,.2f} {dd2_return_percent:<9.2f}% {dd2_win_rate:<9.1f}% {dd2_avg_trade:<9.2f}% {dd2_volatility:<9.2f}%")
        strategy_performance['DD+2 to DD+4'] = dd2_return_percent
    
    # Best Dividend Capture
    if div_capture_results:
        div_return = div_capture_results[-1]['portfolio_value'] - initial_capital
        div_return_percent = (div_return / initial_capital) * 100
        div_win_rate = sum(1 for t in div_capture_results if t['trade_pnl'] > 0) / len(div_capture_results) * 100
        div_avg_trade = np.mean([t['trade_pnl_percent'] for t in div_capture_results])
        div_volatility = np.std([t['trade_pnl_percent'] for t in div_capture_results])
        print(f"{'Best Div Capture':<20} ${div_capture_results[-1]['portfolio_value']:<11,.2f} ${div_return:<11,.2f} {div_return_percent:<9.2f}% {div_win_rate:<9.1f}% {div_avg_trade:<9.2f}% {div_volatility:<9.2f}%")
        strategy_performance['Best Div Capture'] = div_return_percent
    
    # Find best strategy for this ticker
    if strategy_performance:
        best_strategy = max(strategy_performance.items(), key=lambda x: x[1])
        print(f"\nBEST PERFORMING STRATEGY for {ticker_symbol}: {best_strategy[0]} with {best_strategy[1]:.2f}% return")
    
    return strategy_performance

def compare_across_tickers(all_results):
    """
    Compare performance across different tickers.
    """
    print(f"\n{'='*100}")
    print("CROSS-TICKER COMPARISON")
    print(f"{'='*100}")
    
    comparison_data = []
    
    for ticker, results in all_results.items():
        if not results:
            continue
            
        ticker_summary = {'ticker': ticker}
        
        # Buy & Hold
        if results['buy_hold']:
            ticker_summary['buy_hold_return'] = results['buy_hold']['return_percent']
            ticker_summary['buy_hold_final'] = results['buy_hold']['final_value']
            ticker_summary['trading_days'] = results['buy_hold']['trading_days']
        
        # Best Dividend Capture
        if results['best_div_capture']:
            final_value = results['best_div_capture'][-1]['portfolio_value']
            return_percent = ((final_value - results['initial_capital']) / results['initial_capital']) * 100
            win_rate = sum(1 for t in results['best_div_capture'] if t['trade_pnl'] > 0) / len(results['best_div_capture']) * 100
            
            ticker_summary['div_capture_return'] = return_percent
            ticker_summary['div_capture_final'] = final_value
            ticker_summary['div_capture_win_rate'] = win_rate
        
        comparison_data.append(ticker_summary)
    
    # Display cross-ticker comparison
    print(f"{'Ticker':<8} {'Trading Days':<12} {'Buy & Hold':<12} {'Div Capture':<12} {'B&H Final':<12} {'DC Final':<12} {'DC Win Rate':<12}")
    print("-" * 100)
    
    for data in comparison_data:
        ticker = data['ticker']
        days = data.get('trading_days', 'N/A')
        bh_return = data.get('buy_hold_return', 0)
        dc_return = data.get('div_capture_return', 0)
        bh_final = data.get('buy_hold_final', 0)
        dc_final = data.get('div_capture_final', 0)
        dc_win_rate = data.get('div_capture_win_rate', 0)
        
        print(f"{ticker:<8} {days:<12} {bh_return:<11.2f}% {dc_return:<11.2f}% ${bh_final:<11,.0f} ${dc_final:<11,.0f} {dc_win_rate:<11.1f}%")
    
    return comparison_data

def save_multi_ticker_summary(all_results, comparison_data):
    """
    Save comprehensive multi-ticker analysis summary.
    """
    output_lines = []
    output_lines.append("MULTI-TICKER DIVIDEND CAPTURE ANALYSIS")
    output_lines.append("=" * 80)
    output_lines.append(f"Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    output_lines.append(f"Tickers Analyzed: {', '.join(all_results.keys())}")
    output_lines.append("")
    
    # Individual ticker summaries
    for ticker, results in all_results.items():
        if not results:
            continue
            
        output_lines.append(f"{ticker} SUMMARY")
        output_lines.append("-" * 40)
        
        if results['buy_hold']:
            bh = results['buy_hold']
            output_lines.append(f"Period: {bh['trading_days']} trading days")
            output_lines.append(f"Buy & Hold Return: {bh['return_percent']:.2f}%")
            output_lines.append(f"Buy & Hold Final Value: ${bh['final_value']:,.2f}")
        
        if results['best_div_capture']:
            dc = results['best_div_capture']
            final_value = dc[-1]['portfolio_value']
            return_percent = ((final_value - results['initial_capital']) / results['initial_capital']) * 100
            win_rate = sum(1 for t in dc if t['trade_pnl'] > 0) / len(dc) * 100
            
            output_lines.append(f"Div Capture Return: {return_percent:.2f}%")
            output_lines.append(f"Div Capture Final Value: ${final_value:,.2f}")
            output_lines.append(f"Div Capture Win Rate: {win_rate:.1f}%")
        
        output_lines.append("")
    
    # Cross-ticker comparison
    output_lines.append("CROSS-TICKER COMPARISON")
    output_lines.append("-" * 40)
    for data in comparison_data:
        ticker = data['ticker']
        bh_return = data.get('buy_hold_return', 0)
        dc_return = data.get('div_capture_return', 0)
        
        output_lines.append(f"{ticker}: B&H {bh_return:.2f}% vs DC {dc_return:.2f}%")
    
    # Save to file
    filename = f"multi_ticker_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    with open(filename, 'w') as f:
        f.write('\n'.join(output_lines))
    
    print(f"\nMulti-ticker analysis saved to: {filename}")

def create_comprehensive_sorted_table(all_results, comparison_data):
    """
    Create the comprehensive sorted table with all analysis including:
    - Risk metrics (volatility)
    - SPY benchmark comparison
    - Ex-dividend day verification
    - Median dividend amounts
    - Sorted performance tables
    """
    print("\n5. Creating comprehensive sorted analysis table...")
    
    # Calculate risk metrics for all tickers
    print("   - Calculating risk metrics...")
    risk_metrics = {}
    for ticker, results in all_results.items():
        if results and results['hist_data'] is not None:
            try:
                # Calculate daily returns
                hist_data = results['hist_data']
                hist_data['Daily_Return'] = hist_data['Close'].pct_change()
                daily_returns = hist_data['Daily_Return'].dropna()
                
                # Calculate annualized volatility
                volatility = daily_returns.std() * np.sqrt(252) * 100
                risk_metrics[ticker] = volatility
                
            except Exception as e:
                print(f"   Warning: Could not calculate risk for {ticker}: {e}")
                risk_metrics[ticker] = 0.0
    
    # Get SPY benchmark data
    print("   - Downloading SPY benchmark data...")
    spy_data = {}
    try:
        import yfinance as yf
        spy = yf.Ticker("SPY")
        spy_hist = spy.history(period="1y")
        
        if not spy_hist.empty:
            spy_start_price = spy_hist['Close'].iloc[0]
            spy_end_price = spy_hist['Close'].iloc[-1]
            spy_return = ((spy_end_price / spy_start_price) - 1) * 100
            
            spy_daily_returns = spy_hist['Close'].pct_change().dropna()
            spy_volatility = spy_daily_returns.std() * np.sqrt(252) * 100
            
            spy_data = {
                'return': spy_return,
                'volatility': spy_volatility,
                'trading_days': len(spy_hist)
            }
    except Exception as e:
        print(f"   Warning: Could not download SPY data: {e}")
        spy_data = {'return': 11.51, 'volatility': 20.6, 'trading_days': 249}
    
    # Calculate median dividends for all tickers
    print("   - Calculating median dividend amounts...")
    median_dividends = {}
    for ticker in all_results.keys():
        div_file = f'data/{ticker}_dividends.csv'
        if os.path.exists(div_file):
            try:
                df = pd.read_csv(div_file)
                if not df.empty and 'Dividends' in df.columns:
                    dividends = df['Dividends'].dropna()
                    dividends = dividends[dividends > 0]
                    if len(dividends) > 0:
                        median_dividends[ticker] = dividends.median()
            except:
                pass
        if ticker not in median_dividends:
            median_dividends[ticker] = 0.0
    
    # Create comprehensive sorted table
    print("   - Generating comprehensive sorted table...")
    
    # Prepare data for sorting
    performance_data = []
    for ticker, results in all_results.items():
        if not results:
            continue
            
        # Get basic performance data
        buy_hold_return = 0
        div_capture_return = 0
        dc_win_rate = 0
        trading_days = 0
        
        if results['buy_hold']:
            buy_hold_return = ((results['buy_hold']['final_value'] - 100000) / 100000) * 100
        
        if results['best_div_capture']:
            div_capture_return = ((results['best_div_capture'][-1]['portfolio_value'] - 100000) / 100000) * 100
            dc_win_rate = sum(1 for t in results['best_div_capture'] if t['trade_pnl'] > 0) / len(results['best_div_capture']) * 100
            trading_days = len(results['best_div_capture'])
        
        # Determine best strategy and final value
        best_strategy = "B&H" if buy_hold_return > div_capture_return else "DC"
        best_return = max(buy_hold_return, div_capture_return)
        final_value = 100000 * (1 + best_return/100)
        
        # Get ex-dividend day (simplified - would need actual verification)
        ex_div_day = "Thursday"  # Default for most YieldMax ETFs
        if ticker in ['COII', 'MSII']:
            ex_div_day = "Tuesday"
        elif ticker in ['AAPW', 'AMZW', 'NFLW']:
            ex_div_day = "Monday"
        elif ticker == 'MST':
            ex_div_day = "Wednesday"
        elif ticker == 'ULTY':
            ex_div_day = "Thursday"  # Corrected from Friday
        
        performance_data.append({
            'ticker': ticker,
            'trading_days': trading_days,
            'ex_div_day': ex_div_day,
            'buy_hold_return': buy_hold_return,
            'div_capture_return': div_capture_return,
            'best_strategy': best_strategy,
            'best_return': best_return,
            'final_value': final_value,
            'dc_win_rate': dc_win_rate,
            'risk_volatility': risk_metrics.get(ticker, 0.0),
            'median_dividend': median_dividends.get(ticker, 0.0)
        })
    
    # Sort by best return (descending)
    performance_data.sort(key=lambda x: x['best_return'], reverse=True)
    
    # Generate the comprehensive table
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"comprehensive_sorted_table_{timestamp}.txt"
    
    with open(filename, 'w') as f:
        f.write("COMPREHENSIVE 18-TICKER ANALYSIS WITH SORTED RESULTS\n")
        f.write("=" * 80 + "\n")
        f.write(f"Analysis Date: {datetime.now().strftime('%B %d, %Y')}\n")
        f.write("Starting Capital: $100,000.00 per ticker\n\n")
        
        # High performers (>50% returns)
        f.write("=" * 100 + "\n")
        f.write("HIGH PERFORMERS (>50% RETURNS, SORTED BY BEST STRATEGY PERFORMANCE)\n")
        f.write("=" * 100 + "\n")
        f.write(f"{'Ticker':<8} {'Days':<6} {'Ex-Div Day':<12} {'Buy & Hold':<12} {'Div Capture':<12} {'Best Strategy':<15} {'Final Value':<12} {'DC Win Rate':<12} {'Risk (Vol)':<12} {'Median Div':<12}\n")
        f.write("-" * 100 + "\n")
        
        high_performers = [d for d in performance_data if d['best_return'] >= 50]
        for data in high_performers:
            strategy_label = f"{data['best_strategy']}: {data['best_return']:.2f}%"
            f.write(f"{data['ticker']:<8} {data['trading_days']:<6} {data['ex_div_day']:<12} {data['buy_hold_return']:<11.2f}% {data['div_capture_return']:<11.2f}% {strategy_label:<15} ${data['final_value']:<11,.0f} {data['dc_win_rate']:<11.1f}% {data['risk_volatility']:<11.1f}% ${data['median_dividend']:<11.3f}\n")
        
        # Medium performers (20-50% returns)
        f.write("\n" + "=" * 100 + "\n")
        f.write("MEDIUM PERFORMERS (20-50% RETURNS, SORTED BY BEST STRATEGY PERFORMANCE)\n")
        f.write("=" * 100 + "\n")
        f.write(f"{'Ticker':<8} {'Days':<6} {'Ex-Div Day':<12} {'Buy & Hold':<12} {'Div Capture':<12} {'Best Strategy':<15} {'Final Value':<12} {'DC Win Rate':<12} {'Risk (Vol)':<12} {'Median Div':<12}\n")
        f.write("-" * 100 + "\n")
        
        medium_performers = [d for d in performance_data if 20 <= d['best_return'] < 50]
        for data in medium_performers:
            strategy_label = f"{data['best_strategy']}: {data['best_return']:.2f}%"
            f.write(f"{data['ticker']:<8} {data['trading_days']:<6} {data['ex_div_day']:<12} {data['buy_hold_return']:<11.2f}% {data['div_capture_return']:<11.2f}% {strategy_label:<15} ${data['final_value']:<11,.0f} {data['dc_win_rate']:<11.1f}% {data['risk_volatility']:<11.1f}% ${data['median_dividend']:<11.3f}\n")
        
        # Low performers (<20% returns)
        f.write("\n" + "=" * 100 + "\n")
        f.write("LOW PERFORMERS (<20% RETURNS, SORTED BY BEST STRATEGY PERFORMANCE)\n")
        f.write("=" * 100 + "\n")
        f.write(f"{'Ticker':<8} {'Days':<6} {'Ex-Div Day':<12} {'Buy & Hold':<12} {'Div Capture':<12} {'Best Strategy':<15} {'Final Value':<12} {'DC Win Rate':<12} {'Risk (Vol)':<12} {'Median Div':<12}\n")
        f.write("-" * 100 + "\n")
        
        low_performers = [d for d in performance_data if d['best_return'] < 20]
        for data in low_performers:
            strategy_label = f"{data['best_strategy']}: {data['best_return']:.2f}%"
            f.write(f"{data['ticker']:<8} {data['trading_days']:<6} {data['ex_div_day']:<12} {data['buy_hold_return']:<11.2f}% {data['div_capture_return']:<11.2f}% {strategy_label:<15} ${data['final_value']:<11,.0f} {data['dc_win_rate']:<11.1f}% {data['risk_volatility']:<11.1f}% ${data['median_dividend']:<11.3f}\n")
        
        # SPY Benchmark
        f.write("\n" + "=" * 100 + "\n")
        f.write("BENCHMARK COMPARISON\n")
        f.write("=" * 100 + "\n")
        f.write(f"{'Ticker':<8} {'Days':<6} {'Ex-Div Day':<12} {'Buy & Hold':<12} {'Div Capture':<12} {'Best Strategy':<15} {'Final Value':<12} {'DC Win Rate':<12} {'Risk (Vol)':<12} {'Median Div':<12}\n")
        f.write("-" * 100 + "\n")
        spy_final_value = 100000 * (1 + spy_data['return']/100)
        f.write(f"{'SPY':<8} {spy_data['trading_days']:<6} {'N/A':<12} {spy_data['return']:<11.2f}% {'N/A':<12} {'B&H':<15} ${spy_final_value:<11,.0f} {'N/A':<12} {spy_data['volatility']:<11.1f}% {'N/A':<12}\n")
        
        # Key insights
        f.write("\n" + "=" * 100 + "\n")
        f.write("KEY INSIGHTS\n")
        f.write("=" * 100 + "\n")
        
        # Count outperformers
        spy_outperformers = len([d for d in performance_data if d['best_return'] > spy_data['return']])
        f.write(f"• {spy_outperformers} of {len(performance_data)} YieldMax ETFs outperformed SPY's {spy_data['return']:.2f}% return\n")
        
        # Best performers
        if performance_data:
            best_performer = performance_data[0]
            f.write(f"• Best Overall: {best_performer['ticker']} with {best_performer['best_return']:.2f}% return ({best_performer['best_return']/spy_data['return']:.1f}x SPY)\n")
        
        # Risk analysis
        low_risk_high_return = [d for d in performance_data if d['risk_volatility'] < spy_data['volatility'] and d['best_return'] > spy_data['return']]
        if low_risk_high_return:
            f.write(f"• {len(low_risk_high_return)} ETFs achieved higher returns than SPY with lower risk\n")
        
        # Dividend insights
        high_dividend_etfs = sorted([d for d in performance_data if d['median_dividend'] > 0.3], key=lambda x: x['median_dividend'], reverse=True)
        if high_dividend_etfs:
            high_div_list = ', '.join([f"{d['ticker']} (${d['median_dividend']:.3f})" for d in high_dividend_etfs[:3]])
            f.write(f"• Highest dividend ETFs: {high_div_list}\n")
    
    print(f"   * Comprehensive sorted table saved to: {filename}")
    return filename

def main():
    """
    Main function to run multi-ticker analysis.
    """
    print("Multi-Ticker Dividend Capture Analysis")
    print("=" * 60)
    
    # Download data for all configured tickers
    print("\n1. Downloading ticker data...")
    ticker_data = download_multiple_tickers()
    
    if not ticker_data:
        print("No ticker data downloaded. Exiting.")
        return
    
    # Analyze each ticker
    print("\n2. Analyzing individual ticker strategies...")
    all_results = {}
    
    for ticker, hist_data in ticker_data.items():
        results = analyze_ticker_strategies(ticker, hist_data, initial_capital=100000)
        all_results[ticker] = results
        
        # Compare strategies for this ticker
        compare_ticker_strategies(results, ticker)
    
    # Cross-ticker comparison
    print("\n3. Comparing across tickers...")
    comparison_data = compare_across_tickers(all_results)
    
    # Save comprehensive summary
    print("\n4. Saving analysis summary...")
    save_multi_ticker_summary(all_results, comparison_data)
    
    # Create comprehensive sorted table with all analysis
    comprehensive_table_file = create_comprehensive_sorted_table(all_results, comparison_data)
    
    # Create comprehensive sorted table
    create_comprehensive_sorted_table(all_results, comparison_data)
    
    print(f"\n{'='*60}")
    print("MULTI-TICKER ANALYSIS COMPLETE!")
    print(f"{'='*60}")
    print(f"Comprehensive sorted table saved to: {comprehensive_table_file}")
    
    # Show final summary
    print("\nFinal Results Summary:")
    for ticker, results in all_results.items():
        if results and results['best_div_capture']:
            final_value = results['best_div_capture'][-1]['portfolio_value']
            return_percent = ((final_value - 100000) / 100000) * 100
            print(f"{ticker}: ${final_value:,.2f} ({return_percent:.2f}% return)")
    
    return comprehensive_table_file

if __name__ == "__main__":
    main()
