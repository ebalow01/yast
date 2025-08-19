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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { prompt, image } = JSON.parse(event.body);
    
    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing prompt parameter' })
      };
    }

    // Get Claude API key from environment variable
    const claudeApiKey = process.env.CLAUDE_API_KEY;
    console.log('Environment variables available:', Object.keys(process.env));
    console.log('Claude API key exists:', !!claudeApiKey);
    console.log('Claude API key length:', claudeApiKey ? claudeApiKey.length : 0);
    console.log('🤖 Using Claude model: claude-sonnet-4-20250514 (Sonnet 4)');
    console.log('📝 Max tokens:', 2000);
    console.log('📊 Prompt length:', prompt.length, 'characters');
    
    if (!claudeApiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Claude API key not configured' })
      };
    }

    // Make request to Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',  // Claude Sonnet 4 for best analysis
        max_tokens: 2000,  // Increased for more detailed analysis
        messages: [
          {
            role: 'user',
            content: image ? [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: image
                }
              }
            ] : prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `Claude API request failed: ${response.status}`,
          details: errorText
        })
      };
    }

    const result = await response.json();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        analysis: result.content[0].text
      })
    };

  } catch (error) {
    console.error('Claude Analysis error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};