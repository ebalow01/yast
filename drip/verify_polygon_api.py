import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def verify_polygon_api():
    """Verify that the Polygon API key is accessible and working"""
    
    # Get API key from environment
    api_key = os.getenv('POLYGON_API_KEY')
    
    if not api_key:
        print("❌ POLYGON_API_KEY not found in environment variables")
        return False
    
    print(f"✅ API Key found: {api_key[:10]}...")
    
    # Test the API key with a simple request (get ticker details for AAPL)
    url = f"https://api.polygon.io/v3/reference/tickers/AAPL?apikey={api_key}"
    
    try:
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'OK':
                print("✅ API Key is valid and working!")
                print(f"   Test ticker: {data['results']['ticker']} - {data['results']['name']}")
                return True
            else:
                print(f"❌ API returned unexpected status: {data.get('status')}")
                return False
        else:
            print(f"❌ API request failed with status code: {response.status_code}")
            if response.status_code == 401:
                print("   Invalid API key")
            elif response.status_code == 429:
                print("   Rate limit exceeded")
            return False
            
    except Exception as e:
        print(f"❌ Error testing API: {e}")
        return False

if __name__ == "__main__":
    print("Polygon API Key Verification")
    print("-" * 30)
    verify_polygon_api()