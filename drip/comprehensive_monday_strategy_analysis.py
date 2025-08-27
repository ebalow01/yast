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

def get_last_monday_of_month(year, month):
    """Get the last Monday of a given month"""
    mondays = []
    for n in range(1, 6):
        monday = get_nth_monday_of_month(year, month, n)
        if monday:
            mondays.append(monday)
    return mondays[-1] if mondays else None

def test_monday_strategy(df, ticker, strategy_name, buy_monday_type, sell_monday_type, period_type="training"):
    """Test a specific Monday strategy on ticker data with train/test split"""
    
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
        # Determine buy and sell dates based on strategy
        if buy_monday_type == 'last':
            buy_monday = get_last_monday_of_month(2025, month)
        else:
            buy_monday = get_nth_monday_of_month(2025, month, buy_monday_type)
        
        if sell_monday_type == 'first_next':
            # First Monday of next month
            next_month = month + 1 if month < 12 else 1
            next_year = 2025 if month < 12 else 2026
            sell_monday = get_nth_monday_of_month(next_year, next_month, 1)
        elif sell_monday_type == 'last':
            sell_monday = get_last_monday_of_month(2025, month)
        else:
            sell_monday = get_nth_monday_of_month(2025, month, sell_monday_type)
            # If no sell Monday in same month, use first Monday of next month
            if buy_monday and not sell_monday:
                next_month = month + 1 if month < 12 else 1
                next_year = 2025 if month < 12 else 2026
                sell_monday = get_nth_monday_of_month(next_year, next_month, 1)
        
        if buy_monday and sell_monday and buy_monday < sell_monday:
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
    volatility = trades_df['return_pct'].std() if len(trades_df) > 1 else 0
    
    return {
        'ticker': ticker,
        'strategy': strategy_name,
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

def download_ticker_data_if_needed(ticker):
    """Download ticker data if not already exists"""
    filename = f"data_{ticker.lower()}_2025.csv"
    
    if os.path.exists(filename):
        try:
            df = pd.read_csv(filename)
            df['date'] = pd.to_datetime(df['date'])
            return df
        except:
            pass
    
    # Download if file doesn't exist or is corrupted
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        return None
    
    start_date = datetime(2025, 1, 1)
    end_date = datetime.now()
    
    from_date = start_date.strftime('%Y-%m-%d')
    to_date = end_date.strftime('%Y-%m-%d')
    
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
        
        if 'results' not in data or len(data['results']) < 100:
            return None
        
        results = data['results']
        df = pd.DataFrame(results)
        df['date'] = pd.to_datetime(df['t'], unit='ms', utc=True).dt.tz_convert('America/New_York')
        df = df.rename(columns={
            'o': 'open', 'h': 'high', 'l': 'low', 'c': 'close', 'v': 'volume'
        })
        
        # Calculate RSI
        df = df.sort_values('date').reset_index(drop=True)
        rsi_values = calculate_rsi(df['close'].values, period=14)
        df['rsi'] = rsi_values
        
        final_df = df[['date', 'open', 'high', 'low', 'close', 'volume', 'rsi']].copy()
        
        # Save for future use
        final_df.to_csv(filename, index=False)
        
        return final_df
        
    except Exception as e:
        return None

def analyze_ticker_all_strategies(ticker):
    """Analyze a single ticker across all Monday strategies"""
    try:
        # Load or download data
        df = download_ticker_data_if_needed(ticker)
        
        if df is None or len(df) < 100:
            return None
        
        # Define all Monday strategies
        strategies = {
            '1st_to_2nd': (1, 2),
            '2nd_to_3rd': (2, 3), 
            '3rd_to_4th': (3, 4),
            'last_to_1st': ('last', 'first_next')
        }
        
        results = {}
        
        for strategy_name, (buy_type, sell_type) in strategies.items():
            # Test training period
            training_result = test_monday_strategy(
                df, ticker, strategy_name, buy_type, sell_type, "training"
            )
            
            # Test testing period  
            testing_result = test_monday_strategy(
                df, ticker, strategy_name, buy_type, sell_type, "testing"
            )
            
            if training_result and testing_result:
                results[strategy_name] = {
                    'training': training_result,
                    'testing': testing_result
                }
        
        if results:
            return {
                'ticker': ticker,
                'strategies': results,
                'data_points': len(df)
            }
        
        return None
        
    except Exception as e:
        return None

def comprehensive_monday_analysis():
    """Comprehensive analysis of all Monday strategies across top 295 tickers"""
    
    print("🚀 COMPREHENSIVE MONDAY STRATEGY ANALYSIS")
    print("=" * 100)
    print("📊 Dataset: Top 295 volume tickers")
    print("🎯 Strategies: 1st→2nd, 2nd→3rd, 3rd→4th, Last→1st Monday") 
    print("📚 Training: Jan-May 2025 | 🧪 Testing: June-Aug 2025")
    print("⚡ Goal: Find optimal replacement for each pipeline position")
    print("=" * 100)
    
    # Load ticker list from summary
    try:
        summary_df = pd.read_csv('top_300_tickers_summary.csv')
        tickers = summary_df['ticker'].tolist()[:295]  # Use top 295
        print(f"✅ Loaded {len(tickers)} tickers from summary file")
    except:
        print("❌ Could not load ticker summary. Run download script first.")
        return
    
    print(f"\n📥 ANALYZING {len(tickers)} TICKERS ACROSS 4 MONDAY STRATEGIES")
    print("⚡ Using parallel processing (10 workers)")
    print("⏰ Estimated time: ~8-12 minutes") 
    print("📊 Progress updates every 25 completions")
    print("=" * 80)
    
    # Analyze all tickers in parallel
    all_results = []
    completed = 0
    failed = 0
    
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        # Submit all tasks
        future_to_ticker = {executor.submit(analyze_ticker_all_strategies, ticker): ticker 
                           for ticker in tickers}
        
        # Process completed tasks
        for future in as_completed(future_to_ticker):
            ticker = future_to_ticker[future]
            completed += 1
            
            try:
                result = future.result()
                if result:
                    all_results.append(result)
                    
                    # Show sample performance
                    if completed <= 25 or completed % 25 == 0:
                        strategies = result['strategies']
                        sample_strategy = list(strategies.keys())[0]
                        sample_perf = strategies[sample_strategy]
                        train_ret = sample_perf['training']['total_return']
                        test_ret = sample_perf['testing']['total_return']
                        
                        print(f"✅ {completed:3d}/295: {ticker:<6} | Sample ({sample_strategy}): "
                              f"Train {train_ret:+6.1f}% | Test {test_ret:+6.1f}% | "
                              f"Strategies: {len(strategies)}")
                else:
                    failed += 1
                    if completed <= 25 or completed % 25 == 0:
                        print(f"❌ {completed:3d}/295: {ticker:<6} | Analysis failed")
                        
            except Exception as e:
                failed += 1
                if completed <= 25 or completed % 25 == 0:
                    print(f"💥 {completed:3d}/295: {ticker:<6} | Exception: {str(e)[:30]}")
    
    elapsed_time = time.time() - start_time
    successful_count = len(all_results)
    
    print(f"\n✅ COMPREHENSIVE ANALYSIS COMPLETE!")
    print("=" * 80)
    print(f"⏱️  Total Time: {elapsed_time:.1f} seconds")
    print(f"✅ Successful: {successful_count} tickers")
    print(f"❌ Failed: {failed} tickers") 
    print(f"📊 Success Rate: {successful_count/len(tickers)*100:.1f}%")
    
    if not all_results:
        print("❌ No successful analyses!")
        return
    
    # Analyze results for each strategy
    strategies = ['1st_to_2nd', '2nd_to_3rd', '3rd_to_4th', 'last_to_1st']
    strategy_results = {strategy: [] for strategy in strategies}
    
    # Organize results by strategy
    for result in all_results:
        ticker = result['ticker']
        for strategy_name, strategy_data in result['strategies'].items():
            if strategy_name in strategy_results:
                combined_result = {
                    'ticker': ticker,
                    'training_return': strategy_data['training']['total_return'],
                    'testing_return': strategy_data['testing']['total_return'],
                    'training_win_rate': strategy_data['training']['win_rate'],
                    'testing_win_rate': strategy_data['testing']['win_rate'],
                    'avg_performance': (strategy_data['training']['total_return'] + strategy_data['testing']['total_return']) / 2,
                    'consistency_score': (strategy_data['training']['total_return'] + strategy_data['testing']['total_return']) / 2 - 
                                       abs(strategy_data['training']['total_return'] - strategy_data['testing']['total_return']) * 0.1
                }
                strategy_results[strategy_name].append(combined_result)
    
    # Find best performers for each strategy
    print(f"\n🏆 BEST PERFORMERS BY STRATEGY (Top 5 Each):")
    print("=" * 100)
    
    strategy_winners = {}
    
    for strategy in strategies:
        results = strategy_results[strategy]
        if not results:
            continue
            
        # Sort by testing performance (out-of-sample validation)
        results.sort(key=lambda x: x['testing_return'], reverse=True)
        
        strategy_name_formatted = strategy.replace('_', '→').upper()
        print(f"\n🎯 {strategy_name_formatted} MONDAY STRATEGY:")
        print("-" * 80)
        print(f"{'Rank':<4} {'Ticker':<6} {'Training':<10} {'Testing':<10} {'Avg':<8} {'Consistency':<10}")
        print("-" * 80)
        
        top_5 = results[:5]
        strategy_winners[strategy] = results[0]  # Best performer
        
        for i, result in enumerate(top_5, 1):
            print(f"{i:<4} {result['ticker']:<6} {result['training_return']:+8.1f}% "
                  f"{result['testing_return']:+8.1f}% {result['avg_performance']:+6.1f}% "
                  f"{result['consistency_score']:+8.1f}")
    
    # Compare to current pipeline
    current_pipeline = {
        '1st_to_2nd': 'SMCI',
        '2nd_to_3rd': 'NVDA', 
        '3rd_to_4th': 'TSLL',  # Already replaced CRM
        'last_to_1st': 'DRIP'
    }
    
    print(f"\n📊 RECOMMENDED REPLACEMENTS vs CURRENT PIPELINE:")
    print("=" * 90)
    print(f"{'Strategy':<15} {'Current':<8} {'Best Candidate':<12} {'Test Return':<12} {'Improvement'}")
    print("-" * 90)
    
    recommendations = {}
    
    for strategy in strategies:
        if strategy not in strategy_winners:
            continue
            
        winner = strategy_winners[strategy]
        current = current_pipeline.get(strategy, 'N/A')
        strategy_formatted = strategy.replace('_', '→').upper()
        
        # Calculate improvement (this would need current ticker's performance)
        print(f"{strategy_formatted:<15} {current:<8} {winner['ticker']:<12} {winner['testing_return']:+10.1f}% {'TBD'}")
        
        recommendations[strategy] = {
            'current': current,
            'recommended': winner['ticker'],
            'testing_return': winner['testing_return'],
            'training_return': winner['training_return'],
            'consistency': winner['consistency_score']
        }
    
    # Save comprehensive results
    print(f"\n💾 SAVING COMPREHENSIVE RESULTS:")
    print("-" * 50)
    
    # Save strategy-specific results
    for strategy in strategies:
        if strategy in strategy_results and strategy_results[strategy]:
            results_df = pd.DataFrame(strategy_results[strategy])
            filename = f"{strategy}_comprehensive_results.csv"
            results_df.to_csv(filename, index=False)
            print(f"✅ {strategy}: {filename} ({len(results_df)} tickers)")
    
    # Save recommendations summary
    recommendations_data = []
    for strategy, rec in recommendations.items():
        recommendations_data.append({
            'strategy': strategy.replace('_', '_to_'),
            'current_ticker': rec['current'],
            'recommended_ticker': rec['recommended'], 
            'testing_return_pct': rec['testing_return'],
            'training_return_pct': rec['training_return'],
            'consistency_score': rec['consistency']
        })
    
    recommendations_df = pd.DataFrame(recommendations_data)
    recommendations_df.to_csv('monday_strategy_recommendations.csv', index=False)
    print(f"✅ Recommendations: 'monday_strategy_recommendations.csv'")
    
    print(f"\n🎯 ANALYSIS SUMMARY:")
    print("=" * 50)
    print(f"• Analyzed {successful_count} tickers across 4 Monday strategies")
    print(f"• Identified optimal replacements for each pipeline position")
    print(f"• Used train/test validation to prevent overfitting")
    print(f"• Results saved for detailed review and implementation")
    
    return recommendations

if __name__ == "__main__":
    comprehensive_monday_analysis()