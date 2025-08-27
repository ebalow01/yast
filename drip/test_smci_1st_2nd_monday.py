import requests
import pandas as pd
import numpy as np
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

def test_smci_1st_2nd_monday():
    """Test SMCI specifically on 1st→2nd Monday strategy with train/test split"""
    
    print("🔍 SMCI 1ST→2ND MONDAY STRATEGY ANALYSIS")
    print("=" * 80)
    print("📚 TRAINING PERIOD: January - May 2025")
    print("🧪 TESTING PERIOD: June - August 2025")
    print("🎯 STRATEGY: 1st Monday → 2nd Monday")
    print("📊 CURRENT PIPELINE: SMCI achieved +42.52% in May 2025")
    print("=" * 80)
    
    # Download SMCI data
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found")
        return
    
    # Full 2025 date range
    start_date = datetime(2025, 1, 1)
    end_date = datetime.now()
    
    from_date = start_date.strftime('%Y-%m-%d')
    to_date = end_date.strftime('%Y-%m-%d')
    
    # Download SMCI data
    url = f"https://api.polygon.io/v2/aggs/ticker/SMCI/range/1/day/{from_date}/{to_date}"
    params = {
        'adjusted': 'true',
        'sort': 'asc',
        'limit': 5000,
        'apikey': api_key
    }
    
    try:
        print("📥 Downloading SMCI 2025 data...")
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        if 'results' not in data:
            print(f"❌ Error: {data}")
            return
        
        results = data['results']
        print(f"✅ Downloaded {len(results)} days of SMCI data")
        
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
        
        # Test both periods
        print(f"\n📚 TRAINING PERIOD ANALYSIS (Jan-May 2025):")
        print("-" * 60)
        
        training_trades = []
        training_months = [1, 2, 3, 4, 5]
        
        for month in training_months:
            # Get 1st Monday (buy) and 2nd Monday (sell)
            buy_monday = get_nth_monday_of_month(2025, month, 1)
            sell_monday = get_nth_monday_of_month(2025, month, 2)
            
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
                    
                    trade = {
                        'month': calendar.month_name[month],
                        'buy_date': buy_row['date'].date(),
                        'sell_date': sell_row['date'].date(),
                        'buy_price': buy_price,
                        'sell_price': sell_price,
                        'buy_rsi': buy_rsi,
                        'return_pct': return_pct
                    }
                    
                    training_trades.append(trade)
                    
                    rsi_str = f"{buy_rsi:.1f}" if pd.notna(buy_rsi) else "N/A"
                    print(f"{calendar.month_name[month]:<10}: {buy_date} → {sell_date} | "
                          f"${buy_price:.2f} → ${sell_price:.2f} | RSI: {rsi_str:<5} | {return_pct:+7.2f}%")
        
        if training_trades:
            training_df = pd.DataFrame(training_trades)
            training_total = ((training_df['return_pct'] / 100 + 1).prod() - 1) * 100
            training_avg = training_df['return_pct'].mean()
            training_wins = (training_df['return_pct'] > 0).sum()
            training_win_rate = (training_wins / len(training_df)) * 100
            
            print(f"\n🏆 TRAINING RESULTS:")
            print(f"   Total Return: {training_total:+.2f}%")
            print(f"   Average Trade: {training_avg:+.2f}%")
            print(f"   Win Rate: {training_win_rate:.0f}% ({training_wins}/{len(training_df)})")
        
        print(f"\n🧪 TESTING PERIOD ANALYSIS (June-Aug 2025):")
        print("-" * 60)
        
        testing_trades = []
        testing_months = [6, 7, 8]
        
        for month in testing_months:
            # Get 1st Monday (buy) and 2nd Monday (sell)
            buy_monday = get_nth_monday_of_month(2025, month, 1)
            sell_monday = get_nth_monday_of_month(2025, month, 2)
            
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
                    
                    trade = {
                        'month': calendar.month_name[month],
                        'buy_date': buy_row['date'].date(),
                        'sell_date': sell_row['date'].date(),
                        'buy_price': buy_price,
                        'sell_price': sell_price,
                        'buy_rsi': buy_rsi,
                        'return_pct': return_pct
                    }
                    
                    testing_trades.append(trade)
                    
                    rsi_str = f"{buy_rsi:.1f}" if pd.notna(buy_rsi) else "N/A"
                    print(f"{calendar.month_name[month]:<10}: {buy_date} → {sell_date} | "
                          f"${buy_price:.2f} → ${sell_price:.2f} | RSI: {rsi_str:<5} | {return_pct:+7.2f}%")
        
        if testing_trades:
            testing_df = pd.DataFrame(testing_trades)
            testing_total = ((testing_df['return_pct'] / 100 + 1).prod() - 1) * 100
            testing_avg = testing_df['return_pct'].mean()
            testing_wins = (testing_df['return_pct'] > 0).sum()
            testing_win_rate = (testing_wins / len(testing_df)) * 100
            
            print(f"\n🧪 TESTING RESULTS:")
            print(f"   Total Return: {testing_total:+.2f}%")
            print(f"   Average Trade: {testing_avg:+.2f}%")
            print(f"   Win Rate: {testing_win_rate:.0f}% ({testing_wins}/{len(testing_df)})")
        
        # Compare to top alternative (IVVD)
        print(f"\n📊 COMPARISON TO TOP ALTERNATIVE:")
        print("=" * 60)
        print(f"SMCI (Current):")
        print(f"   Training: {training_total:+7.1f}% | Testing: {testing_total:+7.1f}%")
        print()
        print(f"IVVD (Top Alternative):")
        print(f"   Training:   +68.7% | Testing:   +13.7%")
        
        # Decision analysis
        print(f"\n🤔 REPLACEMENT DECISION:")
        print("-" * 40)
        
        if testing_total > 13.7:  # IVVD's test performance
            print(f"✅ KEEP SMCI: {testing_total:.1f}% > 13.7% (IVVD)")
            print(f"   SMCI outperforms in testing period")
        else:
            print(f"❌ CONSIDER IVVD: {testing_total:.1f}% < 13.7% (IVVD)")
            print(f"   IVVD outperforms SMCI in testing period")
        
        # Save results
        if training_trades and testing_trades:
            all_trades = training_trades + testing_trades
            for trade in training_trades:
                trade['period'] = 'Training'
            for trade in testing_trades:
                trade['period'] = 'Testing'
            
            all_trades_df = pd.DataFrame(all_trades)
            all_trades_df.to_csv('smci_1st_2nd_monday_analysis.csv', index=False)
            print(f"\n✅ Results saved to 'smci_1st_2nd_monday_analysis.csv'")
        
        return {
            'training_return': training_total,
            'testing_return': testing_total,
            'training_trades': len(training_trades),
            'testing_trades': len(testing_trades)
        }
        
    except Exception as e:
        print(f"❌ Error analyzing SMCI: {e}")
        return None

if __name__ == "__main__":
    test_smci_1st_2nd_monday()