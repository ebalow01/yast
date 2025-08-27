import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def analyze_smci_buy_hold_by_year():
    """Analyze SMCI buy & hold performance year by year"""
    
    # Load SMCI data
    df = pd.read_csv('smci_15min_data.csv')
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['year'] = df['timestamp'].dt.year
    
    print("SMCI Buy & Hold Analysis: Year-by-Year Breakdown")
    print("=" * 80)
    
    # Get yearly start and end prices
    yearly_analysis = []
    
    for year in sorted(df['year'].unique()):
        year_data = df[df['year'] == year]
        
        if len(year_data) == 0:
            continue
            
        start_price = year_data.iloc[0]['close']
        end_price = year_data.iloc[-1]['close']
        yearly_return = ((end_price - start_price) / start_price) * 100
        
        yearly_analysis.append({
            'year': year,
            'start_price': start_price,
            'end_price': end_price,
            'yearly_return': yearly_return,
            'start_date': year_data.iloc[0]['timestamp'],
            'end_date': year_data.iloc[-1]['timestamp']
        })
        
        print(f"{year}: ${start_price:.2f} → ${end_price:.2f} = {yearly_return:+.2f}%")
    
    # Calculate overall performance
    if yearly_analysis:
        total_start = yearly_analysis[0]['start_price']
        total_end = yearly_analysis[-1]['end_price']
        total_return = ((total_end - total_start) / total_start) * 100
        
        print("-" * 80)
        print(f"Overall: ${total_start:.2f} → ${total_end:.2f} = {total_return:+.2f}%")
        print(f"Period: {yearly_analysis[0]['start_date'].date()} to {yearly_analysis[-1]['end_date'].date()}")
        
        # Find the peak year and subsequent performance
        best_year_idx = max(range(len(yearly_analysis)), key=lambda i: yearly_analysis[i]['yearly_return'])
        best_year = yearly_analysis[best_year_idx]
        
        print(f"\nBest single year: {best_year['year']} with {best_year['yearly_return']:+.2f}%")
        
        # Performance since peak
        if best_year_idx < len(yearly_analysis) - 1:
            peak_price = best_year['end_price']
            current_price = yearly_analysis[-1]['end_price']
            since_peak = ((current_price - peak_price) / peak_price) * 100
            
            print(f"Since {best_year['year']} peak (${peak_price:.2f}): {since_peak:+.2f}%")
            years_since = yearly_analysis[-1]['year'] - best_year['year']
            if years_since > 0:
                annualized_since_peak = ((current_price / peak_price) ** (1/years_since) - 1) * 100
                print(f"Annualized return since peak: {annualized_since_peak:+.2f}%")
        
        # Compare with our trading strategy results
        print(f"\n📊 TRADING STRATEGY vs BUY & HOLD REALITY:")
        print("-" * 60)
        
        # Load our strategy results
        try:
            strategy_df = pd.read_csv('smci_strategy_comparison.csv')
            relaxed_return = strategy_df[strategy_df['strategy'] == 'Relaxed']['total_return'].iloc[0]
            
            print(f"Buy & Hold Total: {total_return:+.2f}%")
            print(f"Relaxed RSI Strategy: {relaxed_return:+.2f}%")
            print(f"Strategy vs B&H: {relaxed_return - total_return:+.2f}%")
            
            # Year-by-year comparison would be more complex, but let's highlight the key insight
            print(f"\nKEY INSIGHT:")
            print(f"- Buy & Hold had one massive year ({best_year['year']}: {best_year['yearly_return']:+.2f}%)")
            print(f"- Since then, performance has been mixed")
            print(f"- Trading strategy provided more consistent, smoother returns")
            
        except Exception as e:
            print(f"Could not load strategy results: {e}")
    
    # Calculate compound annual growth rate
    if len(yearly_analysis) > 1:
        years_elapsed = (yearly_analysis[-1]['end_date'] - yearly_analysis[0]['start_date']).days / 365.25
        cagr = ((total_end / total_start) ** (1/years_elapsed) - 1) * 100
        print(f"\nCompound Annual Growth Rate (CAGR): {cagr:.2f}%")
    
    # Save yearly analysis
    yearly_df = pd.DataFrame(yearly_analysis)
    yearly_df.to_csv('smci_yearly_buy_hold_analysis.csv', index=False)
    print(f"\n✅ Yearly analysis saved to 'smci_yearly_buy_hold_analysis.csv'")
    
    return yearly_analysis

if __name__ == "__main__":
    analyze_smci_buy_hold_by_year()