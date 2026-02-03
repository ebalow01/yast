// Netlify serverless function for market conditions
// Fetches Fear & Greed Index, VIX, VOO price, and SPY price from real APIs

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

    const currentValue = Math.round(data.fear_and_greed.score);
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
      return data.results[0].c;
    }
  } catch (error) {
    console.error('Error fetching VOO price:', error);
  }

  return null;
}

// Fetch SPY price from Polygon
async function getSPYPrice(apiKey) {
  if (!apiKey) {
    console.error('No Polygon API key provided');
    return null;
  }

  const { today, yesterday } = getDates();

  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/SPY/range/1/day/${yesterday}/${today}?apiKey=${apiKey}&adjusted=true&sort=desc&limit=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      return data.results[0].c;
    }
  } catch (error) {
    console.error('Error fetching SPY price:', error);
  }

  return null;
}

// Find the nearest Mon/Wed/Fri weekly expiration to today + targetDTE
function getNearestWeeklyExpiration(targetDTE) {
  const today = new Date();
  const target = new Date(today);
  target.setDate(target.getDate() + targetDTE);

  // SPY has Mon(1), Wed(3), Fri(5) weeklies
  const weeklyDays = [1, 3, 5];
  let best = null;
  let bestDiff = Infinity;

  // Check 7 days around the target to find closest Mon/Wed/Fri
  for (let offset = -3; offset <= 3; offset++) {
    const candidate = new Date(target);
    candidate.setDate(candidate.getDate() + offset);
    if (weeklyDays.includes(candidate.getDay())) {
      const diff = Math.abs(offset);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = candidate;
      }
    }
  }

  const formatDate = (d) => d.toISOString().split('T')[0];
  const actualDTE = Math.round((best - today) / (1000 * 60 * 60 * 24));

  return { date: formatDate(best), dte: actualDTE };
}

// Fetch live SPY option near target delta from Polygon snapshot API
async function getSPYOptionNearDelta(apiKey, targetDelta, expirationDate) {
  if (!apiKey) return null;

  try {
    const url = `https://api.polygon.io/v3/snapshot/options/SPY?expiration_date=${expirationDate}&contract_type=call&limit=250&apiKey=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('Polygon options API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.error('No option results returned from Polygon');
      return null;
    }

    // Find the call with delta closest to targetDelta
    let bestMatch = null;
    let bestDiff = Infinity;

    for (const option of data.results) {
      const delta = option.greeks?.delta;
      if (delta == null) continue;

      const diff = Math.abs(delta - targetDelta);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestMatch = option;
      }
    }

    if (!bestMatch) return null;

    const bid = bestMatch.last_quote?.bid ?? null;
    const ask = bestMatch.last_quote?.ask ?? null;
    const midPrice = (bid != null && ask != null) ? +((bid + ask) / 2).toFixed(2) : null;

    return {
      strike: bestMatch.details?.strike_price ?? null,
      delta: bestMatch.greeks?.delta != null ? +bestMatch.greeks.delta.toFixed(3) : null,
      midPrice,
      bid,
      ask
    };
  } catch (error) {
    console.error('Error fetching SPY options:', error);
    return null;
  }
}

// Get the static covered call strategy definition
function getCoveredCallStrategy() {
  return {
    name: 'SPY Covered Call Strategy',
    performance: {
      return: '+175.18%',
      sharpe: 1.17,
      sortino: 1.54,
      maxDrawdown: '-16.61%',
      period: 'Feb 2021 - Jan 2026'
    },
    setup: 'Buy as many 100-share lots of SPY as affordable. Sell 0.30 delta calls at 21 DTE against every 100 shares.',
    rules: [
      {
        priority: 1,
        name: 'Roll Up and Out',
        trigger: 'SPY within 1% of call strike or above it',
        action: 'Roll to 0.30 delta strike at 30 DTE. New strike >= old strike + $1. Skip if DTE < 1.'
      },
      {
        priority: 2,
        name: 'Roll Out at DTE',
        trigger: 'DTE <= 7 and not caught by Priority 1',
        action: 'Roll to same-or-higher strike at 30 DTE. New strike = max(current strike, 0.30 delta strike at 30 DTE).'
      },
      {
        priority: 3,
        name: 'Roll at Profit Target',
        trigger: 'Position decayed 80% (kept 80% of premium)',
        action: 'Roll to fresh 0.30 delta call at 21 DTE. This is a roll, not close+reopen.'
      },
      {
        priority: 4,
        name: 'Reinvest',
        trigger: 'Available cash >= SPY price x 100',
        action: 'Buy another 100 shares, then sell a call against them.'
      },
      {
        priority: 5,
        name: 'New Entry',
        trigger: 'Any 100 shares not covered by a call',
        action: 'Sell 0.30 delta call at 21 DTE.'
      }
    ],
    parameters: {
      target_delta: 0.30,
      target_dte: 21,
      roll_target_dte: 30,
      roll_up_threshold: 0.01,
      roll_dte_trigger: 7,
      profit_target: 0.80,
      max_positions: 20
    },
    designDecisions: [
      'Roll at profit target, don\'t close+reopen: Eliminates gap days. Worth +10pp return.',
      '1% roll-up threshold (not 2%): Fewer unnecessary transactions.',
      'Always reinvest: Compounding added +30pp over 5 years.',
      '30 delta: Sweet spot between premium and upside participation.',
      '21 DTE new / 30 DTE rolls: Fast theta on new entries, meaningful credit on rolls.'
    ]
  };
}

// Check for covered-call-relevant alerts
function checkAlerts(fearGreed, vix) {
  const alerts = [];

  if (vix && vix.value >= 30) {
    alerts.push('VIX at ' + vix.value.toFixed(2) + ' — premiums are elevated. Rolling now captures rich credit.');
  }

  if (vix && vix.value >= 25 && vix.value < 30) {
    alerts.push('VIX at ' + vix.value.toFixed(2) + ' — above-average premiums. Good environment for new entries and rolls.');
  }

  if (vix && vix.value < 12) {
    alerts.push('VIX at ' + vix.value.toFixed(2) + ' — low volatility. Premiums are thin; consider tighter DTE or waiting for a pop.');
  }

  if (fearGreed && fearGreed.value <= 25) {
    alerts.push('Extreme Fear (F&G ' + fearGreed.value + ') — market dislocation. If holding cash, reinvest rule may trigger. Premiums are rich.');
  }

  if (fearGreed && fearGreed.value >= 80) {
    alerts.push('Extreme Greed (F&G ' + fearGreed.value + ') — elevated reversal risk. Ensure all shares are covered.');
  }

  return alerts;
}

// Main Netlify Function handler
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const polygonApiKey = process.env.POLYGON_API_KEY;

    // Calculate nearest weekly expirations for 21 DTE and 30 DTE
    const newEntryExp = getNearestWeeklyExpiration(21);
    const rollExp = getNearestWeeklyExpiration(30);

    console.log('Fetching market data...');
    const [fearGreed, vix, vooPrice, spyPrice, newEntryOption, rollOption] = await Promise.all([
      getFearGreedIndex(),
      getVIX(polygonApiKey),
      getVOOPrice(polygonApiKey),
      getSPYPrice(polygonApiKey),
      getSPYOptionNearDelta(polygonApiKey, 0.30, newEntryExp.date),
      getSPYOptionNearDelta(polygonApiKey, 0.30, rollExp.date)
    ]);

    console.log('Data fetched:', {
      fearGreed: fearGreed ? 'OK' : 'NULL',
      vix: vix ? 'OK' : 'NULL',
      vooPrice: vooPrice ? 'OK' : 'NULL',
      spyPrice: spyPrice ? 'OK' : 'NULL',
      newEntryOption: newEntryOption ? 'OK' : 'NULL',
      rollOption: rollOption ? 'OK' : 'NULL'
    });

    const strategy = getCoveredCallStrategy();

    // Always include expiration dates; strike/delta/price are best-effort from API
    strategy.liveOptions = {
      newEntry: {
        expiration: newEntryExp.date,
        dte: newEntryExp.dte,
        strike: newEntryOption?.strike ?? null,
        delta: newEntryOption?.delta ?? null,
        midPrice: newEntryOption?.midPrice ?? null,
        bid: newEntryOption?.bid ?? null,
        ask: newEntryOption?.ask ?? null
      },
      roll: {
        expiration: rollExp.date,
        dte: rollExp.dte,
        strike: rollOption?.strike ?? null,
        delta: rollOption?.delta ?? null,
        midPrice: rollOption?.midPrice ?? null,
        bid: rollOption?.bid ?? null,
        ask: rollOption?.ask ?? null
      }
    };

    const alerts = checkAlerts(fearGreed, vix);

    const responseData = {
      success: true,
      data: {
        fearGreedIndex: fearGreed,
        vix: vix,
        vooPrice: vooPrice,
        spyPrice: spyPrice,
        strategy: strategy,
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
