#!/usr/bin/env python3
"""
Expanded list of 200 established tickers for Fed rate cut strategy
Focus period: December 2018 to December 2019
"""

def get_200_established_tickers():
    """
    Returns 200 established tickers with data back to 2018
    Mix of dividend ETFs, major stocks, sector ETFs, and international funds
    """
    
    tickers_2018 = {
        'High Dividend ETFs': [
            'VYM', 'HDV', 'DVY', 'SDY', 'VIG', 'SCHD', 'NOBL', 'DGRO',
            'SPHD', 'PEY', 'FDL', 'FTCS', 'PFM', 'FDVV', 'SMDV', 'USMV',
            'QUAL', 'MTUM', 'SIZE', 'VMOT', 'SPLV', 'EFAV'
        ],
        
        'Major Index ETFs': [
            'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'IVV', 'VEA', 'VWO',
            'EEM', 'EFA', 'IEFA', 'ITOT', 'IXUS', 'VXUS', 'VT', 'DIA',
            'MDY', 'IJH', 'IJR', 'VB', 'VTV', 'VUG', 'IWF', 'IWD'
        ],
        
        'Sector ETFs': [
            'XLF', 'XLE', 'XLK', 'XLV', 'XLI', 'XLP', 'XLU', 'XLB',
            'XLY', 'XLRE', 'VFH', 'VDE', 'VGT', 'VHT', 'VIS', 'VCR',
            'VDC', 'VPU', 'VAW', 'VOX', 'KRE', 'SMH', 'IBB', 'ITB',
            'ITA', 'IGE', 'IEZ', 'IEO', 'IGF', 'IGV', 'IGN', 'IGM'
        ],
        
        'REIT ETFs': [
            'VNQ', 'IYR', 'SCHH', 'FREL', 'RWR', 'USRT', 'VNQI', 'REET',
            'REZ', 'KBWY', 'MORT', 'REM', 'XLRE'
        ],
        
        'Bond/Income ETFs': [
            'TLT', 'IEF', 'SHY', 'AGG', 'BND', 'HYG', 'LQD', 'TIP',
            'VCSH', 'VCIT', 'VGIT', 'VGSH', 'MBB', 'VMBS', 'EMB',
            'BWX', 'BNDX', 'VTEB', 'MUB', 'JNK', 'SJNK', 'FLOT'
        ],
        
        'Covered Call/Income ETFs': [
            'QYLD', 'XYLD', 'DIVO', 'BSM', 'PBP', 'SPYD', 'SRET'
        ],
        
        'Blue Chip Dividend Stocks': [
            'AAPL', 'MSFT', 'JNJ', 'PG', 'KO', 'PEP', 'MRK', 'T', 
            'VZ', 'XOM', 'CVX', 'WMT', 'HD', 'UNH', 'V', 'JPM',
            'BAC', 'WFC', 'C', 'GS', 'IBM', 'INTC', 'CSCO', 'ORCL'
        ],
        
        'Consumer Staples': [
            'KO', 'PEP', 'PG', 'WMT', 'COST', 'CL', 'KHC', 'MO',
            'PM', 'GIS', 'K', 'CPB', 'CAG', 'SJM', 'HSY', 'MDLZ'
        ],
        
        'Utility Stocks': [
            'NEE', 'DUK', 'SO', 'AEP', 'EXC', 'D', 'PCG', 'PEG',
            'SRE', 'XEL', 'ED', 'ES', 'PPL', 'FE', 'ETR', 'EIX'
        ],
        
        'Technology Stocks': [
            'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA',
            'NVDA', 'AMD', 'INTC', 'CSCO', 'ORCL', 'CRM', 'ADBE',
            'NFLX', 'PYPL', 'UBER', 'LYFT'
        ],
        
        'Financial Stocks': [
            'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'BLK', 'SCHW',
            'AXP', 'USB', 'PNC', 'TFC', 'COF', 'BK', 'STT', 'NTRS'
        ],
        
        'Healthcare Stocks': [
            'JNJ', 'PFE', 'UNH', 'MRK', 'ABBV', 'TMO', 'DHR', 'BMY',
            'LLY', 'ABT', 'MDT', 'AMGN', 'GILD', 'CVS', 'CI', 'HUM'
        ],
        
        'International ETFs': [
            'EWJ', 'EWZ', 'FXI', 'EWG', 'EWU', 'EWC', 'EWW', 'INDA',
            'EWY', 'EWA', 'EWI', 'EWP', 'EWL', 'EWQ', 'EWS', 'EWT',
            'EWH', 'EWM', 'EPP', 'EZA', 'ECH', 'EPHE', 'ERUS'
        ],
        
        'Commodity/Gold ETFs': [
            'GLD', 'SLV', 'GDX', 'GDXJ', 'USO', 'UNG', 'DBA', 'DBC',
            'IAU', 'PDBC', 'GSG', 'USV', 'UGA', 'CORN', 'SOYB', 'WEAT'
        ]
    }
    
    return tickers_2018

def create_200_ticker_strategy_list():
    """Create list of exactly 200 tickers for Fed rate cut strategy"""
    
    print("200 ESTABLISHED TICKERS FOR FED RATE CUT STRATEGY")
    print("=" * 60)
    print("Focus Period: December 2018 - December 2019")
    print("Expanded dataset for better statistical significance")
    print()
    
    all_tickers = []
    ticker_categories = get_200_established_tickers()
    
    for category, tickers in ticker_categories.items():
        print(f"{category} ({len(tickers)}):")
        for ticker in tickers:
            print(f"  {ticker}")
            all_tickers.append(ticker)
        print()
    
    # Remove duplicates and sort
    unique_tickers = sorted(list(set(all_tickers)))
    
    # Ensure we have exactly 200 tickers
    if len(unique_tickers) > 200:
        # Prioritize dividend-focused and major ETFs
        priority_tickers = []
        
        # Add high priority categories first
        priority_categories = [
            'High Dividend ETFs', 'Major Index ETFs', 'Sector ETFs', 
            'REIT ETFs', 'Blue Chip Dividend Stocks', 'Consumer Staples',
            'Utility Stocks', 'Financial Stocks'
        ]
        
        for category in priority_categories:
            for ticker in ticker_categories.get(category, []):
                if ticker in unique_tickers and ticker not in priority_tickers:
                    priority_tickers.append(ticker)
        
        # Add remaining tickers until we reach 200
        for ticker in unique_tickers:
            if ticker not in priority_tickers and len(priority_tickers) < 200:
                priority_tickers.append(ticker)
        
        final_tickers = sorted(priority_tickers[:200])
    elif len(unique_tickers) < 200:
        # If we need more, add some additional well-known tickers
        additional_tickers = [
            'MMM', 'AOS', 'ABBV', 'ABMD', 'ACN', 'ATVI', 'ADBE', 'AMG',
            'AFL', 'A', 'GAS', 'APD', 'AKAM', 'ALK', 'ALB', 'ARE',
            'ALXN', 'ALGN', 'ALLE', 'AGN', 'ADS', 'LNT', 'ALL'
        ]
        
        for ticker in additional_tickers:
            if ticker not in unique_tickers and len(unique_tickers) < 200:
                unique_tickers.append(ticker)
        
        final_tickers = sorted(unique_tickers[:200])
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
    with open('fed_strategy_200_tickers.txt', 'w') as f:
        f.write(','.join(final_tickers))
    
    print(f"\nList saved to 'fed_strategy_200_tickers.txt'")
    
    print(f"\n" + "=" * 60)
    print("EXPANDED STRATEGY READY:")
    print("=" * 60)
    print("1. 200 tickers vs previous 100 for better statistical significance")
    print("2. More diverse sector representation")
    print("3. Additional international exposure")
    print("4. Broader dividend and growth stock coverage")
    print("5. Ready for monthly Fed rate cut strategy testing")
    
    return final_tickers

if __name__ == "__main__":
    ticker_list = create_200_ticker_strategy_list()