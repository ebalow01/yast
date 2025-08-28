import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import sys
import calendar
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

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

def download_ticker_data(ticker, api_key, months_back=8):
    """Download recent data for a ticker (last N months)"""
    
    # Calculate date range for last N months
    end_date = datetime.now()
    start_date = end_date - timedelta(days=months_back * 32)  # ~32 days per month buffer
    
    from_date = start_date.strftime('%Y-%m-%d')
    to_date = end_date.strftime('%Y-%m-%d')
    
    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/15/minute/{from_date}/{to_date}"
    params = {
        'adjusted': 'true',
        'sort': 'asc',
        'limit': 50000,
        'apikey': api_key
    }
    
    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if 'results' not in data:
            return None
        
        results = data['results']
        
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
        
        # Filter for market hours (9:30 AM - 4:00 PM ET)
        df = df[(df['date'].dt.hour >= 9) & 
                ((df['date'].dt.hour < 16) | 
                 ((df['date'].dt.hour == 9) & (df['date'].dt.minute >= 30)))].copy()
        
        # Get daily closes (4:00 PM ET bars or last bar of each day)
        daily_closes = df[df['date'].dt.time == pd.Timestamp('16:00:00').time()].copy()
        if len(daily_closes) == 0:
            # Group by date and take last bar of each day
            daily_closes = df.groupby(df['date'].dt.date).agg({
                'open': 'first',
                'high': 'max', 
                'low': 'min',
                'close': 'last',
                'volume': 'sum',
                'date': 'last'
            }).reset_index(drop=True)
        
        # Calculate RSI on daily closes
        daily_closes = daily_closes.sort_values('date').reset_index(drop=True)
        rsi_values = calculate_rsi(daily_closes['close'].values, period=14)
        daily_closes['rsi'] = rsi_values
        
        final_df = daily_closes[['date', 'open', 'high', 'low', 'close', 'volume', 'rsi']].copy()
        final_df['ticker'] = ticker
        final_df['current_price'] = final_df['close'].iloc[-1]
        
        return final_df
        
    except Exception as e:
        print(f"❌ Error downloading {ticker}: {e}")
        return None

def analyze_strategy_performance(df, strategy_type, train_months, test_months):
    """Analyze strategy performance for given train/test periods with multiple variants"""
    
    # Define strategy parameters
    if strategy_type == "1st_to_2nd":
        buy_monday, sell_monday = 1, 2
    elif strategy_type == "2nd_to_3rd":
        buy_monday, sell_monday = 2, 3
    elif strategy_type == "3rd_to_4th":
        buy_monday, sell_monday = 3, 4
    elif strategy_type == "last_to_1st":
        buy_monday, sell_monday = "last", 1
    
    def get_trades(months, period_name):
        trades = []
        
        for year, month in months:
            try:
                # Get buy date
                if buy_monday == "last":
                    buy_date_dt = get_last_monday_of_month(year, month)
                else:
                    buy_date_dt = get_nth_monday_of_month(year, month, buy_monday)
                
                # Get sell date
                if sell_monday == 1:
                    # Next month's first Monday
                    next_month = month + 1 if month < 12 else 1
                    next_year = year if month < 12 else year + 1
                    sell_date_dt = get_nth_monday_of_month(next_year, next_month, 1)
                else:
                    sell_date_dt = get_nth_monday_of_month(year, month, sell_monday)
                
                if buy_date_dt and sell_date_dt:
                    buy_date = buy_date_dt.date()
                    sell_date = sell_date_dt.date()
                    
                    # Find closest trading data - use next available day if exact date missing
                    buy_data = df[df['date'].dt.date >= buy_date].head(1)
                    sell_data = df[df['date'].dt.date >= sell_date].head(1)
                    
                    # If no data found within 5 days, skip this trade
                    if len(buy_data) > 0:
                        actual_buy_date = buy_data.iloc[0]['date'].date()
                        if (actual_buy_date - buy_date).days > 5:
                            continue
                    
                    if len(sell_data) > 0:
                        actual_sell_date = sell_data.iloc[0]['date'].date() 
                        if (actual_sell_date - sell_date).days > 5:
                            continue
                    
                    if len(buy_data) > 0 and len(sell_data) > 0:
                        buy_row = buy_data.iloc[0]
                        sell_row = sell_data.iloc[0]
                        
                        buy_price = buy_row['close']
                        sell_price = sell_row['close']
                        buy_rsi = buy_row['rsi']
                        
                        return_pct = ((sell_price - buy_price) / buy_price) * 100
                        
                        trades.append({
                            'period': period_name,
                            'month': calendar.month_name[month],
                            'return_pct': return_pct,
                            'buy_rsi': buy_rsi
                        })
                        
            except Exception:
                continue
                
        return trades
    
    # Get training and testing trades
    training_trades = get_trades(train_months, "Training")
    testing_trades = get_trades(test_months, "Testing")
    
    results = {}
    
    # Calculate training results
    if training_trades:
        training_df = pd.DataFrame(training_trades)
        training_total = ((training_df['return_pct'] / 100 + 1).prod() - 1) * 100
        training_wins = (training_df['return_pct'] > 0).sum()
        training_win_rate = (training_wins / len(training_df)) * 100
        
        results['training_return'] = training_total
        results['training_win_rate'] = training_win_rate
        results['training_trades'] = len(training_trades)
    
    # Calculate testing results
    if testing_trades:
        testing_df = pd.DataFrame(testing_trades)
        testing_total = ((testing_df['return_pct'] / 100 + 1).prod() - 1) * 100
        testing_wins = (testing_df['return_pct'] > 0).sum()
        testing_win_rate = (testing_wins / len(testing_df)) * 100
        
        results['testing_return'] = testing_total
        results['testing_win_rate'] = testing_win_rate
        results['testing_trades'] = len(testing_trades)
    
    return results

def process_single_ticker(args):
    """Process a single ticker for all strategies"""
    ticker, api_key, train_months, test_months = args
    
    # Download data
    df = download_ticker_data(ticker, api_key, months_back=8)
    if df is None:
        return None
    
    # Filter for stocks over $5
    current_price = df['current_price'].iloc[0]
    if current_price <= 5.0:
        return None
    
    # Check if we have enough data for the analysis period
    if len(df) < 60:  # Less than ~3 months of trading days
        return None
    
    results = {'ticker': ticker, 'current_price': current_price}
    
    # Analyze all 4 strategies
    strategies = ['1st_to_2nd', '2nd_to_3rd', '3rd_to_4th', 'last_to_1st']
    
    for strategy in strategies:
        strategy_results = analyze_strategy_performance(df, strategy, train_months, test_months)
        
        # Add strategy prefix to results
        for key, value in strategy_results.items():
            results[f'{strategy}_{key}'] = value
    
    return results

def monthly_strategy_pipeline():
    """Main pipeline to run monthly strategy optimization"""
    
    print("🚀 MONTHLY STRATEGY PIPELINE")
    print("=" * 80)
    
    # Get current date and calculate train/test periods
    current_date = datetime.now()
    print(f"📅 Run Date: {current_date.strftime('%Y-%m-%d %H:%M')}")
    
    # Use complete months only - avoid partial current month
    # Since we're in August, use May-July for testing, Jan-April for training
    current_year = current_date.year
    
    # Training: January - April 2025 (4 months)
    train_months = [
        (current_year, 1),   # January
        (current_year, 2),   # February  
        (current_year, 3),   # March
        (current_year, 4)    # April
    ]
    
    # Testing: May - July 2025 (3 months) 
    test_months = [
        (current_year, 5),   # May
        (current_year, 6),   # June
        (current_year, 7)    # July
    ]
    
    print(f"📚 Training Period: {calendar.month_name[train_months[0][1]]} {train_months[0][0]} - {calendar.month_name[train_months[-1][1]]} {train_months[-1][0]}")
    print(f"🧪 Testing Period: {calendar.month_name[test_months[0][1]]} {test_months[0][0]} - {calendar.month_name[test_months[-1][1]]} {test_months[-1][0]}")
    print("=" * 80)
    
    # Load API key
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found in environment")
        return
    
    # Load top volume tickers
    try:
        print("📥 Loading ticker universe...")
        
        # Use existing ticker summary if available, otherwise use fallback list
        if os.path.exists('top_300_tickers_summary.csv'):
            ticker_df = pd.read_csv('top_300_tickers_summary.csv')
            tickers = ticker_df['ticker'].tolist()
            print(f"✅ Loaded {len(tickers)} tickers from existing summary")
        else:
            # Fallback: Use market snapshot to get active tickers
            print("📥 Downloading fresh ticker data from market snapshot...")
            
            url = "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers"
            params = {
                'apikey': api_key
            }
            
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if 'tickers' not in data:
                print("❌ Could not get market snapshot")
                return
            
            # Sort by volume and take top 300
            ticker_data = data['tickers']
            # Filter out tickers with no volume or price data
            valid_tickers = [
                t for t in ticker_data 
                if t.get('day', {}).get('v', 0) > 0 and t.get('min', {}).get('c', 0) > 0
            ]
            
            # Sort by volume descending
            valid_tickers.sort(key=lambda x: x.get('day', {}).get('v', 0), reverse=True)
            
            # Take top 300
            top_tickers = valid_tickers[:300]
            tickers = [t['ticker'] for t in top_tickers]
            
            print(f"✅ Loaded {len(tickers)} tickers from market snapshot")
        
    except Exception as e:
        print(f"❌ Error loading tickers: {e}")
        return
    
    # Process all tickers in parallel
    print(f"\n📊 Analyzing {len(tickers)} tickers across 4 strategies...")
    print("⚡ Processing in parallel (10 workers)...")
    
    # Prepare arguments for parallel processing
    args_list = [(ticker, api_key, train_months, test_months) for ticker in tickers]
    
    all_results = []
    successful_count = 0
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        future_to_ticker = {executor.submit(process_single_ticker, args): args[0] for args in args_list}
        
        for future in as_completed(future_to_ticker):
            ticker = future_to_ticker[future]
            try:
                result = future.result()
                if result:
                    all_results.append(result)
                    successful_count += 1
                    if successful_count % 25 == 0:
                        print(f"✅ Processed {successful_count} tickers...")
            except Exception as e:
                print(f"❌ {ticker}: {e}")
            
            # Rate limiting (100 requests per second limit)
            time.sleep(0.01)
    
    print(f"✅ Successfully analyzed {len(all_results)} tickers")
    
    # Define strategies and names for analysis
    strategies = ['1st_to_2nd', '2nd_to_3rd', '3rd_to_4th', 'last_to_1st']
    strategy_names = {
        '1st_to_2nd': '1ST→2ND MONDAY',
        '2nd_to_3rd': '2ND→3RD MONDAY', 
        '3rd_to_4th': '3RD→4TH MONDAY',
        'last_to_1st': 'LAST→1ST MONDAY'
    }
    
    if len(all_results) > 0:
        print(f"\n📊 ANALYSIS QUALITY CHECK:")
        # Check how many tickers have valid data for each strategy
        df_temp = pd.DataFrame(all_results)
        for strategy in strategies:
            valid_count = len(df_temp[(df_temp[f'{strategy}_training_return'].notna()) & 
                                    (df_temp[f'{strategy}_testing_return'].notna())])
            print(f"   {strategy_names[strategy]}: {valid_count} valid candidates")
            
        over_5_count = len(df_temp[df_temp['current_price'] > 5.0])
        print(f"   Tickers over $5: {over_5_count}/{len(df_temp)} ({over_5_count/len(df_temp)*100:.1f}%)")
    
    if len(all_results) == 0:
        print("❌ No successful analyses - cannot proceed")
        return
    
    # Convert to DataFrame for analysis
    df = pd.DataFrame(all_results)
    
    # Analyze each strategy
    
    recommended_tickers = {}
    
    print(f"\n🏆 STRATEGY OPTIMIZATION RESULTS:")
    print("=" * 80)
    
    for strategy in strategies:
        print(f"\n🎯 {strategy_names[strategy]}:")
        print("-" * 60)
        
        # Filter tickers that have data for this strategy
        strategy_df = df[(df[f'{strategy}_training_return'].notna()) & 
                        (df[f'{strategy}_testing_return'].notna())].copy()
        
        if len(strategy_df) == 0:
            print("❌ No data available for this strategy")
            continue
        
        print(f"📊 Total valid candidates: {len(strategy_df)}")
        
        # Show training return distribution
        training_returns = strategy_df[f'{strategy}_training_return'].sort_values(ascending=False)
        print(f"📈 Training return range: {training_returns.iloc[0]:+.1f}% (best) to {training_returns.iloc[-1]:+.1f}% (worst)")
        
        if len(training_returns) >= 10:
            print(f"📊 10th best training return: {training_returns.iloc[9]:+.1f}%")
        else:
            print(f"⚠️ Only {len(training_returns)} candidates available (less than 10)")
        
        # Get top 10 by training return
        top_10_training = strategy_df.nlargest(min(10, len(strategy_df)), f'{strategy}_training_return')
        
        print("📚 TOP 10 TRAINING PERFORMERS:")
        print(f"{'Rank':<4} {'Ticker':<6} {'Training':<10} {'Testing':<10} {'Price':<8}")
        print("-" * 50)
        
        for i, (_, row) in enumerate(top_10_training.iterrows(), 1):
            print(f"{i:<4} {row['ticker']:<6} {row[f'{strategy}_training_return']:+8.1f}% "
                  f"{row[f'{strategy}_testing_return']:+8.1f}% ${row['current_price']:<6.2f}")
        
        # Select best testing performer from top 10 training
        winner = top_10_training.nlargest(1, f'{strategy}_testing_return').iloc[0]
        training_rank = (top_10_training[f'{strategy}_training_return'] >= winner[f'{strategy}_training_return']).sum()
        
        print(f"\n🏆 WINNER: {winner['ticker']}")
        print(f"   Training: {winner[f'{strategy}_training_return']:+.1f}% (Rank #{training_rank})")
        print(f"   Testing: {winner[f'{strategy}_testing_return']:+.1f}%")
        print(f"   Price: ${winner['current_price']:.2f}")
        print(f"   Win Rates: Train {winner[f'{strategy}_training_win_rate']:.0f}%, Test {winner[f'{strategy}_testing_win_rate']:.0f}%")
        
        # Flag potential outliers
        testing_return = winner[f'{strategy}_testing_return']
        if abs(testing_return) > 200:
            print(f"   ⚠️ OUTLIER ALERT: Extreme testing return ({testing_return:+.1f}%) - Verify manually!")
        elif abs(testing_return) > 100:
            print(f"   ⚠️ HIGH RETURN: Large testing return ({testing_return:+.1f}%) - Review carefully")
        
        recommended_tickers[strategy] = {
            'ticker': winner['ticker'],
            'training_return': winner[f'{strategy}_training_return'],
            'testing_return': winner[f'{strategy}_testing_return'],
            'current_price': winner['current_price'],
            'training_rank': training_rank
        }
    
    # Calculate combined pipeline performance
    print(f"\n📊 COMBINED PIPELINE PERFORMANCE:")
    print("=" * 50)
    
    testing_returns = []
    
    print(f"{'Strategy':<15} {'Ticker':<8} {'Training':<10} {'Testing':<10} {'Price'}")
    print("-" * 65)
    
    for strategy, data in recommended_tickers.items():
        strategy_formatted = strategy.replace('_to_', '→').upper()
        print(f"{strategy_formatted:<15} {data['ticker']:<8} "
              f"{data['training_return']:+8.1f}% {data['testing_return']:+8.1f}% "
              f"${data['current_price']:<6.2f}")
        
        testing_returns.append(data['testing_return'])
    
    # Calculate average testing return instead of compound
    average_testing_return = sum(testing_returns) / len(testing_returns) if testing_returns else 0
    
    print(f"\n🎯 PIPELINE SUMMARY:")
    print(f"   Average Testing Return: {average_testing_return:+.1f}%")
    print(f"   Individual Returns: {' | '.join([f'{r:+.1f}%' for r in testing_returns])}")
    print(f"   Methodology: Top 10 training → Best testing")
    print(f"   Price Filter: All tickers > $5")
    print(f"   Data Period: 7 months (4 train + 3 test)")
    
    # Save results
    timestamp = current_date.strftime('%Y%m%d_%H%M')
    
    # Save detailed results
    df.to_csv(f'monthly_analysis_{timestamp}.csv', index=False)
    
    # Save recommendations
    recommendations_df = pd.DataFrame([
        {
            'strategy': strategy.replace('_to_', '→').upper(),
            'ticker': data['ticker'],
            'training_return': data['training_return'],
            'testing_return': data['testing_return'],
            'current_price': data['current_price'],
            'training_rank_in_top10': data['training_rank'],
            'run_date': current_date.strftime('%Y-%m-%d'),
            'train_period': f"{calendar.month_name[train_months[0][1]]} {train_months[0][0]} - {calendar.month_name[train_months[-1][1]]} {train_months[-1][0]}",
            'test_period': f"{calendar.month_name[test_months[0][1]]} {test_months[0][0]} - {calendar.month_name[test_months[-1][1]]} {test_months[-1][0]}"
        }
        for strategy, data in recommended_tickers.items()
    ])
    
    recommendations_df.to_csv(f'recommendations_{timestamp}.csv', index=False)
    
    print(f"\n✅ Results saved:")
    print(f"   📄 Detailed analysis: monthly_analysis_{timestamp}.csv")
    print(f"   🏆 Recommendations: recommendations_{timestamp}.csv")
    
    print(f"\n🎯 NEXT STEPS:")
    print("• Review recommendations for any obvious outliers")
    print("• Consider current market conditions")
    print("• Implement trades on upcoming Monday schedule")
    print("• Run this pipeline again next month")

if __name__ == "__main__":
    monthly_strategy_pipeline()