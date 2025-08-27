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

def update_drip_data():
    """Fetch remaining DRIP data from March 6, 2024 to present"""
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found!")
        return None
    
    # Load existing data to get the last date
    existing_file = 'drip_15min_data.csv'
    if os.path.exists(existing_file):
        existing_df = pd.read_csv(existing_file)
        existing_df['timestamp'] = pd.to_datetime(existing_df['timestamp'])
        last_date = existing_df['timestamp'].max()
        print(f"Last data point in existing file: {last_date}")
        
        # Start from the next day after the last data point
        start_date = (last_date + timedelta(days=1)).date()
    else:
        print("No existing data file found, starting from March 6, 2024")
        start_date = datetime(2024, 3, 6).date()
    
    # End date is today
    end_date = datetime(2025, 8, 27).date()
    
    print(f"Fetching DRIP data from {start_date} to {end_date}")
    
    all_new_data = []
    
    # Fetch data in smaller chunks (3-month intervals)
    current_start = start_date
    while current_start < end_date:
        # Fetch data in 3-month chunks
        current_end = min(current_start + timedelta(days=90), end_date)
        
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
                        hour = timestamp.hour
                        minute = timestamp.minute
                        
                        # Skip pre-market and after-hours data
                        if hour < 9 or (hour == 9 and minute < 30) or hour >= 16:
                            continue
                        
                        all_new_data.append({
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
                elif data.get('status') == 'DELAYED':
                    print(f"  ⚠️ Data is marked as DELAYED (may be incomplete)")
                    # Still try to get what we can
                    if 'results' in data:
                        results = data['results']
                        print(f"     Retrieved {len(results)} delayed data points")
                        for bar in results:
                            timestamp = datetime.fromtimestamp(bar['t'] / 1000)
                            hour = timestamp.hour
                            minute = timestamp.minute
                            
                            if hour < 9 or (hour == 9 and minute < 30) or hour >= 16:
                                continue
                            
                            all_new_data.append({
                                'timestamp': timestamp,
                                'open': bar['o'],
                                'high': bar['h'],
                                'low': bar['l'],
                                'close': bar['c'],
                                'volume': bar['v'],
                                'vwap': bar.get('vw', None),
                                'transactions': bar.get('n', None)
                            })
                else:
                    print(f"  ⚠️ Unexpected response: {data.get('status', 'Unknown status')}")
            elif response.status_code == 403:
                print(f"  ❌ Access forbidden (403) - This date range may require a higher tier subscription")
            elif response.status_code == 429:
                print("     Rate limit hit, waiting 60 seconds...")
                time.sleep(60)
                continue
            else:
                print(f"  ❌ API request failed with status {response.status_code}")
                    
        except Exception as e:
            print(f"  ❌ Error fetching data: {e}")
        
        # Move to next chunk
        current_start = current_end + timedelta(days=1)
        
        # Rate limiting - be respectful to the API
        time.sleep(0.5)
    
    if all_new_data:
        # Convert to DataFrame
        new_df = pd.DataFrame(all_new_data)
        new_df.sort_values('timestamp', inplace=True)
        new_df.reset_index(drop=True, inplace=True)
        
        print(f"\n✅ Retrieved {len(new_df)} new data points")
        print(f"   New data range: {new_df['timestamp'].min()} to {new_df['timestamp'].max()}")
        
        # Combine with existing data if it exists
        if os.path.exists(existing_file):
            existing_df = pd.read_csv(existing_file)
            existing_df['timestamp'] = pd.to_datetime(existing_df['timestamp'])
            
            # Combine and remove duplicates
            combined_df = pd.concat([existing_df, new_df], ignore_index=True)
            combined_df.drop_duplicates(subset=['timestamp'], keep='last', inplace=True)
            combined_df.sort_values('timestamp', inplace=True)
            combined_df.reset_index(drop=True, inplace=True)
            
            # Save updated data
            combined_df.to_csv(existing_file, index=False)
            print(f"\n✅ Updated {existing_file}")
            print(f"   Total records now: {len(combined_df)}")
            print(f"   Full date range: {combined_df['timestamp'].min()} to {combined_df['timestamp'].max()}")
            
            # Update summary
            summary = {
                'ticker': 'DRIP',
                'timeframe': '15min',
                'total_records': len(combined_df),
                'start_date': str(combined_df['timestamp'].min()),
                'end_date': str(combined_df['timestamp'].max()),
                'regular_hours_only': True,
                'last_updated': str(datetime.now())
            }
        else:
            # Save as new file
            new_df.to_csv(existing_file, index=False)
            print(f"\n✅ Created {existing_file}")
            print(f"   Total records: {len(new_df)}")
            
            summary = {
                'ticker': 'DRIP',
                'timeframe': '15min',
                'total_records': len(new_df),
                'start_date': str(new_df['timestamp'].min()),
                'end_date': str(new_df['timestamp'].max()),
                'regular_hours_only': True,
                'last_updated': str(datetime.now())
            }
        
        with open('drip_data_summary.json', 'w') as f:
            json.dump(summary, f, indent=2)
        
        print(f"   Summary updated in drip_data_summary.json")
        
    else:
        print("\n❌ No new data was retrieved")

if __name__ == "__main__":
    print("DRIP Data Updater")
    print("=" * 40)
    update_drip_data()