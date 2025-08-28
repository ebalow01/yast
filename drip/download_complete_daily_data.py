import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import sys
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

def download_daily_ticker_data(ticker, api_key, start_date='2024-01-01', end_date='2025-08-27'):
    """Download daily data for a ticker through specified end date"""
    
    filename = f"daily_data_{ticker.lower()}_complete.csv"
    
    # Check if we already have recent data
    if os.path.exists(filename):
        try:
            existing_df = pd.read_csv(filename)
            existing_df['date'] = pd.to_datetime(existing_df['date'])
            latest_date = existing_df['date'].max().date()
            target_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            # If data is up to date, skip download
            if latest_date >= target_date:
                return existing_df, f"✅ {ticker}: Using existing data (up to {latest_date})"
                
        except Exception as e:
            pass
    
    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{start_date}/{end_date}"
    params = {
        'adjusted': 'true',
        'sort': 'asc',
        'limit': 5000,
        'apikey': api_key
    }
    
    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if 'results' not in data or len(data['results']) == 0:
            return None, f"❌ {ticker}: No data available"
        
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
        
        # Calculate RSI
        df = df.sort_values('date').reset_index(drop=True)
        rsi_values = calculate_rsi(df['close'].values, period=14)
        df['rsi'] = rsi_values
        
        # Final clean DataFrame
        final_df = df[['date', 'open', 'high', 'low', 'close', 'volume', 'rsi']].copy()
        final_df['ticker'] = ticker
        final_df['current_price'] = final_df['close'].iloc[-1]
        
        # Save to file
        final_df.to_csv(filename, index=False)
        
        return final_df, f"✅ {ticker}: Downloaded {len(results)} days ({final_df['date'].min().date()} to {final_df['date'].max().date()})"
        
    except Exception as e:
        return None, f"❌ {ticker}: Error - {str(e)}"

def download_ticker_batch(ticker_batch, api_key):
    """Download data for a batch of tickers"""
    results = []
    
    for ticker in ticker_batch:
        df, message = download_daily_ticker_data(ticker, api_key)
        results.append((ticker, df, message))
        
        # Rate limiting - 100 requests per second max
        time.sleep(0.01)
    
    return results

def download_complete_daily_data():
    """Download complete daily data for all tickers through 8/27/2025"""
    
    print("🚀 DOWNLOADING COMPLETE DAILY DATA")
    print("=" * 60)
    print("📅 Target Date: August 27, 2025")
    print("📊 Data Type: Daily OHLC + RSI")
    print("=" * 60)
    
    # Load API key
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found in environment")
        return
    
    # Load ticker list
    try:
        if os.path.exists('top_300_tickers_summary.csv'):
            ticker_df = pd.read_csv('top_300_tickers_summary.csv')
            tickers = ticker_df['ticker'].tolist()
            print(f"📥 Loading {len(tickers)} tickers from summary")
        else:
            print("❌ No ticker summary found")
            return
            
    except Exception as e:
        print(f"❌ Error loading tickers: {e}")
        return
    
    print(f"\n📊 Starting download for {len(tickers)} tickers...")
    print("⚡ Processing with rate limiting (100 req/sec)...")
    
    # Process tickers in batches to manage rate limiting
    batch_size = 10  # Conservative batch size
    ticker_batches = [tickers[i:i+batch_size] for i in range(0, len(tickers), batch_size)]
    
    all_results = {}
    successful_count = 0
    failed_count = 0
    
    start_time = datetime.now()
    
    for batch_num, batch in enumerate(ticker_batches, 1):
        print(f"\n📦 Processing batch {batch_num}/{len(ticker_batches)} ({len(batch)} tickers)...")
        
        batch_results = download_ticker_batch(batch, api_key)
        
        for ticker, df, message in batch_results:
            print(f"   {message}")
            
            if df is not None:
                all_results[ticker] = df
                successful_count += 1
            else:
                failed_count += 1
        
        # Brief pause between batches
        if batch_num < len(ticker_batches):
            time.sleep(0.5)
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    print(f"\n🏆 DOWNLOAD COMPLETE!")
    print("=" * 50)
    print(f"✅ Successful: {successful_count}")
    print(f"❌ Failed: {failed_count}")
    print(f"⏱️ Duration: {duration:.1f} seconds")
    print(f"📈 Rate: {(successful_count + failed_count) / duration:.1f} requests/sec")
    
    if successful_count > 0:
        # Create summary of downloaded data
        summary_data = []
        
        for ticker, df in all_results.items():
            summary_data.append({
                'ticker': ticker,
                'data_points': len(df),
                'start_date': df['date'].min().date(),
                'end_date': df['date'].max().date(),
                'current_price': df['current_price'].iloc[0],
                'ytd_return': ((df['close'].iloc[-1] / df['close'].iloc[0]) - 1) * 100,
                'file_saved': f"daily_data_{ticker.lower()}_complete.csv"
            })
        
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_csv('daily_data_download_summary.csv', index=False)
        
        print(f"\n📄 Summary saved: daily_data_download_summary.csv")
        print(f"📁 Individual files: daily_data_[ticker]_complete.csv")
        
        # Show sample of data coverage
        print(f"\n📊 DATA COVERAGE SAMPLE:")
        print("-" * 70)
        print(f"{'Ticker':<8} {'Points':<8} {'Start':<12} {'End':<12} {'Price':<10}")
        print("-" * 70)
        
        sample_size = min(10, len(summary_data))
        for row in summary_data[:sample_size]:
            print(f"{row['ticker']:<8} {row['data_points']:<8} {row['start_date']} {row['end_date']} ${row['current_price']:<8.2f}")
        
        if len(summary_data) > sample_size:
            print(f"... and {len(summary_data) - sample_size} more tickers")
        
        # Check for tickers with latest data
        latest_data_count = sum(1 for row in summary_data if row['end_date'] >= datetime(2025, 8, 27).date())
        print(f"\n🎯 Tickers with data through 8/27/2025: {latest_data_count}/{len(summary_data)} ({latest_data_count/len(summary_data)*100:.1f}%)")
        
    print(f"\n✅ Complete daily data download finished!")
    print(f"🔄 You can now re-run the monthly pipeline with complete data coverage.")

if __name__ == "__main__":
    download_complete_daily_data()