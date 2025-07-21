import requests

try:
    response = requests.get('https://yetanotherstocktracker.com/data/performance_data.json', timeout=10)
    if response.status_code == 200:
        data = response.json()
        
        # Find all Thursday ETFs
        thursday_etfs = [item for item in data if item['exDivDay'] == 'Thursday']
        
        print('Thursday Ex-Dividend ETFs:')
        for etf in sorted(thursday_etfs, key=lambda x: x['divCaptureReturn'], reverse=True):
            print(f'  {etf["ticker"]}: {etf["divCaptureReturn"]:.1%} div capture, {etf["riskVolatility"]:.1%} risk, {etf["bestReturn"]:.1%} best return')
        
        # Find LFGW specifically
        lfgw_data = [item for item in data if item['ticker'] == 'LFGW']
        if lfgw_data:
            lfgw = lfgw_data[0]
            print(f'\nLFGW Analysis:')
            print(f'  Div Capture: {lfgw["divCaptureReturn"]:.1%}')
            print(f'  Risk: {lfgw["riskVolatility"]:.1%}')
            print(f'  Ex-Div: {lfgw["exDivDay"]}')
            print(f'  Rule 2 qualified (>30% div capture): {lfgw["divCaptureReturn"] > 0.30}')
            
            # Find better Thursday alternatives
            better_thursday = [etf for etf in thursday_etfs if etf['divCaptureReturn'] > lfgw['divCaptureReturn'] and etf['ticker'] != 'LFGW']
            if better_thursday:
                print(f'  Better Thursday alternatives:')
                for etf in better_thursday:
                    print(f'    {etf["ticker"]}: {etf["divCaptureReturn"]:.1%} div capture')
        
    else:
        print(f'Failed to fetch data: {response.status_code}')
except Exception as e:
    print(f'Error: {e}')
