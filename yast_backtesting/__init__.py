"""
YAST Backtesting System
======================

A comprehensive backtesting framework for the YAST weekly dividend ETF strategy.

Core Components:
- data_manager: Enhanced data loading and validation
- strategy_engine: Unified strategy backtesting with standardized interface
- portfolio_optimizer: Modern Portfolio Theory with YAST-specific constraints
- performance_analyzer: Comprehensive risk metrics and analytics

Usage:
    from yast_backtesting.core import YASTDataManager, YASTStrategyEngine
    from yast_backtesting.core import YASTPortfolioOptimizer, YASTPerformanceAnalyzer
    
    # Initialize components
    data_manager = YASTDataManager()
    strategy_engine = YASTStrategyEngine()
    
    # Load data and run backtest
    data = data_manager.load_ticker_data('ULTY', 'full')
    result = strategy_engine.backtest_strategy(StrategyType.DIVIDEND_CAPTURE, data, 'ULTY')
"""

__version__ = "1.0.0"
__author__ = "YAST Backtesting Team"

from .core.data_manager import YASTDataManager
from .core.strategy_engine import YASTStrategyEngine, StrategyType, BacktestResult, Trade
from .core.portfolio_optimizer import YASTPortfolioOptimizer, PortfolioETF, OptimizationResult
from .core.performance_analyzer import YASTPerformanceAnalyzer, PerformanceMetrics, DrawdownAnalysis

__all__ = [
    'YASTDataManager',
    'YASTStrategyEngine', 
    'StrategyType',
    'BacktestResult',
    'Trade',
    'YASTPortfolioOptimizer',
    'PortfolioETF', 
    'OptimizationResult',
    'YASTPerformanceAnalyzer',
    'PerformanceMetrics',
    'DrawdownAnalysis'
]