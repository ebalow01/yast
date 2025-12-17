"""
Market Condition Monitor
Tracks Fear/Greed Index, VIX, and provides options strategy recommendations
"""

import requests
import os
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv
import yfinance as yf

# Load environment variables
load_dotenv()

class MarketMonitor:
    """Monitor market conditions for options trading strategy"""

    def __init__(self):
        self.fear_greed_url = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"
        self.polygon_api_key = os.getenv('POLYGON_API_KEY')
        self.current_vix = None
        self.fear_greed_value = None
        self.fear_greed_rating = None

    def get_fear_greed_index(self):
        """Fetch current Fear & Greed Index from CNN"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
            }
            response = requests.get(self.fear_greed_url, headers=headers, timeout=10)

            if response.status_code == 200:
                data = response.json()

                # Get current value
                self.fear_greed_value = float(data['fear_and_greed']['score'])
                self.fear_greed_rating = data['fear_and_greed']['rating']

                return True
            else:
                print(f"ERROR: Failed to fetch Fear/Greed Index (Status {response.status_code})")
                print(f"Note: CNN may be blocking automated requests")
                return False
        except Exception as e:
            print(f"ERROR: {e}")
            return False

    def get_vix(self):
        """Fetch current VIX (Volatility Index) - try Polygon, fallback to yfinance"""
        # Try Polygon first if API key available
        if self.polygon_api_key:
            try:
                # Get today's date and yesterday's date
                today = datetime.now().strftime('%Y-%m-%d')
                yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')

                # Polygon API endpoint for VIX
                url = f"https://api.polygon.io/v2/aggs/ticker/I:VIX/range/1/day/{yesterday}/{today}"
                params = {
                    'apiKey': self.polygon_api_key,
                    'adjusted': 'true',
                    'sort': 'desc',
                    'limit': 1
                }

                response = requests.get(url, params=params, timeout=10)

                if response.status_code == 200:
                    data = response.json()
                    if 'results' in data and len(data['results']) > 0:
                        self.current_vix = data['results'][0]['c']  # Close price
                        return True
            except Exception:
                pass  # Fall through to yfinance fallback

        # Fallback to yfinance (free, no API key needed)
        try:
            vix = yf.Ticker("^VIX")
            data = vix.history(period="1d")

            if len(data) > 0:
                self.current_vix = data['Close'].iloc[-1]
                return True
            else:
                print("ERROR: No VIX data available")
                return False
        except Exception as e:
            print(f"ERROR fetching VIX: {e}")
            return False

    def get_voo_price(self):
        """Get current VOO price from Polygon (Real-time)"""
        try:
            if not self.polygon_api_key:
                print("ERROR: No Polygon API key found")
                return None

            # Get today's date and yesterday's date for fallback
            today = datetime.now().strftime('%Y-%m-%d')
            yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')

            # Try to get latest price
            url = f"https://api.polygon.io/v2/aggs/ticker/VOO/range/1/day/{yesterday}/{today}"
            params = {
                'apiKey': self.polygon_api_key,
                'adjusted': 'true',
                'sort': 'desc',
                'limit': 1
            }

            response = requests.get(url, params=params, timeout=10)

            if response.status_code == 200:
                data = response.json()
                if 'results' in data and len(data['results']) > 0:
                    return data['results'][0]['c']  # Close price
                else:
                    print("ERROR: No VOO price data in response")
                    return None
            else:
                print(f"ERROR: Failed to fetch VOO price (Status {response.status_code})")
                return None

        except Exception as e:
            print(f"ERROR fetching VOO: {e}")
            return None

    def classify_fear_greed(self, value):
        """Classify Fear/Greed value into categories"""
        if value <= 20:
            return "EXTREME FEAR", "<!>"
        elif value <= 40:
            return "FEAR", "[!]"
        elif value <= 60:
            return "NEUTRAL", "[-]"
        elif value <= 80:
            return "GREED", "[+]"
        else:
            return "EXTREME GREED", "<!>"

    def classify_vix(self, value):
        """Classify VIX level"""
        if value < 15:
            return "LOW (Complacent)", "[OK]"
        elif value < 20:
            return "NORMAL", "[-]"
        elif value < 30:
            return "ELEVATED", "[!]"
        else:
            return "HIGH (Panic)", "<!>"

    def get_strategy_recommendation(self):
        """Provide strategy recommendation based on market conditions"""
        if self.fear_greed_value is None or self.current_vix is None:
            return "Unable to provide recommendation - missing data"

        fg_category, _ = self.classify_fear_greed(self.fear_greed_value)
        vix_category, _ = self.classify_vix(self.current_vix)

        # Extreme Fear + High VIX = AGGRESSIVE PUT SELLING
        if self.fear_greed_value <= 20 and self.current_vix >= 30:
            return """
+---------------------------------------------------------------+
| <!> EXTREME FEAR + HIGH VOLATILITY - AGGRESSIVE MODE! <!>     |
+---------------------------------------------------------------+

STRATEGY: AGGRESSIVE CASH-SECURED PUT SELLING

Why: Market is panicking, premiums are HUGE, opportunity to buy cheap

ACTION PLAN:
1. CLOSE covered calls (buy back for pennies)
2. SELL 9 cash-secured puts
   - Strike: $10-20 below current price
   - Premium: Will be 3-5x normal (IV spike)
   - GOAL: Get assigned at discount prices

3. Expected outcome:
   - Either: Collect massive premium ($10k-20k)
   - Or: Get assigned 900 shares at 10-15% discount

4. After assignment: Ride recovery with covered calls

[$] PROFIT POTENTIAL: $100k-200k during crash → recovery cycle
            """

        # Extreme Fear but VIX not elevated = Buying opportunity
        elif self.fear_greed_value <= 20:
            return r"""
+-------------------------------------------------------------+
| [!] EXTREME FEAR - OPPORTUNITY ZONE                          |
+-------------------------------------------------------------+

STRATEGY: START SELLING PUTS (Moderate Aggression)

Why: Fear is high but volatility hasn't spiked yet

ACTION:
1. Start selling cash-secured puts
   - Strike: $5-10 below current price
   - Premium: 2-3x normal
   - Get ready for potential assignment

2. Keep some cash ready for more aggressive puts if VIX spikes

[$] PROFIT POTENTIAL: $50k-100k over next 3-6 months
            """

        # Fear (not extreme) + Normal market = Pure Covered Calls
        elif self.fear_greed_value <= 40:
            return """
+-------------------------------------------------------------+
| [-] SLIGHT FEAR - COVERED CALL MODE (CURRENT OPTIMAL)        |
+-------------------------------------------------------------+

STRATEGY: PURE COVERED CALLS (No Rolling)

Why: Flat/sideways market expected, premium collection optimal

ACTION:
1. Sell 9 covered calls
   - Strike: $5 OTM
   - Expiration: 14 DTE (2 weeks)
   - Let expire worthless, repeat

2. Expected: $4,500-6,000 every 2 weeks
3. NO ROLLING (maximize premium in flat market)

[$] PROFIT POTENTIAL: $100k-130k annually
            """

        # Neutral = Covered Calls
        elif self.fear_greed_value <= 60:
            return """
+-------------------------------------------------------------+
| [+] NEUTRAL - STEADY COVERED CALL MODE                       |
+-------------------------------------------------------------+

STRATEGY: COVERED CALLS (Moderate Management)

ACTION:
1. Sell covered calls $5 OTM, 14 DTE
2. Consider rolling up if stock approaches strike
3. Collect steady premium

[$] PROFIT POTENTIAL: $80k-120k annually
            """

        # Greed = Covered Calls with caution
        elif self.fear_greed_value <= 80:
            return r"""
+-------------------------------------------------------------+
| [!]  GREED - CAUTION MODE                                    |
+-------------------------------------------------------------+

STRATEGY: COVERED CALLS (Be Ready for Pullback)

Why: Market is greedy, pullback risk increasing

ACTION:
1. Continue covered calls $5 OTM
2. Keep strikes closer (don't get too aggressive)
3. Be ready to switch to puts if fear spikes

[$] PROFIT POTENTIAL: $70k-100k annually (conservative)
            """

        # Extreme Greed = High risk
        else:
            return r"""
+-------------------------------------------------------------+
| <!> EXTREME GREED - HIGH RISK!                               |
+-------------------------------------------------------------+

STRATEGY: DEFENSIVE COVERED CALLS + CASH RESERVES

Why: Market is euphoric, crash risk elevated

ACTION:
1. Reduce position size or go more conservative
2. Sell farther OTM calls ($10-15 OTM)
3. Keep 30-40% cash ready for crash opportunity
4. Monitor daily for fear spike

[\!]  WARNING: Extreme greed often precedes corrections
            """

    def display_dashboard(self):
        """Display market condition dashboard"""
        print("="*70)
        print(" " * 15 + "MARKET CONDITION MONITOR")
        print("="*70)
        print(f"Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70)
        print()

        # Fear & Greed Index
        if self.fear_greed_value is not None:
            fg_category, fg_emoji = self.classify_fear_greed(self.fear_greed_value)
            print(f"[INDEX] CNN FEAR & GREED INDEX")
            print(f"   Value: {self.fear_greed_value:.0f}/100")
            print(f"   Rating: {self.fear_greed_rating}")
            print(f"   Category: {fg_emoji} {fg_category}")
            print()

        # VIX
        if self.current_vix is not None:
            vix_category, vix_emoji = self.classify_vix(self.current_vix)
            print(f"[VIX] CBOE VOLATILITY INDEX")
            print(f"   Value: {self.current_vix:.2f}")
            print(f"   Status: {vix_emoji} {vix_category}")
            print()

        # VOO Price
        voo_price = self.get_voo_price()
        if voo_price:
            print(f"[VOO] CURRENT PRICE")
            print(f"   ${voo_price:.2f}")
            print()

        print("="*70)
        print("STRATEGY RECOMMENDATION")
        print("="*70)

        recommendation = self.get_strategy_recommendation()
        print(recommendation)
        print()
        print("="*70)

    def check_alerts(self):
        """Check for alert conditions"""
        alerts = []

        if self.fear_greed_value is not None:
            if self.fear_greed_value <= 20:
                alerts.append("<!> EXTREME FEAR - TIME TO GET AGGRESSIVE!")
            elif self.fear_greed_value >= 80:
                alerts.append("[!] EXTREME GREED - PREPARE FOR PULLBACK!")

        if self.current_vix is not None:
            if self.current_vix >= 30:
                alerts.append("<!> VIX SPIKE - VOLATILITY EXTREME!")
            elif self.current_vix < 12:
                alerts.append("[!] VIX TOO LOW - COMPLACENCY WARNING!")

        return alerts

    def run_monitor(self):
        """Run full market monitor"""
        print("\nFetching market data...")

        # Fetch data
        fg_success = self.get_fear_greed_index()
        vix_success = self.get_vix()

        if not fg_success and not vix_success:
            print("ERROR: Unable to fetch market data")
            return

        # Display dashboard
        self.display_dashboard()

        # Check for alerts
        alerts = self.check_alerts()
        if alerts:
            print("🔔 ACTIVE ALERTS:")
            for alert in alerts:
                print(f"   {alert}")
            print()


def main():
    monitor = MarketMonitor()
    monitor.run_monitor()


if __name__ == "__main__":
    main()
