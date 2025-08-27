import os
import sys
import requests
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
import time
import json

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

def download_drip_data():
    """Download 10 years of DRIP data in 15-minute increments"""
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found!")
        return None
    
    # Define date range (10 years from today)
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=365 * 10)
    
    print(f"Downloading DRIP data from {start_date} to {end_date}")
    print("This may take a few minutes due to API rate limits...")
    
    all_data = []
    
    # Polygon API limits: we need to fetch data in chunks (max 50,000 results per request)
    # 15-min bars for ~252 trading days/year * 26 bars/day = ~6,552 bars/year
    # We'll fetch data year by year to stay within limits
    
    current_start = start_date
    while current_start < end_date:
        # Fetch data in 1-year chunks
        current_end = min(current_start + timedelta(days=365), end_date)
        
        # Format dates for API
        from_date = current_start.strftime('%Y-%m-%d')
        to_date = current_end.strftime('%Y-%m-%d')
        
        print(f"\nFetching data from {from_date} to {to_date}...")
        
        # Polygon API endpoint for aggregate bars
        url = f"https://api.polygon.io/v2/aggs/ticker/DRIP/range/15/minute/{from_date}/{to_date}"
        
        params = {
            'apikey': api_key,
            'adjusted': 'true',
            'sort': 'asc',
            'limit': 50000
        }
        
        try:
            response = requests.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('status') == 'OK' and 'results' in data:
                    results = data['results']
                    print(f"  ✅ Retrieved {len(results)} data points")
                    
                    # Process each bar
                    for bar in results:
                        # Convert timestamp from milliseconds to datetime
                        timestamp = datetime.fromtimestamp(bar['t'] / 1000)
                        
                        # Filter for regular market hours (9:30 AM - 4:00 PM ET)
                        # Note: This is a simplified check, doesn't account for time zones perfectly
                        hour = timestamp.hour
                        minute = timestamp.minute
                        
                        # Skip pre-market and after-hours data
                        if hour < 9 or (hour == 9 and minute < 30) or hour >= 16:
                            continue
                        
                        all_data.append({
                            'timestamp': timestamp,
                            'open': bar['o'],
                            'high': bar['h'],
                            'low': bar['l'],
                            'close': bar['c'],
                            'volume': bar['v'],
                            'vwap': bar.get('vw', None),
                            'transactions': bar.get('n', None)
                        })
                elif data.get('status') == 'OK' and data.get('resultsCount') == 0:
                    print(f"  ℹ️ No data available for this period")
                else:
                    print(f"  ⚠️ Unexpected response: {data.get('status', 'Unknown status')}")
            else:
                print(f"  ❌ API request failed with status {response.status_code}")
                if response.status_code == 429:
                    print("     Rate limit hit, waiting 60 seconds...")
                    time.sleep(60)
                    continue
                    
        except Exception as e:
            print(f"  ❌ Error fetching data: {e}")
        
        # Move to next chunk
        current_start = current_end + timedelta(days=1)
        
        # Rate limiting - be respectful to the API
        time.sleep(0.5)
    
    if all_data:
        # Convert to DataFrame
        df = pd.DataFrame(all_data)
        df.sort_values('timestamp', inplace=True)
        df.reset_index(drop=True, inplace=True)
        
        # Save to CSV
        output_file = 'drip_15min_data.csv'
        df.to_csv(output_file, index=False)
        print(f"\n✅ Data saved to {output_file}")
        print(f"   Total records: {len(df)}")
        print(f"   Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
        
        # Also save a summary
        summary = {
            'ticker': 'DRIP',
            'timeframe': '15min',
            'total_records': len(df),
            'start_date': str(df['timestamp'].min()),
            'end_date': str(df['timestamp'].max()),
            'regular_hours_only': True,
            'downloaded_at': str(datetime.now())
        }
        
        with open('drip_data_summary.json', 'w') as f:
            json.dump(summary, f, indent=2)
        
        print(f"   Summary saved to drip_data_summary.json")
        
        return df
    else:
        print("\n❌ No data was retrieved")
        return None

if __name__ == "__main__":
    print("DRIP Historical Data Downloader")
    print("=" * 40)
    download_drip_data()