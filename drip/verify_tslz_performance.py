import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import sys
import calendar

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

def verify_tslz_last_to_first_strategy():
    """Verify TSLZ performance on Last Monday → First Monday strategy with actual data"""
    
    print("🔍 VERIFYING TSLZ PERFORMANCE - LAST→1ST MONDAY STRATEGY")
    print("=" * 80)
    print("🎯 Ticker: TSLZ (T-Rex 2X Inverse Tesla Daily Target ETF)")
    print("📊 Strategy: Last Monday of month → First Monday of next month")
    print("📚 Training: Jan-May 2025 | 🧪 Testing: June-Aug 2025")
    print("⚠️  Note: This is a 2X INVERSE Tesla ETF (bets against Tesla)")
    print("=" * 80)
    
    # Download TSLZ data
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found")
        return
    
    # Check if we already have the data file
    filename = "data_tslz_2025.csv"
    if os.path.exists(filename):
        print(f"✅ Loading existing TSLZ data from {filename}")
        try:
            df = pd.read_csv(filename)
            df['date'] = pd.to_datetime(df['date'], utc=True)
        except:
            print("❌ Error loading existing file, downloading fresh data")
            df = None
    else:
        df = None
    
    if df is None:
        # Download fresh data
        print("📥 Downloading TSLZ 2025 data...")
        
        start_date = datetime(2025, 1, 1)
        end_date = datetime.now()
        
        from_date = start_date.strftime('%Y-%m-%d')
        to_date = end_date.strftime('%Y-%m-%d')
        
        url = f"https://api.polygon.io/v2/aggs/ticker/TSLZ/range/1/day/{from_date}/{to_date}"
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
                print(f"❌ Error: {data}")
                return
            
            results = data['results']
            print(f"✅ Downloaded {len(results)} days of TSLZ data")
            
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
            
            final_df = df[['date', 'open', 'high', 'low', 'close', 'volume', 'rsi']].copy()
            
            # Save for future use
            final_df.to_csv(filename, index=False)
            df = final_df
            
        except Exception as e:
            print(f"❌ Error downloading TSLZ data: {e}")
            return
    
    # Show basic TSLZ info
    print(f"\n📊 TSLZ BASIC INFO:")
    print(f"   Data points: {len(df)}")
    print(f"   Date range: {df['date'].min().date()} to {df['date'].max().date()}")
    print(f"   Price range: ${df['close'].min():.2f} to ${df['close'].max():.2f}")
    print(f"   Current price: ${df['close'].iloc[-1]:.2f}")
    print(f"   YTD return: {((df['close'].iloc[-1] / df['close'].iloc[0]) - 1) * 100:+.1f}%")
    
    # Analyze training period (Jan-May)
    print(f"\n📚 TRAINING PERIOD ANALYSIS (Jan-May 2025):")
    print("-" * 60)
    
    training_trades = []
    training_months = [1, 2, 3, 4, 5]
    
    for month in training_months:
        # Get last Monday of current month and first Monday of next month
        last_monday_current = get_last_monday_of_month(2025, month)
        
        next_month = month + 1 if month < 12 else 1
        next_year = 2025 if month < 12 else 2026
        first_monday_next = get_nth_monday_of_month(next_year, next_month, 1)
        
        if last_monday_current and first_monday_next:
            buy_date = last_monday_current.date()
            sell_date = first_monday_next.date()
            
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
                
                trade = {
                    'month': calendar.month_name[month],
                    'buy_date': buy_row['date'].date(),
                    'sell_date': sell_row['date'].date(),
                    'buy_price': buy_price,
                    'sell_price': sell_price,
                    'buy_rsi': buy_rsi,
                    'return_pct': return_pct,
                    'days_held': (sell_row['date'] - buy_row['date']).days
                }
                
                training_trades.append(trade)
                
                rsi_str = f"{buy_rsi:.1f}" if pd.notna(buy_rsi) else "N/A"
                print(f"{calendar.month_name[month]:<10}: {buy_date} → {sell_date} | "
                      f"${buy_price:.2f} → ${sell_price:.2f} | RSI: {rsi_str:<5} | {return_pct:+7.2f}% | {(sell_row['date'] - buy_row['date']).days} days")
    
    if training_trades:
        training_df = pd.DataFrame(training_trades)
        training_total = ((training_df['return_pct'] / 100 + 1).prod() - 1) * 100
        training_avg = training_df['return_pct'].mean()
        training_wins = (training_df['return_pct'] > 0).sum()
        training_win_rate = (training_wins / len(training_df)) * 100
        
        print(f"\n🏆 TRAINING RESULTS:")
        print(f"   Total Return: {training_total:+.2f}%")
        print(f"   Average Trade: {training_avg:+.2f}%")
        print(f"   Win Rate: {training_win_rate:.0f}% ({training_wins}/{len(training_df)})")
        print(f"   Best Month: {training_df.loc[training_df['return_pct'].idxmax(), 'month']} ({training_df['return_pct'].max():+.2f}%)")
        print(f"   Worst Month: {training_df.loc[training_df['return_pct'].idxmin(), 'month']} ({training_df['return_pct'].min():+.2f}%)")
    
    # Analyze testing period (June-Aug)
    print(f"\n🧪 TESTING PERIOD ANALYSIS (June-Aug 2025):")
    print("-" * 60)
    
    testing_trades = []
    testing_months = [6, 7, 8]
    
    for month in testing_months:
        # Get last Monday of current month and first Monday of next month
        last_monday_current = get_last_monday_of_month(2025, month)
        
        next_month = month + 1 if month < 12 else 1
        next_year = 2025 if month < 12 else 2026
        first_monday_next = get_nth_monday_of_month(next_year, next_month, 1)
        
        if last_monday_current and first_monday_next:
            buy_date = last_monday_current.date()
            sell_date = first_monday_next.date()
            
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
                
                trade = {
                    'month': calendar.month_name[month],
                    'buy_date': buy_row['date'].date(),
                    'sell_date': sell_row['date'].date(),
                    'buy_price': buy_price,
                    'sell_price': sell_price,
                    'buy_rsi': buy_rsi,
                    'return_pct': return_pct,
                    'days_held': (sell_row['date'] - buy_row['date']).days
                }
                
                testing_trades.append(trade)
                
                rsi_str = f"{buy_rsi:.1f}" if pd.notna(buy_rsi) else "N/A"
                print(f"{calendar.month_name[month]:<10}: {buy_date} → {sell_date} | "
                      f"${buy_price:.2f} → ${sell_price:.2f} | RSI: {rsi_str:<5} | {return_pct:+7.2f}% | {(sell_row['date'] - buy_row['date']).days} days")
    
    if testing_trades:
        testing_df = pd.DataFrame(testing_trades)
        testing_total = ((testing_df['return_pct'] / 100 + 1).prod() - 1) * 100
        testing_avg = testing_df['return_pct'].mean()
        testing_wins = (testing_df['return_pct'] > 0).sum()
        testing_win_rate = (testing_wins / len(testing_df)) * 100
        
        print(f"\n🧪 TESTING RESULTS:")
        print(f"   Total Return: {testing_total:+.2f}%")
        print(f"   Average Trade: {testing_avg:+.2f}%")
        print(f"   Win Rate: {testing_win_rate:.0f}% ({testing_wins}/{len(testing_df)})")
        print(f"   Best Month: {testing_df.loc[testing_df['return_pct'].idxmax(), 'month']} ({testing_df['return_pct'].max():+.2f}%)")
        print(f"   Worst Month: {testing_df.loc[testing_df['return_pct'].idxmin(), 'month']} ({testing_df['return_pct'].min():+.2f}%)")
    
    # Compare to original analysis claims
    print(f"\n📊 VERIFICATION vs ORIGINAL CLAIMS:")
    print("=" * 60)
    print(f"Original Analysis Claims:")
    print(f"   Training Return: +83.6%")
    print(f"   Testing Return: +25.3%")
    print(f"   Training Win Rate: 100%")
    print(f"   Testing Win Rate: 100%")
    print()
    print(f"Actual Verified Results:")
    if training_trades and testing_trades:
        print(f"   Training Return: {training_total:+.1f}%")
        print(f"   Testing Return: {testing_total:+.1f}%") 
        print(f"   Training Win Rate: {training_win_rate:.0f}%")
        print(f"   Testing Win Rate: {testing_win_rate:.0f}%")
        
        # Calculate differences
        training_diff = training_total - 83.6
        testing_diff = testing_total - 25.3
        
        print(f"\n🔍 VERIFICATION STATUS:")
        print(f"   Training Difference: {training_diff:+.1f}pp")
        print(f"   Testing Difference: {testing_diff:+.1f}pp")
        
        if abs(training_diff) > 10 or abs(testing_diff) > 5:
            print(f"   ⚠️  SIGNIFICANT DISCREPANCY DETECTED!")
        else:
            print(f"   ✅ Results match within reasonable tolerance")
    
    # Save verification results
    if training_trades and testing_trades:
        all_trades = training_trades + testing_trades
        for trade in training_trades:
            trade['period'] = 'Training'
        for trade in testing_trades:
            trade['period'] = 'Testing'
        
        all_trades_df = pd.DataFrame(all_trades)
        all_trades_df.to_csv('tslz_verification_results.csv', index=False)
        print(f"\n✅ Verification results saved to 'tslz_verification_results.csv'")
    
    # Final assessment
    print(f"\n🎯 FINAL ASSESSMENT:")
    print("-" * 40)
    print(f"TSLZ is a 2X Inverse Tesla ETF that:")
    if training_trades and testing_trades:
        if testing_total > 20:
            print(f"✅ Shows strong testing performance ({testing_total:+.1f}%)")
        elif testing_total > 0:
            print(f"⚠️  Shows modest testing performance ({testing_total:+.1f}%)")
        else:
            print(f"❌ Shows poor testing performance ({testing_total:+.1f}%)")
        
        if testing_win_rate >= 67:
            print(f"✅ Has good win rate ({testing_win_rate:.0f}%)")
        else:
            print(f"⚠️  Has concerning win rate ({testing_win_rate:.0f}%)")
        
        print(f"⚠️  Requires Tesla to decline for gains")
        print(f"⚠️  Subject to daily leveraged decay")
        print(f"⚠️  Very new product (launched Oct 2023)")

if __name__ == "__main__":
    verify_tslz_last_to_first_strategy()