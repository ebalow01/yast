// Simplified version to debug Netlify Blobs issues

export default async (request, context) => {
  console.log('=== AI Cache Function Called (Simple Version) ===');
  
  try {
    // Test basic function execution first
    const url = new URL(request.url);
    const ticker = url.searchParams.get('ticker');
    
    console.log(`Method: ${request.method}`);
    console.log(`URL: ${request.url}`);
    console.log(`Ticker: ${ticker}`);
    
    if (!ticker) {
      console.log('Missing ticker parameter');
      return new Response(JSON.stringify({ error: 'ticker parameter required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Test if we can import @netlify/blobs at all
    let blobsAvailable = false;
    let store = null;
    
    try {
      console.log('Attempting to import @netlify/blobs...');
      const { getStore } = await import('@netlify/blobs');
      console.log('Successfully imported @netlify/blobs');
      
      console.log('Attempting to initialize store...');
      store = getStore('ai-cache');
      console.log('Store initialized successfully');
      blobsAvailable = true;
      
    } catch (importError) {
      console.error('Failed to import or initialize @netlify/blobs:', importError);
      console.error('Error details:', importError.message);
      console.error('Error stack:', importError.stack);
      
      // Return a response indicating blobs unavailable
      return new Response(JSON.stringify({ 
        error: 'Blobs unavailable', 
        details: importError.message,
        fallback: 'Using memory cache'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // If we get here, blobs should be working
    if (request.method === 'GET') {
      console.log(`=== GET REQUEST for ${ticker} ===`);
      
      if (!blobsAvailable) {
        return new Response(JSON.stringify(null), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      try {
        const cacheKey = `ai_cache_${ticker}`;
        console.log(`Getting from store with key: ${cacheKey}`);
        
        const cached = await store.get(cacheKey);
        console.log(`Store.get result:`, cached ? 'Data found' : 'No data');
        
        if (cached) {
          const data = JSON.parse(cached);
          const age = Date.now() - data.timestamp;
          const cacheExpiry = 2 * 60 * 60 * 1000; // 2 hours
          
          if (age < cacheExpiry) {
            console.log(`Cache hit for ${ticker} (${Math.round(age / 60000)} min old)`);
            return new Response(JSON.stringify(data), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          } else {
            console.log(`Cache expired for ${ticker}`);
            await store.delete(cacheKey);
          }
        }
        
        return new Response(JSON.stringify(null), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (storeError) {
        console.error('Store operation failed:', storeError);
        return new Response(JSON.stringify({ error: 'Store operation failed', details: storeError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    if (request.method === 'POST') {
      console.log(`=== POST REQUEST for ${ticker} ===`);
      
      if (!blobsAvailable) {
        return new Response(JSON.stringify({ error: 'Blobs not available' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      try {
        const data = await request.json();
        console.log(`POST data received:`, data ? 'Yes' : 'No');
        
        if (!data.data || !data.timestamp) {
          return new Response(JSON.stringify({ error: 'data and timestamp required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const cacheKey = `ai_cache_${ticker}`;
        console.log(`Storing to key: ${cacheKey}`);
        
        await store.set(cacheKey, JSON.stringify(data));
        console.log(`Storage successful for ${ticker}`);
        
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (storeError) {
        console.error('POST store operation failed:', storeError);
        return new Response(JSON.stringify({ error: 'Store operation failed', details: storeError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    if (request.method === 'DELETE') {
      console.log(`=== DELETE REQUEST for ${ticker} ===`);
      
      if (!blobsAvailable) {
        return new Response(JSON.stringify({ error: 'Blobs not available' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      try {
        const cacheKey = `ai_cache_${ticker}`;
        console.log(`Deleting cache key: ${cacheKey}`);
        
        await store.delete(cacheKey);
        console.log(`Successfully deleted server cache for ${ticker}`);
        
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (storeError) {
        console.error('DELETE store operation failed:', storeError);
        return new Response(JSON.stringify({ error: 'Store operation failed', details: storeError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('=== FUNCTION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};