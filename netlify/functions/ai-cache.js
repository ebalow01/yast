import { getStore } from '@netlify/blobs';

const handler = async (event, context) => {
  try {
    console.log(`=== AI Cache Function Called ===`);
    console.log(`Context available:`, !!context);
    
    // Handle both old (event-based) and new (request-based) function formats
    const request = event.httpMethod ? {
      method: event.httpMethod,
      url: `https://${event.headers.host}${event.path}?${event.rawQuery || ''}`,
      json: () => Promise.resolve(JSON.parse(event.body || '{}')),
      headers: event.headers
    } : event;
    
    // Try multiple store initialization methods
    let store;
    try {
      // Method 1: Use context if available
      console.log(`Attempting store initialization with context...`);
      store = getStore('ai-cache');
      console.log(`Store initialized successfully (method 1)`);
    } catch (error) {
      console.log(`Store init method 1 failed:`, error.message);
      try {
        // Method 2: Try without context
        console.log(`Attempting store initialization without context...`);
        store = getStore({
          name: 'ai-cache',
          consistency: 'eventual'
        });
        console.log(`Store initialized successfully (method 2)`);
      } catch (error2) {
        console.error(`Store init method 2 failed:`, error2.message);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to initialize blob store' })
        };
      }
    }
    
    const url = new URL(request.url);
    const ticker = url.searchParams.get('ticker');
    
    console.log(`Request method: ${request.method}`);
    console.log(`URL: ${request.url}`);
    console.log(`URL search params:`, url.searchParams.toString());
    console.log(`Ticker parameter:`, ticker);
    
    if (!ticker) {
      console.log('Missing ticker parameter');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'ticker parameter required' })
      };
    }

    if (request.method === 'GET') {
      console.log(`=== GET REQUEST for ${ticker} ===`);
      
      try {
        const cacheKey = `ai_cache_${ticker}`;
        console.log(`Attempting to get from store with key: ${cacheKey}`);
        
        const cached = await store.get(cacheKey);
        console.log(`Retrieved data:`, cached ? 'Found data' : 'No data found');
        
        if (cached) {
          const data = JSON.parse(cached);
          const age = Date.now() - data.timestamp;
          const cacheExpiry = 2 * 60 * 60 * 1000; // 2 hours
          
          console.log(`Cache age: ${Math.round(age / 60000)} minutes`);
          console.log(`Cache expiry: ${Math.round(cacheExpiry / 60000)} minutes`);
          
          if (age < cacheExpiry) {
            console.log(`Server cache hit for ${ticker} (${Math.round(age / 60000)} min old)`);
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            };
          } else {
            console.log(`Server cache expired for ${ticker} (${Math.round(age / 60000)} min old)`);
            await store.delete(cacheKey);
          }
        } else {
          console.log(`No server cache found for ${ticker}`);
        }
      } catch (error) {
        console.error('Error reading from server cache:', error);
      }
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(null)
      };
    }
    
    if (request.method === 'POST') {
      console.log(`=== POST REQUEST for ${ticker} ===`);
      
      try {
        const data = await request.json();
        console.log(`Request body received:`, data ? 'Data present' : 'No data');
        console.log(`Data keys:`, data ? Object.keys(data) : 'N/A');
        
        if (!data.data || !data.timestamp) {
          console.log(`Missing required fields - data: ${!!data.data}, timestamp: ${!!data.timestamp}`);
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'data and timestamp required' })
          };
        }
        
        const cacheKey = `ai_cache_${ticker}`;
        console.log(`Storing to cache key: ${cacheKey}`);
        
        await store.set(cacheKey, JSON.stringify(data));
        console.log(`Successfully stored server cache for ${ticker}`);
        
        // Verify storage by reading it back
        const verification = await store.get(cacheKey);
        console.log(`Storage verification:`, verification ? 'Success - data found' : 'Failed - no data found');
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true })
        };
      } catch (error) {
        console.error('Error storing to server cache:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to store cache' })
        };
      }
    }
    
    if (request.method === 'DELETE') {
      console.log(`=== DELETE REQUEST for ${ticker} ===`);
      
      try {
        const cacheKey = `ai_cache_${ticker}`;
        await store.delete(cacheKey);
        console.log(`Deleted server cache for ${ticker}`);
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true })
        };
      } catch (error) {
        console.error('Error deleting from server cache:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to delete cache' })
        };
      }
    }
    
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
    
  } catch (error) {
    console.error('=== CACHE FUNCTION ERROR ===', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Export for both old and new function formats
export { handler };
export default handler;