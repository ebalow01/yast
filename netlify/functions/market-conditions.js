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

// Get strategy recommendation based on market conditions (3-step systematic strategy)
function getStrategyRecommendation(fearGreed, vix) {
  if (!fearGreed || !vix) {
    return "Insufficient data for recommendation";
  }

  const fgValue = fearGreed.value;
  const vixValue = vix.value;

  // STEP 2: EXTREME FEAR TRIGGER - Forced aggression
  if (fgValue <= 20) {
    return "🚨 STEP 2: EXTREME FEAR TRIGGER\n\nMANDATORY ACTIONS (NO CHOICE):\n1. Close ALL covered calls immediately (buy back)\n2. Sell cash-secured puts on VOO:\n   - Strike: 5-10% below current price\n   - DTE: 30-45 days\n   - Premium will be MASSIVE\n3. DO NOT QUESTION IT - System says go aggressive = GO AGGRESSIVE\n\nResult: Either collect huge premium OR get assigned at discount prices for Step 3.";
  }

  // STEP 2 WARNING: Fear approaching extreme levels
  if (fgValue <= 25) {
    return "⚠️ APPROACHING EXTREME FEAR (Step 2 Zone)\n\nCurrent: Continue covered calls (Step 1)\nPrepare for Step 2 if F&G drops below 20:\n- Have cash ready for put selling\n- Review current covered calls (may need to close)\n- Monitor VIX - currently at " + vixValue.toFixed(2);
  }

  // Moderate Fear - transition zone
  if (fgValue <= 45) {
    return "➕ STEP 1 + OPPORTUNISTIC PUTS\n\nPrimary: Continue covered call cycle (every 2 weeks, 14 DTE)\nOptional: Sell selective cash-secured puts if premium attractive\n- Only if you want more shares\n- 2-3% OTM, 30 DTE\n\nStill in Step 1 territory - monthly income mode.";
  }

  // STEP 1: MONTHLY INCOME MODE (Normal Market)
  if (fgValue <= 60) {
    return "✅ STEP 1: MONTHLY INCOME (AUTOPILOT)\n\nCovered Call Cycle:\n- Frequency: Every 2 weeks\n- Strike: $5 OTM from current price\n- DTE: 14 days\n- This is systematic - no thinking required\n\nStatus: Normal market conditions. Stay in autopilot mode.";
  }

  // Greed - continue Step 1 but watch for reversal
  if (fgValue <= 75) {
    return "😊 STEP 1 CONTINUES (Market Greedy)\n\nCovered Call Cycle:\n- Same parameters: $5 OTM, 14 DTE, every 2 weeks\n- Market greedy but not extreme\n- Consider slightly closer strikes (ATM/ITM) for higher premium\n\nWatch for reversal - could drop into Step 2 zone quickly.";
  }

  // STEP 3 CONTEXT: Recovery after assignment (or extreme greed)
  if (fgValue >= 76) {
    return "🎯 EXTREME GREED or STEP 3: RECOVERY MODE\n\nIf recently assigned from puts (Step 3):\n- Sell covered calls well above your cost basis\n- Collect premium during entire recovery\n- No rush - let stock recover while earning\n\nIf no assignment:\n- Sell aggressive covered calls (ATM/ITM)\n- Market overheated - secure profits";
  }

  return "➡️ STEP 1: Sell covered calls every 2 weeks ($5 OTM, 14 DTE)";
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
