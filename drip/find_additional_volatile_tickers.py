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
        # Get last 60 days of data
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
        
        # Skip if average volume < 50k shares (lower threshold to get more tickers)
        if avg_volume < 50000:
            return None
        
        # Calculate 30-day price change
        if len(closes) >= 30:
            month_change = ((closes[-1] - closes[-30]) / closes[-30]) * 100
        else:
            month_change = 0
        
        # Calculate YTD return (approximation using available data)
        ytd_return = ((closes[-1] - closes[0]) / closes[0]) * 100
        
        return {
            'ticker': ticker,
            'current_price': current_price,
            'volatility_pct': volatility,
            'avg_volume': avg_volume,
            'month_change_pct': month_change,
            'ytd_return_pct': ytd_return,
            'days_of_data': len(closes)
        }
        
    except Exception as e:
        return None

def find_additional_volatile_tickers():
    """Find 300 additional volatile tickers not in existing list"""
    
    print("🔍 FINDING 300 ADDITIONAL VOLATILE TICKERS OVER $5")
    print("=" * 80)
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found in environment")
        return
    
    # Load existing tickers to exclude
    print("📥 Loading existing ticker list to exclude...")
    existing_df = pd.read_csv('top_300_tickers_summary.csv')
    existing_tickers = set(existing_df['ticker'].tolist())
    print(f"✅ Loaded {len(existing_tickers)} existing tickers to exclude")
    
    print("\n🌐 Fetching all active tickers from Polygon...")
    
    # Get ticker list using the reference API
    url = "https://api.polygon.io/v3/reference/tickers"
    params = {
        'market': 'stocks',
        'active': 'true',
        'limit': 1000,
        'order': 'asc',
        'sort': 'ticker',
        'apikey': api_key
    }
    
    all_tickers = []
    next_url = None
    page_count = 0
    max_pages = 10  # Limit pages to avoid too many tickers
    
    try:
        while page_count < max_pages:
            if next_url:
                response = requests.get(f"{next_url}&apiKey={api_key}", timeout=30)
            else:
                response = requests.get(url, params=params, timeout=30)
            
            if response.status_code != 200:
                break
                
            data = response.json()
            
            if 'results' in data:
                for ticker_info in data['results']:
                    ticker = ticker_info['ticker']
                    
                    # Skip if already in our list
                    if ticker in existing_tickers:
                        continue
                    
                    # Skip tickers with special characters (warrants, preferred, etc)
                    if '.' in ticker or '-' in ticker or len(ticker) > 5:
                        continue
                    
                    # Skip if it's an ETN, warrant, or other non-stock
                    ticker_type = ticker_info.get('type', '')
                    if ticker_type != 'CS':  # CS = Common Stock
                        continue
                    
                    all_tickers.append(ticker)
                
                next_url = data.get('next_url')
                if not next_url:
                    break
            else:
                break
            
            page_count += 1
            print(f"  📄 Fetched page {page_count}, total unique tickers: {len(all_tickers)}")
            time.sleep(0.5)  # Rate limit
        
        print(f"✅ Found {len(all_tickers)} potential new tickers to analyze")
        
    except Exception as e:
        print(f"❌ Error fetching tickers: {e}")
        return
    
    # Limit to manageable number for analysis
    if len(all_tickers) > 1500:
        # Prioritize by alphabetical (tends to get more established companies)
        all_tickers = all_tickers[:1500]
        print(f"📊 Limited to {len(all_tickers)} tickers for analysis")
    
    print(f"\n⚡ Analyzing volatility for {len(all_tickers)} new tickers...")
    print(f"⏱️ Processing in batches (100 requests/minute limit)")
    
    results = []
    processed_count = 0
    failed_count = 0
    start_time = time.time()
    
    # Process in batches to respect rate limit
    batch_size = 90
    
    for batch_start in range(0, len(all_tickers), batch_size):
        batch = all_tickers[batch_start:batch_start + batch_size]
        batch_args = [(ticker, api_key) for ticker in batch]
        
        print(f"\n📦 Processing batch {batch_start//batch_size + 1}/{(len(all_tickers)-1)//batch_size + 1}")
        batch_start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            # Submit all with delays
            futures = []
            for i, args in enumerate(batch_args):
                future = executor.submit(get_ticker_data, args)
                futures.append((future, args[0]))
                time.sleep(0.65)  # Spread out requests
            
            # Collect results
            for future, ticker in futures:
                try:
                    result = future.result(timeout=10)
                    if result:
                        results.append(result)
                    else:
                        failed_count += 1
                    
                    processed_count += 1
                    
                    if processed_count % 30 == 0:
                        print(f"  ✅ Processed {processed_count}/{len(all_tickers)} " + 
                              f"(found {len(results)} qualifying)")
                        
                except Exception as e:
                    failed_count += 1
                    processed_count += 1
        
        # Wait for rate limit if needed
        batch_elapsed = time.time() - batch_start_time
        if batch_elapsed < 60 and batch_start + batch_size < len(all_tickers):
            wait_time = 60 - batch_elapsed
            print(f"  ⏳ Waiting {wait_time:.0f}s for rate limit...")
            time.sleep(wait_time)
        
        # Stop if we have enough tickers
        if len(results) >= 500:
            print(f"  ✅ Found 500+ qualifying tickers, stopping early")
            break
    
    print(f"\n📈 Analysis complete!")
    print(f"   Processed: {processed_count} tickers")
    print(f"   Qualifying (>$5, >50k volume): {len(results)} tickers")
    print(f"   Failed/Filtered: {failed_count} tickers")
    
    if len(results) == 0:
        print("❌ No additional tickers found meeting criteria")
        return
    
    # Convert to DataFrame and sort by volatility
    df = pd.DataFrame(results)
    df = df.sort_values('volatility_pct', ascending=False).reset_index(drop=True)
    
    # Take top 300
    additional_300 = df.head(300)
    
    # Display top 20
    print(f"\n🏆 TOP 20 ADDITIONAL VOLATILE TICKERS:")
    print("=" * 120)
    print(f"{'Rank':<6} {'Ticker':<8} {'Price':<10} {'Volatility %':<15} {'YTD %':<12} {'30d %':<12} {'Avg Volume':<15}")
    print("-" * 120)
    
    for idx, row in additional_300.head(20).iterrows():
        print(f"{idx+1:<6} {row['ticker']:<8} ${row['current_price']:<9.2f} {row['volatility_pct']:<14.1f} "
              f"{row['ytd_return_pct']:>11.1f} {row['month_change_pct']:>11.1f} {row['avg_volume']:>14,.0f}")
    
    # Save results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M')
    
    # Save additional 300
    filename = f'additional_300_volatile_tickers_{timestamp}.csv'
    additional_300.to_csv(filename, index=False)
    
    # Create combined file with all 600 tickers
    combined = pd.concat([existing_df, additional_300], ignore_index=True)
    combined_filename = f'combined_600_tickers_{timestamp}.csv'
    
    # Ensure columns match for combined file
    additional_300_formatted = additional_300.copy()
    additional_300_formatted['category'] = 'STOCK'
    additional_300_formatted['annualized_volatility_pct'] = additional_300_formatted['volatility_pct']
    additional_300_formatted['avg_daily_volume'] = additional_300_formatted['avg_volume']
    
    # Select matching columns
    cols_to_keep = ['ticker', 'category', 'days_of_data', 'ytd_return_pct', 
                    'annualized_volatility_pct', 'current_price', 'avg_daily_volume']
    
    additional_300_formatted = additional_300_formatted[
        [col for col in cols_to_keep if col in additional_300_formatted.columns]
    ]
    
    # Combine original and new
    combined = pd.concat([existing_df, additional_300_formatted], ignore_index=True)
    combined.to_csv(combined_filename, index=False)
    
    print(f"\n✅ Results saved:")
    print(f"   📄 Additional 300: {filename}")
    print(f"   📄 Combined 600: {combined_filename}")
    print(f"\n📊 Summary of additional 300:")
    print(f"   Volatility range: {additional_300['volatility_pct'].min():.1f}% - {additional_300['volatility_pct'].max():.1f}%")
    print(f"   Price range: ${additional_300['current_price'].min():.2f} - ${additional_300['current_price'].max():.2f}")
    print(f"   Average volatility: {additional_300['volatility_pct'].mean():.1f}%")
    
    elapsed_total = time.time() - start_time
    print(f"   Total time: {elapsed_total/60:.1f} minutes")

if __name__ == "__main__":
    find_additional_volatile_tickers()