import os
import sys
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dotenv import load_dotenv
import time
import json

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

def calculate_rsi(prices, period=14):
    """Calculate RSI (Relative Strength Index) for given prices"""
    if len(prices) < period + 1:
        return [np.nan] * len(prices)
    
    # Calculate price changes
    deltas = np.diff(prices)
    
    # Separate gains and losses
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    
    # Calculate initial average gain and loss (SMA for first calculation)
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])
    
    rsi_values = [np.nan] * period  # First 'period' values are NaN
    
    # Calculate RSI for the first valid point
    if avg_loss == 0:
        rsi = 100.0
    else:
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
    
    rsi_values.append(rsi)
    
    # Calculate RSI for remaining points using Wilder's smoothing
    for i in range(period + 1, len(prices)):
        gain = gains[i - 1]
        loss = losses[i - 1]
        
        # Wilder's smoothing (exponential moving average with alpha = 1/period)
        avg_gain = ((avg_gain * (period - 1)) + gain) / period
        avg_loss = ((avg_loss * (period - 1)) + loss) / period
        
        if avg_loss == 0:
            rsi = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
        
        rsi_values.append(rsi)
    
    return rsi_values

def download_smci_data():
    """Download 3 years of SMCI data in 15-minute increments with RSI"""
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found!")
        return None
    
    # Define date range (3 years from today)
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=365 * 3)
    
    print(f"Downloading SMCI data from {start_date} to {end_date}")
    print("This may take a few minutes due to API rate limits...")
    
    all_data = []
    
    # Fetch data in 6-month chunks to stay within API limits
    current_start = start_date
    while current_start < end_date:
        # Fetch data in 6-month chunks
        current_end = min(current_start + timedelta(days=180), end_date)
        
        # Format dates for API
        from_date = current_start.strftime('%Y-%m-%d')
        to_date = current_end.strftime('%Y-%m-%d')
        
        print(f"\nFetching SMCI data from {from_date} to {to_date}...")
        
        # Polygon API endpoint for aggregate bars
        url = f"https://api.polygon.io/v2/aggs/ticker/SMCI/range/15/minute/{from_date}/{to_date}"
        
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
                elif data.get('status') == 'DELAYED':
                    print(f"  ⚠️ Data is marked as DELAYED")
                    if 'results' in data:
                        results = data['results']
                        print(f"     Retrieved {len(results)} delayed data points")
                        for bar in results:
                            timestamp = datetime.fromtimestamp(bar['t'] / 1000)
                            hour = timestamp.hour
                            minute = timestamp.minute
                            
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
    
    if all_data:
        # Convert to DataFrame
        df = pd.DataFrame(all_data)
        df.sort_values('timestamp', inplace=True)
        df.reset_index(drop=True, inplace=True)
        
        print(f"\n✅ Retrieved {len(df)} total SMCI records")
        print(f"   Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
        
        # Calculate RSI
        print("\n📈 Calculating 14-day RSI...")
        
        # Group by date to get daily closing prices for RSI
        df['date'] = df['timestamp'].dt.date
        daily_closes = df.groupby('date')['close'].last()
        
        # Calculate RSI on daily closing prices
        closing_prices = daily_closes.values
        rsi_values = calculate_rsi(closing_prices, period=14)
        
        # Create date to RSI mapping
        date_to_rsi = {}
        for date, rsi in zip(daily_closes.index, rsi_values):
            date_to_rsi[date] = rsi
        
        # Add RSI to main DataFrame
        df['rsi_14'] = df['date'].map(date_to_rsi)
        df = df.drop('date', axis=1)  # Remove temporary date column
        
        # Calculate RSI statistics
        valid_rsi = df['rsi_14'].dropna()
        print(f"✅ RSI calculated for {len(valid_rsi)} data points")
        
        if len(valid_rsi) > 0:
            print(f"   Mean RSI: {valid_rsi.mean():.2f}")
            print(f"   Min RSI: {valid_rsi.min():.2f}")
            print(f"   Max RSI: {valid_rsi.max():.2f}")
        
        # Save to CSV
        output_file = 'smci_15min_data.csv'
        df.to_csv(output_file, index=False)
        print(f"\n✅ SMCI data saved to '{output_file}'")
        print(f"   File contains {len(df):,} records with RSI data")
        print(f"   Columns: {', '.join(df.columns)}")
        
        # Create summary
        summary = {
            'ticker': 'SMCI',
            'timeframe': '15min',
            'total_records': len(df),
            'start_date': str(df['timestamp'].min()),
            'end_date': str(df['timestamp'].max()),
            'regular_hours_only': True,
            'rsi_calculated': True,
            'downloaded_at': str(datetime.now())
        }
        
        with open('smci_data_summary.json', 'w') as f:
            json.dump(summary, f, indent=2)
        
        print(f"   Summary saved to 'smci_data_summary.json'")
        
        # Show sample of recent data
        print(f"\n📋 Sample recent SMCI data:")
        sample_data = df.tail(5)[['timestamp', 'close', 'volume', 'rsi_14']]
        for _, row in sample_data.iterrows():
            rsi_str = f"{row['rsi_14']:.2f}" if pd.notna(row['rsi_14']) else "N/A"
            print(f"  {row['timestamp']}: Close=${row['close']:.2f}, Vol={row['volume']:,.0f}, RSI={rsi_str}")
        
        # Check for extreme RSI values
        oversold = df[df['rsi_14'] <= 30]
        overbought = df[df['rsi_14'] >= 70]
        
        print(f"\n⚠️ SMCI RSI Signal Analysis:")
        print(f"  Oversold periods (RSI ≤ 30): {len(oversold):,} bars ({len(oversold)/len(df[df['rsi_14'].notna()])*100:.1f}%)")
        print(f"  Overbought periods (RSI ≥ 70): {len(overbought):,} bars ({len(overbought)/len(df[df['rsi_14'].notna()])*100:.1f}%)")
        
        if len(oversold) > 0:
            print(f"  Most recent oversold: {oversold['timestamp'].max()}")
        if len(overbought) > 0:
            print(f"  Most recent overbought: {overbought['timestamp'].max()}")
        
        return df
    else:
        print("\n❌ No SMCI data was retrieved")
        return None

if __name__ == "__main__":
    print("SMCI Historical Data Downloader (3 Years)")
    print("=" * 50)
    download_smci_data()