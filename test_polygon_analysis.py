#!/usr/bin/env python3
"""
Test script for Polygon.io + Claude analysis
Fetches real market data from Polygon, generates charts, and analyzes with Claude
"""

import base64
import json
import os
from datetime import datetime, timedelta
import requests
import io
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Rectangle
import pandas as pd
import numpy as np

# Configuration
TICKER = "YMAX"  # Test with one ticker first
POLYGON_API_KEY = ""  # We'll need to get this
CLAUDE_API_KEY = ""

# Load API keys
try:
    with open('.env', 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith('CLAUDE_API_KEY='):
                CLAUDE_API_KEY = line.split('=', 1)[1].strip()
            elif line.startswith('POLYGON_API_KEY='):
                POLYGON_API_KEY = line.split('=', 1)[1].strip()
except FileNotFoundError:
    pass

# Fallback to environment variables
if not CLAUDE_API_KEY:
    CLAUDE_API_KEY = os.getenv('CLAUDE_API_KEY', '')
if not POLYGON_API_KEY:
    POLYGON_API_KEY = os.getenv('POLYGON_API_KEY', '')

def fetch_polygon_data(ticker, days=60):
    """Fetch OHLCV data from Polygon.io"""
    print(f"[INFO] Fetching {days} days of data for {ticker} from Polygon...")
    
    if not POLYGON_API_KEY:
        print("[ERROR] POLYGON_API_KEY not found")
        return None
    
    # Calculate date range
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    
    # Polygon aggregates endpoint
    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{start_date}/{end_date}"
    
    params = {
        'adjusted': 'true',
        'sort': 'asc',
        'apikey': POLYGON_API_KEY
    }
    
    try:
        print(f"[INFO] Calling Polygon API: {url}")
        response = requests.get(url, params=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check for data - status can be 'OK' or 'DELAYED' (free tier)
            if 'results' in data and len(data['results']) > 0:
                results = data['results']
                status = data.get('status', 'UNKNOWN')
                print(f"[SUCCESS] Retrieved {len(results)} data points (Status: {status})")
                
                # Convert to DataFrame
                df = pd.DataFrame(results)
                df['date'] = pd.to_datetime(df['t'], unit='ms')
                df = df.rename(columns={
                    'o': 'open',
                    'h': 'high', 
                    'l': 'low',
                    'c': 'close',
                    'v': 'volume'
                })
                
                return df[['date', 'open', 'high', 'low', 'close', 'volume']]
            else:
                print(f"[ERROR] Polygon API returned: {data}")
                return None
        else:
            print(f"[ERROR] Polygon API error: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"[ERROR] Failed to fetch Polygon data: {e}")
        return None

def calculate_technical_indicators(df):
    """Calculate basic technical indicators"""
    print("[INFO] Calculating technical indicators...")
    
    # Simple moving averages
    df['sma_20'] = df['close'].rolling(window=20).mean()
    df['sma_50'] = df['close'].rolling(window=50).mean()
    
    # RSI
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['rsi'] = 100 - (100 / (1 + rs))
    
    # Volume moving average
    df['volume_ma'] = df['volume'].rolling(window=20).mean()
    
    return df

def generate_professional_chart(df, ticker):
    """Generate a professional-looking financial chart"""
    print(f"[INFO] Generating chart for {ticker}...")
    
    # Create figure with subplots
    fig = plt.figure(figsize=(14, 10))
    
    # Main price chart
    ax1 = plt.subplot(3, 1, 1)
    
    # Candlestick-style chart
    for i, row in df.iterrows():
        date = row['date']
        open_price = row['open']
        high_price = row['high']
        low_price = row['low'] 
        close_price = row['close']
        
        # Color based on up/down day
        color = 'green' if close_price >= open_price else 'red'
        
        # Draw high-low line
        ax1.plot([date, date], [low_price, high_price], color='black', linewidth=0.8)
        
        # Draw open-close rectangle
        body_height = abs(close_price - open_price)
        body_bottom = min(open_price, close_price)
        
        rect = Rectangle((mdates.date2num(date) - 0.3, body_bottom), 
                        0.6, body_height, 
                        facecolor=color, alpha=0.8, edgecolor='black', linewidth=0.5)
        ax1.add_patch(rect)
    
    # Add moving averages
    ax1.plot(df['date'], df['sma_20'], label='SMA 20', color='blue', alpha=0.7)
    ax1.plot(df['date'], df['sma_50'], label='SMA 50', color='orange', alpha=0.7)
    
    ax1.set_title(f'{ticker} - Price Chart with Moving Averages', fontsize=16, fontweight='bold')
    ax1.set_ylabel('Price ($)', fontsize=12)
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # RSI subplot
    ax2 = plt.subplot(3, 1, 2)
    ax2.plot(df['date'], df['rsi'], color='purple', linewidth=2)
    ax2.axhline(y=70, color='red', linestyle='--', alpha=0.7, label='Overbought (70)')
    ax2.axhline(y=30, color='green', linestyle='--', alpha=0.7, label='Oversold (30)')
    ax2.fill_between(df['date'], 30, 70, alpha=0.1, color='gray')
    ax2.set_title('RSI (14)', fontsize=14)
    ax2.set_ylabel('RSI', fontsize=12)
    ax2.set_ylim(0, 100)
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # Volume subplot  
    ax3 = plt.subplot(3, 1, 3)
    ax3.bar(df['date'], df['volume'], alpha=0.6, color='steelblue')
    ax3.plot(df['date'], df['volume_ma'], color='red', linewidth=2, label='Volume MA (20)')
    ax3.set_title('Volume', fontsize=14)
    ax3.set_ylabel('Volume', fontsize=12)
    ax3.set_xlabel('Date', fontsize=12)
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    # Format x-axis
    for ax in [ax1, ax2, ax3]:
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d'))
        ax.xaxis.set_major_locator(mdates.WeekdayLocator(interval=2))
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45)
    
    plt.tight_layout()
    
    # Save to bytes buffer
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
    plt.close()
    
    chart_data = buffer.getvalue()
    print(f"[SUCCESS] Chart generated ({len(chart_data)} bytes)")
    
    return chart_data

def create_analysis_summary(df):
    """Create a text summary of the data for Claude"""
    latest = df.iloc[-1]
    prev_week = df.iloc[-6] if len(df) >= 6 else df.iloc[0]
    
    # Calculate key metrics
    current_price = latest['close']
    weekly_change = ((current_price - prev_week['close']) / prev_week['close']) * 100
    current_rsi = latest['rsi'] if not pd.isna(latest['rsi']) else 0
    
    # Price vs moving averages
    sma20_signal = "above" if current_price > latest['sma_20'] else "below"
    sma50_signal = "above" if current_price > latest['sma_50'] else "below"
    
    # Volume analysis
    volume_ratio = latest['volume'] / latest['volume_ma'] if not pd.isna(latest['volume_ma']) else 1
    
    summary = f"""
Data Summary for {TICKER}:
- Current Price: ${current_price:.2f}
- Weekly Change: {weekly_change:+.1f}%
- RSI (14): {current_rsi:.1f}
- Price vs SMA 20: {sma20_signal}
- Price vs SMA 50: {sma50_signal}
- Volume vs 20-day avg: {volume_ratio:.1f}x
- Data points: {len(df)} days
"""
    
    return summary

def analyze_with_claude(chart_data, data_summary, ticker):
    """Send chart and data to Claude for analysis"""
    print(f"[INFO] Analyzing {ticker} with Claude...")
    
    if not CLAUDE_API_KEY:
        print("[ERROR] CLAUDE_API_KEY not found")
        return None
    
    # Convert chart to base64
    chart_base64 = base64.b64encode(chart_data).decode('utf-8')
    
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
    }
    
    prompt = f"""Analyze this professional financial chart for {ticker} along with the accompanying data summary.

{data_summary}

Please provide a comprehensive analysis including:
1. **Short-term outlook** (1-2 weeks)
2. **Technical pattern analysis** (trends, support/resistance)
3. **RSI interpretation** (overbought/oversold conditions)
4. **Volume analysis** (strength of moves)
5. **Risk assessment** (what to watch for)
6. **Key price levels** to monitor

Focus on actionable insights for trading decisions. Be specific about price levels and timeframes."""
    
    payload = {
        'model': 'claude-3-5-sonnet-20241022',
        'max_tokens': 1200,
        'messages': [{
            'role': 'user',
            'content': [
                {
                    'type': 'text',
                    'text': prompt
                },
                {
                    'type': 'image',
                    'source': {
                        'type': 'base64',
                        'media_type': 'image/png',
                        'data': chart_base64
                    }
                }
            ]
        }]
    }
    
    try:
        response = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers=headers,
            json=payload,
            timeout=45
        )
        
        if response.status_code == 200:
            result = response.json()
            analysis = result['content'][0]['text']
            print(f"[SUCCESS] Analysis completed ({len(analysis)} characters)")
            return analysis
        else:
            print(f"[ERROR] Claude API error: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"[ERROR] Claude API request failed: {e}")
        return None

def main():
    """Main test function"""
    print(f"[START] Testing Polygon + Claude integration for {TICKER}")
    print(f"[START] Started at: {datetime.now()}")
    
    # Check API keys
    if not CLAUDE_API_KEY:
        print("[ERROR] CLAUDE_API_KEY not found in .env file")
        return
    if not POLYGON_API_KEY:
        print("[ERROR] POLYGON_API_KEY not found in .env file") 
        print("[INFO] Please add POLYGON_API_KEY=your_key_here to .env file")
        return
    
    print(f"[INFO] Claude API Key: {CLAUDE_API_KEY[:20]}...")
    print(f"[INFO] Polygon API Key: {POLYGON_API_KEY[:20]}...")
    
    # Step 1: Fetch data from Polygon
    df = fetch_polygon_data(TICKER, days=60)
    if df is None:
        print("[ERROR] Failed to fetch data from Polygon")
        return
    
    # Step 2: Calculate technical indicators
    df = calculate_technical_indicators(df)
    
    # Step 3: Generate professional chart
    chart_data = generate_professional_chart(df, TICKER)
    
    # Save chart for inspection
    chart_file = f"polygon_chart_{TICKER}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    with open(chart_file, 'wb') as f:
        f.write(chart_data)
    print(f"[INFO] Chart saved as: {chart_file}")
    
    # Step 4: Create data summary
    data_summary = create_analysis_summary(df)
    print(f"[INFO] Data summary:\n{data_summary}")
    
    # Step 5: Analyze with Claude
    analysis = analyze_with_claude(chart_data, data_summary, TICKER)
    if not analysis:
        print("[ERROR] Failed to get Claude analysis")
        return
    
    # Step 6: Display and save results
    print(f"\n[ANALYSIS] POLYGON + CLAUDE ANALYSIS FOR {TICKER}:")
    print("=" * 70)
    print(analysis)
    print("=" * 70)
    
    # Save complete results
    results = {
        'ticker': TICKER,
        'timestamp': datetime.now().isoformat(),
        'data_points': len(df),
        'data_summary': data_summary,
        'analysis': analysis,
        'chart_file': chart_file
    }
    
    results_file = f"polygon_analysis_{TICKER}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n[SUCCESS] Test completed!")
    print(f"[INFO] Chart saved: {chart_file}")
    print(f"[INFO] Results saved: {results_file}")
    print(f"[END] Finished at: {datetime.now()}")

if __name__ == "__main__":
    # Check dependencies
    try:
        import matplotlib.pyplot as plt
        import pandas as pd
        import numpy as np
        import requests
        print("[INFO] All dependencies found")
    except ImportError as e:
        print(f"[ERROR] Missing dependency: {e}")
        print("Install with: pip install matplotlib pandas numpy requests")
        exit(1)
    
    main()