#!/usr/bin/env python3
"""
Fed Rate Cut Strategy - Cleaned (No COVID-Related Stocks)
Excludes bio/pharma/healthcare AND COVID-related industrial stocks
APD, medical equipment, respiratory equipment, etc.
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings

warnings.filterwarnings('ignore')

def get_covid_related_exclusions():
    """List of all COVID-related stocks to exclude"""
    exclusions = {
        'Biotech/Pharma/Healthcare': [
            'ABBV', 'ABT', 'AMGN', 'BMY', 'BIIB', 'GILD', 'JNJ', 'MRK', 
            'PFE', 'LLY', 'REGN', 'VRTX', 'CELG', 'ISRG', 'SYK', 'BSX',
            'EW', 'ZTS', 'IDXX', 'IQV', 'TMO', 'DHR', 'MDT', 'ALGN',
            'ILMN', 'MRNA', 'BNTX', 'NVAX', 'UNH', 'CVS', 'CI', 'HUM', 
            'CNC', 'ANTM', 'WBA', 'MCK', 'CAH', 'HCA', 'DGX', 'LH'
        ],
        'Medical/Industrial Gases & Equipment': [
            'APD',  # Air Products - medical oxygen, ventilators
            'LIN',  # Linde - industrial/medical gases
            'ECL',  # Ecolab - medical cleaning/sanitization
        ],
        'Healthcare ETFs': [
            'XLV', 'VHT', 'IBB', 'CURE', 'IHI', 'IYH', 'FTEC', 'IXJ'
        ],
        'Consistently Poor Performers': [
            'LUMN',  # Lumen - legacy telecom disaster
            'GE',    # General Electric - chronic underperformer
        ]
    }
    
    all_exclusions = []
    for category, tickers in exclusions.items():
        all_exclusions.extend(tickers)
    
    return set(all_exclusions)

def get_monday_after_date(date_str):
    """Get the Monday on or after the given date"""
    date = pd.to_datetime(date_str)
    days_ahead = 0 - date.weekday()
    if days_ahead <= 0:
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
        future_data = ticker_data[ticker_data['Date'] > entry_date]
        if future_data.empty:
            return None, None, None, None, None
        entry_data = future_data.iloc[0:1]
        entry_date = entry_data['Date'].iloc[0]
    
    entry_price = entry_data['Close'].iloc[0]
    
    # Calculate 1-WEEK return
    week_exit_target = entry_date + timedelta(days=7)
    days_ahead = 0 - week_exit_target.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    week_exit_monday = week_exit_target + timedelta(days=days_ahead)
    
    week_exit_data = ticker_data[ticker_data['Date'] == week_exit_monday]
    if week_exit_data.empty:
        future_data = ticker_data[ticker_data['Date'] >= week_exit_monday]
        if future_data.empty:
            week_return = None
        else:
            week_exit_data = future_data.iloc[0:1]
            week_exit_price = week_exit_data['Close'].iloc[0]
            week_return = ((week_exit_price / entry_price) - 1) * 100
    else:
        week_exit_price = week_exit_data['Close'].iloc[0]
        week_return = ((week_exit_price / entry_price) - 1) * 100
    
    # Calculate 1-MONTH return  
    month_exit_target = entry_date + timedelta(days=28)
    days_ahead = 0 - month_exit_target.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    month_exit_monday = month_exit_target + timedelta(days=days_ahead)
    
    month_exit_data = ticker_data[ticker_data['Date'] == month_exit_monday]
    if month_exit_data.empty:
        future_data = ticker_data[ticker_data['Date'] >= month_exit_monday]
        if future_data.empty:
            month_return = None
        else:
            month_exit_data = future_data.iloc[0:1]
            month_exit_price = month_exit_data['Close'].iloc[0]
            month_return = ((month_exit_price / entry_price) - 1) * 100
    else:
        month_exit_price = month_exit_data['Close'].iloc[0]
        month_return = ((month_exit_price / entry_price) - 1) * 100
    
    return week_return, month_return, entry_date, None, None

def main():
    print("FED RATE CUT STRATEGY - CLEAN (NO COVID-RELATED STOCKS)")
    print("=" * 70)
    print("Excludes: Bio/Pharma/Healthcare + Medical Equipment + Poor Performers")
    print("Removed: APD (medical oxygen), LUMEN (telecom disaster), GE, etc.")
    print()
    
    # Load data
    data_files = [
        ('fed_291_tickers_data_clean.csv', '291'),
        ('fed_300_tickers_data_clean.csv', '291'),
        ('fed_200_tickers_data_clean.csv', '200')
    ]
    
    df = None
    for filename, size in data_files:
        try:
            df = pd.read_csv(filename)
            break
        except:
            continue
    
    if df is None:
        print("Error: Could not load any ticker dataset")
        return
    
    df['Date'] = pd.to_datetime(df['Date'])
    
    # Filter out all COVID-related stocks
    covid_exclusions = get_covid_related_exclusions()
    original_tickers = set(df['Ticker'].unique())
    filtered_tickers = original_tickers - covid_exclusions
    df_filtered = df[df['Ticker'].isin(filtered_tickers)]
    
    print(f"Original dataset: {len(original_tickers)} tickers")
    print(f"COVID-related exclusions: {len(covid_exclusions)} tickers")
    print(f"Clean dataset: {len(filtered_tickers)} tickers")
    
    # Show what was excluded
    excluded_in_dataset = covid_exclusions & original_tickers
    if excluded_in_dataset:
        print(f"\nExcluded from analysis ({len(excluded_in_dataset)}):")
        excluded_sorted = sorted(list(excluded_in_dataset))
        for i in range(0, len(excluded_sorted), 12):
            chunk = excluded_sorted[i:i+12]
            print("  " + ", ".join(chunk))
    print()
    
    # Rate cuts
    rate_cuts = {
        'Cut_1': {'date': '2018-12-19'},
        'Cut_2': {'date': '2019-07-31'},  
        'Cut_3': {'date': '2019-09-18'},
        'Cut_4': {'date': '2019-10-30'}
    }
    
    for cut_id, cut_info in rate_cuts.items():
        cut_info['monday_after'] = get_monday_after_date(cut_info['date'])
    
    # Calculate training performance for all tickers
    all_training_results = {}
    tickers = list(filtered_tickers)
    
    print("Calculating clean training performance...")
    
    for ticker in tickers:
        week_returns = []
        month_returns = []
        
        # Get training returns for first 3 cuts
        for cut_id in ['Cut_1', 'Cut_2', 'Cut_3']:
            week_ret, month_ret, _, _, _ = calculate_returns_dual_timeframe(
                df_filtered, ticker, rate_cuts[cut_id]['monday_after']
            )
            if week_ret is not None and month_ret is not None:
                week_returns.append(week_ret)
                month_returns.append(month_ret)
        
        if len(week_returns) >= 2:
            all_training_results[ticker] = {
                'week_median': np.median(week_returns),
                'month_median': np.median(month_returns),
                'week_returns': week_returns,
                'month_returns': month_returns
            }
    
    # Calculate test performance for 4th cut
    print("Calculating clean test performance...")
    
    test_results = []
    cut_4_monday = rate_cuts['Cut_4']['monday_after']
    
    for ticker in all_training_results.keys():
        week_test, month_test, _, _, _ = calculate_returns_dual_timeframe(
            df_filtered, ticker, cut_4_monday
        )
        
        if week_test is not None and month_test is not None:
            training = all_training_results[ticker]
            test_results.append({
                'ticker': ticker,
                'week_training_median': training['week_median'],
                'week_test_return': week_test,
                'week_difference': week_test - training['week_median'],
                'month_training_median': training['month_median'],
                'month_test_return': month_test,
                'month_difference': month_test - training['month_median']
            })
    
    # Sort by test performance
    week_sorted = sorted(test_results, key=lambda x: x['week_test_return'], reverse=True)
    month_sorted = sorted(test_results, key=lambda x: x['month_test_return'], reverse=True)
    
    print(f"\nAnalyzed {len(test_results)} clean tickers")
    print()
    
    # Show top 15 legitimate performers
    print("=" * 80)
    print("TOP 15 LEGITIMATE PERFORMERS - 1 WEEK (NO COVID INFLUENCE)")
    print("=" * 80)
    print("Rank  Ticker  Test Return  Training Median  Difference   Sector/Type")
    print("-" * 80)
    
    # Add basic sector classification
    sector_map = {
        'DIS': 'Media/Entertainment', 'AMD': 'Semiconductors', 'ADBE': 'Software',
        'AES': 'Utilities', 'MO': 'Tobacco', 'BA': 'Aerospace', 'ACN': 'Tech Consulting',
        'EIX': 'Utilities', 'LMT': 'Defense', 'ALL': 'Insurance', 'ENB': 'Energy Infrastructure',
        'CAG': 'Consumer Packaged Goods', 'AAPL': 'Technology', 'WMT': 'Retail',
        'SCHW': 'Financial Services', 'FCX': 'Mining/Copper', 'PCG': 'Utilities',
        'STT': 'Banking', 'ARKK': 'Innovation ETF', 'HSY': 'Food/Confectionery'
    }
    
    for i, result in enumerate(week_sorted[:15], 1):
        sector = sector_map.get(result['ticker'], 'Other')
        print(f"{i:2}.   {result['ticker']:6}  {result['week_test_return']:8.2f}%     {result['week_training_median']:8.2f}%     {result['week_difference']:+7.2f}%     {sector}")
    
    print("\n" + "=" * 80)
    print("TOP 15 LEGITIMATE PERFORMERS - 1 MONTH (NO COVID INFLUENCE)")
    print("=" * 80)
    print("Rank  Ticker  Test Return  Training Median  Difference   Sector/Type")
    print("-" * 80)
    
    for i, result in enumerate(month_sorted[:15], 1):
        sector = sector_map.get(result['ticker'], 'Other')
        print(f"{i:2}.   {result['ticker']:6}  {result['month_test_return']:8.2f}%     {result['month_training_median']:8.2f}%     {result['month_difference']:+7.2f}%     {sector}")
    
    # Summary statistics
    print("\n" + "=" * 80)
    print("CLEAN STRATEGY SUMMARY (NO COVID STOCKS)")
    print("=" * 80)
    
    week_test_returns = [r['week_test_return'] for r in test_results]
    month_test_returns = [r['month_test_return'] for r in test_results]
    
    week_positive = sum(1 for r in week_test_returns if r > 0)
    month_positive = sum(1 for r in month_test_returns if r > 0)
    
    print(f"1 WEEK HOLDING PERIOD (CLEAN):")
    print(f"  Total analyzed: {len(test_results)} tickers")
    print(f"  Positive returns: {week_positive}/{len(test_results)} ({week_positive/len(test_results)*100:.1f}%)")
    print(f"  Average return: {np.mean(week_test_returns):.2f}%")
    print(f"  Median return: {np.median(week_test_returns):.2f}%")
    print(f"  Best: {week_sorted[0]['ticker']} ({week_sorted[0]['week_test_return']:.2f}%)")
    
    print(f"\n1 MONTH HOLDING PERIOD (CLEAN):")
    print(f"  Total analyzed: {len(test_results)} tickers")
    print(f"  Positive returns: {month_positive}/{len(test_results)} ({month_positive/len(test_results)*100:.1f}%)")
    print(f"  Average return: {np.mean(month_test_returns):.2f}%")
    print(f"  Median return: {np.median(month_test_returns):.2f}%")
    print(f"  Best: {month_sorted[0]['ticker']} ({month_sorted[0]['month_test_return']:.2f}%)")
    
    # Show legitimate sector winners
    print(f"\nLEGITIMATE FED RATE CUT SECTOR WINNERS:")
    print(f"  Utilities: PCG, AES, EIX (rate cut benefits)")
    print(f"  Technology: AMD, ADBE, AAPL (growth at lower rates)")
    print(f"  Financial Services: SCHW, STT (banking spread benefits)")
    print(f"  Defense/Aerospace: LMT, BA (government spending)")
    print(f"  Consumer: WMT, CAG, HSY (lower borrowing costs)")
    
    return test_results

if __name__ == "__main__":
    results = main()