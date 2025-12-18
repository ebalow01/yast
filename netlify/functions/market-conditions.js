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
// Returns structured JSON for UI display with toggle functionality
function getStrategyRecommendation(fearGreed, vix) {
  if (!fearGreed || !vix) {
    return {
      zone: 'unknown',
      zoneTitle: 'Insufficient Data',
      vixNotice: null,
      primaryStrategies: [],
      alternateStrategies: [],
      note: 'Insufficient data for recommendation'
    };
  }

  const fgValue = fearGreed.value;
  const vixValue = vix.value;

  // VIX ADJUSTMENT: VIX drives premium, adjust zone based on actual volatility
  let adjustedZone = 'unknown';

  if (fgValue <= 25) {
    adjustedZone = vixValue >= 25 ? 'extreme-fear' : 'fear';
  } else if (fgValue <= 45) {
    if (vixValue >= 25) adjustedZone = 'extreme-fear';
    else if (vixValue >= 18) adjustedZone = 'fear';
    else adjustedZone = 'neutral';
  } else if (fgValue <= 55) {
    if (vixValue >= 20) adjustedZone = 'fear';
    else if (vixValue >= 13) adjustedZone = 'neutral';
    else adjustedZone = 'greed';
  } else if (fgValue <= 75) {
    adjustedZone = vixValue >= 18 ? 'neutral' : 'greed';
  } else {
    adjustedZone = 'extreme-greed';
  }

  // VIX adjustment notice
  let vixNotice = null;
  if (fgValue <= 25 && vixValue < 25) {
    vixNotice = '⚠️ VIX ADJUSTMENT: F&G shows Extreme Fear but VIX is LOW (' + vixValue.toFixed(1) + '). Premium environment = FEAR zone.';
  } else if (fgValue <= 45 && vixValue < 18) {
    vixNotice = '⚠️ VIX ADJUSTMENT: F&G shows Fear but VIX is LOW (' + vixValue.toFixed(1) + '). Premium environment = NEUTRAL zone.';
  } else if (fgValue <= 45 && vixValue >= 25) {
    vixNotice = '🔥 VIX UPGRADE: F&G shows Fear but VIX is ELEVATED (' + vixValue.toFixed(1) + '). Premium environment = EXTREME FEAR!';
  } else if (fgValue <= 55 && vixValue >= 20) {
    vixNotice = '📈 VIX UPGRADE: F&G shows Neutral but VIX is ELEVATED (' + vixValue.toFixed(1) + '). Premium environment = FEAR zone.';
  } else if (fgValue <= 55 && vixValue < 13) {
    vixNotice = '💤 VIX ADJUSTMENT: F&G shows Neutral but VIX is LOW (' + vixValue.toFixed(1) + '). Premium environment = GREED zone.';
  }

  // EXTREME FEAR - Typical VIX: 25-40+
  if (adjustedZone === 'extreme-fear') {
    return {
      zone: 'extreme-fear',
      zoneTitle: `🚨 EXTREME FEAR ZONE (F&G ${fgValue}) - VIX ${vixValue.toFixed(1)} | GO AGGRESSIVE`,
      vixNotice,
      primaryStrategies: [],
      alternateStrategies: [
        {
          name: 'Deep Discount Put Ladder',
          successRate: '75-85%',
          requiresCash: true,
          requiresShares: false,
          action: 'Sell cash-secured puts in 3 tranches',
          strike: '8%, 10%, 12% below current (ladder down)',
          dte: '45-60 days',
          position: 'Deploy 100% cash (40%/35%/25% split)',
          roll: 'If untested at 21 DTE + 50% profit → close & resell',
          goal: 'Massive premium OR generational entry prices'
        },
        {
          name: 'Opportunistic Put Ladder',
          successRate: '60-70%',
          requiresCash: true,
          requiresShares: false,
          action: 'Multiple strikes for price diversification',
          strike: '5%, 8%, 12% below current',
          dte: '30-45 days',
          position: 'Split cash equally across 3 strikes',
          roll: 'Roll down & out if VOO drops further (collect credit)',
          goal: 'Average down cost basis, offset 3-6% via premium'
        },
        {
          name: 'Short-DTE Aggressive Puts',
          successRate: '80-90%',
          requiresCash: true,
          requiresShares: false,
          action: 'Weekly put selling during peak panic',
          strike: '5-7% below current',
          dte: '7-14 days (weekly cycles)',
          position: '30-50% cash, redeploy weekly',
          roll: 'Take assignment or let expire (no rolls)',
          goal: 'Rapid premium accumulation (8-15% annualized)'
        }
      ],
      note: '⚠️ MANDATORY: Close ALL covered calls. Deploy cash NOW. Premium is 2-4x normal. This is YOUR opportunity.'
    };
  }

  // FEAR - Typical VIX: 18-25
  if (adjustedZone === 'fear') {
    return {
      zone: 'fear',
      zoneTitle: `➕ FEAR ZONE (F&G ${fgValue}) - VIX ${vixValue.toFixed(1)} | BALANCED AGGRESSION`,
      vixNotice,
      primaryStrategies: [
        {
          name: 'Conservative Covered Calls',
          successRate: '55-65%',
          requiresCash: false,
          requiresShares: true,
          action: 'Sell covered calls (if holding VOO)',
          strike: '3-4% OTM',
          dte: '21-30 days',
          position: '50% of VOO holdings (keep 50% uncapped)',
          roll: 'If challenged, roll up & out for credit',
          goal: 'Capture premium while maintaining upside exposure'
        }
      ],
      alternateStrategies: [
        {
          name: 'Balanced Put Selling',
          successRate: '70-80%',
          requiresCash: true,
          requiresShares: false,
          action: 'Sell cash-secured puts',
          strike: '4-6% below current price',
          dte: '30-45 days',
          position: '60-80% of available cash',
          roll: 'If tested, roll down $5-10 & out 2-3 weeks (credit)',
          goal: '1.5-2x normal premium with moderate assignment risk'
        },
        {
          name: 'Put Wheel Preparation',
          successRate: '65-75%',
          requiresCash: true,
          requiresShares: false,
          action: 'Sell puts with intention to own',
          strike: '3-5% below current',
          dte: '45-60 days',
          position: '100% of cash earmarked for VOO',
          roll: 'Take assignment → immediately sell covered calls',
          goal: '"Buy VOO with discount coupon" (collect 1.5-2.5%)'
        }
      ],
      note: '💡 Fear often precedes sharp rallies. Position for recovery.'
    };
  }

  // NEUTRAL - Typical VIX: 13-18
  if (adjustedZone === 'neutral') {
    return {
      zone: 'neutral',
      zoneTitle: `➡️ NEUTRAL ZONE (F&G ${fgValue}) - VIX ${vixValue.toFixed(1)} | INCOME MODE`,
      vixNotice,
      primaryStrategies: [
        {
          name: 'Bi-Weekly Covered Calls',
          successRate: '70-75%',
          requiresCash: false,
          requiresShares: true,
          action: 'Sell covered calls on VOO holdings',
          strike: '2-2.5% OTM ($5 above current)',
          dte: '14-16 days (bi-weekly cycles)',
          position: '75-100% of VOO holdings',
          roll: 'If within 0.5% of strike at 7 DTE → roll up $5, out 2wks',
          goal: '0.4-0.7% per cycle = 12-18% annualized income'
        }
      ],
      alternateStrategies: [
        {
          name: 'Strategic Put Selling',
          successRate: '75-85%',
          requiresCash: true,
          requiresShares: false,
          action: 'Sell puts to accumulate additional VOO',
          strike: '2-3% below current',
          dte: '30-45 days',
          position: '40-60% of available cash',
          roll: 'If untested at 21 DTE + 50% profit → close & resell',
          goal: 'Accumulate VOO at discount or 3-5% annualized on cash'
        },
        {
          name: 'Simultaneous Calls + Puts',
          successRate: '60-70%',
          requiresCash: true,
          requiresShares: true,
          action: 'Sell covered calls AND cash-secured puts',
          strike: 'Calls: 3% OTM | Puts: 3% below',
          dte: '30-45 days',
          position: 'Calls on 100% holdings, puts with 50% cash',
          roll: 'Manage each leg independently',
          goal: 'Maximum premium in range-bound market (6% range)'
        }
      ],
      note: '✅ Autopilot mode. Collect steady income from time decay.'
    };
  }

  // GREED - Typical VIX: 11-14
  if (adjustedZone === 'greed') {
    return {
      zone: 'greed',
      zoneTitle: `😊 GREED ZONE (F&G ${fgValue}) - VIX ${vixValue.toFixed(1)} | CAPITAL PRESERVATION`,
      vixNotice,
      primaryStrategies: [
        {
          name: 'Tight Covered Calls',
          successRate: '40-50%',
          requiresCash: false,
          requiresShares: true,
          action: 'Sell covered calls to lock gains',
          strike: '1.5-2% OTM',
          dte: '14-21 days',
          position: '100% of VOO holdings',
          roll: 'If assigned → sell puts 2-3% below assignment price',
          goal: 'Lock gains (cap upside at 1.5-2%), protect against 5-10% correction'
        },
        {
          name: 'Weekly Covered Calls',
          successRate: '50-60%',
          requiresCash: false,
          requiresShares: true,
          action: 'Sell weekly covered calls',
          strike: '1% OTM',
          dte: '5-7 days',
          position: '50% of holdings (keep 50% uncapped)',
          roll: 'Take assignment on half, keep other half',
          goal: 'Rapid theta decay while limiting opportunity cost'
        }
      ],
      alternateStrategies: [
        {
          name: 'Minimal Put Selling',
          successRate: '85-90%',
          requiresCash: true,
          requiresShares: false,
          action: 'Sell puts ONLY if holding 100% cash',
          strike: '1-2% below current',
          dte: '14-21 days',
          position: 'Maximum 30% of available cash',
          roll: 'Avoid rolls - take assignment if needed',
          goal: 'Low premiums (0.2-0.4%), only deploy if waiting to add'
        }
      ],
      note: '⚠️ Greed phases end abruptly. Prepare for reversal.'
    };
  }

  // EXTREME GREED - Typical VIX: 9-12
  if (adjustedZone === 'extreme-greed') {
    return {
      zone: 'extreme-greed',
      zoneTitle: `🛑 EXTREME GREED ZONE (F&G ${fgValue}) - VIX ${vixValue.toFixed(1)} | DEFENSIVE EXIT`,
      vixNotice,
      primaryStrategies: [
        {
          name: 'Aggressive Covered Calls',
          successRate: '30-40%',
          requiresCash: false,
          requiresShares: true,
          action: 'Sell covered calls on ALL holdings',
          strike: '0.5-1% OTM',
          dte: '7-14 days',
          position: '100% of VOO holdings',
          roll: 'DO NOT ROLL - take assignment & move to cash',
          goal: 'Lock gains. Assignment = successful profit-taking'
        },
        {
          name: 'ATM/ITM Weekly Calls',
          successRate: '15-25%',
          requiresCash: false,
          requiresShares: true,
          action: 'Sell ATM or slightly ITM weekly calls',
          strike: '-0.5% to +0.5% from current (ATM)',
          dte: '5-7 days',
          position: '100% of holdings',
          roll: 'Take assignment immediately - do NOT chase',
          goal: '"Sell signal in disguise." Exit near peak.'
        }
      ],
      alternateStrategies: [
        {
          name: 'Zero Put Selling',
          successRate: '100%',
          requiresCash: true,
          requiresShares: false,
          action: 'DO NOT sell puts',
          strike: 'N/A',
          dte: 'N/A',
          position: 'Hold 100% cash in reserve',
          roll: 'N/A',
          goal: 'Terrible risk/reward (0.1-0.2% premium). Wait for fear cycle.'
        }
      ],
      note: '🚨 Extreme greed precedes corrections 80%+ of time. GET OUT. Redeploy when F&G drops below 55.'
    };
  }

  return {
    zone: 'unknown',
    zoneTitle: 'Monitor Market Conditions',
    vixNotice: null,
    primaryStrategies: [],
    alternateStrategies: [],
    note: '➡️ Monitor Fear & Greed Index for strategy selection'
  };
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
