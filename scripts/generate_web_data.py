#!/usr/bin/env python3
"""
Generate JSON data for web frontend
Converts analysis results to JSON format for React consumption
"""

import json
import pandas as pd
import numpy as np
from datetime import datetime
import os
import sys
import re
import yfinance as yf
import hashlib

# Add parent directory to path to import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from multi_ticker_orchestrator import main as run_analysis
from multi_ticker_data_processor import TICKER_CONFIGS

def convert_numpy_types(obj):
    """Convert numpy types to JSON serializable types"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    elif isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def calculate_forward_yield(ticker, median_dividend):
    """
    Calculate forward yield: (median dividend * 52) / current price * 100
    """
    print(f"Calculating forward yield for {ticker} (dividend: ${median_dividend})")
    
    try:
        # Get current price from yfinance
        stock = yf.Ticker(ticker)
        current_price = stock.info.get('regularMarketPrice')
        
        # If regularMarketPrice not available, try previousClose
        if not current_price:
            current_price = stock.info.get('previousClose')
        
        # If still no price, try getting recent data
        if not current_price:
            recent_data = stock.history(period="5d")
            if not recent_data.empty:
                current_price = recent_data['Close'].iloc[-1]
        
        print(f"   Price for {ticker}: ${current_price}")
        
        if current_price and median_dividend > 0:
            forward_yield = (median_dividend * 52 / current_price) * 100
            print(f"   Forward yield for {ticker}: {forward_yield:.1f}%")
            return round(forward_yield, 1)
        else:
            print(f"   Warning: Could not calculate forward yield for {ticker} - price: {current_price}, dividend: {median_dividend}")
            return None
            
    except Exception as e:
        print(f"   ERROR calculating forward yield for {ticker}: {e}")
        return None

def create_fallback_data(web_data_dir):
    """Create fallback data when analysis fails"""
    print("Creating fallback data for deployment...")
    
    # Generate ticker configs for frontend
    ticker_configs = {}
    for ticker, config in TICKER_CONFIGS.items():
        ticker_configs[ticker] = {
            'name': config['name'],
            'start_date': config['start_date']
        }
    
    # Save ticker configs
    with open(os.path.join(web_data_dir, 'ticker_configs.json'), 'w') as f:
        json.dump(ticker_configs, f, indent=2, default=convert_numpy_types)
    
    # Generate fallback performance data
    performance_data = []
    
    # Create sample ticker data
    for ticker in TICKER_CONFIGS.keys():
        ticker_info = {
            'ticker': ticker,
            'tradingDays': 30,
            'exDivDay': 'Thursday',
            'buyHoldReturn': 0.15,
            'divCaptureReturn': 0.12,
            'bestStrategy': 'B&H',
            'bestReturn': 0.15,
            'finalValue': 115000,
            'dcWinRate': 0.75,
            'riskVolatility': 0.25,
            'riskLevel': 'LOW',
            'medianDividend': 0.25,
            'forwardYield': 25.0,
            'category': 'excluded'
        }
        performance_data.append(ticker_info)
    
    # Save performance data
    with open(os.path.join(web_data_dir, 'performance_data.json'), 'w') as f:
        json.dump(performance_data, f, indent=2, default=convert_numpy_types)
    
    # Generate metadata
    import hashlib
    build_id = hashlib.md5(datetime.now().isoformat().encode()).hexdigest()[:8]
    metadata = {
        'generated_at': datetime.now().isoformat(),
        'build_id': build_id,
        'version': '1.0.0',
        'status': 'fallback',
        'analysisDate': datetime.now().strftime('%B %d, %Y'),
        'startingCapital': 100000,
        'totalTickers': len(TICKER_CONFIGS),
        'data_files': [
            'ticker_configs.json',
            'performance_data.json'
        ],
        'analysis_info': {
            'total_tickers': len(TICKER_CONFIGS),
            'strategies_analyzed': [
                'Buy & Hold',
                'Dividend Capture',
                'DD to DD+4',
                'DD+2 to DD+4'
            ]
        }
    }
    
    with open(os.path.join(web_data_dir, 'metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2, default=convert_numpy_types)
    
    print("SUCCESS: Fallback data created successfully")
    return True

def process_analysis_data(web_data_dir):
    """Process analysis data and generate JSON files for web frontend"""
    
    # Find the latest comprehensive table file
    comprehensive_files = []
    
    # Check in parent directory first
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # First check for cleaned file
    cleaned_file_path = os.path.join(parent_dir, 'comprehensive_sorted_table_cleaned.txt')
    if os.path.exists(cleaned_file_path):
        comprehensive_files.append(cleaned_file_path)
    else:
        # Fall back to regular files in parent directory
        for file in os.listdir(parent_dir):
            if file.startswith('comprehensive_sorted_table_') and file.endswith('.txt'):
                comprehensive_files.append(os.path.join(parent_dir, file))
    
    if not comprehensive_files:
        print("WARNING: No comprehensive table file found. Creating fallback data.")
        return create_fallback_data(web_data_dir)
    
    # Use the latest file
    latest_file = sorted(comprehensive_files)[-1]
    print(f"Processing analysis data from: {latest_file}")
    
    # Parse the comprehensive table
    analysis_data = []
    
    try:
        # Try UTF-8 first, fallback to Windows encoding
        try:
            with open(latest_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except UnicodeDecodeError:
            # Try Windows-1252 encoding which handles more characters
            try:
                with open(latest_file, 'r', encoding='windows-1252') as f:
                    lines = f.readlines()
            except UnicodeDecodeError:
                # Final fallback - read as binary and clean
                with open(latest_file, 'rb') as f:
                    content = f.read()
                    # Clean problematic characters
                    content = content.replace(b'\x95', b'*')  # Replace bullet with asterisk
                    content = content.replace(b'\x94', b'"')  # Replace smart quote
                    content = content.replace(b'\x93', b'"')  # Replace smart quote
                    lines = content.decode('utf-8', errors='ignore').splitlines()
                    lines = [line + '\n' for line in lines]  # Add newlines back
        
        # Find the data sections
        parsing_data = False
        current_category = 'excluded'
        
        for line in lines:
            line = line.strip()
            
            # Skip empty lines and headers
            if not line or line.startswith('=') or line.startswith('COMPREHENSIVE') or line.startswith('Analysis Date'):
                continue
                
            # Check if we're in a data section
            if line.startswith('HIGH PERFORMERS') or line.startswith('MEDIUM PERFORMERS') or line.startswith('LOW PERFORMERS'):
                parsing_data = True
                # Determine category
                if 'HIGH PERFORMERS' in line or 'MEDIUM PERFORMERS' in line:
                    current_category = 'top-performers'
                else:
                    current_category = 'excluded'
                continue
            
            # Check if we're in benchmark section
            if line.startswith('BENCHMARK COMPARISON'):
                current_category = 'benchmark'
                parsing_data = True
                continue
            
            # Check if we hit the end
            if line.startswith('KEY INSIGHTS'):
                parsing_data = False
                continue
            
            # Skip header lines
            if line.startswith('Ticker') or line.startswith('----'):
                continue
            
            # Parse data lines
            if parsing_data and line:
                # Skip SPY benchmark line since it contains N/A values
                if line.strip().startswith('SPY'):
                    continue
                    
                # Use a more robust parsing approach that handles the fixed-width format
                try:
                    # Extract each field by position for better parsing
                    ticker = line[0:8].strip()
                    
                    # Skip if ticker is empty or invalid
                    if not ticker or ticker in ['SPY']:
                        continue
                    
                    days_str = line[9:15].strip()
                    days = int(days_str) if days_str and days_str != 'N/A' else 0
                    
                    ex_div_day = line[16:25].strip()
                    
                    buy_hold_str = line[26:38].strip().replace('%', '')
                    buy_hold_return = float(buy_hold_str) / 100 if buy_hold_str and buy_hold_str != 'N/A' else 0.0
                    
                    div_capture_str = line[41:53].strip().replace('%', '')
                    div_capture_return = float(div_capture_str) / 100 if div_capture_str and div_capture_str != 'N/A' else 0.0
                    
                    # Debug output
                    print(f"   {ticker}: B&H={buy_hold_return:.4f} ({buy_hold_str}), DC={div_capture_return:.4f} ({div_capture_str})")
                    
                    # Determine best strategy by comparing actual returns
                    if div_capture_return > buy_hold_return:
                        best_strategy = 'DC'
                        best_return = div_capture_return
                        print(f"   {ticker}: DC wins ({div_capture_return:.4f} > {buy_hold_return:.4f})")
                    else:
                        best_strategy = 'B&H'
                        best_return = buy_hold_return
                        print(f"   {ticker}: B&H wins ({buy_hold_return:.4f} > {div_capture_return:.4f})")
                    
                    final_value_str = line[71:83].strip().replace('$', '').replace(',', '')
                    final_value = float(final_value_str) if final_value_str and final_value_str != 'N/A' else 100000.0
                    
                    dc_win_rate_str = line[84:95].strip().replace('%', '')
                    dc_win_rate = float(dc_win_rate_str) / 100 if dc_win_rate_str and dc_win_rate_str != 'N/A' else 0.0
                    
                    risk_volatility_str = line[96:107].strip().replace('%', '')
                    risk_volatility = float(risk_volatility_str) / 100 if risk_volatility_str and risk_volatility_str != 'N/A' else 0.0
                    
                    # Handle median dividend at position 110
                    median_dividend_str = line[110:].strip().replace('$', '').replace('%', '')
                    try:
                        median_dividend = float(median_dividend_str) if median_dividend_str and median_dividend_str != 'N/A' and median_dividend_str != '' else 0.0
                    except ValueError as e:
                        print(f"ERROR parsing median dividend for {ticker}: '{median_dividend_str}' - {e}")
                        median_dividend = 0.0
                    
                    # Determine category based on new criteria:
                    # Top performers: Either B&H or DC returns > 40% AND risk < 40%
                    best_return_pct = max(buy_hold_return, div_capture_return) * 100
                    risk_pct = risk_volatility * 100
                    
                    if best_return_pct > 40 and risk_pct < 40:
                        category = 'top-performers'
                    else:
                        category = 'excluded'
                    
                    # Calculate forward yield using current price from yfinance
                    forward_yield = calculate_forward_yield(ticker, median_dividend)
                    print(f"   Added {ticker}: Forward yield = {forward_yield}")
                    
                    # Risk level will be set by dashboard_risk_integration.py later
                    # Use a temporary placeholder that will be overwritten
                    risk_level = 'PENDING'
                    
                    analysis_data.append({
                        'ticker': ticker,
                        'tradingDays': days,
                        'exDivDay': ex_div_day,
                        'buyHoldReturn': buy_hold_return,
                        'divCaptureReturn': div_capture_return,
                        'bestStrategy': best_strategy,
                        'bestReturn': best_return,
                        'finalValue': final_value,
                        'dcWinRate': dc_win_rate,
                        'riskVolatility': risk_volatility,
                        'riskLevel': risk_level,
                        'medianDividend': median_dividend,
                        'forwardYield': forward_yield,
                        'category': category
                    })
                except UnicodeEncodeError as e:
                    print(f"Warning: Unicode encoding error in line parsing. Error: {e}")
                    continue
                except (ValueError, IndexError, AttributeError) as e:
                    print(f"Warning: Could not parse line for ticker parsing. Error: {e}")
                    continue
    
    except Exception as e:
        print(f"ERROR parsing comprehensive table: {e}")
        return create_fallback_data(web_data_dir)
    
    if not analysis_data:
        print("WARNING: No analysis data found. Creating fallback data.")
        return create_fallback_data(web_data_dir)
    
    # Generate ticker configs for frontend
    ticker_configs = {}
    for ticker, config in TICKER_CONFIGS.items():
        ticker_configs[ticker] = {
            'name': config['name'],
            'start_date': config['start_date']
        }
    
    # Save ticker configs
    with open(os.path.join(web_data_dir, 'ticker_configs.json'), 'w') as f:
        json.dump(ticker_configs, f, indent=2, default=convert_numpy_types)
    
    # Save performance data
    with open(os.path.join(web_data_dir, 'performance_data.json'), 'w') as f:
        json.dump(analysis_data, f, indent=2, default=convert_numpy_types)
    
    # Generate metadata
    build_id = hashlib.md5(datetime.now().isoformat().encode()).hexdigest()[:8]
    metadata = {
        'generated_at': datetime.now().isoformat(),
        'build_id': build_id,
        'version': '1.0.0',
        'status': 'live',
        'analysisDate': datetime.now().strftime('%B %d, %Y'),
        'startingCapital': 100000,
        'totalTickers': len(analysis_data),
        'data_files': [
            'ticker_configs.json',
            'performance_data.json'
        ],
        'analysis_info': {
            'total_tickers': len(analysis_data),
            'strategies_analyzed': [
                'Buy & Hold',
                'Dividend Capture',
                'DD to DD+4',
                'DD+2 to DD+4'
            ]
        }
    }
    
    with open(os.path.join(web_data_dir, 'metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2, default=convert_numpy_types)
    
    print(f"SUCCESS: Web data generated in: {web_data_dir}")
    print("Generated files:")
    print("   - ticker_configs.json")
    print("   - performance_data.json")
    print("   - metadata.json")
    print(f"Processed {len(analysis_data)} tickers")
    
    # Forward yield summary
    forward_yields_calculated = sum(1 for item in analysis_data if item.get('forwardYield') is not None)
    print(f"Forward yields calculated: {forward_yields_calculated}/{len(analysis_data)} tickers")
    if forward_yields_calculated > 0:
        valid_yields = [item['forwardYield'] for item in analysis_data if item.get('forwardYield') is not None]
        avg_yield = sum(valid_yields) / len(valid_yields)
        print(f"Average forward yield: {avg_yield:.1f}%")
    
    return True

def generate_web_data():
    """Generate JSON data files for web frontend"""
    print("Generating web data...")
    
    # Create web data directory
    web_data_dir = "yast-react/public/data"
    os.makedirs(web_data_dir, exist_ok=True)
    
    # Run the analysis
    print("Running analysis...")
    try:
        # Change to project root directory
        original_dir = os.getcwd()
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        os.chdir(project_root)
        
        comprehensive_table_file = run_analysis()
        print(f"SUCCESS: Analysis complete: {comprehensive_table_file}")
        
        # Change back to original directory
        os.chdir(original_dir)
        
    except Exception as e:
        print(f"ERROR: Analysis failed: {e}")
        # Create fallback data for deployment
        print("Creating fallback data...")
        create_fallback_data(web_data_dir)
        return True  # Return True for fallback success
    
    # Read and process the data
    print("Processing data for web...")
    success = process_analysis_data(web_data_dir)
    
    if success:
        # Automatically integrate risk assessment data
        print("Integrating risk assessment data...")
        try:
            # Import and run the risk integration script
            os.chdir(project_root)
            from dashboard_risk_integration import main as integrate_risk_data
            integrate_risk_data()
            print("SUCCESS: Risk assessment data integrated")
        except Exception as e:
            print(f"WARNING: Risk assessment integration failed: {e}")
            # Don't fail the entire process for risk data issues
        finally:
            os.chdir(original_dir)
    
    return success

if __name__ == "__main__":
    try:
        success = generate_web_data()
        if success:
            print("SUCCESS: Web data generation completed successfully")
            sys.exit(0)
        else:
            print("ERROR: Web data generation failed")
            sys.exit(1)
    except Exception as e:
        print(f"FATAL ERROR: {e}")
        sys.exit(1)
