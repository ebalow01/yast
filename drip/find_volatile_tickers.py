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
    ticker, api_key = args
    
    try:
        # Get last 90 days of data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        
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
        
        # Add delay to respect rate limits
        time.sleep(0.5)
        
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
        
        return {
            'ticker': ticker,
            'current_price': current_price,
            'volatility_pct': volatility,
            'avg_volume': avg_volume,
            'days_of_data': len(closes)
        }
        
    except Exception as e:
        return None

def find_volatile_tickers():
    """Find top 500 most volatile tickers over $5"""
    
    print("🔍 FINDING TOP 500 MOST VOLATILE TICKERS OVER $5")
    print("=" * 80)
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found in environment")
        return
    
    print("📥 Fetching ticker universe from Polygon...")
    
    # Get all active US stocks
    url = "https://api.polygon.io/v3/reference/tickers"
    params = {
        'market': 'stocks',
        'active': 'true',
        'limit': 1000,
        'apikey': api_key
    }
    
    all_tickers = []
    next_url = None
    
    try:
        # Fetch first page
        response = requests.get(url, params=params, timeout=30)
        data = response.json()
        
        if 'results' in data:
            all_tickers.extend([t['ticker'] for t in data['results']])
            next_url = data.get('next_url')
        
        # Fetch remaining pages (limit to 5000 tickers total)
        page_count = 1
        while next_url and len(all_tickers) < 5000 and page_count < 5:
            response = requests.get(f"{next_url}&apiKey={api_key}", timeout=30)
            data = response.json()
            
            if 'results' in data:
                all_tickers.extend([t['ticker'] for t in data['results']])
                next_url = data.get('next_url')
            else:
                break
            
            page_count += 1
            time.sleep(0.5)  # Rate limit
        
        print(f"✅ Found {len(all_tickers)} active tickers")
        
        # Filter out tickers with special characters (warrants, units, etc)
        clean_tickers = [t for t in all_tickers if t.replace('.', '').replace('-', '').isalnum() and len(t) <= 5]
        print(f"📊 Filtered to {len(clean_tickers)} clean ticker symbols")
        
        # Sample if we have too many (focus on more liquid names)
        if len(clean_tickers) > 2000:
            # Prioritize common tickers (shorter symbols tend to be more liquid)
            clean_tickers.sort(key=lambda x: (len(x), x))
            clean_tickers = clean_tickers[:2000]
            print(f"📉 Limited to {len(clean_tickers)} tickers for analysis")
        
    except Exception as e:
        print(f"❌ Error fetching ticker universe: {e}")
        return
    
    print(f"\n⚡ Analyzing volatility for {len(clean_tickers)} tickers...")
    print("📊 Criteria: Price > $5, Avg Volume > 100k shares")
    print("⏳ This will take several minutes due to rate limits...")
    
    # Process tickers in parallel
    args_list = [(ticker, api_key) for ticker in clean_tickers]
    
    results = []
    processed_count = 0
    
    with ThreadPoolExecutor(max_workers=4) as executor:
        future_to_ticker = {executor.submit(get_ticker_data, args): args[0] for args in args_list}
        
        for future in as_completed(future_to_ticker):
            ticker = future_to_ticker[future]
            try:
                result = future.result()
                if result:
                    results.append(result)
                
                processed_count += 1
                if processed_count % 100 == 0:
                    print(f"  ✅ Processed {processed_count}/{len(clean_tickers)} tickers, found {len(results)} qualifying...")
                    
            except Exception as e:
                pass
    
    print(f"\n📈 Found {len(results)} tickers meeting criteria")
    
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
    print("=" * 90)
    print(f"{'Rank':<6} {'Ticker':<8} {'Price':<10} {'Volatility %':<15} {'Avg Volume':<15}")
    print("-" * 90)
    
    for idx, row in top_500.head(20).iterrows():
        print(f"{idx+1:<6} {row['ticker']:<8} ${row['current_price']:<9.2f} {row['volatility_pct']:<14.1f} {row['avg_volume']:>14,.0f}")
    
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

if __name__ == "__main__":
    find_volatile_tickers()