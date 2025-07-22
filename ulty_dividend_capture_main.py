#!/usr/bin/env python3
"""
ULTY Dividend Capture Module
Advanced dividend capture strategies including best timing optimization.
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

def backtest_best_dividend_capture_strategy(hist_data, initial_capital=100000):
    """
    Backtest the best dividend capture strategy: Buy dd+4 open, sell dd open + collect dividend.
    """
    if hist_data is None:
        return None
    
    print("\n" + "=" * 60)
    print("BEST DIVIDEND CAPTURE STRATEGY BACKTEST")
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
    print(f"Strategy: Buy at dd+4 open, sell at dd open + collect dividend")
    print("\nTrade-by-Trade Results:")
    print("-" * 110)
    print("Week  Div Date    Buy Date    Sell Date   Buy Price  Sell Price  Dividend  Shares    P&L        P&L%     Portfolio")
    print("-" * 110)
    
    # Get dividend dates as list
    dividend_dates = [pd.to_datetime(date.date()) for date in dividends.index]
    all_dates = hist_data_clean.index.tolist()
    
    # Skip first dividend (no previous dd+4 to buy from)
    for i in range(1, len(dividend_dates)):
        current_div_date = dividend_dates[i]
        prev_div_date = dividend_dates[i-1]
        
        try:
            # Find positions in the data
            prev_div_position = all_dates.index(prev_div_date)
            current_div_position = all_dates.index(current_div_date)
            
            # Check if we have dd+4 from previous dividend
            if prev_div_position + 4 >= len(all_dates):
                continue
            
            # Get buy and sell dates and prices
            buy_date = all_dates[prev_div_position + 4]  # dd+4 from previous dividend
            sell_date = current_div_date  # current dividend date
            
            buy_price = hist_data_clean.loc[buy_date, 'Open']
            sell_price = hist_data_clean.loc[sell_date, 'Open']
            dividend_amount = hist_data_clean.loc[sell_date, 'Dividends']
            
            # Calculate number of shares to buy
            shares = int(portfolio_value / buy_price)
            
            # Calculate trade P&L (including dividend)
            trade_cost = shares * buy_price
            trade_value = shares * sell_price
            dividend_income = shares * dividend_amount
            total_trade_value = trade_value + dividend_income
            trade_pnl = total_trade_value - trade_cost
            trade_pnl_percent = (trade_pnl / trade_cost) * 100
            
            # Update portfolio
            portfolio_value = portfolio_value - trade_cost + total_trade_value
            
            # Track wins/losses
            total_trades += 1
            if trade_pnl > 0:
                winning_trades += 1
            else:
                losing_trades += 1
            
            # Record trade
            trade_results.append({
                'week': i,
                'div_date': current_div_date,
                'buy_date': buy_date,
                'sell_date': sell_date,
                'buy_price': buy_price,
                'sell_price': sell_price,
                'dividend': dividend_amount,
                'shares': shares,
                'trade_pnl': trade_pnl,
                'trade_pnl_percent': trade_pnl_percent,
                'portfolio_value': portfolio_value,
                'dividend_income': dividend_income
            })
            
            print(f"  {i:2d}  {current_div_date.strftime('%Y-%m-%d')}  {buy_date.strftime('%Y-%m-%d')}  {sell_date.strftime('%Y-%m-%d')}  $   {buy_price:.3f}  $   {sell_price:.3f}  $  {dividend_amount:.3f}  {shares:6d}  ${trade_pnl:8.2f}  {trade_pnl_percent:+6.2f}%  ${portfolio_value:10,.2f}")
            
        except (ValueError, KeyError) as e:
            continue
    
    if not trade_results:
        print("No trades executed")
        return None
    
    # Calculate performance metrics
    print("\n" + "=" * 60)
    print("BEST DIVIDEND CAPTURE BACKTEST SUMMARY")
    print("=" * 60)
    
    total_return = portfolio_value - initial_capital
    total_return_percent = (total_return / initial_capital) * 100
    win_rate = (winning_trades / total_trades) * 100
    avg_trade_pnl = np.mean([t['trade_pnl'] for t in trade_results])
    avg_trade_pnl_percent = np.mean([t['trade_pnl_percent'] for t in trade_results])
    
    # Calculate dividend contribution
    total_dividend_income = sum(t['dividend_income'] for t in trade_results)
    total_price_gains = total_return - total_dividend_income
    dividend_percent_of_return = (total_dividend_income / total_return) * 100 if total_return > 0 else 0
    
    print(f"Initial Capital:        ${initial_capital:,.2f}")
    print(f"Final Portfolio Value:  ${portfolio_value:,.2f}")
    print(f"Total Return:           ${total_return:,.2f}")
    print(f"Total Return %:         {total_return_percent:+.2f}%")
    print(f"Total Dividend Income:  ${total_dividend_income:,.2f}")
    print(f"Total Price Gains:      ${total_price_gains:,.2f}")
    print(f"Dividend % of Return:   {dividend_percent_of_return:.1f}%")
    print(f"")
    print(f"Total Trades:           {total_trades}")
    print(f"Winning Trades:         {winning_trades}")
    print(f"Losing Trades:          {losing_trades}")
    print(f"Win Rate:               {win_rate:.1f}%")
    print(f"")
    print(f"Average Trade P&L:      ${avg_trade_pnl:,.2f}")
    print(f"Average Trade P&L %:    {avg_trade_pnl_percent:+.2f}%")
    
    # Calculate best and worst trades
    best_trade = max(trade_results, key=lambda x: x['trade_pnl_percent'])
    worst_trade = min(trade_results, key=lambda x: x['trade_pnl_percent'])
    
    print(f"")
    print(f"Best Trade:             {best_trade['trade_pnl_percent']:+.2f}% (Week {best_trade['week']})")
    print(f"Worst Trade:            {worst_trade['trade_pnl_percent']:+.2f}% (Week {worst_trade['week']})")
    
    # Calculate some additional metrics
    weekly_returns = [t['trade_pnl_percent'] for t in trade_results]
    volatility = np.std(weekly_returns)
    
    # Approximate annualized metrics (52 weeks per year)
    weeks_in_data = len(trade_results)
    weeks_per_year = 52
    annualized_return = ((portfolio_value / initial_capital) ** (weeks_per_year / weeks_in_data) - 1) * 100
    annualized_volatility = volatility * np.sqrt(weeks_per_year)
    
    if annualized_volatility > 0:
        sharpe_ratio = (annualized_return - 2) / annualized_volatility  # Assuming 2% risk-free rate
    else:
        sharpe_ratio = 0
    
    print(f"")
    print(f"Volatility (weekly):    {volatility:.2f}%")
    print(f"Annualized Return:      {annualized_return:+.2f}%")
    print(f"Annualized Volatility:  {annualized_volatility:.2f}%")
    print(f"Sharpe Ratio:           {sharpe_ratio:.2f}")
    
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
    
    print(f"Maximum Drawdown:       {max_drawdown*100:.2f}%")
    
    return trade_results

def analyze_market_exposure(hist_data, div_capture_results, initial_capital=100000):
    """
    Analyze market exposure efficiency of dividend capture vs buy & hold.
    """
    if hist_data is None or div_capture_results is None:
        return None
    
    print("\n" + "=" * 60)
    print("MARKET EXPOSURE ANALYSIS")
    print("=" * 60)
    
    hist_data_clean = clean_historical_data(hist_data)
    if hist_data_clean is None:
        return None
    
    # Calculate buy & hold performance
    first_price = hist_data_clean.iloc[0]['Open']
    last_price = hist_data_clean.iloc[-1]['Close']
    total_dividends = hist_data_clean['Dividends'].sum()
    
    buy_hold_shares = int(initial_capital / first_price)
    buy_hold_stock_value = buy_hold_shares * last_price
    buy_hold_dividend_income = buy_hold_shares * total_dividends
    buy_hold_final_value = buy_hold_stock_value + buy_hold_dividend_income
    buy_hold_return_percent = ((buy_hold_final_value - initial_capital) / initial_capital) * 100
    
    # Calculate market exposure
    total_trading_days = len(hist_data_clean)
    div_capture_days_in_market = len(div_capture_results) * 2  # 2 days per trade
    
    div_capture_final_value = div_capture_results[-1]['portfolio_value']
    div_capture_return_percent = ((div_capture_final_value - initial_capital) / initial_capital) * 100
    
    # Calculate efficiency metrics
    buy_hold_return_per_day = buy_hold_return_percent / total_trading_days
    div_capture_return_per_day = div_capture_return_percent / div_capture_days_in_market
    
    efficiency_ratio = div_capture_return_per_day / buy_hold_return_per_day
    
    print(f"Market Exposure:")
    print(f"  Buy & Hold:            {total_trading_days} days ({100.0:.1f}% of time)")
    print(f"  Best Div Capture:      {div_capture_days_in_market} days ({div_capture_days_in_market/total_trading_days*100:.1f}% of time)")
    print(f"")
    print(f"Return Efficiency:")
    print(f"  Buy & Hold:           {buy_hold_return_per_day:.3f}% per day")
    print(f"  Best Div Capture:     {div_capture_return_per_day:.3f}% per day")
    print(f"")
    print(f"Key Insight:")
    print(f"  Dividend Capture is {efficiency_ratio:.1f}x more efficient per day of market exposure")
    print(f"  Captures {div_capture_return_percent/buy_hold_return_percent*100:.1f}% of buy & hold returns")
    print(f"  With only {div_capture_days_in_market/total_trading_days*100:.1f}% of the market exposure time")
    print(f"  Protected from market volatility {100 - div_capture_days_in_market/total_trading_days*100:.1f}% of the time")
    
    return {
        'buy_hold_return_percent': buy_hold_return_percent,
        'div_capture_return_percent': div_capture_return_percent,
        'total_trading_days': total_trading_days,
        'div_capture_days_in_market': div_capture_days_in_market,
        'efficiency_ratio': efficiency_ratio,
        'buy_hold_final_value': buy_hold_final_value,
        'div_capture_final_value': div_capture_final_value
    }

if __name__ == "__main__":
    # Test the dividend capture module
    print("Testing Dividend Capture Module...")
    
    # Would normally import from the data processor
    import sys
    sys.path.append('.')
    
    try:
        from multi_ticker_data_processor import download_ticker_data
        hist_data = download_ticker_data('ULTY')
        
        if hist_data is not None:
            print("\nTesting Best Dividend Capture Strategy...")
            div_results = backtest_best_dividend_capture_strategy(hist_data)
            
            if div_results:
                print("\nAnalyzing Market Exposure...")
                exposure_analysis = analyze_market_exposure(hist_data, div_results)
                
                if exposure_analysis:
                    print(f"\nEfficiency Ratio: {exposure_analysis['efficiency_ratio']:.2f}x")
            else:
                print("No dividend capture results")
    except ImportError:
        print("Could not import data processor - run as part of main script")
