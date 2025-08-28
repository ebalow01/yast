import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import sys
import calendar

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

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

def get_thursday_of_week(monday_date):
    """Get Thursday of the same week as Monday"""
    return monday_date + timedelta(days=3)

def extract_sbet_raw_trades():
    """Extract raw SBET trade data for Last→1st Monday strategy"""
    
    print("🔍 SBET RAW TRADE DATA EXTRACTION")
    print("=" * 70)
    print("🎯 Strategy: Last Monday → First Monday of next month")
    print("📊 All Variants: Basic, RSI Filter, Double Down, Stop Loss")
    print("=" * 70)
    
    # Load SBET data
    filename = "daily_data_sbet_complete.csv"
    if not os.path.exists(filename):
        print(f"❌ {filename} not found")
        return
    
    try:
        df = pd.read_csv(filename)
        df['date'] = pd.to_datetime(df['date'], utc=True)
        print(f"✅ Loaded SBET data: {len(df)} daily records")
        print(f"   Date range: {df['date'].min().date()} to {df['date'].max().date()}")
        print(f"   Current price: ${df['close'].iloc[-1]:.2f}")
    except Exception as e:
        print(f"❌ Error loading SBET data: {e}")
        return
    
    # Define periods
    training_months = [(2025, 1), (2025, 2), (2025, 3), (2025, 4)]
    testing_months = [(2025, 5), (2025, 6), (2025, 7)]
    
    all_trade_data = []
    
    def analyze_period(months, period_name):
        print(f"\n📊 {period_name.upper()} PERIOD RAW DATA:")
        print("=" * 80)
        
        for year, month in months:
            try:
                # Get last Monday of current month
                last_monday_current = get_last_monday_of_month(year, month)
                
                # Get first Monday of next month
                next_month = month + 1 if month < 12 else 1
                next_year = year if month < 12 else year + 1
                first_monday_next = get_nth_monday_of_month(next_year, next_month, 1)
                
                if last_monday_current and first_monday_next:
                    buy_date = last_monday_current.date()
                    sell_date = first_monday_next.date()
                    thursday_date = get_thursday_of_week(last_monday_current).date()
                    
                    # Find actual trading data
                    buy_data = df[df['date'].dt.date >= buy_date].head(1)
                    sell_data = df[df['date'].dt.date >= sell_date].head(1)
                    thursday_data = df[df['date'].dt.date >= thursday_date].head(1)
                    
                    if len(buy_data) > 0 and len(sell_data) > 0:
                        buy_row = buy_data.iloc[0]
                        sell_row = sell_data.iloc[0]
                        
                        buy_price = buy_row['close']
                        sell_price = sell_row['close']
                        buy_rsi = buy_row['rsi']
                        buy_actual_date = buy_row['date'].date()
                        sell_actual_date = sell_row['date'].date()
                        
                        # Basic strategy
                        basic_return = ((sell_price - buy_price) / buy_price) * 100
                        
                        # Thursday analysis for enhanced strategies
                        thursday_price = None
                        thursday_return = None
                        doubled_down = False
                        stopped_out = False
                        double_down_return = basic_return
                        stop_loss_return = basic_return
                        
                        if len(thursday_data) > 0:
                            thursday_row = thursday_data.iloc[0]
                            thursday_price = thursday_row['close']
                            thursday_actual_date = thursday_row['date'].date()
                            
                            # Thursday performance vs Monday buy
                            thursday_return = ((thursday_price - buy_price) / buy_price) * 100
                            
                            # Double Down logic
                            if thursday_return <= -5:  # Down 5% or more
                                doubled_down = True
                                avg_buy_price = (buy_price + thursday_price) / 2
                                double_down_return = ((sell_price - avg_buy_price) / avg_buy_price) * 100
                            
                            # Stop Loss logic
                            if thursday_return <= -10:  # Down 10% or more
                                stopped_out = True
                                stop_loss_return = thursday_return
                        
                        # RSI Filter logic
                        rsi_qualified = pd.notna(buy_rsi) and buy_rsi <= 70
                        
                        trade_data = {
                            'period': period_name,
                            'month': calendar.month_name[month],
                            'target_buy_date': buy_date,
                            'actual_buy_date': buy_actual_date,
                            'target_sell_date': sell_date,
                            'actual_sell_date': sell_actual_date,
                            'thursday_date': thursday_actual_date if len(thursday_data) > 0 else None,
                            'buy_price': buy_price,
                            'thursday_price': thursday_price,
                            'sell_price': sell_price,
                            'buy_rsi': buy_rsi,
                            'basic_return': basic_return,
                            'thursday_return': thursday_return,
                            'doubled_down': doubled_down,
                            'double_down_return': double_down_return,
                            'stopped_out': stopped_out,
                            'stop_loss_return': stop_loss_return,
                            'rsi_qualified': rsi_qualified,
                            'days_held': (sell_actual_date - buy_actual_date).days
                        }
                        
                        all_trade_data.append(trade_data)
                        
                        print(f"\n🗓️  {calendar.month_name[month].upper()} {year}")
                        print("-" * 60)
                        print(f"Target Dates:     {buy_date} → {sell_date}")
                        print(f"Actual Dates:     {buy_actual_date} → {sell_actual_date}")
                        if thursday_price is not None:
                            print(f"Thursday:         {thursday_actual_date}")
                        print(f"Buy Price:        ${buy_price:.2f}")
                        if thursday_price is not None:
                            print(f"Thursday Price:   ${thursday_price:.2f} ({thursday_return:+.1f}%)")
                        print(f"Sell Price:       ${sell_price:.2f}")
                        print(f"RSI at Buy:       {buy_rsi:.1f}" if pd.notna(buy_rsi) else "RSI at Buy:       N/A")
                        print(f"Days Held:        {(sell_actual_date - buy_actual_date).days}")
                        print()
                        print("STRATEGY PERFORMANCE:")
                        print(f"  Basic:          {basic_return:+7.1f}%")
                        print(f"  RSI Filter:     {basic_return:+7.1f}% {'✅' if rsi_qualified else '❌ (RSI > 70)'}")
                        print(f"  Double Down:    {double_down_return:+7.1f}% {'📈 Triggered' if doubled_down else ''}")
                        print(f"  Stop Loss:      {stop_loss_return:+7.1f}% {'🛑 Triggered' if stopped_out else ''}")
                        
            except Exception as e:
                print(f"❌ Error processing {calendar.month_name[month]} {year}: {e}")
    
    # Analyze both periods
    analyze_period(training_months, "Training")
    analyze_period(testing_months, "Testing")
    
    # Summary statistics
    if all_trade_data:
        print(f"\n📊 SBET STRATEGY SUMMARY:")
        print("=" * 80)
        
        # Convert to DataFrame for analysis
        trades_df = pd.DataFrame(all_trade_data)
        
        # Split by period
        training_trades = trades_df[trades_df['period'] == 'Training']
        testing_trades = trades_df[trades_df['period'] == 'Testing']
        
        def calculate_summary(period_df, period_name):
            if len(period_df) == 0:
                return
                
            print(f"\n🎯 {period_name.upper()} SUMMARY:")
            print("-" * 50)
            
            # Basic strategy
            basic_returns = period_df['basic_return']
            basic_total = ((basic_returns / 100 + 1).prod() - 1) * 100
            basic_avg = basic_returns.mean()
            basic_wins = (basic_returns > 0).sum()
            
            print(f"Basic Strategy:")
            print(f"  Individual:     {' | '.join([f'{r:+.1f}%' for r in basic_returns])}")
            print(f"  Average:        {basic_avg:+.1f}%")
            print(f"  Total Return:   {basic_total:+.1f}%")
            print(f"  Win Rate:       {basic_wins}/{len(period_df)} ({basic_wins/len(period_df)*100:.0f}%)")
            
            # Double Down strategy
            dd_trades = period_df[period_df['doubled_down']]
            dd_returns = period_df['double_down_return']
            dd_total = ((dd_returns / 100 + 1).prod() - 1) * 100
            dd_avg = dd_returns.mean()
            
            print(f"\nDouble Down Strategy:")
            print(f"  Individual:     {' | '.join([f'{r:+.1f}%' for r in dd_returns])}")
            print(f"  Average:        {dd_avg:+.1f}%")
            print(f"  Total Return:   {dd_total:+.1f}%")
            print(f"  DD Triggers:    {len(dd_trades)}/{len(period_df)} ({len(dd_trades)/len(period_df)*100:.0f}%)")
            
            # RSI Filter
            rsi_qualified = period_df[period_df['rsi_qualified']]
            if len(rsi_qualified) > 0:
                rsi_returns = rsi_qualified['basic_return']
                rsi_avg = rsi_returns.mean()
                print(f"\nRSI Filter (≤70):")
                print(f"  Qualified:      {len(rsi_qualified)}/{len(period_df)} ({len(rsi_qualified)/len(period_df)*100:.0f}%)")
                print(f"  Average:        {rsi_avg:+.1f}%")
        
        calculate_summary(training_trades, "Training")
        calculate_summary(testing_trades, "Testing")
        
        # Save detailed trade data
        trades_df.to_csv('sbet_raw_trade_data.csv', index=False)
        print(f"\n✅ Raw trade data saved: sbet_raw_trade_data.csv")

if __name__ == "__main__":
    extract_sbet_raw_trades()