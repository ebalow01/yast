const yahooFinance = require('yahoo-finance2').default;

exports.handler = async function(event, context) {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const tickers = body.tickers || [];

    if (!tickers || tickers.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No tickers provided' })
      };
    }

    console.log(`Fetching dividend data for ${tickers.length} tickers using yahoo-finance2`);

    // Fetch data for each ticker
    const results = {};

    for (const ticker of tickers) {
      try {
        console.log(`Fetching dividends for ${ticker}...`);

        // Fetch dividend history
        // Get the last year of dividends to ensure we have enough data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);

        const queryOptions = {
          period1: startDate,
          period2: endDate,
          events: 'dividends'
        };

        const dividendData = await yahooFinance.historical(ticker, queryOptions);

        if (!dividendData || dividendData.length === 0) {
          console.log(`No dividend data found for ${ticker}`);
          results[ticker] = {
            error: 'No dividend data available',
            medianDividend: 0,
            lastDividends: [],
            lastDividendDate: null,
            lastDividendAmount: 0,
            totalDividends: 0
          };
          continue;
        }

        // Filter only dividend events and sort by date (most recent first)
        const dividends = dividendData
          .filter(d => d.dividends !== undefined && d.dividends > 0)
          .sort((a, b) => b.date.getTime() - a.date.getTime());

        if (dividends.length === 0) {
          console.log(`No valid dividends found for ${ticker}`);
          results[ticker] = {
            error: 'No valid dividend data',
            medianDividend: 0,
            lastDividends: [],
            lastDividendDate: null,
            lastDividendAmount: 0,
            totalDividends: 0
          };
          continue;
        }

        // Get last 3 dividends for median calculation
        const last3 = dividends.slice(0, Math.min(3, dividends.length));
        const last3Amounts = last3.map(d => d.dividends);

        // Calculate median
        let medianDividend;
        if (last3Amounts.length === 1) {
          medianDividend = last3Amounts[0];
        } else if (last3Amounts.length === 2) {
          medianDividend = (last3Amounts[0] + last3Amounts[1]) / 2;
        } else {
          // For 3 values, sort and take middle
          const sorted = [...last3Amounts].sort((a, b) => a - b);
          medianDividend = sorted[1];
        }

        // Get latest dividend info
        const latest = dividends[0];
        const lastDividendDate = latest.date.toISOString().split('T')[0];
        const lastDividendAmount = latest.dividends;

        console.log(`${ticker}: Found ${dividends.length} dividends, last 3: [${last3Amounts.join(', ')}], median: ${medianDividend.toFixed(3)}`);

        results[ticker] = {
          medianDividend: medianDividend,
          lastDividends: last3Amounts,
          lastDividendDate: lastDividendDate,
          lastDividendAmount: lastDividendAmount,
          totalDividends: dividends.length
        };

      } catch (error) {
        console.error(`Error fetching ${ticker}:`, error.message);
        results[ticker] = {
          error: `Error fetching ${ticker}: ${error.message}`,
          medianDividend: 0,
          lastDividends: [],
          lastDividendDate: null,
          lastDividendAmount: 0,
          totalDividends: 0
        };
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Successfully fetched data for ${Object.keys(results).length} tickers`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('Error in yfinance-batch-data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `Server error: ${error.message}`,
        stack: error.stack
      })
    };
  }
};
