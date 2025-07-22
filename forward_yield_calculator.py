#!/usr/bin/env python3
"""
Forward Yield Calculator for Weekly Distribution ETFs
This script calculates forward yield for all ETFs: (median of last 3 dividends * 52) / current price
"""

import pandas as pd
import yfinance as yf
import os
import numpy as np
from datetime import datetime

def calculate_forward_yield_for_ticker(ticker):
    """
    Calculate forward yield for a specific ticker.
    Forward yield = (median of last 3 dividends * 52) / current price
    """
    print(f"Processing {ticker}...")
    
    # Read dividend data
    div_file = f'data/{ticker}_dividends.csv'
    if not os.path.exists(div_file):
        print(f"  Warning: No dividend file found for {ticker}")
        return None
    
    try:
        # Load dividend data
        div_df = pd.read_csv(div_file)
        if div_df.empty or 'Dividends' not in div_df.columns:
            print(f"  Warning: No dividend data found for {ticker}")
            return None
        
        # Get last 3 non-zero dividends
        dividends = div_df['Dividends'].dropna()
        dividends = dividends[dividends > 0]
        
        if len(dividends) < 3:
            print(f"  Warning: Less than 3 dividend payments for {ticker} (found {len(dividends)})")
            # Use all available dividends if less than 3
            last_3_dividends = dividends
        else:
            last_3_dividends = dividends.tail(3)
        
        median_dividend = last_3_dividends.median()
        print(f"  Last 3 dividends: {list(last_3_dividends.values)}")
        print(f"  Median dividend: ${median_dividend:.4f}")
        
        # Get current stock price
        stock = yf.Ticker(ticker)
        current_data = stock.history(period="1d")
        
        if current_data.empty:
            print(f"  Warning: Could not get current price for {ticker}")
            return None
        
        current_price = current_data['Close'].iloc[-1]
        print(f"  Current price: ${current_price:.2f}")
        
        # Calculate forward yield: (median dividend * 52) / current price * 100
        forward_yield = (median_dividend * 52 / current_price) * 100
        
        print(f"  Forward yield: {forward_yield:.1f}%")
        
        return {
            'ticker': ticker,
            'median_dividend': median_dividend,
            'current_price': current_price,
            'forward_yield': forward_yield,
            'dividend_count': len(last_3_dividends)
        }
        
    except Exception as e:
        print(f"  Error processing {ticker}: {e}")
        return None

def main():
    """
    Calculate forward yield for all ETFs and update the React data file.
    """
    print("Forward Yield Calculator for Weekly Distribution ETFs")
    print("=" * 60)
    
    # ETF list from your existing data
    etf_tickers = [
        'ULTY', 'YMAX', 'YMAG', 'LFGY', 'GPTY', 'SDTY', 'QDTY', 'RDTY', 
        'CHPY', 'NFLW', 'IWMY', 'AMZW', 'MSII', 'RDTE', 'AAPW', 'COII', 
        'MST', 'BLOX', 'BRKW', 'COIW', 'HOOW', 'METW', 'NVDW', 'PLTW', 'TSLW'
    ]
    
    # Additional ETFs that might be in your data
    additional_etfs = [
        'QDTE', 'QYLD', 'XYLD', 'RYLD', 'XYLG', 'RYLY', 'QYLG', 'JEPQ',
        'JEPI', 'DIVO', 'SCHD', 'VYM', 'HDV', 'FDVV', 'SPYD', 'NOBL', 
        'DGRO', 'TDIV', 'PFFD'  # Add any others you might have
    ]
    
    all_tickers = etf_tickers + additional_etfs
    
    forward_yield_data = []
    
    print(f"\nCalculating forward yield for {len(all_tickers)} ETFs...")
    print("-" * 60)
    
    for ticker in all_tickers:
        result = calculate_forward_yield_for_ticker(ticker)
        if result:
            forward_yield_data.append(result)
        print()  # Empty line for readability
    
    # Save results to CSV
    if forward_yield_data:
        df = pd.DataFrame(forward_yield_data)
        output_file = f"forward_yield_calculation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        df.to_csv(output_file, index=False)
        
        print(f"Results saved to: {output_file}")
        print("\nForward Yield Summary:")
        print("-" * 40)
        
        # Sort by forward yield descending
        df_sorted = df.sort_values('forward_yield', ascending=False)
        
        for _, row in df_sorted.iterrows():
            print(f"{row['ticker']:<6} {row['forward_yield']:>6.1f}%  (${row['current_price']:>6.2f})")
        
        # Show statistics
        print(f"\nStatistics:")
        print(f"Average forward yield: {df['forward_yield'].mean():.1f}%")
        print(f"Median forward yield: {df['forward_yield'].median():.1f}%")
        print(f"Highest yield: {df['forward_yield'].max():.1f}% ({df.loc[df['forward_yield'].idxmax(), 'ticker']})")
        print(f"Lowest yield: {df['forward_yield'].min():.1f}% ({df.loc[df['forward_yield'].idxmin(), 'ticker']})")
        
        # Generate TypeScript code for updating dividendData.ts
        print("\n" + "="*60)
        print("TYPESCRIPT UPDATE CODE")
        print("="*60)
        print("// Add this to each ETF object in dividendData.ts:")
        print()
        
        for _, row in df_sorted.iterrows():
            print(f'  // {row["ticker"]}')
            print(f'  "forwardYield": {row["forward_yield"]:.1f}, // {row["median_dividend"]:.3f} * 52 / ${row["current_price"]:.2f}')
            print()
    
    else:
        print("No forward yield data calculated.")

if __name__ == "__main__":
    main()
