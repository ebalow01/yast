#!/usr/bin/env python3
"""
Expanded list of 100 established tickers for Fed rate cut strategy
Focus period: December 2018 to December 2019
"""

def get_100_established_tickers():
    """
    Returns 100 established tickers with data back to 2018
    Mix of dividend ETFs, major stocks, and sector ETFs
    """
    
    tickers_2018 = {
        'High Dividend ETFs': [
            'VYM', 'HDV', 'DVY', 'SDY', 'VIG', 'SCHD', 'NOBL', 'DGRO',
            'SPHD', 'PEY', 'FDL', 'FTCS', 'PFM', 'FDVV', 'SMDV'
        ],
        
        'Major Index ETFs': [
            'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'IVV', 'VEA', 'VWO',
            'EEM', 'EFA', 'IEFA', 'ITOT', 'IXUS', 'VXUS', 'VT'
        ],
        
        'Sector ETFs': [
            'XLF', 'XLE', 'XLK', 'XLV', 'XLI', 'XLP', 'XLU', 'XLB',
            'XLY', 'XLRE', 'VFH', 'VDE', 'VGT', 'VHT', 'VIS', 'VCR',
            'VDC', 'VPU', 'VAW', 'VOX'
        ],
        
        'REIT ETFs': [
            'VNQ', 'IYR', 'SCHH', 'FREL', 'RWR', 'USRT', 'VNQI', 'REET'
        ],
        
        'Bond/Income ETFs': [
            'TLT', 'IEF', 'SHY', 'AGG', 'BND', 'HYG', 'LQD', 'TIP',
            'VCSH', 'VCIT', 'VGIT', 'VGSH'
        ],
        
        'Covered Call/Income ETFs': [
            'QYLD', 'XYLD', 'DIVO', 'BSM', 'PBP', 'SPYD'
        ],
        
        'High Volume Dividend Stocks': [
            'AAPL', 'MSFT', 'JNJ', 'PG', 'KO', 'PEP', 'MRK', 'T', 
            'VZ', 'XOM', 'CVX', 'WMT', 'HD', 'UNH', 'V', 'JPM'
        ],
        
        'Utility Stocks': [
            'NEE', 'DUK', 'SO', 'AEP', 'EXC', 'D', 'PCG'
        ],
        
        'International ETFs': [
            'EWJ', 'EWZ', 'FXI', 'EWG', 'EWU', 'EWC', 'EWW'
        ],
        
        'Commodity/Gold ETFs': [
            'GLD', 'SLV', 'GDX', 'GDXJ', 'USO', 'UNG', 'DBA'
        ]
    }
    
    return tickers_2018

def create_100_ticker_strategy_list():
    """Create list of exactly 100 tickers for Fed rate cut strategy"""
    
    print("100 ESTABLISHED TICKERS FOR FED RATE CUT STRATEGY")
    print("=" * 60)
    print("Focus Period: December 2018 - December 2019")
    print("Rate Cut Events:")
    print("  - December 19, 2018: Fed cut rates 0.25% (2.50% to 2.25%)")
    print("  - July 31, 2019: Fed cut rates 0.25% (2.25% to 2.00%)")
    print("  - September 18, 2019: Fed cut rates 0.25% (2.00% to 1.75%)")
    print("  - October 30, 2019: Fed cut rates 0.25% (1.75% to 1.50%)")
    print()
    
    all_tickers = []
    ticker_categories = get_100_established_tickers()
    
    for category, tickers in ticker_categories.items():
        print(f"{category} ({len(tickers)}):")
        for ticker in tickers:
            print(f"  {ticker}")
            all_tickers.append(ticker)
        print()
    
    # Remove duplicates and sort
    unique_tickers = sorted(list(set(all_tickers)))
    
    # If we have more than 100, trim to exactly 100
    if len(unique_tickers) > 100:
        # Prioritize dividend-focused and major ETFs
        priority_tickers = []
        
        # Add high priority dividend ETFs first
        priority_categories = ['High Dividend ETFs', 'Major Index ETFs', 'Sector ETFs', 'REIT ETFs']
        for category in priority_categories:
            for ticker in ticker_categories.get(category, []):
                if ticker in unique_tickers and ticker not in priority_tickers:
                    priority_tickers.append(ticker)
        
        # Add remaining tickers until we reach 100
        for ticker in unique_tickers:
            if ticker not in priority_tickers and len(priority_tickers) < 100:
                priority_tickers.append(ticker)
        
        final_tickers = priority_tickers[:100]
    else:
        final_tickers = unique_tickers
    
    print("=" * 60)
    print(f"FINAL LIST: {len(final_tickers)} TICKERS")
    print("=" * 60)
    
    # Print in chunks for readability
    print("Complete ticker list:")
    for i in range(0, len(final_tickers), 10):
        chunk = final_tickers[i:i+10]
        print(", ".join(chunk))
    
    # Save to file
    with open('fed_strategy_100_tickers.txt', 'w') as f:
        f.write(','.join(final_tickers))
    
    print(f"\nList saved to 'fed_strategy_100_tickers.txt'")
    
    print(f"\n" + "=" * 60)
    print("STRATEGY ANALYSIS PLAN (Dec 2018 - Dec 2019):")
    print("=" * 60)
    print("1. Download daily data: 2018-12-01 to 2019-12-31")
    print("2. Key analysis periods:")
    print("   - Pre-cut: Dec 1-18, 2018 (before first cut)")
    print("   - Post Dec 2018 cut: Dec 19, 2018 - Jul 30, 2019")
    print("   - 2019 cutting cycle: Jul 31 - Oct 30, 2019")
    print("   - Post-cuts: Nov 1 - Dec 31, 2019")
    print("3. Metrics to analyze:")
    print("   - Price performance in each period")
    print("   - Dividend yield changes")
    print("   - Volume patterns")
    print("   - Sector rotation effects")
    print("4. Look for patterns in dividend vs growth performance")
    print("5. Test entry/exit strategies around rate cut announcements")
    
    return final_tickers

if __name__ == "__main__":
    ticker_list = create_100_ticker_strategy_list()