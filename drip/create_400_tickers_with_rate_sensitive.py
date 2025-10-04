#!/usr/bin/env python3
"""
Create 400-ticker list including key rate-sensitive sectors missing from original analysis
Add: TLT, VIX plays, mortgage REITs, homebuilders, regional banks, etc.
"""

def get_missing_rate_sensitive_tickers():
    """100 key rate-sensitive tickers that were missing from our analysis"""
    
    missing_tickers = {
        'Treasury/Bond ETFs (10)': [
            'TLT',   # 20+ Year Treasury Bond ETF - THE rate cut play
            'IEF',   # 7-10 Year Treasury Bond ETF  
            'SHY',   # 1-3 Year Treasury Bond ETF
            'TIP',   # Treasury Inflation-Protected Securities
            'GOVT',  # U.S. Treasury Bond ETF
            'SCHO',  # Short-Term Treasury ETF
            'SCHM',  # Intermediate-Term Treasury ETF
            'SCHR',  # Intermediate Treasury ETF
            'TLH',   # 10-20 Year Treasury ETF
            'ILTB'   # Core 10+ Year USD Treasury Bond ETF
        ],
        
        'Volatility/Fear ETFs (8)': [
            'VIX',   # CBOE Volatility Index (if available)
            'UVXY',  # ProShares Ultra VIX Short-Term Futures ETF
            'VXX',   # iPath Series B S&P 500 VIX Short-Term Futures ETN
            'VIXY',  # ProShares VIX Short-Term Futures ETF
            'SVXY',  # ProShares Short VIX Short-Term Futures ETF (inverse)
            'VIXM',  # ProShares VIX Mid-Term Futures ETF
            'TVIX',  # VelocityShares Daily 2x VIX Short-Term ETN
            'XIV'    # VelocityShares Daily Inverse VIX Short-Term ETN
        ],
        
        'Mortgage REITs (12)': [
            'NLY',   # Annaly Capital Management - largest mREIT
            'AGNC',  # AGNC Investment Corp
            'STWD',  # Starwood Property Trust
            'BXMT',  # Blackstone Mortgage Trust
            'TWO',   # Two Harbors Investment Corp
            'CIM',   # Chimera Investment Corporation
            'NRZ',   # New Residential Investment Corp
            'MITT',  # AG Mortgage Investment Trust
            'EFC',   # Ellington Financial
            'NYMT',  # New York Mortgage Trust
            'ARR',   # ARMOUR Residential REIT
            'IVR'    # Invesco Mortgage Capital
        ],
        
        'Homebuilders/Housing (15)': [
            'DHI',   # D.R. Horton - largest homebuilder
            'LEN',   # Lennar Corporation
            'PHM',   # PulteGroup
            'TOL',   # Toll Brothers
            'KBH',   # KB Home
            'MDC',   # M.D.C. Holdings
            'BZH',   # Beazer Homes
            'TMHC',  # Taylor Morrison Home Corporation
            'CCS',   # Century Communities
            'MHO',   # M/I Homes
            'TPH',   # Tri Pointe Homes
            'LGIH',  # LGI Homes
            'SKY',   # Skyline Champion Corporation
            'CVCO',  # Cavco Industries
            'GRBK'   # Green Brick Partners
        ],
        
        'Regional Banks (20)': [
            'KRE',   # SPDR S&P Regional Banking ETF
            'KBWB',  # Invesco KBW Bank ETF
            'KBE',   # SPDR S&P Bank ETF
            'KBWR',  # Invesco KBW Regional Banking ETF
            'KBWP',  # Invesco KBW Property & Casualty Insurance ETF
            'RF',    # Regions Financial Corporation
            'FITB',  # Fifth Third Bancorp
            'HBAN',  # Huntington Bancshares
            'MTB',   # M&T Bank Corporation
            'STI',   # SunTrust Banks (now Truist)
            'ZION',  # Zions Bancorporation
            'KEY',   # KeyCorp
            'CMA',   # Comerica Incorporated
            'CFG',   # Citizens Financial Group
            'SIVB',  # SVB Financial Group
            'CBSH',  # Commerce Bancshares
            'FHN',   # First Horizon Corporation
            'PBCT',  # People's United Financial
            'WTFC',  # Wintrust Financial Corporation
            'FFIN'   # First Financial Bankshares
        ],
        
        'Utilities (High Rate Sensitivity) (10)': [
            'XEL',   # Xcel Energy
            'PPL',   # PPL Corporation
            'FE',    # FirstEnergy Corp
            'ETR',   # Entergy Corporation
            'ES',    # Eversource Energy
            'CNP',   # CenterPoint Energy
            'NI',    # NiSource
            'LNT',   # Alliant Energy Corporation
            'WEC',   # WEC Energy Group
            'ATO'    # Atmos Energy Corporation
        ],
        
        'Interest Rate Sensitive ETFs (8)': [
            'FAS',   # Direxion Daily Financial Bull 3X Shares
            'FAZ',   # Direxion Daily Financial Bear 3X Shares  
            'CURE',  # Direxion Daily Healthcare Bull 3X Shares
            'LABU',  # Direxion Daily S&P Biotech Bull 3X Shares
            'TQQQ',  # ProShares UltraPro QQQ (already in?)
            'SQQQ',  # ProShares UltraPro Short QQQ
            'SPXU',  # ProShares UltraPro Short S&P500 (already in?)
            'UPRO'   # ProShares UltraPro S&P500
        ],
        
        'Consumer Rate-Sensitive (10)': [
            'HD',    # Home Depot (already in?)
            'LOW',   # Lowe's Companies
            'WHR',   # Whirlpool Corporation
            'LEN.B', # Lennar Corporation Class B
            'RH',    # RH (Restoration Hardware)
            'WSM',   # Williams-Sonoma
            'BBY',   # Best Buy
            'F',     # Ford Motor Company (already in?)
            'GM',    # General Motors
            'TGT'    # Target Corporation
        ],
        
        'Additional High-Quality Rate Plays (7)': [
            'BRK.B', # Berkshire Hathaway Class B
            'JPM',   # JPMorgan Chase (already in?)
            'BAC',   # Bank of America (already in?)
            'WFC',   # Wells Fargo (already in?)
            'C',     # Citigroup (already in?)
            'GS',    # Goldman Sachs (already in?)
            'MS'     # Morgan Stanley (already in?)
        ]
    }
    
    return missing_tickers

def create_400_ticker_fed_strategy_list():
    """Combine existing 300 tickers with 100 key rate-sensitive tickers"""
    
    print("CREATING 400-TICKER FED RATE CUT STRATEGY LIST")
    print("=" * 60)
    print("Adding 100 key rate-sensitive tickers to existing 300")
    print()
    
    # Read existing 300 tickers (actually 291 successful)
    try:
        with open('fed_strategy_300_tickers.txt', 'r') as f:
            existing_300 = f.read().strip().split(',')
        print(f"Loaded existing 300-ticker list: {len(existing_300)} tickers")
    except:
        print("Error: Could not load existing 300-ticker list")
        return None
    
    # Get additional rate-sensitive tickers
    missing_ticker_dict = get_missing_rate_sensitive_tickers()
    additional_tickers = []
    
    print(f"\nRate-sensitive ticker categories to add:")
    for category, tickers in missing_ticker_dict.items():
        print(f"\n{category}:")
        for ticker in tickers:
            print(f"  {ticker}")
            additional_tickers.append(ticker)
    
    # Remove duplicates with existing list
    existing_set = set(existing_300)
    unique_additional = [t for t in additional_tickers if t not in existing_set]
    
    print(f"\n" + "=" * 60)
    print(f"TICKER CONSOLIDATION")
    print("=" * 60)
    print(f"Existing 300-ticker list: {len(existing_300)} tickers")
    print(f"Additional rate-sensitive tickers: {len(additional_tickers)} tickers")
    print(f"Duplicates found: {len(additional_tickers) - len(unique_additional)}")
    print(f"Unique new tickers: {len(unique_additional)}")
    
    # Show duplicates
    duplicates = [t for t in additional_tickers if t in existing_set]
    if duplicates:
        print(f"\nDuplicates (already in 300-ticker list):")
        for i in range(0, len(duplicates), 10):
            chunk = duplicates[i:i+10]
            print("  " + ", ".join(chunk))
    
    # Combine lists - take exactly 100 additional
    if len(unique_additional) >= 100:
        selected_100 = sorted(unique_additional[:100])
    else:
        print(f"\nWarning: Only {len(unique_additional)} unique new tickers available")
        selected_100 = sorted(unique_additional)
    
    # Create final 400-ticker list
    final_400 = existing_300 + selected_100
    
    print(f"\n" + "=" * 60)
    print(f"FINAL 400-TICKER FED STRATEGY LIST")
    print("=" * 60)
    print(f"Original tickers: {len(existing_300)}")
    print(f"New rate-sensitive tickers: {len(selected_100)}")
    print(f"Total tickers: {len(final_400)}")
    
    # Show new tickers being added
    print(f"\nNew rate-sensitive tickers being added ({len(selected_100)}):")
    for i in range(0, len(selected_100), 10):
        chunk = selected_100[i:i+10]
        print("  " + ", ".join(chunk))
    
    # Save complete 400-ticker list
    with open('fed_strategy_400_tickers.txt', 'w') as f:
        f.write(','.join(final_400))
    
    print(f"\n" + "=" * 60)
    print("ENHANCED FED STRATEGY LIST READY")
    print("=" * 60)
    print(f"[OK] 400-ticker list saved to 'fed_strategy_400_tickers.txt'")
    print(f"[OK] Now includes TLT, VIX plays, mortgage REITs, homebuilders")
    print(f"[OK] Enhanced with regional banks and rate-sensitive utilities")
    print(f"[OK] Ready for comprehensive Fed rate cut analysis")
    
    # Show key additions by category
    print(f"\nKey rate-sensitive additions:")
    print(f"  Bonds: TLT, IEF, SHY, TIP")
    print(f"  Volatility: UVXY, VXX, VIXY")  
    print(f"  Mortgage REITs: NLY, AGNC, STWD, BXMT")
    print(f"  Homebuilders: DHI, LEN, PHM, TOL")
    print(f"  Regional Banks: RF, FITB, HBAN, MTB")
    
    return final_400, selected_100

if __name__ == "__main__":
    all_400, new_100 = create_400_ticker_fed_strategy_list()