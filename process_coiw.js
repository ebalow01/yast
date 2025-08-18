const fs = require('fs');
const data = JSON.parse(fs.readFileSync('coiw_15min_data.json', 'utf8'));

// Get last 5 trading days (130 bars)
const results = data.results;
const last130 = results.slice(-130);

console.log('Total bars available:', results.length);
console.log('Using last 130 bars for 5 trading days');

// Current data
const latest = last130[last130.length - 1];
const oneDayAgo = last130[last130.length - 26] || last130[0];
const twoDaysAgo = last130[last130.length - 52] || last130[0];

const currentPrice = latest.c;
const dailyChange = oneDayAgo ? ((currentPrice - oneDayAgo.c) / oneDayAgo.c) * 100 : 0;
const twoDayChange = twoDaysAgo ? ((currentPrice - twoDaysAgo.c) / twoDaysAgo.c) * 100 : 0;

// Calculate RSI
let rsi = 0;
if (last130.length >= 14) {
  const prices = last130.slice(-15).map(r => r.c);
  const gains = [];
  const losses = [];
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
  
  if (avgLoss > 0) {
    const rs = avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
  }
}

// Calculate SMAs
const sma20 = last130.length >= 20 ? 
  last130.slice(-20).reduce((sum, r) => sum + r.c, 0) / 20 : currentPrice;
const sma50 = last130.length >= 50 ? 
  last130.slice(-50).reduce((sum, r) => sum + r.c, 0) / 50 : currentPrice;

// Session high/low
const recentBars = last130.slice(-26); // Last trading day
const sessionHigh = Math.max(...recentBars.map(r => r.h));
const sessionLow = Math.min(...recentBars.map(r => r.l));

// Fibonacci retracement levels
const range = sessionHigh - sessionLow;
const fib236 = sessionLow + (range * 0.236);
const fib382 = sessionLow + (range * 0.382);
const fib50 = sessionLow + (range * 0.5);
const fib618 = sessionLow + (range * 0.618);

// Support/Resistance analysis
const recentData = last130.slice(-30);
const highs = recentData.map(r => r.h);
const lows = recentData.map(r => r.l);

const priceHits = {};
highs.concat(lows).forEach(price => {
  const roundedPrice = Math.round(price * 4) / 4;
  priceHits[roundedPrice] = (priceHits[roundedPrice] || 0) + 1;
});

const significantLevels = Object.entries(priceHits)
  .filter(([price, hits]) => hits >= 2)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6)
  .map(([price, hits]) => {
    const level = parseFloat(price);
    const type = level > currentPrice ? 'RESISTANCE' : 'SUPPORT';
    return `$${level.toFixed(2)} (${hits} hits) - ${type}`;
  });

// Candlestick pattern analysis - only show patterns worth points
const patternBars = last130.slice(-20); // Check more bars to find patterns worth points
let patternStrength = 0;
const candlestickAnalysis = [];

patternBars.forEach(bar => {
  const bodySize = Math.abs(bar.c - bar.o);
  const totalRange = bar.h - bar.l;
  const upperWick = bar.h - Math.max(bar.o, bar.c);
  const lowerWick = Math.min(bar.o, bar.c) - bar.l;
  
  let pattern = "";
  let points = 0;
  
  if (bodySize < 0.03) {
    pattern += "DOJI ";
    points += 1;
  }
  if (lowerWick > bodySize * 2) {
    pattern += "HAMMER ";
    if (bar.c > bar.o) points += 2; // Only bullish hammers get points
  }
  
  // Only include bars that score points
  if (points > 0) {
    const direction = bar.c > bar.o ? "BULLISH" : "BEARISH";
    // Convert UTC to ET (Eastern Time)
    const utcDate = new Date(bar.t);
    // Format date in ET timezone
    const etString = utcDate.toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    // Convert MM/DD/YYYY, HH:MM to YYYY-MM-DD HH:MM ET
    const [date, time] = etString.split(', ');
    const [month, day, year] = date.split('/');
    const datetime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time} ET`;
    patternStrength += points;
    
    candlestickAnalysis.push(`${datetime}: ${direction} ${pattern.trim()} | Body: ${bodySize.toFixed(2)} | Range: ${totalRange.toFixed(2)} [+${points}pts]`);
  }
});

// Take only the most recent 5 pattern bars that scored points
const recentPatterns = candlestickAnalysis.slice(-5);

// Volume analysis
const avgVolume = last130.slice(-20).reduce((sum, bar) => sum + bar.v, 0) / 20;
const latestVolume = latest.v;
const volumeRatio = latestVolume / avgVolume;
const volumeStatus = volumeRatio > 1.5 ? 'HIGH' : volumeRatio < 0.5 ? 'LOW' : 'NORMAL';

// Generate the complete query
const apiQuery = `COMPREHENSIVE TECHNICAL ANALYSIS for COIW:

== PRICE DATA ==
- Current Price: $${currentPrice.toFixed(2)}
- Daily Change: ${dailyChange > 0 ? '+' : ''}${dailyChange.toFixed(2)}%
- 2-Day Change: ${twoDayChange > 0 ? '+' : ''}${twoDayChange.toFixed(2)}%
- Session High: $${sessionHigh.toFixed(2)}
- Session Low: $${sessionLow.toFixed(2)}
- RSI (14-period): ${rsi.toFixed(1)}
- Price vs 20-period SMA: ${currentPrice > sma20 ? 'above' : 'below'} ($${sma20.toFixed(2)})
- Price vs 50-period SMA: ${currentPrice > sma50 ? 'above' : 'below'} ($${sma50.toFixed(2)})

== FIBONACCI RETRACEMENT LEVELS ==
- 23.6% Retracement: $${fib236.toFixed(2)}
- 38.2% Retracement: $${fib382.toFixed(2)}
- 50.0% Retracement: $${fib50.toFixed(2)}
- 61.8% Retracement: $${fib618.toFixed(2)}

== KEY SUPPORT/RESISTANCE LEVELS (most tested) ==
${significantLevels.join('\n')}

== RECENT CANDLESTICK PATTERNS (Bars with signals) ==
${recentPatterns.length > 0 ? recentPatterns.join('\n') : 'No significant patterns in recent bars'}
Pattern Strength Score: ${patternStrength}/10

== VOLUME ANALYSIS ==
- Latest Volume: ${latestVolume.toLocaleString()}
- 20-Bar Average: ${Math.round(avgVolume).toLocaleString()}
- Volume Ratio: ${volumeRatio.toFixed(2)}x average (${volumeStatus})

Data points: ${last130.length} 15-minute bars (5 trading days)

Please provide a comprehensive technical analysis with SPECIFIC PRICE TARGETS:

1. **Short-term outlook** (1-2 weeks): Expected price range with specific dollar amounts

2. **Candlestick Pattern Analysis**: 
   - Identify specific candlestick patterns (doji, hammer, shooting star, engulfing, etc.)
   - Note any reversal or continuation patterns in the recent 15-minute bars
   - Analyze the significance of wicks/shadows and body sizes
   - Comment on volume confirmation with candlestick patterns

3. **Technical pattern analysis** based on price movement and chart patterns

4. **RSI interpretation** (current reading: ${rsi.toFixed(1)})

5. **Moving average analysis** (price vs SMA 20/50)

6. **Risk assessment**: 
   - SPECIFIC price level where you should cut losses (exact $ amount)
   - SPECIFIC price level that signals danger (exact $ amount)
   - Maximum acceptable loss as specific dollar amount from current price

7. **Trading recommendations**:
   - EXACT entry price if buying (specific $ amount)
   - EXACT exit price for profit-taking (specific $ amount) 
   - EXACT stop-loss price (specific $ amount)
   - Target price for 1-week, 2-week timeframes

DO NOT use vague terms like "wait for RSI" or "SMA crossings". Give me actual dollar amounts and specific price levels based on the current price of $${currentPrice.toFixed(2)}.`;

console.log(apiQuery);