import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import json

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

def calculate_volatility(prices):
    """Calculate annualized volatility from daily prices"""
    if len(prices) < 20:
        return None
    
    # Calculate daily returns
    returns = np.diff(prices) / prices[:-1]
    
    # Calculate standard deviation of returns
    std_dev = np.std(returns)
    
    # Annualize (252 trading days)
    annualized_vol = std_dev * np.sqrt(252) * 100
    
    return annualized_vol

def get_ticker_data(args):
    """Get price data for a single ticker"""
    ticker, api_key, delay = args
    
    try:
        # Add delay to respect rate limits (100 per minute = 0.6 seconds between requests)
        time.sleep(delay)
        
        # Get last 60 days of data (faster, sufficient for volatility)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=60)
        
        from_date = start_date.strftime('%Y-%m-%d')
        to_date = end_date.strftime('%Y-%m-%d')
        
        url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{from_date}/{to_date}"
        params = {
            'adjusted': 'true',
            'sort': 'asc',
            'limit': 5000,
            'apikey': api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            return None
            
        data = response.json()
        
        if 'results' not in data or len(data['results']) < 20:
            return None
        
        results = data['results']
        
        # Extract closing prices
        closes = [r['c'] for r in results]
        
        # Get current price (last close)
        current_price = closes[-1]
        
        # Skip if under $5
        if current_price < 5.0:
            return None
        
        # Calculate volatility
        volatility = calculate_volatility(closes)
        
        if volatility is None:
            return None
        
        # Calculate average volume
        volumes = [r['v'] for r in results]
        avg_volume = np.mean(volumes)
        
        # Skip if average volume < 100k shares
        if avg_volume < 100000:
            return None
        
        # Calculate 30-day price change
        if len(closes) >= 30:
            month_change = ((closes[-1] - closes[-30]) / closes[-30]) * 100
        else:
            month_change = 0
        
        return {
            'ticker': ticker,
            'current_price': current_price,
            'volatility_pct': volatility,
            'avg_volume': avg_volume,
            'month_change_pct': month_change,
            'days_of_data': len(closes)
        }
        
    except Exception as e:
        return None

def get_high_volume_tickers(api_key):
    """Get most active stocks to focus on liquid names"""
    try:
        # Get yesterday's date for most active stocks
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        
        url = f"https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers"
        params = {
            'apikey': api_key
        }
        
        response = requests.get(url, params=params, timeout=30)
        
        if response.status_code != 200:
            return []
        
        data = response.json()
        
        if 'tickers' not in data:
            return []
        
        # Extract tickers and sort by volume
        tickers_data = []
        for ticker_info in data['tickers']:
            if 'ticker' in ticker_info and 'day' in ticker_info:
                ticker = ticker_info['ticker']
                day_info = ticker_info['day']
                
                # Skip if no price or volume data
                if 'c' not in day_info or 'v' not in day_info:
                    continue
                    
                price = day_info['c']
                volume = day_info['v']
                
                # Skip if under $5 or low volume
                if price < 5.0 or volume < 100000:
                    continue
                
                tickers_data.append({
                    'ticker': ticker,
                    'price': price,
                    'volume': volume
                })
        
        # Sort by volume and take top names
        tickers_data.sort(key=lambda x: x['volume'], reverse=True)
        
        # Return just the ticker symbols
        return [t['ticker'] for t in tickers_data[:1500]]
        
    except Exception as e:
        print(f"Warning: Could not fetch snapshot data: {e}")
        return []

def find_volatile_tickers():
    """Find top 500 most volatile tickers over $5"""
    
    print("🔍 FINDING TOP 500 MOST VOLATILE TICKERS OVER $5")
    print("=" * 80)
    print("📊 Using Polygon Starter Tier (100 requests/minute)")
    print("=" * 80)
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found in environment")
        return
    
    print("📥 Fetching high-volume tickers from market snapshot...")
    
    # Get high volume tickers first (more likely to be tradeable)
    high_volume_tickers = get_high_volume_tickers(api_key)
    
    if high_volume_tickers:
        print(f"✅ Found {len(high_volume_tickers)} high-volume tickers over $5")
        tickers_to_analyze = high_volume_tickers
    else:
        # Fallback: Use known volatile sectors
        print("⚠️ Using fallback ticker list from volatile sectors...")
        
        # Known volatile tickers from different sectors
        volatile_sectors = [
            # Meme stocks
            'GME', 'AMC', 'BBBY', 'BB', 'NOK', 'PLTR', 'CLOV', 'WISH', 'SOFI', 'HOOD',
            
            # Crypto-related
            'MARA', 'RIOT', 'MSTR', 'COIN', 'HUT', 'HIVE', 'BTBT', 'CAN', 'GBTC', 'CLSK',
            
            # Leveraged ETFs
            'TQQQ', 'SQQQ', 'SPXL', 'SPXS', 'UPRO', 'SPXU', 'TNA', 'TZA', 'SOXL', 'SOXS',
            'LABU', 'LABD', 'NUGT', 'DUST', 'JNUG', 'JDST', 'UVXY', 'SVXY', 'VIXY', 'VXX',
            
            # Biotech
            'MRNA', 'BNTX', 'NVAX', 'INO', 'VXRT', 'OCGN', 'SAVA', 'BNGO', 'NNDM', 'SENS',
            
            # EV and Tech
            'TSLA', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI', 'FSR', 'NKLA', 'RIDE', 'GOEV',
            'NVDA', 'AMD', 'AI', 'SMCI', 'IONQ', 'RGTI', 'QBTS', 'ARQQ',
            
            # Energy
            'OXY', 'DVN', 'MRO', 'HAL', 'SLB', 'CVE', 'FANG', 'AR', 'RIG', 'OVV',
            
            # Cannabis
            'TLRY', 'CGC', 'ACB', 'SNDL', 'HEXO', 'OGI', 'CRON',
            
            # SPACs and Recent IPOs  
            'DWAC', 'CFVI', 'RDBX', 'SST', 'ATER', 'MULN', 'NRGV', 'APRN', 'BBIG', 'CEI'
        ]
        
        # Remove duplicates
        tickers_to_analyze = list(set(volatile_sectors))
        
    print(f"\n⚡ Analyzing volatility for {len(tickers_to_analyze)} tickers...")
    print(f"⏱️ Estimated time: {len(tickers_to_analyze) * 0.6 / 60:.1f} minutes")
    
    # Process tickers with rate limiting
    # 100 requests per minute = 0.6 seconds between requests
    args_list = [(ticker, api_key, i * 0.65) for i, ticker in enumerate(tickers_to_analyze)]
    
    results = []
    processed_count = 0
    start_time = time.time()
    
    # Process in batches of 90 (to stay under 100/minute limit)
    batch_size = 90
    
    for batch_start in range(0, len(args_list), batch_size):
        batch = args_list[batch_start:batch_start + batch_size]
        batch_results = []
        
        print(f"\n📦 Processing batch {batch_start//batch_size + 1}/{(len(args_list)-1)//batch_size + 1}")
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            future_to_ticker = {executor.submit(get_ticker_data, args): args[0] for args in batch}
            
            for future in as_completed(future_to_ticker):
                ticker = future_to_ticker[future]
                try:
                    result = future.result()
                    if result:
                        batch_results.append(result)
                    
                    processed_count += 1
                    
                    if processed_count % 30 == 0:
                        elapsed = time.time() - start_time
                        rate = processed_count / elapsed * 60
                        print(f"  ✅ Processed {processed_count}/{len(tickers_to_analyze)} " + 
                              f"(found {len(results) + len(batch_results)}, rate: {rate:.0f}/min)")
                        
                except Exception as e:
                    pass
        
        results.extend(batch_results)
        
        # Wait before next batch if not the last batch
        if batch_start + batch_size < len(args_list):
            print(f"  ⏳ Waiting for rate limit reset...")
            time.sleep(max(0, 60 - (time.time() - start_time) % 60))
    
    print(f"\n📈 Found {len(results)} tickers meeting criteria (>$5, >100k volume)")
    
    if len(results) == 0:
        print("❌ No tickers found meeting criteria")
        return
    
    # Convert to DataFrame and sort by volatility
    df = pd.DataFrame(results)
    df = df.sort_values('volatility_pct', ascending=False).reset_index(drop=True)
    
    # Take top 500
    top_500 = df.head(500)
    
    # Display top 20
    print(f"\n🏆 TOP 20 MOST VOLATILE TICKERS OVER $5:")
    print("=" * 110)
    print(f"{'Rank':<6} {'Ticker':<8} {'Price':<10} {'Volatility %':<15} {'30d Change %':<15} {'Avg Volume':<15}")
    print("-" * 110)
    
    for idx, row in top_500.head(20).iterrows():
        print(f"{idx+1:<6} {row['ticker']:<8} ${row['current_price']:<9.2f} {row['volatility_pct']:<14.1f} "
              f"{row['month_change_pct']:>+14.1f} {row['avg_volume']:>14,.0f}")
    
    # Save results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M')
    filename = f'top_500_volatile_tickers_{timestamp}.csv'
    top_500.to_csv(filename, index=False)
    
    print(f"\n✅ Results saved to {filename}")
    print(f"📊 Summary:")
    print(f"   Total tickers analyzed: {processed_count}")
    print(f"   Tickers over $5 with volume: {len(results)}")
    print(f"   Top 500 saved to CSV")
    print(f"   Volatility range: {top_500['volatility_pct'].min():.1f}% - {top_500['volatility_pct'].max():.1f}%")
    print(f"   Price range: ${top_500['current_price'].min():.2f} - ${top_500['current_price'].max():.2f}")
    
    elapsed_total = time.time() - start_time
    print(f"   Total time: {elapsed_total/60:.1f} minutes")
    print(f"   Effective rate: {processed_count/elapsed_total*60:.0f} requests/minute")

if __name__ == "__main__":
    find_volatile_tickers()