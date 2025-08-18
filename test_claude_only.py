#!/usr/bin/env python3
"""
Simple test script to test just the Claude API analysis
Uses a sample chart image to test Claude integration without browser automation
"""

import base64
import json
import os
from datetime import datetime
import requests

# Configuration
TICKER = "YMAX"  # Test ticker

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

def create_sample_image():
    """Create a simple test image to verify the API works"""
    import io
    try:
        from PIL import Image, ImageDraw, ImageFont
        
        # Create a simple chart-like image
        img = Image.new('RGB', (800, 400), color='white')
        draw = ImageDraw.Draw(img)
        
        # Draw some simple lines to simulate a chart
        draw.rectangle([50, 50, 750, 350], outline='black', width=2)
        draw.line([100, 200, 200, 150, 300, 180, 400, 120, 500, 160, 600, 100, 700, 140], fill='blue', width=3)
        draw.text((300, 20), f"{TICKER} - Sample Chart", fill='black')
        
        # Save to bytes
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        return buffer.getvalue()
        
    except ImportError:
        print("[INFO] PIL not available, creating minimal test image")
        # Create a minimal 1x1 pixel PNG
        return base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        )

def analyze_with_claude(image_data, ticker):
    """Send image to Claude for analysis"""
    print(f"[INFO] Testing Claude API with {ticker}...")
    
    if not CLAUDE_API_KEY:
        print("[ERROR] CLAUDE_API_KEY not found")
        return None
    
    # Convert image to base64
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    
    # Claude API request
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
    }
    
    prompt = f"""This is a test of automated chart analysis for {ticker}. 

Even though this may be a simple test image, please provide a sample analysis response that includes:
1. Short-term outlook 
2. Technical assessment
3. Risk level
4. Key observations

Format it as if you were analyzing a real financial chart."""
    
    payload = {
        'model': 'claude-3-5-sonnet-20241022',
        'max_tokens': 800,
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
        print("[INFO] Sending request to Claude API...")
        response = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers=headers,
            json=payload,
            timeout=30
        )
        
        print(f"[INFO] Claude API Response: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            analysis = result['content'][0]['text']
            print(f"[SUCCESS] Analysis completed ({len(analysis)} characters)")
            return analysis
        else:
            print(f"[ERROR] Claude API error: {response.status_code}")
            print(f"Response: {response.text[:500]}...")
            return None
            
    except Exception as e:
        print(f"[ERROR] Claude API request failed: {e}")
        return None

def main():
    """Main test function"""
    print(f"[START] Testing Claude API integration for {TICKER}")
    print(f"[START] Started at: {datetime.now()}")
    
    # Check if API key is available
    if not CLAUDE_API_KEY:
        print("[ERROR] Please set CLAUDE_API_KEY in .env file or environment variable")
        return
    
    print(f"[INFO] API Key found: {CLAUDE_API_KEY[:20]}...")
    
    # Step 1: Create/get test image
    print("[INFO] Creating test image...")
    image_data = create_sample_image()
    print(f"[INFO] Test image created ({len(image_data)} bytes)")
    
    # Step 2: Test Claude API
    analysis = analyze_with_claude(image_data, TICKER)
    if not analysis:
        print("[ERROR] Failed to get analysis from Claude")
        return
    
    # Step 3: Display results
    print(f"\n[ANALYSIS] CLAUDE API TEST RESULTS:")
    print("=" * 60)
    print(analysis)
    print("=" * 60)
    
    # Save results
    timestamp = datetime.now()
    results = {
        'ticker': TICKER,
        'timestamp': timestamp.isoformat(),
        'test_type': 'claude_api_only',
        'analysis': analysis,
        'api_key_length': len(CLAUDE_API_KEY),
        'image_size': len(image_data)
    }
    
    output_file = f"claude_test_{TICKER}_{timestamp.strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n[SUCCESS] Test completed successfully!")
    print(f"[INFO] Results saved to: {output_file}")
    print(f"[END] Finished at: {datetime.now()}")

if __name__ == "__main__":
    main()