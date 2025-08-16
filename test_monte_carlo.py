#!/usr/bin/env python3
"""
Test Monte Carlo simulations for YAST strategies
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from yast_backtesting.core import (
    YASTDataManager, 
    StrategyType
)
from yast_backtesting.validation.monte_carlo import MonteCarloSimulator

def test_monte_carlo():
    """Test Monte Carlo simulations on all strategies."""
    
    print("=" * 80)
    print("MONTE CARLO SIMULATION TEST")
    print("=" * 80)
    
    # Initialize
    data_manager = YASTDataManager()
    mc_simulator = MonteCarloSimulator(
        num_simulations=100,  # Use 100 for quick test (use 1000+ for production)
        random_seed=42,  # For reproducibility
        parallel=False  # Set to True for faster execution with more simulations
    )
    
    # Load data for testing
    ticker = 'YMAX'  # Good ticker with lots of data
    data = data_manager.load_ticker_data(ticker, 'full')
    
    if data is None:
        print(f"No data found for {ticker}")
        return
    
    print(f"Testing with {ticker}")
    print(f"Historical data: {len(data)} days")
    print(f"Date range: {data.index[0]} to {data.index[-1]}")
    
    # Test all strategies
    strategies = [
        StrategyType.BUY_HOLD,
        StrategyType.DIVIDEND_CAPTURE,
        StrategyType.CUSTOM_DIVIDEND
    ]
    
    mc_results = mc_simulator.compare_strategies_monte_carlo(
        strategies, data, ticker
    )
    
    # Print results for each strategy
    for strategy_name, mc_result in mc_results.items():
        print(mc_simulator.generate_report(mc_result))
    
    # Create comparison table
    print("\n" + "=" * 80)
    print("STRATEGY COMPARISON - MONTE CARLO RESULTS")
    print("=" * 80)
    print(f"{'Strategy':<25} | {'Mean':<8} | {'Median':<8} | {'Std Dev':<8} | {'P(Profit)':<10} | {'VaR 95%':<10} | {'Best Case':<10} | {'Worst Case':<10}")
    print("-" * 120)
    
    for strategy_name, mc_result in mc_results.items():
        print(f"{strategy_name:<25} | "
              f"{mc_result.mean_return*100:>7.2f}% | "
              f"{mc_result.median_return*100:>7.2f}% | "
              f"{mc_result.std_return*100:>7.2f}% | "
              f"{mc_result.probability_of_profit*100:>9.1f}% | "
              f"{mc_result.value_at_risk_95*100:>9.2f}% | "
              f"{mc_result.best_case_scenario*100:>9.2f}% | "
              f"{mc_result.worst_case_scenario*100:>10.2f}%")
    
    # Risk-Return Analysis
    print("\n" + "=" * 80)
    print("RISK-RETURN ANALYSIS")
    print("=" * 80)
    
    for strategy_name, mc_result in mc_results.items():
        risk_return_ratio = mc_result.mean_return / mc_result.std_return if mc_result.std_return > 0 else 0
        print(f"{strategy_name:<25}")
        print(f"  Risk-Return Ratio: {risk_return_ratio:.2f}")
        print(f"  95% Confidence Interval: [{mc_result.confidence_interval_95[0]*100:.2f}%, {mc_result.confidence_interval_95[1]*100:.2f}%]")
        print(f"  Expected Shortfall: {mc_result.expected_shortfall*100:.2f}%")
        print()
    
    # Create visualization
    try:
        create_monte_carlo_visualization(mc_results)
    except Exception as e:
        print(f"Could not create visualization: {e}")
    
    return mc_results

def create_monte_carlo_visualization(mc_results):
    """Create visualization of Monte Carlo results."""
    
    # Create figure with subplots
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle('Monte Carlo Simulation Results', fontsize=16)
    
    # 1. Return distributions
    ax1 = axes[0, 0]
    for strategy_name, mc_result in mc_results.items():
        ax1.hist(mc_result.returns_distribution * 100, bins=30, alpha=0.5, label=strategy_name)
    ax1.set_xlabel('Return (%)')
    ax1.set_ylabel('Frequency')
    ax1.set_title('Return Distributions')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # 2. Box plots of returns
    ax2 = axes[0, 1]
    box_data = [mc_result.returns_distribution * 100 for mc_result in mc_results.values()]
    ax2.boxplot(box_data, labels=list(mc_results.keys()))
    ax2.set_ylabel('Return (%)')
    ax2.set_title('Return Distribution Box Plots')
    ax2.grid(True, alpha=0.3)
    plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45, ha='right')
    
    # 3. Risk vs Return scatter
    ax3 = axes[1, 0]
    for strategy_name, mc_result in mc_results.items():
        ax3.scatter(mc_result.std_return * 100, 
                   mc_result.mean_return * 100,
                   s=200, alpha=0.7, label=strategy_name)
        # Add error bars for confidence intervals
        ax3.errorbar(mc_result.std_return * 100,
                    mc_result.mean_return * 100,
                    yerr=[[mc_result.mean_return * 100 - mc_result.percentile_5 * 100],
                          [mc_result.percentile_95 * 100 - mc_result.mean_return * 100]],
                    fmt='none', alpha=0.3)
    ax3.set_xlabel('Risk (Std Dev %)')
    ax3.set_ylabel('Expected Return (%)')
    ax3.set_title('Risk-Return Profile')
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    # 4. Probability of Profit bar chart
    ax4 = axes[1, 1]
    strategies = list(mc_results.keys())
    prob_profits = [mc_result.probability_of_profit * 100 for mc_result in mc_results.values()]
    colors = ['green' if p > 50 else 'red' for p in prob_profits]
    bars = ax4.bar(strategies, prob_profits, color=colors, alpha=0.7)
    ax4.set_ylabel('Probability (%)')
    ax4.set_title('Probability of Profit')
    ax4.axhline(y=50, color='black', linestyle='--', alpha=0.5)
    ax4.set_ylim(0, 100)
    plt.setp(ax4.xaxis.get_majorticklabels(), rotation=45, ha='right')
    
    # Add value labels on bars
    for bar, prob in zip(bars, prob_profits):
        ax4.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1, 
                f'{prob:.1f}%', ha='center', va='bottom')
    
    plt.tight_layout()
    
    # Save figure
    plt.savefig('monte_carlo_results.png', dpi=100, bbox_inches='tight')
    print("\nVisualization saved as 'monte_carlo_results.png'")
    
    # Show plot (optional - comment out if running in non-interactive environment)
    # plt.show()

def run_comprehensive_monte_carlo(num_simulations=1000):
    """Run comprehensive Monte Carlo analysis with more simulations."""
    
    print("=" * 80)
    print(f"COMPREHENSIVE MONTE CARLO ({num_simulations} simulations)")
    print("=" * 80)
    
    # Initialize
    data_manager = YASTDataManager()
    mc_simulator = MonteCarloSimulator(
        num_simulations=num_simulations,
        random_seed=42,
        parallel=True  # Use parallel processing
    )
    
    # Test on multiple tickers
    tickers = ['YMAX', 'QDTE', 'ULTY']
    all_results = {}
    
    for ticker in tickers:
        print(f"\nAnalyzing {ticker}...")
        data = data_manager.load_ticker_data(ticker, 'full')
        
        if data is None:
            print(f"  No data found for {ticker}")
            continue
        
        # Run simulations
        mc_results = mc_simulator.compare_strategies_monte_carlo(
            [StrategyType.BUY_HOLD, StrategyType.DIVIDEND_CAPTURE, StrategyType.CUSTOM_DIVIDEND],
            data, ticker
        )
        
        all_results[ticker] = mc_results
        
        # Print summary
        print(f"\n  {ticker} Results:")
        for strategy_name, mc_result in mc_results.items():
            print(f"    {strategy_name}: Mean={mc_result.mean_return*100:.2f}%, "
                  f"P(Profit)={mc_result.probability_of_profit*100:.1f}%, "
                  f"VaR={mc_result.value_at_risk_95*100:.2f}%")
    
    return all_results

if __name__ == "__main__":
    # Quick test with 100 simulations
    print("Running quick test (100 simulations)...")
    results = test_monte_carlo()
    
    # Uncomment for comprehensive analysis (slower)
    # print("\nRunning comprehensive analysis (1000 simulations)...")
    # comprehensive_results = run_comprehensive_monte_carlo(1000)