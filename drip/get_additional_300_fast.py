import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

def calculate_volatility(prices):
    """Calculate annualized volatility from daily prices"""
    if len(prices) < 20:
        return None
    
    returns = np.diff(prices) / prices[:-1]
    std_dev = np.std(returns)
    annualized_vol = std_dev * np.sqrt(252) * 100
    return annualized_vol

def get_ticker_data(args):
    """Get price data for a single ticker"""
    ticker, api_key = args
    
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=60)
        
        from_date = start_date.strftime('%Y-%m-%d')
        to_date = end_date.strftime('%Y-%m-%d')
        
        url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{from_date}/{to_date}"
        params = {
            'adjusted': 'true',
            'sort': 'asc',
            'limit': 5000,
            'apikey': api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            return None
            
        data = response.json()
        
        if 'results' not in data or len(data['results']) < 20:
            return None
        
        results = data['results']
        closes = [r['c'] for r in results]
        volumes = [r['v'] for r in results]
        
        current_price = closes[-1]
        
        # Skip if under $5
        if current_price < 5.0:
            return None
        
        volatility = calculate_volatility(closes)
        if volatility is None:
            return None
        
        avg_volume = np.mean(volumes)
        
        # Skip if average volume < 50k shares
        if avg_volume < 50000:
            return None
        
        # Calculate returns
        if len(closes) >= 30:
            month_change = ((closes[-1] - closes[-30]) / closes[-30]) * 100
        else:
            month_change = 0
        
        ytd_return = ((closes[-1] - closes[0]) / closes[0]) * 100
        
        return {
            'ticker': ticker,
            'category': 'STOCK',
            'days_of_data': len(closes),
            'ytd_return_pct': ytd_return,
            'annualized_volatility_pct': volatility,
            'current_price': current_price,
            'avg_daily_volume': avg_volume,
            'month_change_pct': month_change
        }
        
    except Exception as e:
        return None

def get_additional_300_fast():
    """Get 300 additional volatile tickers using curated list"""
    
    print("🚀 GETTING 300 ADDITIONAL VOLATILE TICKERS (FAST METHOD)")
    print("=" * 80)
    
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY not found in environment")
        return
    
    # Load existing tickers to exclude
    existing_df = pd.read_csv('top_300_tickers_summary.csv')
    existing_tickers = set(existing_df['ticker'].tolist())
    print(f"📥 Excluding {len(existing_tickers)} existing tickers")
    
    # Curated list of potentially volatile tickers from various sectors
    candidate_tickers = [
        # Biotech & Pharma
        'AXSM', 'BIIB', 'GILD', 'REGN', 'VRTX', 'AMGN', 'CELG', 'MYL', 'TEVA', 'BMY',
        'JNJ', 'PFE', 'MRK', 'ABT', 'LLY', 'ABBV', 'TMO', 'DHR', 'BDX', 'SYK',
        'ISRG', 'ALGN', 'DXCM', 'HOLX', 'IDXX', 'IQV', 'MTD', 'PKI', 'RMD', 'TFX',
        'VAR', 'WST', 'ZBH', 'ZTS', 'TECH', 'ILMN', 'INCY', 'MRTX', 'NBIX', 'NVCR',
        'RARE', 'SRPT', 'UTHR', 'FOLD', 'ARWR', 'BLUE', 'CRSP', 'EDIT', 'NTLA', 'BEAM',
        'FATE', 'SGMO', 'VCYT', 'PACB', 'ONT', 'CDNA', 'TWST', 'SDGR', 'SURF', 'DNA',
        
        # Small Cap Tech
        'PLTR', 'SNOW', 'DDOG', 'CRWD', 'ZS', 'OKTA', 'NET', 'ESTC', 'SPLK', 'VEEV',
        'WDAY', 'NOW', 'CRM', 'ADSK', 'INTU', 'ORCL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN',
        'META', 'NFLX', 'TSLA', 'NVDA', 'AMD', 'INTC', 'QCOM', 'AVGO', 'TXN', 'LRCX',
        'KLAC', 'AMAT', 'MU', 'WDC', 'STX', 'NTAP', 'PURE', 'SMCI', 'DELL', 'HPE',
        'IBM', 'CSCO', 'JNPR', 'FFIV', 'A10', 'CIEN', 'LITE', 'INFN', 'COMM', 'UI',
        
        # Energy & Commodities
        'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'HAL', 'BKR', 'OXY', 'KMI', 'WMB',
        'EPD', 'ET', 'MPLX', 'EQT', 'DVN', 'FANG', 'MRO', 'AR', 'SM', 'RRC',
        'CNX', 'GPOR', 'MTDR', 'CTRA', 'VNOM', 'NOG', 'CLR', 'MUR', 'OVV', 'CRGY',
        'MGY', 'PDCE', 'PE', 'REI', 'REN', 'REPX', 'SM', 'TALO', 'WLL', 'APOG',
        'BORR', 'DO', 'ESV', 'HP', 'NBR', 'NE', 'PTEN', 'RDC', 'TDW', 'VAL',
        
        # Miners & Materials  
        'FCX', 'NEM', 'GOLD', 'AEM', 'KGC', 'HL', 'AG', 'EXK', 'FSM', 'PAAS',
        'CDE', 'SSRM', 'WPM', 'FNV', 'RGLD', 'SAND', 'SBSW', 'GFI', 'HMY', 'AU',
        'AGI', 'AUY', 'BVN', 'EGO', 'GORO', 'IAG', 'MAG', 'MRDSK', 'NGD', 'OR',
        'PLG', 'PZG', 'RIC', 'SCCO', 'SVM', 'THM', 'UMC', 'VALE', 'WPM', 'TECK',
        
        # Real Estate & REITs
        'AMT', 'PLD', 'CCI', 'EQIX', 'DLR', 'SBAC', 'EXR', 'AVB', 'EQR', 'MAA',
        'UDR', 'CPT', 'ESS', 'AIV', 'AEP', 'BRX', 'BFS', 'CPG', 'DEA', 'EPR',
        'EFC', 'EXR', 'FRT', 'HIW', 'HST', 'IRT', 'JBG', 'KIM', 'LXP', 'MPW',
        'NLY', 'NRZ', 'OFC', 'PEB', 'PSB', 'REG', 'RLJ', 'SHO', 'SKT', 'SPG',
        'SRC', 'TCO', 'TWO', 'UBA', 'VNO', 'WPG', 'XAN', 'ADC', 'AGNC', 'ANH',
        
        # Airlines & Travel
        'DAL', 'UAL', 'AAL', 'LUV', 'JBLU', 'ALK', 'SKYW', 'HA', 'MESA', 'SAVE',
        'CCL', 'RCL', 'NCLH', 'CUK', 'MAR', 'HLT', 'H', 'IHG', 'HTHT', 'CHH',
        'TRIP', 'EXPE', 'BKNG', 'ABNB', 'UBER', 'LYFT', 'DASH', 'GRUB', 'UBER', 'DIDI',
        
        # Small Cap & Speculative
        'GME', 'AMC', 'BBBY', 'BB', 'NOK', 'CLOV', 'WISH', 'SOFI', 'HOOD', 'AFRM',
        'SQ', 'PYPL', 'SHOP', 'ROKU', 'ZM', 'PTON', 'TDOC', 'DOCU', 'ZI', 'BILL',
        'CRWD', 'OKTA', 'DDOG', 'NET', 'FSLY', 'CFLT', 'ESTC', 'ELASTIC', 'MDB', 'SNOW',
        
        # Emerging Markets & International
        'BABA', 'JD', 'PDD', 'BIDU', 'BILI', 'IQ', 'NTES', 'WB', 'VIPS', 'TME',
        'BEKE', 'DIDI', 'GRAB', 'SE', 'CPNG', 'MELI', 'GLOB', 'QFIN', 'TIGR', 'FUTU',
        'NIO', 'XPEV', 'LI', 'BYD', 'KNDI', 'SOLO', 'AYRO', 'BLNK', 'CHPT', 'EVGO',
        
        # Cannabis & Alternative
        'TLRY', 'CGC', 'ACB', 'CRON', 'HEXO', 'OGI', 'SNDL', 'KERN', 'CURLF', 'GTBIF',
        
        # Semiconductors beyond main ones
        'TSM', 'UMC', 'ASX', 'HIMX', 'TER', 'FORM', 'COHU', 'ACLS', 'ICHR', 'POWI',
        'CRUS', 'SWKS', 'QRVO', 'MCHP', 'ADI', 'XLNX', 'MRVL', 'ON', 'STM', 'NXPI'
    ]
    
    # Remove any that are already in our existing list
    new_candidates = [t for t in candidate_tickers if t not in existing_tickers]
    
    print(f"🎯 Analyzing {len(new_candidates)} candidate tickers...")
    print(f"⏱️ Estimated time: {len(new_candidates) * 0.65 / 60:.1f} minutes")
    
    results = []
    processed_count = 0
    
    # Process in batches
    batch_size = 80
    
    for batch_start in range(0, len(new_candidates), batch_size):
        batch = new_candidates[batch_start:batch_start + batch_size]
        print(f"\n📦 Batch {batch_start//batch_size + 1}/{(len(new_candidates)-1)//batch_size + 1} ({len(batch)} tickers)")
        
        batch_start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=8) as executor:
            # Submit all requests with delays
            futures = []
            for i, ticker in enumerate(batch):
                args = (ticker, api_key)
                future = executor.submit(get_ticker_data, args)
                futures.append((future, ticker))
                time.sleep(0.7)  # Rate limit
            
            # Collect results
            for future, ticker in futures:
                try:
                    result = future.result(timeout=15)
                    if result:
                        results.append(result)
                    
                    processed_count += 1
                    if processed_count % 20 == 0:
                        print(f"  ✅ {processed_count}/{len(new_candidates)} (found {len(results)})")
                        
                except Exception as e:
                    processed_count += 1
        
        # Rate limit between batches
        batch_time = time.time() - batch_start_time
        if batch_time < 60 and batch_start + batch_size < len(new_candidates):
            sleep_time = 62 - batch_time
            print(f"  ⏳ Rate limit wait: {sleep_time:.0f}s")
            time.sleep(sleep_time)
    
    print(f"\n📊 Analysis complete: Found {len(results)} qualifying tickers")
    
    if len(results) == 0:
        print("❌ No additional qualifying tickers found")
        return
    
    # Convert to DataFrame and sort by volatility
    df = pd.DataFrame(results)
    df = df.sort_values('annualized_volatility_pct', ascending=False).reset_index(drop=True)
    
    # Take top 300 (or all if less than 300)
    additional_tickers = df.head(min(300, len(df)))
    
    print(f"\n🏆 TOP 20 ADDITIONAL VOLATILE TICKERS:")
    print("=" * 100)
    print(f"{'Rank':<6} {'Ticker':<8} {'Price':<10} {'Volatility %':<15} {'YTD %':<12} {'Volume':<15}")
    print("-" * 100)
    
    for idx, row in additional_tickers.head(20).iterrows():
        print(f"{idx+1:<6} {row['ticker']:<8} ${row['current_price']:<9.2f} {row['annualized_volatility_pct']:<14.1f} "
              f"{row['ytd_return_pct']:>11.1f} {row['avg_daily_volume']:>14,.0f}")
    
    # Save files
    timestamp = datetime.now().strftime('%Y%m%d_%H%M')
    
    # Additional tickers file
    additional_file = f'additional_{len(additional_tickers)}_volatile_tickers_{timestamp}.csv'
    additional_tickers.to_csv(additional_file, index=False)
    
    # Combined file
    combined = pd.concat([existing_df, additional_tickers], ignore_index=True)
    combined_file = f'combined_{len(combined)}_tickers_{timestamp}.csv'
    combined.to_csv(combined_file, index=False)
    
    print(f"\n✅ Files saved:")
    print(f"   📄 Additional tickers: {additional_file}")
    print(f"   📄 Combined list: {combined_file}")
    print(f"\n📈 Summary:")
    print(f"   Additional tickers found: {len(additional_tickers)}")
    print(f"   Total tickers now: {len(combined)}")
    print(f"   Volatility range (new): {additional_tickers['annualized_volatility_pct'].min():.1f}% - {additional_tickers['annualized_volatility_pct'].max():.1f}%")
    print(f"   Average volatility (new): {additional_tickers['annualized_volatility_pct'].mean():.1f}%")

if __name__ == "__main__":
    get_additional_300_fast()