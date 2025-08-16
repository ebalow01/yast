#!/usr/bin/env python3
"""
Automated Daily Monitoring System
Comprehensive daily analysis with logging and alerts
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import json
from daily_risk_monitor import DailyRiskMonitor
import warnings
warnings.filterwarnings('ignore')

class AutomatedDailyMonitor:
    """Automated monitoring system with logging and historical tracking."""
    
    def __init__(self, log_dir="monitoring_logs"):
        self.monitor = DailyRiskMonitor()
        self.log_dir = log_dir
        
        # Create log directory if it doesn't exist
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
    
    def save_daily_log(self, analysis_data, opportunities, signals):
        """Save daily monitoring results to log file."""
        today = datetime.now().strftime('%Y-%m-%d')
        log_file = os.path.join(self.log_dir, f"daily_log_{today}.json")
        
        # Prepare data for JSON serialization
        log_data = {
            'date': today,
            'timestamp': datetime.now().isoformat(),
            'risk_summary': {
                'high_risk': [item['ticker'] for item in analysis_data if item['risk_level'] == 'HIGH'],
                'medium_risk': [item['ticker'] for item in analysis_data if item['risk_level'] == 'MEDIUM'],
                'low_risk': [item['ticker'] for item in analysis_data if item['risk_level'] == 'LOW'],
                'safe': [item['ticker'] for item in analysis_data if item['risk_level'] == 'SAFE']
            },
            'detailed_analysis': [
                {
                    'ticker': item['ticker'],
                    'risk_level': item['risk_level'],
                    'signals': item['signals'],
                    'rsi': round(item['rsi'], 2),
                    'bb_position': round(item['bb_pos'], 3),
                    'vol_spike': round(item['vol_spike'], 2),
                    'momentum_5d': round(item['momentum'] * 100, 2),
                    'distance_from_high': round(item['from_high'] * 100, 2)
                }
                for item in analysis_data
            ],
            'entry_opportunities': [
                {
                    'ticker': opp['ticker'],
                    'reason': opp['reason'],
                    'rsi': round(opp['rsi'], 1),
                    'momentum': round(opp['momentum'] * 100, 1)
                }
                for opp in opportunities
            ],
            'trading_signals': [
                {
                    'ticker': signal['ticker'],
                    'action': signal['action'],
                    'reason': signal['reason'],
                    'risk_level': signal['risk_level']
                }
                for signal in signals
            ]
        }
        
        # Save to file
        with open(log_file, 'w') as f:
            json.dump(log_data, f, indent=2)
        
        print(f"Daily log saved: {log_file}")
    
    def load_historical_logs(self, days_back=7):
        """Load historical monitoring logs."""
        historical_data = []
        
        for i in range(days_back):
            date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
            log_file = os.path.join(self.log_dir, f"daily_log_{date}.json")
            
            if os.path.exists(log_file):
                try:
                    with open(log_file, 'r') as f:
                        data = json.load(f)
                        historical_data.append(data)
                except Exception as e:
                    continue
        
        return historical_data
    
    def analyze_trends(self):
        """Analyze trends from historical logs."""
        historical_data = self.load_historical_logs(7)
        
        if not historical_data:
            print("\nNo historical data available for trend analysis")
            return
        
        print(f"\nTREND ANALYSIS (Last {len(historical_data)} days):")
        print("-" * 50)
        
        # Track risk level changes
        risk_trends = {}
        signal_trends = {}
        
        for ticker in self.monitor.focus_tickers:
            risk_history = []
            signal_history = []
            
            for day_data in reversed(historical_data):  # Oldest to newest
                # Find ticker in daily analysis
                ticker_data = next((item for item in day_data['detailed_analysis'] if item['ticker'] == ticker), None)
                if ticker_data:
                    risk_history.append(ticker_data['risk_level'])
                
                # Count signals for this ticker
                ticker_signals = [s for s in day_data['trading_signals'] if s['ticker'] == ticker]
                signal_history.append(len(ticker_signals))
            
            if risk_history:
                risk_trends[ticker] = risk_history
                signal_trends[ticker] = signal_history
        
        # Identify concerning trends
        trending_up = []
        trending_down = []
        
        risk_levels = {'SAFE': 0, 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3}
        
        for ticker, history in risk_trends.items():
            if len(history) >= 3:
                recent_avg = np.mean([risk_levels[level] for level in history[-3:]])
                older_avg = np.mean([risk_levels[level] for level in history[:-3]]) if len(history) > 3 else recent_avg
                
                if recent_avg > older_avg + 0.5:
                    trending_up.append(ticker)
                elif recent_avg < older_avg - 0.5:
                    trending_down.append(ticker)
        
        if trending_up:
            print(f"Risk INCREASING: {', '.join(trending_up)}")
        if trending_down:
            print(f"Risk DECREASING: {', '.join(trending_down)}")
        
        # Signal frequency analysis
        active_tickers = [ticker for ticker, signals in signal_trends.items() if sum(signals) > 0]
        if active_tickers:
            print(f"Most active signals: {', '.join(active_tickers[:3])}")
    
    def generate_weekly_summary(self):
        """Generate weekly summary report."""
        historical_data = self.load_historical_logs(7)
        
        if not historical_data:
            print("\nInsufficient data for weekly summary")
            return
        
        print(f"\nWEEKLY SUMMARY:")
        print("=" * 30)
        
        # Count risk events
        total_high_risk_events = sum(len(day['risk_summary']['high_risk']) for day in historical_data)
        total_medium_risk_events = sum(len(day['risk_summary']['medium_risk']) for day in historical_data)
        total_opportunities = sum(len(day['entry_opportunities']) for day in historical_data)
        total_signals = sum(len(day['trading_signals']) for day in historical_data)
        
        print(f"High risk events: {total_high_risk_events}")
        print(f"Medium risk events: {total_medium_risk_events}")
        print(f"Entry opportunities: {total_opportunities}")
        print(f"Trading signals: {total_signals}")
        
        # Most volatile tickers
        volatility_counts = {}
        for day in historical_data:
            for item in day['detailed_analysis']:
                ticker = item['ticker']
                if item['vol_spike'] > 1.5:
                    volatility_counts[ticker] = volatility_counts.get(ticker, 0) + 1
        
        if volatility_counts:
            most_volatile = sorted(volatility_counts.items(), key=lambda x: x[1], reverse=True)[:3]
            print(f"Most volatile: {', '.join([f'{t}({c}d)' for t, c in most_volatile])}")
    
    def check_alert_conditions(self, analysis_data):
        """Check for conditions requiring immediate alerts."""
        alerts = []
        
        # High risk alerts
        high_risk_tickers = [item['ticker'] for item in analysis_data if item['risk_level'] == 'HIGH']
        if high_risk_tickers:
            alerts.append(f"HIGH RISK ALERT: {', '.join(high_risk_tickers)}")
        
        # Multiple medium risk
        medium_risk_tickers = [item['ticker'] for item in analysis_data if item['risk_level'] == 'MEDIUM']
        if len(medium_risk_tickers) >= 3:
            alerts.append(f"MULTIPLE MEDIUM RISK: {', '.join(medium_risk_tickers)}")
        
        # Extreme RSI values
        extreme_rsi = [item['ticker'] for item in analysis_data if item['rsi'] > 80 or item['rsi'] < 20]
        if extreme_rsi:
            alerts.append(f"EXTREME RSI: {', '.join(extreme_rsi)}")
        
        # High volatility spikes
        vol_spikes = [item['ticker'] for item in analysis_data if item['vol_spike'] > 3.0]
        if vol_spikes:
            alerts.append(f"VOLATILITY SPIKE: {', '.join(vol_spikes)}")
        
        return alerts
    
    def run_full_daily_analysis(self):
        """Run comprehensive daily analysis with all features."""
        print("=" * 80)
        print(f"AUTOMATED DAILY MONITORING - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        print("=" * 80)
        
        # Run main monitoring
        analysis_data, risk_summary = self.monitor.generate_daily_report(focus_only=False)
        opportunities = self.monitor.check_entry_opportunities()
        signals = self.monitor.generate_trading_signals()
        
        # Check for alerts
        alerts = self.check_alert_conditions(analysis_data)
        if alerts:
            print(f"\n*** IMMEDIATE ALERTS ***")
            for alert in alerts:
                print(f"  {alert}")
        
        # Save daily log
        self.save_daily_log(analysis_data, opportunities, signals)
        
        # Trend analysis
        self.analyze_trends()
        
        # Weekly summary (if it's a Monday or requested)
        if datetime.now().weekday() == 0:  # Monday
            self.generate_weekly_summary()
        
        # Final recommendations
        print(f"\nDAILY RECOMMENDATIONS:")
        print("-" * 35)
        
        high_risk_count = len(risk_summary['HIGH'])
        medium_risk_count = len(risk_summary['MEDIUM'])
        
        if high_risk_count > 0:
            print(f"  [!] URGENT: {high_risk_count} tickers at HIGH risk")
            print(f"      Recommended action: Reduce or close positions")
        elif medium_risk_count > 2:
            print(f"  [*] CAUTION: {medium_risk_count} tickers at MEDIUM risk")
            print(f"      Recommended action: Monitor closely, prepare to exit")
        else:
            print(f"  [+] CLEAR: Risk levels manageable")
            print(f"      Recommended action: Continue normal strategy")
        
        if len(opportunities) > 0:
            print(f"  [O] OPPORTUNITIES: {len(opportunities)} potential entries")
        
        if len(signals) > 0:
            print(f"  [S] SIGNALS: {len(signals)} active trading signals")
        
        print(f"\nNext automated check: {(datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d 09:00')}")
        
        return {
            'analysis': analysis_data,
            'opportunities': opportunities,
            'signals': signals,
            'alerts': alerts,
            'risk_summary': risk_summary
        }

def main():
    """Main execution function."""
    monitor = AutomatedDailyMonitor()
    results = monitor.run_full_daily_analysis()
    return results

if __name__ == "__main__":
    daily_results = main()