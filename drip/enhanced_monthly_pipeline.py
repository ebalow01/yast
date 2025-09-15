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

def get_thursday_of_week(monday_date):
    """Get Thursday of the same week as Monday"""
    return monday_date + timedelta(days=3)

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

def analyze_enhanced_strategies(df, strategy_type, train_months, test_months):
    """Analyze multiple strategy variants: Basic, RSI Filter, Double Down, Stop Loss"""
    
    # Define strategy parameters
    if strategy_type == "1st_to_2nd":
        buy_monday, sell_monday = 1, 2
    elif strategy_type == "2nd_to_3rd":
        buy_monday, sell_monday = 2, 3
    elif strategy_type == "3rd_to_4th":
        buy_monday, sell_monday = 3, 4
    elif strategy_type == "last_to_1st":
        buy_monday, sell_monday = "last", 1
    
    def get_enhanced_trades(months, period_name):
        # Initialize trade lists for each strategy variant
        basic_trades = []
        rsi_filter_trades = []
        double_down_trades = []
        stop_loss_trades = []
        
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
                    thursday_date = get_thursday_of_week(buy_date_dt).date()
                    
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
                    thursday_data = df[df['date'].dt.date >= thursday_date].head(1)
                    
                    if len(buy_data) > 0 and len(sell_data) > 0:
                        buy_row = buy_data.iloc[0]
                        sell_row = sell_data.iloc[0]
                        
                        buy_price = buy_row['close']
                        sell_price = sell_row['close']
                        buy_rsi = buy_row['rsi']
                        
                        # Basic strategy
                        basic_return = ((sell_price - buy_price) / buy_price) * 100
                        basic_trades.append({
                            'period': period_name,
                            'month': calendar.month_name[month],
                            'return_pct': basic_return,
                            'buy_rsi': buy_rsi
                        })
                        
                        # RSI Filter strategy (only trade if RSI <= 70)
                        if pd.notna(buy_rsi) and buy_rsi <= 70:
                            rsi_filter_trades.append({
                                'period': period_name,
                                'month': calendar.month_name[month],
                                'return_pct': basic_return,
                                'buy_rsi': buy_rsi
                            })
                        
                        # Double Down strategy (buy more on Thursday if down >5%)
                        if len(thursday_data) > 0:
                            thursday_row = thursday_data.iloc[0]
                            thursday_price = thursday_row['close']
                            
                            # Check if down >5% by Thursday
                            thursday_return = ((thursday_price - buy_price) / buy_price) * 100
                            
                            if thursday_return <= -5:  # Down 5% or more
                                # Double down - buy equal amount on Thursday
                                avg_buy_price = (buy_price + thursday_price) / 2
                                double_down_return = ((sell_price - avg_buy_price) / avg_buy_price) * 100
                            else:
                                double_down_return = basic_return
                            
                            double_down_trades.append({
                                'period': period_name,
                                'month': calendar.month_name[month],
                                'return_pct': double_down_return,
                                'buy_rsi': buy_rsi,
                                'doubled_down': thursday_return <= -5
                            })
                        
                        # Stop Loss strategy (sell on Thursday if down >10%)
                        if len(thursday_data) > 0:
                            thursday_row = thursday_data.iloc[0]
                            thursday_price = thursday_row['close']
                            
                            # Check if down >10% by Thursday
                            thursday_return = ((thursday_price - buy_price) / buy_price) * 100
                            
                            if thursday_return <= -10:  # Down 10% or more, trigger stop loss
                                stop_loss_return = thursday_return
                            else:
                                stop_loss_return = basic_return
                            
                            stop_loss_trades.append({
                                'period': period_name,
                                'month': calendar.month_name[month],
                                'return_pct': stop_loss_return,
                                'buy_rsi': buy_rsi,
                                'stopped_out': thursday_return <= -10
                            })
                        
            except Exception:
                continue
                
        return {
            'basic': basic_trades,
            'rsi_filter': rsi_filter_trades,
            'double_down': double_down_trades,
            'stop_loss': stop_loss_trades
        }
    
    # Get training and testing trades for all variants
    training_trades = get_enhanced_trades(train_months, "Training")
    testing_trades = get_enhanced_trades(test_months, "Testing")
    
    results = {}
    
    # Calculate results for each strategy variant
    for variant in ['basic', 'rsi_filter', 'double_down', 'stop_loss']:
        variant_results = {}
        
        # Training results
        if training_trades[variant]:
            training_df = pd.DataFrame(training_trades[variant])
            training_total = ((training_df['return_pct'] / 100 + 1).prod() - 1) * 100
            training_wins = (training_df['return_pct'] > 0).sum()
            training_win_rate = (training_wins / len(training_df)) * 100
            
            variant_results['training_return'] = training_total
            variant_results['training_win_rate'] = training_win_rate
            variant_results['training_trades'] = len(training_trades[variant])
        
        # Testing results
        if testing_trades[variant]:
            testing_df = pd.DataFrame(testing_trades[variant])
            testing_total = ((testing_df['return_pct'] / 100 + 1).prod() - 1) * 100
            testing_wins = (testing_df['return_pct'] > 0).sum()
            testing_win_rate = (testing_wins / len(testing_df)) * 100
            
            variant_results['testing_return'] = testing_total
            variant_results['testing_win_rate'] = testing_win_rate
            variant_results['testing_trades'] = len(testing_trades[variant])
            
            # Additional metrics for enhanced strategies
            if variant == 'double_down' and testing_trades[variant]:
                doubled_down_count = sum(1 for t in testing_trades[variant] if t.get('doubled_down', False))
                variant_results['double_down_triggers'] = doubled_down_count
            
            if variant == 'stop_loss' and testing_trades[variant]:
                stopped_out_count = sum(1 for t in testing_trades[variant] if t.get('stopped_out', False))
                variant_results['stop_loss_triggers'] = stopped_out_count
        
        results[variant] = variant_results
    
    return results

def process_single_ticker_enhanced(args):
    """Process a single ticker for all strategy variants"""
    ticker, api_key, train_months, test_months = args
    
    # Download data
    df = download_ticker_data(ticker, api_key, months_back=8)
    
    # Add 1-second delay per worker to respect rate limits
    time.sleep(1)
    
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
    
    # Analyze all 4 strategies with variants
    strategies = ['1st_to_2nd', '2nd_to_3rd', '3rd_to_4th', 'last_to_1st']
    
    for strategy in strategies:
        strategy_results = analyze_enhanced_strategies(df, strategy, train_months, test_months)
        
        # Add strategy and variant prefix to results
        for variant, variant_data in strategy_results.items():
            for key, value in variant_data.items():
                results[f'{strategy}_{variant}_{key}'] = value
    
    return results

def enhanced_monthly_pipeline():
    """Enhanced monthly pipeline with RSI, Double Down, and Stop Loss strategies"""
    
    print("🚀 ENHANCED MONTHLY STRATEGY PIPELINE")
    print("=" * 80)
    print("🎯 Testing: Basic, RSI Filter, Double Down, Stop Loss variants")
    print("=" * 80)
    
    # Get current date and calculate train/test periods
    current_date = datetime.now()
    print(f"📅 Run Date: {current_date.strftime('%Y-%m-%d %H:%M')}")
    
    # Use complete months only - avoid partial current month
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
    
    # Load ticker universe
    try:
        print("📥 Loading ticker universe...")
        
        # Check for combined file first, then fallback to original
        ticker_file_paths = [
            'combined_525_tickers_20250903_0747.csv',  # New combined file
            'top_300_tickers_summary.csv',              # Original file
            'combined_*_tickers_*.csv'                   # Any combined file pattern
        ]
        
        ticker_df = None
        for pattern in ticker_file_paths:
            if '*' in pattern:
                # Handle glob patterns
                import glob
                files = glob.glob(pattern)
                if files:
                    # Use most recent file
                    latest_file = max(files, key=os.path.getmtime)
                    ticker_df = pd.read_csv(latest_file)
                    print(f"✅ Loaded {len(ticker_df)} tickers from {latest_file}")
                    break
            elif os.path.exists(pattern):
                ticker_df = pd.read_csv(pattern)
                print(f"✅ Loaded {len(ticker_df)} tickers from {pattern}")
                break
        
        if ticker_df is None:
            print("❌ No ticker file found. Please run ticker collection first.")
            return
        
        tickers = ticker_df['ticker'].tolist()
        print(f"🎯 Using {len(tickers)} tickers for strategy analysis")
            
    except Exception as e:
        print(f"❌ Error loading tickers: {e}")
        return
    
    # Process all tickers in parallel
    print(f"\n📊 Analyzing {len(tickers)} tickers across 4 strategies x 4 variants...")
    print("⚡ Processing in parallel (8 workers)...")
    
    # Prepare arguments for parallel processing
    args_list = [(ticker, api_key, train_months, test_months) for ticker in tickers]
    
    all_results = []
    successful_count = 0
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_ticker = {executor.submit(process_single_ticker_enhanced, args): args[0] for args in args_list}
        
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
    
    print(f"✅ Successfully analyzed {len(all_results)} tickers")
    
    if len(all_results) == 0:
        print("❌ No successful analyses - cannot proceed")
        return
    
    # Convert to DataFrame for analysis
    df = pd.DataFrame(all_results)
    
    # Define strategies and names for analysis
    strategies = ['1st_to_2nd', '2nd_to_3rd', '3rd_to_4th', 'last_to_1st']
    strategy_names = {
        '1st_to_2nd': '1ST→2ND MONDAY',
        '2nd_to_3rd': '2ND→3RD MONDAY', 
        '3rd_to_4th': '3RD→4TH MONDAY',
        'last_to_1st': 'LAST→1ST MONDAY'
    }
    
    variants = ['basic', 'rsi_filter', 'double_down', 'stop_loss']
    variant_names = {
        'basic': 'Basic Strategy',
        'rsi_filter': 'RSI Filter (≤70)',
        'double_down': 'Double Down (Thu)',
        'stop_loss': 'Stop Loss (Thu)'
    }
    
    print(f"\n🏆 ENHANCED STRATEGY COMPARISON:")
    print("=" * 100)
    
    all_recommendations = {}
    
    for strategy in strategies:
        print(f"\n🎯 {strategy_names[strategy]}:")
        print("=" * 80)
        
        strategy_comparisons = {}
        
        for variant in variants:
            # Filter tickers that have data for this strategy variant
            strategy_df = df[(df[f'{strategy}_{variant}_training_return'].notna()) & 
                            (df[f'{strategy}_{variant}_testing_return'].notna())].copy()
            
            if len(strategy_df) == 0:
                continue
            
            # Get top 10 by training return
            top_10_training = strategy_df.nlargest(min(10, len(strategy_df)), f'{strategy}_{variant}_training_return')
            
            if len(top_10_training) > 0:
                # Select best testing performer from top 10 training
                winner = top_10_training.nlargest(1, f'{strategy}_{variant}_testing_return').iloc[0]
                
                strategy_comparisons[variant] = {
                    'ticker': winner['ticker'],
                    'training_return': winner[f'{strategy}_{variant}_training_return'],
                    'testing_return': winner[f'{strategy}_{variant}_testing_return'],
                    'current_price': winner['current_price'],
                    'candidates': len(strategy_df)
                }
        
        # Display comparison for this strategy
        if strategy_comparisons:
            print(f"{'Variant':<18} {'Ticker':<8} {'Training':<10} {'Testing':<10} {'Candidates'}")
            print("-" * 70)
            
            best_variant = None
            best_testing = -float('inf')
            
            for variant, data in strategy_comparisons.items():
                testing_return = data['testing_return']
                if testing_return > best_testing:
                    best_testing = testing_return
                    best_variant = variant
                
                marker = "🏆" if variant == best_variant else "  "
                print(f"{marker} {variant_names[variant]:<16} {data['ticker']:<8} "
                      f"{data['training_return']:+8.1f}% {data['testing_return']:+8.1f}% "
                      f"{data['candidates']}")
            
            if best_variant:
                all_recommendations[strategy] = {
                    'variant': best_variant,
                    'data': strategy_comparisons[best_variant]
                }
    
    # Final recommendation summary
    print(f"\n🏆 FINAL ENHANCED RECOMMENDATIONS:")
    print("=" * 90)
    print(f"{'Strategy':<15} {'Best Variant':<18} {'Ticker':<8} {'Training':<10} {'Testing':<10}")
    print("-" * 90)
    
    testing_returns = []
    
    for strategy, rec in all_recommendations.items():
        strategy_formatted = strategy.replace('_to_', '→').upper()
        variant_name = variant_names[rec['variant']]
        data = rec['data']
        
        print(f"{strategy_formatted:<15} {variant_name:<18} {data['ticker']:<8} "
              f"{data['training_return']:+8.1f}% {data['testing_return']:+8.1f}%")
        
        testing_returns.append(data['testing_return'])
    
    # Calculate average testing return instead of compound
    average_testing_return = sum(testing_returns) / len(testing_returns) if testing_returns else 0
    
    print(f"\n🎯 ENHANCED PIPELINE SUMMARY:")
    print(f"   Average Testing Return: {average_testing_return:+.1f}%")
    print(f"   Individual Returns: {' | '.join([f'{r:+.1f}%' for r in testing_returns])}")
    print(f"   Strategy Variants Tested: {len(variants)} per strategy")
    print(f"   Enhanced Features: RSI Filter, Double Down, Stop Loss")
    print(f"   Price Filter: All tickers > $5")
    
    # Save results
    timestamp = current_date.strftime('%Y%m%d_%H%M')
    
    # Save detailed results
    df.to_csv(f'enhanced_analysis_{timestamp}.csv', index=False)
    
    # Save recommendations
    recommendations_df = pd.DataFrame([
        {
            'strategy': strategy.replace('_to_', '→').upper(),
            'best_variant': variant_names[rec['variant']],
            'ticker': rec['data']['ticker'],
            'training_return': rec['data']['training_return'],
            'testing_return': rec['data']['testing_return'],
            'current_price': rec['data']['current_price'],
            'run_date': current_date.strftime('%Y-%m-%d'),
        }
        for strategy, rec in all_recommendations.items()
    ])
    
    recommendations_df.to_csv(f'enhanced_recommendations_{timestamp}.csv', index=False)
    
    print(f"\n✅ Enhanced results saved:")
    print(f"   📄 Detailed analysis: enhanced_analysis_{timestamp}.csv")
    print(f"   🏆 Recommendations: enhanced_recommendations_{timestamp}.csv")

if __name__ == "__main__":
    enhanced_monthly_pipeline()