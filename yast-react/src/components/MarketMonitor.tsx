import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Button,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  AttachMoney,
  Refresh,
  WarningAmber
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface Strategy {
  name: string;
  successRate: string;
  requiresCash: boolean;
  requiresShares: boolean;
  action: string;
  strike: string;
  dte: string;
  position: string;
  roll: string;
  goal: string;
}

interface Recommendation {
  zone: string;
  zoneTitle: string;
  vixNotice: string | null;
  primaryStrategies: Strategy[];
  alternateStrategies: Strategy[];
  note: string;
}

interface MarketData {
  fearGreedIndex: {
    value: number;
    rating: string;
    category: string;
    emoji: string;
  };
  vix: {
    value: number;
    category: string;
    emoji: string;
  };
  vooPrice: number;
  recommendation: Recommendation;
  alerts: string[];
  timestamp: string;
}

const MarketMonitor: React.FC = () => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [showAlternate, setShowAlternate] = useState(false);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use Netlify Function endpoint (works in production and local Netlify dev)
      const response = await fetch('/.netlify/functions/market-conditions');
      const result = await response.json();

      if (result.success) {
        setMarketData(result.data);
        setLastUpdate(new Date().toLocaleTimeString());
      } else {
        setError(result.error || 'Failed to fetch market data');
      }
    } catch (err) {
      setError('Unable to connect to market monitor API. Make sure the server is running.');
      console.error('Error fetching market data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getFearGreedColor = (value: number) => {
    if (value <= 20) return '#FF3B30'; // Extreme Fear - Red
    if (value <= 40) return '#FF9500'; // Fear - Orange
    if (value <= 60) return '#8E8E93'; // Neutral - Gray
    if (value <= 80) return '#34C759'; // Greed - Green
    return '#FF3B30'; // Extreme Greed - Red
  };

  const getVixColor = (value: number) => {
    if (value < 15) return '#34C759'; // Low
    if (value < 20) return '#8E8E93'; // Normal
    if (value < 30) return '#FF9500'; // Elevated
    return '#FF3B30'; // High
  };

  if (loading && !marketData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchMarketData} startIcon={<Refresh />}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!marketData) return null;

  // Check if we have any valid data
  const hasAnyData = marketData.fearGreedIndex || marketData.vix || marketData.vooPrice;

  if (!hasAnyData) {
    return (
      <Box p={3}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Unable to fetch market data. The APIs may be temporarily unavailable.
        </Alert>
        <Button variant="contained" onClick={fetchMarketData} startIcon={<Refresh />}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Market Condition Monitor
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdate}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={fetchMarketData}
            startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {marketData.alerts && marketData.alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Alert
            severity="warning"
            icon={<WarningAmber />}
            sx={{ mb: 3, fontWeight: 'bold' }}
          >
            <Typography variant="h6" gutterBottom>Active Alerts:</Typography>
            {marketData.alerts.map((alert, index) => (
              <Typography key={index} variant="body2">• {alert}</Typography>
            ))}
          </Alert>
        </motion.div>
      )}

      {/* Market Indicators Grid */}
      <Grid container spacing={3} mb={4}>
        {/* Fear & Greed Index */}
        {marketData.fearGreedIndex && (
          <Grid item xs={12} md={4}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                sx={{
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: `2px solid ${getFearGreedColor(marketData.fearGreedIndex.value)}`,
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" fontWeight="bold">
                      Fear & Greed Index
                    </Typography>
                    {marketData.fearGreedIndex.value <= 40 ? (
                      <TrendingDown fontSize="large" sx={{ color: getFearGreedColor(marketData.fearGreedIndex.value) }} />
                    ) : (
                      <TrendingUp fontSize="large" sx={{ color: getFearGreedColor(marketData.fearGreedIndex.value) }} />
                    )}
                  </Box>

                  <Box textAlign="center" my={3}>
                    <Typography
                      variant="h1"
                      fontWeight="bold"
                      sx={{ color: getFearGreedColor(marketData.fearGreedIndex.value) }}
                    >
                      {marketData.fearGreedIndex.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      / 100
                    </Typography>
                  </Box>

                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={marketData.fearGreedIndex.value}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getFearGreedColor(marketData.fearGreedIndex.value)
                        }
                      }}
                    />
                  </Box>

                  <Box mt={2}>
                    <Chip
                      label={marketData.fearGreedIndex.category}
                      sx={{
                        backgroundColor: getFearGreedColor(marketData.fearGreedIndex.value),
                        color: 'white',
                        fontWeight: 'bold',
                        width: '100%'
                      }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" mt={2} textAlign="center">
                    {marketData.fearGreedIndex.rating}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        )}

        {/* VIX */}
        {marketData.vix && (
          <Grid item xs={12} md={4}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card
                sx={{
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: `2px solid ${getVixColor(marketData.vix.value)}`,
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" fontWeight="bold">
                      VIX (Volatility)
                    </Typography>
                    <ShowChart fontSize="large" sx={{ color: getVixColor(marketData.vix.value) }} />
                  </Box>

                  <Box textAlign="center" my={3}>
                    <Typography
                      variant="h1"
                      fontWeight="bold"
                      sx={{ color: getVixColor(marketData.vix.value) }}
                    >
                      {marketData.vix.value.toFixed(2)}
                    </Typography>
                  </Box>

                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((marketData.vix.value / 50) * 100, 100)}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getVixColor(marketData.vix.value)
                        }
                      }}
                    />
                  </Box>

                  <Box mt={2}>
                    <Chip
                      label={marketData.vix.category}
                      sx={{
                        backgroundColor: getVixColor(marketData.vix.value),
                        color: 'white',
                        fontWeight: 'bold',
                        width: '100%'
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        )}

        {/* VOO Price */}
        {marketData.vooPrice && (
          <Grid item xs={12} md={4}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card
                sx={{
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '2px solid #00D4FF',
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" fontWeight="bold">
                      VOO Price
                    </Typography>
                    <AttachMoney fontSize="large" sx={{ color: '#00D4FF' }} />
                  </Box>

                  <Box textAlign="center" my={3}>
                    <Typography
                      variant="h1"
                      fontWeight="bold"
                      sx={{ color: '#00D4FF' }}
                    >
                      ${marketData.vooPrice.toFixed(2)}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
                    Current Market Price
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        )}
      </Grid>

      {/* Strategy Recommendation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Paper
          sx={{
            p: 3,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Strategy Recommendation
          </Typography>

          {/* Zone Title */}
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{ mt: 2, mb: 2, color: '#00D4FF' }}
          >
            {marketData.recommendation.zoneTitle}
          </Typography>

          {/* VIX Notice */}
          {marketData.recommendation.vixNotice && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              {marketData.recommendation.vixNotice}
            </Alert>
          )}

          {/* Primary Strategies */}
          {marketData.recommendation.primaryStrategies.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: '#34C759' }}>
                Primary Strategies (Use Your VOO Shares)
              </Typography>
              {marketData.recommendation.primaryStrategies.map((strategy, index) => (
                <Paper
                  key={index}
                  sx={{
                    p: 2,
                    mb: 2,
                    background: 'rgba(52, 199, 89, 0.05)',
                    border: '1px solid rgba(52, 199, 89, 0.3)'
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6" fontWeight="bold">
                      STRATEGY {index + 1}: {strategy.name}
                    </Typography>
                    <Chip
                      label={strategy.successRate + ' Success'}
                      size="small"
                      sx={{
                        backgroundColor: '#34C759',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Action:</Typography>
                      <Typography variant="body1">{strategy.action}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Strike:</Typography>
                      <Typography variant="body1">{strategy.strike}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">DTE:</Typography>
                      <Typography variant="body1">{strategy.dte}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Position:</Typography>
                      <Typography variant="body1">{strategy.position}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Roll:</Typography>
                      <Typography variant="body1">{strategy.roll}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Goal:</Typography>
                      <Typography variant="body1" fontWeight="bold" sx={{ color: '#34C759' }}>
                        {strategy.goal}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>
          )}

          {/* Alternate Strategies Toggle */}
          {marketData.recommendation.alternateStrategies.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                onClick={() => setShowAlternate(!showAlternate)}
                sx={{
                  mb: 2,
                  color: '#FF9500',
                  borderColor: '#FF9500',
                  '&:hover': {
                    borderColor: '#FF9500',
                    backgroundColor: 'rgba(255, 149, 0, 0.1)'
                  }
                }}
              >
                {showAlternate ? '▼ Hide' : '▶ Show'} Alternate Strategies (Require Available Cash)
              </Button>

              {showAlternate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: '#FF9500' }}>
                    Alternate Strategies (Require Cash)
                  </Typography>
                  {marketData.recommendation.alternateStrategies.map((strategy, index) => (
                    <Paper
                      key={index}
                      sx={{
                        p: 2,
                        mb: 2,
                        background: 'rgba(255, 149, 0, 0.05)',
                        border: '1px solid rgba(255, 149, 0, 0.3)'
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6" fontWeight="bold">
                          STRATEGY {marketData.recommendation.primaryStrategies.length + index + 1}: {strategy.name}
                        </Typography>
                        <Chip
                          label={strategy.successRate + ' Success'}
                          size="small"
                          sx={{
                            backgroundColor: '#FF9500',
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      </Box>
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">Action:</Typography>
                          <Typography variant="body1">{strategy.action}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">Strike:</Typography>
                          <Typography variant="body1">{strategy.strike}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">DTE:</Typography>
                          <Typography variant="body1">{strategy.dte}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">Position:</Typography>
                          <Typography variant="body1">{strategy.position}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">Roll:</Typography>
                          <Typography variant="body1">{strategy.roll}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">Goal:</Typography>
                          <Typography variant="body1" fontWeight="bold" sx={{ color: '#FF9500' }}>
                            {strategy.goal}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </motion.div>
              )}
            </Box>
          )}

          {/* Note */}
          <Alert severity="info" sx={{ mt: 2 }}>
            {marketData.recommendation.note}
          </Alert>
        </Paper>
      </motion.div>
    </Box>
  );
};

export default MarketMonitor;
