import requests
import pandas as pd
import numpy as np
import time
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import sys
import calendar

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

def get_nth_monday_of_month(year, month, n):
    """Get the nth Monday of a given month"""
    first_day = datetime(year, month, 1)
    first_monday = first_day + timedelta(days=(7 - first_day.weekday()) % 7)
    
    nth_monday = first_monday + timedelta(weeks=n-1)
    
    # Check if the nth Monday is still in the same month
    if nth_monday.month != month:
        return None
    return nth_monday

def test_3rd_4th_monday_strategy(df, ticker):
    """Test 3rd→4th Monday strategy on ticker data"""
    
    if len(df) < 60:  # Need enough data
        return None
    
    df['date'] = pd.to_datetime(df['date'])
    df['year'] = df['date'].dt.year
    df['month'] = df['date'].dt.month
    
    # Generate trades for 2025
    trades = []
    
    for month in range(1, 9):  # Jan-Aug 2025 (current available data)
        # Get 3rd Monday (buy) and 4th Monday (sell)
        buy_monday = get_nth_monday_of_month(2025, month, 3)
        sell_monday = get_nth_monday_of_month(2025, month, 4)
        
        # If no 4th Monday in current month, use first Monday of next month
        if buy_monday and not sell_monday:
            next_month = month + 1 if month < 12 else 1
            next_year = 2025 if month < 12 else 2026
            sell_monday = get_nth_monday_of_month(next_year, next_month, 1)
        
        if buy_monday and sell_monday:
            buy_date = buy_monday.date()
            sell_date = sell_monday.date()
            
            # Find actual trading data for these dates (or closest)
            buy_data = df[df['date'].dt.date >= buy_date].head(1)
            sell_data = df[df['date'].dt.date >= sell_date].head(1)
            
            if len(buy_data) > 0 and len(sell_data) > 0:
                buy_row = buy_data.iloc[0]
                sell_row = sell_data.iloc[0]
                
                buy_price = buy_row['close']
                sell_price = sell_row['close']
                buy_rsi = buy_row['rsi']
                
                return_pct = ((sell_price - buy_price) / buy_price) * 100
                
                trades.append({
                    'month': calendar.month_name[month],
                    'buy_date': buy_row['date'].date(),
                    'sell_date': sell_row['date'].date(),
                    'buy_price': buy_price,
                    'sell_price': sell_price,
                    'buy_rsi': buy_rsi,
                    'return_pct': return_pct
                })
    
    if not trades:
        return None
    
    trades_df = pd.DataFrame(trades)
    
    # Calculate strategy performance
    total_return = ((trades_df['return_pct'] / 100 + 1).prod() - 1) * 100
    win_rate = (trades_df['return_pct'] > 0).mean() * 100
    avg_return = trades_df['return_pct'].mean()
    volatility = trades_df['return_pct'].std()
    
    return {
        'ticker': ticker,
        'total_return': total_return,
        'win_rate': win_rate,
        'avg_return': avg_return,
        'volatility': volatility,
        'num_trades': len(trades_df),
        'best_month': trades_df.loc[trades_df['return_pct'].idxmax(), 'month'] if len(trades_df) > 0 else None,
        'worst_month': trades_df.loc[trades_df['return_pct'].idxmin(), 'month'] if len(trades_df) > 0 else None,
        'trades': trades_df
    }

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

def download_full_2025_data(ticker):
    """Download full 2025 daily data for a single ticker"""
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        return None
    
    # Full 2025 date range
    start_date = datetime(2025, 1, 1)
    end_date = datetime.now()
    
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
        if len(results) < 100:  # Need substantial 2025 data
            return None
        
        # Convert to DataFrame
        df = pd.DataFrame(results)
        df['date'] = pd.to_datetime(df['t'], unit='ms', utc=True).dt.tz_convert('America/New_York')
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
        
        return final_df
        
    except Exception as e:
        return None

def find_best_crm_replacement_full_2025():
    """Find the best replacement for CRM using full 2025 data and 3rd→4th Monday strategy testing"""
    
    print("🚀 FINDING CRM REPLACEMENT WITH FULL 2025 DATA & STRATEGY TESTING")
    print("=" * 90)
    
    # Get top volume tickers
    top_tickers = get_top_volume_tickers()
    
    if not top_tickers:
        print("❌ Could not retrieve top tickers")
        return
    
    print(f"\n📥 Downloading FULL 2025 data for {len(top_tickers)} tickers...")
    print("⏰ This will take ~20-25 minutes due to API rate limiting...")
    print("=" * 70)
    
    # Download data and test strategy for all tickers
    strategy_results = []
    errors = 0
    
    for i, ticker in enumerate(top_tickers, 1):
        print(f"Processing {i:3d}/100: {ticker:<6}", end=" ")
        
        # Download full 2025 data
        df = download_full_2025_data(ticker)
        
        if df is not None and len(df) >= 100:
            # Test 3rd→4th Monday strategy
            strategy_result = test_3rd_4th_monday_strategy(df, ticker)
            
            if strategy_result:
                strategy_results.append(strategy_result)
                print(f"✅ {len(df):3d} days | Return: {strategy_result['total_return']:+6.1f}% | "
                      f"Win: {strategy_result['win_rate']:4.0f}% | Trades: {strategy_result['num_trades']}")
            else:
                errors += 1
                print("❌ Strategy test failed")
        else:
            errors += 1
            print("❌ Data download failed")
        
        # Rate limiting
        time.sleep(12)  # 12 seconds between requests
        
        # Progress update every 20 tickers
        if i % 20 == 0:
            success_rate = ((i - errors) / i) * 100
            print(f"\n📊 Progress: {i}/100 complete ({success_rate:.0f}% success rate)")
            print("-" * 70)
    
    print(f"\n✅ Analysis complete!")
    print(f"📊 Successfully tested: {len(strategy_results)} tickers")
    print(f"❌ Failed: {errors} tickers")
    
    if not strategy_results:
        print("❌ No successful strategy tests!")
        return
    
    # Sort by total return
    strategy_results.sort(key=lambda x: x['total_return'], reverse=True)
    
    print(f"\n🏆 TOP 20 CRM REPLACEMENT CANDIDATES (3rd→4th Monday Strategy):")
    print("=" * 110)
    print(f"{'Rank':<4} {'Ticker':<6} {'2025 Return':<12} {'Win Rate':<9} {'Avg/Trade':<10} {'Volatility':<10} {'Trades':<7} {'Best Month':<10} {'Risk/Reward'}")
    print("-" * 110)
    
    for i, result in enumerate(strategy_results[:20], 1):
        risk_reward = result['total_return'] / result['volatility'] if result['volatility'] > 0 else 0
        
        print(f"{i:<4} {result['ticker']:<6} {result['total_return']:+10.1f}% {result['win_rate']:7.0f}% "
              f"{result['avg_return']:+8.1f}% {result['volatility']:8.1f}% {result['num_trades']:<7} "
              f"{result['best_month'][:9]:<10} {risk_reward:8.1f}")
    
    # Compare vs CRM (-0.83%)
    print(f"\n📊 PERFORMANCE vs CRM (-0.83%):")
    print("-" * 50)
    
    better_than_crm = [r for r in strategy_results if r['total_return'] > -0.83]
    print(f"Tickers outperforming CRM: {len(better_than_crm)}/{len(strategy_results)} ({len(better_than_crm)/len(strategy_results)*100:.0f}%)")
    
    if better_than_crm:
        best_performer = better_than_crm[0]
        improvement = best_performer['total_return'] - (-0.83)
        
        print(f"\n🥇 BEST REPLACEMENT: {best_performer['ticker']}")
        print(f"   2025 Return: {best_performer['total_return']:+.1f}% vs CRM -0.8%")
        print(f"   Improvement: +{improvement:.1f} percentage points")
        print(f"   Win Rate: {best_performer['win_rate']:.0f}%")
        print(f"   Volatility: {best_performer['volatility']:.1f}%")
        print(f"   Best Month: {best_performer['best_month']}")
        print(f"   Worst Month: {best_performer['worst_month']}")
    
    # Save results
    results_df = pd.DataFrame([
        {
            'ticker': r['ticker'],
            'total_return': r['total_return'],
            'win_rate': r['win_rate'],
            'avg_return': r['avg_return'],
            'volatility': r['volatility'],
            'num_trades': r['num_trades'],
            'risk_reward_ratio': r['total_return'] / r['volatility'] if r['volatility'] > 0 else 0,
            'best_month': r['best_month'],
            'worst_month': r['worst_month']
        }
        for r in strategy_results
    ])
    
    results_df.to_csv('crm_replacement_candidates_2025.csv', index=False)
    print(f"\n✅ Results saved to 'crm_replacement_candidates_2025.csv'")
    
    # Save top 5 candidates' detailed trade data
    print(f"\n💾 SAVING DETAILED TRADE DATA FOR TOP 5:")
    print("-" * 50)
    
    for i, result in enumerate(strategy_results[:5], 1):
        ticker = result['ticker']
        trades_df = result['trades']
        
        filename = f"{ticker.lower()}_3rd_4th_monday_trades_2025.csv"
        trades_df.to_csv(filename, index=False)
        print(f"{i}. {ticker}: {filename} ({len(trades_df)} trades)")
    
    return strategy_results

if __name__ == "__main__":
    find_best_crm_replacement_full_2025()