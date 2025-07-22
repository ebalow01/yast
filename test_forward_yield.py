#!/usr/bin/env python3
"""
Test forward yield calculation
"""
import yfinance as yf

def test_forward_yield(ticker, median_dividend):
    try:
        print(f"\nTesting {ticker}:")
        print(f"  Median dividend: ${median_dividend}")
        
        stock = yf.Ticker(ticker)
        current_price = stock.info.get('regularMarketPrice') or stock.info.get('previousClose')
        
        if not current_price:
            recent_data = stock.history(period="5d")
            if not recent_data.empty:
                current_price = recent_data['Close'].iloc[-1]
        
        print(f"  Current price: ${current_price}")
        
        if current_price and median_dividend > 0:
            forward_yield = (median_dividend * 52 / current_price) * 100
            print(f"  Forward yield: {forward_yield:.1f}%")
            return forward_yield
        else:
            print(f"  Could not calculate - price: {current_price}, dividend: {median_dividend}")
            return None
            
    except Exception as e:
        print(f"  Error: {e}")
        return None

# Test a few ETFs
test_cases = [
    ("ULTY", 0.49),
    ("YMAX", 0.45),
    ("QDTE", 0.38)
]

for ticker, dividend in test_cases:
    test_forward_yield(ticker, dividend)
