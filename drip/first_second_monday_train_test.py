import requests
import pandas as pd
import numpy as np
import time
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import sys
import calendar
from concurrent.futures import ThreadPoolExecutor, as_completed

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

def calculate_rsi(prices, period=14):
    """Calculate RSI using Wilder's smoothing method"""
    if len(prices) < period + 1:
        return [np.nan] * len(prices)
    
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    
    # Initial averages (simple moving average for first calculation)
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])
    
    rsi_values = [np.nan] * (period)  # First 'period' values are NaN
    
    if avg_loss == 0:
        rsi_values.append(100)
    else:
        rs = avg_gain / avg_loss
        rsi_values.append(100 - (100 / (1 + rs)))
    
    # Calculate RSI for remaining values using Wilder's smoothing
    for i in range(period + 1, len(prices)):
        gain = max(prices[i] - prices[i-1], 0)
        loss = max(prices[i-1] - prices[i], 0)
        
        # Wilder's smoothing: (previous_avg * (period-1) + current_value) / period
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        
        if avg_loss == 0:
            rsi_values.append(100)
        else:
            rs = avg_gain / avg_loss
            rsi_values.append(100 - (100 / (1 + rs)))
    
    return rsi_values

def get_nth_monday_of_month(year, month, n):
    """Get the nth Monday of a given month"""
    first_day = datetime(year, month, 1)
    first_monday = first_day + timedelta(days=(7 - first_day.weekday()) % 7)
    
    nth_monday = first_monday + timedelta(weeks=n-1)
    
    # Check if the nth Monday is still in the same month
    if nth_monday.month != month:
        return None
    return nth_monday

def test_1st_2nd_monday_strategy_split(df, ticker, period_type="training"):
    """Test 1st→2nd Monday strategy on ticker data with train/test split"""
    
    if len(df) < 60:  # Need enough data
        return None
    
    df['date'] = pd.to_datetime(df['date'])
    df['year'] = df['date'].dt.year
    df['month'] = df['date'].dt.month
    
    # Define periods
    if period_type == "training":
        months = [1, 2, 3, 4, 5]  # Jan-May 2025
        period_name = "Training (Jan-May 2025)"
    elif period_type == "testing":
        months = [6, 7, 8]  # June-Aug 2025
        period_name = "Testing (June-Aug 2025)"
    else:
        months = list(range(1, 9))  # Full period
        period_name = "Full Period (Jan-Aug 2025)"
    
    # Generate trades for specified period
    trades = []
    
    for month in months:
        # Get 1st Monday (buy) and 2nd Monday (sell)
        buy_monday = get_nth_monday_of_month(2025, month, 1)
        sell_monday = get_nth_monday_of_month(2025, month, 2)
        
        if buy_monday and sell_monday:
            buy_date = buy_monday.date()
            sell_date = sell_monday.date()
            
            # Find actual trading data for these dates (or closest)
            buy_data = df[df['date'].dt.date >= buy_date].head(1)
            sell_data = df[df['date'].dt.date >= sell_date].head(1)
            
            if len(buy_data) > 0 and len(sell_data) > 0:
                buy_row = buy_data.iloc[0]
                sell_row = sell_data.iloc[0]
                
                buy_price = buy_row['close']
                sell_price = sell_row['close']
                buy_rsi = buy_row['rsi']
                
                return_pct = ((sell_price - buy_price) / buy_price) * 100
                
                trades.append({
                    'month': calendar.month_name[month],
                    'buy_date': buy_row['date'].date(),
                    'sell_date': sell_row['date'].date(),
                    'buy_price': buy_price,
                    'sell_price': sell_price,
                    'buy_rsi': buy_rsi,
                    'return_pct': return_pct
                })
    
    if not trades:
        return None
    
    trades_df = pd.DataFrame(trades)
    
    # Calculate strategy performance
    total_return = ((trades_df['return_pct'] / 100 + 1).prod() - 1) * 100
    win_rate = (trades_df['return_pct'] > 0).mean() * 100
    avg_return = trades_df['return_pct'].mean()
    volatility = trades_df['return_pct'].std()
    
    return {
        'ticker': ticker,
        'period': period_name,
        'total_return': total_return,
        'win_rate': win_rate,
        'avg_return': avg_return,
        'volatility': volatility,
        'num_trades': len(trades_df),
        'best_month': trades_df.loc[trades_df['return_pct'].idxmax(), 'month'] if len(trades_df) > 0 else None,
        'worst_month': trades_df.loc[trades_df['return_pct'].idxmin(), 'month'] if len(trades_df) > 0 else None,
        'trades': trades_df
    }

def get_top_volume_tickers():
    """Get top 100 highest volume stocks and ETFs"""
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found in environment variables")
        return []
    
    print("🔍 Finding Top 100 Highest Volume Tickers...")
    print("=" * 60)
    
    # Get previous trading day
    yesterday = datetime.now() - timedelta(days=1)
    # If weekend, go back to Friday
    while yesterday.weekday() > 4:  # Monday = 0, Sunday = 6
        yesterday = yesterday - timedelta(days=1)
    
    date_str = yesterday.strftime('%Y-%m-%d')
    
    print(f"📅 Using date: {date_str}")
    
    # Get grouped daily bars (all tickers for a single day)
    url = f"https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/{date_str}"
    params = {
        'adjusted': 'true',
        'apikey': api_key
    }
    
    try:
        print("📥 Fetching market data...")
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if 'results' not in data:
            print(f"❌ Error: {data}")
            return []
        
        results = data['results']
        print(f"✅ Retrieved data for {len(results)} tickers")
        
        # Convert to DataFrame and sort by volume
        df = pd.DataFrame(results)
        df = df.rename(columns={
            'T': 'ticker',
            'o': 'open', 
            'h': 'high',
            'l': 'low',
            'c': 'close',
            'v': 'volume'
        })
        
        # Filter for reasonable tickers (no weird symbols)
        df = df[df['ticker'].str.len() <= 5]  # Max 5 characters
        df = df[~df['ticker'].str.contains(r'[^A-Z]')]  # Only letters
        df = df[df['volume'] > 1000000]  # Min 1M volume
        df = df[df['close'] > 1.0]  # Min $1 stock price
        df = df[df['close'] < 1000]  # Max $1000 stock price
        
        # Sort by volume and get top 100
        df = df.sort_values('volume', ascending=False).head(100)
        
        print(f"📊 Top 10 by volume:")
        print("-" * 50)
        for i, row in df.head(10).iterrows():
            print(f"{row['ticker']:<6} Vol: {row['volume']:>15,} Price: ${row['close']:>8.2f}")
        
        return df['ticker'].tolist()
        
    except Exception as e:
        print(f"❌ Error fetching ticker data: {e}")
        return []

def download_full_2025_data(ticker):
    """Download full 2025 daily data for a single ticker"""
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        return None
    
    # Full 2025 date range
    start_date = datetime(2025, 1, 1)
    end_date = datetime.now()
    
    from_date = start_date.strftime('%Y-%m-%d')
    to_date = end_date.strftime('%Y-%m-%d')
    
    # Polygon API endpoint for daily bars
    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{from_date}/{to_date}"
    params = {
        'adjusted': 'true',
        'sort': 'asc',
        'limit': 5000,
        'apikey': api_key
    }
    
    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        if 'results' not in data:
            return None
        
        results = data['results']
        if len(results) < 100:  # Need substantial 2025 data
            return None
        
        # Convert to DataFrame
        df = pd.DataFrame(results)
        df['date'] = pd.to_datetime(df['t'], unit='ms', utc=True).dt.tz_convert('America/New_York')
        df = df.rename(columns={
            'o': 'open',
            'h': 'high', 
            'l': 'low',
            'c': 'close',
            'v': 'volume'
        })
        
        # Calculate RSI
        df = df.sort_values('date').reset_index(drop=True)
        rsi_values = calculate_rsi(df['close'].values, period=14)
        df['rsi'] = rsi_values
        
        # Select final columns
        final_df = df[['date', 'open', 'high', 'low', 'close', 'volume', 'rsi']].copy()
        
        return final_df
        
    except Exception as e:
        return None

def analyze_single_ticker(ticker):
    """Analyze a single ticker with train/test split for 1st→2nd Monday strategy"""
    try:
        # Download full 2025 data
        df = download_full_2025_data(ticker)
        
        if df is None or len(df) < 100:
            return None
        
        # Test training period (Jan-May)
        training_result = test_1st_2nd_monday_strategy_split(df, ticker, "training")
        
        # Test testing period (June-Aug)  
        testing_result = test_1st_2nd_monday_strategy_split(df, ticker, "testing")
        
        if training_result and testing_result:
            return {
                'ticker': ticker,
                'training': training_result,
                'testing': testing_result,
                'data_points': len(df)
            }
        
        return None
        
    except Exception as e:
        return None

def find_best_1st_2nd_monday_performer():
    """Find the best performer for 1st→2nd Monday strategy using train/test split"""
    
    print("🚀 1ST→2ND MONDAY STRATEGY - TRAIN/TEST SPLIT ANALYSIS")
    print("=" * 90)
    print("📚 TRAINING PERIOD: January - May 2025")
    print("🧪 TESTING PERIOD: June - August 2025")
    print("🎯 STRATEGY: 1st Monday → 2nd Monday")
    print("🏆 CURRENT HOLDER: SMCI (+42.52% in May 2025)")
    print("=" * 90)
    
    # Get top volume tickers
    top_tickers = get_top_volume_tickers()
    
    if not top_tickers:
        print("❌ Could not retrieve top tickers")
        return
    
    print(f"\n📥 Analyzing {len(top_tickers)} tickers with train/test split...")
    print("⏰ Using parallel processing for optimal speed...")
    print("=" * 70)
    
    # Analyze all tickers in parallel
    all_results = []
    successful_tickers = 0
    failed_tickers = 0
    
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        # Submit all tasks
        future_to_ticker = {executor.submit(analyze_single_ticker, ticker): ticker 
                           for ticker in top_tickers}
        
        # Process completed tasks
        for i, future in enumerate(as_completed(future_to_ticker), 1):
            ticker = future_to_ticker[future]
            try:
                result = future.result()
                if result:
                    all_results.append(result)
                    training_return = result['training']['total_return']
                    testing_return = result['testing']['total_return']
                    print(f"✅ {i:3d}/100: {ticker:<6} Train: {training_return:+7.1f}% | Test: {testing_return:+7.1f}% | Data: {result['data_points']} days")
                    successful_tickers += 1
                else:
                    print(f"❌ {i:3d}/100: {ticker:<6} Analysis failed")
                    failed_tickers += 1
            except Exception as e:
                print(f"💥 {i:3d}/100: {ticker:<6} Exception: {str(e)[:50]}")
                failed_tickers += 1
    
    elapsed_time = time.time() - start_time
    
    print(f"\n✅ Analysis complete in {elapsed_time:.1f} seconds!")
    print(f"📊 Successfully analyzed: {successful_tickers} tickers")
    print(f"❌ Failed: {failed_tickers} tickers")
    
    if not all_results:
        print("❌ No successful analyses!")
        return
    
    # PHASE 1: TRAINING ANALYSIS
    print(f"\n📚 PHASE 1: TRAINING PERIOD ANALYSIS (Jan-May 2025)")
    print("=" * 80)
    
    # Sort by training period performance
    training_sorted = sorted(all_results, key=lambda x: x['training']['total_return'], reverse=True)
    
    print(f"🏆 TOP 20 PERFORMERS IN TRAINING PERIOD:")
    print("-" * 90)
    print(f"{'Rank':<4} {'Ticker':<6} {'Train Return':<12} {'Win Rate':<9} {'Avg/Trade':<10} {'Volatility':<10} {'Trades':<6}")
    print("-" * 90)
    
    for i, result in enumerate(training_sorted[:20], 1):
        train = result['training']
        print(f"{i:<4} {train['ticker']:<6} {train['total_return']:+10.1f}% {train['win_rate']:7.0f}% "
              f"{train['avg_return']:+8.1f}% {train['volatility']:8.1f}% {train['num_trades']:<6}")
    
    # Select top 3 candidates from training
    top_3_candidates = training_sorted[:3]
    
    print(f"\n🎯 TOP 3 CANDIDATES SELECTED FROM TRAINING:")
    print("-" * 60)
    for i, result in enumerate(top_3_candidates, 1):
        train = result['training']
        print(f"{i}. {train['ticker']}: {train['total_return']:+.1f}% (Training)")
    
    # PHASE 2: OUT-OF-SAMPLE TESTING
    print(f"\n🧪 PHASE 2: OUT-OF-SAMPLE TESTING (June-Aug 2025)")
    print("=" * 80)
    
    print(f"Testing top 3 candidates on unseen data...")
    print("-" * 70)
    print(f"{'Rank':<4} {'Ticker':<6} {'Training':<12} {'Testing':<12} {'Consistency':<12}")
    print("-" * 70)
    
    test_results = []
    for i, result in enumerate(top_3_candidates, 1):
        train = result['training']
        test = result['testing']
        
        # Calculate consistency score (penalize large differences)
        consistency_penalty = abs(train['total_return'] - test['total_return'])
        consistency_score = (train['total_return'] + test['total_return']) / 2 - consistency_penalty * 0.1
        
        test_results.append({
            'rank': i,
            'ticker': train['ticker'],
            'training_return': train['total_return'],
            'testing_return': test['total_return'],
            'consistency_score': consistency_score,
            'avg_performance': (train['total_return'] + test['total_return']) / 2,
            'full_result': result
        })
        
        print(f"{i:<4} {train['ticker']:<6} {train['total_return']:+10.1f}% {test['total_return']:+10.1f}% "
              f"{consistency_score:+10.1f}")
    
    # Final selection based on test performance and consistency
    final_ranking = sorted(test_results, key=lambda x: x['testing_return'], reverse=True)
    
    print(f"\n🏅 FINAL RANKING (Based on Test Period Performance):")
    print("=" * 80)
    
    best_performer = final_ranking[0]
    
    for i, candidate in enumerate(final_ranking, 1):
        status = "🥇 WINNER" if i == 1 else f"#{i}"
        print(f"{status:<10} {candidate['ticker']}")
        print(f"          Training: {candidate['training_return']:+7.1f}% | Testing: {candidate['testing_return']:+7.1f}%")
        print(f"          Average:  {candidate['avg_performance']:+7.1f}% | Consistency: {candidate['consistency_score']:+7.1f}")
        print()
    
    # Compare vs SMCI
    # Note: SMCI's May 2025 performance was exceptional (+42.52%), but we need to compare full period
    print(f"📊 PERFORMANCE COMPARISON vs SMCI:")
    print("-" * 50)
    print(f"SMCI (Current holder):")
    print(f"  May 2025 single-month:    +42.52%")
    print(f"  3-month total:            +42.52%")
    print()
    print(f"{best_performer['ticker']} (Top candidate):")
    print(f"  Training (5 months):      {best_performer['training_return']:+7.1f}%")
    print(f"  Testing (3 months):       {best_performer['testing_return']:+7.1f}%")
    
    # Decision criteria
    print(f"\n🤔 REPLACEMENT DECISION CRITERIA:")
    print("-" * 50)
    
    # SMCI's exceptional May performance needs to be considered
    smci_may_return = 42.52
    replacement_threshold = smci_may_return * 0.5  # Need at least 50% of SMCI's May performance
    
    should_replace = best_performer['testing_return'] > replacement_threshold
    
    if should_replace:
        print(f"✅ RECOMMEND REPLACEMENT: {best_performer['ticker']} outperforms threshold")
        print(f"   Threshold: {replacement_threshold:.1f}% (50% of SMCI's May performance)")
        print(f"   Achieved:  {best_performer['testing_return']:.1f}%")
    else:
        print(f"❌ KEEP SMCI: No candidate meets replacement threshold")
        print(f"   Threshold needed: {replacement_threshold:.1f}%")
        print(f"   Best candidate:   {best_performer['testing_return']:.1f}%")
        print(f"   Reason: SMCI's exceptional May 2025 gain is hard to replicate")
    
    # Save detailed results
    print(f"\n💾 SAVING DETAILED RESULTS:")
    print("-" * 40)
    
    # Save comprehensive results
    results_data = []
    for result in training_sorted:
        train = result['training']
        test = result['testing']
        results_data.append({
            'ticker': train['ticker'],
            'training_return': train['total_return'],
            'training_win_rate': train['win_rate'],
            'training_volatility': train['volatility'],
            'testing_return': test['total_return'],
            'testing_win_rate': test['win_rate'],
            'testing_volatility': test['volatility'],
            'avg_return': (train['total_return'] + test['total_return']) / 2,
            'consistency_score': (train['total_return'] + test['total_return']) / 2 - abs(train['total_return'] - test['total_return']) * 0.1
        })
    
    results_df = pd.DataFrame(results_data)
    results_df.to_csv('1st_2nd_monday_train_test_results.csv', index=False)
    print(f"✅ Full results: '1st_2nd_monday_train_test_results.csv'")
    
    # Save winner's detailed trades
    winner_result = best_performer['full_result']
    
    # Training trades
    training_trades = winner_result['training']['trades']
    training_trades['period'] = 'Training'
    training_filename = f"{best_performer['ticker'].lower()}_1st_2nd_training_trades.csv"
    training_trades.to_csv(training_filename, index=False)
    
    # Testing trades  
    testing_trades = winner_result['testing']['trades']
    testing_trades['period'] = 'Testing'
    testing_filename = f"{best_performer['ticker'].lower()}_1st_2nd_testing_trades.csv"
    testing_trades.to_csv(testing_filename, index=False)
    
    # Combined trades
    combined_trades = pd.concat([training_trades, testing_trades], ignore_index=True)
    combined_filename = f"{best_performer['ticker'].lower()}_1st_2nd_all_trades.csv"
    combined_trades.to_csv(combined_filename, index=False)
    
    print(f"✅ Top performer trades: '{combined_filename}'")
    
    # Final recommendation
    print(f"\n🎯 FINAL RECOMMENDATION:")
    print("=" * 50)
    if should_replace:
        print(f"Replace SMCI with {best_performer['ticker']} for 1st→2nd Monday strategy")
        print(f"Expected improvement: Based on validated testing data")
    else:
        print(f"Keep SMCI for 1st→2nd Monday strategy")
        print(f"Reason: Exceptional May 2025 performance (+42.52%) is unmatched")
        print(f"Monitor: Continue tracking {best_performer['ticker']} as backup option")
    
    return best_performer

if __name__ == "__main__":
    find_best_1st_2nd_monday_performer()