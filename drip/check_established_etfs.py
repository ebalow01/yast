#!/usr/bin/env python3
"""
Check established ETFs and stocks for 2018 data availability
"""
import yfinance as yf
from datetime import datetime

def check_ticker_quick(ticker):
    """Quick check for 2018 data"""
    try:
        # Suppress warnings
        import warnings
        warnings.filterwarnings('ignore')
        
        data = yf.download(ticker, start="2018-01-01", end="2018-01-31", 
                          progress=False, auto_adjust=True)
        if len(data) > 0:  # Check length instead of empty
            first_date = data.index[0]
            if hasattr(first_date, 'date'):
                first_date = first_date.date()
            # Also get current data to ensure it's still trading  
            current = yf.download(ticker, period="1d", progress=False, auto_adjust=True)
            is_active = len(current) > 0
            return True, first_date, is_active
        return False, None, False
    except Exception as e:
        print(f"    Error checking {ticker}: {e}")
        return False, None, False

# List of established ETFs and stocks that likely have 2018 data
established_tickers = {
    'Major Index ETFs': ['SPY', 'QQQ', 'IWM', 'DIA', 'VOO', 'VTI', 'IVV'],
    'Sector ETFs': ['XLF', 'XLE', 'XLK', 'XLV', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLY'],
    'International ETFs': ['EEM', 'EFA', 'VEA', 'VWO', 'FXI', 'EWZ', 'EWJ'],
    'Bond ETFs': ['TLT', 'AGG', 'BND', 'HYG', 'LQD', 'IEF', 'SHY'],
    'Commodity ETFs': ['GLD', 'SLV', 'USO', 'UNG', 'GDX', 'GDXJ'],
    'Leveraged/Inverse (established)': ['TQQQ', 'SQQQ', 'SPXL', 'SPXS', 'TNA', 'TZA', 'UVXY', 'SOXL', 'SOXS'],
    'High Volume Stocks': ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'NVDA', 'AMD', 'SPX', 
                          'BAC', 'F', 'INTC', 'T', 'PFE', 'WFC', 'XOM', 'CVX'],
    'Popular Dividend ETFs': ['VIG', 'VYM', 'DVY', 'SDY', 'SCHD', 'HDV', 'DGRO', 'VNQ', 'NOBL'],
    'Weekly/Monthly Dividend (newer)': ['JEPI', 'JEPQ', 'QYLD', 'RYLD', 'XYLD', 'DIVO'],
    'YieldMax ETFs': ['TSLY', 'NVDY', 'APLY', 'AMDY', 'MSTY', 'ULTY', 'CONY', 'OARK', 'FBY']
}

print("Checking established ETFs and stocks for 2018 data availability...")
print("="*60)

tickers_with_2018 = []
all_results = []

for category, tickers in established_tickers.items():
    print(f"\n{category}:")
    category_found = []
    
    for ticker in tickers:
        has_data, first_date, is_active = check_ticker_quick(ticker)
        
        if has_data:
            status = "[OK]" if is_active else "[OK-delisted?]"
            print(f"  {status} {ticker}: Data from {first_date}")
            tickers_with_2018.append(ticker)
            category_found.append(ticker)
        else:
            print(f"  [NO] {ticker}: No 2018 data")
        
        all_results.append({
            'ticker': ticker,
            'category': category,
            'has_2018': has_data,
            'is_active': is_active
        })
    
    if category_found:
        print(f"  --> Found {len(category_found)}/{len(tickers)} with 2018 data")

print("\n" + "="*60)
print("SUMMARY")
print("="*60)
print(f"Total checked: {len(all_results)}")
print(f"Have 2018 data: {len(tickers_with_2018)}")
print(f"Percentage: {len(tickers_with_2018)/len(all_results)*100:.1f}%")

print("\n" + "="*60)
print("ALL TICKERS WITH 2018+ DATA (sorted):")
print("="*60)

tickers_with_2018.sort()
for i in range(0, len(tickers_with_2018), 10):
    chunk = tickers_with_2018[i:i+10]
    print(', '.join(chunk))

# Save for use in strategy testing
with open('established_tickers_2018.txt', 'w') as f:
    f.write(','.join(tickers_with_2018))
print(f"\nSaved {len(tickers_with_2018)} tickers to established_tickers_2018.txt")