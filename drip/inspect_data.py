#!/usr/bin/env python3
"""
Inspect the data structure to understand the issue
"""
import pandas as pd

def inspect_data():
    print("INSPECTING DATA STRUCTURE")
    print("=" * 40)
    
    # Read just the first few rows to see structure
    df = pd.read_csv('fed_strategy_data_fixed_20181201_to_20191231.csv', nrows=10)
    
    print(f"Shape: {df.shape}")
    print(f"Columns ({len(df.columns)}):")
    
    # Show first 20 columns
    for i, col in enumerate(df.columns[:20]):
        print(f"  {i:2}: {col}")
    
    if len(df.columns) > 20:
        print(f"  ... and {len(df.columns) - 20} more columns")
    
    print(f"\nFirst few rows:")
    print(df.head())
    
    # Check for expected columns
    expected_columns = ['Date', 'Ticker', 'Open', 'High', 'Low', 'Close', 'Volume']
    print(f"\nChecking for expected columns:")
    for col in expected_columns:
        if col in df.columns:
            print(f"  ✓ {col} - Found")
        else:
            print(f"  ✗ {col} - Missing")

if __name__ == "__main__":
    inspect_data()