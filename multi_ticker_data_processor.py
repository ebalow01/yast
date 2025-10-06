#!/usr/bin/env python3
"""
Weekly Distribution ETF Data Processor - Core Data Download and Processing
Downloads and processes stock data for multiple weekly distribution ETFs with dividend analysis.
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime
import os

# Ticker configurations
TICKER_CONFIGS = {
    'ULTY': {
        'start_date': '2025-03-13',
        'name': 'YieldMax Ultra Option Income Strategy ETF'
    },
    'YMAX': {
        'start_date': '2024-09-19',
        'name': 'YieldMax S&P 500 Option Income Strategy ETF'
    },
    'YMAG': {
        'start_date': '2024-09-19',
        'name': 'YieldMax Magnificent 7 Fund of Option Income ETFs'
    },
    'LFGY': {
        'start_date': '2025-01-23',
        'name': 'YieldMax Crypto Industry & Tech Portfolio Option Income ETF'
    },
    'GPTY': {
        'start_date': 'auto_detect',
        'name': 'YieldMax ChatGPT Option Income Strategy ETF'
    },
    'SDTY': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Super Dividend ETF'
    },
    'QDTY': {
        'start_date': 'auto_detect',
        'name': 'YieldMax QQQ Option Income Strategy ETF'
    },
    'RDTY': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Russell 2000 Option Income Strategy ETF'
    },
    'CHPY': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Chubb Option Income Strategy ETF'
    },
    'NFLW': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Netflix Option Income Strategy ETF'
    },
    'IWMY': {
        'start_date': 'auto_detect',
        'name': 'YieldMax IWM Option Income Strategy ETF'
    },
    'AMZW': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Amazon Option Income Strategy ETF'
    },
    'MSII': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Microsoft Option Income Strategy ETF'
    },
    'RDTE': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Russell 2000 Enhanced Option Income Strategy ETF'
    },
    'AAPW': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Apple Option Income Strategy ETF'
    },
    'COII': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Coin Option Income Strategy ETF'
    },
    'MST': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Microsoft Option Income Strategy ETF'
    },
    'BLOX': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Block Option Income Strategy ETF'
    },
    'BRKW': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Berkshire Hathaway Option Income Strategy ETF'
    },
    'COIW': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Coinbase Option Income Strategy ETF'
    },
    'HOOW': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Home Depot Option Income Strategy ETF'
    },
    'METW': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Meta Option Income Strategy ETF'
    },
    'NVDW': {
        'start_date': 'auto_detect',
        'name': 'YieldMax NVIDIA Option Income Strategy ETF'
    },
    'PLTW': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Palantir Option Income Strategy ETF'
    },
    'TSLW': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Tesla Option Income Strategy ETF'
    },
    'USOY': {
        'start_date': 'auto_detect',
        'name': 'Defiance Oil Enhanced Options Income ETF'
    },
    'TSYY': {
        'start_date': 'auto_detect',
        'name': 'GraniteShares YieldBOOST TSLA ETF'
    },
    'YETH': {
        'start_date': 'auto_detect',
        'name': 'Roundhill Ether Covered Call Strategy ETF'
    },
    'QQQY': {
        'start_date': 'auto_detect',
        'name': 'Defiance Nasdaq 100 Enhanced Options & 0DTE Income ETF'
    },
    'WDTE': {
        'start_date': 'auto_detect',
        'name': 'Defiance S&P 500 Target 30 Income ETF'
    },
    'YBTC': {
        'start_date': 'auto_detect',
        'name': 'Roundhill Bitcoin Covered Call Strategy ETF'
    },
    'QDTE': {
        'start_date': 'auto_detect',
        'name': 'Roundhill Innovation-100 0DTE Covered Call Strategy ETF'
    },
    'XDTE': {
        'start_date': 'auto_detect',
        'name': 'Roundhill S&P 500 0DTE Covered Call Strategy ETF'
    },
    'TQQY': {
        'start_date': 'auto_detect',
        'name': 'GraniteShares YieldBOOST QQQ ETF'
    },
    'YSPY': {
        'start_date': 'auto_detect',
        'name': 'GraniteShares YieldBOOST SPY ETF'
    },
    'XBTY': {
        'start_date': 'auto_detect',
        'name': 'GraniteShares YieldBOOST Bitcoin ETF'
    },
    'GLDY': {
        'start_date': 'auto_detect',
        'name': 'Defiance Gold Enhanced Options Income ETF'
    },
    'NVYY': {
        'start_date': 'auto_detect',
        'name': 'GraniteShares YieldBOOST NVDA ETF'
    },
    'MAGY': {
        'start_date': 'auto_detect',
        'name': 'Roundhill Magnificent Seven Covered Call ETF'
    },
    'TSII': {
        'start_date': 'auto_detect',
        'name': 'REX TSLA Growth & Income ETF'
    },
    'NVII': {
        'start_date': 'auto_detect',
        'name': 'REX NVDA Growth & Income ETF'
    },
    'BCCC': {
        'start_date': 'auto_detect',
        'name': 'Global X Bitcoin Covered Call ETF'
    },
    'MMKT': {
        'start_date': 'auto_detect',
        'name': 'Texas Capital Government Money Market ETF'
    },
    'WEEK': {
        'start_date': 'auto_detect',
        'name': 'Roundhill Weekly T-Bill ETF'
    },
    'MSTW': {
        'start_date': 'auto_detect',
        'name': 'Roundhill MSTR WeeklyPay ETF'
    },
    'AVGW': {
        'start_date': 'auto_detect',
        'name': 'Roundhill AVGO WeeklyPay ETF'
    },
    'GOOW': {
        'start_date': 'auto_detect',
        'name': 'Roundhill GOOGL WeeklyPay ETF'
    },
    'AMDW': {
        'start_date': 'auto_detect',
        'name': 'Roundhill AMD WeeklyPay ETF'
    },
    'MSFW': {
        'start_date': 'auto_detect',
        'name': 'Roundhill MSFT WeeklyPay ETF'
    },
    'WPAY': {
        'start_date': 'auto_detect',
        'name': 'Roundhill WeeklyPay Universe ETF'
    },
    'COYY': {
        'start_date': 'auto_detect',
        'name': 'GraniteShares YieldBOOST COIN ETF'
    },
    'AMYY': {
        'start_date': 'auto_detect',
        'name': 'GraniteShares YieldBOOST AMD ETF'
    },
    'AZYY': {
        'start_date': 'auto_detect',
        'name': 'GraniteShares YieldBoost AMZN ETF'
    },
    'HIMY': {
        'start_date': 'auto_detect',
        'name': 'Defiance Leveraged Long Income HIMS ETF'
    },
    'SMCC': {
        'start_date': 'auto_detect',
        'name': 'Defiance Leveraged Long + Income SMCI ETF'
    },
    'PLT': {
        'start_date': 'auto_detect',
        'name': 'Defiance Leveraged Long Income PLTR ETF'
    },
    'HOOI': {
        'start_date': 'auto_detect',
        'name': 'Defiance Leveraged Long Income HOOD ETF'
    },
    'AMDU': {
        'start_date': 'auto_detect',
        'name': 'Defiance Leveraged Long + Income AMD ETF'
    },
    'SLTY': {
        'start_date': 'auto_detect',
        'name': 'YieldMax Ultra Short Option Income Strategy ETF'
    },
    'QLDY': {
        'start_date': 'auto_detect',
        'name': 'Defiance Nasdaq 100 LightningSpread Income ETF'
    }
}

def get_ticker_info(ticker_symbol):
    """
    Get additional information about a ticker.
    """
    try:
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info
        return info
    except Exception as e:
        print(f"Error getting ticker info for {ticker_symbol}: {e}")
        return None

def download_ticker_data(ticker_symbol, start_date=None, end_date=None):
    """
    Download stock data for a specific ticker.
    """
    if end_date is None:
        end_date = datetime.now().strftime("%Y-%m-%d")
    
    # Use configured start date if not provided
    if start_date is None and ticker_symbol in TICKER_CONFIGS:
        config_start_date = TICKER_CONFIGS[ticker_symbol]['start_date']
        if config_start_date == 'auto_detect':
            print(f"Auto-detecting weekly dividend start date for {ticker_symbol}...")
            start_date = detect_weekly_dividend_start(ticker_symbol)
            if start_date is None:
                print(f"Could not detect weekly dividend start for {ticker_symbol}, using default")
                start_date = "2024-01-01"
        else:
            start_date = config_start_date
    elif start_date is None:
        start_date = "2024-01-01"  # Default start date
    
    print(f"\n{ticker_symbol} Stock Data Downloader")
    print("=" * 50)
    
    # Get ticker info
    info = get_ticker_info(ticker_symbol)
    if info:
        print("Company Information:")
        name = TICKER_CONFIGS.get(ticker_symbol, {}).get('name', info.get('longName', 'N/A'))
        print(f"Name: {name}")
        print(f"Sector: {info.get('sector', 'N/A')}")
        print(f"Industry: {info.get('industry', 'N/A')}")
        print(f"Market Cap: {info.get('marketCap', 'N/A')}")
        print(f"Currency: {info.get('currency', 'N/A')}")
        print(f"Exchange: {info.get('exchange', 'N/A')}")
    
    print(f"Downloading {ticker_symbol} data from {start_date} to {end_date}...")
    
    try:
        # Download data
        ticker = yf.Ticker(ticker_symbol)
        print("Downloading historical price data...")
        hist_data = ticker.history(start=start_date, end=end_date)
        
        if hist_data.empty:
            print(f"No data found for {ticker_symbol}!")
            return None
        
        print(f"Downloaded {len(hist_data)} days of data")
        print(f"Date range: {hist_data.index[0].strftime('%Y-%m-%d')} to {hist_data.index[-1].strftime('%Y-%m-%d')}")
        
        # Display basic info
        print(f"Available columns: {list(hist_data.columns)}")
        
        # Show first and last few rows
        print(f"\nFirst 5 rows of {ticker_symbol} data:")
        print(hist_data.head())
        print(f"\nLast 5 rows of {ticker_symbol} data:")
        print(hist_data.tail())
        
        # Check for dividends
        dividends = hist_data[hist_data['Dividends'] > 0]
        if not dividends.empty:
            print(f"\nDividends found ({len(dividends)} records):")
            print(dividends[['Close', 'Dividends']])
        else:
            print(f"\nNo dividends found for {ticker_symbol} in the specified period")
        
        # Check for stock splits
        splits = hist_data[hist_data['Stock Splits'] > 0]
        if not splits.empty:
            print(f"\nStock splits found ({len(splits)} records):")
            print(splits[['Close', 'Stock Splits']])
        else:
            print(f"\nNo stock splits found for {ticker_symbol} in the specified period")
        
        # Save data to CSV files
        output_dir = "data"
        os.makedirs(output_dir, exist_ok=True)
        
        # Save full historical data
        full_data_file = os.path.join(output_dir, f"{ticker_symbol}_full_data.csv")
        hist_data.to_csv(full_data_file)
        print(f"\nFull data saved to: {full_data_file}")
        
        # Save price data only
        price_data = hist_data[['Open', 'High', 'Low', 'Close', 'Volume']]
        price_data_file = os.path.join(output_dir, f"{ticker_symbol}_price_data.csv")
        price_data.to_csv(price_data_file)
        print(f"Price data saved to: {price_data_file}")
        
        # Save dividends only (if any)
        if not dividends.empty:
            dividends_file = os.path.join(output_dir, f"{ticker_symbol}_dividends.csv")
            dividends[['Close', 'Dividends']].to_csv(dividends_file)
            print(f"Dividends data saved to: {dividends_file}")
        
        # Display summary statistics
        print(f"\n{ticker_symbol} Summary Statistics:")
        print(price_data.describe())
        
        return hist_data
        
    except Exception as e:
        print(f"Error downloading data for {ticker_symbol}: {e}")
        return None

def clean_historical_data(hist_data):
    """
    Clean and prepare historical data for analysis.
    """
    if hist_data is None:
        return None
    
    # Create a copy to avoid modifying original
    hist_data_clean = hist_data.copy()
    
    # Convert index to date only (remove time component)
    hist_data_clean.index = pd.to_datetime(hist_data_clean.index.date)
    
    # Fill any missing values
    hist_data_clean = hist_data_clean.ffill()
    
    return hist_data_clean

def calculate_buy_hold_performance(hist_data, ticker_symbol, initial_capital=100000):
    """
    Calculate buy and hold performance including dividends with annualized returns.
    """
    if hist_data is None:
        return None
    
    hist_data_clean = clean_historical_data(hist_data)
    if hist_data_clean is None:
        return None
    
    first_price = hist_data_clean.iloc[0]['Open']
    last_price = hist_data_clean.iloc[-1]['Close']
    
    # Calculate shares that could be bought
    shares = int(initial_capital / first_price)
    
    # Calculate final stock value
    final_stock_value = shares * last_price
    
    # Calculate total dividends collected
    total_dividends = hist_data_clean['Dividends'].sum()
    dividend_income = shares * total_dividends
    
    # Calculate total value
    final_value = final_stock_value + dividend_income
    total_return = final_value - initial_capital
    return_percent = (total_return / initial_capital) * 100
    
    # Calculate annualized returns based on 251 trading days per year
    trading_days = len(hist_data_clean)
    years = trading_days / 251.0
    
    # Annualized return using compound growth formula: (final_value / initial_capital) ^ (1/years) - 1
    if years > 0:
        annualized_return_percent = (((final_value / initial_capital) ** (1/years)) - 1) * 100
    else:
        annualized_return_percent = 0.0
    
    return {
        'ticker': ticker_symbol,
        'initial_capital': initial_capital,
        'shares': shares,
        'first_price': first_price,
        'last_price': last_price,
        'final_stock_value': final_stock_value,
        'dividend_income': dividend_income,
        'final_value': final_value,
        'total_return': total_return,
        'return_percent': return_percent,
        'total_dividends_per_share': total_dividends,
        'trading_days': trading_days,
        'years': years,
        'annualized_return_percent': annualized_return_percent
    }

def download_multiple_tickers(tickers=None):
    """
    Download data for multiple tickers.
    """
    if tickers is None:
        tickers = list(TICKER_CONFIGS.keys())
    
    ticker_data = {}
    
    for ticker in tickers:
        print(f"\n{'='*60}")
        print(f"PROCESSING {ticker}")
        print(f"{'='*60}")
        
        hist_data = download_ticker_data(ticker)
        if hist_data is not None:
            ticker_data[ticker] = hist_data
        else:
            print(f"Failed to download data for {ticker}")
    
    return ticker_data

def add_new_ticker(ticker_symbol, start_date, name=None):
    """
    Add a new ticker to the configuration.
    """
    TICKER_CONFIGS[ticker_symbol] = {
        'start_date': start_date,
        'name': name or f'{ticker_symbol} Stock'
    }
    print(f"Added {ticker_symbol} to ticker configurations")

def detect_weekly_dividend_start(ticker_symbol):
    """
    Detect when dividends started being paid weekly for a ticker.
    Returns the start date for weekly dividend analysis.
    """
    try:
        # Download full history to analyze dividend patterns
        ticker = yf.Ticker(ticker_symbol)
        hist_data = ticker.history(period="max")
        
        if hist_data.empty:
            print(f"No historical data found for {ticker_symbol}")
            return None
        
        # Find all dividend payments
        dividends = hist_data[hist_data['Dividends'] > 0]
        
        if len(dividends) < 10:  # Need at least 10 dividends to detect pattern
            print(f"Insufficient dividend history for {ticker_symbol}")
            return None
        
        # Sort by date
        dividend_dates = dividends.index.sort_values()
        
        # Look for consistent weekly pattern (5-9 days between payments)
        weekly_start_date = None
        consecutive_weekly = 0
        
        for i in range(1, len(dividend_dates)):
            days_between = (dividend_dates[i] - dividend_dates[i-1]).days
            
            # Consider 5-9 days as weekly (accounting for weekends/holidays)
            if 5 <= days_between <= 9:
                consecutive_weekly += 1
                if consecutive_weekly >= 4:  # Need at least 4 consecutive weekly payments
                    # Go back to find the actual start of weekly pattern
                    weekly_start_date = dividend_dates[i-4]
                    break
            else:
                consecutive_weekly = 0
        
        if weekly_start_date:
            start_date_str = weekly_start_date.strftime('%Y-%m-%d')
            print(f"Detected weekly dividend pattern for {ticker_symbol} starting: {start_date_str}")
            return start_date_str
        else:
            print(f"No clear weekly dividend pattern found for {ticker_symbol}")
            return None
            
    except Exception as e:
        print(f"Error detecting weekly dividend start for {ticker_symbol}: {e}")
        return None

if __name__ == "__main__":
    # Test the multi-ticker data processor
    print("Testing Multi-Ticker Data Processor...")
    
    # Download data for all configured tickers
    ticker_data = download_multiple_tickers()
    
    print(f"\n{'='*60}")
    print("SUMMARY OF DOWNLOADED DATA")
    print(f"{'='*60}")
    
    for ticker, data in ticker_data.items():
        if data is not None:
            buy_hold = calculate_buy_hold_performance(data, ticker)
            if buy_hold:
                print(f"\n{ticker}:")
                print(f"  Trading Days: {buy_hold['trading_days']}")
                print(f"  Years: {buy_hold['years']:.2f}")
                print(f"  Buy & Hold Return: {buy_hold['return_percent']:.2f}%")
                print(f"  Annualized Return: {buy_hold['annualized_return_percent']:.2f}%")
                print(f"  Final Value: ${buy_hold['final_value']:,.2f}")
                print(f"  Total Dividends: ${buy_hold['total_dividends_per_share']:.3f} per share")
        else:
            print(f"\n{ticker}: Failed to download data")
    
    print(f"\nTotal tickers processed: {len(ticker_data)}")
    print("Data processor test complete!")
