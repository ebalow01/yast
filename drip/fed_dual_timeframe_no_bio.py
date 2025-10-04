#!/usr/bin/env python3
"""
Fed Rate Cut Strategy - Dual Timeframe Analysis (NO BIOTECH/HEALTHCARE)
Excludes bio/pharma/healthcare stocks to avoid COVID-19 early influence
Training: First 3 rate cuts (Dec 2018, Jul 2019, Sep 2019)
Testing: 4th rate cut (Oct 2019)
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings

warnings.filterwarnings('ignore')

def get_biotech_healthcare_exclusions():
    """List of biotech, pharma, and healthcare stocks to exclude"""
    exclusions = {
        'Biotech/Pharma': [
            'ABBV', 'ABT', 'AMGN', 'BMY', 'BIIB', 'GILD', 'JNJ', 'MRK', 
            'PFE', 'LLY', 'REGN', 'VRTX', 'CELG', 'ISRG', 'SYK', 'BSX',
            'EW', 'ZTS', 'IDXX', 'IQV', 'TMO', 'DHR', 'MDT', 'ALGN',
            'ILMN', 'MRNA', 'BNTX', 'NVAX'
        ],
        'Healthcare Services/Insurance': [
            'UNH', 'CVS', 'CI', 'HUM', 'CNC', 'ANTM', 'WBA', 'MCK',
            'CAH', 'HCA', 'DGX', 'LH', 'DVA', 'UHS', 'CHTR'
        ],
        'Healthcare ETFs': [
            'XLV', 'VHT', 'IBB', 'CURE', 'IHI', 'IYH', 'FTEC', 'IXJ'
        ]
    }
    
    all_exclusions = []
    for category, tickers in exclusions.items():
        all_exclusions.extend(tickers)
    
    return set(all_exclusions)  # Remove duplicates

def get_monday_after_date(date_str):
    """Get the Monday on or after the given date"""
    date = pd.to_datetime(date_str)
    days_ahead = 0 - date.weekday()  # Monday is 0
    if days_ahead <= 0:  # Target day is today or has already happened this week
        days_ahead += 7
    return date + timedelta(days=days_ahead)

def calculate_returns_dual_timeframe(df, ticker, start_monday):
    """Calculate both 1-week and 1-month returns for a ticker"""
    ticker_data = df[df['Ticker'] == ticker].copy()
    ticker_data['Date'] = pd.to_datetime(ticker_data['Date'])
    ticker_data = ticker_data.sort_values('Date')
    
    # Find the Monday entry price
    entry_date = start_monday
    entry_data = ticker_data[ticker_data['Date'] == entry_date]
    
    if entry_data.empty:
        # If no data on exact Monday, find closest trading day after
        future_data = ticker_data[ticker_data['Date'] > entry_date]
        if future_data.empty:
            return None, None, None, None, None
        entry_data = future_data.iloc[0:1]
        entry_date = entry_data['Date'].iloc[0]
    
    entry_price = entry_data['Close'].iloc[0]
    
    # Calculate 1-WEEK return
    week_exit_target = entry_date + timedelta(days=7)
    days_ahead = 0 - week_exit_target.weekday()  # Monday is 0
    if days_ahead <= 0:
        days_ahead += 7
    week_exit_monday = week_exit_target + timedelta(days=days_ahead)
    
    week_exit_data = ticker_data[ticker_data['Date'] == week_exit_monday]
    if week_exit_data.empty:
        future_data = ticker_data[ticker_data['Date'] >= week_exit_monday]
        if future_data.empty:
            week_return = None
            week_exit_date = None
        else:
            week_exit_data = future_data.iloc[0:1]
            week_exit_date = week_exit_data['Date'].iloc[0]
            week_exit_price = week_exit_data['Close'].iloc[0]
            week_return = ((week_exit_price / entry_price) - 1) * 100
    else:
        week_exit_date = week_exit_monday
        week_exit_price = week_exit_data['Close'].iloc[0]
        week_return = ((week_exit_price / entry_price) - 1) * 100
    
    # Calculate 1-MONTH return  
    month_exit_target = entry_date + timedelta(days=28)  # 4 weeks
    days_ahead = 0 - month_exit_target.weekday()  # Monday is 0
    if days_ahead <= 0:
        days_ahead += 7
    month_exit_monday = month_exit_target + timedelta(days=days_ahead)
    
    month_exit_data = ticker_data[ticker_data['Date'] == month_exit_monday]
    if month_exit_data.empty:
        future_data = ticker_data[ticker_data['Date'] >= month_exit_monday]
        if future_data.empty:
            month_return = None
            month_exit_date = None
        else:
            month_exit_data = future_data.iloc[0:1]
            month_exit_date = month_exit_data['Date'].iloc[0]
            month_exit_price = month_exit_data['Close'].iloc[0]
            month_return = ((month_exit_price / entry_price) - 1) * 100
    else:
        month_exit_date = month_exit_monday
        month_exit_price = month_exit_data['Close'].iloc[0]
        month_return = ((month_exit_price / entry_price) - 1) * 100
    
    return week_return, month_return, entry_date, week_exit_date, month_exit_date

def main():
    print("FED RATE CUT STRATEGY - NO BIOTECH/HEALTHCARE")
    print("=" * 65)
    print("Strategy: Compare 1 WEEK vs 1 MONTH (excluding bio/pharma/healthcare)")
    print("Rationale: Avoid COVID-19 early influence on healthcare stocks")
    print("Training: First 3 cuts | Testing: 4th cut")
    print()
    
    # Load data
    data_files = [
        ('fed_291_tickers_data_clean.csv', '291'),
        ('fed_300_tickers_data_clean.csv', '291'),
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
        return
    
    df['Date'] = pd.to_datetime(df['Date'])
    
    # Get exclusion list
    bio_healthcare_exclusions = get_biotech_healthcare_exclusions()
    
    # Filter out biotech/healthcare stocks
    original_tickers = set(df['Ticker'].unique())
    filtered_tickers = original_tickers - bio_healthcare_exclusions
    
    # Apply filter
    df_filtered = df[df['Ticker'].isin(filtered_tickers)]
    
    print(f"Original dataset: {len(original_tickers)} tickers")
    print(f"Biotech/Healthcare exclusions: {len(bio_healthcare_exclusions)} tickers")
    print(f"Filtered dataset: {len(filtered_tickers)} tickers")
    print(f"Data range: {df_filtered['Date'].min().strftime('%Y-%m-%d')} to {df_filtered['Date'].max().strftime('%Y-%m-%d')}")
    
    # Show what was excluded
    excluded_in_dataset = bio_healthcare_exclusions & original_tickers
    if excluded_in_dataset:
        print(f"\nExcluded from analysis ({len(excluded_in_dataset)}):")
        excluded_sorted = sorted(list(excluded_in_dataset))
        for i in range(0, len(excluded_sorted), 10):
            chunk = excluded_sorted[i:i+10]
            print("  " + ", ".join(chunk))
    print()
    
    # Rate cut dates and Mondays
    rate_cuts = {
        'Cut_1': {'date': '2018-12-19', 'desc': 'Dec 19, 2018 (2.50% -> 2.25%)'},
        'Cut_2': {'date': '2019-07-31', 'desc': 'Jul 31, 2019 (2.25% -> 2.00%)'},  
        'Cut_3': {'date': '2019-09-18', 'desc': 'Sep 18, 2019 (2.00% -> 1.75%)'},
        'Cut_4': {'date': '2019-10-30', 'desc': 'Oct 30, 2019 (1.75% -> 1.50%)'}
    }
    
    for cut_id, cut_info in rate_cuts.items():
        monday_after = get_monday_after_date(cut_info['date'])
        cut_info['monday_after'] = monday_after
        print(f"{cut_id}: {cut_info['desc']}")
        print(f"    Monday after: {monday_after.strftime('%Y-%m-%d')}")
    
    print("\n" + "=" * 65)
    print("TRAINING PHASE - Analyzing first 3 rate cuts (NO BIO/HEALTHCARE)")
    print("=" * 65)
    
    tickers = list(filtered_tickers)
    print(f"Analyzing {len(tickers)} tickers (excluding bio/healthcare)...")
    
    # Calculate returns for each training cut (both timeframes)
    training_results_week = {}
    training_results_month = {}
    
    for cut_id in ['Cut_1', 'Cut_2', 'Cut_3']:
        print(f"\nAnalyzing {cut_id}: {rate_cuts[cut_id]['desc']}")
        monday_after = rate_cuts[cut_id]['monday_after']
        
        week_returns = {}
        month_returns = {}
        successful_trades = 0
        
        for ticker in tickers:
            week_ret, month_ret, entry_date, week_exit, month_exit = calculate_returns_dual_timeframe(
                df_filtered, ticker, monday_after
            )
            
            if week_ret is not None and month_ret is not None:
                week_returns[ticker] = {
                    'return_pct': week_ret,
                    'entry_date': entry_date,
                    'exit_date': week_exit
                }
                month_returns[ticker] = {
                    'return_pct': month_ret,
                    'entry_date': entry_date,
                    'exit_date': month_exit
                }
                successful_trades += 1
        
        training_results_week[cut_id] = week_returns
        training_results_month[cut_id] = month_returns
        print(f"    Successful dual-timeframe trades: {successful_trades}/{len(tickers)}")
        
        # Show top 5 for both timeframes
        if week_returns and month_returns:
            week_sorted = sorted(week_returns.items(), key=lambda x: x[1]['return_pct'], reverse=True)
            month_sorted = sorted(month_returns.items(), key=lambda x: x[1]['return_pct'], reverse=True)
            
            print(f"    Top 5 (1 WEEK):")
            for i, (ticker, data) in enumerate(week_sorted[:5], 1):
                print(f"      {i}. {ticker}: {data['return_pct']:.2f}%")
            
            print(f"    Top 5 (1 MONTH):")
            for i, (ticker, data) in enumerate(month_sorted[:5], 1):
                print(f"      {i}. {ticker}: {data['return_pct']:.2f}%")
    
    print("\n" + "=" * 65)
    print("CALCULATING TOP 10 LISTS (NO BIO/HEALTHCARE)")
    print("=" * 65)
    
    # Calculate median performance for both timeframes
    ticker_medians_week = {}
    ticker_medians_month = {}
    
    for ticker in tickers:
        week_returns = []
        month_returns = []
        
        for cut_id in ['Cut_1', 'Cut_2', 'Cut_3']:
            if ticker in training_results_week[cut_id]:
                week_returns.append(training_results_week[cut_id][ticker]['return_pct'])
            if ticker in training_results_month[cut_id]:
                month_returns.append(training_results_month[cut_id][ticker]['return_pct'])
        
        if len(week_returns) >= 2:
            ticker_medians_week[ticker] = {
                'median_return': np.median(week_returns),
                'num_trades': len(week_returns),
                'all_returns': week_returns
            }
        
        if len(month_returns) >= 2:
            ticker_medians_month[ticker] = {
                'median_return': np.median(month_returns),
                'num_trades': len(month_returns),
                'all_returns': month_returns
            }
    
    # Get top 10 for both timeframes
    week_sorted = sorted(ticker_medians_week.items(), key=lambda x: x[1]['median_return'], reverse=True)
    month_sorted = sorted(ticker_medians_month.items(), key=lambda x: x[1]['median_return'], reverse=True)
    
    week_top_10 = week_sorted[:10]
    month_top_10 = month_sorted[:10]
    
    print(f"TOP 10 TICKERS - 1 WEEK HOLDING (NO BIO/HEALTHCARE):")
    print("Rank  Ticker  Median Return  Trades  Individual Returns")
    print("-" * 55)
    for i, (ticker, data) in enumerate(week_top_10, 1):
        returns_str = ", ".join([f"{r:.2f}%" for r in data['all_returns']])
        print(f"{i:2}.   {ticker:6}  {data['median_return']:8.2f}%   {data['num_trades']}/3     {returns_str}")
    
    print(f"\nTOP 10 TICKERS - 1 MONTH HOLDING (NO BIO/HEALTHCARE):")
    print("Rank  Ticker  Median Return  Trades  Individual Returns")
    print("-" * 55)
    for i, (ticker, data) in enumerate(month_top_10, 1):
        returns_str = ", ".join([f"{r:.2f}%" for r in data['all_returns']])
        print(f"{i:2}.   {ticker:6}  {data['median_return']:8.2f}%   {data['num_trades']}/3     {returns_str}")
    
    print("\n" + "=" * 65)
    print("TESTING PHASE - 4th Rate Cut (NO BIO/HEALTHCARE)")
    print("=" * 65)
    
    cut_4_info = rate_cuts['Cut_4']
    print(f"Testing on: {cut_4_info['desc']}")
    print(f"Monday after: {cut_4_info['monday_after'].strftime('%Y-%m-%d')}")
    print()
    
    # Test both top 10 lists
    week_test_results = []
    month_test_results = []
    
    print("TESTING TOP 10 (1 WEEK - NO BIO/HEALTHCARE):")
    print("Rank  Ticker  Training Median  Test Return  Difference")
    print("-" * 50)
    
    for i, (ticker, training_data) in enumerate(week_top_10, 1):
        week_ret, month_ret, entry_date, week_exit, month_exit = calculate_returns_dual_timeframe(
            df_filtered, ticker, cut_4_info['monday_after']
        )
        
        if week_ret is not None:
            difference = week_ret - training_data['median_return']
            week_test_results.append({
                'rank': i,
                'ticker': ticker,
                'training_median': training_data['median_return'],
                'test_return': week_ret,
                'difference': difference
            })
            print(f"{i:2}.   {ticker:6}  {training_data['median_return']:8.2f}%     {week_ret:7.2f}%     {difference:+7.2f}%")
        else:
            print(f"{i:2}.   {ticker:6}  {training_data['median_return']:8.2f}%     No Data        N/A")
    
    print("\nTESTING TOP 10 (1 MONTH - NO BIO/HEALTHCARE):")
    print("Rank  Ticker  Training Median  Test Return  Difference")
    print("-" * 50)
    
    for i, (ticker, training_data) in enumerate(month_top_10, 1):
        week_ret, month_ret, entry_date, week_exit, month_exit = calculate_returns_dual_timeframe(
            df_filtered, ticker, cut_4_info['monday_after']
        )
        
        if month_ret is not None:
            difference = month_ret - training_data['median_return']
            month_test_results.append({
                'rank': i,
                'ticker': ticker,
                'training_median': training_data['median_return'],
                'test_return': month_ret,
                'difference': difference
            })
            print(f"{i:2}.   {ticker:6}  {training_data['median_return']:8.2f}%     {month_ret:7.2f}%     {difference:+7.2f}%")
        else:
            print(f"{i:2}.   {ticker:6}  {training_data['median_return']:8.2f}%     No Data        N/A")
    
    # Summary statistics for both timeframes
    print("\n" + "=" * 65)
    print("COMPARATIVE SUMMARY (NO BIO/HEALTHCARE)")
    print("=" * 65)
    
    if week_test_results:
        week_returns = [r['test_return'] for r in week_test_results]
        week_training_medians = [r['training_median'] for r in week_test_results]
        week_avg_test = np.mean(week_returns)
        week_avg_training = np.mean(week_training_medians)
        
        print(f"1 WEEK HOLDING PERIOD (NO BIO/HEALTHCARE):")
        print(f"  Successful test trades: {len(week_test_results)}/10")
        print(f"  Average training median: {week_avg_training:.2f}%")
        print(f"  Average test return: {week_avg_test:.2f}%")
        print(f"  Average difference: {np.mean([r['difference'] for r in week_test_results]):+.2f}%")
        print(f"  Best test performer: {max(week_test_results, key=lambda x: x['test_return'])['ticker']} ({max(week_returns):.2f}%)")
        print(f"  Worst test performer: {min(week_test_results, key=lambda x: x['test_return'])['ticker']} ({min(week_returns):.2f}%)")
        
        week_outperformers = sum(1 for r in week_test_results if r['difference'] > 0)
        print(f"  Outperformed training: {week_outperformers}/{len(week_test_results)} tickers")
    
    if month_test_results:
        month_returns = [r['test_return'] for r in month_test_results]
        month_training_medians = [r['training_median'] for r in month_test_results]
        month_avg_test = np.mean(month_returns)
        month_avg_training = np.mean(month_training_medians)
        
        print(f"\n1 MONTH HOLDING PERIOD (NO BIO/HEALTHCARE):")
        print(f"  Successful test trades: {len(month_test_results)}/10")
        print(f"  Average training median: {month_avg_training:.2f}%")
        print(f"  Average test return: {month_avg_test:.2f}%")
        print(f"  Average difference: {np.mean([r['difference'] for r in month_test_results]):+.2f}%")
        print(f"  Best test performer: {max(month_test_results, key=lambda x: x['test_return'])['ticker']} ({max(month_returns):.2f}%)")
        print(f"  Worst test performer: {min(month_test_results, key=lambda x: x['test_return'])['ticker']} ({min(month_returns):.2f}%)")
        
        month_outperformers = sum(1 for r in month_test_results if r['difference'] > 0)
        print(f"  Outperformed training: {month_outperformers}/{len(month_test_results)} tickers")
    
    print("\n" + "=" * 65)
    print("FINAL STRATEGY COMPARISON (EXCLUDING BIO/HEALTHCARE)")
    print("=" * 65)
    
    if week_test_results and month_test_results:
        print(f"1 WEEK vs 1 MONTH Performance (No Bio/Healthcare Influence):")
        print(f"  Week average return:  {week_avg_test:+7.2f}%")
        print(f"  Month average return: {month_avg_test:+7.2f}%")
        
        if week_avg_test > month_avg_test:
            better_timeframe = "1 WEEK"
            performance_diff = week_avg_test - month_avg_test
        else:
            better_timeframe = "1 MONTH"
            performance_diff = month_avg_test - week_avg_test
        
        print(f"  Better performing timeframe: {better_timeframe} (+{performance_diff:.2f}% advantage)")
        print(f"  Exclusion impact: Removing bio/healthcare stocks eliminates COVID-19 early influence")
        
        if max(week_avg_test, month_avg_test) > 0:
            print(f"  [+] Clean Fed rate cut strategy with {better_timeframe.lower()} holding period")
        else:
            print(f"  [-] Both timeframes underperformed even without bio/healthcare influence")
    
    return week_test_results, month_test_results

if __name__ == "__main__":
    week_results, month_results = main()