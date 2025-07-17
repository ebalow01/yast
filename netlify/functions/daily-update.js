// netlify/functions/daily-update.js
const { execSync } = require('child_process');

exports.handler = async (event, context) => {
  try {
    console.log('Starting daily ETF analysis');
    
    // Run the Python analysis
    execSync('python multi_ticker_orchestrator.py', { 
      stdio: 'inherit',
      cwd: process.cwd() 
    });
    
    // Generate web data
    execSync('python scripts/generate_web_data.py', { 
      stdio: 'inherit',
      cwd: process.cwd() 
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Daily update completed successfully' })
    };
  } catch (error) {
    console.error('Error during daily update:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Daily update failed', details: error.message })
    };
  }
};
