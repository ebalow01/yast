/**
 * Netlify serverless function for stock technical analysis
 * Fetches Polygon data and generates AI analysis prompt
 */

const https = require('https');

const makeHttpsRequest = (url) => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

function calculateRiskMetrics(results, currentPrice, atr) {
  if (results.length < 20) {
    return {
      var_95: 0, cvar_95: 0, max_drawdown: 0,
      sharpe_ratio: 0, win_rate: 0, volatility_percentile: 50
    };
  }

  const prices = results.map(bar => bar.c);
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  if (returns.length === 0) {
    return {
      var_95: 0, cvar_95: 0, max_drawdown: 0,
      sharpe_ratio: 0, win_rate: 0, volatility_percentile: 50
    };
  }

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const var95Index = Math.floor(sortedReturns.length * 0.05);
  const var_95 = var95Index < sortedReturns.length ? Math.abs(sortedReturns[var95Index]) * currentPrice : 0;

  const tailReturns = var95Index > 0 ? sortedReturns.slice(0, var95Index) : [sortedReturns[0]];
  const cvar_95 = tailReturns.length > 0 ? Math.abs(tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length) * currentPrice : 0;

  let cumulativeMax = prices[0];
  let max_drawdown = 0;
  for (const price of prices) {
    if (price > cumulativeMax) cumulativeMax = price;
    const drawdown = (cumulativeMax - price) / cumulativeMax;
    if (drawdown > max_drawdown) max_drawdown = drawdown;
  }

  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  // Annualize Sharpe ratio: ~26 bars/day * 252 trading days = 6552 bars/year
  const rawSharpe = stdDev > 0 ? meanReturn / stdDev : 0;
  const sharpe_ratio = rawSharpe * Math.sqrt(6552);

  const positiveReturns = returns.filter(r => r > 0);
  const win_rate = (positiveReturns.length / returns.length) * 100;

  const atrValues = [];
  for (let i = 14; i < results.length; i++) {
    const periodResults = results.slice(i - 14, i);
    const trueRanges = [];
    for (let j = 1; j < periodResults.length; j++) {
      const high = periodResults[j].h;
      const low = periodResults[j].l;
      const prevClose = periodResults[j - 1].c;
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trueRanges.push(tr);
    }
    if (trueRanges.length > 0) {
      atrValues.push(trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length);
    }
  }

  let volatility_percentile = 50;
  if (atrValues.length > 0 && atr > 0) {
    const belowCurrent = atrValues.filter(a => a <= atr);
    volatility_percentile = (belowCurrent.length / atrValues.length) * 100;
  }

  return { var_95, cvar_95, max_drawdown, sharpe_ratio, win_rate, volatility_percentile };
}

function identifySupportResistanceLevels(results, currentPrice, atr) {
  if (results.length < 50) {
    return {
      primary_support: currentPrice * 0.98, primary_resistance: currentPrice * 1.02,
      support_tests: 0, resistance_tests: 0,
      support_strength: 'Weak', resistance_strength: 'Weak'
    };
  }

  const highs = results.map(bar => bar.h);
  const lows = results.map(bar => bar.l);
  const tolerance = atr * 0.5;

  const swingHighs = [];
  const swingLows = [];

  for (let i = 2; i < results.length - 2; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] &&
        highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
      swingHighs.push(highs[i]);
    }
    if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] &&
        lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
      swingLows.push(lows[i]);
    }
  }

  const resistanceClusters = {};
  for (const high of swingHighs) {
    let clustered = false;
    for (const level of Object.keys(resistanceClusters)) {
      if (Math.abs(high - parseFloat(level)) <= tolerance) {
        resistanceClusters[level]++;
        clustered = true;
        break;
      }
    }
    if (!clustered) resistanceClusters[high] = 1;
  }

  const supportClusters = {};
  for (const low of swingLows) {
    let clustered = false;
    for (const level of Object.keys(supportClusters)) {
      if (Math.abs(low - parseFloat(level)) <= tolerance) {
        supportClusters[level]++;
        clustered = true;
        break;
      }
    }
    if (!clustered) supportClusters[low] = 1;
  }

  let primary_resistance = currentPrice * 1.02;
  let resistance_tests = 0;
  let resistance_strength = 'Weak';

  const aboveCurrent = Object.entries(resistanceClusters).filter(([l]) => parseFloat(l) > currentPrice);
  if (aboveCurrent.length > 0) {
    const closest = aboveCurrent.reduce((min, curr) => parseFloat(curr[0]) < parseFloat(min[0]) ? curr : min);
    primary_resistance = parseFloat(closest[0]);
    resistance_tests = closest[1];
    resistance_strength = resistance_tests >= 5 ? 'Very Strong' : resistance_tests >= 3 ? 'Strong' : resistance_tests >= 2 ? 'Moderate' : 'Weak';
  }

  let primary_support = currentPrice * 0.98;
  let support_tests = 0;
  let support_strength = 'Weak';

  const belowCurrent = Object.entries(supportClusters).filter(([l]) => parseFloat(l) < currentPrice);
  if (belowCurrent.length > 0) {
    const closest = belowCurrent.reduce((max, curr) => parseFloat(curr[0]) > parseFloat(max[0]) ? curr : max);
    primary_support = parseFloat(closest[0]);
    support_tests = closest[1];
    support_strength = support_tests >= 5 ? 'Very Strong' : support_tests >= 3 ? 'Strong' : support_tests >= 2 ? 'Moderate' : 'Weak';
  }

  return { primary_support, primary_resistance, support_tests, resistance_tests, support_strength, resistance_strength };
}

function calcEma(data, period) {
  if (data.length < period) return data[data.length - 1] || 0;
  const mult = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = (data[i] * mult) + (ema * (1 - mult));
  }
  return ema;
}

function processTechnicalData(polygonData, ticker) {
  if (!polygonData || !polygonData.results || polygonData.results.length === 0) {
    return null;
  }

  const results = polygonData.results;
  const latest = results[results.length - 1];
  const currentPrice = latest.c;

  // Find previous day closes by actual date
  const latestDate = new Date(latest.t);
  const latestDay = latestDate.toISOString().split('T')[0];

  // Find the last bar of previous trading day and 2 days ago
  let prevDayClose = null;
  let twoDaysAgoClose = null;
  let prevDay = null;
  let twoDaysAgoDay = null;

  for (let i = results.length - 1; i >= 0; i--) {
    const barDate = new Date(results[i].t);
    const barDay = barDate.toISOString().split('T')[0];

    if (barDay !== latestDay && prevDayClose === null) {
      prevDayClose = results[i].c;
      prevDay = barDay;
    } else if (prevDay && barDay !== prevDay && barDay !== latestDay && twoDaysAgoClose === null) {
      twoDaysAgoClose = results[i].c;
      twoDaysAgoDay = barDay;
      break;
    }
  }

  // Fallback to position-based if date-based fails
  if (prevDayClose === null) {
    prevDayClose = results.length >= 26 ? results[results.length - 26].c : results[0].c;
  }
  if (twoDaysAgoClose === null) {
    twoDaysAgoClose = results.length >= 52 ? results[results.length - 52].c : results[0].c;
  }

  const daily_change = ((currentPrice - prevDayClose) / prevDayClose) * 100;
  const two_day_change = ((currentPrice - twoDaysAgoClose) / twoDaysAgoClose) * 100;

  // RSI
  let rsi = 50;
  if (results.length >= 15) {
    const prices = results.slice(-Math.min(results.length, 50)).map(r => r.c);
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    let gains = 0, losses = 0;
    for (let i = 0; i < 14 && i < changes.length; i++) {
      if (changes[i] > 0) gains += changes[i];
      else losses += Math.abs(changes[i]);
    }
    gains /= 14;
    losses /= 14;

    for (let i = 14; i < changes.length; i++) {
      const gain = Math.max(changes[i], 0);
      const loss = Math.abs(Math.min(changes[i], 0));
      gains = ((gains * 13) + gain) / 14;
      losses = ((losses * 13) + loss) / 14;
    }

    if (losses > 0) {
      const rs = gains / losses;
      rsi = 100 - (100 / (1 + rs));
    } else {
      rsi = 100;
    }
  }

  // SMAs
  const sma20 = results.length >= 20 ? results.slice(-20).reduce((s, r) => s + r.c, 0) / 20 : currentPrice;
  const sma50 = results.length >= 50 ? results.slice(-50).reduce((s, r) => s + r.c, 0) / 50 : currentPrice;

  // Session high/low
  const recentBars = results.slice(-26);
  const session_high = Math.max(...recentBars.map(r => r.h));
  const session_low = Math.min(...recentBars.map(r => r.l));

  // Extended levels
  const extendedBars = results.length >= 52 ? results.slice(0, -26) : [];
  let previous_high = session_high;
  let previous_low = session_low;
  if (extendedBars.length > 0) {
    const last50 = extendedBars.slice(-50);
    previous_high = Math.max(...last50.map(r => r.h));
    previous_low = Math.min(...last50.map(r => r.l));
  }

  // VWAP
  let vwap = currentPrice;
  let vwap_deviation = 0;
  let above_vwap_pct = 50;
  let institutional_sentiment = "NEUTRAL";

  if (results.length >= 26) {
    const vwapBars = results.slice(-26);
    const totalVolume = vwapBars.reduce((s, r) => s + r.v, 0);
    if (totalVolume > 0) {
      const vwapSum = vwapBars.reduce((s, r) => s + ((r.h + r.l + r.c) / 3) * r.v, 0);
      vwap = vwapSum / totalVolume;
      vwap_deviation = ((currentPrice - vwap) / vwap) * 100;

      const volumeAbove = vwapBars.filter(r => (r.h + r.l + r.c) / 3 > vwap).reduce((s, r) => s + r.v, 0);
      above_vwap_pct = (volumeAbove / totalVolume) * 100;
      institutional_sentiment = above_vwap_pct > 55 ? "BULLISH" : above_vwap_pct < 45 ? "BEARISH" : "NEUTRAL";
    }
  }

  // Bollinger Bands
  let bb_upper = currentPrice, bb_lower = currentPrice, bb_position = "N/A";
  if (results.length >= 20) {
    const bbPrices = results.slice(-20).map(r => r.c);
    const bbSma = bbPrices.reduce((a, b) => a + b, 0) / bbPrices.length;
    const variance = bbPrices.reduce((sum, p) => sum + Math.pow(p - bbSma, 2), 0) / bbPrices.length;
    const bbStd = Math.sqrt(variance);
    bb_upper = bbSma + (2 * bbStd);
    bb_lower = bbSma - (2 * bbStd);

    if (currentPrice >= bb_upper) {
      bb_position = "AT/ABOVE UPPER (Overbought)";
    } else if (currentPrice <= bb_lower) {
      bb_position = "AT/BELOW LOWER (Oversold)";
    } else {
      const bbPct = ((currentPrice - bb_lower) / (bb_upper - bb_lower)) * 100;
      bb_position = `MIDDLE (${bbPct.toFixed(0)}% of band)`;
    }
  }

  // MACD
  let macd_line = 0, macd_signal = 0, macd_histogram = 0, macd_status = "N/A";
  if (results.length >= 35) {
    const prices = results.slice(-50).map(r => r.c);
    const ema12 = calcEma(prices, 12);
    const ema26 = calcEma(prices, 26);
    macd_line = ema12 - ema26;

    if (results.length >= 44) {
      const macdValues = [];
      for (let i = 26; i < prices.length; i++) {
        const t12 = calcEma(prices.slice(0, i + 1), 12);
        const t26 = calcEma(prices.slice(0, i + 1), 26);
        macdValues.push(t12 - t26);
      }

      if (macdValues.length >= 9) {
        macd_signal = calcEma(macdValues, 9);
        macd_histogram = macd_line - macd_signal;

        if (macd_line > macd_signal && macd_histogram > 0) {
          macd_status = "BULLISH (MACD > Signal)";
        } else if (macd_line < macd_signal && macd_histogram < 0) {
          macd_status = "BEARISH (MACD < Signal)";
        } else {
          macd_status = "NEUTRAL/CONVERGING";
        }
      }
    }
  }

  // Stochastic
  let stoch_k = 50, stoch_d = 50, stoch_fast_k = 50, stoch_status = "NEUTRAL", stoch_type = "N/A";
  if (results.length >= 14) {
    const periodBars = results.slice(-14);
    const lowest = Math.min(...periodBars.map(r => r.l));
    const highest = Math.max(...periodBars.map(r => r.h));

    if (highest !== lowest) {
      stoch_fast_k = ((currentPrice - lowest) / (highest - lowest)) * 100;
      stoch_k = stoch_fast_k;
      stoch_d = stoch_fast_k;

      stoch_status = stoch_k >= 80 ? "OVERBOUGHT" : stoch_k <= 20 ? "OVERSOLD" : "NEUTRAL";
      stoch_type = "Stochastic";
    }
  }

  // OBV
  let obv = 0, obv_trend = "NEUTRAL";
  if (results.length >= 10) {
    let currentObv = 0;
    for (let i = 1; i < results.length; i++) {
      if (results[i].c > results[i - 1].c) currentObv += results[i].v;
      else if (results[i].c < results[i - 1].c) currentObv -= results[i].v;
    }
    obv = currentObv;
  }

  // ATR
  let atr = 0, atr_trend = "STABLE", volatility_expansion = false;
  if (results.length >= 14) {
    const trueRanges = [];
    for (let i = 1; i < results.length; i++) {
      const high = results[i].h;
      const low = results[i].l;
      const prevClose = results[i - 1].c;
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trueRanges.push(tr);
    }

    if (trueRanges.length >= 14) {
      atr = trueRanges.slice(-14).reduce((a, b) => a + b, 0) / 14;

      if (trueRanges.length >= 28) {
        const recentAtr = trueRanges.slice(-14).reduce((a, b) => a + b, 0) / 14;
        const prevAtr = trueRanges.slice(-28, -14).reduce((a, b) => a + b, 0) / 14;

        if (recentAtr > prevAtr * 1.5) {
          atr_trend = "EXPANDING (High Volatility)";
          volatility_expansion = true;
        } else if (recentAtr < prevAtr * 0.7) {
          atr_trend = "CONTRACTING (Low Volatility)";
        }
      }
    }
  }

  // Volume
  const last3Volumes = results.slice(-3).map(bar => bar.v).sort((a, b) => a - b);
  const latest_volume = last3Volumes[Math.floor(last3Volumes.length / 2)];
  const volumeList = results.slice(-20).map(r => r.v).sort((a, b) => a - b);
  const avg_volume = volumeList[Math.floor(volumeList.length / 2)];

  const volume_ratio = avg_volume > 0 ? latest_volume / avg_volume : 1;
  const volume_status = volume_ratio > 1.5 ? 'HIGH' : volume_ratio < 0.5 ? 'LOW' : 'NORMAL';

  // Volume trend
  let volume_trend = "STABLE";
  if (results.length >= 15) {
    const recentVols = results.slice(-15).map(bar => bar.v);
    const prevVols = results.length >= 30 ? results.slice(-30, -15).map(bar => bar.v) : recentVols;

    const recentAvg = recentVols.reduce((a, b) => a + b, 0) / recentVols.length;
    const prevAvg = prevVols.reduce((a, b) => a + b, 0) / prevVols.length;

    const volMomentum = prevAvg > 0 ? ((recentAvg - prevAvg) / prevAvg) * 100 : 0;

    if (volMomentum > 15) {
      volume_trend = `ACCELERATING (+${volMomentum.toFixed(1)}%)`;
    } else if (volMomentum < -15) {
      volume_trend = `DECELERATING (${volMomentum.toFixed(1)}%)`;
    } else {
      volume_trend = `STABLE (${volMomentum >= 0 ? '+' : ''}${volMomentum.toFixed(1)}%)`;
    }
  }

  // Candlestick patterns
  let pattern_count = 0, total_pattern_points = 0;
  const candlestick_analysis = [];
  const patternBars = results.slice(-10);

  for (let i = 0; i < patternBars.length; i++) {
    const bar = patternBars[i];
    const bodySize = Math.abs(bar.c - bar.o);
    const totalRange = bar.h - bar.l;
    const upperWick = bar.h - Math.max(bar.o, bar.c);
    const lowerWick = Math.min(bar.o, bar.c) - bar.l;

    const timestamp = bar.t;
    let datetimeStr = `Bar ${i + 1}`;
    if (timestamp) {
      const dt = new Date(timestamp);
      datetimeStr = dt.toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }) + ' EST';
    }

    const direction = bar.c > bar.o ? "+" : "-";
    let pattern = "";
    let points = 0;

    if (totalRange > 0 && bodySize <= totalRange * 0.1) {
      pattern += "DOJI ";
      points += 2;
    }

    if (bodySize > 0 && lowerWick >= bodySize * 2 && upperWick <= bodySize * 0.5) {
      pattern += "HAMMER ";
      points += 3;
    }

    if (points > 0 && pattern.trim()) {
      pattern_count++;
      total_pattern_points += points;
      candlestick_analysis.push(`${datetimeStr}: ${direction} ${pattern.trim()} [+${points}pts]`);
    }
  }

  let pattern_strength = 0;
  if (pattern_count > 0) {
    pattern_strength = (total_pattern_points / (5 * pattern_count)) * 10;
    pattern_strength = Math.round(pattern_strength * 10) / 10;
  }

  // Risk metrics
  const riskMetrics = calculateRiskMetrics(results, currentPrice, atr);
  const srLevels = identifySupportResistanceLevels(results, currentPrice, atr);

  return {
    ticker,
    current_price: currentPrice,
    daily_change,
    two_day_change,
    rsi,
    sma20,
    sma50,
    session_high,
    session_low,
    previous_high,
    previous_low,
    vwap,
    vwap_deviation,
    vwap_slope: "N/A",
    volume_above_vwap_pct: above_vwap_pct,
    institutional_sentiment,
    volume_trend,
    volume_acceleration: "STEADY",
    volume_at_key_levels: "N/A",
    volume_divergence: "N/A",
    bb_upper,
    bb_lower,
    bb_position,
    macd_line,
    macd_signal,
    macd_histogram,
    macd_status,
    obv,
    obv_trend,
    stoch_k,
    stoch_d,
    stoch_fast_k,
    stoch_status,
    stoch_type,
    atr,
    atr_trend,
    volatility_expansion,
    latest_volume,
    avg_volume,
    volume_ratio,
    volume_status,
    data_points: results.length,
    pattern_count,
    total_pattern_points,
    pattern_strength,
    candlestick_analysis: candlestick_analysis.slice(-5),
    ...riskMetrics,
    ...srLevels
  };
}

function buildAnalysisPrompt(t) {
  const rangeVal = t.session_high - t.session_low;
  const fib236 = t.session_low + (rangeVal * 0.236);
  const fib382 = t.session_low + (rangeVal * 0.382);
  const fib50 = t.session_low + (rangeVal * 0.5);
  const fib618 = t.session_low + (rangeVal * 0.618);

  const sma20Deviation = ((t.current_price - t.sma20) / t.sma20 * 100);
  const sma50Deviation = ((t.current_price - t.sma50) / t.sma50 * 100);

  const trendDirection = t.current_price < t.sma20 && t.current_price < t.sma50 ? "bearish" :
                        t.current_price > t.sma20 && t.current_price > t.sma50 ? "bullish" : "mixed";

  const candlestickPatterns = t.candlestick_analysis.length > 0 ? t.candlestick_analysis.join('\n') : 'No significant patterns in recent bars';

  const rsiLabel = t.rsi < 30 ? '(deeply oversold)' : t.rsi < 40 ? '(oversold)' : t.rsi < 60 ? '(neutral)' : t.rsi < 80 ? '(overbought)' : '(extremely overbought)';

  return `Analyze this real market data for ${t.ticker}:

== REAL-TIME MARKET DATA ANALYSIS ==
Ticker: ${t.ticker}
Current Price: $${t.current_price.toFixed(2)}
Daily Change: ${t.daily_change >= 0 ? '+' : ''}${t.daily_change.toFixed(2)}%
2-Day Performance: ${t.two_day_change >= 0 ? '+' : ''}${t.two_day_change.toFixed(2)}%

== TECHNICAL INDICATORS ==
RSI (14-period): ${t.rsi.toFixed(1)} ${rsiLabel}
SMA 20 (5-hour): $${t.sma20.toFixed(2)}
SMA 50 (12.5-hour): $${t.sma50.toFixed(2)}
Price vs SMA20: ${sma20Deviation >= 0 ? '+' : ''}${sma20Deviation.toFixed(1)}%
Price vs SMA50: ${sma50Deviation >= 0 ? '+' : ''}${sma50Deviation.toFixed(1)}%
Primary Trend: ${trendDirection.toUpperCase()}

== SESSION DATA ==
Session High: $${t.session_high.toFixed(2)}
Session Low: $${t.session_low.toFixed(2)}
Range: $${rangeVal.toFixed(2)} (${(rangeVal / t.current_price * 100).toFixed(1)}%)

== ADVANCED TECHNICAL INDICATORS ==
VWAP: $${t.vwap.toFixed(2)} (Price vs VWAP: ${t.vwap_deviation >= 0 ? '+' : ''}${t.vwap_deviation.toFixed(1)}%)
Institutional Sentiment: ${t.institutional_sentiment}
Bollinger Bands: Upper $${t.bb_upper.toFixed(2)} | Lower $${t.bb_lower.toFixed(2)} | Position: ${t.bb_position}
MACD: Line ${t.macd_line.toFixed(4)} | Signal ${t.macd_signal.toFixed(4)} | Status: ${t.macd_status}
Stochastic: %K ${t.stoch_k.toFixed(1)} | %D ${t.stoch_d.toFixed(1)} | Status: ${t.stoch_status}
ATR (14): ${t.atr.toFixed(3)} | Volatility: ${t.atr_trend}

== FIBONACCI RETRACEMENTS ==
23.6%: $${fib236.toFixed(2)} | 38.2%: $${fib382.toFixed(2)} | 50.0%: $${fib50.toFixed(2)} | 61.8%: $${fib618.toFixed(2)}

== SUPPORT/RESISTANCE ==
Primary Support: $${t.primary_support.toFixed(2)} (${t.support_tests} tests - ${t.support_strength})
Primary Resistance: $${t.primary_resistance.toFixed(2)} (${t.resistance_tests} tests - ${t.resistance_strength})

== CANDLESTICK PATTERNS ==
${candlestickPatterns}
Pattern Strength Score: ${t.pattern_strength.toFixed(1)}/10

== VOLUME ANALYSIS ==
Volume: ${t.latest_volume.toLocaleString()} (${t.volume_ratio.toFixed(2)}x median - ${t.volume_status})
Volume Trend: ${t.volume_trend}

== RISK METRICS ==
Value at Risk (95%): $${t.var_95.toFixed(2)}
Max Drawdown: ${(t.max_drawdown * 100).toFixed(1)}%
Sharpe Ratio: ${t.sharpe_ratio.toFixed(2)}
Win Rate: ${t.win_rate.toFixed(1)}%

Data points: ${t.data_points} 15-minute bars

---

Please provide:
1. EXECUTIVE SUMMARY (75 words max): Current assessment, primary thesis, key targets, main risks
2. PRICE PROJECTIONS: 1-Week and 2-Week targets with confidence levels
3. CRITICAL LEVELS: Key support/resistance and pivot points
4. TRADING STRATEGY: Entry, stop, target, position sizing
5. FINAL SENTIMENT RATING: STRONG/WEAK BULLISH/BEARISH or NEUTRAL with justification

Focus on actionable insights based on the technical data provided.`;
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  // Get ticker from query params
  const params = event.queryStringParameters || {};
  const ticker = (params.ticker || '').toUpperCase().trim();

  if (!ticker) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Missing ticker parameter' })
    };
  }

  // Validate ticker format
  if (!/^[A-Z]+$/.test(ticker) || ticker.length > 5) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid ticker format' })
    };
  }

  const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
  if (!POLYGON_API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'POLYGON_API_KEY not configured' })
    };
  }

  try {
    // Fetch Polygon data
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const polygonUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/15/minute/${startDate}/${endDate}?adjusted=true&sort=asc&apikey=${POLYGON_API_KEY}`;

    const response = await makeHttpsRequest(polygonUrl);

    if (!response.ok) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `Polygon API error: ${response.status}` })
      };
    }

    const polygonData = JSON.parse(response.data);

    if (!polygonData.results || polygonData.results.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `No data found for ticker ${ticker}` })
      };
    }

    // Process technical data
    const techData = processTechnicalData(polygonData, ticker);
    if (!techData) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Failed to process technical data' })
      };
    }

    // Build prompt
    const prompt = buildAnalysisPrompt(techData);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        ticker,
        technical_data: techData,
        prompt
      })
    };

  } catch (error) {
    console.error('Analyze function error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
