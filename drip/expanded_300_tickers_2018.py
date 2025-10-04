#!/usr/bin/env python3
"""
Expanded list of 300 established tickers for Fed rate cut strategy
Adding 100 more to our existing 200
"""

def get_additional_100_tickers():
    """
    Returns additional 100 established tickers with data back to 2018
    These will be combined with our existing 200
    """
    
    additional_tickers = {
        'Additional Blue Chip Stocks': [
            'MMM', 'AOS', 'ACN', 'ATVI', 'AFL', 'APD', 'AKAM', 'ALB', 'ARE',
            'ALXN', 'ALGN', 'ALLE', 'LNT', 'ALL', 'GOOGL', 'GOOG', 'MO',
            'AMCR', 'AMZN', 'AEE', 'AAL', 'AEP', 'AES', 'AMG', 'AON'
        ],
        
        'Mid Cap ETFs': [
            'MDY', 'VO', 'IVOO', 'IWS', 'IWP', 'IWR', 'IMID', 'VMOT'
        ],
        
        'Small Cap ETFs': [
            'IWM', 'VB', 'IJR', 'SLY', 'VBR', 'VBK', 'IJS', 'IJT'
        ],
        
        'Additional Sector ETFs': [
            'ARKK', 'SOXX', 'HACK', 'ICLN', 'IDRV', 'BOTZ', 'FINX', 'CIBR',
            'CLOU', 'QTEC', 'IPAY', 'PBW', 'TAN', 'QCLN', 'PHO', 'FIW'
        ],
        
        'Dividend Aristocrats Stocks': [
            'O', 'MAIN', 'STAG', 'EPD', 'ENB', 'TRP', 'PPL', 'SO', 'DUK',
            'NEE', 'AEP', 'ED', 'PEG', 'XEL', 'WEC', 'EXC'
        ],
        
        'Additional International ETFs': [
            'VTIAX', 'FTIHX', 'SWISX', 'VXUS', 'IXUS', 'IEFA', 'VEU', 'VSS'
        ],
        
        'Regional Bank ETFs': [
            'KBE', 'IAT', 'KBWB', 'KBWR', 'KBWP'
        ],
        
        'Energy Stocks': [
            'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PSX', 'VLO', 'MPC', 'KMI',
            'OKE', 'WMB', 'EPD', 'ET', 'MPLX'
        ],
        
        'Industrial Stocks': [
            'BA', 'CAT', 'DE', 'GE', 'HON', 'LMT', 'MMM', 'RTX', 'UNP',
            'UPS', 'FDX', 'CSX', 'NSC', 'DAL', 'UAL', 'AAL', 'LUV'
        ],
        
        'Additional Healthcare': [
            'ISRG', 'SYK', 'BSX', 'EW', 'ZTS', 'IDXX', 'REGN', 'VRTX',
            'BIIB', 'IQV', 'CNC', 'HUM', 'ANTM', 'CVS', 'WBA', 'MCK'
        ],
        
        'Materials & Basic Industries': [
            'LIN', 'APD', 'ECL', 'SHW', 'DD', 'DOW', 'PPG', 'NEM',
            'FCX', 'GOLD', 'BHP', 'RIO', 'VALE', 'SCCO'
        ],
        
        'Communication Services': [
            'GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS',
            'CHTR', 'DISH', 'VG', 'LUMN', 'SIRI'
        ],
        
        'Additional Bond ETFs': [
            'SCHZ', 'SCHO', 'SCHM', 'SCHR', 'GOVT', 'IGIB', 'IGSB',
            'ISTB', 'ITOT', 'ILTB', 'IEI', 'IEF', 'TLH', 'TLT'
        ]
    }
    
    return additional_tickers

def create_300_ticker_list():
    """Combine existing 200 tickers with additional 100"""
    
    print("EXPANDING TO 300 TICKERS FOR FED RATE CUT STRATEGY")
    print("=" * 60)
    
    # Read existing 200 tickers
    try:
        with open('fed_strategy_200_tickers.txt', 'r') as f:
            existing_200 = f.read().strip().split(',')
        print(f"Loaded existing 200 tickers from file")
    except:
        print("Error: Could not load existing 200 tickers")
        print("Make sure fed_strategy_200_tickers.txt exists")
        return None
    
    # Get additional tickers
    additional_ticker_dict = get_additional_100_tickers()
    additional_tickers = []
    
    print(f"\nAdditional ticker categories:")
    for category, tickers in additional_ticker_dict.items():
        print(f"{category} ({len(tickers)}):")
        for ticker in tickers:
            print(f"  {ticker}")
            additional_tickers.append(ticker)
        print()
    
    # Remove duplicates and combine
    all_additional = sorted(list(set(additional_tickers)))
    unique_new = [t for t in all_additional if t not in existing_200]
    
    print(f"Total additional tickers found: {len(all_additional)}")
    print(f"Unique new tickers (not in existing 200): {len(unique_new)}")
    
    # Take exactly 100 new tickers
    if len(unique_new) >= 100:
        selected_100 = sorted(unique_new[:100])
    else:
        # If we don't have enough unique ones, take what we have
        selected_100 = sorted(unique_new)
        print(f"Warning: Only found {len(unique_new)} unique new tickers")
    
    # Combine with existing 200
    final_300 = existing_200 + selected_100
    
    print(f"\n" + "=" * 60)
    print(f"FINAL 300-TICKER LIST")
    print("=" * 60)
    print(f"Existing tickers: {len(existing_200)}")
    print(f"New tickers added: {len(selected_100)}")
    print(f"Total tickers: {len(final_300)}")
    
    # Display new tickers being added
    print(f"\nNew tickers being added ({len(selected_100)}):")
    for i in range(0, len(selected_100), 10):
        chunk = selected_100[i:i+10]
        print("  " + ", ".join(chunk))
    
    # Save complete 300 ticker list
    with open('fed_strategy_300_tickers.txt', 'w') as f:
        f.write(','.join(final_300))
    
    print(f"\n" + "=" * 60)
    print("EXPANDED LIST READY")
    print("=" * 60)
    print(f"[OK] 300-ticker list saved to 'fed_strategy_300_tickers.txt'")
    print(f"[OK] Ready for enhanced Fed rate cut strategy analysis")
    print(f"[OK] Even better statistical significance with 300 vs 200 tickers")
    
    return final_300, selected_100

if __name__ == "__main__":
    all_300, new_100 = create_300_ticker_list()