exports.handler = async (event, context) => {
  const { ticker } = JSON.parse(event.body || '{}');
  
  if (!ticker) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Ticker is required' })
    };
  }

  try {
    // Import required modules
    const fetch = require('node-fetch');
    
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
    
    if (!POLYGON_API_KEY || !CLAUDE_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API keys not configured' })
      };
    }

    // Fetch data from Polygon API
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const polygonUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${startDate}/${endDate}`;
    const polygonResponse = await fetch(`${polygonUrl}?adjusted=true&sort=asc&apikey=${POLYGON_API_KEY}`);
    
    if (!polygonResponse.ok) {
      throw new Error(`Polygon API error: ${polygonResponse.status}`);
    }
    
    const polygonData = await polygonResponse.json();
    
    if (!polygonData.results || polygonData.results.length === 0) {
      throw new Error('No data available from Polygon API');
    }

    // Process the data and calculate indicators
    const results = polygonData.results;
    const latest = results[results.length - 1];
    const prevWeek = results[results.length - 6] || results[0];
    
    // Calculate RSI
    let rsi = 0;
    if (results.length >= 14) {
      const prices = results.slice(-15).map(r => r.c);
      const gains = [];
      const losses = [];
      
      for (let i = 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? -change : 0);
      }
      
      const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
      const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
      
      if (avgLoss > 0) {
        const rs = avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));
      }
    }

    // Calculate SMAs
    const sma20 = results.length >= 20 ? 
      results.slice(-20).reduce((sum, r) => sum + r.c, 0) / 20 : latest.c;
    const sma50 = results.length >= 50 ? 
      results.slice(-50).reduce((sum, r) => sum + r.c, 0) / 50 : latest.c;

    const currentPrice = latest.c;
    const weeklyChange = ((currentPrice - prevWeek.c) / prevWeek.c) * 100;

    // Create data summary
    const dataSummary = `Data Summary for ${ticker}:
- Current Price: $${currentPrice.toFixed(2)}
- Weekly Change: ${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)}%
- RSI (14): ${rsi.toFixed(1)}
- Price vs SMA 20: ${currentPrice > sma20 ? 'above' : 'below'}
- Price vs SMA 50: ${currentPrice > sma50 ? 'above' : 'below'}
- Data points: ${results.length} days`;

    // Generate chart using a simple text representation for now
    // In a full implementation, you'd generate an actual chart image
    const chartDescription = `Professional candlestick chart showing ${ticker} price action over ${results.length} days with RSI and volume indicators`;

    // Analyze with Claude
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: `Analyze this ETF data for ${ticker}:

${dataSummary}

Chart: ${chartDescription}

Please provide a comprehensive analysis including:
1. **Short-term outlook** (1-2 weeks)
2. **Technical pattern analysis** (trends, support/resistance)
3. **RSI interpretation** (overbought/oversold conditions)
4. **Risk assessment** (what to watch for)
5. **Key price levels** to monitor

Focus on actionable insights for trading decisions. Be specific about price levels and timeframes.`
        }]
      })
    });

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeResult = await claudeResponse.json();
    const fullAnalysis = claudeResult.content[0].text;
    
    // Extract short outlook from the analysis
    const outlookMatch = fullAnalysis.match(/1\.\s*\*\*Short-term outlook[^:]*:\*\*\s*([^.]*\.?[^1-9]*)/i);
    let shortOutlook = 'Analysis pending';
    
    if (outlookMatch) {
      shortOutlook = outlookMatch[1].replace(/\n.*$/s, '').trim();
      // Clean up the extracted text
      shortOutlook = shortOutlook.replace(/^\s*-?\s*/, '').replace(/\*\*/g, '');
      if (shortOutlook.length > 100) {
        shortOutlook = shortOutlook.substring(0, 97) + '...';
      }
    } else {
      // Fallback: try to extract first meaningful sentence
      const sentences = fullAnalysis.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.length > 20 && sentence.length < 150) {
          shortOutlook = sentence.trim();
          break;
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ticker,
        timestamp: new Date().toISOString(),
        shortOutlook,
        fullAnalysis,
        dataSummary
      })
    };

  } catch (error) {
    console.error('Polygon analysis error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: `Analysis failed: ${error.message}` 
      })
    };
  }
};