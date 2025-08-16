#!/usr/bin/env python3
"""
Daily Risk Monitoring System
Real-time tracking of technical indicators for early drop warning signals
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from yast_backtesting.core import YASTDataManager
import warnings
warnings.filterwarnings('ignore')

class DailyRiskMonitor:
    """Daily monitoring system for drop prediction indicators."""
    
    def __init__(self):
        self.data_manager = YASTDataManager()
        
        # Risk thresholds based on analysis
        self.thresholds = {
            'rsi_overbought': 70,
            'rsi_oversold': 30,
            'bb_upper': 1.0,
            'bb_lower': -1.0,
            'vol_spike': 2.0,
            'consecutive_down': 3,
            'negative_momentum_days': 5
        }
        
        # Portfolio focus tickers (low volatility winners)
        self.focus_tickers = ['WEEK', 'MMKT', 'CHPY', 'NVYY', 'NVII', 'QDTE', 'YMAX', 'MAGY']
        
        # All tickers for broader monitoring
        self.all_tickers = self.data_manager.get_available_tickers()
    
    def calculate_daily_indicators(self, data, window=14):
        """Calculate all technical indicators for monitoring."""
        prices = data['Close']
        returns = prices.pct_change().dropna()
        
        indicators = {}
        
        # 1. RSI
        gains = returns.where(returns > 0, 0).rolling(window).mean()
        losses = -returns.where(returns < 0, 0).rolling(window).mean()
        rs = gains / losses
        indicators['rsi'] = 100 - (100 / (1 + rs))
        
        # 2. Bollinger Bands position
        sma = prices.rolling(window).mean()
        std = prices.rolling(window).std()
        indicators['bb_position'] = (prices - sma) / (2 * std)
        
        # 3. Volatility spike
        vol_short = returns.rolling(5).std() * np.sqrt(252)
        vol_long = returns.rolling(window).std() * np.sqrt(252)
        indicators['vol_spike'] = vol_short / vol_long
        
        # 4. Consecutive down days
        down_days = (returns < 0).astype(int)
        indicators['consecutive_down'] = down_days.rolling(5, min_periods=1).sum()
        
        # 5. Price momentum (5-day)
        indicators['momentum_5d'] = (prices / prices.shift(5)) - 1
        
        # 6. Volume surge (if available)
        if 'Volume' in data.columns and data['Volume'].sum() > 0:
            vol_avg = data['Volume'].rolling(window).mean()
            indicators['volume_surge'] = data['Volume'] / vol_avg
        else:
            indicators['volume_surge'] = pd.Series(1.0, index=prices.index)
        
        # 7. Distance from recent high
        rolling_max = prices.rolling(20).max()
        indicators['distance_from_high'] = (prices / rolling_max) - 1
        
        return indicators
    
    def assess_risk_level(self, indicators):
        """Assess current risk level based on indicators."""
        latest = {}
        risk_signals = []
        
        # Get latest values
        for name, series in indicators.items():
            if len(series) > 0:
                latest[name] = series.iloc[-1]
            else:
                latest[name] = 0
        
        # Check each risk threshold
        if latest.get('rsi', 50) > self.thresholds['rsi_overbought']:
            risk_signals.append(f"RSI Overbought ({latest['rsi']:.1f})")
        
        if latest.get('bb_position', 0) > self.thresholds['bb_upper']:
            risk_signals.append(f"Above BB Upper ({latest['bb_position']:.2f})")
        
        if latest.get('vol_spike', 1) > self.thresholds['vol_spike']:
            risk_signals.append(f"Vol Spike ({latest['vol_spike']:.2f}x)")
        
        if latest.get('consecutive_down', 0) >= self.thresholds['consecutive_down']:
            risk_signals.append(f"Consecutive Down ({latest['consecutive_down']:.0f} days)")
        
        if latest.get('momentum_5d', 0) < -0.10:
            risk_signals.append(f"Negative Momentum ({latest['momentum_5d']*100:.1f}%)")
        
        if latest.get('distance_from_high', 0) < -0.15:
            risk_signals.append(f"Far from High ({latest['distance_from_high']*100:.1f}%)")
        
        # Risk level assessment
        num_signals = len(risk_signals)
        if num_signals >= 3:
            risk_level = "HIGH"
        elif num_signals >= 2:
            risk_level = "MEDIUM"
        elif num_signals >= 1:
            risk_level = "LOW"
        else:
            risk_level = "SAFE"
        
        return risk_level, risk_signals, latest
    
    def generate_daily_report(self, focus_only=False):
        """Generate daily risk monitoring report."""
        current_time = datetime.now()
        
        print(f"Daily Risk Monitor Report - {current_time.strftime('%Y-%m-%d %H:%M')}")
        print("=" * 80)
        
        tickers_to_monitor = self.focus_tickers if focus_only else self.all_tickers
        
        risk_summary = {
            'HIGH': [],
            'MEDIUM': [],
            'LOW': [],
            'SAFE': []
        }
        
        detailed_analysis = []
        
        for ticker in tickers_to_monitor:
            try:
                data = self.data_manager.load_ticker_data(ticker, 'full')
                if data is None or len(data) < 20:
                    continue
                
                indicators = self.calculate_daily_indicators(data)
                risk_level, risk_signals, latest_values = self.assess_risk_level(indicators)
                
                risk_summary[risk_level].append(ticker)
                
                detailed_analysis.append({
                    'ticker': ticker,
                    'risk_level': risk_level,
                    'signals': risk_signals,
                    'rsi': latest_values.get('rsi', 0),
                    'bb_pos': latest_values.get('bb_position', 0),
                    'vol_spike': latest_values.get('vol_spike', 1),
                    'momentum': latest_values.get('momentum_5d', 0),
                    'from_high': latest_values.get('distance_from_high', 0),
                    'down_days': latest_values.get('consecutive_down', 0)
                })
                
            except Exception as e:
                continue
        
        # Print risk summary
        print(f"RISK LEVEL SUMMARY:")
        print("-" * 30)
        for level in ['HIGH', 'MEDIUM', 'LOW', 'SAFE']:
            count = len(risk_summary[level])
            tickers = ', '.join(risk_summary[level]) if count > 0 else 'None'
            print(f"{level:>8}: {count:>2} tickers - {tickers}")
        
        # Detailed alerts for high/medium risk
        high_medium_risk = [item for item in detailed_analysis if item['risk_level'] in ['HIGH', 'MEDIUM']]
        
        if high_medium_risk:
            print(f"\n** RISK ALERTS:")
            print("-" * 40)
            
            for item in high_medium_risk:
                print(f"\n{item['ticker']} - {item['risk_level']} RISK")
                print(f"  Signals: {', '.join(item['signals'])}")
                print(f"  RSI: {item['rsi']:.1f} | BB: {item['bb_pos']:.2f} | Vol: {item['vol_spike']:.2f}x")
                print(f"  Momentum: {item['momentum']*100:.1f}% | From High: {item['from_high']*100:.1f}%")
        
        # Show current status grouped by risk level
        print(f"\nALL TICKERS STATUS (Grouped by Risk Level):")
        print("-" * 70)
        
        # Group by risk level for better display
        for risk_level in ['HIGH', 'MEDIUM', 'LOW', 'SAFE']:
            level_tickers = [item for item in detailed_analysis if item['risk_level'] == risk_level]
            if level_tickers:
                risk_indicator = {'HIGH': '[!]', 'MEDIUM': '[*]', 'LOW': '[~]', 'SAFE': '[+]'}[risk_level]
                print(f"\n{risk_indicator} {risk_level} RISK ({len(level_tickers)} tickers):")
                print(f"{'Ticker':<6} {'RSI':<6} {'BB':<8} {'Vol':<7} {'Mom%':<7} {'Signals':<15}")
                print("-" * 60)
                
                # Sort by RSI within each risk level for easier scanning
                sorted_tickers = sorted(level_tickers, key=lambda x: x['rsi'], reverse=True)
                
                for item in sorted_tickers:
                    alerts = len(item['signals'])
                    signals_text = ', '.join(item['signals'][:2]) if item['signals'] else ''  # Show first 2 signals
                    if len(item['signals']) > 2:
                        signals_text += '...'
                    
                    print(f"{item['ticker']:<6} {item['rsi']:<6.1f} {item['bb_pos']:<8.2f} "
                          f"{item['vol_spike']:<7.2f} {item['momentum']*100:<7.1f} {signals_text:<15}")
        
        return detailed_analysis, risk_summary
    
    def check_entry_opportunities(self):
        """Check for good entry opportunities (oversold conditions)."""
        print(f"\nENTRY OPPORTUNITIES:")
        print("-" * 30)
        
        opportunities = []
        
        for ticker in self.all_tickers:
            try:
                data = self.data_manager.load_ticker_data(ticker, 'full')
                if data is None:
                    continue
                
                indicators = self.calculate_daily_indicators(data)
                latest = {}
                for name, series in indicators.items():
                    if len(series) > 0:
                        latest[name] = series.iloc[-1]
                
                # Entry criteria: oversold but not in downtrend
                rsi = latest.get('rsi', 50)
                bb_pos = latest.get('bb_position', 0)
                momentum = latest.get('momentum_5d', 0)
                vol_spike = latest.get('vol_spike', 1)
                
                if (rsi < 40 and bb_pos < -0.5 and momentum > -0.05 and vol_spike < 1.5):
                    opportunities.append({
                        'ticker': ticker,
                        'rsi': rsi,
                        'bb_pos': bb_pos,
                        'momentum': momentum,
                        'reason': 'Oversold + Stable'
                    })
                elif (rsi < 35):
                    opportunities.append({
                        'ticker': ticker,
                        'rsi': rsi,
                        'bb_pos': bb_pos,
                        'momentum': momentum,
                        'reason': 'Deeply Oversold'
                    })
                
            except Exception:
                continue
        
        if opportunities:
            for opp in opportunities:
                print(f"  {opp['ticker']}: {opp['reason']} (RSI: {opp['rsi']:.1f}, Mom: {opp['momentum']*100:.1f}%)")
        else:
            print("  No clear entry opportunities at this time")
        
        return opportunities
    
    def generate_trading_signals(self):
        """Generate specific trading signals for the custom dividend strategy."""
        print(f"\nTRADING SIGNALS:")
        print("-" * 25)
        
        signals = []
        
        for ticker in self.all_tickers:
            try:
                data = self.data_manager.load_ticker_data(ticker, 'full')
                if data is None or 'Dividends' not in data.columns:
                    continue
                
                # Check for upcoming dividends (within next 7 days)
                recent_divs = data[data['Dividends'] > 0].tail(3)
                if len(recent_divs) == 0:
                    continue
                
                # Estimate next dividend date (assuming weekly pattern)
                last_div_date = recent_divs.index[-1]
                days_since_last = (data.index[-1] - last_div_date).days
                
                # If it's been ~7 days, next dividend likely soon
                if 5 <= days_since_last <= 9:
                    indicators = self.calculate_daily_indicators(data)
                    risk_level, risk_signals, latest = self.assess_risk_level(indicators)
                    
                    if risk_level in ['SAFE', 'LOW']:
                        signals.append({
                            'ticker': ticker,
                            'action': 'PREPARE',
                            'reason': f'Dividend likely in ~{7-days_since_last} days, Low risk',
                            'risk_level': risk_level
                        })
                    elif risk_level == 'MEDIUM':
                        signals.append({
                            'ticker': ticker,
                            'action': 'CAUTION',
                            'reason': f'Dividend likely in ~{7-days_since_last} days, Medium risk',
                            'risk_level': risk_level
                        })
                
                # Check current position relative to custom strategy
                current_price = data['Close'].iloc[-1]
                recent_high = data['Close'].rolling(20).max().iloc[-1]
                
                if current_price < recent_high * 0.95:  # 5% below recent high
                    signals.append({
                        'ticker': ticker,
                        'action': 'WATCH',
                        'reason': f'5% below recent high - potential entry opportunity',
                        'risk_level': risk_level
                    })
                
            except Exception:
                continue
        
        if signals:
            for signal in signals:
                action_indicator = {'PREPARE': '[+]', 'CAUTION': '[*]', 'WATCH': '[?]'}[signal['action']]
                print(f"  {action_indicator} {signal['ticker']} - {signal['action']}: {signal['reason']}")
        else:
            print("  No active trading signals")
        
        return signals

def main():
    """Run the daily monitoring system."""
    monitor = DailyRiskMonitor()
    
    # Generate main report
    analysis, summary = monitor.generate_daily_report(focus_only=True)
    
    # Check entry opportunities
    opportunities = monitor.check_entry_opportunities()
    
    # Generate trading signals
    signals = monitor.generate_trading_signals()
    
    # Summary recommendations
    print(f"\nDAILY RECOMMENDATIONS:")
    print("-" * 35)
    
    high_risk_count = len(summary['HIGH'])
    medium_risk_count = len(summary['MEDIUM'])
    
    if high_risk_count > 0:
        print(f"  [!] {high_risk_count} tickers at HIGH risk - Consider reducing positions")
    elif medium_risk_count > 2:
        print(f"  [*] {medium_risk_count} tickers at MEDIUM risk - Monitor closely")
    else:
        print(f"  [+] Risk levels manageable - Continue normal strategy")
    
    if len(opportunities) > 0:
        print(f"  [O] {len(opportunities)} entry opportunities identified")
    
    if len(signals) > 0:
        print(f"  [S] {len(signals)} trading signals active")
    
    print(f"\nNext check recommended: {(datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')}")
    
    return analysis, opportunities, signals

if __name__ == "__main__":
    daily_analysis, entry_opps, trading_signals = main()