const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Path to pre-computed analysis file
    const analysisPath = path.join(process.cwd(), 'yast-react', 'public', 'data', 'pre-computed-analysis.json');
    
    console.log('Looking for pre-computed analysis at:', analysisPath);
    
    try {
      const analysisData = await fs.readFile(analysisPath, 'utf8');
      const parsedData = JSON.parse(analysisData);
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        },
        body: JSON.stringify({
          success: true,
          ...parsedData.analysisResults,
          computedAt: parsedData.computedAt,
          message: 'Analysis results from pre-computed data'
        })
      };
    } catch (fileError) {
      console.log('Pre-computed file not found, returning sample data');
      
      // Return sample data if pre-computed file doesn't exist
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          recommendations: [
            {
              strategy: 'RSI_Conservative',
              variant: '14-day RSI < 30/70',
              ticker: 'TSLL',
              training: '+12.5%',
              testing: '+8.3%'
            },
            {
              strategy: 'Monthly_Highs_Lows',
              variant: 'Aggressive Buy Low',
              ticker: 'NVDA',
              training: '+15.2%',
              testing: '+11.7%'
            }
          ],
          summary: {
            combinedReturn: '+20.0%',
            variantsTested: '12'
          },
          computedAt: new Date().toISOString(),
          message: 'Sample data - pre-computed analysis not available'
        })
      };
    }

  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Failed to retrieve analysis',
        details: error.message
      })
    };
  }
};