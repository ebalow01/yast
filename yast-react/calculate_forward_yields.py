#!/usr/bin/env python3
"""
Calculate forward yields for all ETFs and update the dividendData.ts file.
Forward Yield = (median of last 3 dividends) ÷ current stock price × 52
"""

import yfinance as yf
import json
import re
import sys
from typing import Dict, Any

def fetch_current_prices(tickers: list) -> Dict[str, float]:
    """Fetch current stock prices for all tickers."""
    prices = {}
    print("Fetching current prices...")
    
    for ticker in tickers:
        try:
            stock = yf.Ticker(ticker)
            data = stock.history(period="2d")
            if not data.empty:
                price = float(data['Close'].iloc[-1])
                prices[ticker] = price
                print(f"{ticker}: ${price:.2f}")
            else:
                print(f"{ticker}: No data available - using default")
                prices[ticker] = 1.0  # Default fallback
        except Exception as e:
            print(f"{ticker}: Error - {e} - using default")
            prices[ticker] = 1.0  # Default fallback
    
    return prices

def calculate_forward_yield(median_dividend: float, current_price: float) -> float:
    """Calculate forward yield: (median dividend * 52) / current price * 100"""
    if current_price <= 0:
        return 0.0
    return (median_dividend * 52 / current_price) * 100

def extract_data_from_ts_file(file_path: str) -> list:
    """Extract dividend data from TypeScript file."""
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Find the dividendData array
    array_start = content.find('export const dividendData: Asset[] = [')
    if array_start == -1:
        raise ValueError("Could not find dividendData array in file")
    
    array_start = content.find('[', array_start)
    array_end = content.find('];', array_start)
    
    if array_end == -1:
        raise ValueError("Could not find end of dividendData array")
    
    array_content = content[array_start + 1:array_end]
    
    # Parse each asset object
    assets = []
    objects = re.findall(r'\{([^}]+)\}', array_content, re.DOTALL)
    
    for obj_content in objects:
        asset = {}
        lines = obj_content.strip().split('\n')
        
        for line in lines:
            line = line.strip().rstrip(',')
            if ':' in line and not line.startswith('//'):
                key_val = line.split(':', 1)
                if len(key_val) == 2:
                    key = key_val[0].strip().strip('"')
                    value = key_val[1].strip().strip('"')
                    
                    # Convert numeric values
                    if key in ['return', 'risk', 'buyHoldReturn', 'dividendCaptureReturn', 
                              'finalValue', 'winRate', 'medianDividend', 'tradingDays', 
                              'dividendCapture', 'forwardYield']:
                        try:
                            asset[key] = float(value)
                        except ValueError:
                            asset[key] = 0.0
                    else:
                        asset[key] = value
        
        if 'ticker' in asset:
            assets.append(asset)
    
    return assets

def update_ts_file_with_forward_yields(file_path: str, assets_with_yields: list):
    """Update the TypeScript file with forward yield data."""
    
    # Read the original file
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Build new asset objects with forward yields
    new_assets_text = []
    
    for asset in assets_with_yields:
        # Format numbers properly
        def format_number(value):
            if isinstance(value, float) and value.is_integer():
                return int(value)
            return value
        
        obj_lines = [
            '  {',
            f'    "ticker": "{asset["ticker"]}",',
            f'    "return": {format_number(asset["return"])},',
            f'    "risk": {format_number(asset["risk"])},',
            f'    "buyHoldReturn": {format_number(asset["buyHoldReturn"])},',
            f'    "dividendCaptureReturn": {format_number(asset["dividendCaptureReturn"])},',
            f'    "bestStrategy": "{asset["bestStrategy"]}",',
            f'    "finalValue": {format_number(asset["finalValue"])},',
            f'    "winRate": {format_number(asset["winRate"])},',
            f'    "medianDividend": {asset["medianDividend"]},',
            f'    "tradingDays": {format_number(asset["tradingDays"])},',
            f'    "exDivDay": "{asset["exDivDay"]}",',
            f'    "dividendCapture": {format_number(asset["dividendCapture"])},',
            f'    "forwardYield": {asset["forwardYield"]:.1f}',
            '  }'
        ]
        new_assets_text.append('\n'.join(obj_lines))
    
    # Join all assets
    new_array_content = ',\n'.join(new_assets_text)
    
    # Replace the array content in the file
    array_start = content.find('export const dividendData: Asset[] = [')
    array_start = content.find('[', array_start)
    array_end = content.find('];', array_start)
    
    new_content = (
        content[:array_start + 1] + '\n' +
        new_array_content + '\n' +
        content[array_end:]
    )
    
    # Write back to file
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(new_content)

def main():
    # File path
    ts_file_path = r"c:\Users\ebalo\yast\yast-react\src\data\dividendData.ts"
    
    try:
        # Extract current data
        print("Extracting data from TypeScript file...")
        assets = extract_data_from_ts_file(ts_file_path)
        print(f"Found {len(assets)} assets")
        
        # Get all tickers
        tickers = [asset['ticker'] for asset in assets]
        
        # Fetch current prices
        current_prices = fetch_current_prices(tickers)
        
        # Calculate forward yields
        print("\nCalculating forward yields...")
        for asset in assets:
            ticker = asset['ticker']
            median_dividend = asset.get('medianDividend', 0.0)
            current_price = current_prices.get(ticker, 1.0)
            
            forward_yield = calculate_forward_yield(median_dividend, current_price)
            asset['forwardYield'] = forward_yield
            
            print(f"{ticker}: {median_dividend:.3f} * 52 / ${current_price:.2f} = {forward_yield:.1f}%")
        
        # Update the file
        print("\nUpdating TypeScript file...")
        update_ts_file_with_forward_yields(ts_file_path, assets)
        
        print(f"\nSuccessfully updated {ts_file_path} with forward yields!")
        
        # Show summary
        sorted_by_yield = sorted(assets, key=lambda x: x['forwardYield'], reverse=True)
        print("\nTop 10 Forward Yields:")
        for i, asset in enumerate(sorted_by_yield[:10], 1):
            print(f"{i:2d}. {asset['ticker']:5s}: {asset['forwardYield']:5.1f}%")
    
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
