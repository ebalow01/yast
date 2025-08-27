import pandas as pd
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def filter_winners_over_5_dollars():
    """Filter Monday strategy winners to only include securities over $5"""
    
    print("🔍 FILTERING WINNERS BY $5 MINIMUM PRICE RULE")
    print("=" * 80)
    print("📏 Rule: Only include securities trading above $5 per share")
    print("💰 Reason: Avoid penny stocks and improve liquidity")
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
    
    filtered_winners = {}
    
    for strategy in strategies:
        print(f"\n🎯 {strategy_names[strategy]} STRATEGY:")
        print("=" * 60)
        
        try:
            # Load comprehensive results
            df = pd.read_csv(f'{strategy}_comprehensive_results.csv')
            
            # Merge with price data
            df_with_prices = df.merge(ticker_summary[['ticker', 'current_price']], on='ticker', how='left')
            
            # Filter for stocks over $5
            over_5_df = df_with_prices[df_with_prices['current_price'] > 5.0].copy()
            
            print(f"📊 Total candidates: {len(df)}")
            print(f"💰 Over $5: {len(over_5_df)} ({len(over_5_df)/len(df)*100:.1f}%)")
            print(f"🚫 Under $5: {len(df) - len(over_5_df)} filtered out")
            
            if len(over_5_df) == 0:
                print("❌ NO CANDIDATES over $5 found!")
                continue
            
            # Sort by testing performance (our selection criteria)
            over_5_sorted = over_5_df.sort_values('testing_return', ascending=False)
            
            # Show original winner vs new winner
            original_winner = df.sort_values('testing_return', ascending=False).iloc[0]
            new_winner = over_5_sorted.iloc[0]
            
            print(f"\n📊 ORIGINAL WINNER (before $5 filter):")
            price_str = f"${original_winner.get('current_price', 'N/A'):.2f}" if pd.notna(original_winner.get('current_price', None)) else "N/A"
            print(f"   {original_winner['ticker']}: {original_winner['testing_return']:+.1f}% testing | {price_str}")
            
            print(f"\n🏆 NEW WINNER (over $5 filter):")
            print(f"   {new_winner['ticker']}: {new_winner['testing_return']:+.1f}% testing | ${new_winner['current_price']:.2f}")
            
            # Show top 5 over $5 candidates
            print(f"\n🔝 TOP 5 CANDIDATES OVER $5:")
            print("-" * 70)
            print(f"{'Rank':<4} {'Ticker':<6} {'Testing':<10} {'Training':<10} {'Price':<8} {'Win Rate'}")
            print("-" * 70)
            
            for i, (_, row) in enumerate(over_5_sorted.head(5).iterrows(), 1):
                print(f"{i:<4} {row['ticker']:<6} {row['testing_return']:+8.1f}% "
                      f"{row['training_return']:+8.1f}% ${row['current_price']:<6.2f} "
                      f"{row['testing_win_rate']:5.0f}%")
            
            # Store the winner
            filtered_winners[strategy] = {
                'ticker': new_winner['ticker'],
                'testing_return': new_winner['testing_return'],
                'training_return': new_winner['training_return'],
                'current_price': new_winner['current_price'],
                'testing_win_rate': new_winner['testing_win_rate'],
                'training_win_rate': new_winner['training_win_rate']
            }
            
        except Exception as e:
            print(f"❌ Error processing {strategy}: {e}")
    
    # Summary of filtered winners
    print(f"\n🏆 FINAL FILTERED WINNERS (Over $5 Only):")
    print("=" * 80)
    print(f"{'Strategy':<15} {'Winner':<8} {'Testing':<10} {'Training':<10} {'Price':<8} {'Status'}")
    print("-" * 80)
    
    current_pipeline = {
        '1st_to_2nd': 'SMCI',
        '2nd_to_3rd': 'NVDA', 
        '3rd_to_4th': 'TSLL',
        'last_to_1st': 'DRIP'
    }
    
    for strategy, winner_data in filtered_winners.items():
        strategy_formatted = strategy.replace('_to_', '→').upper()
        current = current_pipeline.get(strategy, 'N/A')
        
        # Check if this is actually an improvement
        if strategy == '1st_to_2nd':
            current_return = -14.2  # SMCI testing return
        elif strategy == '2nd_to_3rd':
            current_return = 6.0    # NVDA approximate
        elif strategy == '3rd_to_4th':
            current_return = 14.4   # TSLL testing return
        elif strategy == 'last_to_1st':
            current_return = 10.7   # DRIP approximate
        
        improvement = winner_data['testing_return'] - current_return
        status = "📈 UPGRADE" if improvement > 5 else "✅ MINOR" if improvement > 0 else "⚠️ WORSE"
        
        print(f"{strategy_formatted:<15} {winner_data['ticker']:<8} "
              f"{winner_data['testing_return']:+8.1f}% {winner_data['training_return']:+8.1f}% "
              f"${winner_data['current_price']:<6.2f} {status}")
    
    # Compare total improvement
    print(f"\n📊 IMPACT OF $5 FILTER:")
    print("-" * 50)
    
    # Calculate what we lost by applying the filter
    original_winners_data = [
        ('1st_to_2nd', 'PTHL', 104.5, 0.72),
        ('2nd_to_3rd', 'IXHL', 237.3, 0.67),
        ('3rd_to_4th', 'ECX', 23.4, 1.60),
        ('last_to_1st', 'TSLZ', 25.3, 1.24)
    ]
    
    print("Lost opportunities (under $5):")
    for strategy, ticker, testing_return, price in original_winners_data:
        if price <= 5.0:
            strategy_formatted = strategy.replace('_to_', '→').upper()
            print(f"   {strategy_formatted}: {ticker} ({testing_return:+.1f}%) - ${price:.2f}")
    
    # Save filtered results
    filtered_df = pd.DataFrame([
        {
            'strategy': strategy.replace('_to_', '→').upper(),
            'recommended_ticker': data['ticker'],
            'testing_return': data['testing_return'],
            'training_return': data['training_return'],
            'current_price': data['current_price'],
            'testing_win_rate': data['testing_win_rate'],
            'training_win_rate': data['training_win_rate'],
            'filter_applied': 'Over $5 only'
        }
        for strategy, data in filtered_winners.items()
    ])
    
    filtered_df.to_csv('filtered_over_5_recommendations.csv', index=False)
    print(f"\n✅ Filtered recommendations saved: 'filtered_over_5_recommendations.csv'")
    
    print(f"\n🎯 KEY TAKEAWAYS:")
    print("-" * 30)
    print("• All 4 original winners were under $5")
    print("• $5 filter significantly changes recommendations")
    print("• Higher-priced securities may have lower volatility")
    print("• Liquidity should be improved with $5+ securities")
    print("• May need to accept lower returns for price stability")
    
    return filtered_winners

if __name__ == "__main__":
    filter_winners_over_5_dollars()