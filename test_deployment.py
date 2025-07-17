#!/usr/bin/env python3
"""
Test script to verify the deployment pipeline works correctly
"""

import os
import json
import subprocess
import sys

def test_json_files():
    """Test that JSON files were generated correctly"""
    data_dir = "yast-react/public/data"
    
    required_files = [
        "performance_data.json",
        "metadata.json", 
        "ticker_configs.json"
    ]
    
    print("Testing JSON file generation...")
    
    for file in required_files:
        filepath = os.path.join(data_dir, file)
        if not os.path.exists(filepath):
            print(f"❌ Missing file: {filepath}")
            return False
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            print(f"✅ {file} - Valid JSON with {len(data) if isinstance(data, list) else 'metadata'} items")
        except json.JSONDecodeError as e:
            print(f"❌ {file} - Invalid JSON: {e}")
            return False
    
    return True

def test_build_script():
    """Test that the build script runs without errors"""
    print("Testing build script...")
    
    try:
        result = subprocess.run([sys.executable, "scripts/build_web.py"], 
                              capture_output=True, text=True, timeout=300, check=False)
        
        if result.returncode == 0:
            print("✅ Build script executed successfully")
            return True
        else:
            print(f"❌ Build script failed with return code {result.returncode}")
            print("STDOUT:", result.stdout[-500:])  # Last 500 chars
            print("STDERR:", result.stderr[-500:])  # Last 500 chars
            return False
    except subprocess.TimeoutExpired:
        print("❌ Build script timed out")
        return False
    except (subprocess.SubprocessError, OSError) as e:
        print(f"❌ Build script error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing YAST deployment pipeline...")
    print("=" * 50)
    
    # Change to project directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    json_test = test_json_files()
    build_test = test_build_script()
    
    print("=" * 50)
    if json_test and build_test:
        print("✅ All tests passed! Ready for Netlify deployment")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
