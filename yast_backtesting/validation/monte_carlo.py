#!/usr/bin/env python3
"""
YAST Backtesting System - Monte Carlo Simulation
Provides statistical analysis of strategy performance through randomized simulations.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import warnings
from dataclasses import dataclass
from scipy import stats
import sys
import os
from multiprocessing import Pool, cpu_count

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ..core.strategy_engine import YASTStrategyEngine, StrategyType, BacktestResult

@dataclass
class MonteCarloResult:
    """Results from Monte Carlo simulation."""
    strategy_name: str
    ticker: str
    num_simulations: int
    returns_distribution: np.ndarray
    final_values_distribution: np.ndarray
    drawdowns_distribution: np.ndarray
    sharpe_ratios_distribution: np.ndarray
    
    # Statistical metrics
    mean_return: float
    median_return: float
    std_return: float
    min_return: float
    max_return: float
    
    # Percentiles
    percentile_5: float
    percentile_25: float
    percentile_75: float
    percentile_95: float
    
    # Risk metrics
    value_at_risk_95: float
    conditional_value_at_risk_95: float
    probability_of_profit: float
    probability_of_loss: float
    
    # Additional metrics
    best_case_scenario: float
    worst_case_scenario: float
    expected_shortfall: float
    confidence_interval_95: Tuple[float, float]

class MonteCarloSimulator:
    """
    Monte Carlo simulation for YAST strategies.
    Uses historical data to simulate various market scenarios.
    """
    
    def __init__(self, 
                 num_simulations: int = 1000,
                 random_seed: Optional[int] = None,
                 parallel: bool = True):
        """
        Initialize Monte Carlo simulator.
        
        Args:
            num_simulations: Number of simulations to run
            random_seed: Random seed for reproducibility
            parallel: Use parallel processing for simulations
        """
        self.num_simulations = num_simulations
        self.random_seed = random_seed
        self.parallel = parallel
        
        if random_seed:
            np.random.seed(random_seed)
    
    def simulate_strategy(self,
                         strategy_type: StrategyType,
                         historical_data: pd.DataFrame,
                         ticker: str,
                         initial_capital: float = 100000,
                         simulation_method: str = 'bootstrap') -> MonteCarloResult:
        """
        Run Monte Carlo simulation for a strategy.
        
        Args:
            strategy_type: Type of strategy to simulate
            historical_data: Historical price and dividend data
            ticker: ETF symbol
            initial_capital: Starting capital
            simulation_method: 'bootstrap', 'random_walk', or 'block_bootstrap'
            
        Returns:
            MonteCarloResult with simulation statistics
        """
        if historical_data is None or historical_data.empty:
            raise ValueError("No historical data provided")
        
        # Initialize arrays to store results
        returns_dist = np.zeros(self.num_simulations)
        final_values_dist = np.zeros(self.num_simulations)
        drawdowns_dist = np.zeros(self.num_simulations)
        sharpe_ratios_dist = np.zeros(self.num_simulations)
        
        # Run simulations
        print(f"Running {self.num_simulations} Monte Carlo simulations for {strategy_type.value}...")
        
        if self.parallel and self.num_simulations > 100:
            # Parallel execution for large simulations
            results = self._run_parallel_simulations(
                strategy_type, historical_data, ticker, initial_capital, simulation_method
            )
        else:
            # Sequential execution
            results = []
            for i in range(self.num_simulations):
                if i % 100 == 0:
                    print(f"  Simulation {i}/{self.num_simulations}")
                
                result = self._run_single_simulation(
                    i, strategy_type, historical_data, ticker, initial_capital, simulation_method
                )
                results.append(result)
        
        # Extract results
        for i, (ret, final_val, dd, sharpe) in enumerate(results):
            returns_dist[i] = ret
            final_values_dist[i] = final_val
            drawdowns_dist[i] = dd
            sharpe_ratios_dist[i] = sharpe
        
        # Calculate statistics
        mean_return = np.mean(returns_dist)
        median_return = np.median(returns_dist)
        std_return = np.std(returns_dist)
        min_return = np.min(returns_dist)
        max_return = np.max(returns_dist)
        
        # Calculate percentiles
        percentile_5 = np.percentile(returns_dist, 5)
        percentile_25 = np.percentile(returns_dist, 25)
        percentile_75 = np.percentile(returns_dist, 75)
        percentile_95 = np.percentile(returns_dist, 95)
        
        # Risk metrics
        value_at_risk_95 = np.percentile(returns_dist, 5)  # 5th percentile
        returns_below_var = returns_dist[returns_dist <= value_at_risk_95]
        conditional_value_at_risk_95 = np.mean(returns_below_var) if len(returns_below_var) > 0 else value_at_risk_95
        
        probability_of_profit = np.sum(returns_dist > 0) / self.num_simulations
        probability_of_loss = np.sum(returns_dist < 0) / self.num_simulations
        
        # Scenarios
        best_case_scenario = np.percentile(returns_dist, 99)  # 99th percentile
        worst_case_scenario = np.percentile(returns_dist, 1)   # 1st percentile
        expected_shortfall = np.mean(returns_dist[returns_dist < 0]) if np.any(returns_dist < 0) else 0
        
        # Confidence interval
        confidence_interval_95 = (
            np.percentile(returns_dist, 2.5),
            np.percentile(returns_dist, 97.5)
        )
        
        return MonteCarloResult(
            strategy_name=strategy_type.value,
            ticker=ticker,
            num_simulations=self.num_simulations,
            returns_distribution=returns_dist,
            final_values_distribution=final_values_dist,
            drawdowns_distribution=drawdowns_dist,
            sharpe_ratios_distribution=sharpe_ratios_dist,
            mean_return=mean_return,
            median_return=median_return,
            std_return=std_return,
            min_return=min_return,
            max_return=max_return,
            percentile_5=percentile_5,
            percentile_25=percentile_25,
            percentile_75=percentile_75,
            percentile_95=percentile_95,
            value_at_risk_95=value_at_risk_95,
            conditional_value_at_risk_95=conditional_value_at_risk_95,
            probability_of_profit=probability_of_profit,
            probability_of_loss=probability_of_loss,
            best_case_scenario=best_case_scenario,
            worst_case_scenario=worst_case_scenario,
            expected_shortfall=expected_shortfall,
            confidence_interval_95=confidence_interval_95
        )
    
    def _run_single_simulation(self,
                              sim_id: int,
                              strategy_type: StrategyType,
                              historical_data: pd.DataFrame,
                              ticker: str,
                              initial_capital: float,
                              simulation_method: str) -> Tuple[float, float, float, float]:
        """Run a single simulation."""
        # Generate simulated data
        simulated_data = self._generate_simulated_data(
            historical_data, simulation_method, sim_id
        )
        
        # Run backtest on simulated data
        try:
            strategy_engine = YASTStrategyEngine(initial_capital=initial_capital)
            result = strategy_engine.backtest_strategy(
                strategy_type, simulated_data, ticker
            )
            
            # Calculate metrics
            total_return = result.total_return_pct
            final_value = result.final_capital
            
            # Calculate max drawdown
            portfolio_values = result.daily_portfolio_value
            running_max = portfolio_values.expanding().max()
            drawdown = ((portfolio_values - running_max) / running_max).min()
            
            # Calculate Sharpe ratio
            returns = portfolio_values.pct_change().dropna()
            if len(returns) > 1:
                sharpe = (returns.mean() * 252) / (returns.std() * np.sqrt(252)) if returns.std() > 0 else 0
            else:
                sharpe = 0
            
            return (total_return, final_value, drawdown, sharpe)
            
        except Exception as e:
            # Return neutral results on error
            return (0.0, initial_capital, 0.0, 0.0)
    
    def _run_parallel_simulations(self,
                                 strategy_type: StrategyType,
                                 historical_data: pd.DataFrame,
                                 ticker: str,
                                 initial_capital: float,
                                 simulation_method: str) -> List[Tuple[float, float, float, float]]:
        """Run simulations in parallel."""
        num_cores = min(cpu_count() - 1, 8)  # Use up to 8 cores
        
        # Create arguments for each simulation
        sim_args = [
            (i, strategy_type, historical_data, ticker, initial_capital, simulation_method)
            for i in range(self.num_simulations)
        ]
        
        # Run in parallel
        with Pool(num_cores) as pool:
            results = pool.starmap(self._run_single_simulation, sim_args)
        
        return results
    
    def _generate_simulated_data(self,
                                historical_data: pd.DataFrame,
                                method: str,
                                sim_id: int) -> pd.DataFrame:
        """
        Generate simulated price data using specified method.
        
        Args:
            historical_data: Original historical data
            method: Simulation method ('bootstrap', 'random_walk', 'block_bootstrap')
            sim_id: Simulation ID for seeding
            
        Returns:
            Simulated DataFrame with same structure as historical data
        """
        if method == 'bootstrap':
            return self._bootstrap_simulation(historical_data, sim_id)
        elif method == 'random_walk':
            return self._random_walk_simulation(historical_data, sim_id)
        elif method == 'block_bootstrap':
            return self._block_bootstrap_simulation(historical_data, sim_id)
        else:
            raise ValueError(f"Unknown simulation method: {method}")
    
    def _bootstrap_simulation(self, data: pd.DataFrame, sim_id: int) -> pd.DataFrame:
        """
        Bootstrap simulation - randomly sample daily returns with replacement.
        """
        np.random.seed((self.random_seed or 42) + sim_id)
        
        # Calculate daily returns
        returns = data['Close'].pct_change().dropna()
        
        # Sample returns with replacement
        num_days = len(data)
        sampled_returns = np.random.choice(returns, size=num_days-1, replace=True)
        
        # Reconstruct prices
        simulated_data = data.copy()
        initial_price = data['Close'].iloc[0]
        simulated_prices = [initial_price]
        
        for ret in sampled_returns:
            next_price = simulated_prices[-1] * (1 + ret)
            simulated_prices.append(next_price)
        
        simulated_data['Close'] = simulated_prices
        
        # Adjust OHLV proportionally
        price_ratio = simulated_data['Close'] / data['Close']
        simulated_data['Open'] = data['Open'] * price_ratio
        simulated_data['High'] = data['High'] * price_ratio
        simulated_data['Low'] = data['Low'] * price_ratio
        
        # Keep dividends unchanged (or could randomize dividend timing)
        if 'Dividends' in data.columns:
            # Randomly shuffle dividend dates but keep amounts
            dividend_dates = data[data['Dividends'] > 0].index
            dividend_amounts = data[data['Dividends'] > 0]['Dividends'].values
            
            if len(dividend_dates) > 0:
                # Clear dividends and ensure float dtype
                simulated_data['Dividends'] = 0.0
                
                # Randomly place dividends
                new_dividend_indices = np.random.choice(
                    range(len(simulated_data)), 
                    size=len(dividend_dates), 
                    replace=False
                )
                
                for idx, amount in zip(new_dividend_indices, dividend_amounts):
                    simulated_data.iloc[idx, simulated_data.columns.get_loc('Dividends')] = float(amount)
        
        return simulated_data
    
    def _random_walk_simulation(self, data: pd.DataFrame, sim_id: int) -> pd.DataFrame:
        """
        Random walk simulation using historical volatility and drift.
        """
        np.random.seed((self.random_seed or 42) + sim_id)
        
        # Calculate historical parameters
        returns = data['Close'].pct_change().dropna()
        mu = returns.mean()  # Daily drift
        sigma = returns.std()  # Daily volatility
        
        # Generate random walk
        num_days = len(data)
        dt = 1  # Daily steps
        
        # Generate random shocks
        shocks = np.random.normal(mu, sigma, num_days-1)
        
        # Build price path
        simulated_data = data.copy()
        initial_price = data['Close'].iloc[0]
        simulated_prices = [initial_price]
        
        for shock in shocks:
            next_price = simulated_prices[-1] * (1 + shock)
            simulated_prices.append(max(next_price, 0.01))  # Prevent negative prices
        
        simulated_data['Close'] = simulated_prices
        
        # Adjust OHLV
        price_ratio = simulated_data['Close'] / data['Close']
        simulated_data['Open'] = data['Open'] * price_ratio
        simulated_data['High'] = simulated_data['Close'] * 1.02  # 2% daily range
        simulated_data['Low'] = simulated_data['Close'] * 0.98
        
        return simulated_data
    
    def _block_bootstrap_simulation(self, data: pd.DataFrame, sim_id: int) -> pd.DataFrame:
        """
        Block bootstrap - preserves short-term correlations by sampling blocks of days.
        """
        np.random.seed((self.random_seed or 42) + sim_id)
        
        # Block size (e.g., weekly blocks)
        block_size = 5
        num_days = len(data)
        num_blocks = num_days // block_size + 1
        
        # Sample blocks
        simulated_indices = []
        while len(simulated_indices) < num_days:
            # Random starting point
            start_idx = np.random.randint(0, len(data) - block_size)
            block_indices = list(range(start_idx, min(start_idx + block_size, len(data))))
            simulated_indices.extend(block_indices)
        
        # Trim to exact length
        simulated_indices = simulated_indices[:num_days]
        
        # Create simulated data
        simulated_data = data.iloc[simulated_indices].copy()
        simulated_data.index = data.index  # Keep original dates
        
        return simulated_data
    
    def compare_strategies_monte_carlo(self,
                                      strategies: List[StrategyType],
                                      historical_data: pd.DataFrame,
                                      ticker: str,
                                      initial_capital: float = 100000) -> Dict[str, MonteCarloResult]:
        """
        Compare multiple strategies using Monte Carlo simulation.
        
        Args:
            strategies: List of strategies to compare
            historical_data: Historical data
            ticker: ETF symbol
            initial_capital: Starting capital
            
        Returns:
            Dictionary mapping strategy names to MonteCarloResult
        """
        results = {}
        
        for strategy_type in strategies:
            print(f"\nSimulating {strategy_type.value}...")
            mc_result = self.simulate_strategy(
                strategy_type, historical_data, ticker, initial_capital
            )
            results[strategy_type.value] = mc_result
        
        return results
    
    def generate_report(self, mc_result: MonteCarloResult) -> str:
        """Generate a text report of Monte Carlo results."""
        report = f"""
Monte Carlo Simulation Report
============================
Strategy: {mc_result.strategy_name}
Ticker: {mc_result.ticker}
Simulations: {mc_result.num_simulations}

RETURN DISTRIBUTION
-------------------
Mean Return: {mc_result.mean_return*100:.2f}%
Median Return: {mc_result.median_return*100:.2f}%
Std Deviation: {mc_result.std_return*100:.2f}%

PERCENTILES
-----------
5th Percentile: {mc_result.percentile_5*100:.2f}%
25th Percentile: {mc_result.percentile_25*100:.2f}%
75th Percentile: {mc_result.percentile_75*100:.2f}%
95th Percentile: {mc_result.percentile_95*100:.2f}%

RISK METRICS
------------
Value at Risk (95%): {mc_result.value_at_risk_95*100:.2f}%
Conditional VaR (95%): {mc_result.conditional_value_at_risk_95*100:.2f}%
Probability of Profit: {mc_result.probability_of_profit*100:.1f}%
Probability of Loss: {mc_result.probability_of_loss*100:.1f}%

SCENARIOS
---------
Best Case (99th %ile): {mc_result.best_case_scenario*100:.2f}%
Worst Case (1st %ile): {mc_result.worst_case_scenario*100:.2f}%
Expected Shortfall: {mc_result.expected_shortfall*100:.2f}%

95% CONFIDENCE INTERVAL
-----------------------
Lower Bound: {mc_result.confidence_interval_95[0]*100:.2f}%
Upper Bound: {mc_result.confidence_interval_95[1]*100:.2f}%
"""
        return report