@echo off
REM GitHub Repository Setup Script for Windows
REM This script helps set up the YieldMax analysis system for GitHub publication

echo 🚀 YieldMax ETF Analysis System - GitHub Setup
echo ============================================================

REM Check if Git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git is not installed. Please install Git first:
    echo    Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo ✅ Git is installed

REM Check if Git is configured
git config user.name >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Git is not configured. Please set your name and email:
    echo    git config --global user.name "Your Name"
    echo    git config --global user.email "your.email@example.com"
    pause
    exit /b 1
)

echo ✅ Git is configured

REM Initialize Git repository if not already initialized
if exist .git (
    echo ✅ Git repository already initialized
) else (
    echo 📝 Initializing Git repository...
    git init
    if errorlevel 1 (
        echo ❌ Failed to initialize git repository
        pause
        exit /b 1
    )
    echo ✅ Git repository initialized
)

REM Create initial commit
echo 📝 Creating initial commit...
git add .
git commit -m "Initial commit: YieldMax ETF Analysis System"
if errorlevel 1 (
    echo ❌ Failed to create initial commit
    pause
    exit /b 1
)

echo ✅ Initial commit created

echo.
echo ============================================================
echo 🎉 LOCAL SETUP COMPLETE!
echo ============================================================
echo.
echo Next steps to publish to GitHub:
echo.
echo 1. 🌐 Create GitHub Repository:
echo    - Go to https://github.com/new
echo    - Repository name: 'yast' or 'yieldmax-analysis'
echo    - Description: 'YieldMax ETF Multi-Ticker Analysis System'
echo    - Make it Public
echo    - Don't initialize with README (you already have one)
echo.
echo 2. 🔗 Connect to GitHub:
echo    Run these commands (replace YOUR_USERNAME and REPO_NAME):
echo    git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 3. 🌍 Deploy Website:
echo    Choose one of these options:
echo    - GitHub Pages (free, easy)
echo    - Netlify (free tier, more features)
echo    - Vercel (free tier, serverless)
echo.
echo 4. 📊 Set up Data Pipeline:
echo    - Your GitHub Actions workflow will run daily
echo    - It will update analysis data automatically
echo    - Website will update with fresh data
echo.
echo 📖 For detailed instructions, see: docs\DEPLOYMENT.md
echo.

pause
