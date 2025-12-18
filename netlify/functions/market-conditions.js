// Netlify serverless function for market conditions
// Fetches Fear & Greed Index, VIX, and VOO price from real APIs
// Note: fetch is globally available in Netlify Functions (Node 18+)

// Helper function to get dates for API calls
function getDates() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  return {
    today: formatDate(today),
    yesterday: formatDate(yesterday)
  };
}

// Fetch CNN Fear & Greed Index
async function getFearGreedIndex() {
  try {
    const response = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Fear & Greed API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    const currentValue = Math.round(data.fear_and_greed.score); // Round to integer
    const rating = data.fear_and_greed.rating;

    let category = 'Neutral';
    let emoji = '😐';

    if (currentValue <= 25) {
      category = 'Extreme Fear';
      emoji = '😱';
    } else if (currentValue <= 45) {
      category = 'Fear';
      emoji = '😨';
    } else if (currentValue <= 55) {
      category = 'Neutral';
      emoji = '😐';
    } else if (currentValue <= 75) {
      category = 'Greed';
      emoji = '😃';
    } else {
      category = 'Extreme Greed';
      emoji = '🤑';
    }

    return {
      value: currentValue,
      rating: rating,
      category: category,
      emoji: emoji
    };
  } catch (error) {
    console.error('Error fetching Fear & Greed Index:', error);
    return null;
  }
}

// Fetch VIX from Polygon (falls back to Yahoo Finance if needed)
async function getVIX(apiKey) {
  const { today, yesterday } = getDates();

  // Try Polygon first if API key available
  if (apiKey) {
    try {
      const url = `https://api.polygon.io/v2/aggs/ticker/I:VIX/range/1/day/${yesterday}/${today}?apiKey=${apiKey}&adjusted=true&sort=desc&limit=1`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const vixValue = data.results[0].c;
        return {
          value: vixValue,
          category: vixValue < 15 ? 'Low' : vixValue < 25 ? 'Normal' : vixValue < 35 ? 'Elevated' : 'High',
          emoji: vixValue < 15 ? '😌' : vixValue < 25 ? '😐' : vixValue < 35 ? '😬' : '😰'
        };
      }
    } catch (error) {
      console.error('Polygon VIX fetch failed:', error);
    }
  }

  // Fallback to Yahoo Finance (free, no API key)
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d';
    const response = await fetch(url);
    const data = await response.json();

    if (data.chart && data.chart.result && data.chart.result[0]) {
      const quote = data.chart.result[0].indicators.quote[0];
      const vixValue = quote.close[quote.close.length - 1];

      return {
        value: vixValue,
        category: vixValue < 15 ? 'Low' : vixValue < 25 ? 'Normal' : vixValue < 35 ? 'Elevated' : 'High',
        emoji: vixValue < 15 ? '😌' : vixValue < 25 ? '😐' : vixValue < 35 ? '😬' : '😰'
      };
    }
  } catch (error) {
    console.error('Yahoo Finance VIX fetch failed:', error);
  }

  return null;
}

// Fetch VOO price from Polygon
async function getVOOPrice(apiKey) {
  if (!apiKey) {
    console.error('No Polygon API key provided');
    return null;
  }

  const { today, yesterday } = getDates();

  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/VOO/range/1/day/${yesterday}/${today}?apiKey=${apiKey}&adjusted=true&sort=desc&limit=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      return data.results[0].c; // Close price
    }
  } catch (error) {
    console.error('Error fetching VOO price:', error);
  }

  return null;
}

// Get strategy recommendation based on market conditions (VIX-AWARE framework)
function getStrategyRecommendation(fearGreed, vix) {
  if (!fearGreed || !vix) {
    return "Insufficient data for recommendation";
  }

  const fgValue = fearGreed.value;
  const vixValue = vix.value;

  // VIX ADJUSTMENT: VIX drives premium, adjust zone based on actual volatility
  // If VIX doesn't match typical range for F&G zone, shift strategy accordingly
  let adjustedZone = 'unknown';

  if (fgValue <= 25) {
    // Extreme Fear zone expects VIX 25-40+
    if (vixValue >= 25) {
      adjustedZone = 'extreme-fear';  // VIX matches, use extreme fear strategies
    } else {
      adjustedZone = 'fear';  // VIX too low, downgrade to fear strategies
    }
  } else if (fgValue <= 45) {
    // Fear zone expects VIX 18-25
    if (vixValue >= 25) {
      adjustedZone = 'extreme-fear';  // VIX very high, upgrade to extreme fear
    } else if (vixValue >= 18) {
      adjustedZone = 'fear';  // VIX matches, use fear strategies
    } else {
      adjustedZone = 'neutral';  // VIX too low, downgrade to neutral strategies
    }
  } else if (fgValue <= 55) {
    // Neutral zone expects VIX 13-18
    if (vixValue >= 20) {
      adjustedZone = 'fear';  // VIX elevated, upgrade to fear strategies
    } else if (vixValue >= 13) {
      adjustedZone = 'neutral';  // VIX matches, use neutral strategies
    } else {
      adjustedZone = 'greed';  // VIX very low, downgrade to greed strategies
    }
  } else if (fgValue <= 75) {
    // Greed zone expects VIX 11-14
    if (vixValue >= 18) {
      adjustedZone = 'neutral';  // VIX elevated, upgrade to neutral
    } else {
      adjustedZone = 'greed';  // VIX matches, use greed strategies
    }
  } else {
    // Extreme Greed zone expects VIX 9-12
    adjustedZone = 'extreme-greed';  // Always use defensive mode regardless of VIX
  }

  // Add VIX adjustment notice
  let vixNotice = '';
  if (fgValue <= 25 && vixValue < 25) {
    vixNotice = '\n⚠️ VIX ADJUSTMENT: F&G shows Extreme Fear but VIX is LOW (' + vixValue.toFixed(1) + '). Premium environment = FEAR zone.\n';
  } else if (fgValue <= 45 && vixValue < 18) {
    vixNotice = '\n⚠️ VIX ADJUSTMENT: F&G shows Fear but VIX is LOW (' + vixValue.toFixed(1) + '). Premium environment = NEUTRAL zone.\n';
  } else if (fgValue <= 45 && vixValue >= 25) {
    vixNotice = '\n🔥 VIX UPGRADE: F&G shows Fear but VIX is ELEVATED (' + vixValue.toFixed(1) + '). Premium environment = EXTREME FEAR!\n';
  } else if (fgValue <= 55 && vixValue >= 20) {
    vixNotice = '\n📈 VIX UPGRADE: F&G shows Neutral but VIX is ELEVATED (' + vixValue.toFixed(1) + '). Premium environment = FEAR zone.\n';
  } else if (fgValue <= 55 && vixValue < 13) {
    vixNotice = '\n💤 VIX ADJUSTMENT: F&G shows Neutral but VIX is LOW (' + vixValue.toFixed(1) + '). Premium environment = GREED zone.\n';
  }

  // Now use adjustedZone instead of fgValue for strategy selection

  // EXTREME FEAR - Typical VIX: 25-40+
  if (adjustedZone === 'extreme-fear') {
    return vixNotice + `🚨 EXTREME FEAR ZONE (F&G ${fgValue}) - VIX ${vixValue.toFixed(1)} | GO AGGRESSIVE

STRATEGY 1: Deep Discount Put Ladder (75-85% Success)
├─ Action: Sell cash-secured puts in 3 tranches
├─ Strikes: 8%, 10%, 12% below current (ladder down)
├─ DTE: 45-60 days
├─ Position: Deploy 100% cash (40%/35%/25% split)
├─ Roll: If untested at 21 DTE + 50% profit → close & resell
└─ Goal: Massive premium OR generational entry prices

STRATEGY 2: Opportunistic Put Ladder (60-70% Success)
├─ Action: Multiple strikes for price diversification
├─ Strikes: 5%, 8%, 12% below current
├─ DTE: 30-45 days
├─ Position: Split cash equally across 3 strikes
├─ Roll: Roll down & out if VOO drops further (collect credit)
└─ Goal: Average down cost basis, offset 3-6% via premium

STRATEGY 3: Short-DTE Aggressive Puts (80-90% Success)
├─ Action: Weekly put selling during peak panic
├─ Strike: 5-7% below current
├─ DTE: 7-14 days (weekly cycles)
├─ Position: 30-50% cash, redeploy weekly
├─ Roll: Take assignment or let expire (no rolls)
└─ Goal: Rapid premium accumulation (8-15% annualized)

⚠️ MANDATORY: Close ALL covered calls. Deploy cash NOW.
Premium is 2-4x normal. This is YOUR opportunity.`;
  }

  // FEAR - Typical VIX: 18-25
  if (adjustedZone === 'fear') {
    return vixNotice + `➕ FEAR ZONE (F&G ${fgValue}) - VIX ${vixValue.toFixed(1)} | BALANCED AGGRESSION

STRATEGY 1: Balanced Put Selling (70-80% Success)
├─ Action: Sell cash-secured puts
├─ Strike: 4-6% below current price
├─ DTE: 30-45 days
├─ Position: 60-80% of available cash
├─ Roll: If tested, roll down $5-10 & out 2-3 weeks (credit)
└─ Goal: 1.5-2x normal premium with moderate assignment risk

STRATEGY 2: Conservative Covered Calls (55-65% Success)
├─ Action: Sell covered calls (if holding VOO)
├─ Strike: 3-4% OTM
├─ DTE: 21-30 days
├─ Position: 50% of VOO holdings (keep 50% uncapped)
├─ Roll: If challenged, roll up & out for credit
└─ Goal: Capture premium while maintaining upside exposure

STRATEGY 3: Put Wheel Preparation (65-75% Success)
├─ Action: Sell puts with intention to own
├─ Strike: 3-5% below current
├─ DTE: 45-60 days
├─ Position: 100% of cash earmarked for VOO
├─ Roll: Take assignment → immediately sell covered calls
└─ Goal: "Buy VOO with discount coupon" (collect 1.5-2.5%)

💡 Fear often precedes sharp rallies. Position for recovery.`;
  }

  // NEUTRAL - Typical VIX: 13-18
  if (adjustedZone === 'neutral') {
    return vixNotice + `➡️ NEUTRAL ZONE (F&G ${fgValue}) - VIX ${vixValue.toFixed(1)} | INCOME MODE

STRATEGY 1: Bi-Weekly Covered Calls (70-75% Success)
├─ Action: Sell covered calls on VOO holdings
├─ Strike: 2-2.5% OTM ($5 above current)
├─ DTE: 14-16 days (bi-weekly cycles)
├─ Position: 75-100% of VOO holdings
├─ Roll: If within 0.5% of strike at 7 DTE → roll up $5, out 2wks
└─ Goal: 0.4-0.7% per cycle = 12-18% annualized income

STRATEGY 2: Strategic Put Selling (75-85% Success)
├─ Action: Sell puts to accumulate additional VOO
├─ Strike: 2-3% below current
├─ DTE: 30-45 days
├─ Position: 40-60% of available cash
├─ Roll: If untested at 21 DTE + 50% profit → close & resell
└─ Goal: Accumulate VOO at discount or 3-5% annualized on cash

STRATEGY 3: Simultaneous Calls + Puts (60-70% Success)
├─ Action: Sell covered calls AND cash-secured puts
├─ Strike Calls: 3% OTM | Strike Puts: 3% below
├─ DTE: 30-45 days
├─ Position: Calls on 100% holdings, puts with 50% cash
├─ Roll: Manage each leg independently
└─ Goal: Maximum premium in range-bound market (6% range)

✅ Autopilot mode. Collect steady income from time decay.`;
  }

  // GREED - Typical VIX: 11-14
  if (adjustedZone === 'greed') {
    return vixNotice + `😊 GREED ZONE (F&G ${fgValue}) - VIX ${vixValue.toFixed(1)} | CAPITAL PRESERVATION

STRATEGY 1: Tight Covered Calls (40-50% Success)
├─ Action: Sell covered calls to lock gains
├─ Strike: 1.5-2% OTM
├─ DTE: 14-21 days
├─ Position: 100% of VOO holdings
├─ Roll: If assigned → sell puts 2-3% below assignment price
└─ Goal: Lock gains (cap upside at 1.5-2%), protect against 5-10% correction

STRATEGY 2: Minimal Put Selling (85-90% Success)
├─ Action: Sell puts ONLY if holding 100% cash
├─ Strike: 1-2% below current
├─ DTE: 14-21 days
├─ Position: Maximum 30% of available cash
├─ Roll: Avoid rolls - take assignment if needed
└─ Goal: Low premiums (0.2-0.4%), only deploy if waiting to add

STRATEGY 3: Weekly Covered Calls (50-60% Success)
├─ Action: Sell weekly covered calls
├─ Strike: 1% OTM
├─ DTE: 5-7 days
├─ Position: 50% of holdings (keep 50% uncapped)
├─ Roll: Take assignment on half, keep other half
└─ Goal: Rapid theta decay while limiting opportunity cost

⚠️ Greed phases end abruptly. Prepare for reversal.`;
  }

  // EXTREME GREED - Typical VIX: 9-12
  if (adjustedZone === 'extreme-greed') {
    return vixNotice + `🛑 EXTREME GREED ZONE (F&G ${fgValue}) - VIX ${vixValue.toFixed(1)} | DEFENSIVE EXIT

STRATEGY 1: Aggressive Covered Calls (30-40% Success)
├─ Action: Sell covered calls on ALL holdings
├─ Strike: 0.5-1% OTM
├─ DTE: 7-14 days
├─ Position: 100% of VOO holdings
├─ Roll: DO NOT ROLL - take assignment & move to cash
└─ Goal: Lock gains. Assignment = successful profit-taking

STRATEGY 2: Zero Put Selling (100% Capital Preservation)
├─ Action: DO NOT sell puts
├─ Strike: N/A
├─ DTE: N/A
├─ Position: Hold 100% cash in reserve
├─ Roll: N/A
└─ Goal: Terrible risk/reward (0.1-0.2% premium). Wait for fear cycle.

STRATEGY 3: ATM/ITM Weekly Calls (15-25% Success - DESIGNED FOR ASSIGNMENT)
├─ Action: Sell ATM or slightly ITM weekly calls
├─ Strike: -0.5% to +0.5% from current (ATM)
├─ DTE: 5-7 days
├─ Position: 100% of holdings
├─ Roll: Take assignment immediately - do NOT chase
└─ Goal: "Sell signal in disguise." Exit near peak.

🚨 Extreme greed precedes corrections 80%+ of time.
GET OUT. Redeploy when F&G drops below 55.`;
  }

  return "➡️ Monitor Fear & Greed Index for strategy selection";
}

// Check for alerts (3-step system focused)
function checkAlerts(fearGreed, vix) {
  const alerts = [];

  // STEP 2 TRIGGER ALERT
  if (fearGreed && fearGreed.value <= 20) {
    alerts.push("🚨 STEP 2 TRIGGERED! Fear & Greed at " + fearGreed.value + " - CLOSE ALL COVERED CALLS. SELL CASH-SECURED PUTS 5-10% BELOW. NO CHOICE - GO AGGRESSIVE NOW!");
  }

  // STEP 2 WARNING ALERT
  if (fearGreed && fearGreed.value > 20 && fearGreed.value <= 25) {
    alerts.push("⚠️ STEP 2 APPROACHING: Fear & Greed at " + fearGreed.value + " - Prepare cash. Review current calls. Could trigger soon!");
  }

  // HIGH VIX ALERT (enhanced premium opportunity)
  if (vix && vix.value >= 30) {
    alerts.push("🌋 EXTREME VOLATILITY: VIX at " + vix.value.toFixed(2) + " - Premium is MASSIVE. If Step 2 triggers, assignment prices will be excellent.");
  }

  // COMBO ALERT: Extreme Fear + High VIX
  if (fearGreed && vix && fearGreed.value <= 25 && vix.value >= 25) {
    alerts.push("💎 MAXIMUM OPPORTUNITY ZONE: Fear + High VIX = This is the April 2025 scenario. Execute Step 2 with confidence!");
  }

  // EXTREME GREED - possible Step 3 scenario or take profits
  if (fearGreed && fearGreed.value >= 80) {
    alerts.push("🔔 EXTREME GREED: Market at " + fearGreed.value + " - If in Step 3 recovery, keep selling calls. If not assigned, sell aggressive ITM calls!");
  }

  // LOW PREMIUM ENVIRONMENT
  if (vix && vix.value < 12) {
    alerts.push("💤 LOW VOLATILITY: VIX " + vix.value.toFixed(2) + " - Step 1 premiums lower than usual. Still collect, but don't expect big payouts.");
  }

  return alerts;
}

// Main Netlify Function handler
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Get Polygon API key from environment variable
    const polygonApiKey = process.env.POLYGON_API_KEY;

    // Fetch all data in parallel
    console.log('Fetching market data...');
    const [fearGreed, vix, vooPrice] = await Promise.all([
      getFearGreedIndex(),
      getVIX(polygonApiKey),
      getVOOPrice(polygonApiKey)
    ]);

    console.log('Data fetched:', {
      fearGreed: fearGreed ? 'OK' : 'NULL',
      vix: vix ? 'OK' : 'NULL',
      vooPrice: vooPrice ? 'OK' : 'NULL'
    });

    // Generate recommendation and alerts
    const recommendation = getStrategyRecommendation(fearGreed, vix);
    const alerts = checkAlerts(fearGreed, vix);

    // Build response
    const responseData = {
      success: true,
      data: {
        fearGreedIndex: fearGreed,
        vix: vix,
        vooPrice: vooPrice,
        recommendation: recommendation,
        alerts: alerts,
        timestamp: new Date().toISOString()
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('Error in market-conditions function:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch market conditions',
        message: error.message
      })
    };
  }
};
