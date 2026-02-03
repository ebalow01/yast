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

// Standard normal CDF approximation (Abramowitz & Stegun)
function normCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

// Black-Scholes call delta: N(d1)
function bsDelta(spotPrice, strike, timeYears, riskFreeRate, iv) {
  if (timeYears <= 0 || iv <= 0) return null;
  const d1 = (Math.log(spotPrice / strike) + (riskFreeRate + 0.5 * iv * iv) * timeYears) / (iv * Math.sqrt(timeYears));
  return normCDF(d1);
}

// Fetch option near target delta from Polygon snapshot API
async function getOptionFromPolygon(apiKey, ticker, targetDelta, expirationDate) {
  if (!apiKey) return null;

  try {
    const url = `https://api.polygon.io/v3/snapshot/options/${ticker}?expiration_date=${expirationDate}&contract_type=call&limit=250&apiKey=${apiKey}`;
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
      ask,
      source: 'polygon'
    };
  } catch (error) {
    console.error(`Error fetching ${ticker} options from Polygon:`, error);
    return null;
  }
}

// Get Yahoo Finance cookie + crumb (required since ~2024)
async function getYahooCrumb() {
  try {
    const cookieRes = await fetch('https://fc.yahoo.com', { redirect: 'manual' });
    const setCookie = cookieRes.headers.get('set-cookie');
    if (!setCookie) return null;

    const cookieMatch = setCookie.match(/A3=[^;]+/);
    if (!cookieMatch) return null;
    const cookie = cookieMatch[0];

    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookie }
    });
    if (!crumbRes.ok) return null;
    const crumb = await crumbRes.text();

    return { cookie, crumb };
  } catch (error) {
    console.error('Error getting Yahoo crumb:', error);
    return null;
  }
}

// Fetch option chain from Yahoo Finance and compute delta via Black-Scholes
// ticker: e.g. 'SPY' or 'VOO'; targetDTE in days; finds closest real Yahoo expiration
async function getOptionFromYahoo(ticker, targetDelta, targetDTE, spotPrice, auth) {
  if (!spotPrice || !auth) return null;

  try {
    const yahooHeaders = { 'User-Agent': 'Mozilla/5.0', 'Cookie': auth.cookie };

    // First fetch to get available expiration dates
    const listUrl = `https://query1.finance.yahoo.com/v7/finance/options/${ticker}?crumb=${encodeURIComponent(auth.crumb)}`;
    const listRes = await fetch(listUrl, { headers: yahooHeaders });
    if (!listRes.ok) {
      console.error(`Yahoo ${ticker} options list error:`, listRes.status);
      return null;
    }

    const listData = await listRes.json();
    const expirations = listData?.optionChain?.result?.[0]?.expirationDates;
    if (!expirations || expirations.length === 0) {
      console.error(`No Yahoo expiration dates for ${ticker}`);
      return null;
    }

    // Find the closest expiration to today + targetDTE
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + targetDTE);
    const targetUnix = targetDate.getTime() / 1000;

    let bestExp = expirations[0];
    let bestDiff = Infinity;
    for (const exp of expirations) {
      const diff = Math.abs(exp - targetUnix);
      if (diff < bestDiff) { bestDiff = diff; bestExp = exp; }
    }

    // Fetch the option chain for that expiration
    const chainUrl = `https://query1.finance.yahoo.com/v7/finance/options/${ticker}?date=${bestExp}&crumb=${encodeURIComponent(auth.crumb)}`;
    const chainRes = await fetch(chainUrl, { headers: yahooHeaders });
    if (!chainRes.ok) {
      console.error(`Yahoo ${ticker} options chain error:`, chainRes.status);
      return null;
    }

    const chainData = await chainRes.json();
    const calls = chainData?.optionChain?.result?.[0]?.options?.[0]?.calls;
    if (!calls || calls.length === 0) {
      console.error(`No Yahoo ${ticker} calls for expiration`, bestExp);
      return null;
    }

    // Calculate actual expiration date and time to expiry
    const expDate = new Date(bestExp * 1000);
    const actualExpiration = expDate.toISOString().split('T')[0];
    const actualDTE = Math.round((expDate - today) / (1000 * 60 * 60 * 24));
    const timeYears = (expDate - today) / (365.25 * 24 * 60 * 60 * 1000);
    const riskFreeRate = 0.045;

    let bestMatch = null;
    let bestMatchDiff = Infinity;
    let bestDelta = null;

    for (const call of calls) {
      const iv = call.impliedVolatility;
      const strike = call.strike;
      if (iv == null || strike == null) continue;

      const delta = bsDelta(spotPrice, strike, timeYears, riskFreeRate, iv);
      if (delta == null) continue;

      const diff = Math.abs(delta - targetDelta);
      if (diff < bestMatchDiff) {
        bestMatchDiff = diff;
        bestMatch = call;
        bestDelta = delta;
      }
    }

    if (!bestMatch) return null;

    const bid = bestMatch.bid ?? null;
    const ask = bestMatch.ask ?? null;
    const midPrice = (bid != null && ask != null) ? +((bid + ask) / 2).toFixed(2) : null;

    return {
      strike: bestMatch.strike ?? null,
      delta: bestDelta != null ? +bestDelta.toFixed(3) : null,
      midPrice,
      bid,
      ask,
      source: 'yahoo',
      expiration: actualExpiration,
      dte: actualDTE
    };
  } catch (error) {
    console.error(`Error fetching ${ticker} options from Yahoo Finance:`, error);
    return null;
  }
}

// Try Polygon first, then fall back to Yahoo Finance
async function getOptionNearDelta(apiKey, ticker, targetDelta, expirationDate, targetDTE, spotPrice, yahooCrumb) {
  const polygonResult = await getOptionFromPolygon(apiKey, ticker, targetDelta, expirationDate);
  if (polygonResult) return polygonResult;

  console.log(`Polygon ${ticker} options unavailable, falling back to Yahoo Finance`);
  return getOptionFromYahoo(ticker, targetDelta, targetDTE, spotPrice, yahooCrumb);
}

// Get the static covered call strategy definition
function getCoveredCallStrategy() {
  return {
    name: 'SPY Covered Call Strategy',
    performance: {
      totalReturn: '+175.18%',
      annualizedReturn: '+22.4%',
      sharpe: 1.17,
      sortino: 1.54,
      maxDrawdown: '-16.61%',
      period: 'Feb 2021 - Jan 2026 (5 yr)'
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

    // Fetch core market data first (SPY price needed for Yahoo options fallback)
    console.log('Fetching market data...');
    const [fearGreed, vix, vooPrice, spyPrice] = await Promise.all([
      getFearGreedIndex(),
      getVIX(polygonApiKey),
      getVOOPrice(polygonApiKey),
      getSPYPrice(polygonApiKey)
    ]);

    // Get Yahoo crumb once (shared by all Yahoo option fetches)
    const yahooCrumb = await getYahooCrumb();

    // Fetch SPY and VOO options in parallel (Polygon first, Yahoo fallback)
    const [spyNewEntry, spyRoll, vooNewEntry, vooRoll] = await Promise.all([
      getOptionNearDelta(polygonApiKey, 'SPY', 0.30, newEntryExp.date, 21, spyPrice, yahooCrumb),
      getOptionNearDelta(polygonApiKey, 'SPY', 0.30, rollExp.date, 30, spyPrice, yahooCrumb),
      getOptionNearDelta(polygonApiKey, 'VOO', 0.30, newEntryExp.date, 21, vooPrice, yahooCrumb),
      getOptionNearDelta(polygonApiKey, 'VOO', 0.30, rollExp.date, 30, vooPrice, yahooCrumb)
    ]);

    console.log('Data fetched:', {
      fearGreed: fearGreed ? 'OK' : 'NULL',
      vix: vix ? 'OK' : 'NULL',
      vooPrice: vooPrice ? 'OK' : 'NULL',
      spyPrice: spyPrice ? 'OK' : 'NULL',
      spyNewEntry: spyNewEntry ? `OK (${spyNewEntry.source})` : 'NULL',
      spyRoll: spyRoll ? `OK (${spyRoll.source})` : 'NULL',
      vooNewEntry: vooNewEntry ? `OK (${vooNewEntry.source})` : 'NULL',
      vooRoll: vooRoll ? `OK (${vooRoll.source})` : 'NULL'
    });

    const strategy = getCoveredCallStrategy();

    function buildOptionEntry(option, fallbackExp) {
      return {
        expiration: option?.expiration ?? fallbackExp.date,
        dte: option?.dte ?? fallbackExp.dte,
        strike: option?.strike ?? null,
        delta: option?.delta ?? null,
        midPrice: option?.midPrice ?? null,
        bid: option?.bid ?? null,
        ask: option?.ask ?? null,
        source: option?.source ?? null
      };
    }

    strategy.liveOptions = {
      spy: {
        newEntry: buildOptionEntry(spyNewEntry, newEntryExp),
        roll: buildOptionEntry(spyRoll, rollExp)
      },
      voo: {
        newEntry: buildOptionEntry(vooNewEntry, newEntryExp),
        roll: buildOptionEntry(vooRoll, rollExp)
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
