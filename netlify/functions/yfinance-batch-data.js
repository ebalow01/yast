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

  console.log('yfinance-batch-data function invoked');
  console.log('Request method:', event.httpMethod);
  console.log('Request body:', event.body);

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const tickers = body.tickers || [];

    console.log('Parsed tickers:', tickers);

    if (!tickers || tickers.length === 0) {
      console.log('No tickers provided in request');
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
        console.log(`Processing ${ticker}...`);

        // Fetch dividend history using chart API
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1); // Get 1 year of data

        console.log(`Calling yahooFinance.chart for ${ticker}...`);

        const chartResult = await yahooFinance.chart(ticker, {
          period1: startDate,
          period2: endDate,
          events: 'div'
        });

        console.log(`Chart result for ${ticker}:`, JSON.stringify({
          hasEvents: !!chartResult.events,
          hasDividends: !!(chartResult.events && chartResult.events.dividends)
        }));

        // Extract dividend events
        let dividends = [];
        if (chartResult.events && chartResult.events.dividends) {
          // Convert dividends object to array and sort by date
          dividends = Object.entries(chartResult.events.dividends)
            .map(([timestamp, divData]) => ({
              date: new Date(parseInt(timestamp) * 1000),
              amount: divData.amount
            }))
            .sort((a, b) => b.date.getTime() - a.date.getTime());
        }

        console.log(`Found ${dividends.length} dividends for ${ticker}`);

        if (dividends.length === 0) {
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

        // Get last 3 dividends for median calculation
        const last3 = dividends.slice(0, Math.min(3, dividends.length));
        const last3Amounts = last3.map(d => d.amount);

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
        const lastDividendAmount = latest.amount;

        console.log(`${ticker}: Last 3 dividends: [${last3Amounts.join(', ')}], median: ${medianDividend.toFixed(3)}`);

        results[ticker] = {
          medianDividend: medianDividend,
          lastDividends: last3Amounts,
          lastDividendDate: lastDividendDate,
          lastDividendAmount: lastDividendAmount,
          totalDividends: dividends.length
        };

      } catch (error) {
        console.error(`Error fetching ${ticker}:`, error);
        console.error(`Error stack for ${ticker}:`, error.stack);
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
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    console.log(`Successfully processed ${Object.keys(results).length} tickers`);
    console.log('Sample results:', JSON.stringify(Object.keys(results).slice(0, 3).reduce((acc, key) => {
      acc[key] = results[key];
      return acc;
    }, {})));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('CRITICAL ERROR in yfinance-batch-data:', error);
    console.error('Error stack:', error.stack);
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
