import pandas as pd
import numpy as np
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def calculate_rsi(prices, period=14):
    """
    Calculate RSI (Relative Strength Index) for given prices
    RSI = 100 - (100 / (1 + RS))
    RS = Average Gain / Average Loss over the period
    """
    if len(prices) < period + 1:
        return [np.nan] * len(prices)
    
    # Calculate price changes
    deltas = np.diff(prices)
    
    # Separate gains and losses
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    
    # Calculate initial average gain and loss (SMA for first calculation)
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])
    
    rsi_values = [np.nan] * period  # First 'period' values are NaN
    
    # Calculate RSI for the first valid point
    if avg_loss == 0:
        rsi = 100.0
    else:
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
    
    rsi_values.append(rsi)
    
    # Calculate RSI for remaining points using Wilder's smoothing
    for i in range(period + 1, len(prices)):
        gain = gains[i - 1]
        loss = losses[i - 1]
        
        # Wilder's smoothing (exponential moving average with alpha = 1/period)
        avg_gain = ((avg_gain * (period - 1)) + gain) / period
        avg_loss = ((avg_loss * (period - 1)) + loss) / period
        
        if avg_loss == 0:
            rsi = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
        
        rsi_values.append(rsi)
    
    return rsi_values

def add_rsi_to_csv():
    """Add 14-day RSI calculation to the DRIP CSV data"""
    
    print("Adding 14-day RSI to DRIP data...")
    print("=" * 50)
    
    # Load the existing data
    df = pd.read_csv('drip_15min_data.csv')
    print(f"Loaded {len(df):,} records")
    
    # Convert timestamp and sort to ensure proper order
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    print(f"Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    
    # Group by date to calculate daily RSI
    # We'll use daily closing prices for RSI calculation
    print("\n📊 Calculating daily closing prices...")
    daily_data = df.groupby(df['timestamp'].dt.date).agg({
        'close': 'last',      # Daily closing price
        'high': 'max',        # Daily high
        'low': 'min',         # Daily low
        'open': 'first',      # Daily open
        'volume': 'sum'       # Total daily volume
    }).reset_index()
    
    # The index is now the date, let's rename it
    daily_data = daily_data.rename(columns={'timestamp': 'date'})
    
    daily_data = daily_data.sort_values('date').reset_index(drop=True)
    print(f"Created {len(daily_data)} daily records")
    
    # Calculate RSI on daily closing prices
    print("\n📈 Calculating 14-day RSI...")
    closing_prices = daily_data['close'].values
    rsi_values = calculate_rsi(closing_prices, period=14)
    daily_data['rsi_14'] = rsi_values
    
    # Count valid RSI values
    valid_rsi_count = sum(1 for x in rsi_values if not np.isnan(x))
    print(f"✅ Calculated RSI for {valid_rsi_count} days ({len(rsi_values) - valid_rsi_count} NaN values for initial period)")
    
    # Create a mapping from date to RSI
    date_to_rsi = {}
    for _, row in daily_data.iterrows():
        date = row['date']
        date_to_rsi[date] = row['rsi_14']
    
    # Add RSI to the original 15-minute data
    print("\n🔗 Mapping RSI to 15-minute data...")
    df['date'] = df['timestamp'].dt.date
    df['rsi_14'] = df['date'].map(date_to_rsi)
    df = df.drop('date', axis=1)  # Remove temporary date column
    
    # Verify the RSI calculation
    print("\n🔍 RSI Statistics:")
    rsi_stats = df['rsi_14'].describe()
    print(f"  Count (non-NaN): {rsi_stats['count']:,.0f}")
    print(f"  Mean RSI: {rsi_stats['mean']:.2f}")
    print(f"  Min RSI: {rsi_stats['min']:.2f}")
    print(f"  Max RSI: {rsi_stats['max']:.2f}")
    print(f"  Standard Deviation: {rsi_stats['std']:.2f}")
    
    # Show some sample RSI values
    print(f"\n📋 Sample RSI values:")
    sample_data = df[df['rsi_14'].notna()].tail(10)[['timestamp', 'close', 'rsi_14']]
    for _, row in sample_data.iterrows():
        print(f"  {row['timestamp']}: Close=${row['close']:.2f}, RSI={row['rsi_14']:.2f}")
    
    # Check for extreme RSI values (potential oversold/overbought signals)
    oversold = df[df['rsi_14'] <= 30]
    overbought = df[df['rsi_14'] >= 70]
    
    print(f"\n⚠️ RSI Signal Analysis:")
    print(f"  Oversold periods (RSI ≤ 30): {len(oversold):,} bars ({len(oversold)/len(df[df['rsi_14'].notna()])*100:.1f}%)")
    print(f"  Overbought periods (RSI ≥ 70): {len(overbought):,} bars ({len(overbought)/len(df[df['rsi_14'].notna()])*100:.1f}%)")
    print(f"  Neutral periods (30 < RSI < 70): {len(df[(df['rsi_14'] > 30) & (df['rsi_14'] < 70)]):,} bars")
    
    if len(oversold) > 0:
        print(f"\n  Most recent oversold: {oversold['timestamp'].max()}")
        min_rsi_idx = df['rsi_14'].idxmin()
        print(f"  Lowest RSI value: {df['rsi_14'].min():.2f} on {df.loc[min_rsi_idx, 'timestamp']}")
    
    if len(overbought) > 0:
        print(f"  Most recent overbought: {overbought['timestamp'].max()}")
        max_rsi_idx = df['rsi_14'].idxmax()
        print(f"  Highest RSI value: {df['rsi_14'].max():.2f} on {df.loc[max_rsi_idx, 'timestamp']}")
    
    # Save the updated CSV
    output_file = 'drip_15min_data_with_rsi.csv'
    df.to_csv(output_file, index=False)
    
    print(f"\n✅ Updated data saved to '{output_file}'")
    print(f"   File now contains {len(df):,} records with RSI data")
    print(f"   New columns: timestamp, open, high, low, close, volume, vwap, transactions, rsi_14")
    
    # Also update the original file
    df.to_csv('drip_15min_data.csv', index=False)
    print(f"   Original file 'drip_15min_data.csv' also updated with RSI column")
    
    # Create a daily RSI summary file
    daily_summary = daily_data[['date', 'open', 'high', 'low', 'close', 'volume', 'rsi_14']].copy()
    daily_summary.to_csv('drip_daily_with_rsi.csv', index=False)
    print(f"   Daily summary saved to 'drip_daily_with_rsi.csv' ({len(daily_summary)} records)")
    
    return df

if __name__ == "__main__":
    add_rsi_to_csv()