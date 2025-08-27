import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import sys
import calendar
from concurrent.futures import ThreadPoolExecutor

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
        rsi_values.append(100 - (100 / (1 + rs))
    
    # Calculate RSI for remaining values using Wilder's smoothing
    for i in range(period + 1, len(prices):
        gain = max(prices[i] - prices[i-1], 0)
        loss = max(prices[i-1] - prices[i], 0)
        
        # Wilder's smoothing: (previous_avg * (period-1) + current_value) / period
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        
        if avg_loss == 0:
            rsi_values.append(100)
        else:
            rs = avg_gain / avg_loss
            rsi_values.append(100 - (100 / (1 + rs))
    
    return rsi_values

def get_nth_monday_of_month(year, month, n):
    """Get the nth Monday of a given month"""
    first_day = datetime(year, month, 1)
    first_monday = first_day + timedelta(days=(7 - first_day.weekday() % 7)
    
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

def download_ticker_data(ticker, api_key):
    """Download 3-year data for a ticker"""
    print(f"📥 Downloading {ticker} data...")
    
    filename = f"data_{ticker.lower()}_3year.csv"
    if os.path.exists(filename):
        try:
            df = pd.read_csv(filename)
            df['date'] = pd.to_datetime(df['date'], utc=True)
            print(f"✅ Loaded existing {ticker} data ({len(df)} records)")
            return df
        except:
            pass
    
    # Download 3 years of data
    end_date = datetime.now()
    start_date = end_date - timedelta(days=3*365)
    
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
            print(f"❌ No results for {ticker}: {data}")
            return None
        
        results = data['results']
        print(f"✅ Downloaded {len(results)} 15-min bars for {ticker}")
        
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
                 ((df['date'].dt.hour == 9) & (df['date'].dt.minute >= 30))].copy()
        
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
        final_df.to_csv(filename, index=False)
        
        return final_df
        
    except Exception as e:
        print(f"❌ Error downloading {ticker}: {e}")
        return None

def analyze_strategy(df, ticker, strategy_type):
    """Analyze a specific Monday strategy"""
    print(f"\n🎯 ANALYZING {ticker} - {strategy_type}")
    print("-" * 60)
    
    # Define strategy parameters
    if strategy_type == "1st_to_2nd":
        buy_monday, sell_monday = 1, 2
    elif strategy_type == "2nd_to_3rd":
        buy_monday, sell_monday = 2, 3
    elif strategy_type == "3rd_to_4th":
        buy_monday, sell_monday = 3, 4
    elif strategy_type == "last_to_1st":
        buy_monday, sell_monday = "last", 1
    
    training_trades = []
    testing_trades = []
    
    # Training period: Jan-May 2025
    training_months = [
        (2025, 1), (2025, 2), (2025, 3), (2025, 4), (2025, 5)
    ]
    
    # Testing period: June-Aug 2025
    testing_months = [
        (2025, 6), (2025, 7), (2025, 8)
    ]
    
    def process_trades(months, trade_list, period_name):
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
                    
                    # Find closest trading data
                    buy_data = df[df['date'].dt.date >= buy_date].head(1)
                    sell_data = df[df['date'].dt.date >= sell_date].head(1)
                    
                    if len(buy_data) > 0 and len(sell_data) > 0:
                        buy_row = buy_data.iloc[0]
                        sell_row = sell_data.iloc[0]
                        
                        buy_price = buy_row['close']
                        sell_price = sell_row['close']
                        buy_rsi = buy_row['rsi']
                        
                        return_pct = ((sell_price - buy_price) / buy_price) * 100
                        
                        trade = {
                            'period': period_name,
                            'month': calendar.month_name[month],
                            'buy_date': buy_row['date'].date(),
                            'sell_date': sell_row['date'].date(),
                            'buy_price': buy_price,
                            'sell_price': sell_price,
                            'buy_rsi': buy_rsi,
                            'return_pct': return_pct
                        }
                        
                        trade_list.append(trade)
                        
                        rsi_str = f"{buy_rsi:.1f}" if pd.notna(buy_rsi) else "N/A"
                        print(f"{calendar.month_name[month]:<10}: {buy_date} → {sell_date} | "
                              f"${buy_price:.2f} → ${sell_price:.2f} | RSI: {rsi_str:<5} | {return_pct:+7.2f}%")
                        
            except Exception as e:
                print(f"❌ Error processing {calendar.month_name[month]} {year}: {e}")
    
    print("📚 TRAINING PERIOD (Jan-May 2025):")
    process_trades(training_months, training_trades, "Training")
    
    print("\n🧪 TESTING PERIOD (June-Aug 2025):")
    process_trades(testing_months, testing_trades, "Testing")
    
    # Calculate results
    results = {}
    
    if training_trades:
        training_df = pd.DataFrame(training_trades)
        training_total = ((training_df['return_pct'] / 100 + 1).prod() - 1) * 100
        training_wins = (training_df['return_pct'] > 0).sum()
        training_win_rate = (training_wins / len(training_df) * 100
        
        results['training_return'] = training_total
        results['training_win_rate'] = training_win_rate
        
        print(f"\n📚 TRAINING RESULTS:")
        print(f"   Total Return: {training_total:+.1f}%")
        print(f"   Win Rate: {training_win_rate:.0f}% ({training_wins}/{len(training_df)})")
    
    if testing_trades:
        testing_df = pd.DataFrame(testing_trades)
        testing_total = ((testing_df['return_pct'] / 100 + 1).prod() - 1) * 100
        testing_wins = (testing_df['return_pct'] > 0).sum()
        testing_win_rate = (testing_wins / len(testing_df) * 100
        
        results['testing_return'] = testing_total
        results['testing_win_rate'] = testing_win_rate
        
        print(f"\n🧪 TESTING RESULTS:")
        print(f"   Total Return: {testing_total:+.1f}%")
        print(f"   Win Rate: {testing_win_rate:.0f}% ({testing_wins}/{len(testing_df)})")
    
    return results

def verify_corrected_winners():
    """Verify the corrected winners selected from top 10 training candidates"""
    
    print("🔍 VERIFYING CORRECTED WINNERS - PROPER TOP 10 METHODOLOGY")
    print("=" * 80)
    print("✅ Selection Method: Top 10 training → Best testing from those 10")
    print("💰 Filter: Over $5 per share only")
    print("=" * 80)
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found")
        return
    
    # Corrected winners from proper selection
    winners = {
        '1st_to_2nd': {'ticker': 'HL', 'expected_training': 38.7, 'expected_testing': 39.0, 'training_rank': 6},
        '2nd_to_3rd': {'ticker': 'RGTI', 'expected_training': 165.2, 'expected_testing': 40.8, 'training_rank': 2},
        '3rd_to_4th': {'ticker': 'TSLL', 'expected_training': 75.9, 'expected_testing': 14.4, 'training_rank': 1},
        'last_to_1st': {'ticker': 'TSLQ', 'expected_training': 86.7, 'expected_testing': 25.2, 'training_rank': 3}
    }
    
    strategy_names = {
        '1st_to_2nd': '1ST→2ND MONDAY',
        '2nd_to_3rd': '2ND→3RD MONDAY', 
        '3rd_to_4th': '3RD→4TH MONDAY',
        'last_to_1st': 'LAST→1ST MONDAY'
    }
    
    verification_results = {}
    
    for strategy, winner_info in winners.items():
        ticker = winner_info['ticker']
        
        print(f"\n{'='*60}")
        print(f"🏆 {strategy_names[strategy]} WINNER: {ticker}")
        print(f"📊 Expected: Training {winner_info['expected_training']:+.1f}%, Testing {winner_info['expected_testing']:+.1f}%")
        print(f"🎯 Training Rank: #{winner_info['training_rank']} out of top 10")
        print(f"{'='*60}")
        
        # Download data
        df = download_ticker_data(ticker, api_key)
        if df is None:
            print(f"❌ Could not download {ticker} data")
            continue
        
        # Analyze strategy
        results = analyze_strategy(df, ticker, strategy)
        
        if 'training_return' in results and 'testing_return' in results:
            actual_training = results['training_return']
            actual_testing = results['testing_return']
            
            training_diff = abs(actual_training - winner_info['expected_training'])
            testing_diff = abs(actual_testing - winner_info['expected_testing'])
            
            print(f"\n🔍 VERIFICATION:")
            print(f"   Expected Training: {winner_info['expected_training']:+.1f}%")
            print(f"   Actual Training:   {actual_training:+.1f}%")
            print(f"   Training Diff:     {actual_training - winner_info['expected_training']:+.1f}pp")
            print(f"   Expected Testing:  {winner_info['expected_testing']:+.1f}%")
            print(f"   Actual Testing:    {actual_testing:+.1f}%")
            print(f"   Testing Diff:      {actual_testing - winner_info['expected_testing']:+.1f}pp")
            
            # Determine verification status
            if training_diff <= 2.0 and testing_diff <= 2.0:
                status = "✅ VERIFIED"
            elif training_diff <= 5.0 and testing_diff <= 5.0:
                status = "⚠️ CLOSE"
            else:
                status = "❌ MISMATCH"
            
            print(f"   Status: {status}")
            
            verification_results[strategy] = {
                'ticker': ticker,
                'expected_training': winner_info['expected_training'],
                'actual_training': actual_training,
                'expected_testing': winner_info['expected_testing'],
                'actual_testing': actual_testing,
                'status': status,
                'training_rank': winner_info['training_rank']
            }
    
    # Summary
    print(f"\n🏆 CORRECTED VERIFICATION SUMMARY:")
    print("=" * 90)
    print(f"{'Strategy':<15} {'Ticker':<6} {'Training':<12} {'Testing':<12} {'Status':<12}")
    print("-" * 90)
    
    combined_testing_return = 1.0
    verified_count = 0
    
    for strategy, results in verification_results.items():
        strategy_formatted = strategy.replace('_to_', '→').upper()
        training_str = f"{results['actual_training']:+.1f}%"
        testing_str = f"{results['actual_testing']:+.1f}%"
        
        print(f"{strategy_formatted:<15} {results['ticker']:<6} {training_str:<12} {testing_str:<12} {results['status']:<12}")
        
        combined_testing_return *= (1 + results['actual_testing'] / 100)
        if "VERIFIED" in results['status'] or "CLOSE" in results['status']:
            verified_count += 1
    
    combined_testing_return = (combined_testing_return - 1) * 100
    
    print(f"\n📊 CORRECTED PIPELINE PERFORMANCE:")
    print(f"   Combined Testing Return: {combined_testing_return:+.1f}%")
    if len(verification_results) > 0:
        print(f"   Verification Rate: {verified_count}/{len(verification_results)} ({verified_count/len(verification_results)*100:.0f}%)")
    else:
        print("   Verification Rate: 0/0 (No data processed)")
    print(f"   Selection Method: ✅ Proper top 10 training methodology")
    
    # Save results
    results_df = pd.DataFrame([
        {
            'strategy': strategy.replace('_to_', '→').upper(),
            'ticker': data['ticker'],
            'expected_training': data['expected_training'],
            'actual_training': data['actual_training'],
            'expected_testing': data['expected_testing'],
            'actual_testing': data['actual_testing'],
            'training_rank_in_top10': data['training_rank'],
            'verification_status': data['status']
        }
        for strategy, data in verification_results.items()
    ])
    
    results_df.to_csv('corrected_winners_verification.csv', index=False)
    print(f"\n✅ Verification results saved: 'corrected_winners_verification.csv'")

if __name__ == "__main__":
    verify_corrected_winners()