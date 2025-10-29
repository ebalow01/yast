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

  try {
    const body = JSON.parse(event.body || '{}');
    const tickers = body.tickers || [];

    if (!tickers || tickers.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No tickers provided' })
      };
    }

    console.log(`Fetching data for ${tickers.length} tickers using yahoo-finance2`);

    const results = {};

    for (const ticker of tickers) {
      try {
        console.log(`Processing ${ticker}...`);

        // Calculate date ranges
        const now = new Date();
        const twelveWeeksAgo = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000);
        const twentyFourWeeksAgo = new Date(now.getTime() - 168 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Fetch historical data with both price and dividend events
        const chartData = await yahooFinance.chart(ticker, {
          period1: twentyFourWeeksAgo,
          period2: now,
          interval: '1d',
          events: 'div'
        });

        console.log(`${ticker}: Chart data received`);

        // Extract price data
        const quotes = chartData.quotes || [];
        if (quotes.length === 0) {
          console.log(`${ticker}: No price data available`);
          results[ticker] = { error: 'No price data available' };
          continue;
        }

        // Get current price (most recent close)
        const currentPrice = quotes[quotes.length - 1].close;

        // Find price from ~12 weeks ago
        let twelveWeeksAgoPrice = null;
        const twelveWeeksAgoTimestamp = twelveWeeksAgo.getTime();
        for (let i = 0; i < quotes.length; i++) {
          if (quotes[i].date.getTime() >= twelveWeeksAgoTimestamp) {
            twelveWeeksAgoPrice = quotes[i].close;
            break;
          }
        }

        // Get last 14 days of prices for volatility calculation
        const fourteenDaysAgoTimestamp = fourteenDaysAgo.getTime();
        const last14DaysPrices = quotes
          .filter(q => q.date.getTime() >= fourteenDaysAgoTimestamp)
          .map(q => q.close);

        // Extract dividend data
        let dividends = [];
        if (chartData.events && chartData.events.dividends) {
          // Log the first dividend entry to understand the data structure
          const firstEntry = Object.entries(chartData.events.dividends)[0];
          if (firstEntry) {
            console.log(`${ticker}: First dividend entry:`, JSON.stringify({
              timestamp: firstEntry[0],
              divData: firstEntry[1],
              timestampType: typeof firstEntry[0],
              divDataKeys: Object.keys(firstEntry[1])
            }));
          }

          dividends = Object.entries(chartData.events.dividends)
            .map(([timestamp, divData]) => {
              // yahoo-finance2 includes date in divData, use it directly if available
              let date;
              if (divData.date) {
                date = new Date(divData.date);
              } else {
                // Fallback to parsing timestamp key (Unix time in seconds)
                const ts = parseInt(timestamp);
                date = new Date(ts * 1000);
              }

              return {
                date: date,
                amount: divData.amount
              };
            })
            .filter(d => d.date && !isNaN(d.date.getTime())) // Filter out invalid dates
            .sort((a, b) => b.date.getTime() - a.date.getTime());
        }

        // Filter out duplicate dividends within 2 days of each other
        // Some funds erroneously show duplicate dividends 1 day apart (e.g., 10/22 and 10/23)
        const originalCount = dividends.length;
        const filteredDividends = [];
        for (let i = 0; i < dividends.length; i++) {
          if (i === 0) {
            // Always keep the first (most recent) dividend
            filteredDividends.push(dividends[i]);
          } else {
            const daysDiff = Math.abs(dividends[i].date.getTime() - filteredDividends[filteredDividends.length - 1].date.getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff >= 2) {
              // Only keep if more than 2 days from the last kept dividend
              filteredDividends.push(dividends[i]);
            } else {
              console.log(`${ticker}: Skipping duplicate dividend on ${dividends[i].date.toISOString().split('T')[0]} (${daysDiff.toFixed(1)} days from previous)`);
            }
          }
        }
        dividends = filteredDividends;

        if (originalCount !== dividends.length) {
          console.log(`${ticker}: Filtered ${originalCount - dividends.length} duplicate dividend(s), ${dividends.length} remain`);
        }

        console.log(`${ticker}: Found ${dividends.length} dividends, ${quotes.length} price points`);

        if (dividends.length === 0) {
          console.log(`${ticker}: No dividend data`);
          results[ticker] = { error: 'No dividend data available' };
          continue;
        }

        // Get last 3 dividends
        const last3Dividends = dividends.slice(0, Math.min(3, dividends.length));
        const last3Amounts = last3Dividends.map(d => d.amount);

        // Calculate median of last 3 dividends
        let medianDividend;
        if (last3Amounts.length === 1) {
          medianDividend = last3Amounts[0];
        } else if (last3Amounts.length === 2) {
          medianDividend = (last3Amounts[0] + last3Amounts[1]) / 2;
        } else {
          const sorted = [...last3Amounts].sort((a, b) => a - b);
          medianDividend = sorted[1];
        }

        // Get historical dividends (around ~12 weeks ago = around dividend #12 for weekly)
        // Use index-based approach: for weekly dividends, dividend at index 12-14 is ~12 weeks ago
        let medianHistorical = null;
        if (dividends.length >= 15) {
          // Take 3 dividends centered around index 12 (dividends 12, 13, 14)
          const historicalAmounts = [
            dividends[12].amount,
            dividends[13].amount,
            dividends[14].amount
          ];
          const sorted = [...historicalAmounts].sort((a, b) => a - b);
          medianHistorical = sorted[1]; // median
        } else if (dividends.length >= 12) {
          // Not enough for full historical window, use what we have
          const historicalAmounts = dividends.slice(9, 12).map(d => d.amount);
          if (historicalAmounts.length === 3) {
            const sorted = [...historicalAmounts].sort((a, b) => a - b);
            medianHistorical = sorted[1];
          } else if (historicalAmounts.length === 2) {
            medianHistorical = (historicalAmounts[0] + historicalAmounts[1]) / 2;
          } else if (historicalAmounts.length === 1) {
            medianHistorical = historicalAmounts[0];
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

        // Calculate forward yield (annualized)
        let forwardYield = null;
        if (medianDividend && currentPrice) {
          forwardYield = (medianDividend * 52 / currentPrice) * 100;
        }

        // Calculate NAV performance (12-week)
        let navPerformance = null;
        if (currentPrice && twelveWeeksAgoPrice && twelveWeeksAgoPrice > 0) {
          let rawNavPerformance = ((currentPrice - twelveWeeksAgoPrice) / twelveWeeksAgoPrice) * 100;

          // Cap NAV variance at ±20%
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
        if (last14DaysPrices.length > 1) {
          const returns = [];
          for (let i = 1; i < last14DaysPrices.length; i++) {
            if (last14DaysPrices[i-1] > 0) {
              returns.push((last14DaysPrices[i] - last14DaysPrices[i-1]) / last14DaysPrices[i-1]);
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

        // Get historical dividend amounts for return value
        let historicalAmounts = [];
        if (dividends.length >= 15) {
          historicalAmounts = [dividends[12].amount, dividends[13].amount, dividends[14].amount];
        } else if (dividends.length >= 12) {
          historicalAmounts = dividends.slice(9, 12).map(d => d.amount);
        }

        console.log(`${ticker}: median=${medianDividend?.toFixed(3)}, medianHist=${medianHistorical?.toFixed(3)}, divErosion=${divErosion?.toFixed(1)}%`);

        results[ticker] = {
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
          lastDividends: last3Amounts,
          historicalDividends: historicalAmounts,
          dividendCount: last3Amounts.length,
          lastDividendDate: last3Dividends[0].date.toISOString().split('T')[0],
          lastDividendAmount: last3Amounts[0],
          totalDividends: dividends.length
        };

      } catch (error) {
        console.error(`Error fetching ${ticker}:`, error.message);
        results[ticker] = { error: `Error: ${error.message}` };
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    console.log(`Successfully processed ${Object.keys(results).length} tickers`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('CRITICAL ERROR:', error);
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
