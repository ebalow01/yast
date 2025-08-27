import requests
import pandas as pd
import time
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import sys
import numpy as np

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

def download_crm_data():
    """Download 3 years of CRM data with 15-minute intervals"""
    
    # Get API key
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found in environment variables")
        return
    
    # Calculate date range (3 years back from today)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=3*365)  # 3 years
    
    print(f"🔍 Downloading CRM data from {start_date.date()} to {end_date.date()}")
    print("📊 15-minute intervals, regular market hours only")
    
    # Polygon API endpoint for aggregates
    base_url = "https://api.polygon.io/v2/aggs/ticker/CRM/range/15/minute"
    
    all_data = []
    current_date = start_date
    batch_size = timedelta(days=30)  # Process in 30-day batches to avoid timeouts
    
    while current_date < end_date:
        batch_end = min(current_date + batch_size, end_date)
        
        from_date = current_date.strftime('%Y-%m-%d')
        to_date = batch_end.strftime('%Y-%m-%d')
        
        url = f"{base_url}/{from_date}/{to_date}"
        params = {
            'adjusted': 'true',
            'sort': 'asc',
            'limit': 50000,
            'apikey': api_key
        }
        
        print(f"📥 Fetching batch: {from_date} to {to_date}")
        
        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') == 'OK' and 'results' in data:
                batch_data = data['results']
                print(f"✅ Retrieved {len(batch_data)} records")
                all_data.extend(batch_data)
            else:
                print(f"⚠️  No data returned for batch {from_date} to {to_date}")
                print(f"Response: {data}")
            
            # Rate limiting - be respectful to the API
            time.sleep(12)  # 12 seconds between requests (5 requests per minute limit)
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching data for {from_date} to {to_date}: {e}")
            time.sleep(30)  # Wait longer on error
            continue
        
        current_date = batch_end
    
    if not all_data:
        print("❌ No data retrieved!")
        return
    
    print(f"📊 Total records retrieved: {len(all_data)}")
    
    # Convert to DataFrame
    df = pd.DataFrame(all_data)
    
    # Convert timestamp from milliseconds to datetime
    df['timestamp'] = pd.to_datetime(df['t'], unit='ms', utc=True)
    df['timestamp'] = df['timestamp'].dt.tz_convert('America/New_York')
    
    # Filter for regular market hours (9:30 AM - 4:00 PM ET)
    df['hour'] = df['timestamp'].dt.hour
    df['minute'] = df['timestamp'].dt.minute
    
    # Keep only regular trading hours
    market_hours_mask = (
        ((df['hour'] == 9) & (df['minute'] >= 30)) |  # 9:30 AM onwards
        (df['hour'].between(10, 15)) |                # 10 AM - 3 PM
        ((df['hour'] == 16) & (df['minute'] == 0))    # 4:00 PM close
    )
    
    df = df[market_hours_mask].copy()
    
    # Rename columns to match our format
    df = df.rename(columns={
        'o': 'open',
        'h': 'high',
        'l': 'low',
        'c': 'close',
        'v': 'volume'
    })
    
    # Add day of week and day of month
    df['day_of_week'] = df['timestamp'].dt.day_name()
    df['day_of_month'] = df['timestamp'].dt.day
    
    # Calculate RSI
    print("📈 Calculating 14-day RSI...")
    df = df.sort_values('timestamp').reset_index(drop=True)
    rsi_values = calculate_rsi(df['close'].values, period=14)
    df['rsi'] = rsi_values
    
    # Select final columns
    final_df = df[['timestamp', 'open', 'high', 'low', 'close', 'volume', 'day_of_week', 'day_of_month', 'rsi']].copy()
    
    # Save to CSV
    filename = 'crm_15min_data.csv'
    final_df.to_csv(filename, index=False)
    
    print(f"✅ CRM data saved to {filename}")
    print(f"📊 Total records: {len(final_df)}")
    print(f"📅 Date range: {final_df['timestamp'].min()} to {final_df['timestamp'].max()}")
    print(f"💲 Price range: ${final_df['close'].min():.2f} to ${final_df['close'].max():.2f}")
    
    # Create summary JSON
    summary = {
        'ticker': 'CRM',
        'timeframe': '15min',
        'total_records': len(final_df),
        'start_date': str(final_df['timestamp'].min()),
        'end_date': str(final_df['timestamp'].max()),
        'regular_hours_only': True,
        'rsi_calculated': True,
        'downloaded_at': str(datetime.now())
    }
    
    with open('crm_data_summary.json', 'w') as f:
        import json
        json.dump(summary, f, indent=2)
    
    print(f"📋 Summary saved to crm_data_summary.json")
    
    return final_df

if __name__ == "__main__":
    download_crm_data()