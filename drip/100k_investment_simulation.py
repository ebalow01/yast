import pandas as pd
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def simulate_100k_investment():
    """Simulate $100,000 investment across all 4 strategies for last 3 months"""
    
    print("💰 $100,000 INVESTMENT SIMULATION - LAST 3 MONTHS")
    print("=" * 80)
    print("📅 Period: May 2025 → July 2025")
    print("💵 Starting Capital: $100,000 per strategy")
    print("🔄 Strategy: Compound returns each month")
    print("=" * 80)
    
    # Performance data from our previous analysis
    strategies = {
        'SMCI': {
            'name': 'SMCI (1st→2nd Monday)',
            'returns': [42.52, 0.00, 0.00],  # May, June, July
            'months': ['May', 'June', 'July'],
            'win_rate': 33,
            'description': 'Massive May gain, then flat'
        },
        'NVDA': {
            'name': 'NVDA (2nd→3rd Monday)', 
            'returns': [10.51, 1.46, 4.56],
            'months': ['May', 'June', 'July'],
            'win_rate': 100,
            'description': 'Consistent winner all 3 months'
        },
        'DRIP': {
            'name': 'DRIP (Last→1st Monday)',
            'returns': [2.66, -2.82, 10.96],
            'months': ['May', 'June', 'July'], 
            'win_rate': 67,
            'description': 'Strong finish after June dip'
        },
        'CRM': {
            'name': 'CRM (3rd→4th Monday)',
            'returns': [-3.56, -0.13, 2.96],
            'months': ['May', 'June', 'July'],
            'win_rate': 33,
            'description': 'Struggled most of period'
        }
    }
    
    starting_amount = 100000
    
    print(f"\n📊 MONTH-BY-MONTH PORTFOLIO TRACKING:")
    print("-" * 80)
    print(f"{'Strategy':<25} {'May':<12} {'June':<12} {'July':<12} {'Final':<12} {'Total Return'}")
    print("-" * 80)
    
    results = {}
    
    for ticker, strategy in strategies.items():
        portfolio = starting_amount
        monthly_values = [portfolio]
        
        # Apply each month's return
        for monthly_return in strategy['returns']:
            portfolio = portfolio * (1 + monthly_return / 100)
            monthly_values.append(portfolio)
        
        total_return = ((portfolio - starting_amount) / starting_amount) * 100
        results[ticker] = {
            'final_value': portfolio,
            'total_return': total_return,
            'monthly_values': monthly_values,
            'win_rate': strategy['win_rate'],
            'description': strategy['description']
        }
        
        # Format monthly values for display
        may_val = monthly_values[1]
        june_val = monthly_values[2] 
        july_val = monthly_values[3]
        
        print(f"{strategy['name']:<25} ${may_val:>10,.0f} ${june_val:>10,.0f} ${july_val:>10,.0f} ${portfolio:>10,.0f} {total_return:+8.1f}%")
    
    print("-" * 80)
    
    # Summary statistics
    print(f"\n🏆 FINAL RANKINGS:")
    print("-" * 50)
    
    # Sort by final value
    sorted_results = sorted(results.items(), key=lambda x: x[1]['final_value'], reverse=True)
    
    for i, (ticker, result) in enumerate(sorted_results):
        strategy_name = strategies[ticker]['name']
        profit_loss = result['final_value'] - starting_amount
        
        medal = ["🥇", "🥈", "🥉", "🏃"][i]
        
        print(f"{medal} {ticker:<4} {strategy_name:<25}")
        print(f"     Final Value: ${result['final_value']:,.0f}")
        print(f"     Profit/Loss: ${profit_loss:+,.0f} ({result['total_return']:+.1f}%)")
        print(f"     Win Rate: {result['win_rate']}% | {strategies[ticker]['description']}")
        print()
    
    # Portfolio allocation scenarios
    print(f"💡 PORTFOLIO ALLOCATION SCENARIOS:")
    print("-" * 60)
    
    scenarios = {
        'Conservative (Equal Weight)': {
            'SMCI': 0.25, 'NVDA': 0.25, 'DRIP': 0.25, 'CRM': 0.25
        },
        'Growth-Focused': {
            'SMCI': 0.40, 'NVDA': 0.35, 'DRIP': 0.15, 'CRM': 0.10
        },
        'Consistency-Focused': {
            'SMCI': 0.20, 'NVDA': 0.50, 'DRIP': 0.20, 'CRM': 0.10
        },
        'High-Risk/High-Reward': {
            'SMCI': 0.60, 'NVDA': 0.25, 'DRIP': 0.15, 'CRM': 0.00
        }
    }
    
    for scenario_name, allocation in scenarios.items():
        portfolio_value = 0
        weighted_return = 0
        
        for ticker, weight in allocation.items():
            if weight > 0:
                contribution = starting_amount * weight * (1 + results[ticker]['total_return'] / 100)
                portfolio_value += contribution
                weighted_return += results[ticker]['total_return'] * weight
        
        profit = portfolio_value - starting_amount
        
        print(f"{scenario_name}:")
        print(f"  Final Value: ${portfolio_value:,.0f}")
        print(f"  Profit/Loss: ${profit:+,.0f} ({weighted_return:+.1f}%)")
        
        # Show allocation
        allocation_str = ", ".join([f"{ticker}: {weight*100:.0f}%" for ticker, weight in allocation.items() if weight > 0])
        print(f"  Allocation: {allocation_str}")
        print()
    
    # Risk analysis
    print(f"⚠️  RISK ANALYSIS:")
    print("-" * 40)
    
    # Calculate volatility for each strategy
    for ticker, strategy in strategies.items():
        returns = strategy['returns']
        if len(returns) > 1:
            import numpy as np
            volatility = np.std(returns)
            max_drawdown = min(returns)
            best_month = max(returns)
            
            print(f"{ticker}:")
            print(f"  Volatility: {volatility:.1f}%")
            print(f"  Best Month: +{best_month:.1f}%")
            print(f"  Worst Month: {max_drawdown:+.1f}%") 
            print(f"  Risk/Reward: {results[ticker]['total_return']/volatility:.1f}" if volatility > 0 else "  Risk/Reward: N/A")
            print()
    
    # What if scenarios
    print(f"🔮 WHAT-IF SCENARIOS:")
    print("-" * 40)
    print("If you had invested $25,000 in each strategy:")
    
    total_portfolio = 0
    for ticker, result in results.items():
        contribution = 25000 * (1 + result['total_return'] / 100)
        total_portfolio += contribution
    
    diversified_profit = total_portfolio - 100000
    diversified_return = (diversified_profit / 100000) * 100
    
    print(f"  Diversified Portfolio Value: ${total_portfolio:,.0f}")
    print(f"  Total Profit: ${diversified_profit:+,.0f} ({diversified_return:+.1f}%)")
    print(f"  vs Best Single Strategy (SMCI): ${results['SMCI']['final_value']:,.0f}")
    
    diff = total_portfolio - results['SMCI']['final_value']
    print(f"  Difference: ${diff:+,.0f}")
    
    if diff > 0:
        print("  ✅ Diversification paid off!")
    else:
        print(f"  ❌ Single best strategy was better by ${abs(diff):,.0f}")

if __name__ == "__main__":
    simulate_100k_investment()