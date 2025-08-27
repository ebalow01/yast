const { spawn } = require('child_process');
const path = require('path');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
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
    // Get the path to the Python script
    const scriptPath = path.join(process.cwd(), 'drip', 'enhanced_monthly_pipeline.py');
    
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [scriptPath], {
        cwd: path.join(process.cwd(), 'drip'),
        env: {
          ...process.env,
          PYTHONPATH: path.join(process.cwd(), 'drip')
        }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          resolve({
            statusCode: 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              error: 'Pipeline execution failed',
              stderr: stderr,
              code: code
            })
          });
          return;
        }

        // Parse the output to extract results
        const lines = stdout.split('\n');
        const recommendations = [];
        const summary = {};
        
        let inRecommendations = false;
        let inSummary = false;
        
        console.log('Python script output lines:', lines.length);
        console.log('Looking for FINAL ENHANCED RECOMMENDATIONS section...');
        
        for (const line of lines) {
          if (line.includes('FINAL ENHANCED RECOMMENDATIONS:')) {
            console.log('Found FINAL ENHANCED RECOMMENDATIONS section');
            inRecommendations = true;
            continue;
          }
          
          if (line.includes('ENHANCED PIPELINE SUMMARY:')) {
            console.log('Found ENHANCED PIPELINE SUMMARY section');
            inSummary = true;
            inRecommendations = false;
            continue;
          }
          
          // Log all lines while in recommendations section for debugging
          if (inRecommendations) {
            console.log('In recommendations section, line:', JSON.stringify(line));
          }
          
          if (inRecommendations && line.trim() && !line.includes('Strategy        Best Variant') && !line.includes('---')) {
            // Parse the fixed-width table format
            const trimmed = line.trim();
            console.log('Processing recommendation line:', trimmed);
            if (trimmed.length > 0) {
              // Use regex to match the table columns more precisely
              // Strategy name, variant (can contain spaces and special chars), ticker, training %, testing %
              const match = trimmed.match(/^(\S+)\s+(.+?)\s+([A-Z]+)\s+([+-]?\d+\.?\d*%)\s+([+-]?\d+\.?\d*%)$/);
              if (match) {
                console.log('Successfully parsed:', {
                  strategy: match[1],
                  variant: match[2].trim(),
                  ticker: match[3],
                  training: match[4],
                  testing: match[5]
                });
                recommendations.push({
                  strategy: match[1],
                  variant: match[2].trim(),
                  ticker: match[3],
                  training: match[4],
                  testing: match[5]
                });
              } else {
                console.log('Failed to parse line:', trimmed);
              }
            }
          }
          
          if (inSummary && line.includes('Combined Testing Return:')) {
            const match = line.match(/Combined Testing Return:\s*([\+\-]\d+\.?\d*%)/);
            if (match) {
              summary.combinedReturn = match[1];
            }
          }
          
          if (inSummary && line.includes('Strategy Variants Tested:')) {
            const match = line.match(/Strategy Variants Tested:\s*(\d+)/);
            if (match) {
              summary.variantsTested = match[1];
            }
          }
        }

        console.log('Final recommendations array:', recommendations);
        console.log('Final summary object:', summary);

        resolve({
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            success: true,
            recommendations,
            summary,
            fullOutput: stdout,
            timestamp: new Date().toISOString()
          })
        });
      });

      pythonProcess.on('error', (error) => {
        resolve({
          statusCode: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: 'Failed to start Python process',
            details: error.message
          })
        });
      });
    });

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};