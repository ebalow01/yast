#!/usr/bin/env python3
"""
Test Polygon API access and limitations
"""
import requests
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()
POLYGON_API_KEY = os.getenv('POLYGON_API_KEY')

def test_polygon_access():
    print("Testing Polygon API access levels...")
    print("=" * 50)
    
    # Test with SPY (should exist and be accessible)
    ticker = "SPY"
    
    # Test 1: Recent data (last month)
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    
    print(f"\nTest 1: Recent data for {ticker} ({start_date} to {end_date})")
    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{start_date}/{end_date}"
    response = requests.get(url, params={'apikey': POLYGON_API_KEY})
    data = response.json()
    print(f"Status: {response.status_code}")
    print(f"Response: {data.get('status', 'unknown')} - {data.get('message', '')}")
    if data.get('results'):
        print(f"Data points: {len(data['results'])}")
    
    # Test 2: 2023 data
    print(f"\nTest 2: 2023 data for {ticker}")
    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/2023-01-01/2023-01-31"
    response = requests.get(url, params={'apikey': POLYGON_API_KEY})
    data = response.json()
    print(f"Status: {response.status_code}")
    print(f"Response: {data.get('status', 'unknown')} - {data.get('message', '')}")
    if data.get('results'):
        print(f"Data points: {len(data['results'])}")
    
    # Test 3: 2020 data
    print(f"\nTest 3: 2020 data for {ticker}")
    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/2020-01-01/2020-01-31"
    response = requests.get(url, params={'apikey': POLYGON_API_KEY})
    data = response.json()
    print(f"Status: {response.status_code}")
    print(f"Response: {data.get('status', 'unknown')} - {data.get('message', '')}")
    if data.get('results'):
        print(f"Data points: {len(data['results'])}")
    
    # Test 4: 2018 data
    print(f"\nTest 4: 2018 data for {ticker}")
    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/2018-01-01/2018-01-31"
    response = requests.get(url, params={'apikey': POLYGON_API_KEY})
    data = response.json()
    print(f"Status: {response.status_code}")
    print(f"Response: {data.get('status', 'unknown')} - {data.get('message', '')}")
    if data.get('results'):
        print(f"Data points: {len(data['results'])}")
    
    # Test 5: Account info (if available)
    print(f"\nTest 5: Account status")
    url = f"https://api.polygon.io/v1/marketstatus/now"
    response = requests.get(url, params={'apikey': POLYGON_API_KEY})
    data = response.json()
    print(f"Status: {response.status_code}")
    print(f"Market status response: {data.get('status', 'unknown')}")

if __name__ == "__main__":
    test_polygon_access()