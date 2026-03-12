const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(data); }
      });
    }).on('error', reject);
  });
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Profile 1 Early Signal Scanner
 *
 * Finds tickers showing the "beaten-down stabilization" pattern:
 * - NAV declined -2% to -20% over 12 weeks
 * - NAV decline is decelerating (2nd half less negative than 1st half)
 * - At least one significant dividend cut (>30%)
 * - Recent dividends have stabilized (last 4 divs CV < 30%)
 * - Price below 92% of 12-week high
 * - Annualized volatility < 50%
 * - Price >= $10
 *
 * Backtested: 72% win rate, +22.8% avg return over 12-week holds
 */

const CRITERIA = {
  NAV_DECLINE_MIN: -2.0,
  NAV_DECLINE_MAX: -20.0,
  DIV_CUT_THRESHOLD: -0.30,
  PRICE_BELOW_HIGH_PCT: 0.92,
  MIN_DIVS: 6,
  DIV_STABILIZATION_CV: 0.30,
  MAX_VOLATILITY: 50.0,
  MIN_PRICE: 10.0,
};

async function analyzeTickerProfile1(ticker, apiKey) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const twelveWeeksAgo = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const sixWeeksAgo = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch 12-week daily prices and dividends in parallel
    const priceUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${twelveWeeksAgo}/${today}?adjusted=true&sort=asc&apiKey=${apiKey}`;
    const dividendUrl = `https://api.polygon.io/v3/reference/dividends?ticker=${ticker}&order=desc&limit=15&apiKey=${apiKey}`;

    const [priceData, dividendData] = await Promise.all([
      httpsGet(priceUrl),
      httpsGet(dividendUrl)
    ]);

    await delay(50); // Rate limiting

    // Need sufficient price data
    if (!priceData.results || priceData.results.length < 20) {
      return null;
    }

    const prices = priceData.results;
    const currentPrice = prices[prices.length - 1].c;

    // Price filter
    if (currentPrice < CRITERIA.MIN_PRICE) {
      return null;
    }

    // NAV change over 12 weeks
    const startPrice = prices[0].c;
    const navChange = ((currentPrice - startPrice) / startPrice) * 100;

    // Find 12-week high
    const highPrice = Math.max(...prices.map(p => p.c));
    const pctOfHigh = currentPrice / highPrice;

    // NAV deceleration: split prices into first and second half
    const mid = Math.floor(prices.length / 2);
    const firstHalfStart = prices[0].c;
    const firstHalfEnd = prices[mid].c;
    const secondHalfStart = prices[mid].c;
    const secondHalfEnd = prices[prices.length - 1].c;

    const fhChange = ((firstHalfEnd - firstHalfStart) / firstHalfStart) * 100;
    const shChange = ((secondHalfEnd - secondHalfStart) / secondHalfStart) * 100;
    const decelerating = shChange > fhChange;

    // Volatility (annualized from daily returns)
    const dailyReturns = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1].c > 0) {
        dailyReturns.push((prices[i].c - prices[i - 1].c) / prices[i - 1].c);
      }
    }
    const meanReturn = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((s, r) => s + Math.pow(r - meanReturn, 2), 0) / dailyReturns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;

    // Dividend analysis
    let dividends = [];
    if (dividendData.results && dividendData.results.length > 0) {
      // Filter to dividends within our 12-week window, sorted newest first
      const windowStart = new Date(twelveWeeksAgo);
      dividends = dividendData.results
        .filter(d => d.cash_amount > 0 && new Date(d.ex_dividend_date) >= windowStart)
        .sort((a, b) => new Date(b.ex_dividend_date) - new Date(a.ex_dividend_date));
    }

    const numDivs = dividends.length;

    // Need minimum dividends
    let hasBigCut = false;
    let last4Cv = null;
    let divsStabilized = false;
    let divAmounts = dividends.map(d => d.cash_amount);

    if (numDivs >= 4) {
      // Check for dividend cuts (chronological order = reverse the array)
      const chronological = [...divAmounts].reverse();
      for (let i = 1; i < chronological.length; i++) {
        if (chronological[i - 1] > 0) {
          const change = (chronological[i] - chronological[i - 1]) / chronological[i - 1];
          if (change < CRITERIA.DIV_CUT_THRESHOLD) {
            hasBigCut = true;
            break;
          }
        }
      }

      // CV of last 4 dividends (most recent 4)
      const last4 = divAmounts.slice(0, 4);
      const mean4 = last4.reduce((s, v) => s + v, 0) / last4.length;
      if (mean4 > 0) {
        const std4 = Math.sqrt(last4.reduce((s, v) => s + Math.pow(v - mean4, 2), 0) / last4.length);
        last4Cv = std4 / mean4;
        divsStabilized = last4Cv < CRITERIA.DIV_STABILIZATION_CV;
      }
    }

    // Evaluate all criteria
    const navInRange = navChange >= CRITERIA.NAV_DECLINE_MAX && navChange <= CRITERIA.NAV_DECLINE_MIN;
    const volOk = volatility < CRITERIA.MAX_VOLATILITY;
    const priceBelow = pctOfHigh < CRITERIA.PRICE_BELOW_HIGH_PCT;
    const enoughDivs = numDivs >= CRITERIA.MIN_DIVS;

    const criteria = {
      navInRange: { passed: navInRange, detail: `NAV ${navChange.toFixed(1)}%` },
      decelerating: { passed: decelerating, detail: `1stH ${fhChange.toFixed(1)}%, 2ndH ${shChange.toFixed(1)}%` },
      divCut: { passed: hasBigCut, detail: hasBigCut ? 'cut found' : 'no cut' },
      divsStabilized: { passed: divsStabilized, detail: last4Cv != null ? `CV ${(last4Cv * 100).toFixed(0)}%` : 'n/a' },
      priceBelow: { passed: priceBelow, detail: `${(pctOfHigh * 100).toFixed(0)}% of high` },
      volOk: { passed: volOk, detail: `vol ${volatility.toFixed(1)}%` },
      enoughDivs: { passed: enoughDivs, detail: `${numDivs} divs` },
    };

    const criteriaMet = Object.values(criteria).filter(c => c.passed).length;
    const failed = Object.entries(criteria)
      .filter(([, c]) => !c.passed)
      .map(([key, c]) => c.detail);

    // Estimate yield from last 4 weekly dividends
    let estYield = 0;
    let avgWeeklyDiv = 0;
    if (numDivs >= 4) {
      avgWeeklyDiv = divAmounts.slice(0, 4).reduce((s, v) => s + v, 0) / 4;
      estYield = (avgWeeklyDiv * 52 / currentPrice) * 100;
    }

    return {
      ticker,
      price: currentPrice,
      navChange,
      fhNav: fhChange,
      shNav: shChange,
      volatility,
      pctOfHigh: pctOfHigh * 100,
      numDivs,
      last4Cv: last4Cv != null ? last4Cv * 100 : null,
      estYield,
      avgWeeklyDiv,
      criteriaMet,
      isSignal: criteriaMet === 7,
      isNearMiss: criteriaMet >= 5 && criteriaMet < 7,
      failed,
    };
  } catch (error) {
    console.error(`Error analyzing ${ticker}:`, error.message);
    return null;
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { tickers } = JSON.parse(event.body);

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'tickers array required' }) };
    }

    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Polygon API key not configured' }) };
    }

    console.log(`Profile 1 scan: analyzing ${tickers.length} tickers`);

    // Process in batches to respect rate limits
    const results = [];
    const batchSize = 5;

    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(ticker => analyzeTickerProfile1(ticker, apiKey))
      );
      results.push(...batchResults.filter(r => r !== null));
      if (i + batchSize < tickers.length) {
        await delay(100); // Rate limit between batches
      }
    }

    const signals = results.filter(r => r.isSignal).sort((a, b) => a.navChange - b.navChange);
    const nearMisses = results.filter(r => r.isNearMiss).sort((a, b) => b.criteriaMet - a.criteriaMet || a.navChange - b.navChange);

    console.log(`Profile 1 scan complete: ${signals.length} signals, ${nearMisses.length} near misses`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        signals,
        nearMisses,
        criteria: CRITERIA,
        scannedAt: new Date().toISOString(),
        totalScanned: tickers.length,
      })
    };
  } catch (error) {
    console.error('Early signal scan error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
