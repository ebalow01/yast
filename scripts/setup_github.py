#!/usr/bin/env python3
"""
GitHub Repository Setup Script
Helps set up the YieldMax analysis system for GitHub publication
"""

import os
import subprocess
import sys

def check_git_installed():
    """Check if Git is installed"""
    try:
        result = subprocess.run(['git', '--version'], capture_output=True, text=True, check=False)
        print(f"✅ Git is installed: {result.stdout.strip()}")
        return True
    except FileNotFoundError:
        print("❌ Git is not installed. Please install Git first:")
        print("   Download from: https://git-scm.com/download/win")
        return False

def check_git_config():
    """Check if Git is configured with user name and email"""
    try:
        name = subprocess.run(['git', 'config', 'user.name'], capture_output=True, text=True, check=False)
        email = subprocess.run(['git', 'config', 'user.email'], capture_output=True, text=True, check=False)
        
        if name.stdout.strip() and email.stdout.strip():
            print(f"✅ Git configured for: {name.stdout.strip()} <{email.stdout.strip()}>")
            return True
        else:
            print("⚠️  Git is not configured. Please set your name and email:")
            print("   git config --global user.name 'Your Name'")
            print("   git config --global user.email 'your.email@example.com'")
            return False
    except subprocess.CalledProcessError as e:
        print(f"❌ Error checking git config: {e}")
        return False

def initialize_git_repo():
    """Initialize Git repository if not already initialized"""
    try:
        if os.path.exists('.git'):
            print("✅ Git repository already initialized")
            return True
        
        subprocess.run(['git', 'init'], check=True)
        print("✅ Git repository initialized")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to initialize git repository: {e}")
        return False

def create_initial_commit():
    """Create initial commit"""
    try:
        # Add all files
        subprocess.run(['git', 'add', '.'], check=True)
        
        # Create commit
        subprocess.run(['git', 'commit', '-m', 'Initial commit: YieldMax ETF Analysis System'], check=True)
        print("✅ Initial commit created")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to create initial commit: {e}")
        return False

def show_next_steps():
    """Show next steps for GitHub setup"""
    print("\n" + "="*60)
    print("🎉 LOCAL SETUP COMPLETE!")
    print("="*60)
    print("\nNext steps to publish to GitHub:")
    print("\n1. 🌐 Create GitHub Repository:")
    print("   - Go to https://github.com/new")
    print("   - Repository name: 'yast' or 'yieldmax-analysis'")
    print("   - Description: 'YieldMax ETF Multi-Ticker Analysis System'")
    print("   - Make it Public")
    print("   - Don't initialize with README (you already have one)")
    print("\n2. 🔗 Connect to GitHub:")
    print("   Run these commands (replace YOUR_USERNAME and REPO_NAME):")
    print("   git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git")
    print("   git branch -M main")
    print("   git push -u origin main")
    print("\n3. 🌍 Deploy Website:")
    print("   Choose one of these options:")
    print("   - GitHub Pages (free, easy)")
    print("   - Netlify (free tier, more features)")
    print("   - Vercel (free tier, serverless)")
    print("\n4. 📊 Set up Data Pipeline:")
    print("   - Your GitHub Actions workflow will run daily")
    print("   - It will update analysis data automatically")
    print("   - Website will update with fresh data")
    print("\n📖 For detailed instructions, see: docs/DEPLOYMENT.md")

def main():
    """Main setup function"""
    print("🚀 YieldMax ETF Analysis System - GitHub Setup")
    print("=" * 60)
    
    # Check prerequisites
    if not check_git_installed():
        sys.exit(1)
    
    if not check_git_config():
        print("\n⚠️  Please configure Git first, then run this script again.")
        sys.exit(1)
    
    # Initialize repository
    if not initialize_git_repo():
        sys.exit(1)
    
    # Create initial commit
    if not create_initial_commit():
        sys.exit(1)
    
    # Show next steps
    show_next_steps()

if __name__ == "__main__":
    main()
