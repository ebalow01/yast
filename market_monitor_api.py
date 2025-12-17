"""
Flask API for Market Monitor
Serves market condition data to React dashboard
"""

from flask import Flask, jsonify
from flask_cors import CORS
from market_monitor import MarketMonitor
import traceback

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

@app.route('/api/market-conditions', methods=['GET'])
def get_market_conditions():
    """Get current market conditions"""
    try:
        monitor = MarketMonitor()

        # Fetch data
        fg_success = monitor.get_fear_greed_index()
        vix_success = monitor.get_vix()
        voo_price = monitor.get_voo_price()

        # Get classification
        fg_category, fg_emoji = monitor.classify_fear_greed(monitor.fear_greed_value) if monitor.fear_greed_value else ("Unknown", "")
        vix_category, vix_emoji = monitor.classify_vix(monitor.current_vix) if monitor.current_vix else ("Unknown", "")

        # Get strategy recommendation
        recommendation = monitor.get_strategy_recommendation()

        # Get alerts
        alerts = monitor.check_alerts()

        return jsonify({
            'success': True,
            'data': {
                'fearGreedIndex': {
                    'value': monitor.fear_greed_value,
                    'rating': monitor.fear_greed_rating,
                    'category': fg_category,
                    'emoji': fg_emoji
                },
                'vix': {
                    'value': monitor.current_vix,
                    'category': vix_category,
                    'emoji': vix_emoji
                },
                'vooPrice': voo_price,
                'recommendation': recommendation,
                'alerts': alerts,
                'timestamp': __import__('datetime').datetime.now().isoformat()
            }
        })

    except Exception as e:
        print(f"ERROR in get_market_conditions: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    print("="*70)
    print("Market Monitor API Server")
    print("="*70)
    print("Starting Flask server on http://localhost:5000")
    print("Endpoints:")
    print("  GET /api/market-conditions - Get current market data")
    print("  GET /api/health - Health check")
    print("="*70)
    app.run(host='0.0.0.0', port=5000, debug=True)
