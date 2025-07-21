import json
import requests

# Try to fetch the performance data from the deployed site
try:
    response = requests.get('https://yetanotherstocktracker.com/data/performance_data.json')
    if response.status_code == 200:
        data = response.json()
        # Find AAPW
        aapw_data = [item for item in data if item['ticker'] == 'AAPW']
        if aapw_data:
            aapw = aapw_data[0]
            print('AAPW Data:')
            print(f'  Ticker: {aapw["ticker"]}')
            print(f'  Ex-Div Day: {aapw["exDivDay"]}')
            print(f'  Best Return: {aapw["bestReturn"]:.1%}')
            print(f'  Risk: {aapw["riskVolatility"]:.1%}')
            print(f'  Div Capture Return: {aapw["divCaptureReturn"]:.1%}')
            print(f'  Category: {aapw["category"]}')
            
            # Check if there are other ETFs on the same ex-div day
            same_exdiv = [item for item in data if item['exDivDay'] == aapw['exDivDay'] and item['ticker'] != 'AAPW']
            print(f'\nOther ETFs on {aapw["exDivDay"]}:')
            for etf in same_exdiv:
                print(f'  {etf["ticker"]}: {etf["riskVolatility"]:.1%} risk, {etf["bestReturn"]:.1%} return')
                
            # Check if AAPW should qualify for any rules
            print(f'\nRule Analysis:')
            print(f'  Rule 1 (>40% return AND <40% risk): {aapw["bestReturn"] > 0.40 and aapw["riskVolatility"] < 0.40}')
            print(f'  Rule 2 (>30% div capture): {aapw["divCaptureReturn"] > 0.30}')
            
            # Check if AAPW gets filtered out due to high risk with lower-risk alternative
            if aapw["riskVolatility"] > 0.40:
                lower_risk_alternatives = [etf for etf in same_exdiv if etf["riskVolatility"] < aapw["riskVolatility"]]
                print(f'  High-risk filter: AAPW has {aapw["riskVolatility"]:.1%} risk')
                if lower_risk_alternatives:
                    print(f'  Lower-risk alternatives on same day: {[etf["ticker"] for etf in lower_risk_alternatives]}')
                else:
                    print(f'  No lower-risk alternatives found - AAPW should be included!')
        else:
            print('AAPW not found in data')
    else:
        print(f'Failed to fetch data: {response.status_code}')
except Exception as e:
    print(f'Error: {e}')
