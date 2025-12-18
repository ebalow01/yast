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

    const currentValue = data.fear_and_greed.score;
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

// Get strategy recommendation based on market conditions
function getStrategyRecommendation(fearGreed, vix) {
  if (!fearGreed || !vix) {
    return "Insufficient data for recommendation";
  }

  const fgValue = fearGreed.value;
  const vixValue = vix.value;

  // Extreme Fear + High VIX = Aggressive buying opportunity
  if (fgValue <= 25 && vixValue >= 25) {
    return "🚀 AGGRESSIVE BUY: Extreme fear + elevated volatility = prime opportunity for SPXL/TQQQ";
  }

  // Extreme Fear
  if (fgValue <= 25) {
    return "📈 BUY: Market fear presents buying opportunity. Consider leveraged positions.";
  }

  // Fear
  if (fgValue <= 45) {
    return "➕ ACCUMULATE: Moderate fear. Good time to add positions gradually.";
  }

  // Extreme Greed + Low VIX = Caution
  if (fgValue >= 75 && vixValue < 15) {
    return "⚠️ CAUTION: Extreme greed + low volatility. Consider taking profits or hedging.";
  }

  // Extreme Greed
  if (fgValue >= 75) {
    return "💰 TAKE PROFITS: Extreme greed. Consider reducing exposure or securing gains.";
  }

  // Greed
  if (fgValue >= 55) {
    return "😊 HOLD/TRIM: Market greedy. Hold positions but consider light profit-taking.";
  }

  // Neutral
  return "➡️ NEUTRAL: Market balanced. Maintain current strategy.";
}

// Check for alerts
function checkAlerts(fearGreed, vix) {
  const alerts = [];

  if (fearGreed && fearGreed.value <= 20) {
    alerts.push("⚡ EXTREME FEAR ALERT: Fear & Greed at " + fearGreed.value + " - Historical buying opportunity!");
  }

  if (vix && vix.value >= 30) {
    alerts.push("🌋 HIGH VOLATILITY ALERT: VIX at " + vix.value.toFixed(2) + " - Market turbulence expected");
  }

  if (fearGreed && vix && fearGreed.value <= 25 && vix.value >= 25) {
    alerts.push("💎 GOLDEN OPPORTUNITY: Fear + Volatility = Historically strong buy signal");
  }

  if (fearGreed && fearGreed.value >= 80) {
    alerts.push("🔔 EXTREME GREED ALERT: Market may be overheated at " + fearGreed.value);
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
