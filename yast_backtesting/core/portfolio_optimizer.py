#!/usr/bin/env python3
"""
YAST Backtesting System - Portfolio Optimizer
Modern Portfolio Theory implementation with YAST-specific constraints.
Implements Rule 1/Rule 2 selection criteria and 15% volatility constraint.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
import warnings
from scipy.optimize import minimize
from dataclasses import dataclass
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@dataclass
class PortfolioETF:
    """Represents an ETF in the portfolio optimization."""
    ticker: str
    expected_return: float
    volatility: float
    dividend_capture_return: float = 0.0
    buy_hold_return: float = 0.0
    ex_dividend_day: str = 'Thursday'
    qualifies_rule1: bool = False
    qualifies_rule2: bool = False
    correlation_with_others: Dict[str, float] = None
    
    def __post_init__(self):
        if self.correlation_with_others is None:
            self.correlation_with_others = {}

@dataclass
class OptimizationResult:
    """Results from portfolio optimization."""
    weights: Dict[str, float]
    expected_return: float
    portfolio_volatility: float
    sharpe_ratio: float
    selected_etfs: List[PortfolioETF]
    selection_rationale: Dict[str, str]
    constraints_met: Dict[str, bool]
    optimization_method: str

class YASTPortfolioOptimizer:
    """
    Portfolio optimizer implementing YAST-specific rules and constraints.
    """
    
    def __init__(self, 
                 max_portfolio_volatility: float = 0.15,
                 risk_free_rate: float = 0.05):
        """
        Initialize the portfolio optimizer.
        
        Args:
            max_portfolio_volatility: Maximum allowed portfolio volatility (15% default)
            risk_free_rate: Risk-free rate for Sharpe ratio calculation (5% default)
        """
        self.max_portfolio_volatility = max_portfolio_volatility
        self.risk_free_rate = risk_free_rate
        
        self.rule1_return_threshold = 0.40  # >40% returns
        self.rule1_volatility_threshold = 0.40  # <40% volatility
        self.rule2_return_threshold = 0.30  # >30% DC returns
        self.rule2_volatility_threshold = 0.80  # <80% volatility
    
    def apply_yast_selection_rules(self, etfs: List[PortfolioETF]) -> List[PortfolioETF]:
        """
        Apply YAST Rule 1 and Rule 2 selection criteria.
        
        Args:
            etfs: List of ETFs to evaluate
            
        Returns:
            List of ETFs that meet selection criteria
        """
        selected_etfs = []
        
        for etf in etfs:
            rule1_qualified = (
                max(etf.buy_hold_return, etf.dividend_capture_return) > self.rule1_return_threshold and 
                etf.volatility < self.rule1_volatility_threshold
            )
            
            rule2_qualified = (
                etf.dividend_capture_return > self.rule2_return_threshold and
                etf.volatility < self.rule2_volatility_threshold
            )
            
            etf.qualifies_rule1 = rule1_qualified
            etf.qualifies_rule2 = rule2_qualified
            
            if rule1_qualified or rule2_qualified:
                selected_etfs.append(etf)
        
        return selected_etfs
    
    def resolve_ex_dividend_conflicts(self, etfs: List[PortfolioETF]) -> List[PortfolioETF]:
        """
        Resolve conflicts when multiple Rule 2 ETFs have same ex-dividend day.
        Keep the one with highest dividend capture return.
        
        Args:
            etfs: List of selected ETFs
            
        Returns:
            List of ETFs with conflicts resolved
        """
        rule1_etfs = [etf for etf in etfs if etf.qualifies_rule1]
        rule2_etfs = [etf for etf in etfs if etf.qualifies_rule2 and not etf.qualifies_rule1]
        
        rule2_by_day = {}
        for etf in rule2_etfs:
            day = etf.ex_dividend_day
            if day not in rule2_by_day:
                rule2_by_day[day] = []
            rule2_by_day[day].append(etf)
        
        resolved_rule2 = []
        for day, etfs_on_day in rule2_by_day.items():
            if len(etfs_on_day) == 1:
                resolved_rule2.extend(etfs_on_day)
            else:
                best_etf = max(etfs_on_day, key=lambda x: x.dividend_capture_return)
                resolved_rule2.append(best_etf)
        
        return rule1_etfs + resolved_rule2
    
    def calculate_portfolio_metrics(self, 
                                  weights: np.ndarray, 
                                  returns: np.ndarray, 
                                  cov_matrix: np.ndarray) -> Tuple[float, float, float]:
        """
        Calculate portfolio expected return, volatility, and Sharpe ratio.
        
        Args:
            weights: Portfolio weights
            returns: Expected returns vector
            cov_matrix: Covariance matrix
            
        Returns:
            Tuple of (expected_return, volatility, sharpe_ratio)
        """
        portfolio_return = np.sum(weights * returns)
        portfolio_variance = np.dot(weights.T, np.dot(cov_matrix, weights))
        portfolio_volatility = np.sqrt(portfolio_variance)
        
        sharpe_ratio = (portfolio_return - self.risk_free_rate) / portfolio_volatility if portfolio_volatility > 0 else 0
        
        return portfolio_return, portfolio_volatility, sharpe_ratio
    
    def build_covariance_matrix(self, etfs: List[PortfolioETF]) -> np.ndarray:
        """
        Build covariance matrix from ETF correlations and volatilities.
        
        Args:
            etfs: List of ETFs
            
        Returns:
            Covariance matrix
        """
        n = len(etfs)
        cov_matrix = np.zeros((n, n))
        
        for i, etf_i in enumerate(etfs):
            for j, etf_j in enumerate(etfs):
                if i == j:
                    cov_matrix[i, j] = etf_i.volatility ** 2
                else:
                    correlation = etf_i.correlation_with_others.get(etf_j.ticker, 0.3)  # Default correlation
                    cov_matrix[i, j] = correlation * etf_i.volatility * etf_j.volatility
        
        return cov_matrix
    
    def optimize_portfolio(self, etfs: List[PortfolioETF], method: str = 'max_sharpe') -> OptimizationResult:
        """
        Optimize portfolio allocation using specified method.
        
        Args:
            etfs: List of ETFs to optimize
            method: Optimization method ('max_sharpe', 'min_variance', 'equal_weight')
            
        Returns:
            OptimizationResult with optimal allocation
        """
        if not etfs:
            raise ValueError("No ETFs provided for optimization")
        
        selected_etfs = self.apply_yast_selection_rules(etfs)
        
        if not selected_etfs:
            warnings.warn("No ETFs meet YAST selection criteria")
            return self._create_empty_result(method)
        
        final_etfs = self.resolve_ex_dividend_conflicts(selected_etfs)
        
        if method == 'equal_weight':
            return self._equal_weight_optimization(final_etfs)
        
        n_assets = len(final_etfs)
        returns = np.array([etf.expected_return for etf in final_etfs])
        cov_matrix = self.build_covariance_matrix(final_etfs)
        
        if method == 'max_sharpe':
            result = self._maximize_sharpe_ratio(final_etfs, returns, cov_matrix)
        elif method == 'min_variance':
            result = self._minimize_variance(final_etfs, returns, cov_matrix)
        else:
            raise ValueError(f"Unknown optimization method: {method}")
        
        return result
    
    def _maximize_sharpe_ratio(self, 
                              etfs: List[PortfolioETF], 
                              returns: np.ndarray, 
                              cov_matrix: np.ndarray) -> OptimizationResult:
        """Maximize Sharpe ratio optimization."""
        n_assets = len(etfs)
        
        def negative_sharpe(weights):
            _, volatility, sharpe = self.calculate_portfolio_metrics(weights, returns, cov_matrix)
            return -sharpe if volatility > 0 else -999
        
        def volatility_constraint(weights):
            _, volatility, _ = self.calculate_portfolio_metrics(weights, returns, cov_matrix)
            return self.max_portfolio_volatility - volatility
        
        constraints = [
            {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},  # Weights sum to 1
            {'type': 'ineq', 'fun': volatility_constraint}    # Volatility constraint
        ]
        
        bounds = tuple((0, 1) for _ in range(n_assets))
        
        x0 = np.array([1/n_assets] * n_assets)
        
        try:
            result = minimize(
                negative_sharpe,
                x0,
                method='SLSQP',
                bounds=bounds,
                constraints=constraints
            )
            
            if result.success:
                optimal_weights = result.x
            else:
                warnings.warn("Optimization failed, using equal weights")
                optimal_weights = x0
                
        except Exception as e:
            warnings.warn(f"Optimization error: {str(e)}, using equal weights")
            optimal_weights = x0
        
        return self._create_optimization_result(etfs, optimal_weights, returns, cov_matrix, 'max_sharpe')
    
    def _minimize_variance(self, 
                          etfs: List[PortfolioETF], 
                          returns: np.ndarray, 
                          cov_matrix: np.ndarray) -> OptimizationResult:
        """Minimize variance optimization."""
        n_assets = len(etfs)
        
        def portfolio_variance(weights):
            return np.dot(weights.T, np.dot(cov_matrix, weights))
        
        def volatility_constraint(weights):
            volatility = np.sqrt(portfolio_variance(weights))
            return self.max_portfolio_volatility - volatility
        
        constraints = [
            {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
            {'type': 'ineq', 'fun': volatility_constraint}
        ]
        
        bounds = tuple((0, 1) for _ in range(n_assets))
        x0 = np.array([1/n_assets] * n_assets)
        
        try:
            result = minimize(
                portfolio_variance,
                x0,
                method='SLSQP',
                bounds=bounds,
                constraints=constraints
            )
            
            optimal_weights = result.x if result.success else x0
            
        except Exception as e:
            warnings.warn(f"Optimization error: {str(e)}, using equal weights")
            optimal_weights = x0
        
        return self._create_optimization_result(etfs, optimal_weights, returns, cov_matrix, 'min_variance')
    
    def _equal_weight_optimization(self, etfs: List[PortfolioETF]) -> OptimizationResult:
        """Equal weight optimization."""
        n_assets = len(etfs)
        weights = np.array([1/n_assets] * n_assets)
        
        returns = np.array([etf.expected_return for etf in etfs])
        cov_matrix = self.build_covariance_matrix(etfs)
        
        return self._create_optimization_result(etfs, weights, returns, cov_matrix, 'equal_weight')
    
    def _create_optimization_result(self, 
                                   etfs: List[PortfolioETF], 
                                   weights: np.ndarray, 
                                   returns: np.ndarray, 
                                   cov_matrix: np.ndarray, 
                                   method: str) -> OptimizationResult:
        """Create optimization result object."""
        expected_return, portfolio_volatility, sharpe_ratio = self.calculate_portfolio_metrics(
            weights, returns, cov_matrix
        )
        
        weight_dict = {etf.ticker: weight for etf, weight in zip(etfs, weights)}
        
        selection_rationale = {}
        for etf in etfs:
            reasons = []
            if etf.qualifies_rule1:
                reasons.append("Rule 1: High return, low volatility")
            if etf.qualifies_rule2:
                reasons.append("Rule 2: Strong dividend capture")
            selection_rationale[etf.ticker] = "; ".join(reasons)
        
        constraints_met = {
            'volatility_constraint': portfolio_volatility <= self.max_portfolio_volatility,
            'weights_sum_to_one': abs(np.sum(weights) - 1.0) < 1e-6,
            'all_weights_positive': np.all(weights >= 0)
        }
        
        return OptimizationResult(
            weights=weight_dict,
            expected_return=expected_return,
            portfolio_volatility=portfolio_volatility,
            sharpe_ratio=sharpe_ratio,
            selected_etfs=etfs,
            selection_rationale=selection_rationale,
            constraints_met=constraints_met,
            optimization_method=method
        )
    
    def _create_empty_result(self, method: str) -> OptimizationResult:
        """Create empty result when no ETFs qualify."""
        return OptimizationResult(
            weights={},
            expected_return=0.0,
            portfolio_volatility=0.0,
            sharpe_ratio=0.0,
            selected_etfs=[],
            selection_rationale={},
            constraints_met={'no_qualifying_etfs': False},
            optimization_method=method
        )
    
    def generate_efficient_frontier(self, 
                                   etfs: List[PortfolioETF], 
                                   num_points: int = 50) -> pd.DataFrame:
        """
        Generate efficient frontier data points.
        
        Args:
            etfs: List of ETFs
            num_points: Number of points on the frontier
            
        Returns:
            DataFrame with frontier data
        """
        selected_etfs = self.apply_yast_selection_rules(etfs)
        final_etfs = self.resolve_ex_dividend_conflicts(selected_etfs)
        
        if len(final_etfs) < 2:
            return pd.DataFrame()
        
        returns = np.array([etf.expected_return for etf in final_etfs])
        cov_matrix = self.build_covariance_matrix(final_etfs)
        
        min_ret = min(returns)
        max_ret = max(returns)
        target_returns = np.linspace(min_ret, max_ret, num_points)
        
        frontier_data = []
        
        for target_return in target_returns:
            try:
                weights = self._optimize_for_target_return(target_return, returns, cov_matrix)
                
                if weights is not None:
                    _, volatility, sharpe = self.calculate_portfolio_metrics(weights, returns, cov_matrix)
                    
                    if volatility <= self.max_portfolio_volatility:
                        frontier_data.append({
                            'Return': target_return,
                            'Volatility': volatility,
                            'Sharpe_Ratio': sharpe
                        })
            except:
                continue
        
        return pd.DataFrame(frontier_data)
    
    def _optimize_for_target_return(self, 
                                   target_return: float, 
                                   returns: np.ndarray, 
                                   cov_matrix: np.ndarray) -> Optional[np.ndarray]:
        """Optimize for a specific target return."""
        n_assets = len(returns)
        
        def portfolio_variance(weights):
            return np.dot(weights.T, np.dot(cov_matrix, weights))
        
        constraints = [
            {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
            {'type': 'eq', 'fun': lambda x: np.sum(x * returns) - target_return}
        ]
        
        bounds = tuple((0, 1) for _ in range(n_assets))
        x0 = np.array([1/n_assets] * n_assets)
        
        try:
            result = minimize(
                portfolio_variance,
                x0,
                method='SLSQP',
                bounds=bounds,
                constraints=constraints
            )
            
            return result.x if result.success else None
            
        except:
            return None