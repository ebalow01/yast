exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { ticker } = JSON.parse(event.body);
    
    if (!ticker) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Ticker symbol is required' })
      };
    }

    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
    
    if (!POLYGON_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Polygon API key not configured' })
      };
    }

    // Get date range for 15-minute data (last 5 trading days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 calendar days to ensure 5 trading days
    
    // Call Polygon API for 15-minute aggregates using native Node.js https
    const https = require('https');
    const url = require('url');
    
    const polygonUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/15/minute/${startDate}/${endDate}?adjusted=true&sort=asc&apikey=${POLYGON_API_KEY}`;
    
    const makeHttpsRequest = (url) => {
      return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({
              status: res.statusCode,
              data: data,
              ok: res.statusCode >= 200 && res.statusCode < 300
            });
          });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
      });
    };
    
    const polygonResponse = await makeHttpsRequest(polygonUrl);
    
    if (!polygonResponse.ok) {
      return {
        statusCode: polygonResponse.status,
        body: JSON.stringify({ 
          error: `Polygon API error: ${polygonResponse.status}`,
          details: polygonResponse.data
        })
      };
    }

    const polygonData = JSON.parse(polygonResponse.data);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(polygonData)
    };

  } catch (error) {
    console.error('Polygon function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};