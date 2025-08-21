// Configuration constants
const FIBONACCI_LEVELS = [0.236, 0.382, 0.5, 0.618];
const TECHNICAL_PERIODS = {
  RSI: 14,
  SMA_SHORT: 20,
  SMA_LONG: 50,
  ATR: 14,
  MACD_FAST: 12,
  MACD_SLOW: 26,
  MACD_SIGNAL: 9
};

const DEFAULT_RISK_METRICS = {
  var_95: 0,
  cvar_95: 0,
  max_drawdown: 0,
  sharpe_ratio: 0,
  win_rate: 0,
  volatility_percentile: 50
};

// Utility functions
const formatPrice = (value) => `$${value.toFixed(2)}`;
const formatPercent = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
const formatChange = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
const formatRatio = (value) => `${value.toFixed(2)}x`;

function classifyStrength(tests) {
  return tests >= 5 ? 'Very Strong' : 
         tests >= 3 ? 'Strong' : 
         tests >= 2 ? 'Moderate' : 'Weak';
}

// Data preparation functions
function buildDataSummary(techData) {
  const rangeVal = techData.session_high - techData.session_low;
  const sma20Deviation = ((techData.current_price - techData.sma20) / techData.sma20 * 100);
  const sma50Deviation = ((techData.current_price - techData.sma50) / techData.sma50 * 100);

  return `== REAL-TIME MARKET DATA ANALYSIS ==
Ticker: ${techData.ticker}
Current Price: ${formatPrice(techData.current_price)}
Daily Change: ${formatChange(techData.daily_change)}
2-Day Performance: ${formatChange(techData.two_day_change)}

== TECHNICAL INDICATORS ==
RSI (${TECHNICAL_PERIODS.RSI}-period): ${techData.rsi.toFixed(1)} ${techData.rsi < 30 ? '(deeply oversold)' : techData.rsi < 40 ? '(oversold)' : techData.rsi < 60 ? '(neutral)' : techData.rsi < 80 ? '(overbought)' : '(extremely overbought)'}
SMA ${TECHNICAL_PERIODS.SMA_SHORT} (5-hour): ${formatPrice(techData.sma20)}
SMA ${TECHNICAL_PERIODS.SMA_LONG} (12.5-hour): ${formatPrice(techData.sma50)}
Price vs SMA20: ${formatChange(sma20Deviation)}
Price vs SMA50: ${formatChange(sma50Deviation)}
Primary Trend: ${techData.trend_direction.toUpperCase()} ${techData.trend_direction === 'bearish' ? '(below both SMAs)' : techData.trend_direction === 'bullish' ? '(above both SMAs)' : '(mixed signals)'}

== SESSION DATA ==
Session High: ${formatPrice(techData.session_high)}
Session Low: ${formatPrice(techData.session_low)}
Range: ${formatPrice(rangeVal)} (${(rangeVal / techData.current_price * 100).toFixed(1)}%)

== EXTENDED LEVELS ==
Previous High: ${formatPrice(techData.previous_high)}
Previous Low: ${formatPrice(techData.previous_low)}

== ADVANCED TECHNICAL INDICATORS ==
VWAP: ${formatPrice(techData.vwap)} (Price vs VWAP: ${formatChange(techData.vwap_deviation)})
Volume Above VWAP: ${techData.volume_above_vwap_pct.toFixed(1)}% | Institutional Sentiment: ${techData.institutional_sentiment}
Bollinger Bands: Upper ${formatPrice(techData.bb_upper)} | Lower ${formatPrice(techData.bb_lower)} | Position: ${techData.bb_position}
MACD: Line ${techData.macd_line.toFixed(4)} | Signal ${techData.macd_signal.toFixed(4)} | Histogram ${techData.macd_histogram.toFixed(4)}
MACD Status: ${techData.macd_status}
ATR (${TECHNICAL_PERIODS.ATR}): ${techData.atr.toFixed(3)} | Volatility: ${techData.atr_trend}${techData.volatility_expansion ? ' VOLATILITY EXPANSION!' : ''}

== FIBONACCI RETRACEMENTS ==
${FIBONACCI_LEVELS.map((level, index) => {
  const price = techData.session_low + (rangeVal * level);
  const percentage = (level * 100).toFixed(1);
  return `${percentage}%: ${formatPrice(price)}`;
}).join('\n')}

== RISK METRICS ==
- Value at Risk (95%): ${formatPrice(techData.var_95)}
- Conditional VaR (95%): ${formatPrice(techData.cvar_95)}
- Maximum Drawdown: ${(techData.max_drawdown*100).toFixed(1)}%
- Sharpe Ratio: ${techData.sharpe_ratio.toFixed(2)}
- Win Rate: ${techData.win_rate.toFixed(1)}%
- Volatility Percentile: ${techData.volatility_percentile.toFixed(0)}%

== VOLUME ANALYSIS ==
- Volume (Latest): ${techData.latest_volume.toLocaleString()}
- 20-Bar Average: ${Math.round(techData.avg_volume).toLocaleString()}
- Volume Ratio: ${formatRatio(techData.volume_ratio)} average (${techData.volume_status})

Data points: ${techData.data_points} 15-minute bars`;
}

// Enhanced technical analysis functions
function calculateRiskMetrics(results, currentPrice, atr) {
  if (results.length < 20) {
    return { ...DEFAULT_RISK_METRICS };
  }

  // Calculate returns
  const prices = results.map(r => r.c);
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }

  if (returns.length === 0) {
    return { ...DEFAULT_RISK_METRICS };
  }

  // Sort returns for percentile calculations
  const sortedReturns = [...returns].sort((a, b) => a - b);
  
  // Value at Risk (95% confidence level) - 5th percentile of returns
  const var95Index = Math.floor(sortedReturns.length * 0.05);
  const var95 = var95Index < sortedReturns.length ? Math.abs(sortedReturns[var95Index]) * currentPrice : 0;
  
  // Conditional Value at Risk (CVaR) - average of returns below VaR
  const tailReturns = var95Index > 0 ? sortedReturns.slice(0, var95Index) : [sortedReturns[0]];
  const cvar95 = tailReturns.length > 0 ? Math.abs(tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length) * currentPrice : 0;
  
  // Maximum Drawdown
  let cumulativeMax = prices[0];
  let maxDrawdown = 0;
  for (const price of prices) {
    if (price > cumulativeMax) {
      cumulativeMax = price;
    }
    const drawdown = (cumulativeMax - price) / cumulativeMax;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  // Sharpe Ratio (simplified)
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? meanReturn / stdDev : 0;
  
  // Win Rate (percentage of positive returns)
  const positiveReturns = returns.filter(r => r > 0);
  const winRate = (positiveReturns.length / returns.length) * 100;
  
  // Volatility Percentile
  const atrValues = [];
  for (let i = 14; i < results.length; i++) {
    const periodResults = results.slice(i-14, i);
    const trueRanges = [];
    for (let j = 1; j < periodResults.length; j++) {
      const high = periodResults[j].h;
      const low = periodResults[j].l;
      const prevClose = periodResults[j-1].c;
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trueRanges.push(tr);
    }
    if (trueRanges.length > 0) {
      const periodAtr = trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
      atrValues.push(periodAtr);
    }
  }
  
  let volatilityPercentile = 50;
  if (atrValues.length > 0 && atr > 0) {
    const belowCurrent = atrValues.filter(a => a <= atr);
    volatilityPercentile = (belowCurrent.length / atrValues.length) * 100;
  }

  return {
    var_95: var95,
    cvar_95: cvar95,
    max_drawdown: maxDrawdown,
    sharpe_ratio: sharpeRatio,
    win_rate: winRate,
    volatility_percentile: volatilityPercentile
  };
}

function identifySupportResistanceLevels(results, currentPrice, atr) {
  if (results.length < 50) {
    return {
      primary_support: currentPrice * 0.98,
      primary_resistance: currentPrice * 1.02,
      support_tests: 0,
      resistance_tests: 0,
      support_strength: 'Weak',
      resistance_strength: 'Weak'
    };
  }

  const highs = results.map(r => r.h);
  const lows = results.map(r => r.l);
  const tolerance = atr * 0.5;

  // Find swing highs and lows
  const swingHighs = [];
  const swingLows = [];

  for (let i = 2; i < results.length - 2; i++) {
    // Swing high: higher than 2 bars before and after
    if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && 
        highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
      swingHighs.push(highs[i]);
    }
    
    // Swing low: lower than 2 bars before and after
    if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && 
        lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
      swingLows.push(lows[i]);
    }
  }

  // Cluster resistance levels
  const resistanceClusters = {};
  for (const high of swingHighs) {
    let clustered = false;
    for (const level of Object.keys(resistanceClusters)) {
      if (Math.abs(high - parseFloat(level)) <= tolerance) {
        resistanceClusters[level] += 1;
        clustered = true;
        break;
      }
    }
    if (!clustered) {
      resistanceClusters[high] = 1;
    }
  }

  // Cluster support levels
  const supportClusters = {};
  for (const low of swingLows) {
    let clustered = false;
    for (const level of Object.keys(supportClusters)) {
      if (Math.abs(low - parseFloat(level)) <= tolerance) {
        supportClusters[level] += 1;
        clustered = true;
        break;
      }
    }
    if (!clustered) {
      supportClusters[low] = 1;
    }
  }

  // Find primary resistance (closest above current price)
  let primaryResistance = currentPrice * 1.02;
  let resistanceTests = 0;
  let resistanceStrength = 'Weak';

  const resistanceLevelsAbove = Object.entries(resistanceClusters)
    .filter(([level, tests]) => parseFloat(level) > currentPrice)
    .sort(([a], [b]) => parseFloat(a) - parseFloat(b));

  if (resistanceLevelsAbove.length > 0) {
    const [level, tests] = resistanceLevelsAbove[0];
    primaryResistance = parseFloat(level);
    resistanceTests = tests;
    resistanceStrength = classifyStrength(tests);
  }

  // Find primary support (closest below current price)
  let primarySupport = currentPrice * 0.98;
  let supportTests = 0;
  let supportStrength = 'Weak';

  const supportLevelsBelow = Object.entries(supportClusters)
    .filter(([level, tests]) => parseFloat(level) < currentPrice)
    .sort(([a], [b]) => parseFloat(b) - parseFloat(a));

  if (supportLevelsBelow.length > 0) {
    const [level, tests] = supportLevelsBelow[0];
    primarySupport = parseFloat(level);
    supportTests = tests;
    supportStrength = classifyStrength(tests);
  }

  return {
    primary_support: primarySupport,
    primary_resistance: primaryResistance,
    support_tests: supportTests,
    resistance_tests: resistanceTests,
    support_strength: supportStrength,
    resistance_strength: resistanceStrength
  };
}

function processEnhancedTechnicalData(polygonData, ticker) {
  const results = polygonData.results;
  const latest = results[results.length - 1];
  const currentPrice = latest.c;

  // Basic price changes
  const oneDayAgo = results.length >= 26 ? results[results.length - 26] : results[0];
  const twoDaysAgo = results.length >= 52 ? results[results.length - 52] : results[0];
  const dailyChange = oneDayAgo ? ((currentPrice - oneDayAgo.c) / oneDayAgo.c) * 100 : 0;
  const twoDayChange = twoDaysAgo ? ((currentPrice - twoDaysAgo.c) / twoDaysAgo.c) * 100 : 0;

  // Enhanced RSI (Traditional with Wilder's smoothing)
  let rsi = 0;
  if (results.length >= 15) {
    const prices = results.slice(-Math.min(results.length, 50)).map(r => r.c);
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    let gains = 0;
    let losses = 0;
    for (let i = 0; i < TECHNICAL_PERIODS.RSI; i++) {
      if (changes[i] > 0) {
        gains += changes[i];
      } else {
        losses += Math.abs(changes[i]);
      }
    }

    let avgGain = gains / TECHNICAL_PERIODS.RSI;
    let avgLoss = losses / TECHNICAL_PERIODS.RSI;

    // Apply Wilder's smoothing for subsequent periods
    for (let i = TECHNICAL_PERIODS.RSI; i < changes.length; i++) {
      const gain = changes[i] > 0 ? changes[i] : 0;
      const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
      
      avgGain = ((avgGain * (TECHNICAL_PERIODS.RSI - 1)) + gain) / TECHNICAL_PERIODS.RSI;
      avgLoss = ((avgLoss * (TECHNICAL_PERIODS.RSI - 1)) + loss) / TECHNICAL_PERIODS.RSI;
    }

    if (avgLoss > 0) {
      const rs = avgGain / avgLoss;
      rsi = 100 - (100 / (1 + rs));
    } else {
      rsi = 100;
    }
  }

  // Calculate SMAs
  const sma20 = results.length >= TECHNICAL_PERIODS.SMA_SHORT ? 
    results.slice(-TECHNICAL_PERIODS.SMA_SHORT).reduce((sum, r) => sum + r.c, 0) / TECHNICAL_PERIODS.SMA_SHORT : currentPrice;
  const sma50 = results.length >= TECHNICAL_PERIODS.SMA_LONG ? 
    results.slice(-TECHNICAL_PERIODS.SMA_LONG).reduce((sum, r) => sum + r.c, 0) / TECHNICAL_PERIODS.SMA_LONG : currentPrice;

  // Session high/low
  const recentBars = results.length >= 26 ? results.slice(-26) : results;
  const sessionHigh = Math.max(...recentBars.map(r => r.h));
  const sessionLow = Math.min(...recentBars.map(r => r.l));

  // Previous levels
  const extendedBars = results.length >= 52 ? results.slice(-76, -26) : [];
  const previousHigh = extendedBars.length > 0 ? Math.max(...extendedBars.map(r => r.h)) : sessionHigh;
  const previousLow = extendedBars.length > 0 ? Math.min(...extendedBars.map(r => r.l)) : sessionLow;

  // VWAP and volume analysis
  let vwap = 0;
  let vwapDeviation = 0;
  let volumeAboveVwapPct = 0;
  let institutionalSentiment = "N/A";

  if (results.length >= 26) {
    const vwapBars = results.slice(-26);
    const totalVolume = vwapBars.reduce((sum, r) => sum + r.v, 0);
    if (totalVolume > 0) {
      const vwapSum = vwapBars.reduce((sum, r) => sum + ((r.h + r.l + r.c) / 3 * r.v), 0);
      vwap = vwapSum / totalVolume;
      vwapDeviation = ((currentPrice - vwap) / vwap) * 100;

      let volumeAboveVwap = 0;
      let volumeBelowVwap = 0;
      for (const bar of vwapBars) {
        const typicalPrice = (bar.h + bar.l + bar.c) / 3;
        if (typicalPrice > vwap) {
          volumeAboveVwap += bar.v;
        } else {
          volumeBelowVwap += bar.v;
        }
      }
      
      const totalSessionVolume = volumeAboveVwap + volumeBelowVwap;
      if (totalSessionVolume > 0) {
        volumeAboveVwapPct = (volumeAboveVwap / totalSessionVolume) * 100;
        institutionalSentiment = volumeAboveVwapPct > 55 ? "BULLISH" : 
                               volumeAboveVwapPct < 45 ? "BEARISH" : "NEUTRAL";
      }
    }
  }

  // Bollinger Bands
  let bbUpper = 0;
  let bbLower = 0;
  let bbPosition = "N/A";

  if (results.length >= TECHNICAL_PERIODS.SMA_SHORT) {
    const bbPrices = results.slice(-TECHNICAL_PERIODS.SMA_SHORT).map(r => r.c);
    const bbSma = bbPrices.reduce((sum, p) => sum + p, 0) / bbPrices.length;
    const variance = bbPrices.reduce((sum, p) => sum + Math.pow(p - bbSma, 2), 0) / bbPrices.length;
    const bbStd = Math.sqrt(variance);
    
    bbUpper = bbSma + (2 * bbStd);
    bbLower = bbSma - (2 * bbStd);
    
    if (currentPrice >= bbUpper) {
      bbPosition = "AT/ABOVE UPPER (Overbought)";
    } else if (currentPrice <= bbLower) {
      bbPosition = "AT/BELOW LOWER (Oversold)";
    } else {
      const bbPct = ((currentPrice - bbLower) / (bbUpper - bbLower)) * 100;
      bbPosition = `MIDDLE (${Math.round(bbPct)}% of band)`;
    }
  }

  // MACD
  let macdLine = 0;
  let macdSignal = 0;
  let macdHistogram = 0;
  let macdStatus = "N/A";

  if (results.length >= 35) {
    const prices = results.slice(-50).map(r => r.c);
    
    // Calculate EMAs
    const calculateEma = (data, period) => {
      if (data.length < period) return data[data.length - 1] || 0;
      
      const multiplier = 2 / (period + 1);
      let ema = data[period - 1];
      
      for (let i = period; i < data.length; i++) {
        ema = (data[i] * multiplier) + (ema * (1 - multiplier));
      }
      return ema;
    };

    const ema12 = calculateEma(prices, TECHNICAL_PERIODS.MACD_FAST);
    const ema26 = calculateEma(prices, TECHNICAL_PERIODS.MACD_SLOW);
    macdLine = ema12 - ema26;
    
    // Simplified signal calculation
    if (results.length >= 44) {
      const macdValues = [];
      for (let i = TECHNICAL_PERIODS.MACD_SLOW; i < prices.length; i++) {
        const tempEma12 = calculateEma(prices.slice(0, i + 1), TECHNICAL_PERIODS.MACD_FAST);
        const tempEma26 = calculateEma(prices.slice(0, i + 1), TECHNICAL_PERIODS.MACD_SLOW);
        macdValues.push(tempEma12 - tempEma26);
      }
      
      if (macdValues.length >= TECHNICAL_PERIODS.MACD_SIGNAL) {
        macdSignal = calculateEma(macdValues, TECHNICAL_PERIODS.MACD_SIGNAL);
        macdHistogram = macdLine - macdSignal;
        
        if (macdLine > macdSignal && macdHistogram > 0) {
          macdStatus = "BULLISH (MACD > Signal)";
        } else if (macdLine < macdSignal && macdHistogram < 0) {
          macdStatus = "BEARISH (MACD < Signal)";
        } else {
          macdStatus = "NEUTRAL/CONVERGING";
        }
      }
    }
  }

  // ATR and volatility
  let atr = 0;
  let atrTrend = "N/A";
  let volatilityExpansion = false;

  if (results.length >= TECHNICAL_PERIODS.ATR) {
    const trueRanges = [];
    
    for (let i = 1; i < results.length; i++) {
      const high = results[i].h;
      const low = results[i].l;
      const prevClose = results[i-1].c;
      
      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);
      
      const trueRange = Math.max(tr1, tr2, tr3);
      trueRanges.push(trueRange);
    }
    
    if (trueRanges.length >= TECHNICAL_PERIODS.ATR) {
      atr = trueRanges.slice(-TECHNICAL_PERIODS.ATR).reduce((sum, tr) => sum + tr, 0) / TECHNICAL_PERIODS.ATR;
      
      if (trueRanges.length >= TECHNICAL_PERIODS.ATR * 2) {
        const recentAtr = trueRanges.slice(-TECHNICAL_PERIODS.ATR).reduce((sum, tr) => sum + tr, 0) / TECHNICAL_PERIODS.ATR;
        const prevAtr = trueRanges.slice(-TECHNICAL_PERIODS.ATR * 2, -TECHNICAL_PERIODS.ATR).reduce((sum, tr) => sum + tr, 0) / TECHNICAL_PERIODS.ATR;
        
        if (recentAtr > prevAtr * 1.5) {
          atrTrend = "EXPANDING (High Volatility)";
          volatilityExpansion = true;
        } else if (recentAtr < prevAtr * 0.7) {
          atrTrend = "CONTRACTING (Low Volatility)";
        } else {
          atrTrend = "STABLE";
        }
      }
    }
  }

  // Volume analysis
  const latestVolume = latest.v;
  const volumeBars = results.length >= 20 ? results.slice(-20) : results;
  const avgVolume = volumeBars.reduce((sum, r) => sum + r.v, 0) / volumeBars.length;
  const volumeRatio = avgVolume > 0 ? latestVolume / avgVolume : 1;
  const volumeStatus = volumeRatio > 1.5 ? 'HIGH' : volumeRatio < 0.5 ? 'LOW' : 'NORMAL';

  // Risk metrics and support/resistance
  const riskMetrics = calculateRiskMetrics(results, currentPrice, atr);
  const srLevels = identifySupportResistanceLevels(results, currentPrice, atr);

  // Determine trend direction
  const trendDirection = currentPrice < sma20 && currentPrice < sma50 ? "bearish" :
                        currentPrice > sma20 && currentPrice > sma50 ? "bullish" : "mixed";

  return {
    ticker,
    current_price: currentPrice,
    daily_change: dailyChange,
    two_day_change: twoDayChange,
    rsi,
    sma20,
    sma50,
    session_high: sessionHigh,
    session_low: sessionLow,
    previous_high: previousHigh,
    previous_low: previousLow,
    vwap,
    vwap_deviation: vwapDeviation,
    volume_above_vwap_pct: volumeAboveVwapPct,
    institutional_sentiment: institutionalSentiment,
    bb_upper: bbUpper,
    bb_lower: bbLower,
    bb_position: bbPosition,
    macd_line: macdLine,
    macd_signal: macdSignal,
    macd_histogram: macdHistogram,
    macd_status: macdStatus,
    atr,
    atr_trend: atrTrend,
    volatility_expansion: volatilityExpansion,
    latest_volume: latestVolume,
    avg_volume: avgVolume,
    volume_ratio: volumeRatio,
    volume_status: volumeStatus,
    data_points: results.length,
    trend_direction: trendDirection,
    ...riskMetrics,
    ...srLevels
  };
}

function buildEnhancedAnalysisPrompt(techData) {
  // Use the extracted data summary function
  const dataSummary = buildDataSummary(techData);
  
  // Calculate price position relative to SMAs for use in prompt template
  const sma20Deviation = ((techData.current_price - techData.sma20) / techData.sma20 * 100);
  const sma50Deviation = ((techData.current_price - techData.sma50) / techData.sma50 * 100);

  const enhancedPrompt = `Analyze this real market data for ${techData.ticker}:

**CRITICAL INSTRUCTION: Your final sentiment rating MUST be mathematically consistent with your scenario probabilities. The scenario with the highest probability determines the overall sentiment direction. Any contradiction between scenarios and sentiment will invalidate the entire analysis.**

${dataSummary}

### 5. MULTI-METHODOLOGY APPROACH

Apply ALL three analytical frameworks and synthesize results:

#### Method A: Technical Trend Analysis
**Focus**: Traditional technical indicators and patterns
- Weight price action and momentum indicators heavily
- Emphasize moving averages, MACD, RSI
- Consider breakout/breakdown scenarios
- Analyze volume confirmation patterns

#### Method B: Statistical/Quantitative Analysis  
**Focus**: Probabilistic modeling and statistical patterns
- Apply Monte Carlo simulations
- Use regression analysis on historical data
- Calculate confidence intervals
- Employ machine learning pattern recognition

#### Method C: Market Structure Analysis
**Focus**: Support/resistance and mean reversion
- Analyze institutional flow and positioning
- Consider market microstructure
- Evaluate range-bound vs trending scenarios
- Assess volume profile and value areas

### 6. REQUIRED ANALYSIS COMPONENTS

#### A. Technical Assessment
1. **Trend Analysis**
   - Primary trend direction (${techData.trend_direction} - ${techData.trend_direction === 'bearish' ? 'below both SMAs' : techData.trend_direction === 'bullish' ? 'above both SMAs' : 'mixed signals'})
   - Momentum indicators status (RSI ${techData.rsi.toFixed(1)} - ${techData.rsi < 30 ? 'deeply oversold' : techData.rsi < 40 ? 'oversold' : techData.rsi < 60 ? 'neutral' : 'overbought'})
   - Moving average relationships (price ${sma20Deviation < 0 ? 'below' : 'above'} 20 SMA by ${Math.abs(sma20Deviation).toFixed(1)}%, ${sma50Deviation < 0 ? 'below' : 'above'} 50 SMA by ${Math.abs(sma50Deviation).toFixed(1)}%)

2. **Support/Resistance Framework**
   - Primary Support: ${formatPrice(techData.primary_support)} (${techData.support_tests} tests - ${techData.support_strength})
   - Primary Resistance: ${formatPrice(techData.primary_resistance)} (${techData.resistance_tests} tests - ${techData.resistance_strength})
   - Secondary Support: ${formatPrice(techData.bb_lower)} (Bollinger Lower), ${formatPrice(techData.session_low)} (Session Low), ${formatPrice(techData.previous_low)} (Previous Low)
   - Secondary Resistance: ${formatPrice(techData.bb_upper)} (Bollinger Upper), ${formatPrice(techData.session_high)} (Session High), ${formatPrice(techData.previous_high)} (Previous High)

3. **Volume Analysis**
   - Participation rates (${techData.volume_above_vwap_pct.toFixed(1)}% above VWAP - ${techData.institutional_sentiment.toLowerCase()})
   - Institutional positioning (${techData.institutional_sentiment.toLowerCase()} sentiment)
   - Volume-price relationships
   - Latest volume: ${formatRatio(techData.volume_ratio)} average (${techData.volume_status.toLowerCase()})

4. **Volatility Assessment**
   - ATR ${techData.atr.toFixed(3)} (${techData.volatility_expansion ? 'VOLATILITY EXPANSION!' : techData.atr_trend})
   - Bollinger Band positioning (${techData.bb_position})
   - Volatility regime identification (${techData.volatility_expansion ? 'high volatility' : 'normal volatility'})

#### B. Scenario Development (PRIMARY SENTIMENT DRIVER)
Create THREE distinct scenarios with probabilities that MUST sum to 100%:

**CRITICAL RULE: The scenario with the HIGHEST probability MUST determine the overall sentiment rating. No exceptions.**

**DIRECTIONAL BIAS CLASSIFICATION RULES:**
**NEUTRAL:** True consolidation/range-bound/sideways trading with no clear directional expectation. Price targets within ±2% of current level. Equal upside and downside risk.
**BEARISH:** Clear downward trend expectation with price targets >2% below current level. Specific technical breakdown scenarios.
**BULLISH:** Clear upward trend expectation with price targets >2% above current level. Specific technical breakout scenarios.

**Scenario 1: Base Case**
- Description: Most likely outcome based on current data (consolidation OR trend continuation - be specific)
- 1-Week Target: $X.XX
- 2-Week Target: $X.XX  
- Probability: XX% (Must be the highest if this drives sentiment)
- Key Assumptions: List 3-5 critical assumptions
- Invalidation Trigger: Specific price/volume level
- Directional Bias: [NEUTRAL for sideways/consolidation OR BULLISH/BEARISH for clear trend]

**Scenario 2: Bullish Alternative**
- Description: Conditions for upside surprise (oversold bounce OR breakout above resistance)
- 1-Week Target: $X.XX
- 2-Week Target: $X.XX
- Probability: XX%
- Required Catalysts: What must happen
- Confirmation Signals: Early warning indicators
- Directional Bias: BULLISH

**Scenario 3: Bearish Alternative**
- Description: Downside risk scenario (support breakdown OR trend acceleration)
- 1-Week Target: $X.XX
- 2-Week Target: $X.XX
- Probability: XX%
- Risk Factors: Primary threats
- Warning Signals: Early deterioration signs
- Directional Bias: BEARISH

**SCENARIO VALIDATION REQUIREMENTS:**
- All probabilities must sum to exactly 100%
- The highest probability scenario determines final sentiment
- If Base Case is 50%+, its directional bias becomes the sentiment
- If no single scenario exceeds 40%, sentiment must be NEUTRAL
- Sentiment intensity (1-5) scales with probability confidence gap

**ANTI-CONTRADICTION VALIDATION CHECKLIST:**
Before finalizing analysis, verify:
✓ Scenario descriptions match their directional bias labels
✓ Sideways/consolidation scenarios use NEUTRAL bias (NOT bearish/bullish)
✓ BEARISH bias only for scenarios expecting >2% price decline
✓ BULLISH bias only for scenarios expecting >2% price advance
✓ Base Case directional bias aligns with its price targets and description
✓ No "mild downward bias" in consolidation scenarios (contradiction!)

**COMMON MISTAKES TO AVOID:**
❌ "Sideways drift with mild downward bias" → Use NEUTRAL bias for consolidation
❌ Calling a range-bound scenario BEARISH just because of small downward lean
❌ Price target within ±2% but directional bias is BEARISH/BULLISH
❌ Consolidation description but non-NEUTRAL directional bias

### 7. RISK ASSESSMENT REQUIREMENTS

#### Quantitative Risk Metrics
Calculate for each scenario:
- Value at Risk (95% confidence level)
- Conditional Value at Risk (CVaR) 
- Maximum expected drawdown
- Sharpe ratio
- Win rate probability
- Risk-adjusted returns

#### Risk Factor Analysis
Identify and assess:
- Technical breakdown risks (${techData.trend_direction === 'bearish' ? 'already below SMAs' : 'SMA support intact'})
- Volume confirmation risks
- External market risks
- Liquidity risks
- Momentum exhaustion risks (RSI ${techData.rsi.toFixed(1)} ${techData.rsi < 40 ? 'oversold' : 'neutral'})

### 8. OUTPUT REQUIREMENTS - MAXIMUM 200 WORDS TOTAL

#### Analysis Output Format

**EXECUTIVE SUMMARY** (75 words max)
Current assessment, primary thesis, key targets, main risks, confidence level.

**PRICE PROJECTIONS** (50 words max)
\`\`\`
1-Week Target: $X.XX (±$X.XX) | Confidence: XX%
2-Week Target: $X.XX (±$X.XX) | Confidence: XX%
Method: [Primary approach used]
Key Risk: [Main threat to thesis]
\`\`\`

**CRITICAL LEVELS** (25 words max)
\`\`\`
Support: ${formatPrice(techData.primary_support)} (${techData.support_tests} tests) | Resistance: ${formatPrice(techData.primary_resistance)} (${techData.resistance_tests} tests) | Pivot: [Key decision level]
\`\`\`

**TRADING STRATEGY** (25 words max)
\`\`\`
Entry: $X.XX | Stop: $X.XX | Target: $X.XX | Size: [Risk %]
\`\`\`

### 9. FINAL SENTIMENT RATING (PROBABILITY-BASED DESCRIPTIVE SYSTEM)

#### Sentiment Calculation Rules (MANDATORY)

**STEP 1: Identify All Scenario Directional Biases**
- Determine each scenario's directional bias (BULLISH/BEARISH/NEUTRAL)
- Note individual scenario probabilities for aggregation
- IMPORTANT: Individual scenario dominance does NOT determine sentiment

**STEP 2: Aggregate Directional Probabilities (CRITICAL STEP)**
Before determining sentiment, you MUST combine probabilities for scenarios with the same directional bias:

**Directional Probability Aggregation Rules:**
1. **BULLISH TOTAL** = Sum of all BULLISH scenario probabilities
2. **BEARISH TOTAL** = Sum of all BEARISH scenario probabilities  
3. **NEUTRAL TOTAL** = Sum of all NEUTRAL scenario probabilities

**CRITICAL: These totals determine final sentiment, NOT individual scenario probabilities**

**Example Calculation:**
- Base Case: 50% [BULLISH] + Bullish Scenario: 25% [BULLISH] = 75% Total Bullish
- Bearish Scenario: 25% [BEARISH] = 25% Total Bearish
- Final Result: 75% Bullish vs 25% Bearish → "STRONG BULLISH" (75% ≥ 60%)

**STEP 3: Calculate Sentiment Label Based on AGGREGATED Probabilities**
Apply strength rules to the TOTAL directional probability (not individual scenarios):

**Probability-Based Sentiment Labels:**
- If highest TOTAL directional probability <40%: Use "WEAK [DIRECTION]"
- If highest TOTAL directional probability 40-60%: Use "[DIRECTION]" (no adjective)
- If highest TOTAL directional probability ≥60%: Use "STRONG [DIRECTION]"
- If no directional total >40% or neutral highest: Use "NEUTRAL"

**Direction Determination:**
- BULLISH: If Total Bullish probability is highest
- BEARISH: If Total Bearish probability is highest  
- NEUTRAL: If Total Neutral probability is highest OR no direction >40%

**STEP 4: Mathematical Validation Formula**
Calculate the sentiment using this CORRECTED logic:
1. Calculate: Total_Bullish = Sum(all BULLISH scenario probabilities)
2. Calculate: Total_Bearish = Sum(all BEARISH scenario probabilities) 
3. Calculate: Total_Neutral = Sum(all NEUTRAL scenario probabilities)
4. Find max(Total_Bullish, Total_Bearish, Total_Neutral)
5. Apply strength rules to the TOTAL probability:
   - If max total is Neutral or max_total <40%: "NEUTRAL"
   - If max total is Bullish: 
     - <40% total: "WEAK BULLISH"
     - 40-59% total: "BULLISH" 
     - ≥60% total: "STRONG BULLISH"
   - If max total is Bearish:
     - <40% total: "WEAK BEARISH"
     - 40-59% total: "BEARISH"
     - ≥60% total: "STRONG BEARISH"

**SENTIMENT OUTPUT FORMAT:**

\`\`\`
SCENARIO PROBABILITIES:
- Scenario 1 (Base): XX% [BULLISH/BEARISH/NEUTRAL]
- Scenario 2 (Bullish): XX% [BULLISH] 
- Scenario 3 (Bearish): XX% [BEARISH]
TOTAL: 100% ✓

DIRECTIONAL PROBABILITY AGGREGATION:
- Total Bullish: XX% (Sum of all BULLISH scenarios)
- Total Bearish: XX% (Sum of all BEARISH scenarios)  
- Total Neutral: XX% (Sum of all NEUTRAL scenarios)
AGGREGATION TOTAL: 100% ✓

DOMINANT DIRECTION: [BULLISH/BEARISH/NEUTRAL] at XX% total probability
MATHEMATICAL CALCULATION: Total [Direction] probability is XX%, therefore sentiment = [ADJECTIVE + DIRECTION]

FINAL SENTIMENT RATING: [STRONG/WEAK] [BULLISH/BEARISH] or [NEUTRAL]

CONSISTENCY CHECK: ✓ Sentiment aligns with highest TOTAL directional probability
JUSTIFICATION (25 words max): Driven by [XX%] total [direction] probability, supported by [key technical factor]

TIMEFRAME BREAKDOWN:
- 1-Week Sentiment: [STRONG/WEAK] [BULLISH/BEARISH] or [NEUTRAL] (XX% confidence)
- 2-Week Sentiment: [STRONG/WEAK] [BULLISH/BEARISH] or [NEUTRAL] (XX% confidence)
\`\`\`

**ANTI-CONTRADICTION SAFEGUARDS:**
- If sentiment doesn't match highest TOTAL directional probability, analysis FAILS
- Probabilities must sum to 100% or analysis FAILS
- Sentiment adjective must match TOTAL probability ranges exactly
- No contradictory directions allowed (e.g., bullish sentiment with bearish total dominance)
- Must show directional aggregation calculation in output

**EXAMPLES OF CORRECT SENTIMENT LABELS (WITH AGGREGATION):**

**Example 1: Neutral Consolidation**
- Base Case 50% [NEUTRAL], Bullish 30% [BULLISH], Bearish 20% [BEARISH]
- Aggregation: Total Neutral 50%, Total Bullish 30%, Total Bearish 20%
- Result: "NEUTRAL" (50% neutral is highest)

**Example 2: Strong Bullish (The Original Problem Case)**
- Base Case 50% [BULLISH], Bullish 25% [BULLISH], Bearish 25% [BEARISH]
- Aggregation: Total Bullish 75% (50%+25%), Total Bearish 25%, Total Neutral 0%
- Result: "STRONG BULLISH" (75% ≥ 60%)

**Example 3: Regular Bearish**
- Base Case 20% [NEUTRAL], Bullish 35% [BULLISH], Bearish 45% [BEARISH]
- Aggregation: Total Bearish 45%, Total Bullish 35%, Total Neutral 20%
- Result: "BEARISH" (45% is 40-60% range)

**Example 4: Weak Bullish**
- Base Case 30% [NEUTRAL], Bullish 38% [BULLISH], Bearish 32% [BEARISH]
- Aggregation: Total Bullish 38%, Total Bearish 32%, Total Neutral 30%
- Result: "WEAK BULLISH" (38% < 40%)

**Example 5: Neutral Due to Close Competition**
- Base Case 33% [NEUTRAL], Bullish 33% [BULLISH], Bearish 34% [BEARISH]
- Aggregation: Total Bearish 34%, Total Bullish 33%, Total Neutral 33%
- Result: "NEUTRAL" (no clear dominance, all within 5% of each other)

**CORRECTED EXAMPLE - WHAT WAS WRONG:**
❌ WRONG: Base Case 50% (Consolidation with mild downward bias) [BEARISH] → "BEARISH" 
✅ CORRECT: Base Case 50% (Consolidation between $33.30-$33.80) [NEUTRAL] → "NEUTRAL"

## ANALYSIS STANDARDS

### Precision Requirements
- Price targets: Nearest $0.05
- Probabilities: Nearest 5%
- Timeframes: Specific trading days
- Confidence: 1-10 scale with rationale

### Risk Management Standards
- Maximum 2% portfolio risk per position
- Stop losses must be technically justified
- Position sizing based on volatility (ATR ${techData.atr.toFixed(3)} - ${techData.volatility_expansion ? 'HIGH' : 'NORMAL'})
- Hedge recommendations when uncertainty high`;

  return enhancedPrompt;
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  const { ticker } = JSON.parse(event.body || '{}');
  
  if (!ticker) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Ticker is required' })
    };
  }

  try {
    console.log(`Starting analysis for ${ticker}`);
    
    // Import required modules - use native https instead of node-fetch
    const https = require('https');
    const url = require('url');
    
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
    
    if (!POLYGON_API_KEY || !CLAUDE_API_KEY) {
      console.error('API keys missing:', { 
        polygon: !!POLYGON_API_KEY, 
        claude: !!CLAUDE_API_KEY 
      });
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'API keys not configured' })
      };
    }

    // Helper function for HTTPS requests
    const makeHttpsRequest = (requestUrl, options = {}) => {
      return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(requestUrl);
        const reqOptions = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.path,
          method: options.method || 'GET',
          headers: options.headers || {}
        };
        
        const req = https.request(reqOptions, (res) => {
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
        
        if (options.body) {
          req.write(options.body);
        }
        
        req.setTimeout(60000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
        
        req.end();
      });
    };

    // Fetch data from Polygon API (15-minute data for enhanced analysis)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Reduced to 5 days
    
    const polygonUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/15/minute/${startDate}/${endDate}?adjusted=true&sort=asc&apikey=${POLYGON_API_KEY}`;
    console.log(`Fetching Polygon data: ${polygonUrl.replace(POLYGON_API_KEY, '[API_KEY]')}`);
    
    const polygonResponse = await makeHttpsRequest(polygonUrl);
    console.log(`Polygon response status: ${polygonResponse.status}`);
    
    if (!polygonResponse.ok) {
      console.error(`Polygon API error ${polygonResponse.status}:`, polygonResponse.data);
      throw new Error(`Polygon API error: ${polygonResponse.status} - ${polygonResponse.data}`);
    }
    
    const polygonData = JSON.parse(polygonResponse.data);
    console.log(`Polygon data status: ${polygonData.status}, count: ${polygonData.resultsCount || 0}`);
    
    if (!polygonData.results || polygonData.results.length === 0) {
      console.error('No Polygon data available:', polygonData);
      throw new Error(`No data available from Polygon API: ${polygonData.status || 'unknown status'}`);
    }

    // Process the data with enhanced technical analysis
    const techData = processEnhancedTechnicalData(polygonData, ticker);
    
    // Build the enhanced analysis prompt
    const enhancedPrompt = buildEnhancedAnalysisPrompt(techData);

    // Analyze with Claude using enhanced prompt
    const claudeRequestBody = JSON.stringify({
      model: 'claude-sonnet-4-20250514',  // Use Claude Sonnet 4 for best analysis
      max_tokens: 2000,  // Increased for comprehensive analysis
      messages: [{
        role: 'user',
        content: enhancedPrompt
      }]
    });

    console.log('Sending request to Claude API...');
    const claudeResponse = await makeHttpsRequest('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(claudeRequestBody)
      },
      body: claudeRequestBody
    });

    console.log(`Claude response status: ${claudeResponse.status}`);
    if (!claudeResponse.ok) {
      console.error(`Claude API error ${claudeResponse.status}:`, claudeResponse.data);
      throw new Error(`Claude API error: ${claudeResponse.status} - ${claudeResponse.data}`);
    }

    const claudeResult = JSON.parse(claudeResponse.data);
    const fullAnalysis = claudeResult.content[0].text;
    
    // Extract short outlook from the enhanced analysis
    const outlookMatch = fullAnalysis.match(/EXECUTIVE SUMMARY[^:]*?:\s*([^`]*?)(?:\n\*\*|\n```|$)/i);
    let shortOutlook = 'Analysis pending';
    
    if (outlookMatch) {
      shortOutlook = outlookMatch[1].trim();
      if (shortOutlook.length > 120) {
        shortOutlook = shortOutlook.substring(0, 117) + '...';
      }
    } else {
      // Fallback: try to extract sentiment and key insight
      const sentimentMatch = fullAnalysis.match(/FINAL SENTIMENT RATING:\s*([^`\n]*)/i);
      if (sentimentMatch) {
        shortOutlook = sentimentMatch[1].trim();
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ticker,
        timestamp: new Date().toISOString(),
        shortOutlook,
        fullAnalysis,
        techData,  // Include enhanced technical data
        dataSummary: `Enhanced Analysis for ${ticker}: RSI ${techData.rsi.toFixed(1)}, Price $${techData.current_price.toFixed(2)}, Trend ${techData.trend_direction}, VaR $${techData.var_95.toFixed(2)}`
      })
    };

  } catch (error) {
    console.error('Enhanced polygon analysis error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: `Enhanced analysis failed: ${error.message}` 
      })
    };
  }
};