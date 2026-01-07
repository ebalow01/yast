"""
Netlify serverless function for stock technical analysis
Fetches Polygon data and generates AI analysis prompt
"""

import os
import json
import requests
from datetime import datetime, timedelta
from urllib.parse import parse_qs

try:
    import pytz
    TIMEZONE_SUPPORT = True
except ImportError:
    TIMEZONE_SUPPORT = False

POLYGON_API_KEY = os.environ.get('POLYGON_API_KEY', '')


def get_polygon_data(ticker):
    """Fetch data from Polygon API"""
    if not POLYGON_API_KEY:
        return None, "POLYGON_API_KEY not configured"

    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')

    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/15/minute/{start_date}/{end_date}?adjusted=true&sort=asc&apikey={POLYGON_API_KEY}"

    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            data = response.json()
            if data.get('results'):
                return data, None
            else:
                return None, f"No data found for ticker {ticker}"
        else:
            return None, f"Polygon API error: {response.status_code}"
    except Exception as e:
        return None, f"Request failed: {str(e)}"


def calculate_risk_metrics(results, current_price, atr):
    """Calculate risk metrics for the analysis"""
    if len(results) < 20:
        return {
            'var_95': 0, 'cvar_95': 0, 'max_drawdown': 0,
            'sharpe_ratio': 0, 'win_rate': 0, 'volatility_percentile': 50
        }

    prices = [bar['c'] for bar in results]
    returns = [(prices[i] - prices[i-1]) / prices[i-1] for i in range(1, len(prices))]

    if not returns:
        return {
            'var_95': 0, 'cvar_95': 0, 'max_drawdown': 0,
            'sharpe_ratio': 0, 'win_rate': 0, 'volatility_percentile': 50
        }

    sorted_returns = sorted(returns)
    var_95_index = int(len(sorted_returns) * 0.05)
    var_95 = abs(sorted_returns[var_95_index]) * current_price if var_95_index < len(sorted_returns) else 0

    tail_returns = sorted_returns[:var_95_index] if var_95_index > 0 else [sorted_returns[0]]
    cvar_95 = abs(sum(tail_returns) / len(tail_returns)) * current_price if tail_returns else 0

    cumulative_max = prices[0]
    max_drawdown = 0
    for price in prices:
        if price > cumulative_max:
            cumulative_max = price
        drawdown = (cumulative_max - price) / cumulative_max
        if drawdown > max_drawdown:
            max_drawdown = drawdown

    mean_return = sum(returns) / len(returns)
    variance = sum([(r - mean_return) ** 2 for r in returns]) / len(returns)
    std_dev = variance ** 0.5
    sharpe_ratio = (mean_return / std_dev) if std_dev > 0 else 0

    positive_returns = [r for r in returns if r > 0]
    win_rate = (len(positive_returns) / len(returns)) * 100

    atr_values = []
    for i in range(14, len(results)):
        period_results = results[i-14:i]
        true_ranges = []
        for j in range(1, len(period_results)):
            high = period_results[j]['h']
            low = period_results[j]['l']
            prev_close = period_results[j-1]['c']
            tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
            true_ranges.append(tr)
        if true_ranges:
            atr_values.append(sum(true_ranges) / len(true_ranges))

    volatility_percentile = 50
    if atr_values and atr > 0:
        below_current = [a for a in atr_values if a <= atr]
        volatility_percentile = (len(below_current) / len(atr_values)) * 100

    return {
        'var_95': var_95, 'cvar_95': cvar_95, 'max_drawdown': max_drawdown,
        'sharpe_ratio': sharpe_ratio, 'win_rate': win_rate, 'volatility_percentile': volatility_percentile
    }


def identify_support_resistance_levels(results, current_price, atr):
    """Identify key support and resistance levels"""
    if len(results) < 50:
        return {
            'primary_support': current_price * 0.98, 'primary_resistance': current_price * 1.02,
            'support_tests': 0, 'resistance_tests': 0,
            'support_strength': 'Weak', 'resistance_strength': 'Weak'
        }

    highs = [bar['h'] for bar in results]
    lows = [bar['l'] for bar in results]
    tolerance = atr * 0.5

    swing_highs = []
    swing_lows = []

    for i in range(2, len(results) - 2):
        if (highs[i] > highs[i-1] and highs[i] > highs[i-2] and
            highs[i] > highs[i+1] and highs[i] > highs[i+2]):
            swing_highs.append(highs[i])
        if (lows[i] < lows[i-1] and lows[i] < lows[i-2] and
            lows[i] < lows[i+1] and lows[i] < lows[i+2]):
            swing_lows.append(lows[i])

    resistance_clusters = {}
    for high in swing_highs:
        clustered = False
        for level in resistance_clusters:
            if abs(high - level) <= tolerance:
                resistance_clusters[level] += 1
                clustered = True
                break
        if not clustered:
            resistance_clusters[high] = 1

    support_clusters = {}
    for low in swing_lows:
        clustered = False
        for level in support_clusters:
            if abs(low - level) <= tolerance:
                support_clusters[level] += 1
                clustered = True
                break
        if not clustered:
            support_clusters[low] = 1

    primary_resistance = current_price * 1.02
    resistance_tests = 0
    resistance_strength = 'Weak'

    if resistance_clusters:
        above_current = {l: t for l, t in resistance_clusters.items() if l > current_price}
        if above_current:
            primary_resistance = min(above_current.keys())
            resistance_tests = above_current[primary_resistance]
            resistance_strength = ('Very Strong' if resistance_tests >= 5 else
                                 'Strong' if resistance_tests >= 3 else
                                 'Moderate' if resistance_tests >= 2 else 'Weak')

    primary_support = current_price * 0.98
    support_tests = 0
    support_strength = 'Weak'

    if support_clusters:
        below_current = {l: t for l, t in support_clusters.items() if l < current_price}
        if below_current:
            primary_support = max(below_current.keys())
            support_tests = below_current[primary_support]
            support_strength = ('Very Strong' if support_tests >= 5 else
                              'Strong' if support_tests >= 3 else
                              'Moderate' if support_tests >= 2 else 'Weak')

    return {
        'primary_support': primary_support, 'primary_resistance': primary_resistance,
        'support_tests': support_tests, 'resistance_tests': resistance_tests,
        'support_strength': support_strength, 'resistance_strength': resistance_strength
    }


def process_technical_data(polygon_data, ticker):
    """Process raw Polygon data into technical indicators"""
    if not polygon_data or not polygon_data.get('results'):
        return None

    results = polygon_data['results']
    latest = results[-1]
    current_price = latest['c']

    one_day_ago = results[-26] if len(results) >= 26 else results[0]
    two_days_ago = results[-52] if len(results) >= 52 else results[0]

    daily_change = ((current_price - one_day_ago['c']) / one_day_ago['c']) * 100 if one_day_ago else 0
    two_day_change = ((current_price - two_days_ago['c']) / two_days_ago['c']) * 100 if two_days_ago else 0

    # RSI calculation
    rsi = 50
    if len(results) >= 15:
        prices = [r['c'] for r in results[-min(len(results), 50):]]
        changes = [prices[i] - prices[i-1] for i in range(1, len(prices))]

        gains = sum(max(c, 0) for c in changes[:14]) / 14
        losses = sum(abs(min(c, 0)) for c in changes[:14]) / 14

        for i in range(14, len(changes)):
            gain = max(changes[i], 0)
            loss = abs(min(changes[i], 0))
            gains = ((gains * 13) + gain) / 14
            losses = ((losses * 13) + loss) / 14

        if losses > 0:
            rs = gains / losses
            rsi = 100 - (100 / (1 + rs))
        else:
            rsi = 100

    # SMAs
    sma20 = sum([r['c'] for r in results[-20:]]) / 20 if len(results) >= 20 else current_price
    sma50 = sum([r['c'] for r in results[-50:]]) / 50 if len(results) >= 50 else current_price

    # Session high/low
    recent_bars = results[-26:] if len(results) >= 26 else results
    session_high = max([r['h'] for r in recent_bars])
    session_low = min([r['l'] for r in recent_bars])

    # Extended levels
    extended_bars = results[:-26] if len(results) >= 52 else []
    extended_high = session_high
    extended_low = session_low
    if extended_bars:
        extended_high = max([r['h'] for r in extended_bars[-50:]])
        extended_low = min([r['l'] for r in extended_bars[-50:]])

    # VWAP
    vwap = current_price
    vwap_deviation = 0
    vwap_slope = "N/A"
    above_vwap_pct = 50
    institutional_sentiment = "NEUTRAL"

    if len(results) >= 26:
        vwap_bars = results[-26:]
        total_volume = sum([r['v'] for r in vwap_bars])
        if total_volume > 0:
            vwap_sum = sum([(r['h'] + r['l'] + r['c']) / 3 * r['v'] for r in vwap_bars])
            vwap = vwap_sum / total_volume
            vwap_deviation = ((current_price - vwap) / vwap) * 100

            volume_above = sum(r['v'] for r in vwap_bars if (r['h'] + r['l'] + r['c']) / 3 > vwap)
            above_vwap_pct = (volume_above / total_volume) * 100
            institutional_sentiment = "BULLISH" if above_vwap_pct > 55 else "BEARISH" if above_vwap_pct < 45 else "NEUTRAL"

    # Bollinger Bands
    bb_upper = current_price
    bb_lower = current_price
    bb_position = "N/A"

    if len(results) >= 20:
        bb_prices = [r['c'] for r in results[-20:]]
        bb_sma = sum(bb_prices) / len(bb_prices)
        variance = sum([(p - bb_sma) ** 2 for p in bb_prices]) / len(bb_prices)
        bb_std = variance ** 0.5
        bb_upper = bb_sma + (2 * bb_std)
        bb_lower = bb_sma - (2 * bb_std)

        if current_price >= bb_upper:
            bb_position = "AT/ABOVE UPPER (Overbought)"
        elif current_price <= bb_lower:
            bb_position = "AT/BELOW LOWER (Oversold)"
        else:
            bb_pct = ((current_price - bb_lower) / (bb_upper - bb_lower)) * 100
            bb_position = f"MIDDLE ({bb_pct:.0f}% of band)"

    # MACD
    macd_line = 0
    macd_signal = 0
    macd_histogram = 0
    macd_status = "N/A"

    def calc_ema(data, period):
        if len(data) < period:
            return data[-1] if data else 0
        mult = 2 / (period + 1)
        ema = sum(data[:period]) / period
        for i in range(period, len(data)):
            ema = (data[i] * mult) + (ema * (1 - mult))
        return ema

    if len(results) >= 35:
        prices = [r['c'] for r in results[-50:]]
        ema12 = calc_ema(prices, 12)
        ema26 = calc_ema(prices, 26)
        macd_line = ema12 - ema26

        if len(results) >= 44:
            macd_values = []
            for i in range(26, len(prices)):
                t12 = calc_ema(prices[:i+1], 12)
                t26 = calc_ema(prices[:i+1], 26)
                macd_values.append(t12 - t26)

            if len(macd_values) >= 9:
                macd_signal = calc_ema(macd_values, 9)
                macd_histogram = macd_line - macd_signal

                if macd_line > macd_signal and macd_histogram > 0:
                    macd_status = "BULLISH (MACD > Signal)"
                elif macd_line < macd_signal and macd_histogram < 0:
                    macd_status = "BEARISH (MACD < Signal)"
                else:
                    macd_status = "NEUTRAL/CONVERGING"

    # Stochastic
    stoch_k = 50
    stoch_d = 50
    stoch_fast_k = 50
    stoch_status = "NEUTRAL"
    stoch_type = "N/A"

    if len(results) >= 14:
        period_bars = results[-14:]
        lowest = min([r['l'] for r in period_bars])
        highest = max([r['h'] for r in period_bars])

        if highest != lowest:
            stoch_fast_k = ((current_price - lowest) / (highest - lowest)) * 100
            stoch_k = stoch_fast_k
            stoch_d = stoch_fast_k

            if stoch_k >= 80:
                stoch_status = "OVERBOUGHT"
            elif stoch_k <= 20:
                stoch_status = "OVERSOLD"
            else:
                stoch_status = "NEUTRAL"
            stoch_type = "Stochastic"

    # OBV
    obv = 0
    obv_trend = "N/A"
    if len(results) >= 10:
        current_obv = 0
        for i in range(1, len(results)):
            if results[i]['c'] > results[i-1]['c']:
                current_obv += results[i]['v']
            elif results[i]['c'] < results[i-1]['c']:
                current_obv -= results[i]['v']
        obv = current_obv
        obv_trend = "NEUTRAL"

    # ATR
    atr = 0
    atr_trend = "STABLE"
    volatility_expansion = False

    if len(results) >= 14:
        true_ranges = []
        for i in range(1, len(results)):
            high = results[i]['h']
            low = results[i]['l']
            prev_close = results[i-1]['c']
            tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
            true_ranges.append(tr)

        if len(true_ranges) >= 14:
            atr = sum(true_ranges[-14:]) / 14

            if len(true_ranges) >= 28:
                recent_atr = sum(true_ranges[-14:]) / 14
                prev_atr = sum(true_ranges[-28:-14]) / 14

                if recent_atr > prev_atr * 1.5:
                    atr_trend = "EXPANDING (High Volatility)"
                    volatility_expansion = True
                elif recent_atr < prev_atr * 0.7:
                    atr_trend = "CONTRACTING (Low Volatility)"

    # Volume
    last_3_volumes = [bar['v'] for bar in results[-3:]]
    latest_volume = sorted(last_3_volumes)[len(last_3_volumes)//2]
    volume_list = [r['v'] for r in results[-20:]] if len(results) >= 20 else [r['v'] for r in results]
    avg_volume = sorted(volume_list)[len(volume_list)//2]

    volume_ratio = latest_volume / avg_volume if avg_volume > 0 else 1
    volume_status = 'HIGH' if volume_ratio > 1.5 else 'LOW' if volume_ratio < 0.5 else 'NORMAL'

    # Volume trend
    volume_trend = "STABLE"
    volume_acceleration = "STEADY"
    volume_divergence = "N/A"
    breakout_vs_breakdown = "N/A"

    if len(results) >= 15:
        recent_vols = [bar['v'] for bar in results[-15:]]
        prev_vols = [bar['v'] for bar in results[-30:-15]] if len(results) >= 30 else recent_vols

        recent_avg = sum(recent_vols) / len(recent_vols)
        prev_avg = sum(prev_vols) / len(prev_vols)

        vol_momentum = ((recent_avg - prev_avg) / prev_avg) * 100 if prev_avg > 0 else 0

        if vol_momentum > 15:
            volume_trend = f"ACCELERATING (+{vol_momentum:.1f}%)"
        elif vol_momentum < -15:
            volume_trend = f"DECELERATING ({vol_momentum:.1f}%)"
        else:
            volume_trend = f"STABLE ({vol_momentum:+.1f}%)"

    # Candlestick patterns
    pattern_count = 0
    total_pattern_points = 0
    candlestick_analysis = []

    pattern_bars = results[-20:] if len(results) >= 20 else results

    for i, bar in enumerate(pattern_bars[-10:]):
        body_size = abs(bar['c'] - bar['o'])
        total_range = bar['h'] - bar['l']
        upper_wick = bar['h'] - max(bar['o'], bar['c'])
        lower_wick = min(bar['o'], bar['c']) - bar['l']

        timestamp = bar.get('t', 0)
        datetime_str = f"Bar {i+1}"
        if timestamp and TIMEZONE_SUPPORT:
            est = pytz.timezone('US/Eastern')
            dt_utc = datetime.fromtimestamp(timestamp / 1000, tz=pytz.UTC)
            dt_est = dt_utc.astimezone(est)
            datetime_str = dt_est.strftime('%m/%d %H:%M EST')
        elif timestamp:
            dt = datetime.fromtimestamp(timestamp / 1000)
            datetime_str = dt.strftime('%m/%d %H:%M UTC')

        direction = "+" if bar['c'] > bar['o'] else "-"
        pattern = ""
        points = 0

        if total_range > 0 and body_size <= total_range * 0.1:
            pattern += "DOJI "
            points += 2

        if body_size > 0 and lower_wick >= body_size * 2 and upper_wick <= body_size * 0.5:
            pattern += "HAMMER "
            points += 3

        if points > 0 and pattern.strip():
            pattern_count += 1
            total_pattern_points += points
            candlestick_analysis.append(f"{datetime_str}: {direction} {pattern.strip()} [+{points}pts]")

    pattern_strength = 0
    if pattern_count > 0:
        pattern_strength = (total_pattern_points / (5 * pattern_count)) * 10
        pattern_strength = round(pattern_strength * 10) / 10

    # Risk metrics
    risk_metrics = calculate_risk_metrics(results, current_price, atr)
    sr_levels = identify_support_resistance_levels(results, current_price, atr)

    return {
        'ticker': ticker,
        'current_price': current_price,
        'daily_change': daily_change,
        'two_day_change': two_day_change,
        'rsi': rsi,
        'sma20': sma20,
        'sma50': sma50,
        'session_high': session_high,
        'session_low': session_low,
        'previous_high': extended_high,
        'previous_low': extended_low,
        'vwap': vwap,
        'vwap_deviation': vwap_deviation,
        'vwap_slope': vwap_slope,
        'volume_above_vwap_pct': above_vwap_pct,
        'institutional_sentiment': institutional_sentiment,
        'volume_trend': volume_trend,
        'volume_acceleration': volume_acceleration,
        'volume_at_key_levels': breakout_vs_breakdown,
        'volume_divergence': volume_divergence,
        'bb_upper': bb_upper,
        'bb_lower': bb_lower,
        'bb_position': bb_position,
        'macd_line': macd_line,
        'macd_signal': macd_signal,
        'macd_histogram': macd_histogram,
        'macd_status': macd_status,
        'obv': obv,
        'obv_trend': obv_trend,
        'stoch_k': stoch_k,
        'stoch_d': stoch_d,
        'stoch_fast_k': stoch_fast_k,
        'stoch_status': stoch_status,
        'stoch_type': stoch_type,
        'atr': atr,
        'atr_trend': atr_trend,
        'volatility_expansion': volatility_expansion,
        'latest_volume': latest_volume,
        'avg_volume': avg_volume,
        'volume_ratio': volume_ratio,
        'volume_status': volume_status,
        'data_points': len(results),
        'pattern_count': pattern_count,
        'total_pattern_points': total_pattern_points,
        'pattern_strength': pattern_strength,
        'candlestick_analysis': candlestick_analysis[-5:],
        'var_95': risk_metrics['var_95'],
        'cvar_95': risk_metrics['cvar_95'],
        'max_drawdown': risk_metrics['max_drawdown'],
        'sharpe_ratio': risk_metrics['sharpe_ratio'],
        'win_rate': risk_metrics['win_rate'],
        'volatility_percentile': risk_metrics['volatility_percentile'],
        'primary_support': sr_levels['primary_support'],
        'primary_resistance': sr_levels['primary_resistance'],
        'support_tests': sr_levels['support_tests'],
        'resistance_tests': sr_levels['resistance_tests'],
        'support_strength': sr_levels['support_strength'],
        'resistance_strength': sr_levels['resistance_strength']
    }


def build_analysis_prompt(tech_data):
    """Build the comprehensive multi-methodology analysis prompt"""
    range_val = tech_data['session_high'] - tech_data['session_low']
    fib236 = tech_data['session_low'] + (range_val * 0.236)
    fib382 = tech_data['session_low'] + (range_val * 0.382)
    fib50 = tech_data['session_low'] + (range_val * 0.5)
    fib618 = tech_data['session_low'] + (range_val * 0.618)

    sma20_deviation = ((tech_data['current_price'] - tech_data['sma20']) / tech_data['sma20'] * 100)
    sma50_deviation = ((tech_data['current_price'] - tech_data['sma50']) / tech_data['sma50'] * 100)

    trend_direction = "bearish" if tech_data['current_price'] < tech_data['sma20'] and tech_data['current_price'] < tech_data['sma50'] else \
                     "bullish" if tech_data['current_price'] > tech_data['sma20'] and tech_data['current_price'] > tech_data['sma50'] else \
                     "mixed"

    candlestick_patterns = '\n'.join(tech_data['candlestick_analysis']) if tech_data['candlestick_analysis'] else 'No significant patterns in recent bars'

    prompt = f"""Analyze this real market data for {tech_data['ticker']}:

== REAL-TIME MARKET DATA ANALYSIS ==
Ticker: {tech_data['ticker']}
Current Price: ${tech_data['current_price']:.2f}
Daily Change: {tech_data['daily_change']:+.1f}%
2-Day Performance: {tech_data['two_day_change']:+.1f}%

== TECHNICAL INDICATORS ==
RSI (14-period): {tech_data['rsi']:.1f} {'(deeply oversold)' if tech_data['rsi'] < 30 else '(oversold)' if tech_data['rsi'] < 40 else '(neutral)' if tech_data['rsi'] < 60 else '(overbought)' if tech_data['rsi'] < 80 else '(extremely overbought)'}
SMA 20 (5-hour): ${tech_data['sma20']:.2f}
SMA 50 (12.5-hour): ${tech_data['sma50']:.2f}
Price vs SMA20: {sma20_deviation:+.1f}%
Price vs SMA50: {sma50_deviation:+.1f}%
Primary Trend: {trend_direction.upper()}

== SESSION DATA ==
Session High: ${tech_data['session_high']:.2f}
Session Low: ${tech_data['session_low']:.2f}
Range: ${range_val:.2f} ({(range_val / tech_data['current_price'] * 100):.1f}%)

== ADVANCED TECHNICAL INDICATORS ==
VWAP: ${tech_data['vwap']:.2f} (Price vs VWAP: {tech_data['vwap_deviation']:+.1f}%)
Institutional Sentiment: {tech_data['institutional_sentiment']}
Bollinger Bands: Upper ${tech_data['bb_upper']:.2f} | Lower ${tech_data['bb_lower']:.2f} | Position: {tech_data['bb_position']}
MACD: Line {tech_data['macd_line']:.4f} | Signal {tech_data['macd_signal']:.4f} | Status: {tech_data['macd_status']}
Stochastic: %K {tech_data['stoch_k']:.1f} | %D {tech_data['stoch_d']:.1f} | Status: {tech_data['stoch_status']}
ATR (14): {tech_data['atr']:.3f} | Volatility: {tech_data['atr_trend']}

== FIBONACCI RETRACEMENTS ==
23.6%: ${fib236:.2f} | 38.2%: ${fib382:.2f} | 50.0%: ${fib50:.2f} | 61.8%: ${fib618:.2f}

== SUPPORT/RESISTANCE ==
Primary Support: ${tech_data['primary_support']:.2f} ({tech_data['support_tests']} tests - {tech_data['support_strength']})
Primary Resistance: ${tech_data['primary_resistance']:.2f} ({tech_data['resistance_tests']} tests - {tech_data['resistance_strength']})

== CANDLESTICK PATTERNS ==
{candlestick_patterns}
Pattern Strength Score: {tech_data['pattern_strength']:.1f}/10

== VOLUME ANALYSIS ==
Volume: {tech_data['latest_volume']:,} ({tech_data['volume_ratio']:.2f}x median - {tech_data['volume_status']})
Volume Trend: {tech_data['volume_trend']}

== RISK METRICS ==
Value at Risk (95%): ${tech_data['var_95']:.2f}
Max Drawdown: {tech_data['max_drawdown']*100:.1f}%
Sharpe Ratio: {tech_data['sharpe_ratio']:.2f}
Win Rate: {tech_data['win_rate']:.1f}%

Data points: {tech_data['data_points']} 15-minute bars

---

Please provide:
1. EXECUTIVE SUMMARY (75 words max): Current assessment, primary thesis, key targets, main risks
2. PRICE PROJECTIONS: 1-Week and 2-Week targets with confidence levels
3. CRITICAL LEVELS: Key support/resistance and pivot points
4. TRADING STRATEGY: Entry, stop, target, position sizing
5. FINAL SENTIMENT RATING: STRONG/WEAK BULLISH/BEARISH or NEUTRAL with justification

Focus on actionable insights based on the technical data provided."""

    return prompt


def handler(event, context):
    """Netlify function handler"""
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            'body': ''
        }

    # Get ticker from query params
    params = event.get('queryStringParameters') or {}
    ticker = params.get('ticker', '').upper().strip()

    if not ticker:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing ticker parameter'})
        }

    # Validate ticker format
    if not ticker.isalpha() or len(ticker) > 5:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Invalid ticker format'})
        }

    # Fetch Polygon data
    polygon_data, error = get_polygon_data(ticker)
    if error:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': error})
        }

    # Process technical data
    tech_data = process_technical_data(polygon_data, ticker)
    if not tech_data:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Failed to process technical data'})
        }

    # Build the analysis prompt
    prompt = build_analysis_prompt(tech_data)

    # Return response
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'ticker': ticker,
            'technical_data': tech_data,
            'prompt': prompt
        })
    }
