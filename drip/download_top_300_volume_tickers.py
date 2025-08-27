import requests
import pandas as pd
import numpy as np
import time
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import sys
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

def get_top_300_volume_tickers():
    """Get top 300 highest volume stocks and ETFs"""
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found in environment variables")
        return []
    
    print("🚀 DOWNLOADING TOP 300 HIGHEST VOLUME TICKERS")
    print("=" * 80)
    print("📊 Target: Top 300 by trading volume")
    print("💡 Strategy: Cast wider net for better Monday strategy optimization")
    print("⚡ API: Using paid Polygon account (100 req/sec)")
    print("=" * 80)
    
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
        response = requests.get(url, params=params, timeout=60)
        response.raise_for_status()
        data = response.json()
        
        if 'results' not in data:
            print(f"❌ Error: {data}")
            return []
        
        results = data['results']
        print(f"✅ Retrieved data for {len(results):,} tickers")
        
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
        
        print(f"📊 Initial dataset: {len(df):,} tickers")
        
        # Filter for reasonable tickers
        df = df[df['ticker'].str.len() <= 5]  # Max 5 characters
        df = df[~df['ticker'].str.contains(r'[^A-Z]')]  # Only letters
        df = df[df['volume'] > 500000]  # Min 500K volume (lowered for more options)
        df = df[df['close'] > 0.50]  # Min $0.50 stock price (lowered)
        df = df[df['close'] < 2000]  # Max $2000 stock price (raised)
        
        print(f"📊 After filtering: {len(df):,} tickers")
        
        # Sort by volume and get top 300
        df = df.sort_values('volume', ascending=False).head(300)
        
        print(f"\n📈 TOP 20 BY VOLUME:")
        print("-" * 70)
        print(f"{'Ticker':<6} {'Volume':>15} {'Price':>10} {'Market Cap Est.'}")
        print("-" * 70)
        
        for i, row in df.head(20).iterrows():
            market_cap_est = row['volume'] * row['close'] / 1000000  # Rough estimate in millions
            print(f"{row['ticker']:<6} {row['volume']:>15,} ${row['close']:>8.2f} ${market_cap_est:>8.0f}M")
        
        # Categorize tickers (basic classification)
        etf_indicators = ['SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'TLT', 'HYG', 'EEM', 'XLF', 'GLD', 'SLV']
        crypto_indicators = ['BTC', 'ETH', 'COIN', 'MSTR', 'RIOT', 'MARA']
        leveraged_indicators = ['TQQQ', 'SQQQ', 'SPXL', 'SPXS', 'SOXL', 'SOXS', 'TSLL', 'TSLZ']
        
        # Classify tickers
        classifications = []
        for ticker in df['ticker']:
            if ticker in etf_indicators or any(indicator in ticker for indicator in ['ETF', 'FUND']):
                classifications.append('ETF')
            elif ticker in crypto_indicators or 'BTC' in ticker or 'ETH' in ticker:
                classifications.append('CRYPTO')
            elif ticker in leveraged_indicators or any(indicator in ticker for indicator in ['3X', '2X', 'BULL', 'BEAR']):
                classifications.append('LEVERAGED')
            elif ticker.endswith('D') or ticker.endswith('U'):
                classifications.append('LEVERAGED')
            else:
                classifications.append('STOCK')
        
        df['category'] = classifications
        
        # Show category breakdown
        print(f"\n📊 CATEGORY BREAKDOWN:")
        print("-" * 40)
        category_counts = df['category'].value_counts()
        for category, count in category_counts.items():
            print(f"{category:<12}: {count:>3} tickers ({count/len(df)*100:.1f}%)")
        
        return df[['ticker', 'volume', 'close', 'category']].to_dict('records')
        
    except Exception as e:
        print(f"❌ Error fetching ticker data: {e}")
        return []

def download_ticker_2025_data(ticker_info):
    """Download full 2025 daily data for a single ticker"""
    
    ticker = ticker_info['ticker']
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
            return {
                'ticker': ticker,
                'success': False,
                'error': 'No results in API response',
                'category': ticker_info['category']
            }
        
        results = data['results']
        if len(results) < 100:  # Need substantial 2025 data
            return {
                'ticker': ticker,
                'success': False,
                'error': f'Insufficient data: {len(results)} days',
                'category': ticker_info['category']
            }
        
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
        
        # Calculate basic stats
        price_change = ((final_df['close'].iloc[-1] - final_df['close'].iloc[0]) / final_df['close'].iloc[0]) * 100
        avg_volume = final_df['volume'].mean()
        volatility = final_df['close'].pct_change().std() * np.sqrt(252) * 100  # Annualized
        
        return {
            'ticker': ticker,
            'success': True,
            'data': final_df,
            'days': len(final_df),
            'ytd_return': price_change,
            'avg_volume': avg_volume,
            'volatility': volatility,
            'category': ticker_info['category'],
            'current_price': final_df['close'].iloc[-1]
        }
        
    except Exception as e:
        return {
            'ticker': ticker,
            'success': False,
            'error': str(e)[:100],
            'category': ticker_info['category']
        }

def download_top_300_data():
    """Download data for top 300 volume tickers with parallel processing"""
    
    # Get top 300 tickers
    top_tickers = get_top_300_volume_tickers()
    
    if not top_tickers:
        print("❌ Could not retrieve top tickers")
        return
    
    print(f"\n📥 DOWNLOADING 2025 DATA FOR {len(top_tickers)} TICKERS")
    print("=" * 80)
    print("⚡ Using parallel processing (20 workers)")
    print("⏰ Estimated time: ~3-5 minutes")
    print("📊 Progress updates every 50 completions")
    print("=" * 80)
    
    # Download data for all tickers in parallel
    successful_downloads = []
    failed_downloads = []
    
    start_time = time.time()
    completed = 0
    
    with ThreadPoolExecutor(max_workers=20) as executor:
        # Submit all tasks
        future_to_ticker = {executor.submit(download_ticker_2025_data, ticker_info): ticker_info['ticker'] 
                           for ticker_info in top_tickers}
        
        # Process completed tasks
        for future in as_completed(future_to_ticker):
            ticker = future_to_ticker[future]
            completed += 1
            
            try:
                result = future.result()
                if result['success']:
                    successful_downloads.append(result)
                    if completed % 50 == 0 or completed <= 20:
                        print(f"✅ {completed:3d}/300: {result['ticker']:<6} | {result['days']:3d} days | "
                              f"YTD: {result['ytd_return']:+6.1f}% | Vol: {result['volatility']:5.1f}% | {result['category']}")
                else:
                    failed_downloads.append(result)
                    if completed % 50 == 0 or completed <= 20:
                        print(f"❌ {completed:3d}/300: {result['ticker']:<6} | {result.get('error', 'Unknown error')[:30]} | {result['category']}")
            
            except Exception as e:
                failed_downloads.append({
                    'ticker': ticker,
                    'success': False,
                    'error': str(e)[:100]
                })
                if completed % 50 == 0 or completed <= 20:
                    print(f"💥 {completed:3d}/300: {ticker:<6} | Exception: {str(e)[:30]}")
    
    elapsed_time = time.time() - start_time
    
    print(f"\n✅ DATA DOWNLOAD COMPLETE!")
    print("=" * 60)
    print(f"⏱️  Total Time: {elapsed_time:.1f} seconds")
    print(f"✅ Successful: {len(successful_downloads)} tickers")
    print(f"❌ Failed: {len(failed_downloads)} tickers")
    print(f"📊 Success Rate: {len(successful_downloads)/len(top_tickers)*100:.1f}%")
    
    if successful_downloads:
        # Analyze successful downloads by category
        print(f"\n📊 SUCCESS BY CATEGORY:")
        print("-" * 40)
        
        categories = {}
        for result in successful_downloads:
            cat = result['category']
            if cat not in categories:
                categories[cat] = {'count': 0, 'avg_days': 0, 'avg_ytd': 0}
            categories[cat]['count'] += 1
            categories[cat]['avg_days'] += result['days']
            categories[cat]['avg_ytd'] += result['ytd_return']
        
        for cat, stats in categories.items():
            avg_days = stats['avg_days'] / stats['count']
            avg_ytd = stats['avg_ytd'] / stats['count']
            print(f"{cat:<12}: {stats['count']:3d} tickers | {avg_days:.0f} days avg | {avg_ytd:+6.1f}% YTD avg")
        
        # Top and bottom performers
        successful_downloads.sort(key=lambda x: x['ytd_return'], reverse=True)
        
        print(f"\n🏆 TOP 10 YTD PERFORMERS:")
        print("-" * 70)
        print(f"{'Ticker':<6} {'YTD Return':<10} {'Volatility':<10} {'Category':<10} {'Days'}")
        print("-" * 70)
        for result in successful_downloads[:10]:
            print(f"{result['ticker']:<6} {result['ytd_return']:+8.1f}% {result['volatility']:8.1f}% "
                  f"{result['category']:<10} {result['days']:3d}")
        
        print(f"\n📉 BOTTOM 10 YTD PERFORMERS:")
        print("-" * 70)
        print(f"{'Ticker':<6} {'YTD Return':<10} {'Volatility':<10} {'Category':<10} {'Days'}")
        print("-" * 70)
        for result in successful_downloads[-10:]:
            print(f"{result['ticker']:<6} {result['ytd_return']:+8.1f}% {result['volatility']:8.1f}% "
                  f"{result['category']:<10} {result['days']:3d}")
        
        # Save summary data
        summary_data = []
        for result in successful_downloads:
            summary_data.append({
                'ticker': result['ticker'],
                'category': result['category'],
                'days_of_data': result['days'],
                'ytd_return_pct': result['ytd_return'],
                'annualized_volatility_pct': result['volatility'],
                'current_price': result['current_price'],
                'avg_daily_volume': result['avg_volume']
            })
        
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_csv('top_300_tickers_summary.csv', index=False)
        print(f"\n✅ Summary saved: 'top_300_tickers_summary.csv'")
        
        # Save individual ticker data files
        print(f"\n💾 SAVING INDIVIDUAL TICKER DATA:")
        print("-" * 50)
        
        saved_count = 0
        for result in successful_downloads[:50]:  # Save top 50 for detailed analysis
            ticker = result['ticker'].lower()
            filename = f"data_{ticker}_2025.csv"
            result['data'].to_csv(filename, index=False)
            saved_count += 1
            if saved_count <= 10:
                print(f"✅ {result['ticker']}: {filename}")
        
        if len(successful_downloads) > 50:
            print(f"... and {len(successful_downloads) - 50} more tickers")
        
        print(f"\n🎯 DATASET READY FOR MONDAY STRATEGY ANALYSIS!")
        print(f"📊 {len(successful_downloads)} tickers with full 2025 data")
        print(f"🔬 Ready for train/test split across all Monday strategies")
        
        return successful_downloads
    
    else:
        print("❌ No successful downloads!")
        return []

if __name__ == "__main__":
    download_top_300_data()