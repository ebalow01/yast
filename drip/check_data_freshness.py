import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def check_data_freshness():
    """Check how current our market data is"""
    
    print("📅 CHECKING DATA FRESHNESS")
    print("=" * 50)
    
    current_date = datetime.now()
    print(f"Current date: {current_date.strftime('%Y-%m-%d %H:%M')}")
    
    # Check the combined ticker file first
    try:
        ticker_df = pd.read_csv('combined_525_tickers_20250903_0747.csv')
        print(f"✅ Loaded {len(ticker_df)} tickers from combined file")
        
        if 'days_of_data' in ticker_df.columns:
            avg_days = ticker_df['days_of_data'].mean()
            max_days = ticker_df['days_of_data'].max()
            min_days = ticker_df['days_of_data'].min()
            
            print(f"\n📊 Data Coverage:")
            print(f"   Average days of data: {avg_days:.1f}")
            print(f"   Range: {min_days} to {max_days} days")
            
            # Estimate data freshness (assuming ~60 days requested)
            # If we have ~44 days, data is likely current to a few days ago
            estimated_lag = max(0, 60 - avg_days)
            print(f"   Estimated data lag: ~{estimated_lag:.0f} trading days")
            
            # Convert trading days to calendar days (rough estimate)
            calendar_lag = estimated_lag * 1.4  # weekends/holidays
            print(f"   Estimated calendar lag: ~{calendar_lag:.0f} days")
            
    except Exception as e:
        print(f"❌ Error loading ticker file: {e}")
        return
    
    # Also check by testing a specific ticker
    print(f"\n🔍 Testing specific ticker data freshness...")
    
    try:
        # Test API for a single ticker to see latest available data
        import requests
        import os
        from dotenv import load_dotenv
        
        load_dotenv()
        api_key = os.getenv('POLYGON_API_KEY')
        
        if api_key:
            # Test with AAPL (always has data)
            ticker = 'AAPL'
            end_date = current_date
            start_date = end_date - timedelta(days=10)  # Last 10 days
            
            from_date = start_date.strftime('%Y-%m-%d')
            to_date = end_date.strftime('%Y-%m-%d')
            
            url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{from_date}/{to_date}"
            params = {
                'adjusted': 'true',
                'sort': 'desc',  # Most recent first
                'limit': 10,
                'apikey': api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'results' in data and data['results']:
                    # Get most recent data point
                    latest_timestamp = data['results'][0]['t']
                    latest_date = pd.to_datetime(latest_timestamp, unit='ms', utc=True).tz_convert('America/New_York')
                    
                    # Calculate days ago
                    days_ago = (current_date - latest_date.tz_localize(None)).days
                    
                    print(f"   Latest {ticker} data: {latest_date.strftime('%Y-%m-%d')} ({days_ago} days ago)")
                    print(f"   Price: ${data['results'][0]['c']:.2f}")
                    
                    # Weekend/holiday adjustment
                    if days_ago <= 3:
                        print("   ✅ Data is current (within 3 days)")
                    elif days_ago <= 7:
                        print("   ⚠️ Data is slightly stale (weekend/holiday lag)")
                    else:
                        print("   ❌ Data appears stale")
                        
                else:
                    print("   ❌ No recent data found")
            else:
                print(f"   ❌ API error: {response.status_code}")
        else:
            print("   ❌ No API key found")
            
    except Exception as e:
        print(f"   ❌ Error testing API: {e}")
    
    print(f"\n📈 SUMMARY:")
    print(f"   Your analysis used data that was likely ~{calendar_lag:.0f} days old")
    print(f"   For trading decisions, consider data freshness")
    print(f"   Market data typically lags 1-2 trading days")

if __name__ == "__main__":
    check_data_freshness()