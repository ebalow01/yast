@echo off
REM YieldMax ETF Analysis System - Windows Batch Script
REM This script sets up the environment and runs the analysis

echo 🎯 YieldMax ETF Analysis System
echo ==================================

REM Check Python version
python --version 2>NUL
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

REM Run the analysis
echo 🚀 Running YieldMax analysis...
python multi_ticker_orchestrator.py

echo ✅ Analysis complete!
echo 📊 Check the comprehensive_sorted_table_*.txt file for results
pause
