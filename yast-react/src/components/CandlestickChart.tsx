import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import { ComposedChart, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';

interface CandlestickData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickResponse {
  ticker: string;
  period: string;
  interval: string;
  data_points: number;
  first_timestamp?: string;
  last_timestamp?: string;
  candlesticks: CandlestickData[];
  error?: string;
}

interface CandlestickChartProps {
  ticker: string;
  onClose?: () => void;
}


const CandlestickChart: React.FC<CandlestickChartProps> = ({ ticker }) => {
  const [data, setData] = useState<CandlestickResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCandlestickData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Always try to use real data from Netlify function
        const response = await fetch(`/.netlify/functions/candlestick-data?ticker=${ticker}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseText = await response.text();
        let result: CandlestickResponse;
        
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          // If response starts with HTML, it's likely a 404 or server error
          if (responseText.toLowerCase().includes('<!doctype html>')) {
            throw new Error(`Netlify function not found or returned HTML error page. Function may not be deployed.`);
          }
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
        }
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (ticker) {
      fetchCandlestickData();
    }
  }, [ticker]);


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ ml: 1 }}>Loading {ticker} chart...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="error">
          Failed to load chart data: {error}
        </Typography>
      </Box>
    );
  }

  if (!data || !data.candlesticks || data.candlesticks.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No chart data available for {ticker}
        </Typography>
      </Box>
    );
  }

  // Prepare data for candlestick chart with better sampling for tooltip
  const chartData = data.candlesticks
    .filter((_, index) => index % Math.max(1, Math.floor(data.candlesticks.length / 50)) === 0) // Sample for performance
    .map((candle, index) => ({
      index,
      time: new Date(candle.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      date: new Date(candle.timestamp).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      price: candle.close,
      high: candle.high,
      low: candle.low,
      open: candle.open,
      volume: candle.volume,
      fullData: candle
    }));


  // Calculate volume statistics for thickness scaling
  const volumes = chartData.map(c => c.volume);
  const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
  const maxVolume = Math.max(...volumes);
  const minVolume = Math.min(...volumes);

  // Get price range for chart
  const prices = chartData.flatMap(c => [c.high, c.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.05;


  return (
    <Box sx={{ 
      width: 800, 
      height: 600,
      backgroundColor: 'rgba(0,0,0,0.95)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: 2,
      p: 2
    }}>
      <Typography variant="h6" sx={{ 
        mb: 2, 
        textAlign: 'center', 
        color: '#00D4FF',
        fontWeight: 600 
      }}>
        {ticker} - 7 Day Chart ({data.data_points} points)
      </Typography>
      
      <Box sx={{ position: 'relative', width: '100%', height: 520 }}>
        <svg width="100%" height="100%" style={{ background: 'transparent' }}>
          {/* Chart background grid */}
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Candlesticks */}
          {chartData.map((candle, index) => {
            const chartWidth = 680; // Chart width
            const x = (index / (chartData.length - 1)) * chartWidth + 60; // Chart area with margins
            const chartHeight = 400; // Chart height
            const chartTop = 40;
            
            const { open, high, low, price: close, volume } = candle;
            
            // Safety checks for undefined values
            if (typeof open !== 'number' || typeof high !== 'number' || typeof low !== 'number' || typeof close !== 'number' || typeof volume !== 'number') {
              console.warn(`Invalid candle data at index ${index}:`, candle);
              return null;
            }
            
            const isGreen = close > open;
            const isRed = close < open;
            const isDoji = Math.abs(close - open) < (high - low) * 0.1; // Doji candle
            
            // Color logic: Green for up, Red for down, Yellow for doji
            const color = isDoji ? '#ffaa00' : (isGreen ? '#00ff88' : '#ff4444');
            
            
            // Calculate Y positions
            const priceRange = maxPrice + padding - (minPrice - padding);
            const yScale = chartHeight / priceRange;
            const yOffset = chartTop;
            
            const highY = yOffset + (maxPrice + padding - high) * yScale;
            const lowY = yOffset + (maxPrice + padding - low) * yScale;
            const openY = yOffset + (maxPrice + padding - open) * yScale;
            const closeY = yOffset + (maxPrice + padding - close) * yScale;
            
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.abs(closeY - openY);
            
            // Volume-based width scaling
            const volumeRatio = volume / avgVolume;
            const baseWidth = chartWidth / chartData.length * 0.6;
            const volumeMultiplier = 0.5 + (volumeRatio * 0.8); // Scale between 0.5x and 1.3x
            const candleWidth = Math.max(3, Math.min(16, baseWidth * volumeMultiplier));
            
            return (
              <g key={index}>
                {/* Wick */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={color}
                  strokeWidth={Math.max(1, candleWidth * 0.1)}
                />
                {/* Body - traditional candlestick styling */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={Math.max(bodyHeight, isDoji ? 2 : 3)}
                  fill={isDoji ? color : (isGreen ? color : 'transparent')}
                  stroke={color}
                  strokeWidth={1.5}
                  opacity={1}
                />
                {/* Invisible hover area */}
                <rect
                  x={x - candleWidth * 1.5}
                  y={chartTop}
                  width={candleWidth * 3}
                  height={chartHeight}
                  fill="transparent"
                  style={{ cursor: 'crosshair' }}
                  onMouseEnter={(e) => {
                    // Show tooltip
                    const tooltip = document.getElementById('candlestick-tooltip');
                    if (tooltip) {
                      tooltip.style.display = 'block';
                      tooltip.style.left = `${e.clientX + 10}px`;
                      tooltip.style.top = `${e.clientY - 100}px`;
                      const change = close - open;
                      const changePercent = (change / open * 100);
                      const candleType = isDoji ? 'Doji' : (isGreen ? 'Bullish' : 'Bearish');
                      const volumeVsAvg = ((volume / avgVolume - 1) * 100);
                      
                      tooltip.innerHTML = `
                        <div style="background: rgba(0,0,0,0.95); color: white; padding: 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; font-size: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                          <div style="color: #00D4FF; font-weight: 600; margin-bottom: 6px; font-size: 13px;">${candle.date} ${candle.time}</div>
                          <div style="margin-bottom: 2px;">Open: $${open.toFixed(2)}</div>
                          <div style="margin-bottom: 2px;">High: $${high.toFixed(2)}</div>
                          <div style="margin-bottom: 2px;">Low: $${low.toFixed(2)}</div>
                          <div style="color: ${color}; font-weight: 600; margin-bottom: 4px;">Close: $${close.toFixed(2)} (${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)</div>
                          <div style="color: rgba(255,255,255,0.7); font-size: 11px; margin-bottom: 2px;">Volume: ${volume.toLocaleString()}</div>
                          <div style="color: rgba(255,255,255,0.6); font-size: 10px;">${candleType} • Vol ${volumeVsAvg >= 0 ? '+' : ''}${volumeVsAvg.toFixed(0)}% vs avg</div>
                        </div>
                      `;
                    }
                  }}
                  onMouseLeave={() => {
                    const tooltip = document.getElementById('candlestick-tooltip');
                    if (tooltip) {
                      tooltip.style.display = 'none';
                    }
                  }}
                />
              </g>
            );
          })}
          
          {/* Y-axis labels */}
          {Array.from({ length: 6 }, (_, i) => {
            const price = minPrice - padding + (i / 5) * (maxPrice + padding - (minPrice - padding));
            const y = 40 + (5 - i) * (400 / 5);
            return (
              <text 
                key={i}
                x={10} 
                y={y + 4} 
                fill="rgba(255,255,255,0.7)" 
                fontSize="11"
                fontWeight="500"
              >
                ${price.toFixed(2)}
              </text>
            );
          })}
          
          {/* X-axis labels with better spacing */}
          {Array.from({ length: 8 }, (_, i) => {
            const dataIndex = Math.floor((i / 7) * (chartData.length - 1));
            const candle = chartData[dataIndex];
            if (!candle) return null;
            
            const x = (dataIndex / (chartData.length - 1)) * 680 + 60;
            return (
              <g key={i}>
                <text 
                  x={x} 
                  y={470} 
                  fill="rgba(255,255,255,0.7)" 
                  fontSize="10"
                  fontWeight="500"
                  textAnchor="middle"
                >
                  {candle.time}
                </text>
                <text 
                  x={x} 
                  y={485} 
                  fill="rgba(255,255,255,0.5)" 
                  fontSize="9"
                  textAnchor="middle"
                >
                  {candle.date}
                </text>
              </g>
            );
          })}
        </svg>
        
        {/* Tooltip container */}
        <div 
          id="candlestick-tooltip" 
          style={{ 
            position: 'fixed', 
            display: 'none', 
            zIndex: 1000, 
            pointerEvents: 'none' 
          }} 
        />
      </Box>
      
      <Typography variant="caption" sx={{ 
        display: 'block', 
        textAlign: 'center', 
        mt: 1,
        color: 'rgba(255,255,255,0.5)',
        fontSize: '0.7rem'
      }}>
        Last updated: {data.last_timestamp ? new Date(data.last_timestamp).toLocaleString() : 'Unknown'}
      </Typography>
    </Box>
  );
};

export default CandlestickChart;