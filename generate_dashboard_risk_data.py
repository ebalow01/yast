#!/usr/bin/env python3
"""
Generate risk assessment data for dashboard integration
Creates JSON with risk levels and rationales for each ticker
"""

import json
import pandas as pd
from datetime import datetime
from daily_risk_monitor import DailyRiskMonitor
import warnings
warnings.filterwarnings('ignore')

class DashboardRiskGenerator:
    """Generate risk data in dashboard-compatible format."""
    
    def __init__(self):
        self.monitor = DailyRiskMonitor()
    
    def generate_rationale(self, ticker_data, opportunities, signals):
        """Generate human-readable rationale for risk assessment."""
        rationale_parts = []
        ticker = ticker_data['ticker']
        risk_level = ticker_data['risk_level']
        
        # Start with risk level explanation
        if risk_level == 'HIGH':
            rationale_parts.append("HIGH RISK")
        elif risk_level == 'MEDIUM':
            rationale_parts.append("MEDIUM RISK")
        elif risk_level == 'LOW':
            rationale_parts.append("LOW RISK")
        else:
            rationale_parts.append("SAFE")
        
        # Add specific signals
        if ticker_data['signals']:
            signal_descriptions = {
                'RSI Overbought': 'overbought conditions',
                'RSI Oversold': 'oversold conditions', 
                'Above BB Upper': 'price above normal range',
                'Below BB Lower': 'price below normal range',
                'Vol Spike': 'high volatility',
                'Consecutive Down': 'consecutive down days',
                'Negative Momentum': 'negative price momentum',
                'Far from High': 'well below recent highs'
            }
            
            simplified_signals = []
            for signal in ticker_data['signals'][:3]:  # Max 3 signals
                for key, desc in signal_descriptions.items():
                    if key in signal:
                        simplified_signals.append(desc)
                        break
            
            if simplified_signals:
                rationale_parts.append(f"({', '.join(simplified_signals)})")
        
        # Add trading signals/opportunities
        ticker_opportunities = [opp for opp in opportunities if opp['ticker'] == ticker]
        ticker_signals = [sig for sig in signals if sig['ticker'] == ticker]
        
        actions = []
        if ticker_opportunities:
            for opp in ticker_opportunities:
                if 'Oversold' in opp['reason']:
                    actions.append("Entry opportunity")
                    break
        
        if ticker_signals:
            for sig in ticker_signals:
                if sig['action'] == 'PREPARE':
                    actions.append("Dividend prep")
                elif sig['action'] == 'WATCH':
                    actions.append("Watch for entry")
                elif sig['action'] == 'CAUTION':
                    actions.append("Exercise caution")
        
        if actions:
            rationale_parts.append(" | ".join(actions))
        
        # Add key metrics for context
        rsi = ticker_data['rsi']
        momentum = ticker_data['momentum'] * 100
        
        if risk_level in ['HIGH', 'MEDIUM']:
            rationale_parts.append(f"RSI: {rsi:.0f}, Mom: {momentum:+.1f}%")
        elif len(rationale_parts) == 1:  # Only risk level, add something useful
            if rsi > 75:
                rationale_parts.append(f"Strong momentum (RSI: {rsi:.0f})")
            elif rsi < 35:
                rationale_parts.append(f"Potential value (RSI: {rsi:.0f})")
            elif abs(momentum) > 5:
                rationale_parts.append(f"Active ({momentum:+.1f}% momentum)")
            else:
                rationale_parts.append("Stable conditions")
        
        return " | ".join(rationale_parts)
    
    def get_risk_color_code(self, risk_level):
        """Get color codes for dashboard display."""
        color_codes = {
            'HIGH': '#dc3545',     # Red
            'MEDIUM': '#ffc107',   # Yellow  
            'LOW': '#fd7e14',      # Orange
            'SAFE': '#28a745'      # Green
        }
        return color_codes.get(risk_level, '#6c757d')
    
    def get_risk_priority(self, risk_level):
        """Get numeric priority for sorting (higher = more urgent)."""
        priorities = {
            'HIGH': 4,
            'MEDIUM': 3,
            'LOW': 2,
            'SAFE': 1
        }
        return priorities.get(risk_level, 0)
    
    def generate_dashboard_risk_data(self):
        """Generate complete risk assessment data for dashboard."""
        print("Generating dashboard risk assessment data...")
        
        # Get monitoring data
        analysis_data, risk_summary = self.monitor.generate_daily_report(focus_only=False)
        opportunities = self.monitor.check_entry_opportunities()
        signals = self.monitor.generate_trading_signals()
        
        # Create dashboard-compatible data structure
        dashboard_risk_data = []
        
        for ticker_data in analysis_data:
            ticker = ticker_data['ticker']
            risk_level = ticker_data['risk_level']
            
            # Generate rationale
            rationale = self.generate_rationale(ticker_data, opportunities, signals)
            
            risk_entry = {
                'ticker': ticker,
                'riskLevel': risk_level,
                'riskColor': self.get_risk_color_code(risk_level),
                'riskPriority': self.get_risk_priority(risk_level),
                'rationale': rationale,
                'technicals': {
                    'rsi': round(ticker_data['rsi'], 1),
                    'bbPosition': round(ticker_data['bb_pos'], 2),
                    'volSpike': round(ticker_data['vol_spike'], 2),
                    'momentum5d': round(ticker_data['momentum'] * 100, 1),
                    'distanceFromHigh': round(ticker_data['from_high'] * 100, 1)
                },
                'signals': ticker_data['signals'],
                'alertCount': len(ticker_data['signals']),
                'lastUpdated': datetime.now().isoformat()
            }
            
            dashboard_risk_data.append(risk_entry)
        
        # Sort by risk priority (highest risk first)
        dashboard_risk_data.sort(key=lambda x: x['riskPriority'], reverse=True)
        
        return dashboard_risk_data
    
    def merge_with_existing_data(self, risk_data):
        """Merge risk data with existing performance data."""
        try:
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
                        'technicals': risk_item['technicals'],
                        'alertCount': risk_item['alertCount'],
                        'lastUpdated': risk_item['lastUpdated']
                    })
                else:
                    # Default for missing tickers
                    perf_item.update({
                        'riskLevel': 'UNKNOWN',
                        'riskColor': '#6c757d',
                        'riskPriority': 0,
                        'rationale': 'No risk data available',
                        'technicals': {},
                        'alertCount': 0,
                        'lastUpdated': datetime.now().isoformat()
                    })
            
            return performance_data
            
        except Exception as e:
            print(f"Error merging with existing data: {e}")
            return risk_data
    
    def save_risk_data(self, data, filename='risk_assessment_data.json'):
        """Save risk data to JSON file."""
        filepath = f"yast-react/public/data/{filename}"
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"Risk data saved to: {filepath}")
        return filepath
    
    def save_merged_data(self, data):
        """Save merged data back to performance_data.json."""
        filepath = "yast-react/public/data/performance_data.json"
        
        # Create backup
        import shutil
        backup_path = f"yast-react/public/data/performance_data_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        try:
            shutil.copy2(filepath, backup_path)
            print(f"Backup created: {backup_path}")
        except Exception as e:
            print(f"Warning: Could not create backup: {e}")
        
        # Save merged data
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"Updated performance data with risk assessment: {filepath}")
        return filepath
    
    def generate_summary_report(self, risk_data):
        """Generate summary report of risk assessment."""
        total_tickers = len(risk_data)
        risk_counts = {}
        
        for item in risk_data:
            risk_level = item['riskLevel']
            risk_counts[risk_level] = risk_counts.get(risk_level, 0) + 1
        
        print(f"\nRISK ASSESSMENT SUMMARY:")
        print("=" * 40)
        print(f"Total tickers analyzed: {total_tickers}")
        
        for risk_level in ['HIGH', 'MEDIUM', 'LOW', 'SAFE']:
            count = risk_counts.get(risk_level, 0)
            percentage = (count / total_tickers) * 100 if total_tickers > 0 else 0
            print(f"{risk_level:>8}: {count:>3} tickers ({percentage:>5.1f}%)")
        
        # Highlight high-risk tickers
        high_risk = [item for item in risk_data if item['riskLevel'] == 'HIGH']
        if high_risk:
            print(f"\nHIGH RISK TICKERS:")
            for item in high_risk:
                # Create ASCII-safe rationale
                safe_rationale = item['rationale'].encode('ascii', 'ignore').decode('ascii')
                print(f"  {item['ticker']}: {safe_rationale}")
        
        # Show opportunities
        opportunities_count = len([item for item in risk_data if 'Entry opportunity' in item['rationale']])
        dividend_prep_count = len([item for item in risk_data if 'Dividend prep' in item['rationale']])
        
        if opportunities_count > 0:
            print(f"\nEntry opportunities: {opportunities_count}")
        if dividend_prep_count > 0:
            print(f"Dividend preparations: {dividend_prep_count}")

def main():
    """Main execution function."""
    generator = DashboardRiskGenerator()
    
    # Generate risk data
    risk_data = generator.generate_dashboard_risk_data()
    
    # Save standalone risk data
    generator.save_risk_data(risk_data)
    
    # Merge with existing performance data and save
    merged_data = generator.merge_with_existing_data(risk_data)
    generator.save_merged_data(merged_data)
    
    # Generate summary
    generator.generate_summary_report(risk_data)
    
    print(f"\n✅ Dashboard risk data generation complete!")
    print(f"📊 Risk data available in: yast-react/public/data/risk_assessment_data.json")
    print(f"🔄 Performance data updated with risk info")
    print(f"🎯 Ready for dashboard integration!")
    
    return risk_data, merged_data

if __name__ == "__main__":
    risk_data, merged_data = main()