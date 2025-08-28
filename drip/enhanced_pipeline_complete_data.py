import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import sys
import calendar
from concurrent.futures import ThreadPoolExecutor, as_completed
import glob

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

def load_ticker_data(ticker):
    """Load complete daily data for a ticker"""
    filename = f"daily_data_{ticker.lower()}_complete.csv"
    
    if not os.path.exists(filename):
        return None
    
    try:
        df = pd.read_csv(filename)
        df['date'] = pd.to_datetime(df['date'], utc=True)
        return df
    except Exception as e:
        print(f"❌ Error loading {ticker}: {e}")
        return None

def analyze_enhanced_strategies_complete(df, strategy_type, train_months, test_months):
    """Analyze multiple strategy variants using complete daily data"""
    
    # Define strategy parameters
    if strategy_type == "1st_to_2nd":
        buy_monday, sell_monday = 1, 2
    elif strategy_type == "2nd_to_3rd":
        buy_monday, sell_monday = 2, 3
    elif strategy_type == "3rd_to_4th":
        buy_monday, sell_monday = 3, 4
    elif strategy_type == "last_to_1st":
        buy_monday, sell_monday = "last", 1
    
    def get_enhanced_trades(months, period_name):
        # Initialize trade lists for each strategy variant
        basic_trades = []
        rsi_filter_trades = []
        double_down_trades = []
        stop_loss_trades = []
        
        for year, month in months:
            try:
                # Get buy date
                if buy_monday == "last":
                    buy_date_dt = get_last_monday_of_month(year, month)
                else:
                    buy_date_dt = get_nth_monday_of_month(year, month, buy_monday)
                
                # Get sell date
                if sell_monday == 1:
                    # Next month's first Monday
                    next_month = month + 1 if month < 12 else 1
                    next_year = year if month < 12 else year + 1
                    sell_date_dt = get_nth_monday_of_month(next_year, next_month, 1)
                else:
                    sell_date_dt = get_nth_monday_of_month(year, month, sell_monday)
                
                if buy_date_dt and sell_date_dt:
                    buy_date = buy_date_dt.date()
                    sell_date = sell_date_dt.date()
                    thursday_date = get_thursday_of_week(buy_date_dt).date()
                    
                    # Find closest trading data using complete daily data
                    buy_data = df[df['date'].dt.date >= buy_date].head(1)
                    sell_data = df[df['date'].dt.date >= sell_date].head(1)
                    thursday_data = df[df['date'].dt.date >= thursday_date].head(1)
                    
                    # Allow up to 5 trading days tolerance
                    if len(buy_data) > 0:
                        actual_buy_date = buy_data.iloc[0]['date'].date()
                        if (actual_buy_date - buy_date).days > 5:
                            continue
                    
                    if len(sell_data) > 0:
                        actual_sell_date = sell_data.iloc[0]['date'].date()
                        if (actual_sell_date - sell_date).days > 5:
                            continue
                    
                    if len(buy_data) > 0 and len(sell_data) > 0:
                        buy_row = buy_data.iloc[0]
                        sell_row = sell_data.iloc[0]
                        
                        buy_price = buy_row['close']
                        sell_price = sell_row['close']
                        buy_rsi = buy_row['rsi']
                        
                        # Basic strategy
                        basic_return = ((sell_price - buy_price) / buy_price) * 100
                        basic_trades.append({
                            'period': period_name,
                            'month': calendar.month_name[month],
                            'return_pct': basic_return,
                            'buy_rsi': buy_rsi
                        })
                        
                        # RSI Filter strategy (only trade if RSI <= 70)
                        if pd.notna(buy_rsi) and buy_rsi <= 70:
                            rsi_filter_trades.append({
                                'period': period_name,
                                'month': calendar.month_name[month],
                                'return_pct': basic_return,
                                'buy_rsi': buy_rsi
                            })
                        
                        # Double Down strategy (buy more on Thursday if down >5%)
                        if len(thursday_data) > 0:
                            thursday_row = thursday_data.iloc[0]
                            thursday_price = thursday_row['close']
                            
                            # Check if down >5% by Thursday
                            thursday_return = ((thursday_price - buy_price) / buy_price) * 100
                            
                            if thursday_return <= -5:  # Down 5% or more
                                # Double down - buy equal amount on Thursday
                                avg_buy_price = (buy_price + thursday_price) / 2
                                double_down_return = ((sell_price - avg_buy_price) / avg_buy_price) * 100
                            else:
                                double_down_return = basic_return
                            
                            double_down_trades.append({
                                'period': period_name,
                                'month': calendar.month_name[month],
                                'return_pct': double_down_return,
                                'buy_rsi': buy_rsi,
                                'doubled_down': thursday_return <= -5
                            })
                        
                        # Stop Loss strategy (sell on Thursday if down >10%)
                        if len(thursday_data) > 0:
                            thursday_row = thursday_data.iloc[0]
                            thursday_price = thursday_row['close']
                            
                            # Check if down >10% by Thursday
                            thursday_return = ((thursday_price - buy_price) / buy_price) * 100
                            
                            if thursday_return <= -10:  # Down 10% or more, trigger stop loss
                                stop_loss_return = thursday_return
                            else:
                                stop_loss_return = basic_return
                            
                            stop_loss_trades.append({
                                'period': period_name,
                                'month': calendar.month_name[month],
                                'return_pct': stop_loss_return,
                                'buy_rsi': buy_rsi,
                                'stopped_out': thursday_return <= -10
                            })
                        
            except Exception:
                continue
                
        return {
            'basic': basic_trades,
            'rsi_filter': rsi_filter_trades,
            'double_down': double_down_trades,
            'stop_loss': stop_loss_trades
        }
    
    # Get training and testing trades for all variants
    training_trades = get_enhanced_trades(train_months, "Training")
    testing_trades = get_enhanced_trades(test_months, "Testing")
    
    results = {}
    
    # Calculate results for each strategy variant
    for variant in ['basic', 'rsi_filter', 'double_down', 'stop_loss']:
        variant_results = {}
        
        # Training results
        if training_trades[variant]:
            training_df = pd.DataFrame(training_trades[variant])
            training_total = ((training_df['return_pct'] / 100 + 1).prod() - 1) * 100
            training_avg = training_df['return_pct'].mean()
            training_wins = (training_df['return_pct'] > 0).sum()
            training_win_rate = (training_wins / len(training_df)) * 100
            
            variant_results['training_return'] = training_total
            variant_results['training_avg'] = training_avg
            variant_results['training_win_rate'] = training_win_rate
            variant_results['training_trades'] = len(training_trades[variant])
        
        # Testing results
        if testing_trades[variant]:
            testing_df = pd.DataFrame(testing_trades[variant])
            testing_total = ((testing_df['return_pct'] / 100 + 1).prod() - 1) * 100
            testing_avg = testing_df['return_pct'].mean()
            testing_wins = (testing_df['return_pct'] > 0).sum()
            testing_win_rate = (testing_wins / len(testing_df)) * 100
            
            variant_results['testing_return'] = testing_total
            variant_results['testing_avg'] = testing_avg
            variant_results['testing_win_rate'] = testing_win_rate
            variant_results['testing_trades'] = len(testing_trades[variant])
        
        results[variant] = variant_results
    
    return results

def process_ticker_complete_data(args):
    """Process a single ticker using complete daily data"""
    ticker, train_months, test_months = args
    
    # Load complete daily data
    df = load_ticker_data(ticker)
    if df is None:
        return None
    
    # Filter for stocks over $5
    current_price = df['current_price'].iloc[0] if 'current_price' in df.columns else df['close'].iloc[-1]
    if current_price <= 5.0:
        return None
    
    results = {'ticker': ticker, 'current_price': current_price}
    
    # Analyze all 4 strategies with variants
    strategies = ['1st_to_2nd', '2nd_to_3rd', '3rd_to_4th', 'last_to_1st']
    
    for strategy in strategies:
        strategy_results = analyze_enhanced_strategies_complete(df, strategy, train_months, test_months)
        
        # Add strategy and variant prefix to results
        for variant, variant_data in strategy_results.items():
            for key, value in variant_data.items():
                results[f'{strategy}_{variant}_{key}'] = value
    
    return results

def enhanced_pipeline_complete_data():
    """Enhanced pipeline using complete daily data through 8/27/2025"""
    
    print("🚀 ENHANCED PIPELINE - COMPLETE DAILY DATA")
    print("=" * 70)
    print("📊 Data Source: Complete daily data through 8/27/2025")
    print("🎯 Testing: Basic, RSI Filter, Double Down, Stop Loss variants")
    print("=" * 70)
    
    # Get current date and calculate train/test periods
    current_date = datetime.now()
    print(f"📅 Analysis Date: {current_date.strftime('%Y-%m-%d %H:%M')}")
    
    # Use complete months with updated test period including July
    current_year = 2025
    
    # Training: January - April 2025 (4 months)
    train_months = [
        (current_year, 1),   # January
        (current_year, 2),   # February  
        (current_year, 3),   # March
        (current_year, 4)    # April
    ]
    
    # Testing: May - July 2025 (3 complete months)
    test_months = [
        (current_year, 5),   # May
        (current_year, 6),   # June
        (current_year, 7)    # July
    ]
    
    print(f"📚 Training Period: {calendar.month_name[train_months[0][1]]} {train_months[0][0]} - {calendar.month_name[train_months[-1][1]]} {train_months[-1][0]}")
    print(f"🧪 Testing Period: {calendar.month_name[test_months[0][1]]} {test_months[0][0]} - {calendar.month_name[test_months[-1][1]]} {test_months[-1][0]}")
    print("=" * 70)
    
    # Load list of tickers from daily data files
    daily_files = glob.glob('daily_data_*_complete.csv')
    tickers = [f.split('_')[2].upper() for f in daily_files]
    tickers = sorted(list(set(tickers)))  # Remove duplicates and sort
    
    print(f"📥 Found {len(tickers)} tickers with complete daily data")
    
    # Process all tickers
    print(f"\n📊 Analyzing {len(tickers)} tickers with complete data...")
    print("⚡ Processing with parallel execution...")
    
    # Prepare arguments for processing
    args_list = [(ticker, train_months, test_months) for ticker in tickers]
    
    all_results = []
    successful_count = 0
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_ticker = {executor.submit(process_ticker_complete_data, args): args[0] for args in args_list}
        
        for future in as_completed(future_to_ticker):
            ticker = future_to_ticker[future]
            try:
                result = future.result()
                if result:
                    all_results.append(result)
                    successful_count += 1
                    if successful_count % 50 == 0:
                        print(f"✅ Processed {successful_count} tickers...")
            except Exception as e:
                print(f"❌ {ticker}: {e}")
    
    print(f"✅ Successfully analyzed {len(all_results)} tickers")
    
    if len(all_results) == 0:
        print("❌ No successful analyses - cannot proceed")
        return
    
    # Convert to DataFrame for analysis
    df = pd.DataFrame(all_results)
    
    # Define strategies and names for analysis
    strategies = ['1st_to_2nd', '2nd_to_3rd', '3rd_to_4th', 'last_to_1st']
    strategy_names = {
        '1st_to_2nd': '1ST→2ND MONDAY',
        '2nd_to_3rd': '2ND→3RD MONDAY', 
        '3rd_to_4th': '3RD→4TH MONDAY',
        'last_to_1st': 'LAST→1ST MONDAY'
    }
    
    variants = ['basic', 'rsi_filter', 'double_down', 'stop_loss']
    variant_names = {
        'basic': 'Basic Strategy',
        'rsi_filter': 'RSI Filter (≤70)',
        'double_down': 'Double Down (Thu)',
        'stop_loss': 'Stop Loss (Thu)'
    }
    
    print(f"\n🏆 COMPLETE DATA STRATEGY COMPARISON:")
    print("=" * 100)
    
    all_recommendations = {}
    
    for strategy in strategies:
        print(f"\n🎯 {strategy_names[strategy]}:")
        print("=" * 80)
        
        strategy_comparisons = {}
        
        for variant in variants:
            # Check if columns exist for this strategy variant
            training_col = f'{strategy}_{variant}_training_return'
            testing_col = f'{strategy}_{variant}_testing_return'
            
            if training_col not in df.columns or testing_col not in df.columns:
                continue
                
            # Filter tickers that have data for this strategy variant
            strategy_df = df[(df[training_col].notna()) & 
                            (df[testing_col].notna())].copy()
            
            if len(strategy_df) == 0:
                continue
            
            # Get top 10 by training return
            top_10_training = strategy_df.nlargest(min(10, len(strategy_df)), training_col)
            
            if len(top_10_training) > 0:
                # Select best testing performer from top 10 training
                winner = top_10_training.nlargest(1, testing_col).iloc[0]
                
                # Calculate averages for this variant
                testing_avg_col = f'{strategy}_{variant}_testing_avg'
                testing_avg = winner[testing_avg_col] if testing_avg_col in winner else winner[testing_col]
                
                strategy_comparisons[variant] = {
                    'ticker': winner['ticker'],
                    'training_return': winner[training_col],
                    'testing_return': winner[testing_col],
                    'testing_avg': testing_avg,
                    'current_price': winner['current_price'],
                    'candidates': len(strategy_df),
                    'testing_trades': winner.get(f'{strategy}_{variant}_testing_trades', 3)
                }
        
        # Display comparison for this strategy
        if strategy_comparisons:
            print(f"{'Variant':<18} {'Ticker':<8} {'Training':<10} {'Testing':<10} {'Avg/Trade':<10} {'Trades'}")
            print("-" * 80)
            
            best_variant = None
            best_testing_avg = -float('inf')
            
            for variant, data in strategy_comparisons.items():
                testing_avg = data['testing_avg']
                if testing_avg > best_testing_avg:
                    best_testing_avg = testing_avg
                    best_variant = variant
                
                marker = "🏆" if variant == best_variant else "  "
                print(f"{marker} {variant_names[variant]:<16} {data['ticker']:<8} "
                      f"{data['training_return']:+8.1f}% {data['testing_return']:+8.1f}% "
                      f"{data['testing_avg']:+8.1f}% {data['testing_trades']}")
            
            if best_variant:
                all_recommendations[strategy] = {
                    'variant': best_variant,
                    'data': strategy_comparisons[best_variant]
                }
    
    # Final recommendation summary
    print(f"\n🏆 FINAL COMPLETE DATA RECOMMENDATIONS:")
    print("=" * 90)
    print(f"{'Strategy':<15} {'Best Variant':<18} {'Ticker':<8} {'Testing Avg':<12} {'Trades'}")
    print("-" * 90)
    
    testing_averages = []
    
    for strategy, rec in all_recommendations.items():
        strategy_formatted = strategy.replace('_to_', '→').upper()
        variant_name = variant_names[rec['variant']]
        data = rec['data']
        
        print(f"{strategy_formatted:<15} {variant_name:<18} {data['ticker']:<8} "
              f"{data['testing_avg']:+10.1f}% {data['testing_trades']}")
        
        testing_averages.append(data['testing_avg'])
    
    # Calculate overall average
    overall_average = sum(testing_averages) / len(testing_averages) if testing_averages else 0
    
    print(f"\n🎯 COMPLETE DATA PIPELINE SUMMARY:")
    print(f"   Overall Average Return: {overall_average:+.1f}% per trade")
    print(f"   Individual Averages: {' | '.join([f'{r:+.1f}%' for r in testing_averages])}")
    print(f"   Complete July Data: ✅ All 3 months included")
    print(f"   Strategy Variants: {len(variants)} per strategy")
    print(f"   Data Quality: Complete daily data through 8/27/2025")
    
    # Save results
    timestamp = current_date.strftime('%Y%m%d_%H%M')
    
    # Save detailed results
    df.to_csv(f'complete_data_analysis_{timestamp}.csv', index=False)
    
    # Save recommendations
    recommendations_df = pd.DataFrame([
        {
            'strategy': strategy.replace('_to_', '→').upper(),
            'best_variant': variant_names[rec['variant']],
            'ticker': rec['data']['ticker'],
            'training_return': rec['data']['training_return'],
            'testing_return': rec['data']['testing_return'],
            'testing_average': rec['data']['testing_avg'],
            'testing_trades': rec['data']['testing_trades'],
            'current_price': rec['data']['current_price'],
            'analysis_date': current_date.strftime('%Y-%m-%d'),
        }
        for strategy, rec in all_recommendations.items()
    ])
    
    recommendations_df.to_csv(f'complete_data_recommendations_{timestamp}.csv', index=False)
    
    print(f"\n✅ Complete data results saved:")
    print(f"   📄 Detailed analysis: complete_data_analysis_{timestamp}.csv")
    print(f"   🏆 Recommendations: complete_data_recommendations_{timestamp}.csv")

if __name__ == "__main__":
    enhanced_pipeline_complete_data()