#!/usr/bin/env python3
"""
Fed Rate Cut Strategy - Training/Testing Pipeline
Training: First 3 rate cuts (Dec 2018, Jul 2019, Sep 2019)
Testing: 4th rate cut (Oct 2019)
Strategy: Monday-to-Monday performance following rate cut announcement
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings

warnings.filterwarnings('ignore')

def get_monday_after_date(date_str):
    """Get the Monday on or after the given date"""
    date = pd.to_datetime(date_str)
    # Find the Monday on or after this date
    days_ahead = 0 - date.weekday()  # Monday is 0
    if days_ahead <= 0:  # Target day is today or has already happened this week
        days_ahead += 7
    return date + timedelta(days=days_ahead)

def calculate_monday_to_monday_return(df, ticker, start_monday):
    """Calculate Monday-to-Monday return for a ticker (1 MONTH holding period)"""
    ticker_data = df[df['Ticker'] == ticker].copy()
    ticker_data['Date'] = pd.to_datetime(ticker_data['Date'])
    ticker_data = ticker_data.sort_values('Date')
    
    # Find the Monday entry price (close price on Monday)
    entry_date = start_monday
    entry_data = ticker_data[ticker_data['Date'] == entry_date]
    
    if entry_data.empty:
        # If no data on exact Monday, find closest trading day after
        future_data = ticker_data[ticker_data['Date'] > entry_date]
        if future_data.empty:
            return None, None, None
        entry_data = future_data.iloc[0:1]
        entry_date = entry_data['Date'].iloc[0]
    
    entry_price = entry_data['Close'].iloc[0]
    
    # Find the exit price (close price ~1 MONTH later - approximately 4 weeks)
    exit_target_date = entry_date + timedelta(days=28)  # 4 weeks = 28 days
    
    # Find the Monday on or after the target exit date
    days_ahead = 0 - exit_target_date.weekday()  # Monday is 0
    if days_ahead <= 0:
        days_ahead += 7
    exit_monday = exit_target_date + timedelta(days=days_ahead)
    
    # Look for data on the target Monday
    exit_data = ticker_data[ticker_data['Date'] == exit_monday]
    
    if exit_data.empty:
        # Find closest trading day on or after exit Monday
        future_data = ticker_data[ticker_data['Date'] >= exit_monday]
        if future_data.empty:
            return None, None, None
        exit_data = future_data.iloc[0:1]
        exit_date = exit_data['Date'].iloc[0]
    else:
        exit_date = exit_monday
    
    exit_price = exit_data['Close'].iloc[0]
    
    # Calculate return
    return_pct = ((exit_price / entry_price) - 1) * 100
    
    return return_pct, entry_date, exit_date

def main():
    print("FED RATE CUT STRATEGY - TRAINING/TESTING PIPELINE")
    print("=" * 60)
    print("Strategy: Monday-to-Monday performance following rate cut (1 MONTH hold)")
    print("Training: First 3 cuts | Testing: 4th cut")
    print()
    
    # Load data
    print("Loading data...")
    # Try 300 tickers first, fall back to 200
    data_files = [
        ('fed_300_tickers_data_clean.csv', '300'),
        ('fed_200_tickers_data_clean.csv', '200')
    ]
    
    df = None
    dataset_size = None
    
    for filename, size in data_files:
        try:
            df = pd.read_csv(filename)
            dataset_size = size
            break
        except:
            continue
    
    if df is None:
        print("Error: Could not load any ticker dataset")
        print("Make sure you've run download_200_tickers_data.py or download_300_tickers_data.py")
        return
    
    # Convert Date to datetime
    df['Date'] = pd.to_datetime(df['Date'])
    
    print(f"Data loaded: {df.shape[0]:,} rows, {df['Ticker'].nunique()} tickers (using {dataset_size}-ticker dataset)")
    print(f"Date range: {df['Date'].min().strftime('%Y-%m-%d')} to {df['Date'].max().strftime('%Y-%m-%d')}")
    
    # Rate cut dates and corresponding Mondays
    rate_cuts = {
        'Cut_1': {'date': '2018-12-19', 'desc': 'Dec 19, 2018 (2.50% -> 2.25%)'},
        'Cut_2': {'date': '2019-07-31', 'desc': 'Jul 31, 2019 (2.25% -> 2.00%)'},  
        'Cut_3': {'date': '2019-09-18', 'desc': 'Sep 18, 2019 (2.00% -> 1.75%)'},
        'Cut_4': {'date': '2019-10-30', 'desc': 'Oct 30, 2019 (1.75% -> 1.50%)'}
    }
    
    # Calculate Monday after each rate cut
    for cut_id, cut_info in rate_cuts.items():
        monday_after = get_monday_after_date(cut_info['date'])
        cut_info['monday_after'] = monday_after
        print(f"{cut_id}: {cut_info['desc']}")
        print(f"    Monday after: {monday_after.strftime('%Y-%m-%d')}")
    
    print("\n" + "=" * 60)
    print("TRAINING PHASE - Analyzing first 3 rate cuts")
    print("=" * 60)
    
    # Get unique tickers
    tickers = df['Ticker'].unique()
    print(f"Analyzing {len(tickers)} tickers...")
    
    # Calculate returns for each training cut
    training_results = {}
    
    for cut_id in ['Cut_1', 'Cut_2', 'Cut_3']:
        print(f"\nAnalyzing {cut_id}: {rate_cuts[cut_id]['desc']}")
        monday_after = rate_cuts[cut_id]['monday_after']
        
        cut_returns = {}
        successful_trades = 0
        
        for ticker in tickers:
            return_pct, entry_date, exit_date = calculate_monday_to_monday_return(
                df, ticker, monday_after
            )
            
            if return_pct is not None:
                cut_returns[ticker] = {
                    'return_pct': return_pct,
                    'entry_date': entry_date,
                    'exit_date': exit_date
                }
                successful_trades += 1
        
        training_results[cut_id] = cut_returns
        print(f"    Successful trades: {successful_trades}/{len(tickers)}")
        
        # Show top 5 for this cut
        if cut_returns:
            sorted_returns = sorted(cut_returns.items(), key=lambda x: x[1]['return_pct'], reverse=True)
            print(f"    Top 5 performers:")
            for i, (ticker, data) in enumerate(sorted_returns[:5], 1):
                print(f"      {i}. {ticker}: {data['return_pct']:.2f}%")
    
    print("\n" + "=" * 60)
    print("CALCULATING MEDIAN PERFORMANCE & TOP 10 LIST")
    print("=" * 60)
    
    # Calculate median performance across the 3 training cuts
    ticker_medians = {}
    
    for ticker in tickers:
        returns = []
        for cut_id in ['Cut_1', 'Cut_2', 'Cut_3']:
            if ticker in training_results[cut_id]:
                returns.append(training_results[cut_id][ticker]['return_pct'])
        
        if len(returns) >= 2:  # Need at least 2 out of 3 data points
            ticker_medians[ticker] = {
                'median_return': np.median(returns),
                'num_trades': len(returns),
                'all_returns': returns
            }
    
    # Sort by median performance and get top 10
    sorted_medians = sorted(ticker_medians.items(), key=lambda x: x[1]['median_return'], reverse=True)
    top_10 = sorted_medians[:10]
    
    print(f"Top 10 tickers by median Monday-to-Monday performance (1 MONTH hold):")
    print("Rank  Ticker  Median Return  Trades  Individual Returns")
    print("-" * 55)
    
    for i, (ticker, data) in enumerate(top_10, 1):
        returns_str = ", ".join([f"{r:.2f}%" for r in data['all_returns']])
        print(f"{i:2}.   {ticker:6}  {data['median_return']:8.2f}%   {data['num_trades']}/3     {returns_str}")
    
    print("\n" + "=" * 60)
    print("TESTING PHASE - 4th Rate Cut Performance")
    print("=" * 60)
    
    # Test on 4th rate cut
    cut_4_info = rate_cuts['Cut_4']
    print(f"Testing on: {cut_4_info['desc']}")
    print(f"Monday after: {cut_4_info['monday_after'].strftime('%Y-%m-%d')}")
    print()
    
    test_results = []
    
    print("Testing Top 10 performance on 4th rate cut:")
    print("Rank  Ticker  Training Median  Test Return  Difference")
    print("-" * 50)
    
    for i, (ticker, training_data) in enumerate(top_10, 1):
        test_return, entry_date, exit_date = calculate_monday_to_monday_return(
            df, ticker, cut_4_info['monday_after']
        )
        
        if test_return is not None:
            difference = test_return - training_data['median_return']
            test_results.append({
                'rank': i,
                'ticker': ticker,
                'training_median': training_data['median_return'],
                'test_return': test_return,
                'difference': difference,
                'entry_date': entry_date,
                'exit_date': exit_date
            })
            
            print(f"{i:2}.   {ticker:6}  {training_data['median_return']:8.2f}%     {test_return:7.2f}%     {difference:+7.2f}%")
        else:
            print(f"{i:2}.   {ticker:6}  {training_data['median_return']:8.2f}%     No Data        N/A")
    
    # Summary statistics
    if test_results:
        test_returns = [r['test_return'] for r in test_results]
        training_medians = [r['training_median'] for r in test_results]
        
        print("\n" + "=" * 60)
        print("SUMMARY STATISTICS")
        print("=" * 60)
        print(f"Successful test trades: {len(test_results)}/10")
        print(f"Average training median: {np.mean(training_medians):.2f}%")
        print(f"Average test return: {np.mean(test_returns):.2f}%")
        print(f"Average difference: {np.mean([r['difference'] for r in test_results]):+.2f}%")
        print(f"Best test performer: {max(test_results, key=lambda x: x['test_return'])['ticker']} ({max(test_returns):.2f}%)")
        print(f"Worst test performer: {min(test_results, key=lambda x: x['test_return'])['ticker']} ({min(test_returns):.2f}%)")
        
        # Count outperformers vs underperformers
        outperformers = sum(1 for r in test_results if r['difference'] > 0)
        print(f"Outperformed training: {outperformers}/{len(test_results)} tickers")
        print(f"Underperformed training: {len(test_results) - outperformers}/{len(test_results)} tickers")
        
        print("\n" + "=" * 60)
        print("STRATEGY VALIDATION COMPLETE!")
        print("=" * 60)
        if np.mean(test_returns) > 0:
            print(f"[+] Strategy shows promise with average {np.mean(test_returns):.2f}% return")
        else:
            print(f"[-] Strategy underperformed with average {np.mean(test_returns):.2f}% return")
    
    return training_results, test_results

if __name__ == "__main__":
    training_data, test_data = main()