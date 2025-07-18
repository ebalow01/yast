<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Weekly Distribution ETF Portfolio Income Generator - Copilot Instructions

This is a comprehensive Python analysis system for 25 weekly distribution ETFs, focusing on dividend capture strategies and performance comparison with risk-balanced portfolio optimization.

## Project Context
- **Main Orchestrator**: `multi_ticker_orchestrator.py` - Coordinates analysis across all 25 weekly distribution ETFs
- **Core Data Processor**: `multi_ticker_data_processor.py` - Downloads and processes ticker data
- **Strategy Modules**: 
  - `ulty_weekly_analysis_main.py` - Weekly dividend pattern analysis
  - `ulty_trading_strategies_main.py` - DD to DD+4 and DD+2 to DD+4 strategies
  - `ulty_dividend_capture_main.py` - Best dividend capture strategy and market exposure analysis
- **Data Storage**: CSV files saved in the `data/` directory (price, dividend, full data for each ticker)
- **Target ETFs**: 25 weekly distribution ETFs (ULTY, YMAX, YMAG, LFGY, GPTY, SDTY, QDTY, RDTY, CHPY, NFLW, IWMY, AMZW, MSII, RDTE, AAPW, COII, MST, BLOX, BRKW, COIW, HOOW, METW, NVDW, PLTW, TSLW)
- **Output**: Comprehensive sorted analysis tables comparing all strategies with risk-balanced performance metrics

## Key Features
- **Automated Multi-Ticker Analysis**: Processes all 25 ETFs with consistent methodology
- **Strategy Comparison**: Buy & Hold vs Multiple Dividend Capture Strategies
- **Risk-Balanced Assessment**: Calculates annualized volatility and Sharpe ratios for income optimization
- **SPY Benchmarking**: Compares performance against market benchmark
- **Comprehensive Tables**: Automatically generates sorted performance tables by return categories
- **Weekly Distribution Analysis**: Tracks dividend patterns and optimal trading windows for income generation
- **Multi-Provider Support**: Supports YieldMax, Roundhill, and other weekly distribution ETF providers

## Code Style Guidelines
- Use descriptive function names and docstrings
- Handle errors gracefully with try-except blocks
- Include informative print statements for user feedback
- Save data in multiple formats (full data, price only, dividends only)
- Use pandas for data manipulation and analysis
- Follow PEP 8 style guidelines
- Keep file sizes under 500 lines when possible to avoid issues with copilot
- Always tee terminal output to files for review (terminal visibility bug)

## Architecture
- **Modular Design**: Each analysis component is in its own module
- **Consistent Data Flow**: All modules use the same data processor for consistency
- **Automated Orchestration**: Single command runs complete analysis pipeline
- **Flexible Configuration**: Easy to add new tickers or modify analysis parameters

## Common Tasks
When extending this project, consider:
- Adding new weekly distribution ETFs from various providers (YieldMax, Roundhill, etc.)
- Implementing additional income-focused trading strategies
- Adding monthly distribution ETFs for broader portfolio coverage
- Adding data visualization with matplotlib/plotly for income analysis
- Creating automated scheduling for daily portfolio income updates
- Adding more sophisticated risk-adjusted income metrics
- Implementing different export formats (Excel, JSON, etc.)
- Creating React web interface for portfolio income visualization
- Adding portfolio optimization for income vs risk balance

## Dependencies
- yfinance: For downloading stock market data
- pandas: For data manipulation and analysis
- numpy: For numerical operations and statistics
- datetime: For date handling and timestamp generation

## Usage
Run the complete analysis with:
```bash
python multi_ticker_orchestrator.py
```

This will:
1. Download latest data for all 25 weekly distribution ETFs
2. Analyze dividend patterns and strategies for each ticker
3. Compare performance across all tickers with risk-balanced metrics
4. Generate comprehensive sorted analysis tables for income optimization
5. Save all results to timestamped files

## Output Files
- `comprehensive_sorted_table_YYYYMMDD_HHMMSS.txt` - Main results table sorted by performance
- `multi_ticker_analysis_YYYYMMDD_HHMMSS.txt` - Detailed analysis summary
- `data/[TICKER]_*.csv` - Individual ticker data files (price, dividend, full data)

there's a bug where copilot doesn't see the terminal.  Always tee the output to a file so you can review it.
keep file sizes under 500 lines when possible to avoid issues with copilot.