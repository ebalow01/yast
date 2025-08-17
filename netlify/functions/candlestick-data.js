const { spawn } = require('child_process');
const path = require('path');
const https = require('https');

// Simple in-memory cache with 15-minute expiration
const cache = new Map();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Rate limiting - track last request time globally and per ticker
const lastRequestTimes = new Map();
let lastGlobalRequest = 0;
const MIN_REQUEST_INTERVAL = 5000; // 5 seconds between requests for same ticker
const MIN_GLOBAL_INTERVAL = 1000; // 1 second between any requests


// Fallback function to get candlestick data using Yahoo Finance API directly with retry logic
async function getCandlestickDataFallback(ticker, retryCount = 0) {
  const maxRetries = 3;
  const baseDelay = 2000; // 2 seconds base delay
  
  return new Promise((resolve, reject) => {
    // Use Yahoo Finance v8 API for historical data
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (7 * 24 * 60 * 60); // 7 days ago
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&period1=${startDate}&period2=${endDate}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const chart = parsed.chart?.result?.[0];
          
          if (!chart || !chart.timestamp || !chart.indicators?.quote?.[0]) {
            throw new Error('Invalid response from Yahoo Finance');
          }
          
          const timestamps = chart.timestamp;
          const quote = chart.indicators.quote[0];
          const { open, high, low, close, volume } = quote;
          
          const candlesticks = timestamps.map((timestamp, index) => ({
            timestamp: new Date(timestamp * 1000).toISOString(),
            open: open[index] || 0,
            high: high[index] || 0,
            low: low[index] || 0,
            close: close[index] || 0,
            volume: volume[index] || 0
          })).filter(candle => candle.open > 0); // Filter out invalid data
          
          resolve({
            ticker: ticker,
            period: "7d",
            interval: "1m",
            data_points: candlesticks.length,
            first_timestamp: candlesticks[0]?.timestamp,
            last_timestamp: candlesticks[candlesticks.length - 1]?.timestamp,
            candlesticks: candlesticks
          });
          
        } catch (error) {
          const errorMsg = `Failed to parse Yahoo Finance response: ${error.message}`;
          if (retryCount < maxRetries && (error.message.includes('Too Many Requests') || error.message.includes('Too many requests'))) {
            console.log(`Rate limited, retrying in ${baseDelay * (retryCount + 1)}ms (attempt ${retryCount + 1}/${maxRetries})`);
            setTimeout(() => {
              getCandlestickDataFallback(ticker, retryCount + 1).then(resolve).catch(reject);
            }, baseDelay * (retryCount + 1));
          } else {
            reject(new Error(errorMsg));
          }
        }
      });
    }).on('error', (error) => {
      const errorMsg = `HTTP request failed: ${error.message}`;
      if (retryCount < maxRetries) {
        console.log(`Request failed, retrying in ${baseDelay * (retryCount + 1)}ms (attempt ${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          getCandlestickDataFallback(ticker, retryCount + 1).then(resolve).catch(reject);
        }, baseDelay * (retryCount + 1));
      } else {
        reject(new Error(errorMsg));
      }
    });
  });
}

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Get ticker from query parameters
  const ticker = event.queryStringParameters?.ticker;
  
  if (!ticker) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing ticker parameter' })
    };
  }

  // Validate ticker format (basic validation)
  if (!/^[A-Z]{1,6}$/.test(ticker.toUpperCase())) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid ticker format' })
    };
  }

  try {
    // Check cache first
    const cacheKey = ticker.toUpperCase();
    const cachedData = cache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      console.log(`Returning cached data for ${cacheKey}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(cachedData.data)
      };
    }

    // Global rate limiting check
    const timeSinceGlobalRequest = Date.now() - lastGlobalRequest;
    if (timeSinceGlobalRequest < MIN_GLOBAL_INTERVAL) {
      const waitTime = MIN_GLOBAL_INTERVAL - timeSinceGlobalRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Per-ticker rate limiting check
    const lastRequestTime = lastRequestTimes.get(cacheKey) || 0;
    const timeSinceLastRequest = Date.now() - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastGlobalRequest = Date.now();
    lastRequestTimes.set(cacheKey, Date.now());

    // Path to the Python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'fetch_candlestick_data.py');
    
    // Create promise to handle Python subprocess
    const result = await new Promise((resolve, reject) => {
      // Try different Python commands
      const pythonCommands = ['python3', 'python', 'py'];
      let currentCommand = 0;
      
      const tryNextCommand = () => {
        if (currentCommand >= pythonCommands.length) {
          reject(new Error('No Python interpreter found. Tried: ' + pythonCommands.join(', ')));
          return;
        }
        
        const python = spawn(pythonCommands[currentCommand], [scriptPath, ticker.toUpperCase()]);
        
        let stdout = '';
        let stderr = '';
        
        python.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        python.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        python.on('close', (code) => {
          if (code === 0) {
            try {
              const data = JSON.parse(stdout);
              resolve(data);
            } catch (parseError) {
              reject(new Error(`Failed to parse Python output: ${parseError.message}. Output: ${stdout.substring(0, 500)}`));
            }
          } else {
            reject(new Error(`Python script failed with code ${code}. Command: ${pythonCommands[currentCommand]}. Error: ${stderr}. Output: ${stdout}`));
          }
        });
        
        python.on('error', (error) => {
          if (error.code === 'ENOENT') {
            currentCommand++;
            tryNextCommand();
          } else {
            reject(new Error(`Failed to start Python process: ${error.message}`));
          }
        });
        
        // Set timeout for 30 seconds
        setTimeout(() => {
          python.kill();
          reject(new Error('Request timeout'));
        }, 30000);
      };
      
      tryNextCommand();
    });

    // Cache the successful result
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (pythonError) {
    console.error('Python candlestick fetch failed, trying Node.js fallback:', pythonError);
    
    try {
      // Try Node.js fallback
      const result = await getCandlestickDataFallback(ticker.toUpperCase());
      
      // Cache the successful result
      cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
      
    } catch (fallbackError) {
      console.error('Both Python and Node.js fallback failed:', fallbackError);
      
      // Check if it's a rate limiting error
      const isRateLimited = fallbackError.message.includes('Too Many Requests') || 
                           fallbackError.message.includes('429') ||
                           fallbackError.message.includes('rate limit');
      
      return {
        statusCode: isRateLimited ? 429 : 500,
        headers,
        body: JSON.stringify({ 
          error: isRateLimited ? 
            `Rate limited by Yahoo Finance. Please wait a moment and try again.` :
            `Failed to fetch candlestick data: ${fallbackError.message}`,
          ticker: ticker.toUpperCase(),
          isRateLimited: isRateLimited
        })
      };
    }
  }
};