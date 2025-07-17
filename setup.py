#!/usr/bin/env python3
"""
Setup script for YieldMax Dividend Analysis
Checks dependencies and runs the analysis
"""

import subprocess
import sys

def check_python_version():
    """Check if Python version is 3.8+"""
    if sys.version_info < (3, 8):
        print(f"❌ Python 3.8+ required. Current version: {sys.version}")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True

def install_dependencies():
    """Install required packages"""
    print("📦 Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        return False

def run_analysis():
    """Run the main analysis"""
    print("🚀 Starting YieldMax analysis...")
    try:
        subprocess.check_call([sys.executable, 'multi_ticker_orchestrator.py'])
        print("✅ Analysis completed successfully!")
        return True
    except subprocess.CalledProcessError:
        print("❌ Analysis failed")
        return False

def main():
    print("=" * 60)
    print("🎯 YieldMax Dividend Capture Analysis Setup")
    print("=" * 60)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Run analysis
    if not run_analysis():
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("🎉 Setup and analysis complete!")
    print("📊 Check the comprehensive_sorted_table_*.txt file for results")
    print("=" * 60)

if __name__ == "__main__":
    main()
