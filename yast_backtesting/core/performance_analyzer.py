#!/usr/bin/env python3
"""
YAST Backtesting System - Performance Analyzer
Comprehensive performance analytics and risk metrics for backtesting results.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
import warnings
from dataclasses import dataclass
from scipy import stats
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from .strategy_engine import BacktestResult, Trade

@dataclass
class PerformanceMetrics:
    """Comprehensive performance metrics for a strategy or portfolio."""
    
    # Return Metrics
    total_return_pct: float
    total_return_dollar: float
    annualized_return: float
    
    # Risk Metrics
    volatility: float
    max_drawdown: float
    var_95: float  # Value at Risk (95%)
    cvar_95: float  # Conditional Value at Risk
    
    # Risk-Adjusted Returns
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    
    # Trading Metrics
    num_trades: int
    win_rate: float
    avg_win: float
    avg_loss: float
    profit_factor: float
    
    # Time-based Metrics
    best_month: float
    worst_month: float
    positive_months_pct: float
    
    # Additional Context
    start_date: pd.Timestamp
    end_date: pd.Timestamp
    trading_days: int
    
@dataclass
class DrawdownAnalysis:
    """Detailed drawdown analysis."""
    max_drawdown_pct: float
    max_drawdown_duration_days: int
    drawdown_start_date: pd.Timestamp
    drawdown_end_date: pd.Timestamp
    recovery_date: pd.Timestamp
    current_drawdown_pct: float
    avg_drawdown_duration: float
    num_drawdowns: int

@dataclass
class MarketRegimeAnalysis:
    """Performance analysis by market regime."""
    bull_market_return: float
    bear_market_return: float
    high_volatility_return: float
    low_volatility_return: float
    stress_period_return: float
    
class YASTPerformanceAnalyzer:
    """
    Comprehensive performance analyzer for YAST backtesting results.
    """
    
    def __init__(self, risk_free_rate: float = 0.05):
        """
        Initialize the performance analyzer.
        
        Args:
            risk_free_rate: Risk-free rate for calculations (default 5%)
        """
        self.risk_free_rate = risk_free_rate
    
    def analyze_backtest_result(self, result: BacktestResult) -> PerformanceMetrics:
        """
        Perform comprehensive analysis of a backtest result.
        
        Args:
            result: BacktestResult object
            
        Returns:
            PerformanceMetrics with detailed analysis
        """
        if result.daily_portfolio_value.empty:
            return self._create_empty_metrics()
        
        returns = self._calculate_returns(result.daily_portfolio_value)
        
        # Return metrics
        total_return_pct = result.total_return_pct
        total_return_dollar = result.total_return
        trading_days = len(result.daily_portfolio_value)
        years = trading_days / 252.0
        annualized_return = (1 + total_return_pct) ** (1/years) - 1 if years > 0 else 0
        
        # Risk metrics
        volatility = returns.std() * np.sqrt(252) if len(returns) > 1 else 0
        max_drawdown = self._calculate_max_drawdown(result.daily_portfolio_value)
        var_95 = np.percentile(returns, 5) if len(returns) > 0 else 0
        cvar_95 = returns[returns <= var_95].mean() if len(returns[returns <= var_95]) > 0 else 0
        
        # Risk-adjusted returns
        sharpe_ratio = (annualized_return - self.risk_free_rate) / volatility if volatility > 0 else 0
        sortino_ratio = self._calculate_sortino_ratio(returns, annualized_return)
        calmar_ratio = annualized_return / abs(max_drawdown) if max_drawdown != 0 else 0
        
        # Trading metrics
        num_trades = len(result.trades)
        win_rate = result.win_rate
        avg_win, avg_loss, profit_factor = self._calculate_trade_metrics(result.trades)
        
        # Time-based metrics
        monthly_returns = self._calculate_monthly_returns(result.daily_portfolio_value)
        best_month = monthly_returns.max() if len(monthly_returns) > 0 else 0
        worst_month = monthly_returns.min() if len(monthly_returns) > 0 else 0
        positive_months_pct = (monthly_returns > 0).mean() if len(monthly_returns) > 0 else 0
        
        return PerformanceMetrics(
            total_return_pct=total_return_pct,
            total_return_dollar=total_return_dollar,
            annualized_return=annualized_return,
            volatility=volatility,
            max_drawdown=max_drawdown,
            var_95=var_95,
            cvar_95=cvar_95,
            sharpe_ratio=sharpe_ratio,
            sortino_ratio=sortino_ratio,
            calmar_ratio=calmar_ratio,
            num_trades=num_trades,
            win_rate=win_rate,
            avg_win=avg_win,
            avg_loss=avg_loss,
            profit_factor=profit_factor,
            best_month=best_month,
            worst_month=worst_month,
            positive_months_pct=positive_months_pct,
            start_date=result.start_date,
            end_date=result.end_date,
            trading_days=trading_days
        )
    
    def _calculate_returns(self, portfolio_values: pd.Series) -> pd.Series:
        """Calculate daily returns from portfolio values."""
        if len(portfolio_values) < 2:
            return pd.Series([])
        return portfolio_values.pct_change().dropna()
    
    def _calculate_max_drawdown(self, portfolio_values: pd.Series) -> float:
        """Calculate maximum drawdown."""
        if portfolio_values.empty:
            return 0.0
        
        running_max = portfolio_values.expanding().max()
        drawdown = (portfolio_values - running_max) / running_max
        return drawdown.min()
    
    def _calculate_sortino_ratio(self, returns: pd.Series, annual_return: float) -> float:
        """Calculate Sortino ratio using downside deviation."""
        if returns.empty:
            return 0.0
        
        downside_returns = returns[returns < 0]
        if len(downside_returns) == 0:
            return float('inf') if annual_return > self.risk_free_rate else 0.0
        
        downside_deviation = downside_returns.std() * np.sqrt(252)
        
        return (annual_return - self.risk_free_rate) / downside_deviation if downside_deviation > 0 else 0.0
    
    def _calculate_trade_metrics(self, trades: List[Trade]) -> Tuple[float, float, float]:
        """Calculate trading-specific metrics."""
        if not trades:
            return 0.0, 0.0, 0.0
        
        winning_trades = [t for t in trades if t.total_return > 0]
        losing_trades = [t for t in trades if t.total_return < 0]
        
        avg_win = np.mean([t.total_return for t in winning_trades]) if winning_trades else 0.0
        avg_loss = np.mean([t.total_return for t in losing_trades]) if losing_trades else 0.0
        
        gross_profit = sum(t.total_return for t in winning_trades)
        gross_loss = abs(sum(t.total_return for t in losing_trades))
        
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
        
        return avg_win, avg_loss, profit_factor
    
    def _calculate_monthly_returns(self, portfolio_values: pd.Series) -> pd.Series:
        """Calculate monthly returns."""
        if portfolio_values.empty:
            return pd.Series([])
        
        monthly_values = portfolio_values.resample('ME').last()
        return monthly_values.pct_change().dropna()
    
    def analyze_drawdowns(self, portfolio_values: pd.Series) -> DrawdownAnalysis:
        """
        Perform detailed drawdown analysis.
        
        Args:
            portfolio_values: Time series of portfolio values
            
        Returns:
            DrawdownAnalysis object
        """
        if portfolio_values.empty:
            return DrawdownAnalysis(
                max_drawdown_pct=0.0,
                max_drawdown_duration_days=0,
                drawdown_start_date=None,
                drawdown_end_date=None,
                recovery_date=None,
                current_drawdown_pct=0.0,
                avg_drawdown_duration=0.0,
                num_drawdowns=0
            )
        
        running_max = portfolio_values.expanding().max()
        drawdown = (portfolio_values - running_max) / running_max
        
        max_drawdown_pct = drawdown.min()
        max_dd_date = drawdown.idxmin()
        
        # Find drawdown start (last peak before max drawdown)
        drawdown_start_date = running_max[running_max.index <= max_dd_date].idxmax()
        
        # Find recovery date (first time portfolio exceeds previous peak after max drawdown)
        recovery_date = None
        peak_value = running_max.loc[drawdown_start_date]
        post_drawdown = portfolio_values[portfolio_values.index > max_dd_date]
        recovery_candidates = post_drawdown[post_drawdown > peak_value]
        
        if not recovery_candidates.empty:
            recovery_date = recovery_candidates.index[0]
        
        current_drawdown_pct = drawdown.iloc[-1]
        
        # Count number of drawdown periods
        in_drawdown = drawdown < -0.01  # 1% threshold
        drawdown_periods = []
        start_idx = None
        
        for i, is_dd in enumerate(in_drawdown):
            if is_dd and start_idx is None:
                start_idx = i
            elif not is_dd and start_idx is not None:
                drawdown_periods.append(i - start_idx)
                start_idx = None
        
        if start_idx is not None:  # Still in drawdown at end
            drawdown_periods.append(len(in_drawdown) - start_idx)
        
        num_drawdowns = len(drawdown_periods)
        avg_drawdown_duration = np.mean(drawdown_periods) if drawdown_periods else 0.0
        max_drawdown_duration_days = max(drawdown_periods) if drawdown_periods else 0
        
        return DrawdownAnalysis(
            max_drawdown_pct=max_drawdown_pct,
            max_drawdown_duration_days=max_drawdown_duration_days,
            drawdown_start_date=drawdown_start_date,
            drawdown_end_date=max_dd_date,
            recovery_date=recovery_date,
            current_drawdown_pct=current_drawdown_pct,
            avg_drawdown_duration=avg_drawdown_duration,
            num_drawdowns=num_drawdowns
        )
    
    def compare_strategies(self, results: Dict[str, BacktestResult]) -> pd.DataFrame:
        """
        Compare multiple strategy results side by side.
        
        Args:
            results: Dictionary mapping strategy names to BacktestResult objects
            
        Returns:
            DataFrame with strategy comparison
        """
        comparison_data = []
        
        for strategy_name, result in results.items():
            metrics = self.analyze_backtest_result(result)
            
            comparison_data.append({
                'Strategy': strategy_name,
                'Total_Return_%': metrics.total_return_pct * 100,
                'Annualized_Return_%': metrics.annualized_return * 100,
                'Volatility_%': metrics.volatility * 100,
                'Sharpe_Ratio': metrics.sharpe_ratio,
                'Sortino_Ratio': metrics.sortino_ratio,
                'Max_Drawdown_%': metrics.max_drawdown * 100,
                'Calmar_Ratio': metrics.calmar_ratio,
                'Win_Rate_%': metrics.win_rate * 100,
                'Num_Trades': metrics.num_trades,
                'Profit_Factor': metrics.profit_factor,
                'VaR_95_%': metrics.var_95 * 100
            })
        
        return pd.DataFrame(comparison_data)
    
    def calculate_strategy_correlation(self, results: Dict[str, BacktestResult]) -> pd.DataFrame:
        """
        Calculate correlation matrix between strategy returns.
        
        Args:
            results: Dictionary of strategy results
            
        Returns:
            Correlation matrix DataFrame
        """
        return_series = {}
        
        for strategy_name, result in results.items():
            if not result.daily_portfolio_value.empty:
                returns = self._calculate_returns(result.daily_portfolio_value)
                return_series[strategy_name] = returns
        
        if not return_series:
            return pd.DataFrame()
        
        # Align all return series to common dates
        return_df = pd.DataFrame(return_series)
        return_df = return_df.dropna()
        
        return return_df.corr()
    
    def generate_performance_report(self, 
                                   result: BacktestResult, 
                                   benchmark_result: BacktestResult = None) -> Dict[str, Any]:
        """
        Generate comprehensive performance report.
        
        Args:
            result: Primary backtest result
            benchmark_result: Optional benchmark for comparison
            
        Returns:
            Dictionary with comprehensive performance data
        """
        metrics = self.analyze_backtest_result(result)
        drawdown_analysis = self.analyze_drawdowns(result.daily_portfolio_value)
        
        report = {
            'summary': {
                'strategy_name': result.strategy_name,
                'ticker': result.ticker,
                'period': f"{result.start_date.strftime('%Y-%m-%d')} to {result.end_date.strftime('%Y-%m-%d')}",
                'total_return_pct': metrics.total_return_pct * 100,
                'annualized_return_pct': metrics.annualized_return * 100,
                'volatility_pct': metrics.volatility * 100,
                'sharpe_ratio': metrics.sharpe_ratio,
                'max_drawdown_pct': metrics.max_drawdown * 100
            },
            'returns': {
                'total_return_dollar': metrics.total_return_dollar,
                'annualized_return': metrics.annualized_return,
                'best_month_pct': metrics.best_month * 100,
                'worst_month_pct': metrics.worst_month * 100,
                'positive_months_pct': metrics.positive_months_pct * 100
            },
            'risk': {
                'volatility': metrics.volatility,
                'var_95_pct': metrics.var_95 * 100,
                'cvar_95_pct': metrics.cvar_95 * 100,
                'max_drawdown_pct': drawdown_analysis.max_drawdown_pct * 100,
                'max_drawdown_duration_days': drawdown_analysis.max_drawdown_duration_days,
                'current_drawdown_pct': drawdown_analysis.current_drawdown_pct * 100
            },
            'risk_adjusted': {
                'sharpe_ratio': metrics.sharpe_ratio,
                'sortino_ratio': metrics.sortino_ratio,
                'calmar_ratio': metrics.calmar_ratio
            },
            'trading': {
                'num_trades': metrics.num_trades,
                'win_rate_pct': metrics.win_rate * 100,
                'avg_win_dollar': metrics.avg_win,
                'avg_loss_dollar': metrics.avg_loss,
                'profit_factor': metrics.profit_factor
            }
        }
        
        if benchmark_result:
            benchmark_metrics = self.analyze_backtest_result(benchmark_result)
            report['benchmark_comparison'] = {
                'excess_return_pct': (metrics.annualized_return - benchmark_metrics.annualized_return) * 100,
                'information_ratio': self._calculate_information_ratio(result, benchmark_result),
                'tracking_error': self._calculate_tracking_error(result, benchmark_result),
                'beta': self._calculate_beta(result, benchmark_result)
            }
        
        return report
    
    def _calculate_information_ratio(self, 
                                    strategy_result: BacktestResult, 
                                    benchmark_result: BacktestResult) -> float:
        """Calculate information ratio vs benchmark."""
        strategy_returns = self._calculate_returns(strategy_result.daily_portfolio_value)
        benchmark_returns = self._calculate_returns(benchmark_result.daily_portfolio_value)
        
        # Align returns
        aligned_returns = pd.DataFrame({
            'strategy': strategy_returns,
            'benchmark': benchmark_returns
        }).dropna()
        
        if aligned_returns.empty:
            return 0.0
        
        excess_returns = aligned_returns['strategy'] - aligned_returns['benchmark']
        
        if excess_returns.std() == 0:
            return 0.0
        
        return (excess_returns.mean() * 252) / (excess_returns.std() * np.sqrt(252))
    
    def _calculate_tracking_error(self, 
                                 strategy_result: BacktestResult, 
                                 benchmark_result: BacktestResult) -> float:
        """Calculate tracking error vs benchmark."""
        strategy_returns = self._calculate_returns(strategy_result.daily_portfolio_value)
        benchmark_returns = self._calculate_returns(benchmark_result.daily_portfolio_value)
        
        aligned_returns = pd.DataFrame({
            'strategy': strategy_returns,
            'benchmark': benchmark_returns
        }).dropna()
        
        if aligned_returns.empty:
            return 0.0
        
        excess_returns = aligned_returns['strategy'] - aligned_returns['benchmark']
        return excess_returns.std() * np.sqrt(252)
    
    def _calculate_beta(self, 
                       strategy_result: BacktestResult, 
                       benchmark_result: BacktestResult) -> float:
        """Calculate beta vs benchmark."""
        strategy_returns = self._calculate_returns(strategy_result.daily_portfolio_value)
        benchmark_returns = self._calculate_returns(benchmark_result.daily_portfolio_value)
        
        aligned_returns = pd.DataFrame({
            'strategy': strategy_returns,
            'benchmark': benchmark_returns
        }).dropna()
        
        if aligned_returns.empty or aligned_returns['benchmark'].var() == 0:
            return 0.0
        
        return aligned_returns.cov().loc['strategy', 'benchmark'] / aligned_returns['benchmark'].var()
    
    def _create_empty_metrics(self) -> PerformanceMetrics:
        """Create empty metrics for failed backtests."""
        return PerformanceMetrics(
            total_return_pct=0.0,
            total_return_dollar=0.0,
            annualized_return=0.0,
            volatility=0.0,
            max_drawdown=0.0,
            var_95=0.0,
            cvar_95=0.0,
            sharpe_ratio=0.0,
            sortino_ratio=0.0,
            calmar_ratio=0.0,
            num_trades=0,
            win_rate=0.0,
            avg_win=0.0,
            avg_loss=0.0,
            profit_factor=0.0,
            best_month=0.0,
            worst_month=0.0,
            positive_months_pct=0.0,
            start_date=pd.Timestamp.now(),
            end_date=pd.Timestamp.now(),
            trading_days=0
        )