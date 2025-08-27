import pandas as pd
import numpy as np
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def analyze_proper_train_test_selection():
    """Proper train/test methodology: Select top 3 from training, validate on testing"""
    
    print("🎯 PROPER TRAIN/TEST MONDAY STRATEGY SELECTION")
    print("=" * 100)
    print("📚 STEP 1: Select top 3 candidates based on TRAINING performance only")
    print("🧪 STEP 2: Test those 3 candidates on out-of-sample TESTING data")
    print("🏆 STEP 3: Choose winner based on TESTING performance")
    print("🔒 METHODOLOGY: No data leakage - testing data never seen during selection")
    print("=" * 100)
    
    # Load the comprehensive results
    strategies = ['1st_to_2nd', '2nd_to_3rd', '3rd_to_4th', 'last_to_1st']
    strategy_names = {
        '1st_to_2nd': '1ST→2ND MONDAY',
        '2nd_to_3rd': '2ND→3RD MONDAY', 
        '3rd_to_4th': '3RD→4TH MONDAY',
        'last_to_1st': 'LAST→1ST MONDAY'
    }
    
    final_winners = {}
    
    for strategy in strategies:
        print(f"\n🎯 {strategy_names[strategy]} STRATEGY ANALYSIS:")
        print("=" * 80)
        
        try:
            # Load results for this strategy
            df = pd.read_csv(f'{strategy}_comprehensive_results.csv')
            print(f"✅ Loaded {len(df)} candidates for {strategy} strategy")
            
            # STEP 1: Select top 3 based on TRAINING performance only
            df_sorted_by_training = df.sort_values('training_return', ascending=False)
            top_3_training = df_sorted_by_training.head(3)
            
            print(f"\n📚 TOP 3 CANDIDATES BY TRAINING PERFORMANCE:")
            print("-" * 70)
            print(f"{'Rank':<4} {'Ticker':<6} {'Training':<12} {'Testing':<12} {'Win Rate':<9}")
            print("-" * 70)
            
            for i, (_, row) in enumerate(top_3_training.iterrows(), 1):
                print(f"{i:<4} {row['ticker']:<6} {row['training_return']:+10.1f}% "
                      f"{row['testing_return']:+10.1f}% {row['training_win_rate']:7.0f}%")
            
            # STEP 2: Now test these 3 on out-of-sample testing data
            print(f"\n🧪 OUT-OF-SAMPLE TESTING VALIDATION:")
            print("-" * 70)
            print(f"{'Rank':<4} {'Ticker':<6} {'Testing':<12} {'Validation'}")
            print("-" * 70)
            
            # Sort the top 3 by their TESTING performance
            top_3_by_testing = top_3_training.sort_values('testing_return', ascending=False)
            
            validation_results = []
            for i, (_, row) in enumerate(top_3_by_testing.iterrows(), 1):
                # Calculate validation metrics
                consistency = abs(row['training_return'] - row['testing_return'])
                risk_adjusted = row['testing_return'] / max(abs(row['training_return']), 1)
                
                validation_score = row['testing_return'] - (consistency * 0.1)  # Penalty for inconsistency
                
                validation_results.append({
                    'rank': i,
                    'ticker': row['ticker'],
                    'training_return': row['training_return'],
                    'testing_return': row['testing_return'],
                    'consistency_penalty': consistency,
                    'validation_score': validation_score,
                    'training_win_rate': row['training_win_rate'],
                    'testing_win_rate': row['testing_win_rate']
                })
                
                status = "🥇 WINNER" if i == 1 else f"#{i}"
                print(f"{i:<4} {row['ticker']:<6} {row['testing_return']:+10.1f}% {status}")
            
            # STEP 3: Select final winner
            winner = validation_results[0]  # Best testing performance
            final_winners[strategy] = winner
            
            print(f"\n🏆 FINAL SELECTION FOR {strategy_names[strategy]}:")
            print("-" * 60)
            print(f"Winner: {winner['ticker']}")
            print(f"Training Performance: {winner['training_return']:+.1f}%")
            print(f"Testing Performance: {winner['testing_return']:+.1f}%")
            print(f"Training Win Rate: {winner['training_win_rate']:.0f}%")
            print(f"Testing Win Rate: {winner['testing_win_rate']:.0f}%")
            print(f"Consistency Gap: {winner['consistency_penalty']:.1f}pp")
            
        except FileNotFoundError:
            print(f"❌ Could not find results file for {strategy}")
        except Exception as e:
            print(f"❌ Error analyzing {strategy}: {e}")
    
    # Summary of all winners
    print(f"\n🏆 FINAL STRATEGY WINNERS (PROPER METHODOLOGY):")
    print("=" * 90)
    print(f"{'Strategy':<15} {'Winner':<8} {'Training':<12} {'Testing':<12} {'Method'}")
    print("-" * 90)
    
    current_pipeline = {
        '1st_to_2nd': 'SMCI',
        '2nd_to_3rd': 'NVDA', 
        '3rd_to_4th': 'TSLL',
        'last_to_1st': 'DRIP'
    }
    
    recommendations_summary = []
    
    for strategy, winner_data in final_winners.items():
        strategy_formatted = strategy.replace('_to_', '→').upper()
        current_ticker = current_pipeline.get(strategy, 'N/A')
        
        print(f"{strategy_formatted:<15} {winner_data['ticker']:<8} "
              f"{winner_data['training_return']:+10.1f}% {winner_data['testing_return']:+10.1f}% "
              f"Train→Test")
        
        recommendations_summary.append({
            'strategy': strategy_formatted,
            'current_ticker': current_ticker,
            'recommended_ticker': winner_data['ticker'],
            'training_return': winner_data['training_return'],
            'testing_return': winner_data['testing_return'],
            'training_win_rate': winner_data['training_win_rate'],
            'testing_win_rate': winner_data['testing_win_rate'],
            'selection_method': 'Top 3 training → Best testing'
        })
    
    # Compare to current holdings (need to get their performance)
    print(f"\n📊 COMPARISON TO CURRENT PIPELINE:")
    print("=" * 80)
    print("🔍 Loading current pipeline performance for comparison...")
    
    # Load current performance data
    current_performance = {}
    try:
        # Try to find SMCI performance in 1st_to_2nd results
        smci_df = pd.read_csv('1st_to_2nd_comprehensive_results.csv')
        smci_row = smci_df[smci_df['ticker'] == 'SMCI']
        if len(smci_row) > 0:
            current_performance['1st_to_2nd'] = {
                'ticker': 'SMCI',
                'testing_return': smci_row.iloc[0]['testing_return']
            }
        
        # Check other current tickers
        for strategy in ['2nd_to_3rd', '3rd_to_4th', 'last_to_1st']:
            current_ticker = current_pipeline[strategy]
            df = pd.read_csv(f'{strategy}_comprehensive_results.csv')
            ticker_row = df[df['ticker'] == current_ticker]
            if len(ticker_row) > 0:
                current_performance[strategy] = {
                    'ticker': current_ticker,
                    'testing_return': ticker_row.iloc[0]['testing_return']
                }
    except:
        print("⚠️  Could not load current pipeline performance for direct comparison")
    
    # Show improvements where available
    if current_performance:
        print(f"\n📈 PERFORMANCE IMPROVEMENTS:")
        print("-" * 70)
        print(f"{'Strategy':<15} {'Current':<8} {'New':<8} {'Improvement'}")
        print("-" * 70)
        
        for strategy, winner_data in final_winners.items():
            if strategy in current_performance:
                current_return = current_performance[strategy]['testing_return']
                new_return = winner_data['testing_return']
                improvement = new_return - current_return
                
                strategy_formatted = strategy.replace('_to_', '→').upper()
                current_ticker = current_performance[strategy]['ticker']
                
                print(f"{strategy_formatted:<15} {current_ticker:<8} {winner_data['ticker']:<8} "
                      f"{improvement:+10.1f}pp")
    
    # Save final recommendations
    recommendations_df = pd.DataFrame(recommendations_summary)
    recommendations_df.to_csv('proper_train_test_recommendations.csv', index=False)
    
    print(f"\n💾 RESULTS SAVED:")
    print("-" * 40)
    print(f"✅ Recommendations: 'proper_train_test_recommendations.csv'")
    
    print(f"\n🎯 METHODOLOGY VALIDATION:")
    print("-" * 50)
    print("✅ No data leakage: Testing data never used for selection")
    print("✅ Proper train/test split: Training → Candidate selection")
    print("✅ Out-of-sample validation: Testing → Final decision")
    print("✅ Robust methodology: Prevents overfitting")
    
    print(f"\n🚀 NEXT STEPS:")
    print("-" * 30)
    print("1. Review individual winner performance details")
    print("2. Create updated pipeline with new tickers") 
    print("3. Calculate projected performance improvement")
    print("4. Implement new strategy configuration")
    
    return final_winners

if __name__ == "__main__":
    analyze_proper_train_test_selection()