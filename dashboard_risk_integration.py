#!/usr/bin/env python3
"""
Simple dashboard risk integration - ASCII compatible
Creates clean risk data for web dashboard
"""

import json
import pandas as pd
from datetime import datetime
from daily_risk_monitor import DailyRiskMonitor
import warnings
warnings.filterwarnings('ignore')

def generate_simple_risk_data():
    """Generate simple risk data for dashboard integration."""
    
    monitor = DailyRiskMonitor()
    
    # Get monitoring data
    analysis_data, risk_summary = monitor.generate_daily_report(focus_only=False)
    opportunities = monitor.check_entry_opportunities()
    signals = monitor.generate_trading_signals()
    
    print("Generating dashboard risk data for all 44 tickers...")
    print(f"Risk summary: {len(risk_summary['HIGH'])} HIGH, {len(risk_summary['MEDIUM'])} MEDIUM, {len(risk_summary['LOW'])} LOW, {len(risk_summary['SAFE'])} SAFE")
    
    # Create simplified data
    dashboard_data = []
    
    for ticker_data in analysis_data:
        ticker = ticker_data['ticker']
        risk_level = ticker_data['risk_level']
        
        # Create detailed rationale without risk level prefix
        rationale_parts = []
        
        # Trading signals with full details
        ticker_signals = [sig for sig in signals if sig['ticker'] == ticker]
        ticker_opportunities = [opp for opp in opportunities if opp['ticker'] == ticker]
        
        # Add full trading signal details
        for sig in ticker_signals:
            signal_text = f"{sig['action']}: {sig['reason']}"
            rationale_parts.append(signal_text)
        
        # Add entry opportunities
        for opp in ticker_opportunities:
            opp_text = f"OPPORTUNITY: {opp['reason']} (RSI: {opp['rsi']:.1f}, Momentum: {opp['momentum']:+.1f}%)"
            rationale_parts.append(opp_text)
        
        # Add technical signals if no trading signals
        if not ticker_signals and not ticker_opportunities and ticker_data['signals']:
            tech_signals = []
            for signal in ticker_data['signals'][:3]:  # Max 3 technical signals
                if 'RSI Overbought' in signal:
                    rsi_val = signal.split('(')[1].split(')')[0] if '(' in signal else 'N/A'
                    tech_signals.append(f"RSI Overbought ({rsi_val})")
                elif 'RSI Oversold' in signal:
                    rsi_val = signal.split('(')[1].split(')')[0] if '(' in signal else 'N/A'
                    tech_signals.append(f"RSI Oversold ({rsi_val})")
                elif 'Consecutive Down' in signal:
                    days = signal.split('(')[1].split(')')[0] if '(' in signal else 'N/A'
                    tech_signals.append(f"Down trend ({days})")
                elif 'Negative Momentum' in signal:
                    momentum = signal.split('(')[1].split(')')[0] if '(' in signal else 'N/A'
                    tech_signals.append(f"Weak momentum ({momentum})")
                elif 'Far from High' in signal:
                    distance = signal.split('(')[1].split(')')[0] if '(' in signal else 'N/A'
                    tech_signals.append(f"Below highs ({distance})")
                else:
                    tech_signals.append(signal)
            
            if tech_signals:
                rationale_parts.append("SIGNALS: " + ", ".join(tech_signals))
        
        # Create final rationale
        if rationale_parts:
            rationale = " | ".join(rationale_parts)
        else:
            # Default based on risk level if no specific signals
            if risk_level == 'HIGH':
                rationale = "HIGH RISK: Review position"
            elif risk_level == 'LOW':
                rationale = "MONITOR: Some caution warranted"
            else:
                rationale = "Normal trading conditions"
        
        # Risk colors for dashboard
        risk_colors = {
            'HIGH': '#dc3545',     # Red
            'MEDIUM': '#ffc107',   # Yellow  
            'LOW': '#fd7e14',      # Orange
            'SAFE': '#28a745'      # Green
        }
        
        # Risk priorities for sorting
        risk_priorities = {
            'HIGH': 4,
            'MEDIUM': 3,
            'LOW': 2,
            'SAFE': 1
        }
        
        dashboard_entry = {
            'ticker': ticker,
            'riskLevel': risk_level,
            'riskColor': risk_colors.get(risk_level, '#6c757d'),
            'riskPriority': risk_priorities.get(risk_level, 0),
            'rationale': rationale,
            'rsi': round(ticker_data['rsi'], 1),
            'momentum5d': round(ticker_data['momentum'] * 100, 1),
            'alertCount': len(ticker_data['signals']),
            'lastUpdated': datetime.now().strftime('%Y-%m-%d %H:%M')
        }
        
        dashboard_data.append(dashboard_entry)
    
    # Sort by risk priority (highest risk first)
    dashboard_data.sort(key=lambda x: x['riskPriority'], reverse=True)
    
    return dashboard_data

def update_performance_data_with_risk():
    """Update the existing performance_data.json with risk information."""
    
    try:
        # Generate risk data
        risk_data = generate_simple_risk_data()
        
        # Load existing performance data
        with open('yast-react/public/data/performance_data.json', 'r') as f:
            performance_data = json.load(f)
        
        # Create risk lookup
        risk_lookup = {item['ticker']: item for item in risk_data}
        
        # Merge data
        for perf_item in performance_data:
            ticker = perf_item['ticker']
            if ticker in risk_lookup:
                risk_item = risk_lookup[ticker]
                perf_item.update({
                    'riskLevel': risk_item['riskLevel'],
                    'riskColor': risk_item['riskColor'],
                    'riskPriority': risk_item['riskPriority'],
                    'rationale': risk_item['rationale'],
                    'rsi': risk_item['rsi'],
                    'momentum5d': risk_item['momentum5d'],
                    'alertCount': risk_item['alertCount'],
                    'riskLastUpdated': risk_item['lastUpdated']
                })
            else:
                # Default for missing tickers
                perf_item.update({
                    'riskLevel': 'UNKNOWN',
                    'riskColor': '#6c757d',
                    'riskPriority': 0,
                    'rationale': 'No risk data available',
                    'rsi': 0,
                    'momentum5d': 0,
                    'alertCount': 0,
                    'riskLastUpdated': datetime.now().strftime('%Y-%m-%d %H:%M')
                })
        
        # Create backup
        backup_path = f"yast-react/public/data/performance_data_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        import shutil
        try:
            shutil.copy2('yast-react/public/data/performance_data.json', backup_path)
            print(f"Backup created: {backup_path}")
        except Exception as e:
            print(f"Warning: Could not create backup: {e}")
        
        # Save updated data
        with open('yast-react/public/data/performance_data.json', 'w') as f:
            json.dump(performance_data, f, indent=2)
        
        # Also save standalone risk data
        with open('yast-react/public/data/risk_assessment_data.json', 'w') as f:
            json.dump(risk_data, f, indent=2)
        
        print(f"Successfully updated performance_data.json with risk assessment data")
        print(f"Risk data also saved to: risk_assessment_data.json")
        
        # Print summary
        print(f"\nRisk Assessment Summary:")
        print(f"=" * 40)
        
        risk_counts = {}
        for item in risk_data:
            risk_level = item['riskLevel']
            risk_counts[risk_level] = risk_counts.get(risk_level, 0) + 1
        
        total = len(risk_data)
        for level in ['HIGH', 'MEDIUM', 'LOW', 'SAFE']:
            count = risk_counts.get(level, 0)
            pct = (count / total) * 100 if total > 0 else 0
            print(f"{level:>8}: {count:>3} tickers ({pct:>5.1f}%)")
        
        # Show high risk tickers
        high_risk = [item for item in risk_data if item['riskLevel'] == 'HIGH']
        if high_risk:
            print(f"\nHigh Risk Tickers:")
            for item in high_risk:
                print(f"  {item['ticker']}: {item['rationale']}")
        
        # Show opportunities
        opportunities = [item for item in risk_data if 'Entry opportunity' in item['rationale']]
        if opportunities:
            print(f"\nEntry Opportunities:")
            for item in opportunities:
                print(f"  {item['ticker']}: {item['rationale']}")
        
        # Show dividend setups
        dividend_setups = [item for item in risk_data if 'Dividend setup' in item['rationale']]
        if dividend_setups:
            print(f"\nDividend Setups:")
            for item in dividend_setups:
                print(f"  {item['ticker']}: {item['rationale']}")
        
        return performance_data, risk_data
        
    except Exception as e:
        print(f"Error updating performance data: {e}")
        return None, None

def main():
    """Main execution function."""
    print("Updating dashboard with risk assessment data...")
    print("=" * 60)
    
    performance_data, risk_data = update_performance_data_with_risk()
    
    if performance_data and risk_data:
        print(f"\n✅ Dashboard integration complete!")
        print(f"📊 All 44 tickers now have risk assessment data")
        print(f"🎯 Ready for dashboard display with 'riskLevel' and 'rationale' columns")
        print(f"🔄 Data updated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    else:
        print(f"\n❌ Dashboard integration failed")
    
    return performance_data, risk_data

if __name__ == "__main__":
    main()