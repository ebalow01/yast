#!/usr/bin/env python3
"""
Analyze volatility patterns and identify price drops with predictive indicators
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from yast_backtesting.core import YASTDataManager
import warnings
warnings.filterwarnings('ignore')

def calculate_volatility_metrics(data):
    """Calculate various volatility and stability metrics."""
    prices = data['Close']
    returns = prices.pct_change().dropna()
    
    # Rolling volatilities
    vol_5d = returns.rolling(5).std() * np.sqrt(252)
    vol_10d = returns.rolling(10).std() * np.sqrt(252)
    vol_20d = returns.rolling(20).std() * np.sqrt(252)
    
    # Price stability metrics
    price_range_5d = (data['High'].rolling(5).max() - data['Low'].rolling(5).min()) / prices
    
    # Drawdown calculation
    rolling_max = prices.expanding().max()
    drawdown = (prices - rolling_max) / rolling_max
    
    return {
        'returns': returns,
        'vol_5d': vol_5d,
        'vol_10d': vol_10d, 
        'vol_20d': vol_20d,
        'price_range_5d': price_range_5d,
        'drawdown': drawdown,
        'rolling_max': rolling_max
    }

def identify_major_drops(data, threshold=-0.15):
    """Identify major price drops (default: >15% decline)."""
    prices = data['Close']
    returns = prices.pct_change()
    
    # Find single-day drops
    single_day_drops = returns[returns <= threshold]
    
    # Find multi-day drops (cumulative over 5 days)
    rolling_returns = returns.rolling(5).apply(lambda x: (1 + x).prod() - 1)
    multi_day_drops = rolling_returns[rolling_returns <= threshold]
    
    # Combine and get unique dates
    all_drops = pd.concat([single_day_drops, multi_day_drops]).sort_index()
    
    return all_drops

def analyze_pre_drop_indicators(data, drop_dates, lookback_days=10):
    """Analyze price behavior before major drops."""
    metrics = calculate_volatility_metrics(data)
    
    pre_drop_analysis = []
    
    for drop_date in drop_dates.index:
        # Get data before the drop
        try:
            drop_idx = data.index.get_loc(drop_date)
            if drop_idx < lookback_days:
                continue
                
            start_idx = max(0, drop_idx - lookback_days)
            pre_drop_data = data.iloc[start_idx:drop_idx]
            
            if len(pre_drop_data) < 5:  # Need minimum data
                continue
            
            # Calculate pre-drop indicators
            pre_prices = pre_drop_data['Close']
            pre_returns = pre_prices.pct_change().dropna()
            pre_vol = pre_returns.std() * np.sqrt(252)
            
            # Volume analysis (if available)
            volume_spike = 0
            if 'Volume' in pre_drop_data.columns:
                avg_volume = pre_drop_data['Volume'].rolling(5).mean()
                recent_volume = pre_drop_data['Volume'].iloc[-3:].mean()
                volume_spike = recent_volume / avg_volume.iloc[-1] if avg_volume.iloc[-1] > 0 else 1
            
            # Price momentum
            price_momentum = (pre_prices.iloc[-1] - pre_prices.iloc[0]) / pre_prices.iloc[0]
            
            # RSI-like indicator
            gains = pre_returns[pre_returns > 0].sum()
            losses = abs(pre_returns[pre_returns < 0].sum())
            rsi_like = gains / (gains + losses) if (gains + losses) > 0 else 0.5
            
            # Volatility trend
            early_vol = pre_returns.iloc[:5].std() * np.sqrt(252) if len(pre_returns) >= 5 else pre_vol
            late_vol = pre_returns.iloc[-5:].std() * np.sqrt(252) if len(pre_returns) >= 5 else pre_vol
            vol_trend = late_vol - early_vol
            
            analysis = {
                'drop_date': drop_date,
                'drop_magnitude': drop_dates[drop_date],
                'pre_volatility': pre_vol,
                'volume_spike': volume_spike,
                'price_momentum': price_momentum,
                'rsi_like': rsi_like,
                'volatility_trend': vol_trend,
                'days_since_high': 0  # Will calculate below
            }
            
            # Days since recent high
            recent_high_idx = pre_prices.idxmax()
            days_since_high = (drop_date - recent_high_idx).days
            analysis['days_since_high'] = days_since_high
            
            pre_drop_analysis.append(analysis)
            
        except Exception as e:
            continue
    
    return pd.DataFrame(pre_drop_analysis)

def rank_tickers_by_stability():
    """Rank all tickers by stability metrics."""
    data_manager = YASTDataManager()
    all_tickers = data_manager.get_available_tickers()
    
    stability_metrics = []
    
    for ticker in all_tickers:
        try:
            data = data_manager.load_ticker_data(ticker, 'full')
            if data is None or len(data) < 30:
                continue
            
            metrics = calculate_volatility_metrics(data)
            drops = identify_major_drops(data)
            
            # Calculate stability scores
            avg_volatility = metrics['vol_20d'].mean()
            max_drawdown = metrics['drawdown'].min()
            num_major_drops = len(drops)
            
            # Stability score (lower is better)
            stability_score = avg_volatility + abs(max_drawdown) + (num_major_drops * 0.1)
            
            stability_metrics.append({
                'Ticker': ticker,
                'Avg_Volatility': avg_volatility,
                'Max_Drawdown': max_drawdown * 100,
                'Major_Drops': num_major_drops,
                'Stability_Score': stability_score,
                'Days_of_Data': len(data),
                'Date_Range': f"{data.index[0].strftime('%m/%d')} - {data.index[-1].strftime('%m/%d')}"
            })
            
        except Exception as e:
            continue
    
    df = pd.DataFrame(stability_metrics)
    return df.sort_values('Stability_Score')

def analyze_predictive_patterns():
    """Analyze patterns that might predict drops across all tickers."""
    data_manager = YASTDataManager()
    all_tickers = data_manager.get_available_tickers()
    
    all_pre_drop_data = []
    
    print("Analyzing predictive patterns across all tickers...")
    print("=" * 60)
    
    for ticker in all_tickers[:10]:  # Limit to first 10 for speed
        try:
            data = data_manager.load_ticker_data(ticker, 'full')
            if data is None or len(data) < 30:
                continue
            
            drops = identify_major_drops(data)
            if len(drops) == 0:
                continue
            
            pre_drop_analysis = analyze_pre_drop_indicators(data, drops)
            if len(pre_drop_analysis) > 0:
                pre_drop_analysis['ticker'] = ticker
                all_pre_drop_data.append(pre_drop_analysis)
                print(f"+ {ticker}: {len(drops)} major drops analyzed")
            
        except Exception as e:
            print(f"- {ticker}: Error - {str(e)}")
            continue
    
    if not all_pre_drop_data:
        print("No drop data found!")
        return None
    
    # Combine all data
    combined_df = pd.concat(all_pre_drop_data, ignore_index=True)
    
    print(f"\nTotal drops analyzed: {len(combined_df)}")
    print("\nPre-Drop Pattern Analysis:")
    print("=" * 40)
    
    # Analyze patterns
    print(f"Average pre-drop volatility: {combined_df['pre_volatility'].mean():.2f}")
    print(f"Average price momentum before drop: {combined_df['price_momentum'].mean()*100:.1f}%")
    print(f"Average days since high: {combined_df['days_since_high'].mean():.1f}")
    
    # Risk thresholds
    high_vol_threshold = combined_df['pre_volatility'].quantile(0.75)
    negative_momentum_pct = (combined_df['price_momentum'] < 0).mean() * 100
    
    print(f"\nRisk Indicators:")
    print(f"High volatility threshold (75th percentile): {high_vol_threshold:.2f}")
    print(f"Drops preceded by negative momentum: {negative_momentum_pct:.1f}%")
    
    return combined_df

def main():
    print("ETF Volatility and Drop Analysis")
    print("=" * 50)
    
    # 1. Rank tickers by stability
    print("\n1. RANKING TICKERS BY STABILITY")
    print("=" * 40)
    stability_df = rank_tickers_by_stability()
    
    print(f"{'Ticker':<6} {'Volatility':<10} {'Max DD%':<8} {'Drops':<6} {'Score':<8} {'Days':<5} {'Period':<12}")
    print("-" * 70)
    
    for _, row in stability_df.head(15).iterrows():
        print(f"{row['Ticker']:<6} {row['Avg_Volatility']:<10.2f} {row['Max_Drawdown']:<8.1f} "
              f"{row['Major_Drops']:<6.0f} {row['Stability_Score']:<8.2f} {row['Days_of_Data']:<5.0f} {row['Date_Range']:<12}")
    
    # 2. Analyze most stable tickers in detail
    print(f"\n2. DETAILED ANALYSIS OF TOP 3 MOST STABLE")
    print("=" * 50)
    
    data_manager = YASTDataManager()
    
    for _, row in stability_df.head(3).iterrows():
        ticker = row['Ticker']
        print(f"\n{ticker} - Stability Score: {row['Stability_Score']:.2f}")
        print("-" * 30)
        
        data = data_manager.load_ticker_data(ticker, 'full')
        drops = identify_major_drops(data)
        
        print(f"Total major drops (>15%): {len(drops)}")
        if len(drops) > 0:
            print(f"Average drop magnitude: {drops.mean()*100:.1f}%")
            print(f"Worst drop: {drops.min()*100:.1f}% on {drops.idxmin().strftime('%Y-%m-%d')}")
        
        # Recent volatility
        metrics = calculate_volatility_metrics(data)
        recent_vol = metrics['vol_20d'].iloc[-10:].mean()
        print(f"Recent 20-day volatility: {recent_vol:.2f}")
    
    # 3. Predictive pattern analysis
    print(f"\n3. PREDICTIVE PATTERN ANALYSIS")
    print("=" * 40)
    
    pattern_data = analyze_predictive_patterns()
    
    return stability_df, pattern_data

if __name__ == "__main__":
    stability_results, pattern_results = main()