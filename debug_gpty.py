import requests

try:
    response = requests.get('https://yetanotherstocktracker.com/data/performance_data.json', timeout=10)
    if response.status_code == 200:
        data = response.json()
        
        # Find GPTY specifically
        gpty_data = [item for item in data if item['ticker'] == 'GPTY'][0]
        print('GPTY Analysis:')
        print(f'  Ticker: {gpty_data["ticker"]}')
        print(f'  Ex-Div Day: {gpty_data["exDivDay"]}')
        print(f'  Div Capture Return: {gpty_data["divCaptureReturn"]:.1%}')
        print(f'  Best Return: {gpty_data["bestReturn"]:.1%}')
        print(f'  Risk: {gpty_data["riskVolatility"]:.1%}')
        print(f'  Best Strategy: {gpty_data["bestStrategy"]}')
        print(f'  Rule 1 qualified (>40% return AND <40% risk): {gpty_data["bestReturn"] > 0.40 and gpty_data["riskVolatility"] < 0.40}')
        print(f'  Rule 2 qualified (>30% div capture): {gpty_data["divCaptureReturn"] > 0.30}')
        
        # Find all Thursday ETFs and see competition
        thursday_etfs = [item for item in data if item['exDivDay'] == 'Thursday']
        print(f'\nThursday ETFs ranked by div capture:')
        for etf in sorted(thursday_etfs, key=lambda x: x["divCaptureReturn"], reverse=True):
            rule1 = etf['bestReturn'] > 0.40 and etf['riskVolatility'] < 0.40
            rule2 = etf['divCaptureReturn'] > 0.30
            print(f'  {etf["ticker"]}: {etf["divCaptureReturn"]:.1%} DC, {etf["riskVolatility"]:.1%} risk | Rule1: {rule1}, Rule2: {rule2}')
        
        # Check why GPTY isn't being filtered
        print(f'\nGPTY filtering analysis:')
        print(f'  GPTY qualifies for Rule 2: {gpty_data["divCaptureReturn"] > 0.30}')
        
        # Find better alternatives (lower risk + similar/better DC within 10%)
        better_alternatives = []
        for etf in thursday_etfs:
            if (etf['ticker'] != 'GPTY' and 
                etf['riskVolatility'] < gpty_data['riskVolatility'] and 
                etf['divCaptureReturn'] >= (gpty_data['divCaptureReturn'] * 0.9)):
                better_alternatives.append(etf)
        
        print(f'  Better alternatives (lower risk + >=90% of GPTY DC):')
        for etf in better_alternatives:
            print(f'    {etf["ticker"]}: {etf["riskVolatility"]:.1%} risk (vs GPTY {gpty_data["riskVolatility"]:.1%}), {etf["divCaptureReturn"]:.1%} DC (vs GPTY {gpty_data["divCaptureReturn"]:.1%})')
            print(f'      90% of GPTY DC = {(gpty_data["divCaptureReturn"] * 0.9):.1%}, this ETF has {etf["divCaptureReturn"]:.1%}')
            
    else:
        print(f'Failed to fetch data: {response.status_code}')
except Exception as e:
    print(f'Error: {e}')
