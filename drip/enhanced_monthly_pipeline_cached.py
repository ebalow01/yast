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
import pickle
import glob

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

def is_cache_fresh(cache_file, max_age_days=5):
    """Check if cached data is fresh enough"""
    try:
        if not os.path.exists(cache_file):
            return False
        
        file_age = datetime.now() - datetime.fromtimestamp(os.path.getmtime(cache_file))
        return file_age.days < max_age_days
    except:
        return False

def load_cached_data(ticker):
    """Load cached ticker data if available and fresh"""
    cache_file = f"cache_{ticker}.pkl"
    
    if is_cache_fresh(cache_file):
        try:
            with open(cache_file, 'rb') as f:
                return pickle.load(f)
        except:
            pass
    
    return None

def save_cached_data(ticker, data):
    """Save ticker data to cache"""
    cache_file = f"cache_{ticker}.pkl"
    try:
        with open(cache_file, 'wb') as f:
            pickle.dump(data, f)
    except:
        pass

def get_monthly_trade_details(ticker, strategy_type, variant, train_months, test_months):
    """Get individual monthly trade results for a ticker"""
    
    # Load cached data
    df = load_cached_data(ticker)
    if df is None:
        return None
    
    # Define strategy parameters
    if strategy_type == "1st_to_2nd":
        buy_monday, sell_monday = 1, 2
    elif strategy_type == "2nd_to_3rd":
        buy_monday, sell_monday = 2, 3
    elif strategy_type == "3rd_to_4th":
        buy_monday, sell_monday = 3, 4
    elif strategy_type == "last_to_1st":
        buy_monday, sell_monday = "last", 1
    
    def get_trade_for_month(year, month):
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
                
                # Find trading data
                buy_data = df[df['date'].dt.date >= buy_date].head(1)
                sell_data = df[df['date'].dt.date >= sell_date].head(1)
                thursday_data = df[df['date'].dt.date >= thursday_date].head(1)
                
                if len(buy_data) > 0 and len(sell_data) > 0:
                    buy_row = buy_data.iloc[0]
                    sell_row = sell_data.iloc[0]
                    
                    buy_price = buy_row['close']
                    sell_price = sell_row['close']
                    buy_rsi = buy_row['rsi']
                    
                    # Calculate return based on variant
                    if variant == 'basic':
                        return_pct = ((sell_price - buy_price) / buy_price) * 100
                    elif variant == 'rsi_filter':
                        if pd.notna(buy_rsi) and buy_rsi <= 70:
                            return_pct = ((sell_price - buy_price) / buy_price) * 100
                        else:
                            return None  # Skip trade
                    elif variant == 'double_down':
                        if len(thursday_data) > 0:
                            thursday_row = thursday_data.iloc[0]
                            thursday_price = thursday_row['close']
                            thursday_return = ((thursday_price - buy_price) / buy_price) * 100
                            
                            if thursday_return <= -5:  # Double down
                                avg_buy_price = (buy_price + thursday_price) / 2
                                return_pct = ((sell_price - avg_buy_price) / avg_buy_price) * 100
                            else:
                                return_pct = ((sell_price - buy_price) / buy_price) * 100
                        else:
                            return_pct = ((sell_price - buy_price) / buy_price) * 100
                    elif variant == 'stop_loss':
                        if len(thursday_data) > 0:
                            thursday_row = thursday_data.iloc[0]
                            thursday_price = thursday_row['close']
                            thursday_return = ((thursday_price - buy_price) / buy_price) * 100
                            
                            if thursday_return <= -10:  # Stop loss
                                return_pct = thursday_return
                            else:
                                return_pct = ((sell_price - buy_price) / buy_price) * 100
                        else:
                            return_pct = ((sell_price - buy_price) / buy_price) * 100
                    
                    return return_pct
        except Exception as e:
            pass
        
        return None
    
    # Get monthly results
    monthly_results = {}
    
    # Training months
    for year, month in train_months:
        result = get_trade_for_month(year, month)
        monthly_results[f"{calendar.month_name[month][:3]}"] = result
    
    # Testing months  
    for year, month in test_months:
        result = get_trade_for_month(year, month)
        monthly_results[f"{calendar.month_name[month][:3]}"] = result
    
    return monthly_results

def download_ticker_data(ticker, api_key, months_back=8):
    """Download recent data for a ticker (with caching)"""
    
    # Check cache first
    cached_data = load_cached_data(ticker)
    if cached_data is not None:
        return cached_data
    
    # Calculate date range for last N months
    end_date = datetime.now()
    start_date = end_date - timedelta(days=months_back * 32)  # ~32 days per month buffer
    
    from_date = start_date.strftime('%Y-%m-%d')
    to_date = end_date.strftime('%Y-%m-%d')
    
    # Use daily bars for faster, more reliable data
    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{from_date}/{to_date}"
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
        
        # Sort by date and calculate RSI
        df = df.sort_values('date').reset_index(drop=True)
        
        # Calculate RSI on daily closes
        rsi_values = calculate_rsi(df['close'].values, period=14)
        df['rsi'] = rsi_values
        
        # Prepare final dataframe
        final_df = df[['date', 'open', 'high', 'low', 'close', 'volume', 'rsi']].copy()
        final_df['ticker'] = ticker
        final_df['current_price'] = final_df['close'].iloc[-1]
        
        # Cache the data
        save_cached_data(ticker, final_df)
        
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
            # Use average return instead of compounding for multi-month strategy performance
            training_avg = training_df['return_pct'].mean()
            training_wins = (training_df['return_pct'] > 0).sum()
            training_win_rate = (training_wins / len(training_df)) * 100
            
            variant_results['training_return'] = training_avg
            variant_results['training_win_rate'] = training_win_rate
            variant_results['training_trades'] = len(training_trades[variant])
        
        # Testing results
        if testing_trades[variant]:
            testing_df = pd.DataFrame(testing_trades[variant])
            # Use average return instead of compounding for multi-month strategy performance
            testing_avg = testing_df['return_pct'].mean()
            testing_wins = (testing_df['return_pct'] > 0).sum()
            testing_win_rate = (testing_wins / len(testing_df)) * 100
            
            variant_results['testing_return'] = testing_avg
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
    ticker, api_key, train_months, test_months, debug_mode = args
    
    # Download data (will use cache if fresh)
    df = download_ticker_data(ticker, api_key, months_back=8)
    
    # Add 1-second delay per worker to respect rate limits (only if downloading)
    cached_data = load_cached_data(ticker)
    if cached_data is None:
        time.sleep(1)
    
    if df is None:
        if debug_mode:
            print(f"  ⚠️ {ticker}: No data downloaded")
        return None
    
    # Filter for stocks over $5 FIRST, before any analysis
    current_price = df['current_price'].iloc[0]
    if current_price <= 5.0:
        if debug_mode:
            print(f"  ⚠️ {ticker}: Price ${current_price:.2f} <= $5")
        return None
    
    # Check if we have enough data for the analysis period
    # Need at least 100 trading days (~5 months) to cover training and testing periods
    if len(df) < 100:
        if debug_mode:
            print(f"  ⚠️ {ticker}: Only {len(df)} days of data (need 100+ for 6-month analysis)")
        return None
    
    results = {'ticker': ticker, 'current_price': current_price}
    
    # Analyze all 4 strategies with variants
    strategies = ['1st_to_2nd', '2nd_to_3rd', '3rd_to_4th', 'last_to_1st']
    
    has_any_results = False
    for strategy in strategies:
        strategy_results = analyze_enhanced_strategies(df, strategy, train_months, test_months)
        
        # Add strategy and variant prefix to results
        for variant, variant_data in strategy_results.items():
            for key, value in variant_data.items():
                results[f'{strategy}_{variant}_{key}'] = value
                if 'return' in key and value is not None:
                    has_any_results = True
    
    if not has_any_results and debug_mode:
        print(f"  ⚠️ {ticker}: No valid strategy results")
        return None
    
    return results

def enhanced_monthly_pipeline_cached():
    """Enhanced monthly pipeline with data caching"""
    
    print("🚀 ENHANCED MONTHLY STRATEGY PIPELINE (WITH CACHING)")
    print("=" * 80)
    print("🎯 Testing: Basic, RSI Filter, Double Down, Stop Loss variants")
    print("💾 Using cached data if < 5 days old")
    print("=" * 80)
    
    # Get current date and calculate train/test periods
    current_date = datetime.now()
    print(f"📅 Run Date: {current_date.strftime('%Y-%m-%d %H:%M')}")
    
    # Calculate dynamic periods based on current date
    current_year = current_date.year
    current_month = current_date.month
    
    # Testing: Last 3 COMPLETE months (not including current incomplete month)
    test_months = []
    
    # Start from last complete month
    for i in range(1, 4):  # Get last 3 complete months
        month = current_month - i
        year = current_year
        if month <= 0:
            month += 12
            year -= 1
        test_months.insert(0, (year, month))
    
    # Training: 3 months before testing period
    train_months = []
    
    # Start from the month before our earliest test month
    earliest_test_year, earliest_test_month = test_months[0]
    
    for i in range(1, 4):
        month = earliest_test_month - i
        year = earliest_test_year
        if month <= 0:
            month += 12
            year -= 1
        train_months.insert(0, (year, month))
    
    print(f"📚 Training Period: {calendar.month_name[train_months[0][1]]} {train_months[0][0]} - {calendar.month_name[train_months[-1][1]]} {train_months[-1][0]}")
    print(f"🧪 Testing Period: {calendar.month_name[test_months[0][1]]} {test_months[0][0]} - {calendar.month_name[test_months[-1][1]]} {test_months[-1][0]}")
    print(f"📊 Analyzing Mondays in these months for entry/exit signals")
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
        ]
        
        # Also check for any combined files
        combined_files = glob.glob('combined_*_tickers_*.csv')
        if combined_files:
            latest_combined = max(combined_files, key=os.path.getmtime)
            ticker_file_paths.insert(0, latest_combined)
        
        ticker_df = None
        for file_path in ticker_file_paths:
            if os.path.exists(file_path):
                ticker_df = pd.read_csv(file_path)
                print(f"✅ Loaded {len(ticker_df)} tickers from {file_path}")
                break
        
        if ticker_df is None:
            print("❌ No ticker file found. Please run ticker collection first.")
            return
        
        tickers = ticker_df['ticker'].tolist()
        print(f"🎯 Using {len(tickers)} tickers for strategy analysis")
        
        # Check cache status
        cache_files = glob.glob('cache_*.pkl')
        fresh_cache_count = sum(1 for f in cache_files if is_cache_fresh(f))
        print(f"💾 Found {fresh_cache_count}/{len(cache_files)} fresh cached files")
        
        if fresh_cache_count > 0:
            estimated_downloads = len(tickers) - fresh_cache_count
            print(f"⚡ Will download ~{estimated_downloads} tickers (others cached)")
        
    except Exception as e:
        print(f"❌ Error loading tickers: {e}")
        return
    
    # Process all tickers in parallel
    print(f"\n📊 Analyzing {len(tickers)} tickers across 4 strategies x 4 variants...")
    
    # Enable debug mode for first 20 tickers to see what's happening
    debug_mode = True
    print("🔍 Debug mode enabled for first 20 tickers...")
    print("⚡ Processing in parallel (8 workers)...")
    
    # Prepare arguments for parallel processing
    args_list = [(ticker, api_key, train_months, test_months, i < 20) for i, ticker in enumerate(tickers)]
    
    all_results = []
    successful_count = 0
    failed_count = 0
    cached_count = 0
    
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_ticker = {executor.submit(process_single_ticker_enhanced, args): args[0] for args in args_list}
        
        for future in as_completed(future_to_ticker):
            ticker = future_to_ticker[future]
            try:
                result = future.result()
                if result:
                    all_results.append(result)
                    successful_count += 1
                    
                    # Check if was cached
                    if is_cache_fresh(f"cache_{ticker}.pkl"):
                        cached_count += 1
                    
                    if successful_count % 25 == 0:
                        elapsed = time.time() - start_time
                        rate = successful_count / elapsed * 60 if elapsed > 0 else 0
                        print(f"✅ Processed {successful_count} successful tickers (cached: {cached_count}, rate: {rate:.0f}/min)...")
                else:
                    failed_count += 1
            except Exception as e:
                print(f"❌ {ticker}: {e}")
                failed_count += 1
    
    elapsed_total = time.time() - start_time
    
    print(f"\n📈 Analysis Summary:")
    print(f"   ✅ Successfully analyzed: {len(all_results)} tickers")
    print(f"   💾 Used cached data: {cached_count} tickers ({cached_count/len(all_results)*100:.1f}%)" if all_results else "")
    print(f"   ❌ Failed/Filtered out: {failed_count} tickers")
    print(f"   📊 Total attempted: {len(tickers)} tickers")
    print(f"   ⏱️ Total time: {elapsed_total/60:.1f} minutes")
    
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
    all_top10_results = []  # Store all top 10 results for CSV export
    
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
                # Calculate statistics for all top 10
                test_returns = top_10_training[f'{strategy}_{variant}_testing_return'].values
                train_returns = top_10_training[f'{strategy}_{variant}_training_return'].values
                
                avg_test_return = np.mean(test_returns)
                median_test_return = np.median(test_returns)
                win_rate = (test_returns > 0).sum() / len(test_returns) * 100
                best_test = np.max(test_returns)
                worst_test = np.min(test_returns)
                
                # Store all top 10 for this variant
                for idx, row in top_10_training.iterrows():
                    all_top10_results.append({
                        'strategy': strategy,
                        'variant': variant,
                        'rank': list(top_10_training.index).index(idx) + 1,
                        'ticker': row['ticker'],
                        'training_return': row[f'{strategy}_{variant}_training_return'],
                        'testing_return': row[f'{strategy}_{variant}_testing_return'],
                        'current_price': row['current_price']
                    })
                
                strategy_comparisons[variant] = {
                    'top_10_tickers': top_10_training['ticker'].tolist(),
                    'avg_training': np.mean(train_returns),
                    'avg_testing': avg_test_return,
                    'median_testing': median_test_return,
                    'win_rate': win_rate,
                    'best_testing': best_test,
                    'worst_testing': worst_test,
                    'candidates': len(strategy_df),
                    'top_10_df': top_10_training  # Store for detailed display
                }
        
        # Display comparison for this strategy
        if strategy_comparisons:
            print(f"\n{'Variant':<18} {'Avg Train':<12} {'Avg Test':<12} {'Med Test':<12} {'Win Rate':<10} {'Best/Worst':<20} {'Candidates'}")
            print("-" * 110)
            
            best_variant = None
            best_median_testing = -float('inf')
            
            for variant, data in strategy_comparisons.items():
                median_testing = data['median_testing']
                if median_testing > best_median_testing:
                    best_median_testing = median_testing
                    best_variant = variant
                
                marker = "🏆" if variant == best_variant else "  "
                print(f"{marker} {variant_names[variant]:<16} {data['avg_training']:+10.1f}% {data['avg_testing']:+10.1f}% "
                      f"{data['median_testing']:+10.1f}% {data['win_rate']:8.0f}% "
                      f"{data['best_testing']:+8.1f}%/{data['worst_testing']:+7.1f}% {data['candidates']:>5}")
            
            # Show detailed top 10 for best variant
            if best_variant:
                print(f"\n  📊 Top 10 Details for {variant_names[best_variant]}:")
                print(f"  {'Rank':<6} {'Ticker':<8} {'Training':<12} {'Testing':<12} {'Price':<10}")
                print("  " + "-" * 60)
                
                top_10_df = strategy_comparisons[best_variant]['top_10_df']
                for i, (idx, row) in enumerate(top_10_df.iterrows(), 1):
                    print(f"  {i:<6} {row['ticker']:<8} {row[f'{strategy}_{best_variant}_training_return']:+10.1f}% "
                          f"{row[f'{strategy}_{best_variant}_testing_return']:+10.1f}% ${row['current_price']:>8.2f}")
                
                all_recommendations[strategy] = {
                    'variant': best_variant,
                    'data': strategy_comparisons[best_variant]
                }
    
    # Collect testing returns for summary (using median now)
    testing_returns = []
    strategy_median_returns = []
    for strategy, rec in all_recommendations.items():
        testing_returns.append(rec['data']['avg_testing'])
        strategy_median_returns.append(rec['data']['median_testing'])
    
    # Calculate both average and median testing returns across all strategies
    average_testing_return = sum(testing_returns) / len(testing_returns) if testing_returns else 0
    median_testing_return = np.median(strategy_median_returns) if strategy_median_returns else 0
    
    # Show detailed top 2 individual performers with monthly breakdown
    print(f"\n🏆 TOP 2 INDIVIDUAL PERFORMERS WITH MONTHLY BREAKDOWN:")
    print("=" * 160)
    print(f"{'Rank':<6} {'Strategy':<12} {'Variant':<12} {'Ticker':<8} {'Price':<8} "
          f"{'Mar':<8} {'Apr':<8} {'May':<8} {'Jun':<8} {'Jul':<8} {'Aug':<8}")
    print("-" * 160)
    
    for strategy, rec in all_recommendations.items():
        strategy_formatted = strategy.replace('_to_', '→').upper()
        variant_name = variant_names[rec['variant']]
        
        if 'top_10_df' in rec['data']:
            top_10_df = rec['data']['top_10_df']
            # Find top 2 testing performers using median-based approach
            # Calculate median testing returns for each ticker and select by that
            # EXCLUDE any tickers with testing month returns worse than -5%
            median_testing_returns = []
            for idx, row in top_10_df.iterrows():
                monthly_results = get_monthly_trade_details(
                    row['ticker'], strategy, rec['variant'], train_months, test_months
                )
                if monthly_results:
                    test_returns = [monthly_results.get('Jun'), monthly_results.get('Jul'), monthly_results.get('Aug')]
                    test_returns = [r for r in test_returns if r is not None]
                    if test_returns:
                        # Check if NO testing month is worse than -5%
                        if all(r > -5 for r in test_returns):
                            median_return = np.median(test_returns)
                            median_testing_returns.append((idx, median_return))
                        # If any testing month is worse than -5%, exclude this ticker
                    else:
                        median_testing_returns.append((idx, -999))  # No data penalty
                else:
                    median_testing_returns.append((idx, -999))  # No data penalty
            
            # Sort by median testing return and take top 2
            median_testing_returns.sort(key=lambda x: x[1], reverse=True)
            
            # If we have enough qualified tickers, take top 2; otherwise take what we have
            num_to_take = min(2, len(median_testing_returns))
            if num_to_take > 0:
                top_2_indices = [x[0] for x in median_testing_returns[:num_to_take]]
                top_2 = top_10_df.loc[top_2_indices]
            else:
                # No tickers meet criteria, create empty dataframe
                top_2 = pd.DataFrame()
            
            if len(top_2) > 0:
                for i, (idx, row) in enumerate(top_2.iterrows(), 1):
                    rank_prefix = f"#{i}" if i == 1 else f"   #{i}"
                    strategy_display = strategy_formatted if i == 1 else ""
                    variant_display = variant_name if i == 1 else ""
                    
                    # Get monthly breakdown
                    monthly_results = get_monthly_trade_details(
                        row['ticker'], strategy, rec['variant'], train_months, test_months
                    )
                    
                    if monthly_results:
                        # Format monthly results
                        mar = f"{monthly_results.get('Mar', 0):+6.1f}%" if monthly_results.get('Mar') is not None else "  --  "
                        apr = f"{monthly_results.get('Apr', 0):+6.1f}%" if monthly_results.get('Apr') is not None else "  --  "
                        may = f"{monthly_results.get('May', 0):+6.1f}%" if monthly_results.get('May') is not None else "  --  "
                        jun = f"{monthly_results.get('Jun', 0):+6.1f}%" if monthly_results.get('Jun') is not None else "  --  "
                        jul = f"{monthly_results.get('Jul', 0):+6.1f}%" if monthly_results.get('Jul') is not None else "  --  "
                        aug = f"{monthly_results.get('Aug', 0):+6.1f}%" if monthly_results.get('Aug') is not None else "  --  "
                        
                        print(f"{rank_prefix:<6} {strategy_display:<12} {variant_display:<12} {row['ticker']:<8} "
                              f"${row['current_price']:<7.2f} {mar:<8} {apr:<8} {may:<8} {jun:<8} {jul:<8} {aug:<8}")
                    else:
                        print(f"{rank_prefix:<6} {strategy_display:<12} {variant_display:<12} {row['ticker']:<8} "
                              f"${row['current_price']:<7.2f} [No monthly data available]")
            else:
                # No tickers meet the criteria (no testing month worse than -5%)
                print(f"   N/A {strategy_formatted:<12} {variant_name:<12} [No tickers without major losses (< -5%) in testing]")
            
            print()  # Add space between strategies
    
    print("📅 Training: Mar, Apr, May 2025  |  Testing: Jun, Jul, Aug 2025")
    
    print(f"\n🎯 ENHANCED PIPELINE SUMMARY:")
    print(f"   Average Testing Return (across strategies): {average_testing_return:+.1f}%")
    print(f"   Median Testing Return (across strategies): {median_testing_return:+.1f}%")
    print(f"   Strategy Returns (Avg): {' | '.join([f'{r:+.1f}%' for r in testing_returns])}")
    print(f"   Strategy Returns (Med): {' | '.join([f'{r:+.1f}%' for r in strategy_median_returns])}")
    print(f"   Strategy Variants Tested: {len(variants)} per strategy")
    print(f"   Enhanced Features: RSI Filter, Double Down, Stop Loss")
    print(f"   Price Filter: Only tickers > $5 (filtered at start)")
    print(f"   Methodology: Top 10 training performers tested, median-based selection, -5% loss filter")
    print(f"   💾 Data Caching: {cached_count}/{len(all_results)} used cache ({cached_count/len(all_results)*100:.1f}%)" if all_results else "")
    
    # Save results
    timestamp = current_date.strftime('%Y%m%d_%H%M')
    
    # Save detailed results
    df.to_csv(f'enhanced_analysis_{timestamp}.csv', index=False)
    
    # Save top 10 detailed results
    if all_top10_results:
        top10_df = pd.DataFrame(all_top10_results)
        top10_df['strategy_formatted'] = top10_df['strategy'].str.replace('_to_', '→').str.upper()
        top10_df['variant_formatted'] = top10_df['variant'].map(variant_names)
        top10_df = top10_df[['strategy_formatted', 'variant_formatted', 'rank', 'ticker', 
                             'training_return', 'testing_return', 'current_price']]
        top10_df.to_csv(f'enhanced_top10_details_{timestamp}.csv', index=False)
    
    # Save recommendations summary
    recommendations_df = pd.DataFrame([
        {
            'strategy': strategy.replace('_to_', '→').upper(),
            'best_variant': variant_names[rec['variant']],
            'avg_testing': rec['data']['avg_testing'],
            'median_testing': rec['data']['median_testing'],
            'win_rate': rec['data']['win_rate'],
            'best_testing': rec['data']['best_testing'],
            'worst_testing': rec['data']['worst_testing'],
            'top_10_tickers': ', '.join(rec['data']['top_10_tickers']),
            'run_date': current_date.strftime('%Y-%m-%d'),
        }
        for strategy, rec in all_recommendations.items()
    ])
    
    recommendations_df.to_csv(f'enhanced_recommendations_{timestamp}.csv', index=False)
    
    print(f"\n✅ Enhanced results saved:")
    print(f"   📄 Detailed analysis: enhanced_analysis_{timestamp}.csv")
    print(f"   📊 Top 10 details: enhanced_top10_details_{timestamp}.csv")
    print(f"   🏆 Recommendations: enhanced_recommendations_{timestamp}.csv")
    print(f"   💾 Cache files created for future runs")

if __name__ == "__main__":
    enhanced_monthly_pipeline_cached()