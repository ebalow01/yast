import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('POLYGON_API_KEY')
print(f'API Key loaded: {"Yes" if api_key else "No"}')

# Test single ticker
ticker = 'PLTR'
try:
    url = f'https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/2025-07-01/2025-09-03'
    params = {'adjusted': 'true', 'sort': 'asc', 'apikey': api_key}
    response = requests.get(url, params=params, timeout=10)
    print(f'Status: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        print(f'Results: {len(data.get("results", []))} days')
        if data.get("results"):
            print(f'Price: ${data["results"][-1]["c"]}')
    else:
        print(f'Error: {response.text}')
except Exception as e:
    print(f'Exception: {e}')