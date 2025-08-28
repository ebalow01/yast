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

def verify_sbet_last_to_first():
    """Verify SBET's Last→1st Monday performance with detailed breakdown"""
    
    print("🔍 VERIFYING SBET LAST→1ST MONDAY PERFORMANCE")
    print("=" * 70)
    print("🎯 Ticker: SBET")
    print("📊 Strategy: Last Monday → First Monday of next month")
    print("📚 Training: Jan-Apr 2025 | 🧪 Testing: May-Jul 2025")
    print("=" * 70)
    
    # Load API key
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found")
        return
    
    # Download SBET data
    ticker = 'SBET'
    print(f"📥 Downloading {ticker} data...")
    
    filename = f"data_{ticker.lower()}_verification.csv"
    if os.path.exists(filename):
        try:
            df = pd.read_csv(filename)
            df['date'] = pd.to_datetime(df['date'], utc=True)
            print(f"✅ Loaded existing {ticker} data ({len(df)} records)")
        except:
            df = None
    else:
        df = None
    
    if df is None:
        # Download fresh data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=8 * 32)  # 8 months back
        
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
                print(f"❌ Error: {data}")
                return
            
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
            final_df.to_csv(filename, index=False)
            df = final_df
            
        except Exception as e:
            print(f"❌ Error downloading {ticker}: {e}")
            return
    
    # Show basic info
    print(f"\n📊 {ticker} DATA INFO:")
    print(f"   Data points: {len(df)}")
    print(f"   Date range: {df['date'].min().date()} to {df['date'].max().date()}")
    print(f"   Current price: ${df['close'].iloc[-1]:.2f}")
    
    # Analyze Last→1st Monday strategy
    print(f"\n📚 TRAINING PERIOD ANALYSIS (Jan-Apr 2025):")
    print("-" * 60)
    
    training_trades = []
    training_months = [(2025, 1), (2025, 2), (2025, 3), (2025, 4)]
    
    for year, month in training_months:
        try:
            # Get last Monday of current month
            last_monday_current = get_last_monday_of_month(year, month)
            
            # Get first Monday of next month
            next_month = month + 1 if month < 12 else 1
            next_year = year if month < 12 else year + 1
            first_monday_next = get_nth_monday_of_month(next_year, next_month, 1)
            
            if last_monday_current and first_monday_next:
                buy_date = last_monday_current.date()
                sell_date = first_monday_next.date()
                
                # Find actual trading data for these dates - use next available day
                buy_data = df[df['date'].dt.date >= buy_date].head(1)
                sell_data = df[df['date'].dt.date >= sell_date].head(1)
                
                # Allow up to 5 days for finding data (holidays, weekends)
                if len(buy_data) > 0:
                    actual_buy_date = buy_data.iloc[0]['date'].date()
                    if (actual_buy_date - buy_date).days > 5:
                        print(f"   ⚠️ {calendar.month_name[month]}: Buy date too far from target ({actual_buy_date} vs {buy_date})")
                        continue
                        
                if len(sell_data) > 0:
                    actual_sell_date = sell_data.iloc[0]['date'].date()
                    if (actual_sell_date - sell_date).days > 5:
                        print(f"   ⚠️ {calendar.month_name[month]}: Sell date too far from target ({actual_sell_date} vs {sell_date})")
                        continue
                
                if len(buy_data) > 0 and len(sell_data) > 0:
                    buy_row = buy_data.iloc[0]
                    sell_row = sell_data.iloc[0]
                    
                    buy_price = buy_row['close']
                    sell_price = sell_row['close']
                    buy_rsi = buy_row['rsi']
                    
                    return_pct = ((sell_price - buy_price) / buy_price) * 100
                    days_held = (sell_row['date'] - buy_row['date']).days
                    
                    trade = {
                        'month': calendar.month_name[month],
                        'buy_date': buy_row['date'].date(),
                        'sell_date': sell_row['date'].date(),
                        'buy_price': buy_price,
                        'sell_price': sell_price,
                        'buy_rsi': buy_rsi,
                        'return_pct': return_pct,
                        'days_held': days_held
                    }
                    
                    training_trades.append(trade)
                    
                    rsi_str = f"{buy_rsi:.1f}" if pd.notna(buy_rsi) else "N/A"
                    print(f"{calendar.month_name[month]:<10}: {buy_date} → {sell_date} | "
                          f"${buy_price:.2f} → ${sell_price:.2f} | {return_pct:+7.2f}% | RSI: {rsi_str}")
                    
        except Exception as e:
            print(f"❌ Error processing {calendar.month_name[month]} {year}: {e}")
    
    # Training results
    if training_trades:
        training_df = pd.DataFrame(training_trades)
        training_total = ((training_df['return_pct'] / 100 + 1).prod() - 1) * 100
        training_avg = training_df['return_pct'].mean()
        training_wins = (training_df['return_pct'] > 0).sum()
        training_win_rate = (training_wins / len(training_df)) * 100
        
        print(f"\n🏆 TRAINING RESULTS:")
        print(f"   Total Return: {training_total:+.1f}%")
        print(f"   Average Return: {training_avg:+.1f}%")
        print(f"   Win Rate: {training_win_rate:.0f}% ({training_wins}/{len(training_df)})")
    
    # Analyze testing period
    print(f"\n🧪 TESTING PERIOD ANALYSIS (May-Jul 2025):")
    print("-" * 60)
    
    testing_trades = []
    testing_months = [(2025, 5), (2025, 6), (2025, 7)]
    
    for year, month in testing_months:
        try:
            # Get last Monday of current month
            last_monday_current = get_last_monday_of_month(year, month)
            
            # Get first Monday of next month
            next_month = month + 1 if month < 12 else 1
            next_year = year if month < 12 else year + 1
            first_monday_next = get_nth_monday_of_month(next_year, next_month, 1)
            
            if last_monday_current and first_monday_next:
                buy_date = last_monday_current.date()
                sell_date = first_monday_next.date()
                
                # Find actual trading data for these dates - use next available day
                buy_data = df[df['date'].dt.date >= buy_date].head(1)
                sell_data = df[df['date'].dt.date >= sell_date].head(1)
                
                # Allow up to 5 days for finding data (holidays, weekends)
                if len(buy_data) > 0:
                    actual_buy_date = buy_data.iloc[0]['date'].date()
                    if (actual_buy_date - buy_date).days > 5:
                        print(f"   ⚠️ {calendar.month_name[month]}: Buy date too far from target ({actual_buy_date} vs {buy_date})")
                        continue
                        
                if len(sell_data) > 0:
                    actual_sell_date = sell_data.iloc[0]['date'].date()
                    if (actual_sell_date - sell_date).days > 5:
                        print(f"   ⚠️ {calendar.month_name[month]}: Sell date too far from target ({actual_sell_date} vs {sell_date})")
                        continue
                
                if len(buy_data) > 0 and len(sell_data) > 0:
                    buy_row = buy_data.iloc[0]
                    sell_row = sell_data.iloc[0]
                    
                    buy_price = buy_row['close']
                    sell_price = sell_row['close']
                    buy_rsi = buy_row['rsi']
                    
                    return_pct = ((sell_price - buy_price) / buy_price) * 100
                    days_held = (sell_row['date'] - buy_row['date']).days
                    
                    trade = {
                        'month': calendar.month_name[month],
                        'buy_date': buy_row['date'].date(),
                        'sell_date': sell_row['date'].date(),
                        'buy_price': buy_price,
                        'sell_price': sell_price,
                        'buy_rsi': buy_rsi,
                        'return_pct': return_pct,
                        'days_held': days_held
                    }
                    
                    testing_trades.append(trade)
                    
                    rsi_str = f"{buy_rsi:.1f}" if pd.notna(buy_rsi) else "N/A"
                    print(f"{calendar.month_name[month]:<10}: {buy_date} → {sell_date} | "
                          f"${buy_price:.2f} → ${sell_price:.2f} | {return_pct:+7.2f}% | RSI: {rsi_str}")
                    
        except Exception as e:
            print(f"❌ Error processing {calendar.month_name[month]} {year}: {e}")
    
    # Testing results
    if testing_trades:
        testing_df = pd.DataFrame(testing_trades)
        testing_total = ((testing_df['return_pct'] / 100 + 1).prod() - 1) * 100
        testing_avg = testing_df['return_pct'].mean()
        testing_wins = (testing_df['return_pct'] > 0).sum()
        testing_win_rate = (testing_wins / len(testing_df)) * 100
        
        print(f"\n🧪 TESTING RESULTS:")
        print(f"   Total Return: {testing_total:+.1f}%")
        print(f"   Average Return: {testing_avg:+.1f}%")
        print(f"   Win Rate: {testing_win_rate:.0f}% ({testing_wins}/{len(testing_df)})")
        
        print(f"\n📊 INDIVIDUAL TESTING TRADES:")
        for trade in testing_trades:
            print(f"   {trade['month']}: {trade['return_pct']:+.2f}%")
    
    # Save verification results
    if training_trades and testing_trades:
        all_trades = training_trades + testing_trades
        for trade in training_trades:
            trade['period'] = 'Training'
        for trade in testing_trades:
            trade['period'] = 'Testing'
        
        all_trades_df = pd.DataFrame(all_trades)
        all_trades_df.to_csv('sbet_verification_detailed.csv', index=False)
        print(f"\n✅ Detailed verification saved: 'sbet_verification_detailed.csv'")

if __name__ == "__main__":
    verify_sbet_last_to_first()