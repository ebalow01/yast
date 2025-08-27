import requests
import pandas as pd
from datetime import datetime
import os
from dotenv import load_dotenv
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

def test_single_ticker_download(ticker='NVDA'):
    """Test downloading data for a single ticker to debug the issue"""
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ No API key found")
        return
    
    print(f"🔍 Testing data download for {ticker}")
    print("=" * 50)
    
    # Try different date ranges
    date_ranges = [
        ("2025-01-01", "2025-08-27", "Full 2025"),
        ("2025-08-01", "2025-08-27", "August 2025"),
        ("2025-07-01", "2025-07-31", "July 2025"),
        ("2024-01-01", "2024-12-31", "Full 2024")
    ]
    
    for from_date, to_date, description in date_ranges:
        print(f"\n📅 Testing {description} ({from_date} to {to_date})")
        
        url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{from_date}/{to_date}"
        params = {
            'adjusted': 'true',
            'sort': 'asc',
            'limit': 5000,
            'apikey': api_key
        }
        
        try:
            print(f"🔗 URL: {url}")
            response = requests.get(url, params=params, timeout=10)
            print(f"📊 Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"📋 Response keys: {list(data.keys())}")
                print(f"🏷️  Status: {data.get('status')}")
                
                if 'results' in data and data['results']:
                    print(f"✅ Found {len(data['results'])} records")
                    print(f"📈 Sample record: {data['results'][0]}")
                    
                    # Quick DataFrame test
                    df = pd.DataFrame(data['results'])
                    print(f"📊 DataFrame shape: {df.shape}")
                    print(f"📊 Columns: {list(df.columns)}")
                    
                else:
                    print(f"❌ No results found")
                    if 'message' in data:
                        print(f"💬 Message: {data['message']}")
                    
            else:
                print(f"❌ HTTP Error: {response.status_code}")
                print(f"📄 Response: {response.text[:200]}...")
                
        except Exception as e:
            print(f"💥 Exception: {e}")
    
    # Test the current grouped endpoint that worked
    print(f"\n🔄 Testing grouped endpoint (what worked before):")
    yesterday = "2025-08-26"  # Use the date that worked
    
    url = f"https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/{yesterday}"
    params = {'adjusted': 'true', 'apikey': api_key}
    
    try:
        response = requests.get(url, params=params, timeout=10)
        print(f"📊 Grouped Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"🏷️  Grouped Status: {data.get('status')}")
            
            if 'results' in data and data['results']:
                print(f"✅ Grouped found {len(data['results'])} tickers")
                
                # Find our test ticker
                nvda_data = next((r for r in data['results'] if r.get('T') == ticker), None)
                if nvda_data:
                    print(f"✅ Found {ticker} in grouped data: {nvda_data}")
                else:
                    print(f"❌ {ticker} not found in grouped data")
            else:
                print(f"❌ No grouped results")
        else:
            print(f"❌ Grouped HTTP Error: {response.status_code}")
            
    except Exception as e:
        print(f"💥 Grouped Exception: {e}")

if __name__ == "__main__":
    test_single_ticker_download()