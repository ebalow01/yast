const yahooFinance = require('yahoo-finance2').default;

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Get ticker from query params or fetch all
    const { ticker } = event.queryStringParameters || {};
    
    const tickers = ticker ? [ticker] : [
      'ULTY', 'YMAX', 'YMAG', 'LFGY', 'GPTY', 'SDTY', 'QDTY', 'RDTY', 
      'CHPY', 'NFLW', 'IWMY', 'AMZW', 'MSII', 'RDTE', 'AAPW', 'COII', 
      'MST', 'BLOX', 'BRKW', 'COIW', 'HOOW', 'METW', 'NVDW', 'PLTW', 
      'TSLW', 'QDTE', 'XDTE', 'WDTE', 'YSPY', 'NVYY', 'TSYY', 'YETH',
      'YBTC', 'XBTY', 'QQQY', 'NVII', 'TSII', 'MAGY', 'TQQY', 'GLDY',
      'BCCC', 'USOY', 'MMKT', 'WEEK'
    ];

    const results = {};
    
    // Fetch data for each ticker
    for (const symbol of tickers) {
      try {
        // Get quote data
        const quote = await yahooFinance.quote(symbol);
        
        // Get dividend history (last year)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        
        const dividendHistory = await yahooFinance.historical(symbol, {
          period1: startDate,
          period2: endDate,
          events: 'dividends'
        });

        // Calculate dividend metrics
        let lastDividend = 0;
        let medianDividend = 0;
        let annualDividends = 0;
        let actualYield = 0;

        if (dividendHistory && dividendHistory.length > 0) {
          // Sort by date to get most recent
          dividendHistory.sort((a, b) => b.date - a.date);
          lastDividend = dividendHistory[0].dividends || 0;
          
          // Calculate median
          const dividendAmounts = dividendHistory.map(d => d.dividends || 0).filter(d => d > 0);
          if (dividendAmounts.length > 0) {
            dividendAmounts.sort((a, b) => a - b);
            const mid = Math.floor(dividendAmounts.length / 2);
            medianDividend = dividendAmounts.length % 2 === 0
              ? (dividendAmounts[mid - 1] + dividendAmounts[mid]) / 2
              : dividendAmounts[mid];
          }
          
          // Sum annual dividends
          annualDividends = dividendAmounts.reduce((sum, div) => sum + div, 0);
          
          // Calculate actual yield
          if (quote.regularMarketPrice > 0) {
            actualYield = (annualDividends / quote.regularMarketPrice) * 100;
          }
        }

        results[symbol] = {
          ticker: symbol,
          currentPrice: quote.regularMarketPrice || 0,
          lastDividend: Math.round(lastDividend * 10000) / 10000,
          medianDividend: Math.round(medianDividend * 10000) / 10000,
          annualDividends: Math.round(annualDividends * 10000) / 10000,
          dividendCount: dividendHistory ? dividendHistory.length : 0,
          actualYield: Math.round(actualYield * 100) / 100,
          marketCap: quote.marketCap || 0,
          volume: quote.regularMarketVolume || 0,
          lastUpdate: new Date().toISOString()
        };
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        results[symbol] = {
          ticker: symbol,
          error: error.message,
          currentPrice: 0,
          lastDividend: 0,
          medianDividend: 0,
          annualDividends: 0,
          dividendCount: 0,
          actualYield: 0,
          marketCap: 0,
          volume: 0,
          lastUpdate: new Date().toISOString()
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        lastUpdate: new Date().toISOString(),
        tickerCount: Object.keys(results).length,
        data: results
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};