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

def get_last_monday_of_month(year, month):
    """Get the last Monday of a given month"""
    mondays = []
    for n in range(1, 6):
        monday = get_nth_monday_of_month(year, month, n)
        if monday:
            mondays.append(monday)
    return mondays[-1] if mondays else None

def download_ticker_data(ticker):
    """Download 2025 data for a single ticker"""
    filename = f"data_{ticker.lower()}_2025.csv"
    
    # Check if file exists
    if os.path.exists(filename):
        try:
            df = pd.read_csv(filename)
            df['date'] = pd.to_datetime(df['date'], utc=True)
            return df
        except:
            pass
    
    # Download fresh data
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        return None
    
    start_date = datetime(2025, 1, 1)
    end_date = datetime.now()
    
    from_date = start_date.strftime('%Y-%m-%d')
    to_date = end_date.strftime('%Y-%m-%d')
    
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
        
        if 'results' not in data or len(data['results']) < 100:
            return None
        
        results = data['results']
        df = pd.DataFrame(results)
        df['date'] = pd.to_datetime(df['t'], unit='ms', utc=True).dt.tz_convert('America/New_York')
        df = df.rename(columns={
            'o': 'open', 'h': 'high', 'l': 'low', 'c': 'close', 'v': 'volume'
        })
        
        # Calculate RSI
        df = df.sort_values('date').reset_index(drop=True)
        rsi_values = calculate_rsi(df['close'].values, period=14)
        df['rsi'] = rsi_values
        
        final_df = df[['date', 'open', 'high', 'low', 'close', 'volume', 'rsi']].copy()
        
        # Save for future use
        final_df.to_csv(filename, index=False)
        return final_df
        
    except Exception as e:
        return None

def test_strategy(df, ticker, strategy_type, buy_monday_type, sell_monday_type, period_type="training"):
    """Test a specific Monday strategy"""
    if len(df) < 60:
        return None
    
    # Define periods
    if period_type == "training":
        months = [1, 2, 3, 4, 5]  # Jan-May 2025
    else:  # testing
        months = [6, 7, 8]  # June-Aug 2025
    
    trades = []
    
    for month in months:
        # Determine buy and sell dates
        if buy_monday_type == 'last':
            buy_monday = get_last_monday_of_month(2025, month)
        else:
            buy_monday = get_nth_monday_of_month(2025, month, buy_monday_type)
        
        if sell_monday_type == 'first_next':
            next_month = month + 1 if month < 12 else 1
            next_year = 2025 if month < 12 else 2026
            sell_monday = get_nth_monday_of_month(next_year, next_month, 1)
        else:
            sell_monday = get_nth_monday_of_month(2025, month, sell_monday_type)
            if buy_monday and not sell_monday:
                next_month = month + 1 if month < 12 else 1
                next_year = 2025 if month < 12 else 2026
                sell_monday = get_nth_monday_of_month(next_year, next_month, 1)
        
        if buy_monday and sell_monday and buy_monday < sell_monday:
            buy_date = buy_monday.date()
            sell_date = sell_monday.date()
            
            # Find actual trading data
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
                    'return_pct': return_pct,
                    'days_held': (sell_row['date'] - buy_row['date']).days
                })
    
    if not trades:
        return None
    
    trades_df = pd.DataFrame(trades)
    total_return = ((trades_df['return_pct'] / 100 + 1).prod() - 1) * 100
    win_rate = (trades_df['return_pct'] > 0).mean() * 100
    avg_return = trades_df['return_pct'].mean()
    
    return {
        'total_return': total_return,
        'win_rate': win_rate,
        'avg_return': avg_return,
        'num_trades': len(trades_df),
        'trades': trades_df
    }

def verify_all_filtered_winners():
    """Verify all 4 filtered winners with actual Python analysis"""
    
    print("🔍 VERIFYING ALL FILTERED WINNERS (Over $5)")
    print("=" * 100)
    print("🎯 Testing 4 filtered winners with actual 2025 data")
    print("📚 Training: Jan-May 2025 | 🧪 Testing: June-Aug 2025")
    print("💰 All winners are over $5 per share")
    print("=" * 100)
    
    # Define the filtered winners and their strategies
    winners = [
        {
            'ticker': 'QS',
            'strategy': '1st→2nd Monday',
            'buy_type': 1,
            'sell_type': 2,
            'claimed_training': -5.4,
            'claimed_testing': 73.6,
            'current_price': 8.04
        },
        {
            'ticker': 'CRML',
            'strategy': '2nd→3rd Monday',
            'buy_type': 2,
            'sell_type': 3,
            'claimed_training': -65.0,
            'claimed_testing': 242.2,
            'current_price': 6.51
        },
        {
            'ticker': 'OSCR',
            'strategy': '3rd→4th Monday',
            'buy_type': 3,
            'sell_type': 4,
            'claimed_training': 1.2,
            'claimed_testing': 47.6,
            'current_price': 17.02
        },
        {
            'ticker': 'UNIT',
            'strategy': 'Last→1st Monday',
            'buy_type': 'last',
            'sell_type': 'first_next',
            'claimed_training': -17.8,
            'claimed_testing': 39.0,
            'current_price': 6.63
        }
    ]
    
    verified_results = []
    
    for i, winner in enumerate(winners, 1):
        ticker = winner['ticker']
        strategy = winner['strategy']
        
        print(f"\n🎯 VERIFYING #{i}: {ticker} ({strategy})")
        print("=" * 80)
        print(f"📊 Current Price: ${winner['current_price']:.2f}")
        print(f"📋 Claimed Training: {winner['claimed_training']:+.1f}%")
        print(f"📋 Claimed Testing: {winner['claimed_testing']:+.1f}%")
        print(f"🔍 Downloading and analyzing actual data...")
        
        # Download data
        df = download_ticker_data(ticker)
        
        if df is None:
            print(f"❌ Could not download {ticker} data")
            continue
        
        print(f"✅ Downloaded {len(df)} days of {ticker} data")
        print(f"📅 Date range: {df['date'].min().date()} to {df['date'].max().date()}")
        print(f"💰 Price range: ${df['close'].min():.2f} to ${df['close'].max():.2f}")
        
        # Test training period
        training_result = test_strategy(
            df, ticker, strategy, 
            winner['buy_type'], winner['sell_type'], 
            "training"
        )
        
        # Test testing period
        testing_result = test_strategy(
            df, ticker, strategy,
            winner['buy_type'], winner['sell_type'],
            "testing"
        )
        
        if training_result and testing_result:
            print(f"\n📚 TRAINING RESULTS (Jan-May 2025):")
            print(f"   Total Return: {training_result['total_return']:+.1f}%")
            print(f"   Win Rate: {training_result['win_rate']:.0f}% ({(training_result['win_rate']/100*training_result['num_trades']):.0f}/{training_result['num_trades']})")
            print(f"   Avg Trade: {training_result['avg_return']:+.1f}%")
            
            # Show individual training trades
            print(f"   Individual Trades:")
            for _, trade in training_result['trades'].iterrows():
                rsi_str = f"RSI: {trade['buy_rsi']:.1f}" if pd.notna(trade['buy_rsi']) else "RSI: N/A"
                print(f"     {trade['month']}: {trade['buy_date']} → {trade['sell_date']} | "
                      f"${trade['buy_price']:.2f} → ${trade['sell_price']:.2f} | "
                      f"{rsi_str} | {trade['return_pct']:+.1f}%")
            
            print(f"\n🧪 TESTING RESULTS (June-Aug 2025):")
            print(f"   Total Return: {testing_result['total_return']:+.1f}%")
            print(f"   Win Rate: {testing_result['win_rate']:.0f}% ({(testing_result['win_rate']/100*testing_result['num_trades']):.0f}/{testing_result['num_trades']})")
            print(f"   Avg Trade: {testing_result['avg_return']:+.1f}%")
            
            # Show individual testing trades
            print(f"   Individual Trades:")
            for _, trade in testing_result['trades'].iterrows():
                rsi_str = f"RSI: {trade['buy_rsi']:.1f}" if pd.notna(trade['buy_rsi']) else "RSI: N/A"
                print(f"     {trade['month']}: {trade['buy_date']} → {trade['sell_date']} | "
                      f"${trade['buy_price']:.2f} → ${trade['sell_price']:.2f} | "
                      f"{rsi_str} | {trade['return_pct']:+.1f}%")
            
            # Compare to claims
            training_diff = training_result['total_return'] - winner['claimed_training']
            testing_diff = testing_result['total_return'] - winner['claimed_testing']
            
            print(f"\n🔍 VERIFICATION STATUS:")
            print(f"   Training: {training_result['total_return']:+.1f}% vs claimed {winner['claimed_training']:+.1f}% | Diff: {training_diff:+.1f}pp")
            print(f"   Testing: {testing_result['total_return']:+.1f}% vs claimed {winner['claimed_testing']:+.1f}% | Diff: {testing_diff:+.1f}pp")
            
            if abs(training_diff) <= 5 and abs(testing_diff) <= 5:
                status = "✅ VERIFIED"
            elif abs(training_diff) <= 15 and abs(testing_diff) <= 15:
                status = "⚠️ CLOSE MATCH"
            else:
                status = "❌ SIGNIFICANT DISCREPANCY"
            
            print(f"   Status: {status}")
            
            verified_results.append({
                'ticker': ticker,
                'strategy': strategy,
                'current_price': winner['current_price'],
                'training_actual': training_result['total_return'],
                'training_claimed': winner['claimed_training'],
                'testing_actual': testing_result['total_return'],
                'testing_claimed': winner['claimed_testing'],
                'training_diff': training_diff,
                'testing_diff': testing_diff,
                'status': status,
                'training_win_rate': training_result['win_rate'],
                'testing_win_rate': testing_result['win_rate']
            })
        else:
            print(f"❌ Could not complete analysis for {ticker}")
    
    # Summary of all verifications
    print(f"\n🏆 VERIFICATION SUMMARY:")
    print("=" * 100)
    print(f"{'Ticker':<6} {'Strategy':<15} {'Train Actual':<12} {'Test Actual':<11} {'Status':<20}")
    print("-" * 100)
    
    for result in verified_results:
        print(f"{result['ticker']:<6} {result['strategy']:<15} "
              f"{result['training_actual']:+10.1f}% {result['testing_actual']:+9.1f}% "
              f"{result['status']:<20}")
    
    # Calculate total pipeline improvement
    if len(verified_results) == 4:
        print(f"\n📊 VERIFIED PIPELINE PERFORMANCE:")
        print("-" * 60)
        
        total_testing_return = 1.0
        for result in verified_results:
            total_testing_return *= (1 + result['testing_actual'] / 100)
        
        pipeline_return = (total_testing_return - 1) * 100
        
        print(f"Combined Testing Return: {pipeline_return:+.1f}%")
        print(f"Individual contributions:")
        for result in verified_results:
            print(f"  {result['ticker']}: {result['testing_actual']:+.1f}% (${result['current_price']:.2f}/share)")
    
    # Save verification results
    if verified_results:
        verification_df = pd.DataFrame(verified_results)
        verification_df.to_csv('verified_filtered_winners.csv', index=False)
        print(f"\n✅ Verification results saved: 'verified_filtered_winners.csv'")
    
    print(f"\n🎯 FINAL ASSESSMENT:")
    print("-" * 40)
    verified_count = len([r for r in verified_results if 'VERIFIED' in r['status']])
    close_count = len([r for r in verified_results if 'CLOSE' in r['status']])
    
    print(f"✅ Verified: {verified_count}/4")
    print(f"⚠️ Close Match: {close_count}/4")
    print(f"❌ Discrepancies: {4 - verified_count - close_count}/4")
    
    if verified_count >= 3:
        print(f"🚀 Strategy validation: STRONG")
    elif verified_count + close_count >= 3:
        print(f"📈 Strategy validation: MODERATE")
    else:
        print(f"⚠️ Strategy validation: WEAK")

if __name__ == "__main__":
    verify_all_filtered_winners()