#!/usr/bin/env python3
"""
ULTY Trading Strategies Module
Implementation of various dividend capture and swing trading strategies.
"""

import pandas as pd
import numpy as np
from datetime import datetime
import os

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

def backtest_weekly_strategy(hist_data, initial_capital=100000):
    """
    Backtest DD to DD+4 strategy (buy dividend day, sell 4 days later).
    """
    if hist_data is None:
        return None
    
    print("\n" + "=" * 60)
    print("DD TO DD+4 TRADING STRATEGY BACKTEST")
    print("=" * 60)
    
    hist_data_clean = clean_historical_data(hist_data)
    if hist_data_clean is None:
        return None
    
    # Find dividend payments
    dividends = hist_data_clean[hist_data_clean['Dividends'] > 0]
    
    if dividends.empty:
        print("No dividend payments found")
        return None
    
    portfolio_value = initial_capital
    total_trades = 0
    winning_trades = 0
    losing_trades = 0
    trade_results = []
    
    print(f"Starting Capital: ${initial_capital:,.2f}")
    print(f"Strategy: Buy at dd open, sell at dd+4 close")
    print("\nTrade-by-Trade Results:")
    print("-" * 110)
    print("Week  Div Date    Buy Price  Sell Price  Shares    P&L        P&L%     Portfolio")
    print("-" * 110)
    
    # Get dividend dates and all trading dates
    dividend_dates = [pd.to_datetime(date.date()) for date in dividends.index]
    all_dates = hist_data_clean.index.tolist()
    
    for i, div_date in enumerate(dividend_dates, 1):
        try:
            # Find position of dividend date
            div_position = all_dates.index(div_date)
            
            # Check if we have dd+4 data
            if div_position + 4 >= len(all_dates):
                continue
            
            # Get buy and sell dates
            buy_date = div_date  # Buy on dividend day
            sell_date = all_dates[div_position + 4]  # Sell 4 days later
            
            # Get prices
            buy_price = hist_data_clean.loc[buy_date, 'Open']
            sell_price = hist_data_clean.loc[sell_date, 'Close']
            
            # Calculate trade
            shares = int(portfolio_value / buy_price)
            trade_cost = shares * buy_price
            trade_proceeds = shares * sell_price
            trade_pnl = trade_proceeds - trade_cost
            trade_pnl_percent = (trade_pnl / trade_cost) * 100
            
            # Update portfolio
            portfolio_value = portfolio_value - trade_cost + trade_proceeds
            
            # Track statistics
            total_trades += 1
            if trade_pnl > 0:
                winning_trades += 1
            else:
                losing_trades += 1
            
            # Store trade result
            trade_results.append({
                'week': i,
                'div_date': div_date,
                'buy_price': buy_price,
                'sell_price': sell_price,
                'shares': shares,
                'trade_pnl': trade_pnl,
                'trade_pnl_percent': trade_pnl_percent,
                'portfolio_value': portfolio_value
            })
            
            print(f"  {i:2d}  {div_date.strftime('%Y-%m-%d')}  $   {buy_price:.3f}  $   {sell_price:.3f}  {shares:6d}  $ {trade_pnl:8.2f}  {trade_pnl_percent:+6.2f}%  ${portfolio_value:10,.2f}")
            
        except (ValueError, KeyError):
            continue
    
    if not trade_results:
        print("No trades executed")
        return None
    
    # Calculate performance metrics
    print("\n" + "=" * 60)
    print("DD TO DD+4 BACKTEST SUMMARY")
    print("=" * 60)
    
    calculate_and_print_metrics(trade_results, initial_capital, portfolio_value)
    
    return trade_results

def backtest_dd2_to_dd4_strategy(hist_data, initial_capital=100000):
    """
    Backtest DD+2 to DD+4 strategy (buy 2 days after dividend, sell 4 days after).
    """
    if hist_data is None:
        return None
    
    print("\n" + "=" * 60)
    print("DD+2 TO DD+4 TRADING STRATEGY BACKTEST")
    print("=" * 60)
    
    hist_data_clean = clean_historical_data(hist_data)
    if hist_data_clean is None:
        return None
    
    # Find dividend payments
    dividends = hist_data_clean[hist_data_clean['Dividends'] > 0]
    
    if dividends.empty:
        print("No dividend payments found")
        return None
    
    portfolio_value = initial_capital
    total_trades = 0
    winning_trades = 0
    losing_trades = 0
    trade_results = []
    
    print(f"Starting Capital: ${initial_capital:,.2f}")
    print(f"Strategy: Buy at dd+2 open, sell at dd+4 close")
    print("\nTrade-by-Trade Results:")
    print("-" * 110)
    print("Week  Div Date    Buy Price  Sell Price  Shares    P&L        P&L%     Portfolio")
    print("-" * 110)
    
    # Get dividend dates and all trading dates
    dividend_dates = [pd.to_datetime(date.date()) for date in dividends.index]
    all_dates = hist_data_clean.index.tolist()
    
    for i, div_date in enumerate(dividend_dates, 1):
        try:
            # Find position of dividend date
            div_position = all_dates.index(div_date)
            
            # Check if we have dd+2 and dd+4 data
            if div_position + 4 >= len(all_dates):
                continue
            
            # Get buy and sell dates
            buy_date = all_dates[div_position + 2]  # Buy 2 days after dividend
            sell_date = all_dates[div_position + 4]  # Sell 4 days after dividend
            
            # Get prices
            buy_price = hist_data_clean.loc[buy_date, 'Open']
            sell_price = hist_data_clean.loc[sell_date, 'Close']
            
            # Calculate trade
            shares = int(portfolio_value / buy_price)
            trade_cost = shares * buy_price
            trade_proceeds = shares * sell_price
            trade_pnl = trade_proceeds - trade_cost
            trade_pnl_percent = (trade_pnl / trade_cost) * 100
            
            # Update portfolio
            portfolio_value = portfolio_value - trade_cost + trade_proceeds
            
            # Track statistics
            total_trades += 1
            if trade_pnl > 0:
                winning_trades += 1
            else:
                losing_trades += 1
            
            # Store trade result
            trade_results.append({
                'week': i,
                'div_date': div_date,
                'buy_price': buy_price,
                'sell_price': sell_price,
                'shares': shares,
                'trade_pnl': trade_pnl,
                'trade_pnl_percent': trade_pnl_percent,
                'portfolio_value': portfolio_value
            })
            
            print(f"  {i:2d}  {div_date.strftime('%Y-%m-%d')}  $   {buy_price:.3f}  $   {sell_price:.3f}  {shares:6d}  $ {trade_pnl:8.2f}  {trade_pnl_percent:+6.2f}%  ${portfolio_value:10,.2f}")
            
        except (ValueError, KeyError):
            continue
    
    if not trade_results:
        print("No trades executed")
        return None
    
    # Calculate performance metrics
    print("\n" + "=" * 60)
    print("DD+2 TO DD+4 BACKTEST SUMMARY")
    print("=" * 60)
    
    calculate_and_print_metrics(trade_results, initial_capital, portfolio_value)
    
    return trade_results

def calculate_and_print_metrics(trade_results, initial_capital, portfolio_value):
    """
    Calculate and print performance metrics for a trading strategy.
    """
    total_return = portfolio_value - initial_capital
    total_return_percent = (total_return / initial_capital) * 100
    
    total_trades = len(trade_results)
    winning_trades = sum(1 for t in trade_results if t['trade_pnl'] > 0)
    losing_trades = total_trades - winning_trades
    win_rate = (winning_trades / total_trades) * 100 if total_trades > 0 else 0
    
    avg_trade_pnl = np.mean([t['trade_pnl'] for t in trade_results])
    avg_trade_pnl_percent = np.mean([t['trade_pnl_percent'] for t in trade_results])
    
    best_trade = max(trade_results, key=lambda x: x['trade_pnl_percent'])
    worst_trade = min(trade_results, key=lambda x: x['trade_pnl_percent'])
    
    # Calculate volatility
    weekly_returns = [t['trade_pnl_percent'] for t in trade_results]
    volatility = np.std(weekly_returns)
    
    # Calculate annualized metrics
    weeks_in_data = len(trade_results)
    weeks_per_year = 52
    annualized_return = ((portfolio_value / initial_capital) ** (weeks_per_year / weeks_in_data) - 1) * 100
    annualized_volatility = volatility * np.sqrt(weeks_per_year)
    
    if annualized_volatility > 0:
        sharpe_ratio = (annualized_return - 2) / annualized_volatility  # Assuming 2% risk-free rate
    else:
        sharpe_ratio = 0
    
    # Calculate maximum drawdown
    portfolio_values = [initial_capital] + [t['portfolio_value'] for t in trade_results]
    peak_value = initial_capital
    max_drawdown = 0
    
    for value in portfolio_values:
        if value > peak_value:
            peak_value = value
        drawdown = (peak_value - value) / peak_value
        if drawdown > max_drawdown:
            max_drawdown = drawdown
    
    print(f"Initial Capital:        ${initial_capital:,.2f}")
    print(f"Final Portfolio Value:  ${portfolio_value:,.2f}")
    print(f"Total Return:           ${total_return:,.2f}")
    print(f"Total Return %:         {total_return_percent:+.2f}%")
    print(f"Total Trades:           {total_trades}")
    print(f"Winning Trades:         {winning_trades}")
    print(f"Losing Trades:          {losing_trades}")
    print(f"Win Rate:               {win_rate:.1f}%")
    print(f"Average Trade P&L:      ${avg_trade_pnl:,.2f}")
    print(f"Average Trade P&L %:    {avg_trade_pnl_percent:+.2f}%")
    print(f"Best Trade:             {best_trade['trade_pnl_percent']:+.2f}% (Week {best_trade['week']})")
    print(f"Worst Trade:            {worst_trade['trade_pnl_percent']:+.2f}% (Week {worst_trade['week']})")
    print(f"Volatility (weekly):    {volatility:.2f}%")
    print(f"Annualized Return:      {annualized_return:+.2f}%")
    print(f"Annualized Volatility:  {annualized_volatility:.2f}%")
    print(f"Sharpe Ratio:           {sharpe_ratio:.2f}")
    print(f"Maximum Drawdown:       {max_drawdown*100:.2f}%")

if __name__ == "__main__":
    # Test the trading strategies module
    print("Testing Trading Strategies Module...")
    
    # Would normally import from the data processor
    import sys
    sys.path.append('.')
    
    try:
        from multi_ticker_data_processor import download_ticker_data
        hist_data = download_ticker_data('ULTY')
        
        if hist_data is not None:
            print("\nTesting DD to DD+4 Strategy...")
            dd_results = backtest_weekly_strategy(hist_data)
            
            print("\nTesting DD+2 to DD+4 Strategy...")
            dd2_results = backtest_dd2_to_dd4_strategy(hist_data)
            
            if dd_results and dd2_results:
                print(f"\nDD to DD+4 final return: {((dd_results[-1]['portfolio_value'] - 100000) / 100000) * 100:.2f}%")
                print(f"DD+2 to DD+4 final return: {((dd2_results[-1]['portfolio_value'] - 100000) / 100000) * 100:.2f}%")
    except ImportError:
        print("Could not import data processor - run as part of main script")
