# Contributing to YieldMax ETF Analysis System

Thank you for your interest in contributing to the YieldMax ETF Analysis System!

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/yast.git
   cd yast
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the analysis** to make sure everything works:
   ```bash
   python multi_ticker_orchestrator.py
   ```

## 📋 Development Guidelines

### Code Style
- Follow PEP 8 style guidelines
- Use descriptive function names and docstrings
- Keep file sizes under 500 lines when possible
- Include informative print statements for user feedback

### Testing
- Test any new features with sample data
- Ensure all strategies work with the existing ticker set
- Validate that new tickers follow the same data patterns

### Documentation
- Update README.md for new features
- Add docstrings to all new functions
- Include examples in code comments

## 🎯 Areas for Contribution

### New Features
- **Additional YieldMax ETFs**: Add support for new YieldMax ETFs
- **Trading Strategies**: Implement new dividend capture strategies
- **Visualization**: Add matplotlib/plotly charts
- **Risk Metrics**: Implement additional risk assessment metrics
- **Data Export**: Add Excel, JSON, or other export formats

### Improvements
- **Performance**: Optimize data processing speed
- **Error Handling**: Improve robustness for edge cases
- **User Interface**: Enhance the React frontend
- **Documentation**: Improve setup and usage guides

### Bug Fixes
- **Data Quality**: Fix data processing issues
- **Compatibility**: Address platform-specific problems
- **Edge Cases**: Handle unusual market conditions

## 📝 Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the guidelines above

3. **Test thoroughly**:
   - Run the full analysis: `python multi_ticker_orchestrator.py`
   - Test with different tickers
   - Verify output files are generated correctly

4. **Commit your changes**:
   ```bash
   # Option 1: Auto-stage all tracked files (recommended)
   git commit -am "Add: Brief description of your changes"
   
   # Option 2: Traditional approach
   git add .
   git commit -m "Add: Brief description of your changes"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub with:
   - Clear description of changes
   - Screenshots (if applicable)
   - Test results

## 🐛 Bug Reports

When reporting bugs, please include:
- **Python version** and operating system
- **Error messages** (full traceback)
- **Steps to reproduce** the issue
- **Expected vs actual behavior**

## 💡 Feature Requests

For new features, please:
- **Check existing issues** first
- **Describe the use case** clearly
- **Provide examples** of expected output
- **Consider implementation complexity**

## 📊 Data and Market Considerations

- **Market Data**: Remember that market data can be volatile
- **Dividend Patterns**: YieldMax ETFs may change dividend schedules
- **Risk Disclosure**: This is for educational purposes only
- **Data Sources**: yfinance API limitations may affect data quality

## 🤝 Code of Conduct

- Be respectful and constructive
- Focus on the code and analysis, not personal opinions
- Help others learn and improve
- Follow professional communication standards

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🆘 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Documentation**: Check README.md and code comments
- **Code Review**: Submit PRs for feedback and guidance

Thank you for contributing to the YieldMax ETF Analysis System! 🎉
