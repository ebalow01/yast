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
    
    // Fetch latest stock price - try current/latest first, then fall back to previous day
    let priceData = null;
    let currentPrice = null;
    
    // First try to get the most recent price from the last 3 trading days
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const recentPriceUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${threeDaysAgo}/${today}?adjusted=true&sort=desc&limit=1&apiKey=${apiKey}`;
    
    try {
      priceData = await httpsGet(recentPriceUrl);
      await delay(100); // Rate limiting
      
      // If we got recent data, use the most recent closing price
      if (priceData.results && priceData.results.length > 0) {
        currentPrice = priceData.results[0].c; // Most recent closing price
      }
    } catch (error) {
      console.log(`Recent price fetch failed for ${ticker}, falling back to prev day`);
    }
    
    // Fallback to previous day if recent data not available
    if (!currentPrice) {
      const prevDayUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${apiKey}`;
      priceData = await httpsGet(prevDayUrl);
      await delay(100); // Rate limiting
      
      if (priceData.results && priceData.results.length > 0) {
        currentPrice = priceData.results[0].c;
      }
    }
    
    // Fetch stock price from 12 weeks (84 days) ago for NAV calculation
    // Use a range to handle weekends/holidays
    const eightyEightDaysAgo = new Date(Date.now() - 88 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const eightyDaysAgo = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const twelveWeeksAgoUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${eightyEightDaysAgo}/${eightyDaysAgo}?adjusted=true&sort=desc&limit=1&apiKey=${apiKey}`;
    const twelveWeeksAgoData = await httpsGet(twelveWeeksAgoUrl);
    await delay(100); // Rate limiting
    
    // Fetch 14-day historical data for volatility calculation
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const volatilityUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${fourteenDaysAgo}/${today}?adjusted=true&sort=asc&apiKey=${apiKey}`;
    const volatilityData = await httpsGet(volatilityUrl);
    await delay(100); // Rate limiting
    
    // Fetch dividend data (last 15 dividends to get both recent and historical)
    const dividendUrl = `https://api.polygon.io/v3/reference/dividends?ticker=${ticker}&order=desc&limit=15&apiKey=${apiKey}`;
    const dividendData = await httpsGet(dividendUrl);
    await delay(100); // Rate limiting
    
    // Calculate median of last 3 dividends and historical 3 dividends (10-12 weeks ago)
    let medianDividend = null;
    let medianHistorical = null;
    let lastDividends = [];
    let historicalDividends = [];
    let divErosion = null;
    let consistentDividends = [];
    let frequencyChangeIndex = -1;
    
    if (dividendData.results && dividendData.results.length > 0) {
      // Filter dividends sequentially and find frequency change point
      
      // Debug logging for NVDW
      if (ticker === 'NVDW') {
        console.log(`NVDW Debug: Found ${dividendData.results.length} dividends`);
        dividendData.results.slice(0, 15).forEach((div, idx) => {
          console.log(`NVDW Div ${idx}: ${div.ex_dividend_date} - $${div.cash_amount}`);
        });
      }
      
      for (let i = 0; i < dividendData.results.length; i++) {
        const dividend = dividendData.results[i];
        if (dividend.cash_amount <= 0) continue;
        
        if (i === 0) {
          // Always include the most recent dividend
          consistentDividends.push(dividend);
        } else {
          // Check if this dividend is within 10 days of the previous included dividend
          const prevDate = new Date(consistentDividends[consistentDividends.length - 1].ex_dividend_date);
          const currDate = new Date(dividend.ex_dividend_date);
          const daysDiff = Math.abs(prevDate - currDate) / (24 * 60 * 60 * 1000);
          
          if (ticker === 'NVDW') {
            console.log(`NVDW Gap check ${i}: ${daysDiff.toFixed(1)} days between ${prevDate.toISOString().split('T')[0]} and ${currDate.toISOString().split('T')[0]}`);
          }
          
          if (daysDiff <= 10) {
            consistentDividends.push(dividend);
          } else {
            // Found frequency change - record position and continue with all remaining dividends
            frequencyChangeIndex = consistentDividends.length;
            if (ticker === 'NVDW') {
              console.log(`NVDW: Frequency change detected at position ${frequencyChangeIndex}`);
            }
            // Add all remaining dividends for historical analysis
            for (let j = i; j < dividendData.results.length; j++) {
              if (dividendData.results[j].cash_amount > 0) {
                consistentDividends.push(dividendData.results[j]);
              }
            }
            break;
          }
        }
      }
      
      // Get the last 3 consistent dividends (most recent)
      lastDividends = consistentDividends
        .slice(0, 3)
        .map(d => d.cash_amount)
        .filter(d => d > 0)
        .sort((a, b) => a - b);
      
      // Get historical dividends based on frequency change detection
      if (frequencyChangeIndex > 0 && frequencyChangeIndex >= 6) {
        // Use 3 dividends before the frequency change (same frequency as recent dividends)
        const endIdx = frequencyChangeIndex - 3; // Start 3 positions before the change
        historicalDividends = consistentDividends
          .slice(endIdx, frequencyChangeIndex) // n-3, n-2, n-1 before frequency change
          .map(d => d.cash_amount)
          .filter(d => d > 0)
          .sort((a, b) => a - b);
        if (ticker === 'NVDW') {
          console.log(`NVDW: Using pre-change dividends ${endIdx}-${frequencyChangeIndex-1}: [${historicalDividends.join(', ')}]`);
        }
      } else if (consistentDividends.length >= 12) {
        // No frequency change detected, use standard positions 9-11 (or available positions)
        const startPos = Math.min(9, consistentDividends.length - 3);
        const endPos = startPos + 3;
        historicalDividends = consistentDividends
          .slice(startPos, endPos)
          .map(d => d.cash_amount)
          .filter(d => d > 0)
          .sort((a, b) => a - b);
        if (ticker === 'NVDW') {
          console.log(`NVDW: Using positions ${startPos}-${endPos-1}: [${historicalDividends.join(', ')}]`);
        }
      } else {
        // Less than 12 dividends available, use last 3 for historical comparison
        historicalDividends = consistentDividends
          .slice(-3)
          .map(d => d.cash_amount)
          .filter(d => d > 0)
          .sort((a, b) => a - b);
        if (ticker === 'NVDW') {
          console.log(`NVDW: Using fallback last 3: [${historicalDividends.join(', ')}]`);
        }
      }
      
      if (ticker === 'NVDW') {
        console.log(`NVDW: Total consistent dividends: ${consistentDividends.length}, Recent: [${lastDividends.join(', ')}], Historical: [${historicalDividends.join(', ')}]`);
      }
      
      // Calculate median for last 3 dividends
      if (lastDividends.length > 0) {
        if (lastDividends.length === 1) {
          medianDividend = lastDividends[0];
        } else if (lastDividends.length === 2) {
          medianDividend = (lastDividends[0] + lastDividends[1]) / 2;
        } else {
          medianDividend = lastDividends[1]; // Middle value for 3 dividends
        }
      }
      
      // Calculate median for historical dividends (10-12 weeks ago)
      if (historicalDividends.length > 0) {
        if (historicalDividends.length === 1) {
          medianHistorical = historicalDividends[0];
        } else if (historicalDividends.length === 2) {
          medianHistorical = (historicalDividends[0] + historicalDividends[1]) / 2;
        } else {
          medianHistorical = historicalDividends[1]; // Middle value for 3 dividends
        }
        
        // Calculate dividend erosion (difference percentage)
        if (medianDividend && medianHistorical && medianHistorical > 0) {
          const erosionRate = ((medianDividend - medianHistorical) / medianHistorical);
          divErosion = erosionRate * 100; // Convert to percentage (no multiplication by 4)
          
          // Debug logging for QDTY
          if (ticker === 'QDTY') {
            console.log(`QDTY Dividend Erosion Debug:`);
            console.log(`  Recent median dividend: $${medianDividend}`);
            console.log(`  Historical median dividend: $${medianHistorical}`);
            console.log(`  Erosion calculation: (${medianDividend} - ${medianHistorical}) / ${medianHistorical} * 100 = ${divErosion.toFixed(2)}%`);
          }
        } else if (ticker === 'QDTY') {
          console.log(`QDTY Dividend Erosion Debug: Missing dividend data. Recent: $${medianDividend}, Historical: $${medianHistorical}`);
        }
      }
    }
    
    // Get the 12 weeks ago price
    let twelveWeeksAgoPrice = null;
    if (twelveWeeksAgoData.results && twelveWeeksAgoData.results.length > 0) {
      twelveWeeksAgoPrice = twelveWeeksAgoData.results[0].c; // closing price from ~84 days ago
    }
    
    // Calculate forward yield (annualized)
    let forwardYield = null;
    if (medianDividend && currentPrice) {
      // Assume weekly dividends (52x per year) for these ETFs
      forwardYield = (medianDividend * 52 / currentPrice) * 100; // As percentage
    }
    
    // Calculate NAV (12-week price performance - matching dividend erosion period)
    let navPerformance = null;
    if (currentPrice && twelveWeeksAgoPrice && twelveWeeksAgoPrice > 0) {
      // (current price - 12 weeks ago price) / 12 weeks ago price
      navPerformance = ((currentPrice - twelveWeeksAgoPrice) / twelveWeeksAgoPrice) * 100; // As percentage (12-week change)
      
      // Debug logging for QDTY
      if (ticker === 'QDTY') {
        console.log(`QDTY NAV Debug: Current price: $${currentPrice}, 12-weeks ago price: $${twelveWeeksAgoPrice}`);
        console.log(`QDTY NAV Calculation: (${currentPrice} - ${twelveWeeksAgoPrice}) / ${twelveWeeksAgoPrice} * 100 = ${navPerformance.toFixed(2)}%`);
        console.log(`QDTY Date range for 12-week lookup: ${eightyEightDaysAgo} to ${eightyDaysAgo}`);
      }
    } else if (ticker === 'QDTY') {
      console.log(`QDTY NAV Debug: Missing price data. Current: $${currentPrice}, 12-weeks ago: $${twelveWeeksAgoPrice}`);
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
    if (forwardYield != null && navPerformance != null && divErosion != null && volatility14Day != null && volatility14Day > 0) {
      const totalReturn = forwardYield + navPerformance + divErosion; // Complete total return including dividend erosion
      const riskFreeRate = 2; // 2% risk-free rate
      sharpeRatio = (totalReturn - riskFreeRate) / volatility14Day;
    }
    
    const result = {
      ticker,
      price: currentPrice,
      medianDividend: medianDividend,
      medianHistorical: medianHistorical,
      divErosion: divErosion,
      forwardYield: forwardYield,
      navPerformance: navPerformance,
      volatility14Day: volatility14Day,
      sharpeRatio: sharpeRatio,
      lastDividends: lastDividends,
      historicalDividends: historicalDividends,
      dividendCount: lastDividends.length
    };
    
    // Add debug info for NVDW, YETH, HOOW, PLTW, and QDTY
    if (ticker === 'NVDW' || ticker === 'YETH' || ticker === 'HOOW' || ticker === 'PLTW' || ticker === 'QDTY') {
      result.debug = {
        totalDividends: dividendData.results ? dividendData.results.length : 0,
        consistentDividendsCount: consistentDividends ? consistentDividends.length : 0,
        frequencyChangeIndex: frequencyChangeIndex,
        recentDividends: lastDividends,
        historicalDividends: historicalDividends,
        selectionMethod: frequencyChangeIndex > 0 && frequencyChangeIndex >= 6 ? 'pre-change' :
                        consistentDividends && consistentDividends.length >= 13 ? 'standard' : 'fallback'
      };
      
      // Add NAV calculation debug for QDTY specifically
      if (ticker === 'QDTY') {
        result.navDebug = {
          currentPrice: currentPrice,
          twelveWeeksAgoPrice: twelveWeeksAgoPrice,
          navCalculation: twelveWeeksAgoPrice ? `(${currentPrice} - ${twelveWeeksAgoPrice}) / ${twelveWeeksAgoPrice} * 100 = ${navPerformance?.toFixed(2)}%` : 'No 12-week price data',
          priceChangeRaw: currentPrice && twelveWeeksAgoPrice ? currentPrice - twelveWeeksAgoPrice : null,
          priceChangePercent: navPerformance,
          twelveWeeksAgoUrl: `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${eightyEightDaysAgo}/${eightyDaysAgo}?adjusted=true&sort=desc&limit=1`,
          dateRange: `${eightyEightDaysAgo} to ${eightyDaysAgo}`
        };
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error);
    return {
      ticker,
      price: null,
      medianDividend: null,
      medianHistorical: null,
      divErosion: null,
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