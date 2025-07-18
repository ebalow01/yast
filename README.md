# Weekly Distribution ETF Portfolio Income Generator

A comprehensive Python analysis system for 25 weekly distribution ETFs, focusing on dividend capture strategies and performance comparison with risk-balanced portfolio optimization.

## Features
- **Multi-Ticker Analysis**: Processes all 25 weekly distribution ETFs simultaneously
- **Strategy Comparison**: Buy & Hold vs Multiple Dividend Capture Strategies
- **Risk-Balanced Assessment**: Calculates annualized volatility and Sharpe ratios for income optimization
- **SPY Benchmarking**: Compares performance against market benchmark
- **Comprehensive Tables**: Automatically generates sorted performance tables by return categories
- **Weekly Distribution Analysis**: Tracks dividend patterns and optimal trading windows for income generation
- **Multi-Provider Support**: Supports YieldMax, Roundhill, and other weekly distribution ETF providers
- **Automated Orchestration**: Single command runs complete analysis pipeline

## Quick Start

### Prerequisites
- Python 3.8+ 
- pip package manager

### Installation
1. Clone/download this repository
2. Install dependencies:
```bash
pip install -r requirements.txt
```

### Usage
Run the complete analysis:
```bash
python multi_ticker_orchestrator.py
```

This will:
1. Download latest data for all 25 YieldMax ETFs
2. Analyze dividend patterns and strategies for each ticker
3. Compare performance across all tickers
4. Generate comprehensive sorted analysis tables
5. Save all results to timestamped files

### Output Files
- `comprehensive_sorted_table_YYYYMMDD_HHMMSS.txt` - Main results table sorted by performance
- `multi_ticker_analysis_YYYYMMDD_HHMMSS.txt` - Detailed analysis summary
- `data/[TICKER]_*.csv` - Individual ticker data files (price, dividend, full data)

## Tickers Analyzed
**25 Weekly Distribution ETFs**: ULTY, YMAX, YMAG, LFGY, GPTY, SDTY, QDTY, RDTY, CHPY, NFLW, IWMY, AMZW, MSII, RDTE, AAPW, COII, MST, BLOX, BRKW, COIW, HOOW, METW, NVDW, PLTW, TSLW

## Strategies Compared
- **Buy & Hold**: Simple buy and hold with dividend reinvestment
- **Dividend Capture**: Buy before ex-dividend, sell after collecting dividend
- **DD to DD+4**: Buy on dividend day, sell 4 days later
- **DD+2 to DD+4**: Buy 2 days after dividend, sell 4 days after

## Key Metrics
- Total returns and percentages
- Risk-adjusted performance (Sharpe ratio, annualized volatility)
- Win rates and maximum drawdown
- Median dividend amounts
- SPY benchmark comparison
- Market exposure analysis

## Architecture
- **Modular Design**: Each analysis component is in its own module
- **Consistent Data Flow**: All modules use the same data processor for consistency
- **Automated Orchestration**: Single command runs complete analysis pipeline
- **Flexible Configuration**: Easy to add new tickers or modify analysis parameters

## File Structure
```
yast/
├── multi_ticker_orchestrator.py    # Main orchestrator - coordinates all analysis
├── multi_ticker_data_processor.py  # Data download/processing for all tickers
├── ulty_dividend_capture_main.py   # Dividend capture strategies
├── ulty_trading_strategies_main.py # Trading strategy backtests
├── ulty_weekly_analysis_main.py    # Weekly pattern analysis
├── requirements.txt                # Python dependencies
├── setup.py                       # Setup and installation script
├── data/                          # Downloaded data (auto-created)
├── yast-react/                    # React web interface (optional)
└── README.md                      # This file
```

## Example Output
```
HIGH PERFORMERS (>50% RETURNS, SORTED BY BEST STRATEGY PERFORMANCE)
Ticker   Days   Ex-Div Day   Buy & Hold   Div Capture  Best Strategy   Final Value  DC Win Rate  Risk (Vol)   Median Div  
YMAX     42     Thursday     94.94%       99.40%       DC: 99.40%      $199,396     92.9%        26.7%        $0.172      
YMAG     42     Thursday     65.53%       75.33%       DC: 75.33%      $175,328     85.7%        25.5%        $0.158      
LFGY     24     Thursday     35.09%       74.10%       DC: 74.10%      $174,101     87.5%        48.8%        $0.475      
ULTY     17     Thursday     60.93%       44.11%       B&H: 60.93%     $160,925     88.2%        33.5%        $0.095      
```

## Dependencies
- **yfinance**: For downloading stock market data
- **pandas**: For data manipulation and analysis
- **numpy**: For numerical operations and statistics
- **datetime**: For date handling and timestamp generation

## Requirements
- Python 3.8+
- yfinance >= 0.2.28
- pandas >= 2.0.0
- numpy >= 1.24.0
- Internet connection for data download
- ~2-3 minutes runtime for full analysis
- Windows/Mac/Linux compatible

## Performance Summary
- **16 of 18 YieldMax ETFs** outperformed SPY's benchmark return
- **Best Overall**: YMAX with 99.40% return (8.4x SPY)
- **Highest Dividend ETFs**: LFGY ($0.475), NFLW ($0.459), AMZW ($0.393)
- **Risk-Adjusted Winners**: Multiple ETFs achieved higher returns than SPY with lower risk

## Error Handling
The system includes comprehensive error handling for:
- Network connectivity issues
- Invalid ticker symbols
- Data availability problems
- File writing errors
- Unicode encoding issues (Windows compatibility)

## Customization
You can extend this project by:
- Adding new YieldMax ETFs to the analysis
- Implementing additional trading strategies
- Adding data visualization with matplotlib/plotly
- Creating automated scheduling for daily analysis updates
- Adding more sophisticated risk metrics
- Implementing different export formats (Excel, JSON, etc.)
- Creating React web interface for results visualization

## Troubleshooting
- If download fails, check internet connection
- Ensure Python 3.8+ is installed
- Try running `pip install --upgrade yfinance` if data issues occur
- For Windows users: Output files are automatically saved with Unicode compatibility

## License
This project is open source and available under the MIT License.
