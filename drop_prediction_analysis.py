#!/usr/bin/env python3
"""
Advanced drop prediction analysis with specific indicators
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from yast_backtesting.core import YASTDataManager
import warnings
warnings.filterwarnings('ignore')

def calculate_technical_indicators(data, window=10):
    """Calculate technical indicators that might predict drops."""
    prices = data['Close']
    returns = prices.pct_change().dropna()
    
    indicators = {}
    
    # 1. RSI (Relative Strength Index)
    gains = returns.where(returns > 0, 0).rolling(window).mean()
    losses = -returns.where(returns < 0, 0).rolling(window).mean()
    rs = gains / losses
    indicators['rsi'] = 100 - (100 / (1 + rs))
    
    # 2. Bollinger Bands position
    sma = prices.rolling(window).mean()
    std = prices.rolling(window).std()
    indicators['bb_position'] = (prices - sma) / (2 * std)  # Position within bands
    
    # 3. Moving Average convergence
    sma_short = prices.rolling(5).mean()
    sma_long = prices.rolling(window).mean()
    indicators['ma_convergence'] = (sma_short - sma_long) / sma_long
    
    # 4. Volume surge (if available)
    if 'Volume' in data.columns:
        vol_avg = data['Volume'].rolling(window).mean()
        indicators['volume_ratio'] = data['Volume'] / vol_avg
    else:
        indicators['volume_ratio'] = pd.Series(1.0, index=prices.index)
    
    # 5. Volatility spike
    vol_short = returns.rolling(5).std()
    vol_long = returns.rolling(window).std()
    indicators['vol_spike'] = vol_short / vol_long
    
    # 6. Consecutive down days
    down_days = (returns < 0).astype(int)
    indicators['consecutive_down'] = down_days.rolling(5).sum()
    
    # 7. Price acceleration (2nd derivative)
    price_change = prices.pct_change()
    price_accel = price_change.diff()
    indicators['price_acceleration'] = price_accel.rolling(3).mean()
    
    return indicators

def create_drop_prediction_model(data, indicators, lookback=5):
    """Create simple prediction model based on indicators."""
    
    # Define what constitutes a "drop" in next 1-3 days
    future_returns = data['Close'].pct_change().shift(-1).rolling(3).min()  # Worst return in next 3 days
    drop_labels = (future_returns < -0.10).astype(int)  # 10%+ drop
    
    # Create feature matrix
    features = []
    feature_names = []
    
    for name, indicator in indicators.items():
        if indicator is not None and len(indicator) > 0:
            # Use recent values as features
            for lag in range(lookback):
                feature_col = indicator.shift(lag)
                features.append(feature_col)
                feature_names.append(f"{name}_lag{lag}")
    
    if not features:
        return None, None, None
    
    feature_matrix = pd.concat(features, axis=1)
    feature_matrix.columns = feature_names
    
    # Remove rows with NaN
    valid_data = pd.concat([feature_matrix, drop_labels], axis=1).dropna()
    
    if len(valid_data) < 10:
        return None, None, None
    
    X = valid_data.iloc[:, :-1]
    y = valid_data.iloc[:, -1]
    
    return X, y, feature_names

def analyze_drop_warning_signals():
    """Analyze current warning signals across all tickers."""
    data_manager = YASTDataManager()
    all_tickers = data_manager.get_available_tickers()
    
    current_warnings = []
    
    print("Current Drop Warning Analysis")
    print("=" * 50)
    print(f"{'Ticker':<6} {'RSI':<6} {'BB Pos':<8} {'Vol Spike':<10} {'Down Days':<10} {'Warning':<8}")
    print("-" * 60)
    
    for ticker in all_tickers:
        try:
            data = data_manager.load_ticker_data(ticker, 'full')
            if data is None or len(data) < 20:
                continue
            
            indicators = calculate_technical_indicators(data)
            
            # Get most recent values
            latest_rsi = indicators['rsi'].iloc[-1] if not indicators['rsi'].empty else 50
            latest_bb = indicators['bb_position'].iloc[-1] if not indicators['bb_position'].empty else 0
            latest_vol_spike = indicators['vol_spike'].iloc[-1] if not indicators['vol_spike'].empty else 1
            latest_down_days = indicators['consecutive_down'].iloc[-1] if not indicators['consecutive_down'].empty else 0
            
            # Warning criteria
            warning_score = 0
            warnings = []
            
            if latest_rsi > 70:  # Overbought
                warning_score += 1
                warnings.append("RSI")
            if latest_bb > 1:  # Above upper Bollinger Band
                warning_score += 1
                warnings.append("BB")
            if latest_vol_spike > 2:  # High volatility
                warning_score += 1
                warnings.append("VOL")
            if latest_down_days >= 3:  # Multiple down days
                warning_score += 1
                warnings.append("DOWN")
            
            warning_level = "HIGH" if warning_score >= 3 else "MED" if warning_score >= 2 else "LOW"
            
            current_warnings.append({
                'Ticker': ticker,
                'RSI': latest_rsi,
                'BB_Position': latest_bb,
                'Vol_Spike': latest_vol_spike,
                'Down_Days': latest_down_days,
                'Warning_Score': warning_score,
                'Warning_Level': warning_level,
                'Signals': ', '.join(warnings)
            })
            
            print(f"{ticker:<6} {latest_rsi:<6.1f} {latest_bb:<8.2f} {latest_vol_spike:<10.2f} {latest_down_days:<10.0f} {warning_level:<8}")
            
        except Exception as e:
            continue
    
    warnings_df = pd.DataFrame(current_warnings)
    
    # Summary
    print("\nWARNING SUMMARY:")
    print("-" * 20)
    high_warnings = warnings_df[warnings_df['Warning_Level'] == 'HIGH']
    med_warnings = warnings_df[warnings_df['Warning_Level'] == 'MED']
    
    print(f"HIGH risk tickers: {len(high_warnings)}")
    if len(high_warnings) > 0:
        for _, row in high_warnings.iterrows():
            print(f"  {row['Ticker']}: {row['Signals']}")
    
    print(f"MEDIUM risk tickers: {len(med_warnings)}")
    if len(med_warnings) > 0:
        for _, row in med_warnings.head(5).iterrows():
            print(f"  {row['Ticker']}: {row['Signals']}")
    
    return warnings_df

def detailed_ticker_analysis(ticker):
    """Detailed analysis of a specific ticker's drop patterns."""
    data_manager = YASTDataManager()
    data = data_manager.load_ticker_data(ticker, 'full')
    
    if data is None:
        print(f"No data found for {ticker}")
        return
    
    print(f"\nDetailed Analysis: {ticker}")
    print("=" * 40)
    
    # Calculate indicators
    indicators = calculate_technical_indicators(data)
    
    # Find historical drops
    returns = data['Close'].pct_change()
    major_drops = returns[returns <= -0.15]
    
    print(f"Historical major drops (>15%): {len(major_drops)}")
    
    if len(major_drops) > 0:
        print("\nPre-drop indicator analysis:")
        
        for drop_date in major_drops.index[-3:]:  # Last 3 drops
            print(f"\nDrop on {drop_date.strftime('%Y-%m-%d')} ({major_drops[drop_date]*100:.1f}%)")
            
            # Get indicators 5 days before drop
            try:
                drop_idx = data.index.get_loc(drop_date)
                if drop_idx >= 5:
                    pre_drop_idx = drop_idx - 5
                    
                    pre_rsi = indicators['rsi'].iloc[pre_drop_idx:drop_idx].mean()
                    pre_bb = indicators['bb_position'].iloc[pre_drop_idx:drop_idx].mean()
                    pre_vol = indicators['vol_spike'].iloc[pre_drop_idx:drop_idx].mean()
                    pre_down = indicators['consecutive_down'].iloc[drop_idx-1]
                    
                    print(f"  5-day avg RSI before: {pre_rsi:.1f}")
                    print(f"  5-day avg BB position: {pre_bb:.2f}")
                    print(f"  5-day avg vol spike: {pre_vol:.2f}")
                    print(f"  Consecutive down days: {pre_down:.0f}")
                    
            except Exception as e:
                continue
    
    # Current status
    print(f"\nCurrent Status:")
    latest_rsi = indicators['rsi'].iloc[-1]
    latest_bb = indicators['bb_position'].iloc[-1]
    latest_vol = indicators['vol_spike'].iloc[-1]
    latest_down = indicators['consecutive_down'].iloc[-1]
    
    print(f"Current RSI: {latest_rsi:.1f}")
    print(f"Current BB position: {latest_bb:.2f}")
    print(f"Current vol spike: {latest_vol:.2f}")
    print(f"Recent down days: {latest_down:.0f}")
    
    # Risk assessment
    risk_factors = []
    if latest_rsi > 70:
        risk_factors.append("Overbought (RSI > 70)")
    if latest_bb > 1:
        risk_factors.append("Above Bollinger upper band")
    if latest_vol > 2:
        risk_factors.append("High volatility spike")
    if latest_down >= 3:
        risk_factors.append("Multiple consecutive down days")
    
    if risk_factors:
        print(f"\nRISK FACTORS:")
        for factor in risk_factors:
            print(f"  - {factor}")
    else:
        print(f"\nNo major risk factors detected")

def main():
    print("Drop Prediction Analysis System")
    print("=" * 40)
    
    # 1. Current warning analysis
    warnings_df = analyze_drop_warning_signals()
    
    # 2. Focus on most stable tickers with any warnings
    print(f"\n\nFOCUS ANALYSIS: Stable tickers with warnings")
    print("=" * 50)
    
    stable_tickers = ['GLDY', 'MAGY', 'TQQY', 'YSPY', 'CHPY', 'USOY', 'BCCC']
    
    for ticker in stable_tickers:
        ticker_warning = warnings_df[warnings_df['Ticker'] == ticker]
        if not ticker_warning.empty:
            warning_level = ticker_warning.iloc[0]['Warning_Level']
            if warning_level in ['HIGH', 'MED']:
                detailed_ticker_analysis(ticker)
    
    return warnings_df

if __name__ == "__main__":
    results = main()