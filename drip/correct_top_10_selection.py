import pandas as pd
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def correct_top_10_selection():
    """Properly select from top 10 training candidates only, then pick best testing performer"""
    
    print("🔍 CORRECTING SELECTION - TOP 10 TRAINING CANDIDATES ONLY")
    print("=" * 80)
    print("📏 Rule: Only consider top 10 training performers for testing evaluation")
    print("🎯 Goal: Pick best testing performer from top 10 training candidates")
    print("💰 Filter: Must be over $5 per share")
    print("=" * 80)
    
    # Load ticker summary for price data
    try:
        ticker_summary = pd.read_csv('top_300_tickers_summary.csv')
        print(f"✅ Loaded price data for {len(ticker_summary)} tickers")
    except:
        print("❌ Could not load ticker summary")
        return
    
    strategies = ['1st_to_2nd', '2nd_to_3rd', '3rd_to_4th', 'last_to_1st']
    strategy_names = {
        '1st_to_2nd': '1ST→2ND MONDAY',
        '2nd_to_3rd': '2ND→3RD MONDAY', 
        '3rd_to_4th': '3RD→4TH MONDAY',
        'last_to_1st': 'LAST→1ST MONDAY'
    }
    
    corrected_winners = {}
    
    for strategy in strategies:
        print(f"\n🎯 {strategy_names[strategy]} STRATEGY:")
        print("=" * 60)
        
        try:
            # Load comprehensive results
            df = pd.read_csv(f'{strategy}_comprehensive_results.csv')
            
            # Merge with price data
            df_with_prices = df.merge(ticker_summary[['ticker', 'current_price']], on='ticker', how='left')
            
            # Filter for stocks over $5 FIRST
            over_5_df = df_with_prices[df_with_prices['current_price'] > 5.0].copy()
            
            print(f"📊 Total candidates: {len(df)}")
            print(f"💰 Over $5: {len(over_5_df)} ({len(over_5_df)/len(df)*100:.1f}%)")
            
            if len(over_5_df) == 0:
                print("❌ NO CANDIDATES over $5 found!")
                continue
            
            # Step 1: Get top 10 by TRAINING performance (from over $5 candidates only)
            top_10_training = over_5_df.nlargest(10, 'training_return')
            
            print(f"\n📚 TOP 10 TRAINING PERFORMERS (Over $5 only):")
            print("-" * 80)
            print(f"{'Rank':<4} {'Ticker':<6} {'Training':<10} {'Testing':<10} {'Price':<8} {'Win Rate'}")
            print("-" * 80)
            
            for i, (_, row) in enumerate(top_10_training.iterrows(), 1):
                print(f"{i:<4} {row['ticker']:<6} {row['training_return']:+8.1f}% "
                      f"{row['testing_return']:+8.1f}% ${row['current_price']:<6.2f} "
                      f"{row['testing_win_rate']:5.0f}%")
            
            # Step 2: From these top 10 training performers, pick the best TESTING performer
            best_testing_from_top10 = top_10_training.nlargest(1, 'testing_return').iloc[0]
            
            print(f"\n🏆 WINNER (Best testing from top 10 training):")
            print(f"   {best_testing_from_top10['ticker']}: Training {best_testing_from_top10['training_return']:+.1f}% | "
                  f"Testing {best_testing_from_top10['testing_return']:+.1f}% | ${best_testing_from_top10['current_price']:.2f}")
            
            # Show what rank this ticker was in training
            training_rank = (top_10_training['training_return'] >= best_testing_from_top10['training_return']).sum()
            print(f"   📊 Training Rank: #{training_rank} out of top 10")
            
            # Store the winner
            corrected_winners[strategy] = {
                'ticker': best_testing_from_top10['ticker'],
                'training_return': best_testing_from_top10['training_return'],
                'testing_return': best_testing_from_top10['testing_return'],
                'current_price': best_testing_from_top10['current_price'],
                'testing_win_rate': best_testing_from_top10['testing_win_rate'],
                'training_win_rate': best_testing_from_top10['training_win_rate'],
                'training_rank_in_top10': training_rank
            }
            
        except Exception as e:
            print(f"❌ Error processing {strategy}: {e}")
    
    # Summary of corrected winners
    print(f"\n🏆 CORRECTED WINNERS (Top 10 Training → Best Testing):") 
    print("=" * 90)
    print(f"{'Strategy':<15} {'Winner':<8} {'Tr.Rank':<8} {'Training':<10} {'Testing':<10} {'Price':<8}")
    print("-" * 90)
    
    total_testing_return = 1.0
    
    for strategy, winner_data in corrected_winners.items():
        strategy_formatted = strategy.replace('_to_', '→').upper()
        
        print(f"{strategy_formatted:<15} {winner_data['ticker']:<8} "
              f"#{winner_data['training_rank_in_top10']:<7} "
              f"{winner_data['training_return']:+8.1f}% {winner_data['testing_return']:+8.1f}% "
              f"${winner_data['current_price']:<6.2f}")
        
        # Calculate compound return
        total_testing_return *= (1 + winner_data['testing_return'] / 100)
    
    compound_testing_return = (total_testing_return - 1) * 100
    
    print(f"\n📊 CORRECTED PIPELINE PERFORMANCE:")
    print(f"   Combined Testing Return: {compound_testing_return:+.1f}%")
    print(f"   Methodology: Top 10 training → Best testing from those 10")
    print(f"   All securities: Over $5 per share ✅")
    
    # Compare to previous incorrect selection
    print(f"\n🔄 COMPARISON TO PREVIOUS SELECTION:")
    print("-" * 50)
    previous_winners = [
        ('1ST→2ND', 'QS', 73.6),
        ('2ND→3RD', 'CRML', 242.2), 
        ('3RD→4TH', 'OSCR', 47.6),
        ('LAST→1ST', 'UNIT', 39.0)
    ]
    
    previous_compound = 1.0
    for _, _, ret in previous_winners:
        previous_compound *= (1 + ret / 100)
    previous_compound = (previous_compound - 1) * 100
    
    print(f"Previous (incorrect): {previous_compound:+.1f}%")
    print(f"Corrected (top 10): {compound_testing_return:+.1f}%") 
    print(f"Difference: {compound_testing_return - previous_compound:+.1f}pp")
    
    # Save corrected results
    corrected_df = pd.DataFrame([
        {
            'strategy': strategy.replace('_to_', '→').upper(),
            'recommended_ticker': data['ticker'],
            'training_return': data['training_return'],
            'testing_return': data['testing_return'],
            'current_price': data['current_price'],
            'testing_win_rate': data['testing_win_rate'],
            'training_win_rate': data['training_win_rate'],
            'training_rank_in_top10': data['training_rank_in_top10'],
            'selection_method': 'Top 10 training → Best testing'
        }
        for strategy, data in corrected_winners.items()
    ])
    
    corrected_df.to_csv('corrected_top_10_recommendations.csv', index=False)
    print(f"\n✅ Corrected recommendations saved: 'corrected_top_10_recommendations.csv'")
    
    return corrected_winners

if __name__ == "__main__":
    correct_top_10_selection()