import requests
import pandas as pd
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import sys
import time
import random

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

def spot_check_data_currency():
    """Spot check 20 random tickers to see if they all have Sept 2nd data"""
    
    print("🔍 SPOT CHECKING DATA CURRENCY")
    print("=" * 50)
    
    # Load ticker list
    ticker_df = pd.read_csv('combined_525_tickers_20250903_0747.csv')
    tickers = ticker_df['ticker'].tolist()
    
    # Sample 20 random tickers for spot check
    sample_tickers = random.sample(tickers, 20)
    
    print(f"📊 Checking 20 random tickers from {len(tickers)} total...")
    print(f"Looking for data through September 2, 2025")
    print()
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ No API key found")
        return
    
    current_results = []
    
    for i, ticker in enumerate(sample_tickers, 1):
        try:
            # Check last 5 days to see latest available data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=10)
            
            from_date = start_date.strftime('%Y-%m-%d')
            to_date = end_date.strftime('%Y-%m-%d')
            
            url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{from_date}/{to_date}"
            params = {
                'adjusted': 'true',
                'sort': 'desc',  # Most recent first
                'limit': 5,
                'apikey': api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'results' in data and data['results']:
                    # Get most recent data point
                    latest_timestamp = data['results'][0]['t']
                    latest_date = pd.to_datetime(latest_timestamp, unit='ms', utc=True).tz_convert('America/New_York')
                    latest_date_str = latest_date.strftime('%Y-%m-%d')
                    
                    # Calculate days ago
                    days_ago = (datetime.now() - latest_date.tz_localize(None)).days
                    
                    # Check if it's Sept 2nd
                    is_current = latest_date_str == '2025-09-02'
                    status = "✅" if is_current else "⚠️"
                    
                    price = data['results'][0]['c']
                    
                    print(f"{i:2d}. {ticker:<6} {status} Latest: {latest_date_str} ({days_ago}d ago) Price: ${price:>8.2f}")
                    
                    current_results.append({
                        'ticker': ticker,
                        'latest_date': latest_date_str,
                        'days_ago': days_ago,
                        'price': price,
                        'is_current': is_current
                    })
                    
                else:
                    print(f"{i:2d}. {ticker:<6} ❌ No recent data found")
                    current_results.append({
                        'ticker': ticker,
                        'latest_date': None,
                        'days_ago': None,
                        'price': None,
                        'is_current': False
                    })
            else:
                print(f"{i:2d}. {ticker:<6} ❌ API error: {response.status_code}")
                current_results.append({
                    'ticker': ticker,
                    'latest_date': None,
                    'days_ago': None,
                    'price': None,
                    'is_current': False
                })
                
            # Rate limit
            time.sleep(0.7)
            
        except Exception as e:
            print(f"{i:2d}. {ticker:<6} ❌ Error: {str(e)[:30]}")
            current_results.append({
                'ticker': ticker,
                'latest_date': None,
                'days_ago': None,
                'price': None,
                'is_current': False
            })
    
    # Summary
    print("\n" + "=" * 50)
    
    current_count = sum(1 for r in current_results if r['is_current'])
    total_count = len([r for r in current_results if r['latest_date'] is not None])
    
    print(f"📈 SPOT CHECK RESULTS:")
    print(f"   Tickers with Sept 2nd data: {current_count}/{total_count}")
    print(f"   Percentage current: {current_count/total_count*100:.1f}%" if total_count > 0 else "   No valid data found")
    
    if current_count == total_count and total_count > 0:
        print("   ✅ All sampled tickers have current data")
    elif current_count >= total_count * 0.9:
        print("   ✅ Most tickers have current data (good)")
    elif current_count >= total_count * 0.7:
        print("   ⚠️ Some tickers missing recent data")
    else:
        print("   ❌ Many tickers have stale data")
    
    # Show any outliers
    stale_tickers = [r for r in current_results if r['days_ago'] and r['days_ago'] > 3]
    if stale_tickers:
        print(f"\n⚠️ Tickers with data older than 3 days:")
        for r in stale_tickers:
            print(f"   {r['ticker']}: {r['latest_date']} ({r['days_ago']} days ago)")
    
    print(f"\n💡 This sample suggests ~{current_count/total_count*100:.0f}% of your {len(tickers)} tickers have current data" if total_count > 0 else "")

if __name__ == "__main__":
    spot_check_data_currency()