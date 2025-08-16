#!/usr/bin/env python3
"""
YAST Backtesting System - Data Manager
Enhanced data loading, validation, and management for backtesting operations.
Integrates with existing YAST data pipeline without modifying original files.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import sys
from typing import Dict, List, Optional, Tuple, Union
import warnings

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from multi_ticker_data_processor import TICKER_CONFIGS

class YASTDataManager:
    """
    Enhanced data manager for YAST backtesting system.
    Provides standardized data loading, validation, and preparation.
    """
    
    def __init__(self, data_dir: str = None):
        """
        Initialize the data manager.
        
        Args:
            data_dir: Path to data directory. Defaults to '../data' relative to current location.
        """
        if data_dir is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            self.data_dir = os.path.join(os.path.dirname(os.path.dirname(current_dir)), 'data')
        else:
            self.data_dir = data_dir
            
        self.ticker_configs = TICKER_CONFIGS
        self._data_cache = {}
        
    def load_ticker_data(self, ticker: str, data_type: str = 'full') -> Optional[pd.DataFrame]:
        """
        Load data for a specific ticker.
        
        Args:
            ticker: ETF symbol (e.g., 'ULTY', 'YMAX')
            data_type: Type of data to load ('full', 'price', 'dividends')
            
        Returns:
            DataFrame with ticker data or None if not found
        """
        cache_key = f"{ticker}_{data_type}"
        
        if cache_key in self._data_cache:
            return self._data_cache[cache_key].copy()
            
        file_mapping = {
            'full': f"{ticker}_full_data.csv",
            'price': f"{ticker}_price_data.csv", 
            'dividends': f"{ticker}_dividends.csv"
        }
        
        if data_type not in file_mapping:
            raise ValueError(f"Invalid data_type: {data_type}. Must be one of {list(file_mapping.keys())}")
            
        file_path = os.path.join(self.data_dir, file_mapping[data_type])
        
        if not os.path.exists(file_path):
            warnings.warn(f"Data file not found for {ticker}: {file_path}")
            return None
            
        try:
            # Read CSV without parsing dates initially to handle timezones better
            df = pd.read_csv(file_path, index_col=0)
            
            if df.empty:
                warnings.warn(f"Empty data file for {ticker}")
                return None
            
            # Parse dates and handle timezones manually
            try:
                df.index = pd.to_datetime(df.index, utc=True).tz_localize(None)
            except:
                try:
                    df.index = pd.to_datetime(df.index)
                except:
                    warnings.warn(f"Could not parse dates for {ticker}")
                    return None
                
            df = self._standardize_data_format(df, data_type)
            
            self._data_cache[cache_key] = df.copy()
            return df
            
        except Exception as e:
            warnings.warn(f"Error loading data for {ticker}: {str(e)}")
            return None
    
    def _standardize_data_format(self, df: pd.DataFrame, data_type: str) -> pd.DataFrame:
        """
        Standardize data format for consistent processing.
        
        Args:
            df: Raw DataFrame
            data_type: Type of data being processed
            
        Returns:
            Standardized DataFrame
        """
        df_clean = df.copy()
        
        # Handle datetime index - normalize to date only
        if df_clean.index.dtype == 'object':
            df_clean.index = pd.to_datetime(df_clean.index)
        
        # Remove timezone if present
        if hasattr(df_clean.index, 'tz') and df_clean.index.tz is not None:
            df_clean.index = df_clean.index.tz_localize(None)
        
        # Convert to date only (remove time component)
        df_clean.index = df_clean.index.normalize()
        
        df_clean = df_clean.sort_index()
        
        df_clean = df_clean.ffill()
        
        numeric_columns = df_clean.select_dtypes(include=[np.number]).columns
        df_clean[numeric_columns] = df_clean[numeric_columns].fillna(0)
        
        if data_type == 'full' and 'Dividends' in df_clean.columns:
            df_clean['Dividends'] = df_clean['Dividends'].fillna(0)
            
        return df_clean
    
    def get_available_tickers(self) -> List[str]:
        """
        Get list of tickers with available data.
        
        Returns:
            List of ticker symbols
        """
        available_tickers = []
        
        for ticker in self.ticker_configs.keys():
            full_data_path = os.path.join(self.data_dir, f"{ticker}_full_data.csv")
            if os.path.exists(full_data_path):
                available_tickers.append(ticker)
                
        return sorted(available_tickers)
    
    def get_date_range(self, ticker: str) -> Tuple[datetime, datetime]:
        """
        Get the available date range for a ticker.
        
        Args:
            ticker: ETF symbol
            
        Returns:
            Tuple of (start_date, end_date)
        """
        df = self.load_ticker_data(ticker, 'full')
        if df is None or df.empty:
            return None, None
            
        return df.index.min(), df.index.max()
    
    def get_dividend_dates(self, ticker: str) -> pd.DataFrame:
        """
        Get dividend payment dates and amounts for a ticker.
        
        Args:
            ticker: ETF symbol
            
        Returns:
            DataFrame with Date and Dividends columns for dividend payments only
        """
        df = self.load_ticker_data(ticker, 'dividends')
        if df is None:
            return pd.DataFrame()
            
        dividend_dates = df[df['Dividends'] > 0].copy()
        return dividend_dates
    
    def validate_data_integrity(self, ticker: str) -> Dict[str, bool]:
        """
        Validate data integrity for a ticker.
        
        Args:
            ticker: ETF symbol
            
        Returns:
            Dictionary with validation results
        """
        results = {
            'has_full_data': False,
            'has_price_data': False, 
            'has_dividend_data': False,
            'data_consistency': False,
            'sufficient_history': False,
            'recent_data': False
        }
        
        full_data = self.load_ticker_data(ticker, 'full')
        price_data = self.load_ticker_data(ticker, 'price')
        dividend_data = self.load_ticker_data(ticker, 'dividends')
        
        results['has_full_data'] = full_data is not None and not full_data.empty
        results['has_price_data'] = price_data is not None and not price_data.empty
        results['has_dividend_data'] = dividend_data is not None and not dividend_data.empty
        
        if results['has_full_data'] and results['has_price_data']:
            results['data_consistency'] = len(full_data) == len(price_data)
        
        if results['has_full_data']:
            days_of_data = (full_data.index.max() - full_data.index.min()).days
            results['sufficient_history'] = days_of_data >= 30  # At least 30 days for backtesting
            
            days_since_last = (datetime.now() - full_data.index.max()).days
            results['recent_data'] = days_since_last <= 30  # Within last month
            
        return results
    
    def get_market_data(self, start_date: str = None, end_date: str = None) -> Dict[str, pd.DataFrame]:
        """
        Load market data (VIX, treasury rates) for regime identification.
        Note: This is a placeholder for future implementation.
        
        Args:
            start_date: Start date for market data
            end_date: End date for market data
            
        Returns:
            Dictionary with market data DataFrames
        """
        market_data = {}
        
        spy_path = os.path.join(self.data_dir, 'SPY_benchmark_data.csv')
        if os.path.exists(spy_path):
            try:
                spy_data = pd.read_csv(spy_path, index_col=0, parse_dates=True)
                spy_data = self._standardize_data_format(spy_data, 'full')
                
                if start_date:
                    spy_data = spy_data[spy_data.index >= start_date]
                if end_date:
                    spy_data = spy_data[spy_data.index <= end_date]
                    
                market_data['SPY'] = spy_data
            except Exception as e:
                warnings.warn(f"Error loading SPY benchmark data: {str(e)}")
        
        return market_data
    
    def calculate_45day_volatility(self, ticker: str, as_of_date: str = None) -> float:
        """
        Calculate 45-day annualized volatility for a ticker.
        
        Args:
            ticker: ETF symbol
            as_of_date: Date to calculate volatility as of (defaults to latest)
            
        Returns:
            Annualized volatility (decimal, e.g., 0.15 = 15%)
        """
        df = self.load_ticker_data(ticker, 'full')
        if df is None or df.empty:
            return None
            
        if as_of_date:
            as_of_date = pd.to_datetime(as_of_date)
            df = df[df.index <= as_of_date]
        
        if len(df) < 45:
            return None
            
        df_recent = df.tail(45).copy()
        
        df_recent.loc[:, 'Daily_Return'] = df_recent['Close'].pct_change()
        
        daily_vol = df_recent['Daily_Return'].std()
        
        annualized_vol = daily_vol * np.sqrt(252)
        
        return annualized_vol
    
    def get_correlation_matrix(self, tickers: List[str], lookback_days: int = 90) -> pd.DataFrame:
        """
        Calculate correlation matrix for a list of tickers.
        
        Args:
            tickers: List of ETF symbols
            lookback_days: Number of days to use for correlation calculation
            
        Returns:
            Correlation matrix DataFrame
        """
        returns_data = {}
        
        for ticker in tickers:
            df = self.load_ticker_data(ticker, 'full')
            if df is None or df.empty:
                continue
                
            if len(df) < lookback_days:
                continue
                
            df_recent = df.tail(lookback_days)
            daily_returns = df_recent['Close'].pct_change().dropna()
            
            if len(daily_returns) > 0:
                returns_data[ticker] = daily_returns
        
        if not returns_data:
            return pd.DataFrame()
            
        returns_df = pd.DataFrame(returns_data)
        
        returns_df = returns_df.dropna()
        
        correlation_matrix = returns_df.corr()
        
        return correlation_matrix
    
    def clear_cache(self):
        """Clear the data cache to free memory."""
        self._data_cache.clear()
    
    def get_data_summary(self) -> pd.DataFrame:
        """
        Get a summary of available data for all tickers.
        
        Returns:
            DataFrame with ticker information and data status
        """
        summary_data = []
        
        for ticker in self.get_available_tickers():
            start_date, end_date = self.get_date_range(ticker)
            validation = self.validate_data_integrity(ticker)
            volatility = self.calculate_45day_volatility(ticker)
            dividend_count = len(self.get_dividend_dates(ticker))
            
            summary_data.append({
                'Ticker': ticker,
                'Name': self.ticker_configs.get(ticker, {}).get('name', 'Unknown'),
                'Start_Date': start_date,
                'End_Date': end_date,
                'Days_Available': (end_date - start_date).days if start_date and end_date else 0,
                'Dividend_Count': dividend_count,
                'Current_45Day_Vol': volatility,
                'Data_Valid': all([
                    validation['has_full_data'],
                    validation['has_dividend_data'],
                    validation['sufficient_history']
                ])
            })
        
        return pd.DataFrame(summary_data)