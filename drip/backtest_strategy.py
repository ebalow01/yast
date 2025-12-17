import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict

# Load API key
env_path = Path(__file__).parent / '.env'
with open(env_path) as f:
    for line in f:
        if line.startswith('POLYGON_API_KEY='):
            POLYGON_API_KEY = line.strip().split('=', 1)[1]
            break

def get_historical_prices(ticker, start_date, end_date):
    """Fetch historical daily prices"""
    start_str = start_date.strftime('%Y-%m-%d')
    end_str = end_date.strftime('%Y-%m-%d')
    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{start_str}/{end_str}?adjusted=true&sort=asc&apiKey={POLYGON_API_KEY}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        if 'results' not in data or not data['results']:
            return pd.DataFrame()
        df = pd.DataFrame(data['results'])
        df['date'] = pd.to_datetime(df['t'], unit='ms')
        df['close'] = df['c']
        df = df[['date', 'close']].set_index('date')
        return df
    except:
        return pd.DataFrame()

def get_dividends(ticker, start_date, end_date):
    """Fetch historical dividends"""
    start_str = start_date.strftime('%Y-%m-%d')
    end_str = end_date.strftime('%Y-%m-%d')
    url = f"https://api.polygon.io/v3/reference/dividends?ticker={ticker}&ex_dividend_date.gte={start_str}&ex_dividend_date.lte={end_str}&order=asc&limit=1000&apiKey={POLYGON_API_KEY}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        if 'results' not in data or not data['results']:
            return pd.DataFrame()
        df = pd.DataFrame(data['results'])
        df['ex_dividend_date'] = pd.to_datetime(df['ex_dividend_date'])
        df['amount'] = df['cash_amount']
        df = df[['ex_dividend_date', 'amount']].set_index('ex_dividend_date')
        return df
    except:
        return pd.DataFrame()

def calculate_12wk_return(ticker, prices_df, dividends_df, as_of_date):
    """Calculate 12-week return as of a specific date"""
    # Get price as of date
    prices_on_date = prices_df[prices_df.index <= as_of_date]
    if prices_on_date.empty:
        return None
    current_price = prices_on_date.iloc[-1]['close']

    # Get price 12 weeks ago
    date_12w_ago = as_of_date - timedelta(weeks=12)
    prices_12w_ago = prices_df[prices_df.index <= date_12w_ago]
    if prices_12w_ago.empty:
        return None
    price_12w_ago = prices_12w_ago.iloc[-1]['close']

    # Price return
    price_return = ((current_price - price_12w_ago) / price_12w_ago) * 100

    # Get dividends up to this date
    divs_up_to_date = dividends_df[dividends_df.index <= as_of_date]
    if len(divs_up_to_date) < 12:
        return None  # Need at least 12 dividends for full calculation

    # Last 3 dividends
    last_3 = divs_up_to_date.tail(3)['amount'].values
    median_last_3 = np.median(last_3)

    # 10-12th most recent dividends
    divs_10_12 = divs_up_to_date.tail(12).head(3)['amount'].values
    if len(divs_10_12) < 3:
        return None
    median_10_12 = np.median(divs_10_12)

    # Dividend variance (capped at ±20%)
    if median_10_12 > 0:
        div_variance = ((median_last_3 / median_10_12) - 1) * 100
        div_variance = max(-20, min(20, div_variance))
    else:
        div_variance = 0

    # Forward yield
    most_recent_div = divs_up_to_date.iloc[-1]['amount']
    forward_yield = (most_recent_div * 52 / current_price) * 100

    # Total 12wk return
    total_return = price_return + forward_yield + div_variance

    return {
        'ticker': ticker,
        'date': as_of_date,
        'price': current_price,
        'price_return': price_return,
        'forward_yield': forward_yield,
        'div_variance': div_variance,
        'total_return': total_return
    }

# Weekly dividend ETF universe (common ones)
TICKERS = [
    'TSLY', 'NVDY', 'CONY', 'MSTY', 'APLY', 'YQQQ', 'YBIT',
    'AMZY', 'GOOY', 'PYPY', 'TSMY', 'IWMY', 'MAGY', 'AIYY',
    'QQQY', 'SPY', 'ULTY', 'FIAT', 'WETH', 'YETH', 'XRPY',
    'PLTW', 'NFLW', 'COIW', 'NVDW', 'METW', 'AAPW', 'AMZW', 'BRKW',
    'TSLW', 'HOOW', 'LFGY', 'NVII', 'BCCC'
]

# Backtest parameters
BACKTEST_MONTHS = 4
BACKTEST_WEEKS = 16  # 4 months
LOOKBACK_WEEKS = 12  # Need 12 weeks to calculate 12wk return
TOTAL_WEEKS = BACKTEST_WEEKS + LOOKBACK_WEEKS  # 28 weeks total

end_date = datetime.now()
start_date = end_date - timedelta(weeks=TOTAL_WEEKS)

print(f"{'='*90}")
print(f"YAST STRATEGY BACKTEST - {BACKTEST_MONTHS} Months")
print(f"{'='*90}")
print(f"Period: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
print(f"Total data lookback: {TOTAL_WEEKS} weeks")
print(f"Backtest period: {BACKTEST_WEEKS} weeks\n")

# Fetch all data
print("Fetching historical data...")
ticker_data = {}
for ticker in TICKERS:
    prices = get_historical_prices(ticker, start_date, end_date)
    dividends = get_dividends(ticker, start_date, end_date)

    # Check if we have enough data
    if not prices.empty and not dividends.empty and len(dividends) >= 12:
        ticker_data[ticker] = {
            'prices': prices,
            'dividends': dividends
        }

print(f"Loaded {len(ticker_data)} tickers with sufficient history\n")

# Generate weekly simulation dates (every Monday for last 4 months)
simulation_dates = []
current_sim_date = end_date - timedelta(weeks=BACKTEST_WEEKS)
while current_sim_date <= end_date:
    # Adjust to nearest market day if needed
    simulation_dates.append(current_sim_date)
    current_sim_date += timedelta(weeks=1)

print(f"Simulating {len(simulation_dates)} weeks...\n")
print(f"{'='*90}")

# Portfolio state
portfolio = {}  # ticker -> {shares, cost_basis, entry_date}
POSITION_SIZE = 50000
# Unlimited capital - can always buy top 5

# Track performance
performance_log = []

# Simulate each week
for week_idx, sim_date in enumerate(simulation_dates):
    # Calculate 12wk returns for all tickers
    returns_this_week = []
    for ticker in ticker_data:
        result = calculate_12wk_return(
            ticker,
            ticker_data[ticker]['prices'],
            ticker_data[ticker]['dividends'],
            sim_date
        )
        if result:
            returns_this_week.append(result)

    if not returns_this_week:
        continue

    # Sort by total return
    returns_df = pd.DataFrame(returns_this_week)
    returns_df = returns_df.sort_values('total_return', ascending=False)

    # Identify top 5
    top_5_tickers = set(returns_df.head(5)['ticker'].tolist())

    # SELL: Only holdings below 20%
    to_sell = []
    for ticker in list(portfolio.keys()):
        ticker_return = returns_df[returns_df['ticker'] == ticker]['total_return'].values
        if len(ticker_return) > 0 and ticker_return[0] < 20:
            to_sell.append(ticker)

    for ticker in to_sell:
        position = portfolio[ticker]
        current_price = returns_df[returns_df['ticker'] == ticker]['price'].values[0]
        proceeds = position['shares'] * current_price
        profit = proceeds - position['cost_basis']
        del portfolio[ticker]
        print(f"Week {week_idx+1}: SELL {ticker} @ ${current_price:.2f} (below 20%) - Proceeds: ${proceeds:,.0f} (P&L: ${profit:+,.0f})")

    # BUY: All top 5 not yet held (unlimited capital)
    for ticker in top_5_tickers:
        if ticker not in portfolio:
            ticker_price = returns_df[returns_df['ticker'] == ticker]['price'].values[0]
            shares = POSITION_SIZE / ticker_price
            portfolio[ticker] = {
                'shares': shares,
                'cost_basis': POSITION_SIZE,
                'entry_date': sim_date
            }
            print(f"Week {week_idx+1}: BUY  {ticker} @ ${ticker_price:.2f} - ${POSITION_SIZE:,.0f} ({shares:.2f} shares)")

    # HOLD: Everything else >20% stays (implicit - we just don't sell them)

    # Calculate portfolio value
    portfolio_value = 0
    for ticker, position in portfolio.items():
        ticker_price = returns_df[returns_df['ticker'] == ticker]['price'].values[0]
        portfolio_value += position['shares'] * ticker_price

    # Get SPY for benchmark
    spy_price_result = calculate_12wk_return(
        'SPY',
        ticker_data.get('SPY', {}).get('prices', pd.DataFrame()),
        ticker_data.get('SPY', {}).get('dividends', pd.DataFrame()),
        sim_date
    )
    spy_return = spy_price_result['total_return'] if spy_price_result else 0

    performance_log.append({
        'week': week_idx + 1,
        'date': sim_date,
        'portfolio_value': portfolio_value,
        'positions': len(portfolio),
        'top_ticker': returns_df.iloc[0]['ticker'],
        'top_return': returns_df.iloc[0]['total_return'],
        'spy_return': spy_return
    })

    if week_idx == 0 or week_idx == len(simulation_dates) - 1:
        print(f"Week {week_idx+1}: Portfolio Value: ${portfolio_value:,.0f} | Positions: {len(portfolio)}")
        print()

# Final summary
print(f"{'='*90}")
print("BACKTEST RESULTS")
print(f"{'='*90}\n")

perf_df = pd.DataFrame(performance_log)

# Calculate initial capital deployed (first week's portfolio value)
initial_value = perf_df.iloc[0]['portfolio_value'] if len(perf_df) > 0 else 0
final_value = perf_df.iloc[-1]['portfolio_value']
total_return = ((final_value - initial_value) / initial_value) * 100 if initial_value > 0 else 0

print(f"Initial Capital Deployed: ${initial_value:,.0f}")
print(f"Final Portfolio Value: ${final_value:,.0f}")
print(f"Total Return: {total_return:+.2f}%")
print(f"Time Period: {BACKTEST_MONTHS} months ({BACKTEST_WEEKS} weeks)")
print(f"\nAverage SPY 12wk Return: {perf_df['spy_return'].mean():.2f}%")
print(f"Average Top Ticker Return: {perf_df['top_return'].mean():.2f}%")
print(f"\nAverage Positions Held: {perf_df['positions'].mean():.1f}")
print(f"Max Positions Held: {perf_df['positions'].max()}")

# Weekly performance
perf_df['strategy_weekly_return'] = perf_df['portfolio_value'].pct_change() * 100
print(f"\nStrategy Weekly Performance:")
print(f"  Mean: {perf_df['strategy_weekly_return'].mean():.2f}%")
print(f"  Std Dev: {perf_df['strategy_weekly_return'].std():.2f}%")
print(f"  Best Week: {perf_df['strategy_weekly_return'].max():.2f}%")
print(f"  Worst Week: {perf_df['strategy_weekly_return'].min():.2f}%")

print(f"\n{'='*90}")
