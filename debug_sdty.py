import requests

try:
    response = requests.get('https://yetanotherstocktracker.com/data/performance_data.json', timeout=10)
    if response.status_code == 200:
        data = response.json()
        
        # Find SDTY specifically
        sdty_data = [item for item in data if item['ticker'] == 'SDTY'][0]
        print('SDTY Analysis:')
        print(f'  Ticker: {sdty_data["ticker"]}')
        print(f'  Ex-Div Day: {sdty_data["exDivDay"]}')
        print(f'  Div Capture Return: {sdty_data["divCaptureReturn"]:.1%}')
        print(f'  Best Return: {sdty_data["bestReturn"]:.1%}')
        print(f'  Risk: {sdty_data["riskVolatility"]:.1%}')
        print(f'  Best Strategy: {sdty_data["bestStrategy"]}')
        print(f'  Rule 1 qualified (>40% return AND <40% risk): {sdty_data["bestReturn"] > 0.40 and sdty_data["riskVolatility"] < 0.40}')
        print(f'  Rule 2 qualified (>30% div capture): {sdty_data["divCaptureReturn"] > 0.30}')
        
        # Find all Thursday ETFs sorted by performance
        thursday_etfs = [item for item in data if item['exDivDay'] == 'Thursday']
        print(f'\nAll Thursday ETFs (sorted by best return):')
        for etf in sorted(thursday_etfs, key=lambda x: x["bestReturn"], reverse=True):
            rule1 = etf['bestReturn'] > 0.40 and etf['riskVolatility'] < 0.40
            rule2 = etf['divCaptureReturn'] > 0.30
            print(f'  {etf["ticker"]}: {etf["bestReturn"]:.1%} best, {etf["divCaptureReturn"]:.1%} DC, {etf["riskVolatility"]:.1%} risk | Rule1: {rule1}, Rule2: {rule2}')
        
        # Check what should exclude SDTY
        better_thursday = [etf for etf in thursday_etfs if 
                          etf['ticker'] != 'SDTY' and 
                          etf['riskVolatility'] < sdty_data['riskVolatility'] and
                          etf['divCaptureReturn'] >= (sdty_data['divCaptureReturn'] * 0.9)]
        
        print(f'\nETFs that should exclude SDTY (lower risk + similar/better DC):')
        for etf in better_thursday:
            print(f'  {etf["ticker"]}: {etf["riskVolatility"]:.1%} risk (vs SDTY {sdty_data["riskVolatility"]:.1%}), {etf["divCaptureReturn"]:.1%} DC (vs SDTY {sdty_data["divCaptureReturn"]:.1%})')
            
    else:
        print(f'Failed to fetch data: {response.status_code}')
except Exception as e:
    print(f'Error: {e}')
