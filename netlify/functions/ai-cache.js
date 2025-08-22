import { getStore } from '@netlify/blobs';

export default async (request, context) => {
  try {
    const store = getStore('ai-cache');
    const url = new URL(request.url);
    const ticker = url.searchParams.get('ticker');
    
    if (!ticker) {
      return new Response(JSON.stringify({ error: 'ticker parameter required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'GET') {
      console.log(`Checking server cache for ${ticker}`);
      
      try {
        const cached = await store.get(`ai_cache_${ticker}`);
        if (cached) {
          const data = JSON.parse(cached);
          const age = Date.now() - data.timestamp;
          const cacheExpiry = 2 * 60 * 60 * 1000; // 2 hours
          
          if (age < cacheExpiry) {
            console.log(`Server cache hit for ${ticker} (${Math.round(age / 60000)} min old)`);
            return new Response(JSON.stringify(data), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          } else {
            console.log(`Server cache expired for ${ticker} (${Math.round(age / 60000)} min old)`);
            await store.delete(`ai_cache_${ticker}`);
          }
        } else {
          console.log(`No server cache found for ${ticker}`);
        }
      } catch (error) {
        console.error('Error reading from server cache:', error);
      }
      
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (request.method === 'POST') {
      try {
        const data = await request.json();
        
        if (!data.data || !data.timestamp) {
          return new Response(JSON.stringify({ error: 'data and timestamp required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        await store.set(`ai_cache_${ticker}`, JSON.stringify(data));
        console.log(`Stored server cache for ${ticker}`);
        
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error storing to server cache:', error);
        return new Response(JSON.stringify({ error: 'Failed to store cache' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    if (request.method === 'DELETE') {
      try {
        await store.delete(`ai_cache_${ticker}`);
        console.log(`Deleted server cache for ${ticker}`);
        
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error deleting from server cache:', error);
        return new Response(JSON.stringify({ error: 'Failed to delete cache' }), {
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
    console.error('Cache function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};