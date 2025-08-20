const https = require('https');

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
  try {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    // Fetch latest stock price
    const priceUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${apiKey}`;
    const priceData = await httpsGet(priceUrl);
    await delay(100); // Rate limiting
    
    // Fetch stock price from 30 days ago for NAV calculation
    const monthAgoDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgoUrl = `https://api.polygon.io/v1/open-close/${ticker}/${monthAgoDate}?adjusted=true&apiKey=${apiKey}`;
    const monthAgoData = await httpsGet(monthAgoUrl);
    await delay(100); // Rate limiting
    
    // Fetch 14-day historical data for volatility calculation
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const volatilityUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${fourteenDaysAgo}/${today}?adjusted=true&sort=asc&apiKey=${apiKey}`;
    const volatilityData = await httpsGet(volatilityUrl);
    await delay(100); // Rate limiting
    
    // Fetch dividend data (last 2 years to ensure we get at least 3 dividends)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dividendUrl = `https://api.polygon.io/v3/reference/dividends?ticker=${ticker}&order=desc&limit=10&apiKey=${apiKey}`;
    const dividendData = await httpsGet(dividendUrl);
    await delay(100); // Rate limiting
    
    // Calculate median of last 3 dividends
    let medianDividend = null;
    let lastDividends = [];
    if (dividendData.results && dividendData.results.length > 0) {
      // Get the last 3 dividends
      lastDividends = dividendData.results
        .slice(0, 3)
        .map(d => d.cash_amount)
        .filter(d => d > 0)
        .sort((a, b) => a - b);
      
      if (lastDividends.length > 0) {
        if (lastDividends.length === 1) {
          medianDividend = lastDividends[0];
        } else if (lastDividends.length === 2) {
          medianDividend = (lastDividends[0] + lastDividends[1]) / 2;
        } else {
          medianDividend = lastDividends[1]; // Middle value for 3 dividends
        }
      }
    }
    
    // Get the current price
    let currentPrice = null;
    if (priceData.results && priceData.results.length > 0) {
      currentPrice = priceData.results[0].c; // Closing price
    }
    
    // Get the month ago price
    let monthAgoPrice = null;
    if (monthAgoData.close) {
      monthAgoPrice = monthAgoData.close;
    }
    
    // Calculate forward yield (annualized)
    let forwardYield = null;
    if (medianDividend && currentPrice) {
      // Assume weekly dividends (52x per year) for these ETFs
      forwardYield = (medianDividend * 52 / currentPrice) * 100; // As percentage
    }
    
    // Calculate NAV (annualized price performance)
    let navPerformance = null;
    if (currentPrice && monthAgoPrice && monthAgoPrice > 0) {
      // (current price - month ago price) / month ago price * 12 (to annualize)
      navPerformance = ((currentPrice - monthAgoPrice) / monthAgoPrice) * 12 * 100; // As percentage
    }
    
    // Calculate 14-day volatility (standard deviation of daily returns)
    let volatility14Day = null;
    if (volatilityData.results && volatilityData.results.length > 1) {
      const prices = volatilityData.results.map(day => day.c); // closing prices
      const returns = [];
      
      // Calculate daily returns
      for (let i = 1; i < prices.length; i++) {
        if (prices[i-1] > 0) {
          returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
      }
      
      if (returns.length > 0) {
        // Calculate mean return
        const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        
        // Calculate variance
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
        
        // Standard deviation as percentage, annualized (sqrt(252) for daily to annual)
        volatility14Day = Math.sqrt(variance) * Math.sqrt(252) * 100;
      }
    }
    
    // Calculate Sharpe Ratio (assuming 2% risk-free rate annually)
    let sharpeRatio = null;
    if (forwardYield != null && navPerformance != null && volatility14Day != null && volatility14Day > 0) {
      const totalReturn = forwardYield + navPerformance; // Total expected return
      const riskFreeRate = 2; // 2% risk-free rate
      sharpeRatio = (totalReturn - riskFreeRate) / volatility14Day;
    }
    
    return {
      ticker,
      price: currentPrice,
      medianDividend: medianDividend,
      forwardYield: forwardYield,
      navPerformance: navPerformance,
      volatility14Day: volatility14Day,
      sharpeRatio: sharpeRatio,
      lastDividends: lastDividends,
      dividendCount: lastDividends.length
    };
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error);
    return {
      ticker,
      price: null,
      medianDividend: null,
      forwardYield: null,
      navPerformance: null,
      volatility14Day: null,
      error: error.message
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
    console.log(`Fetching batch data for ${tickers.length} tickers`);
    
    // Process tickers in batches to avoid rate limiting
    const results = {};
    const batchSize = 5;
    
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      const batchPromises = batch.map(ticker => fetchTickerData(ticker, POLYGON_API_KEY));
      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        results[result.ticker] = result;
      }
      
      // Add delay between batches
      if (i + batchSize < tickers.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(results)
    };
  } catch (error) {
    console.error('Error in batch data fetch:', error);
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