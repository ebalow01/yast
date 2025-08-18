#!/usr/bin/env python3
"""
Test script for automated ticker chart analysis
Tests Puppeteer screenshot + Claude API integration
"""

import asyncio
import base64
import json
import os
from datetime import datetime
import requests
from pyppeteer import launch

# Configuration
TICKER = "YMAX"  # Test with one ticker first

# Try to read API key from .env file first, then environment
CLAUDE_API_KEY = ""
try:
    with open('.env', 'r') as f:
        for line in f:
            if line.startswith('CLAUDE_API_KEY='):
                CLAUDE_API_KEY = line.split('=', 1)[1].strip()
                break
except FileNotFoundError:
    pass

# Fallback to environment variable if not found in .env
if not CLAUDE_API_KEY:
    CLAUDE_API_KEY = os.getenv('CLAUDE_API_KEY', '')

OUTPUT_FILE = f"test_analysis_{TICKER}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

async def capture_yahoo_chart(ticker):
    """Capture Yahoo Finance chart screenshot"""
    print(f"[INFO] Capturing chart for {ticker}...")
    
    try:
        # Launch browser
        browser = await launch(
            headless=False,  # Set to True for production
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        
        page = await browser.newPage()
        
        # Set viewport
        await page.setViewport({'width': 1200, 'height': 800})
        
        # Navigate to Yahoo Finance chart
        url = f"https://finance.yahoo.com/quote/{ticker}/chart"
        print(f"[INFO] Navigating to: {url}")
        
        await page.goto(url, {'waitUntil': 'networkidle2'})
        
        # Wait for chart to load
        await page.waitForSelector('[data-test="chart-canvas"]', {'timeout': 10000})
        
        # Additional wait for chart rendering
        await asyncio.sleep(3)
        
        # Take screenshot of chart area
        screenshot = await page.screenshot({
            'clip': {
                'x': 100,      # Adjust based on chart position
                'y': 200,      # Adjust based on chart position  
                'width': 800,  # Chart width
                'height': 400  # Chart height
            }
        })
        
        await browser.close()
        
        print(f"[SUCCESS] Screenshot captured ({len(screenshot)} bytes)")
        return screenshot
        
    except Exception as e:
        print(f"[ERROR] Screenshot failed: {e}")
        if 'browser' in locals():
            await browser.close()
        return None

def analyze_with_claude(screenshot_data, ticker):
    """Send screenshot to Claude for analysis"""
    print(f"[INFO] Analyzing {ticker} with Claude...")
    
    if not CLAUDE_API_KEY:
        print("[ERROR] CLAUDE_API_KEY not found in environment")
        return None
    
    # Convert screenshot to base64
    image_base64 = base64.b64encode(screenshot_data).decode('utf-8')
    
    # Claude API request
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
    }
    
    prompt = f"""Analyze this Yahoo Finance candlestick chart for {ticker}. 

Please provide:
1. Short-term outlook (1-2 weeks)
2. Key technical patterns you observe
3. Risk assessment based on recent price action
4. Any significant support/resistance levels

Keep the analysis concise but informative."""
    
    payload = {
        'model': 'claude-3-5-sonnet-20241022',
        'max_tokens': 1000,
        'messages': [{
            'role': 'user',
            'content': [
                {
                    'type': 'text',
                    'text': prompt
                },
                {
                    'type': 'image',
                    'source': {
                        'type': 'base64',
                        'media_type': 'image/png',
                        'data': image_base64
                    }
                }
            ]
        }]
    }
    
    try:
        response = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            analysis = result['content'][0]['text']
            print(f"[SUCCESS] Analysis completed ({len(analysis)} characters)")
            return analysis
        else:
            print(f"[ERROR] Claude API error: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"[ERROR] Claude API request failed: {e}")
        return None

def save_results(ticker, screenshot, analysis):
    """Save results to files"""
    timestamp = datetime.now().isoformat()
    
    # Save screenshot
    screenshot_file = f"test_screenshot_{ticker}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    with open(screenshot_file, 'wb') as f:
        f.write(screenshot)
    print(f"[INFO] Screenshot saved: {screenshot_file}")
    
    # Save analysis results
    results = {
        'ticker': ticker,
        'timestamp': timestamp,
        'analysis': analysis,
        'screenshot_file': screenshot_file
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"[INFO] Analysis saved: {OUTPUT_FILE}")
    
    # Print analysis to console
    print(f"\n[ANALYSIS] ANALYSIS FOR {ticker}:")
    print("=" * 50)
    print(analysis)
    print("=" * 50)

async def main():
    """Main test function"""
    print(f"[START] Starting automated analysis test for {TICKER}")
    print(f"[START] Started at: {datetime.now()}")
    
    # Check if API key is available
    if not CLAUDE_API_KEY:
        print("[ERROR] Please set CLAUDE_API_KEY environment variable")
        return
    
    # Step 1: Capture screenshot
    screenshot = await capture_yahoo_chart(TICKER)
    if not screenshot:
        print("[ERROR] Failed to capture screenshot, aborting")
        return
    
    # Step 2: Analyze with Claude
    analysis = analyze_with_claude(screenshot, TICKER)
    if not analysis:
        print("[ERROR] Failed to get analysis, saving screenshot only")
        with open(f"failed_screenshot_{TICKER}.png", 'wb') as f:
            f.write(screenshot)
        return
    
    # Step 3: Save results
    save_results(TICKER, screenshot, analysis)
    
    print(f"[SUCCESS] Test completed successfully!")
    print(f"[END] Finished at: {datetime.now()}")

if __name__ == "__main__":
    # Check dependencies
    try:
        import pyppeteer
        import requests
        print("[INFO] Dependencies found")
    except ImportError as e:
        print(f"[ERROR] Missing dependency: {e}")
        print("Install with: pip install pyppeteer requests")
        exit(1)
    
    # Run the test
    asyncio.run(main())