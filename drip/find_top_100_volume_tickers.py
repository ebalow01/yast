import requests
import pandas as pd
import numpy as np
import time
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import sys

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

def get_top_volume_tickers():
    """Get top 100 highest volume stocks and ETFs"""
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found in environment variables")
        return []
    
    print("🔍 Finding Top 100 Highest Volume Tickers...")
    print("=" * 60)
    
    # Get previous trading day
    yesterday = datetime.now() - timedelta(days=1)
    # If weekend, go back to Friday
    while yesterday.weekday() > 4:  # Monday = 0, Sunday = 6
        yesterday = yesterday - timedelta(days=1)
    
    date_str = yesterday.strftime('%Y-%m-%d')
    
    print(f"📅 Using date: {date_str}")
    
    # Get grouped daily bars (all tickers for a single day)
    url = f"https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/{date_str}"
    params = {
        'adjusted': 'true',
        'apikey': api_key
    }
    
    try:
        print("📥 Fetching market data...")
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if data.get('status') != 'OK' or 'results' not in data:
            print(f"❌ Error: {data}")
            return []
        
        results = data['results']
        print(f"✅ Retrieved data for {len(results)} tickers")
        
        # Convert to DataFrame and sort by volume
        df = pd.DataFrame(results)
        df = df.rename(columns={
            'T': 'ticker',
            'o': 'open', 
            'h': 'high',
            'l': 'low',
            'c': 'close',
            'v': 'volume'
        })
        
        # Filter for reasonable tickers (no weird symbols)
        df = df[df['ticker'].str.len() <= 5]  # Max 5 characters
        df = df[~df['ticker'].str.contains(r'[^A-Z]')]  # Only letters
        df = df[df['volume'] > 1000000]  # Min 1M volume
        df = df[df['close'] > 1.0]  # Min $1 stock price
        df = df[df['close'] < 1000]  # Max $1000 stock price
        
        # Sort by volume and get top 100
        df = df.sort_values('volume', ascending=False).head(100)
        
        print(f"📊 Top 10 by volume:")
        print("-" * 50)
        for i, row in df.head(10).iterrows():
            print(f"{row['ticker']:<6} Vol: {row['volume']:>15,} Price: ${row['close']:>8.2f}")
        
        return df['ticker'].tolist()
        
    except Exception as e:
        print(f"❌ Error fetching ticker data: {e}")
        return []

def download_ticker_daily_data(ticker, days_back=90):
    """Download daily OHLC data for a single ticker"""
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        return None
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)
    
    from_date = start_date.strftime('%Y-%m-%d')
    to_date = end_date.strftime('%Y-%m-%d')
    
    # Polygon API endpoint for daily bars
    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{from_date}/{to_date}"
    params = {
        'adjusted': 'true',
        'sort': 'asc',
        'limit': 5000,
        'apikey': api_key
    }
    
    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        if data.get('status') != 'OK' or 'results' not in data:
            return None
        
        results = data['results']
        if len(results) < 30:  # Need at least 30 days for RSI
            return None
        
        # Convert to DataFrame
        df = pd.DataFrame(results)
        df['date'] = pd.to_datetime(df['t'], unit='ms', utc=True).dt.date
        df = df.rename(columns={
            'o': 'open',
            'h': 'high', 
            'l': 'low',
            'c': 'close',
            'v': 'volume'
        })
        
        # Calculate RSI
        df = df.sort_values('date').reset_index(drop=True)
        rsi_values = calculate_rsi(df['close'].values, period=14)
        df['rsi'] = rsi_values
        
        # Select final columns
        final_df = df[['date', 'open', 'high', 'low', 'close', 'volume', 'rsi']].copy()
        
        # Calculate basic stats
        recent_volume = final_df['volume'].tail(5).mean()
        price_range = (final_df['close'].max() - final_df['close'].min()) / final_df['close'].mean() * 100
        recent_rsi = final_df['rsi'].iloc[-1] if not pd.isna(final_df['rsi'].iloc[-1]) else None
        
        return {
            'ticker': ticker,
            'data': final_df,
            'days': len(final_df),
            'avg_volume': recent_volume,
            'price_volatility': price_range,
            'current_rsi': recent_rsi,
            'current_price': final_df['close'].iloc[-1]
        }
        
    except Exception as e:
        return None

def find_best_crm_replacement():
    """Find the best replacement for CRM using top volume tickers"""
    
    print("🚀 FINDING CRM REPLACEMENT FROM TOP 100 VOLUME TICKERS")
    print("=" * 80)
    
    # Get top volume tickers
    top_tickers = get_top_volume_tickers()
    
    if not top_tickers:
        print("❌ Could not retrieve top tickers")
        return
    
    print(f"\n📥 Downloading daily data for {len(top_tickers)} tickers...")
    print("=" * 60)
    
    # Download data for all tickers
    ticker_data = []
    errors = 0
    
    for i, ticker in enumerate(top_tickers, 1):
        print(f"Processing {i:3d}/100: {ticker:<6}", end=" ")
        
        data = download_ticker_daily_data(ticker)
        
        if data:
            ticker_data.append(data)
            print(f"✅ {data['days']} days, Vol: {data['avg_volume']:>10,.0f}, RSI: {data['current_rsi']:.1f if data['current_rsi'] else 'N/A'}")
        else:
            errors += 1
            print("❌ Failed")
        
        # Rate limiting
        time.sleep(12)  # 12 seconds between requests
        
        # Progress update every 20 tickers
        if i % 20 == 0:
            success_rate = ((i - errors) / i) * 100
            print(f"\n📊 Progress: {i}/100 complete ({success_rate:.0f}% success rate)")
            print("-" * 60)
    
    print(f"\n✅ Data collection complete!")
    print(f"📊 Successfully downloaded: {len(ticker_data)} tickers")
    print(f"❌ Failed downloads: {errors} tickers")
    
    if not ticker_data:
        print("❌ No data downloaded!")
        return
    
    # Analyze all tickers for CRM replacement characteristics
    print(f"\n🔍 ANALYZING TICKERS FOR CRM REPLACEMENT...")
    print("=" * 70)
    
    # Create analysis DataFrame
    analysis_data = []
    
    for data in ticker_data:
        ticker_df = data['data']
        
        # Calculate key metrics
        price_stability = 1 / (data['price_volatility'] / 100) if data['price_volatility'] > 0 else 0
        volume_score = min(data['avg_volume'] / 1000000, 100)  # Volume in millions, capped at 100
        
        # RSI distribution (how often in good ranges)
        rsi_data = ticker_df['rsi'].dropna()
        good_rsi_ratio = 0
        if len(rsi_data) > 0:
            good_rsi_count = len(rsi_data[(rsi_data >= 30) & (rsi_data <= 70)])
            good_rsi_ratio = good_rsi_count / len(rsi_data)
        
        # Price momentum (last 30 days vs previous 30 days)
        if len(ticker_df) >= 60:
            recent_avg = ticker_df['close'].tail(30).mean()
            previous_avg = ticker_df['close'].iloc[-60:-30].mean()
            momentum = (recent_avg / previous_avg - 1) * 100 if previous_avg > 0 else 0
        else:
            momentum = 0
        
        # Composite score for CRM replacement
        # Factors: Volume (30%), Stability (25%), RSI behavior (25%), Momentum (20%)
        composite_score = (
            volume_score * 0.30 +
            price_stability * 25 * 0.25 +
            good_rsi_ratio * 100 * 0.25 +
            abs(momentum) * 0.20  # Prefer some momentum but not too extreme
        )
        
        analysis_data.append({
            'ticker': data['ticker'],
            'current_price': data['current_price'],
            'avg_volume_m': data['avg_volume'] / 1000000,
            'price_volatility': data['price_volatility'],
            'current_rsi': data['current_rsi'],
            'good_rsi_ratio': good_rsi_ratio,
            'momentum_30d': momentum,
            'composite_score': composite_score,
            'days_data': data['days']
        })
    
    # Sort by composite score
    analysis_df = pd.DataFrame(analysis_data)
    analysis_df = analysis_df.sort_values('composite_score', ascending=False)
    
    print(f"🏆 TOP 20 CRM REPLACEMENT CANDIDATES:")
    print("-" * 100)
    print(f"{'Rank':<4} {'Ticker':<6} {'Price':<8} {'Vol(M)':<8} {'Volatility':<10} {'RSI':<6} {'Good RSI%':<9} {'Momentum':<9} {'Score'}")
    print("-" * 100)
    
    for i, row in analysis_df.head(20).iterrows():
        rsi_str = f"{row['current_rsi']:.1f}" if pd.notna(row['current_rsi']) else "N/A"
        
        print(f"{analysis_df.index.get_loc(i)+1:<4} {row['ticker']:<6} ${row['current_price']:<7.2f} "
              f"{row['avg_volume_m']:<7.1f} {row['price_volatility']:<9.1f}% {rsi_str:<6} "
              f"{row['good_rsi_ratio']*100:<8.0f}% {row['momentum_30d']:+8.1f}% {row['composite_score']:<6.1f}")
    
    # Save detailed results
    analysis_df.to_csv('top_100_ticker_analysis.csv', index=False)
    print(f"\n✅ Detailed analysis saved to 'top_100_ticker_analysis.csv'")
    
    # Get top 5 candidates and save their daily data
    top_5 = analysis_df.head(5)
    
    print(f"\n💾 SAVING DAILY DATA FOR TOP 5 CANDIDATES:")
    print("-" * 50)
    
    for i, row in top_5.iterrows():
        ticker = row['ticker']
        
        # Find the ticker data
        ticker_info = next((d for d in ticker_data if d['ticker'] == ticker), None)
        if ticker_info:
            filename = f"{ticker.lower()}_daily_data.csv"
            ticker_info['data'].to_csv(filename, index=False)
            print(f"✅ {ticker}: {filename} ({ticker_info['days']} days)")
    
    # Recommendations
    print(f"\n🎯 CRM REPLACEMENT RECOMMENDATIONS:")
    print("-" * 50)
    
    top_candidate = top_5.iloc[0]
    print(f"🥇 TOP CHOICE: {top_candidate['ticker']}")
    print(f"   Price: ${top_candidate['current_price']:.2f}")
    print(f"   Volume: {top_candidate['avg_volume_m']:.1f}M shares/day")
    print(f"   Volatility: {top_candidate['price_volatility']:.1f}%")
    print(f"   Current RSI: {top_candidate['current_rsi']:.1f}")
    print(f"   Composite Score: {top_candidate['composite_score']:.1f}")
    
    print(f"\n📈 NEXT STEPS:")
    print(f"1. Test 3rd→4th Monday strategy on top candidates")
    print(f"2. Apply RSI filtering to optimize entry points")
    print(f"3. Compare historical performance vs CRM")
    print(f"4. Select best performer for pipeline integration")
    
    return analysis_df

if __name__ == "__main__":
    find_best_crm_replacement()