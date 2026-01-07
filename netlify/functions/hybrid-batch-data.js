const https = require('https');
const yahooFinance = require('yahoo-finance2').default;

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function fetchTickerData(ticker, apiKey) {
  const errors = [];
  try {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // ========== POLYGON: Price Data ==========
    let currentPrice = null;
    let twelveWeeksAgoPrice = null;
    let volatilityPrices = [];

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // Get current price from Polygon
    try {
      const recentPriceUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${threeDaysAgo}/${today}?adjusted=true&sort=desc&limit=1&apiKey=${apiKey}`;
      console.log(`${ticker}: Fetching price from Polygon...`);
      const priceData = await httpsGet(recentPriceUrl);
      await delay(50);

      if (priceData.results && priceData.results.length > 0) {
        currentPrice = priceData.results[0].c;
        console.log(`${ticker}: Got price $${currentPrice}`);
      } else {
        errors.push(`Polygon price: no results (status: ${priceData.status || 'unknown'})`);
      }
    } catch (error) {
      errors.push(`Polygon price error: ${error.message}`);
      console.log(`${ticker}: Recent price fetch failed: ${error.message}`);
    }

    // Fallback to previous day
    if (!currentPrice) {
      try {
        const prevDayUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${apiKey}`;
        const priceData = await httpsGet(prevDayUrl);
        await delay(50);

        if (priceData.results && priceData.results.length > 0) {
          currentPrice = priceData.results[0].c;
        }
      } catch (error) {
        console.log(`${ticker}: Prev day price fetch failed`);
      }
    }

    // Get 12-week ago price from Polygon
    const eightyEightDaysAgo = new Date(Date.now() - 88 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const eightyDaysAgo = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      const twelveWeeksAgoUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${eightyEightDaysAgo}/${eightyDaysAgo}?adjusted=true&sort=desc&limit=1&apiKey=${apiKey}`;
      const twelveWeeksAgoData = await httpsGet(twelveWeeksAgoUrl);
      await delay(50);

      if (twelveWeeksAgoData.results && twelveWeeksAgoData.results.length > 0) {
        twelveWeeksAgoPrice = twelveWeeksAgoData.results[0].c;
      }
    } catch (error) {
      console.log(`${ticker}: 12-week ago price fetch failed`);
    }

    // Get 14-day volatility data from Polygon
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      const volatilityUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${fourteenDaysAgo}/${today}?adjusted=true&sort=asc&apiKey=${apiKey}`;
      const volatilityData = await httpsGet(volatilityUrl);
      await delay(50);

      if (volatilityData.results && volatilityData.results.length > 0) {
        volatilityPrices = volatilityData.results.map(day => day.c);
      }
    } catch (error) {
      console.log(`${ticker}: Volatility data fetch failed`);
    }

    // ========== YAHOO FINANCE: Dividend Data ==========
    let dividends = [];

    try {
      const now = new Date();
      const twentyFourWeeksAgo = new Date(now.getTime() - 168 * 24 * 60 * 60 * 1000);

      console.log(`${ticker}: Fetching dividends from Yahoo Finance...`);
      const chartData = await yahooFinance.chart(ticker, {
        period1: twentyFourWeeksAgo,
        period2: now,
        interval: '1d',
        events: 'div'
      });

      if (chartData.events && chartData.events.dividends) {
        dividends = Object.entries(chartData.events.dividends)
          .map(([timestamp, divData]) => ({
            date: new Date(divData.date * 1000),
            amount: divData.amount
          }))
          .filter(d => d.date && !isNaN(d.date.getTime()) && d.amount > 0)
          .sort((a, b) => b.date.getTime() - a.date.getTime());

        // Filter out duplicate dividends within 2 days of each other
        const filteredDividends = [];
        for (let i = 0; i < dividends.length; i++) {
          if (i === 0) {
            filteredDividends.push(dividends[i]);
          } else {
            const daysDiff = Math.abs(dividends[i].date.getTime() - filteredDividends[filteredDividends.length - 1].date.getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff >= 2) {
              filteredDividends.push(dividends[i]);
            }
          }
        }
        dividends = filteredDividends;
      }

      console.log(`${ticker}: Found ${dividends.length} dividends from Yahoo Finance`);
    } catch (error) {
      errors.push(`Yahoo dividends error: ${error.message}`);
      console.log(`${ticker}: Yahoo Finance dividend fetch failed: ${error.message}`);
    }

    // ========== CALCULATIONS ==========

    // Calculate median of last 3 dividends
    let medianDividend = null;
    let lastDividends = [];

    if (dividends.length > 0) {
      lastDividends = dividends.slice(0, Math.min(3, dividends.length)).map(d => d.amount);
      const sorted = [...lastDividends].sort((a, b) => a - b);

      if (sorted.length === 1) {
        medianDividend = sorted[0];
      } else if (sorted.length === 2) {
        medianDividend = (sorted[0] + sorted[1]) / 2;
      } else {
        medianDividend = sorted[1];
      }
    }

    // Calculate historical median (dividends 12-14 for weekly, ~12 weeks ago)
    let medianHistorical = null;
    let historicalDividends = [];

    if (dividends.length >= 15) {
      historicalDividends = [dividends[12].amount, dividends[13].amount, dividends[14].amount];
      const sorted = [...historicalDividends].sort((a, b) => a - b);
      medianHistorical = sorted[1];
    } else if (dividends.length >= 12) {
      historicalDividends = dividends.slice(9, 12).map(d => d.amount);
      if (historicalDividends.length === 3) {
        const sorted = [...historicalDividends].sort((a, b) => a - b);
        medianHistorical = sorted[1];
      } else if (historicalDividends.length === 2) {
        medianHistorical = (historicalDividends[0] + historicalDividends[1]) / 2;
      } else if (historicalDividends.length === 1) {
        medianHistorical = historicalDividends[0];
      }
    }

    // Calculate dividend erosion
    let divErosion = null;
    if (medianDividend && medianHistorical && medianHistorical > 0) {
      const erosionRate = ((medianDividend - medianHistorical) / medianHistorical);
      let rawErosion = erosionRate * 100;

      // Cap dividend appreciation at +20%, but allow full declines
      if (rawErosion > 20) {
        divErosion = 20;
      } else {
        divErosion = rawErosion;
      }
    }

    // Calculate forward yield
    let forwardYield = null;
    if (medianDividend && currentPrice && currentPrice > 0) {
      forwardYield = (medianDividend * 52 / currentPrice) * 100;
    }

    // Calculate NAV performance (12-week)
    let navPerformance = null;
    if (currentPrice && twelveWeeksAgoPrice && twelveWeeksAgoPrice > 0) {
      let rawNavPerformance = ((currentPrice - twelveWeeksAgoPrice) / twelveWeeksAgoPrice) * 100;

      // Cap NAV variance at +/-20%
      if (rawNavPerformance > 20) {
        navPerformance = 20;
      } else if (rawNavPerformance < -20) {
        navPerformance = -20;
      } else {
        navPerformance = rawNavPerformance;
      }
    }

    // Calculate 14-day volatility
    let volatility14Day = null;
    if (volatilityPrices.length > 1) {
      const returns = [];
      for (let i = 1; i < volatilityPrices.length; i++) {
        if (volatilityPrices[i-1] > 0) {
          returns.push((volatilityPrices[i] - volatilityPrices[i-1]) / volatilityPrices[i-1]);
        }
      }

      if (returns.length > 0) {
        const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
        volatility14Day = Math.sqrt(variance) * Math.sqrt(252) * 100;
      }
    }

    // Calculate 12-week dividend return
    let dividendReturn12Week = null;
    if (forwardYield != null) {
      dividendReturn12Week = forwardYield * (12/52);
    }

    // Calculate Sharpe Ratio
    let sharpeRatio = null;
    if (dividendReturn12Week != null && navPerformance != null && divErosion != null && volatility14Day != null && volatility14Day > 0) {
      const totalReturn = dividendReturn12Week + navPerformance + divErosion;
      const riskFreeRate = 2;
      sharpeRatio = (totalReturn - riskFreeRate) / volatility14Day;
    }

    console.log(`${ticker}: price=$${currentPrice?.toFixed(2)}, navPerf=${navPerformance?.toFixed(1)}%, divErosion=${divErosion?.toFixed(1)}%`);

    return {
      ticker,
      price: currentPrice,
      medianDividend: medianDividend,
      medianHistorical: medianHistorical,
      divErosion: divErosion,
      forwardYield: forwardYield,
      dividendReturn12Week: dividendReturn12Week,
      navPerformance: navPerformance,
      volatility14Day: volatility14Day,
      sharpeRatio: sharpeRatio,
      lastDividends: lastDividends,
      historicalDividends: historicalDividends,
      dividendCount: lastDividends.length,
      totalDividends: dividends.length,
      lastDividendDate: dividends.length > 0 ? dividends[0].date.toISOString().split('T')[0] : null,
      lastDividendAmount: dividends.length > 0 ? dividends[0].amount : null,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error.message);
    return {
      ticker,
      price: null,
      error: error.message,
      errors: errors
    };
  }
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

  const { tickers } = JSON.parse(event.body || '{}');

  if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Tickers array is required' })
    };
  }

  const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

  if (!POLYGON_API_KEY) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Polygon API key not configured' })
    };
  }

  try {
    console.log(`Hybrid batch: Fetching data for ${tickers.length} tickers (Polygon prices + Yahoo dividends)`);

    const results = {};

    // Process tickers sequentially to avoid rate limits
    for (const ticker of tickers) {
      const result = await fetchTickerData(ticker, POLYGON_API_KEY);
      results[result.ticker] = result;

      // Small delay between tickers
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Hybrid batch: Successfully processed ${Object.keys(results).length} tickers`);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(results)
    };
  } catch (error) {
    console.error('Error in hybrid batch fetch:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
