#!/usr/bin/env python3
"""
Low volatility strategy focus - identify best stable performers
"""

import pandas as pd
import numpy as np
import json
import os
from datetime import datetime
from yast_backtesting.core import (
    YASTDataManager,
    YASTStrategyEngine,
    StrategyType,
    YASTPerformanceAnalyzer
)
import warnings
warnings.filterwarnings('ignore')

# Volatility thresholds with hysteresis to prevent flapping
VOL_ENTRY_THRESHOLD = 0.30  # 30% - threshold to enter (new positions)
VOL_EXIT_THRESHOLD = 0.25   # 25% - threshold to exit (existing positions)
POSITION_STATE_FILE = 'data/low_vol_position_state.json'

def load_position_state():
    """Load the current state of active positions from file."""
    if not os.path.exists(POSITION_STATE_FILE):
        return {}

    try:
        with open(POSITION_STATE_FILE, 'r') as f:
            state = json.load(f)
            return state.get('active_positions', {})
    except Exception as e:
        print(f"Warning: Could not load position state: {e}")
        return {}

def save_position_state(active_positions):
    """Save the current state of active positions to file."""
    try:
        os.makedirs(os.path.dirname(POSITION_STATE_FILE), exist_ok=True)
        state = {
            'active_positions': active_positions,
            'last_updated': datetime.now().isoformat()
        }
        with open(POSITION_STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"Warning: Could not save position state: {e}")

def should_include_ticker(ticker, volatility, active_positions):
    """
    Determine if a ticker should be included using hysteresis.

    Args:
        ticker: Ticker symbol
        volatility: Current volatility (as decimal, e.g., 0.28 for 28%)
        active_positions: Dict of currently active positions

    Returns:
        bool: True if ticker should be included
    """
    is_active = ticker in active_positions

    if is_active:
        # For active positions, only exit if volatility rises above exit threshold
        # This means we stay in until volatility goes ABOVE 25%
        return volatility <= VOL_EXIT_THRESHOLD
    else:
        # For new positions, only enter if volatility is below entry threshold
        return volatility <= VOL_ENTRY_THRESHOLD

def calculate_risk_adjusted_metrics(data):
    """Calculate comprehensive risk-adjusted performance metrics."""
    prices = data['Close']
    returns = prices.pct_change().dropna()
    
    # Basic metrics
    total_return = (prices.iloc[-1] / prices.iloc[0]) - 1
    volatility = returns.std() * np.sqrt(252)
    
    # Drawdown metrics
    rolling_max = prices.expanding().max()
    drawdown = (prices - rolling_max) / rolling_max
    max_drawdown = drawdown.min()
    
    # Consistency metrics
    positive_months = 0
    negative_months = 0
    
    try:
        monthly_returns = returns.resample('ME').apply(lambda x: (1 + x).prod() - 1)
        positive_months = (monthly_returns > 0).sum()
        negative_months = (monthly_returns < 0).sum()
    except:
        monthly_returns = pd.Series()
    
    # Sharpe-like ratio (assuming 0% risk-free rate)
    sharpe = total_return / volatility if volatility > 0 else 0
    
    # Sortino ratio (downside deviation)
    downside_returns = returns[returns < 0]
    downside_std = downside_returns.std() * np.sqrt(252) if len(downside_returns) > 0 else volatility
    sortino = total_return / downside_std if downside_std > 0 else 0
    
    # Calmar ratio (return/max drawdown)
    calmar = total_return / abs(max_drawdown) if max_drawdown < 0 else 0
    
    # Stability score (custom metric favoring consistent, low-vol returns)
    consistency_score = positive_months / (positive_months + negative_months) if (positive_months + negative_months) > 0 else 0.5
    stability_score = (total_return * consistency_score) / volatility if volatility > 0 else 0
    
    return {
        'total_return': total_return,
        'volatility': volatility,
        'max_drawdown': max_drawdown,
        'sharpe': sharpe,
        'sortino': sortino,
        'calmar': calmar,
        'consistency_score': consistency_score,
        'stability_score': stability_score,
        'positive_months': positive_months,
        'negative_months': negative_months
    }

def analyze_low_volatility_candidates():
    """Identify and analyze the best low-volatility candidates."""

    data_manager = YASTDataManager()
    strategy_engine = YASTStrategyEngine()
    performance_analyzer = YASTPerformanceAnalyzer()

    all_tickers = data_manager.get_available_tickers()
    candidates = []

    # Load current position state for hysteresis
    active_positions = load_position_state()
    new_active_positions = {}

    print("Low Volatility Strategy Analysis")
    print("=" * 50)
    print(f"Entry threshold: {VOL_ENTRY_THRESHOLD*100:.0f}% | Exit threshold: {VOL_EXIT_THRESHOLD*100:.0f}%")
    print(f"Currently tracking {len(active_positions)} active positions")
    print("=" * 50)

    for ticker in all_tickers:
        try:
            data = data_manager.load_ticker_data(ticker, 'full')
            if data is None or len(data) < 30:
                continue

            # Calculate risk metrics
            risk_metrics = calculate_risk_adjusted_metrics(data)

            # Apply hysteresis: use different thresholds for entry vs exit
            if not should_include_ticker(ticker, risk_metrics['volatility'], active_positions):
                # Log why we're excluding
                if ticker in active_positions:
                    print(f"  EXIT {ticker}: volatility {risk_metrics['volatility']*100:.1f}% > {VOL_EXIT_THRESHOLD*100:.0f}% exit threshold")
                continue

            # If we get here, ticker passes hysteresis check
            is_new = ticker not in active_positions
            if is_new:
                print(f"  ENTRY {ticker}: volatility {risk_metrics['volatility']*100:.1f}% <= {VOL_ENTRY_THRESHOLD*100:.0f}% entry threshold")

            # Mark as active for next run
            new_active_positions[ticker] = {
                'volatility': risk_metrics['volatility'],
                'added_date': active_positions.get(ticker, {}).get('added_date', datetime.now().isoformat())
            }
            
            # Test custom dividend strategy (safest)
            try:
                result = strategy_engine.backtest_strategy(StrategyType.CUSTOM_DIVIDEND, data, ticker)
                backtest_metrics = performance_analyzer.analyze_backtest_result(result)
                
                candidates.append({
                    'Ticker': ticker,
                    'Strategy_Return': result.total_return_pct * 100,
                    'Volatility': risk_metrics['volatility'] * 100,
                    'Max_Drawdown': risk_metrics['max_drawdown'] * 100,
                    'Sharpe': risk_metrics['sharpe'],
                    'Sortino': risk_metrics['sortino'],
                    'Calmar': risk_metrics['calmar'],
                    'Consistency': risk_metrics['consistency_score'] * 100,
                    'Stability_Score': risk_metrics['stability_score'],
                    'Trades': result.num_trades,
                    'Win_Rate': result.win_rate * 100,
                    'Days': len(data),
                    'Period': f"{data.index[0].strftime('%m/%d')} - {data.index[-1].strftime('%m/%d')}"
                })
                
            except Exception as e:
                continue
                
        except Exception as e:
            continue

    # Save updated position state for next run
    save_position_state(new_active_positions)
    print(f"\n[OK] Saved state: {len(new_active_positions)} active positions")

    if not candidates:
        print("No low volatility candidates found!")
        return None

    # Convert to DataFrame and sort by stability score
    df = pd.DataFrame(candidates)
    df = df.sort_values('Stability_Score', ascending=False)

    print(f"\nLow Volatility Candidates (Custom Strategy)")
    print(f"Found {len(df)} tickers (with hysteresis: {VOL_EXIT_THRESHOLD*100:.0f}%-{VOL_ENTRY_THRESHOLD*100:.0f}% thresholds)")
    print("=" * 100)
    print(f"{'Ticker':<6} {'Return%':<8} {'Vol%':<6} {'DD%':<7} {'Sharpe':<7} {'Sortino':<8} {'Consist%':<9} {'Stab Score':<10} {'Trades':<7}")
    print("-" * 100)
    
    for _, row in df.head(15).iterrows():
        print(f"{row['Ticker']:<6} {row['Strategy_Return']:<8.1f} {row['Volatility']:<6.1f} "
              f"{row['Max_Drawdown']:<7.1f} {row['Sharpe']:<7.2f} {row['Sortino']:<8.2f} "
              f"{row['Consistency']:<9.1f} {row['Stability_Score']:<10.2f} {row['Trades']:<7.0f}")
    
    return df

def create_low_vol_portfolio():
    """Create a focused low-volatility portfolio."""
    
    df = analyze_low_volatility_candidates()
    if df is None:
        return
    
    # Select top performers with different criteria
    print(f"\n\nLow Volatility Portfolio Recommendations")
    print("=" * 60)
    
    # 1. Highest absolute returns (low vol)
    top_returns = df.head(5)
    print(f"\n1. HIGHEST RETURNS (Low Vol):")
    print("-" * 35)
    for _, row in top_returns.iterrows():
        print(f"   {row['Ticker']}: {row['Strategy_Return']:.1f}% return, {row['Volatility']:.1f}% vol, {row['Max_Drawdown']:.1f}% max DD")
    
    # 2. Best risk-adjusted (Sharpe > 2)
    high_sharpe = df[df['Sharpe'] > 2].head(5)
    print(f"\n2. BEST RISK-ADJUSTED (Sharpe > 2):")
    print("-" * 40)
    for _, row in high_sharpe.iterrows():
        print(f"   {row['Ticker']}: {row['Sharpe']:.2f} Sharpe, {row['Strategy_Return']:.1f}% return, {row['Volatility']:.1f}% vol")
    
    # 3. Most consistent (high win rate + low drawdown)
    consistent = df[(df['Max_Drawdown'] > -10) & (df['Consistency'] > 60)].head(5)
    print(f"\n3. MOST CONSISTENT (<10% DD, >60% consistency):")
    print("-" * 50)
    for _, row in consistent.iterrows():
        print(f"   {row['Ticker']}: {row['Consistency']:.1f}% consistency, {row['Max_Drawdown']:.1f}% max DD, {row['Strategy_Return']:.1f}% return")
    
    # 4. Ultra-safe (very low vol + positive returns)
    ultra_safe = df[(df['Volatility'] < 15) & (df['Strategy_Return'] > 0)].head(5)
    print(f"\n4. ULTRA-SAFE (<15% vol, positive returns):")
    print("-" * 45)
    for _, row in ultra_safe.iterrows():
        print(f"   {row['Ticker']}: {row['Volatility']:.1f}% vol, {row['Strategy_Return']:.1f}% return, {row['Max_Drawdown']:.1f}% max DD")
    
    # Portfolio recommendation
    print(f"\n\nPORTFOLIO RECOMMENDATION:")
    print("=" * 30)
    
    # Combine best from each category, remove duplicates
    portfolio_tickers = set()
    portfolio_tickers.update(top_returns['Ticker'].head(2))
    portfolio_tickers.update(high_sharpe['Ticker'].head(2))
    portfolio_tickers.update(consistent['Ticker'].head(2))
    portfolio_tickers.update(ultra_safe['Ticker'].head(2))
    
    portfolio_data = df[df['Ticker'].isin(portfolio_tickers)].sort_values('Stability_Score', ascending=False)
    
    total_weight = 0
    print(f"Suggested allocation (based on stability scores):")
    print("-" * 50)
    
    for _, row in portfolio_data.iterrows():
        # Weight based on stability score
        weight = min(25, max(10, row['Stability_Score'] * 15))  # 10-25% range
        total_weight += weight
        
        print(f"{row['Ticker']}: {weight:.0f}% - {row['Strategy_Return']:.1f}% return, {row['Volatility']:.1f}% vol")
    
    print(f"\nTotal allocation: {total_weight:.0f}%")
    
    # Calculate portfolio metrics
    if len(portfolio_data) > 0:
        avg_return = portfolio_data['Strategy_Return'].mean()
        avg_vol = portfolio_data['Volatility'].mean()
        avg_dd = portfolio_data['Max_Drawdown'].mean()
        
        print(f"\nEstimated Portfolio Metrics:")
        print(f"Expected Return: {avg_return:.1f}%")
        print(f"Expected Volatility: {avg_vol:.1f}%")
        print(f"Expected Max Drawdown: {avg_dd:.1f}%")
        print(f"Risk-Adjusted Return: {avg_return/avg_vol:.2f}")
    
    return portfolio_data

def main():
    # Analyze candidates
    candidates_df = analyze_low_volatility_candidates()
    
    # Create portfolio
    if candidates_df is not None:
        portfolio_df = create_low_vol_portfolio()
        return candidates_df, portfolio_df
    
    return None, None

if __name__ == "__main__":
    candidates, portfolio = main()