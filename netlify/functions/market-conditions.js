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

// Get strategy recommendation based on market conditions (options-focused)
function getStrategyRecommendation(fearGreed, vix) {
  if (!fearGreed || !vix) {
    return "Insufficient data for recommendation";
  }

  const fgValue = fearGreed.value;
  const vixValue = vix.value;

  // Extreme Fear + High VIX = Aggressive PUT selling opportunity
  if (fgValue <= 25 && vixValue >= 25) {
    return "🚀 AGGRESSIVE PUT SELLING: Extreme fear + high volatility = Sell ATM/ITM cash-secured puts on VOO (30-45 DTE). Premium is elevated, great entry prices if assigned.";
  }

  // Extreme Fear alone
  if (fgValue <= 20) {
    return "🔥 SELL CASH-SECURED PUTS: Historic fear levels. Sell puts 2-5% OTM on VOO (30-45 DTE). High premium + excellent assignment prices.";
  }

  // Fear (21-45)
  if (fgValue <= 45) {
    if (vixValue >= 20) {
      return "📈 SELL PUTS: Fear + elevated volatility. Sell cash-secured puts on VOO (1-3% OTM, 30-45 DTE). Good premium, favorable assignment risk.";
    }
    return "➕ SELL PUTS/BUY SHARES: Market fear. Sell puts on VOO (2-3% OTM, 30 DTE) or buy shares and prepare covered calls.";
  }

  // Neutral (46-55)
  if (fgValue <= 55) {
    return "➡️ COVERED CALLS + SELECTIVE PUTS: Balanced market. Sell covered calls on existing shares (1-2% OTM, 30-45 DTE). Only sell puts if IV is attractive.";
  }

  // Greed (56-75)
  if (fgValue <= 75) {
    if (vixValue < 15) {
      return "⚠️ AGGRESSIVE COVERED CALLS: Market greedy + low volatility. Sell ATM or slightly ITM covered calls (30-45 DTE) to capture premium. Avoid selling puts.";
    }
    return "😊 COVERED CALLS: Market greedy. Sell covered calls on VOO (0.5-1% OTM, 30-45 DTE). Consider closing profitable puts early.";
  }

  // Extreme Greed (76+)
  if (fgValue >= 76) {
    return "🛑 DEFENSIVE OPTIONS: Extreme greed. Sell ITM covered calls to secure profits. Close all short puts. Consider protective puts or reduce exposure.";
  }

  return "➡️ THETA GANG: Sell premium via covered calls and cash-secured puts based on portfolio allocation.";
}

// Check for alerts (options-focused)
function checkAlerts(fearGreed, vix) {
  const alerts = [];

  if (fearGreed && fearGreed.value <= 20) {
    alerts.push("⚡ EXTREME FEAR ALERT: Fear & Greed at " + fearGreed.value + " - PRIME PUT SELLING CONDITIONS! Sell cash-secured puts aggressively.");
  }

  if (vix && vix.value >= 30) {
    alerts.push("🌋 HIGH IV ALERT: VIX at " + vix.value.toFixed(2) + " - Options premium ELEVATED. Excellent time to sell puts/calls.");
  }

  if (fearGreed && vix && fearGreed.value <= 25 && vix.value >= 25) {
    alerts.push("💎 MAXIMUM PREMIUM OPPORTUNITY: Fear + High VIX = Sell ATM cash-secured puts for maximum premium + great assignment prices!");
  }

  if (fearGreed && fearGreed.value >= 80) {
    alerts.push("🔔 EXTREME GREED ALERT: Market at " + fearGreed.value + " - Close short puts, sell ITM covered calls to lock profits!");
  }

  if (vix && vix.value < 12 && fearGreed && fearGreed.value >= 60) {
    alerts.push("⚠️ LOW IV + GREED: VIX " + vix.value.toFixed(2) + " - Poor premium environment. Consider closing positions or waiting.");
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
