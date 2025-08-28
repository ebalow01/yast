const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function preComputeAnalysis() {
  console.log('Pre-computing Python analysis during build...');
  
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', 'drip', 'enhanced_monthly_pipeline.py');
    const outputPath = path.join(__dirname, '..', 'yast-react', 'public', 'data', 'pre-computed-analysis.json');
    
    // Use python3 on Unix-like systems, python on Windows
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    
    const pythonProcess = spawn(pythonCmd, [scriptPath], {
      cwd: path.join(__dirname, '..', 'drip'),
      env: {
        ...process.env,
        PYTHONPATH: path.join(__dirname, '..', 'drip')
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

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error('Python script failed:', stderr);
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        // Parse Python output and save as JSON
        const analysisData = {
          computedAt: new Date().toISOString(),
          pythonOutput: stdout,
          analysisResults: parsePythonOutput(stdout)
        };

        await fs.writeFile(outputPath, JSON.stringify(analysisData, null, 2));
        console.log('Analysis pre-computed and saved to:', outputPath);
        resolve(analysisData);
      } catch (error) {
        reject(error);
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

function parsePythonOutput(output) {
  // Parse the Python script output (same logic as in your original function)
  const lines = output.split('\n');
  const recommendations = [];
  const summary = {};
  
  let inRecommendations = false;
  let inSummary = false;
  
  for (const line of lines) {
    if (line.includes('FINAL ENHANCED RECOMMENDATIONS:')) {
      inRecommendations = true;
      continue;
    }
    
    if (line.includes('ENHANCED PIPELINE SUMMARY:')) {
      inSummary = true;
      inRecommendations = false;
      continue;
    }
    
    if (inRecommendations && line.trim() && !line.includes('Strategy        Best Variant') && !line.includes('---')) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        const match = trimmed.match(/^(\S+)\s+(.+?)\s+([A-Z]+)\s+([+-]?\d+\.?\d*%)\s+([+-]?\d+\.?\d*%)$/);
        if (match) {
          recommendations.push({
            strategy: match[1],
            variant: match[2].trim(),
            ticker: match[3],
            training: match[4],
            testing: match[5]
          });
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
  
  return { recommendations, summary };
}

// Run if called directly
if (require.main === module) {
  preComputeAnalysis()
    .then(() => {
      console.log('Pre-computation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Pre-computation failed:', error);
      process.exit(1);
    });
}

module.exports = { preComputeAnalysis };