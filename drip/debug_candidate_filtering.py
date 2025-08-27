import pandas as pd
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def debug_candidate_filtering():
    """Debug why we only have 7-8 candidates per strategy"""
    
    print("🔍 DEBUGGING CANDIDATE FILTERING")
    print("=" * 60)
    
    # Load the most recent analysis results
    try:
        # Find the most recent monthly analysis file
        import glob
        files = glob.glob('monthly_analysis_*.csv')
        if not files:
            print("❌ No monthly analysis files found")
            return
        
        latest_file = max(files)
        print(f"📄 Loading: {latest_file}")
        
        df = pd.read_csv(latest_file)
        print(f"✅ Total tickers processed: {len(df)}")
        
    except Exception as e:
        print(f"❌ Error loading file: {e}")
        return
    
    # Check each strategy's data availability
    strategies = ['1st_to_2nd', '2nd_to_3rd', '3rd_to_4th', 'last_to_1st']
    strategy_names = {
        '1st_to_2nd': '1ST→2ND MONDAY',
        '2nd_to_3rd': '2ND→3RD MONDAY', 
        '3rd_to_4th': '3RD→4TH MONDAY',
        'last_to_1st': 'LAST→1ST MONDAY'
    }
    
    print(f"\n📊 DETAILED BREAKDOWN BY STRATEGY:")
    print("=" * 70)
    
    for strategy in strategies:
        print(f"\n🎯 {strategy_names[strategy]}:")
        print("-" * 50)
        
        # Count different types of data availability
        total_tickers = len(df)
        has_training = len(df[df[f'{strategy}_training_return'].notna()])
        has_testing = len(df[df[f'{strategy}_testing_return'].notna()])
        has_both = len(df[(df[f'{strategy}_training_return'].notna()) & 
                         (df[f'{strategy}_testing_return'].notna())])
        has_neither = len(df[(df[f'{strategy}_training_return'].isna()) & 
                            (df[f'{strategy}_testing_return'].isna())])
        
        print(f"   Total tickers: {total_tickers}")
        print(f"   Has training data: {has_training} ({has_training/total_tickers*100:.1f}%)")
        print(f"   Has testing data: {has_testing} ({has_testing/total_tickers*100:.1f}%)")
        print(f"   Has BOTH (valid): {has_both} ({has_both/total_tickers*100:.1f}%)")
        print(f"   Has NEITHER: {has_neither} ({has_neither/total_tickers*100:.1f}%)")
        
        # Show some examples of missing data
        missing_both = df[(df[f'{strategy}_training_return'].isna()) & 
                         (df[f'{strategy}_testing_return'].isna())]
        
        if len(missing_both) > 0:
            print(f"\n   📋 Sample tickers with NO data:")
            sample_missing = missing_both.head(10)
            for _, row in sample_missing.iterrows():
                print(f"      {row['ticker']} (${row['current_price']:.2f})")
        
        # Show examples of partial data
        has_training_only = df[(df[f'{strategy}_training_return'].notna()) & 
                              (df[f'{strategy}_testing_return'].isna())]
        has_testing_only = df[(df[f'{strategy}_training_return'].isna()) & 
                             (df[f'{strategy}_testing_return'].notna())]
        
        if len(has_training_only) > 0:
            print(f"\n   📊 Training data only: {len(has_training_only)} tickers")
            
        if len(has_testing_only) > 0:
            print(f"   📊 Testing data only: {len(has_testing_only)} tickers")
        
        # Show the valid candidates
        valid_candidates = df[(df[f'{strategy}_training_return'].notna()) & 
                             (df[f'{strategy}_testing_return'].notna())]
        
        if len(valid_candidates) > 0:
            print(f"\n   ✅ VALID CANDIDATES ({len(valid_candidates)}):")
            valid_sorted = valid_candidates.sort_values(f'{strategy}_training_return', ascending=False)
            print(f"   {'Rank':<4} {'Ticker':<6} {'Training':<10} {'Testing':<10} {'Price'}")
            print("   " + "-" * 50)
            for i, (_, row) in enumerate(valid_sorted.iterrows(), 1):
                print(f"   {i:<4} {row['ticker']:<6} {row[f'{strategy}_training_return']:+8.1f}% "
                      f"{row[f'{strategy}_testing_return']:+8.1f}% ${row['current_price']:<6.2f}")
    
    # Overall summary
    print(f"\n🎯 OVERALL SUMMARY:")
    print("=" * 40)
    
    # Count how many tickers have data for ANY strategy
    has_any_strategy = df[
        (df['1st_to_2nd_training_return'].notna() & df['1st_to_2nd_testing_return'].notna()) |
        (df['2nd_to_3rd_training_return'].notna() & df['2nd_to_3rd_testing_return'].notna()) |
        (df['3rd_to_4th_training_return'].notna() & df['3rd_to_4th_testing_return'].notna()) |
        (df['last_to_1st_training_return'].notna() & df['last_to_1st_testing_return'].notna())
    ]
    
    has_no_strategy = df[
        (df['1st_to_2nd_training_return'].isna() | df['1st_to_2nd_testing_return'].isna()) &
        (df['2nd_to_3rd_training_return'].isna() | df['2nd_to_3rd_testing_return'].isna()) &
        (df['3rd_to_4th_training_return'].isna() | df['3rd_to_4th_testing_return'].isna()) &
        (df['last_to_1st_training_return'].isna() | df['last_to_1st_testing_return'].isna())
    ]
    
    print(f"Tickers with ANY valid strategy: {len(has_any_strategy)} ({len(has_any_strategy)/len(df)*100:.1f}%)")
    print(f"Tickers with NO valid strategy: {len(has_no_strategy)} ({len(has_no_strategy)/len(df)*100:.1f}%)")
    
    # Price distribution
    print(f"\nPrice distribution:")
    print(f"   Over $5: {len(df[df['current_price'] > 5])}/{len(df)} ({len(df[df['current_price'] > 5])/len(df)*100:.1f}%)")
    print(f"   Under $5: {len(df[df['current_price'] <= 5])}/{len(df)}")
    
    # Show some examples of tickers with no strategy data
    if len(has_no_strategy) > 0:
        print(f"\n📋 Sample tickers with NO strategy data:")
        sample_none = has_no_strategy.head(20)
        for _, row in sample_none.iterrows():
            print(f"   {row['ticker']} (${row['current_price']:.2f})")

if __name__ == "__main__":
    debug_candidate_filtering()