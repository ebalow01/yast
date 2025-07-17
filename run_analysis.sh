#!/bin/bash

# YieldMax ETF Analysis System - Quick Setup Script
# This script sets up the environment and runs the analysis

echo "🎯 YieldMax ETF Analysis System"
echo "=================================="

# Check Python version
python_version=$(python --version 2>&1)
echo "Python version: $python_version"

# Check if Python 3.8+ is available
if command -v python3 &> /dev/null; then
    python3_version=$(python3 --version 2>&1)
    echo "Python3 version: $python3_version"
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ Python not found. Please install Python 3.8+"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
$PYTHON_CMD -m pip install --upgrade pip
$PYTHON_CMD -m pip install -r requirements.txt

# Run the analysis
echo "🚀 Running YieldMax analysis..."
$PYTHON_CMD multi_ticker_orchestrator.py

echo "✅ Analysis complete!"
echo "📊 Check the comprehensive_sorted_table_*.txt file for results"
