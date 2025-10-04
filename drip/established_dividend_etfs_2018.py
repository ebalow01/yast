#!/usr/bin/env python3
"""
List of established dividend ETFs that definitely have data back to 2018
For Fed rate cut strategy analysis
"""

def get_established_dividend_etfs_2018():
    """
    Returns established dividend ETFs categorized by type
    These ETFs were launched well before 2018 and have full historical data
    """
    
    established_etfs = {
        'High Dividend Yield ETFs': [
            'VYM',   # Vanguard High Dividend Yield ETF (2006)
            'HDV',   # iShares Core High Dividend ETF (2011) 
            'DVY',   # iShares Select Dividend ETF (2003)
            'SDY',   # SPDR S&P Dividend ETF (2005)
            'VIG',   # Vanguard Dividend Appreciation ETF (2006)
            'SCHD',  # Schwab US Dividend Equity ETF (2011)
            'NOBL',  # ProShares S&P 500 Dividend Aristocrats ETF (2013)
            'DGRO',  # iShares Core Dividend Growth ETF (2014)
        ],
        
        'Monthly Dividend ETFs (Established)': [
            'SPHD',  # Invesco S&P 500 High Dividend Low Volatility ETF (2012)
            'USMV',  # iShares MSCI USA Min Vol Factor ETF (2011)
            'QUAL',  # iShares MSCI USA Quality Factor ETF (2013)  
            'MTUM',  # iShares MSCI USA Momentum Factor ETF (2013)
            'SIZE',  # iShares MSCI USA Size Factor ETF (2013)
        ],
        
        'REIT ETFs': [
            'VNQ',   # Vanguard Real Estate ETF (2004)
            'SCHH',  # Schwab US REIT ETF (2010)
            'IYR',   # iShares U.S. Real Estate ETF (2000)
            'FREL',  # Fidelity MSCI Real Estate Index ETF (2015)
        ],
        
        'Utility Dividend ETFs': [
            'XLU',   # Utilities Select Sector SPDR Fund (1998)
            'VPU',   # Vanguard Utilities ETF (2004) 
            'IDU',   # iShares U.S. Utilities ETF (2000)
        ],
        
        'International Dividend ETFs': [
            'VXUS',  # Vanguard Total International Stock ETF (2011)
            'VYMI',  # Vanguard International High Dividend Yield ETF (2016)
            'IEFA',  # iShares Core MSCI EAFE IMI Index ETF (2012)
            'VEA',   # Vanguard FTSE Developed Markets ETF (2007)
        ],
        
        'Covered Call/Income ETFs (Pre-2018)': [
            'QYLD',  # Global X NASDAQ 100 Covered Call ETF (2013)
            'RYLD',  # Global X Russell 2000 Covered Call ETF (2019) - might be too new
            'XYLD',  # Global X S&P 500 Covered Call ETF (2013)
            'DIVO',  # Amplify CWP Enhanced Dividend Income ETF (2016)
            'JEPI',  # JPMorgan Equity Premium Income ETF (2020) - too new for 2018
        ],
        
        'Major Index ETFs (Dividend Focused)': [
            'SPY',   # SPDR S&P 500 ETF Trust (1993)
            'VOO',   # Vanguard S&P 500 ETF (2010)
            'IVV',   # iShares Core S&P 500 ETF (2000)
            'VTI',   # Vanguard Total Stock Market ETF (2001)
            'ITOT',  # iShares Core S&P Total US Stock Market ETF (2004)
        ]
    }
    
    return established_etfs

def create_2018_strategy_list():
    """Create a comprehensive list for Fed rate cut strategy"""
    
    print("ESTABLISHED DIVIDEND ETFs FOR FED RATE CUT STRATEGY")
    print("=" * 60)
    print("These ETFs have data back to 2018 and earlier")
    print("Perfect for analyzing performance during Fed rate cut cycles")
    print()
    
    all_etfs = []
    etf_categories = get_established_dividend_etfs_2018()
    
    for category, etfs in etf_categories.items():
        print(f"{category}:")
        for etf in etfs:
            print(f"  {etf}")
            all_etfs.append(etf)
        print()
    
    # Remove duplicates and sort
    unique_etfs = sorted(list(set(all_etfs)))
    
    print("=" * 60)
    print(f"TOTAL UNIQUE ETFs: {len(unique_etfs)}")
    print("=" * 60)
    
    # Print in chunks for readability
    print("Complete list:")
    for i in range(0, len(unique_etfs), 10):
        chunk = unique_etfs[i:i+10]
        print(", ".join(chunk))
    
    # Save to file
    with open('established_dividend_etfs_2018.txt', 'w') as f:
        f.write(','.join(unique_etfs))
    
    print(f"\nList saved to 'established_dividend_etfs_2018.txt'")
    
    # Also create a filtered list removing the newest ones
    # Remove ETFs launched after 2017 to be safe
    definitely_2018_etfs = [etf for etf in unique_etfs if etf not in ['RYLD', 'JEPI']]
    
    print(f"\nSAFE LIST (definitely have 2018 data): {len(definitely_2018_etfs)} ETFs")
    with open('safe_dividend_etfs_2018.txt', 'w') as f:
        f.write(','.join(definitely_2018_etfs))
    
    return definitely_2018_etfs

if __name__ == "__main__":
    established_list = create_2018_strategy_list()
    
    print(f"\n" + "=" * 60)
    print("NEXT STEPS FOR FED RATE CUT STRATEGY:")
    print("=" * 60)
    print("1. Use 'safe_dividend_etfs_2018.txt' as your ticker list")
    print("2. Download daily data from 2018-01-01 to present")
    print("3. Identify Fed rate cut dates: Dec 2018, Jul/Sep/Oct 2019, Mar 2020")
    print("4. Analyze ETF performance in periods following rate cuts")
    print("5. Look for patterns in dividend yield changes vs NAV performance")
    print(f"6. Test monthly entry/exit strategies around rate cut cycles")