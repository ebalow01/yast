#!/bin/bash
# Daily ETF Analysis Script for Cron/External Scheduler

# Set working directory
cd /path/to/your/yast/project

# Activate virtual environment if needed
# source venv/bin/activate

# Run the analysis
echo "Starting daily ETF analysis at $(date)"

# Run the main orchestrator
python multi_ticker_orchestrator.py

# Generate web data
python scripts/generate_web_data.py

# Commit changes to git
git add .
git commit -m "Daily ETF data update $(date +%Y-%m-%d)" || echo "No changes to commit"
git push origin main

# Trigger Netlify build via webhook
curl -X POST -d {} "$NETLIFY_BUILD_HOOK_URL"

echo "Daily ETF analysis completed at $(date)"
