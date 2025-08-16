#!/usr/bin/env python3
"""
Detailed explanation of how returns are calculated in the YAST backtesting system
"""

import pandas as pd
import numpy as np
from yast_backtesting.core import (
    YASTDataManager, 
    YASTStrategyEngine, 
    StrategyType
)

def explain_return_calculation():
    """Show detailed return calculation for each strategy."""
    
    print("=" * 80)
    print("HOW RETURNS ARE CALCULATED IN YAST BACKTESTING")
    print("=" * 80)
    
    # Initialize
    data_manager = YASTDataManager()
    strategy_engine = YASTStrategyEngine(initial_capital=100000)
    
    # Use AAPW as example
    ticker = 'AAPW'
    data = data_manager.load_ticker_data(ticker, 'full')
    
    print(f"\nExample using {ticker}")
    print(f"Initial Capital: ${strategy_engine.initial_capital:,.2f}")
    print(f"Data Period: {data.index[0].strftime('%Y-%m-%d')} to {data.index[-1].strftime('%Y-%m-%d')}")
    print(f"Total Trading Days: {len(data)}")
    print(f"Total Dividends: {len(data[data['Dividends'] > 0])}")
    
    # Test each strategy
    for strategy_type in [StrategyType.BUY_HOLD, StrategyType.DIVIDEND_CAPTURE, StrategyType.CUSTOM_DIVIDEND]:
        print(f"\n" + "=" * 80)
        print(f"{strategy_type.value.upper()}")
        print("=" * 80)
        
        result = strategy_engine.backtest_strategy(strategy_type, data, ticker)
        
        print(f"\n1. CAPITAL FLOW:")
        print(f"   Initial Capital: ${result.initial_capital:,.2f}")
        print(f"   Final Capital:   ${result.final_capital:,.2f}")
        print(f"   Net Profit/Loss: ${result.total_return:,.2f}")
        
        print(f"\n2. RETURN CALCULATION:")
        print(f"   Formula: (Final Capital / Initial Capital - 1) * 100")
        print(f"   Calculation: (${result.final_capital:,.2f} / ${result.initial_capital:,.2f} - 1) * 100")
        print(f"   Result: {result.total_return_pct:.4f} = {result.total_return_pct * 100:.2f}%")
        
        print(f"\n3. TRADE BREAKDOWN:")
        print(f"   Total Trades: {result.num_trades}")
        
        if result.trades:
            # Show first few trades
            for i, trade in enumerate(result.trades[:3]):
                print(f"\n   Trade {i+1}:")
                print(f"     Entry: {trade.entry_date.strftime('%Y-%m-%d')} @ ${trade.entry_price:.2f}")
                print(f"     Exit:  {trade.exit_date.strftime('%Y-%m-%d')} @ ${trade.exit_price:.2f}")
                print(f"     Shares: {trade.shares}")
                
                # Calculate trade components
                capital_invested = trade.entry_price * trade.shares
                capital_returned = trade.exit_price * trade.shares
                price_change = capital_returned - capital_invested
                
                print(f"     Capital Invested: ${capital_invested:,.2f}")
                print(f"     Capital Returned: ${capital_returned:,.2f}")
                print(f"     Price Change: ${price_change:,.2f}")
                print(f"     Dividends Collected: ${trade.dividend_amount:,.2f}")
                print(f"     Transaction Costs: ${trade.transaction_cost:,.2f}")
                print(f"     Net Profit/Loss: ${trade.total_return:,.2f}")
                print(f"     Return %: {trade.return_pct * 100:.2f}%")
            
            if len(result.trades) > 3:
                print(f"\n   ... and {len(result.trades) - 3} more trades")
        
        # Show portfolio value over time
        print(f"\n4. PORTFOLIO VALUE PROGRESSION:")
        portfolio_values = result.daily_portfolio_value
        
        # Show key points
        print(f"   Start Value: ${portfolio_values.iloc[0]:,.2f}")
        print(f"   Min Value:   ${portfolio_values.min():,.2f} (on {portfolio_values.idxmin().strftime('%Y-%m-%d')})")
        print(f"   Max Value:   ${portfolio_values.max():,.2f} (on {portfolio_values.idxmax().strftime('%Y-%m-%d')})")
        print(f"   End Value:   ${portfolio_values.iloc[-1]:,.2f}")
        
        # Calculate components
        print(f"\n5. RETURN COMPONENTS:")
        
        if result.trades:
            total_dividends = sum(trade.dividend_amount for trade in result.trades)
            total_price_changes = sum((trade.exit_price - trade.entry_price) * trade.shares for trade in result.trades)
            total_costs = sum(trade.transaction_cost for trade in result.trades)
            
            print(f"   Total Dividends Collected: ${total_dividends:,.2f}")
            print(f"   Total Price Changes:       ${total_price_changes:,.2f}")
            print(f"   Total Transaction Costs:   ${total_costs:,.2f}")
            print(f"   Net Result:                ${total_dividends + total_price_changes - total_costs:,.2f}")
            
            # Show percentage breakdown
            if result.total_return != 0:
                dividend_contribution = (total_dividends / abs(result.total_return)) * 100
                price_contribution = (total_price_changes / abs(result.total_return)) * 100
                cost_impact = (total_costs / abs(result.total_return)) * 100
                
                print(f"\n   Contribution to Return:")
                print(f"     Dividends:     {dividend_contribution:.1f}%")
                print(f"     Price Changes: {price_contribution:.1f}%")
                print(f"     Costs Impact:  -{cost_impact:.1f}%")
    
    print("\n" + "=" * 80)
    print("KEY POINTS:")
    print("=" * 80)
    print("""
1. TOTAL RETURN = (Final Capital / Initial Capital - 1) * 100%
   
2. Final Capital includes:
   - Initial investment
   - All price gains/losses from trades
   - All dividends collected
   - All transaction costs (currently set to $0)
   
3. Each strategy calculates returns the same way, but:
   - Buy & Hold: One trade (buy at start, sell at end)
   - Dividend Capture: Multiple trades around ex-dividend dates
   - Custom Strategy: Partial positions with conditional entries
   
4. Returns are NOT annualized in the total_return_pct field
   - The performance analyzer calculates annualized returns separately
   
5. All dividends are automatically reinvested (added to cash balance)
""")

if __name__ == "__main__":
    explain_return_calculation()