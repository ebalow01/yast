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
  LinearProgress,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  AttachMoney,
  Refresh,
  WarningAmber,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface StrategyRule {
  priority: number;
  name: string;
  trigger: string;
  action: string;
}

interface StrategyPerformance {
  return: string;
  sharpe: number;
  sortino: number;
  maxDrawdown: string;
  period: string;
}

interface LiveOptionEntry {
  expiration: string;
  dte: number;
  strike: number | null;
  delta: number | null;
  midPrice: number | null;
  bid: number | null;
  ask: number | null;
  source?: string;
}

interface LiveOptions {
  newEntry: LiveOptionEntry | null;
  roll: LiveOptionEntry | null;
}

interface StrategyParameters {
  target_delta: number;
  target_dte: number;
  roll_target_dte: number;
  roll_up_threshold: number;
  roll_dte_trigger: number;
  profit_target: number;
  max_positions: number;
}

interface Strategy {
  name: string;
  performance: StrategyPerformance;
  setup: string;
  rules: StrategyRule[];
  parameters: StrategyParameters;
  designDecisions: string[];
  liveOptions?: LiveOptions | null;
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
  spyPrice: number;
  strategy: Strategy;
  alerts: string[];
  timestamp: string;
}

const MarketMonitor: React.FC = () => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [showDesignDecisions, setShowDesignDecisions] = useState(false);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      setError(null);

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
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getFearGreedColor = (value: number) => {
    if (value <= 20) return '#FF3B30';
    if (value <= 40) return '#FF9500';
    if (value <= 60) return '#8E8E93';
    if (value <= 80) return '#34C759';
    return '#FF3B30';
  };

  const getVixColor = (value: number) => {
    if (value < 15) return '#34C759';
    if (value < 20) return '#8E8E93';
    if (value < 30) return '#FF9500';
    return '#FF3B30';
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

  const hasAnyData = marketData.fearGreedIndex || marketData.vix || marketData.vooPrice || marketData.spyPrice;

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

  const parameterLabels: Record<string, string> = {
    target_delta: 'Target Delta',
    target_dte: 'Target DTE (new)',
    roll_target_dte: 'Roll Target DTE',
    roll_up_threshold: 'Roll-Up Threshold',
    roll_dte_trigger: 'Roll DTE Trigger',
    profit_target: 'Profit Target',
    max_positions: 'Max Positions'
  };

  const formatParamValue = (key: string, value: number): string => {
    if (key === 'roll_up_threshold' || key === 'profit_target') return `${(value * 100).toFixed(0)}%`;
    if (key === 'target_dte' || key === 'roll_target_dte' || key === 'roll_dte_trigger') return `${value} days`;
    if (key === 'max_positions') return `${value}`;
    return `${value}`;
  };

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

      {/* Market Indicators Grid - 4 columns */}
      <Grid container spacing={3} mb={4}>
        {/* Fear & Greed Index */}
        {marketData.fearGreedIndex && (
          <Grid item xs={12} sm={6} md={3}>
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
                      Fear & Greed
                    </Typography>
                    {marketData.fearGreedIndex.value <= 40 ? (
                      <TrendingDown fontSize="large" sx={{ color: getFearGreedColor(marketData.fearGreedIndex.value) }} />
                    ) : (
                      <TrendingUp fontSize="large" sx={{ color: getFearGreedColor(marketData.fearGreedIndex.value) }} />
                    )}
                  </Box>

                  <Box textAlign="center" my={2}>
                    <Typography
                      variant="h2"
                      fontWeight="bold"
                      sx={{ color: getFearGreedColor(marketData.fearGreedIndex.value) }}
                    >
                      {marketData.fearGreedIndex.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      / 100
                    </Typography>
                  </Box>

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
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        )}

        {/* VIX */}
        {marketData.vix && (
          <Grid item xs={12} sm={6} md={3}>
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
                      VIX
                    </Typography>
                    <ShowChart fontSize="large" sx={{ color: getVixColor(marketData.vix.value) }} />
                  </Box>

                  <Box textAlign="center" my={2}>
                    <Typography
                      variant="h2"
                      fontWeight="bold"
                      sx={{ color: getVixColor(marketData.vix.value) }}
                    >
                      {marketData.vix.value.toFixed(2)}
                    </Typography>
                  </Box>

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
          <Grid item xs={12} sm={6} md={3}>
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
                      VOO
                    </Typography>
                    <AttachMoney fontSize="large" sx={{ color: '#00D4FF' }} />
                  </Box>

                  <Box textAlign="center" my={2}>
                    <Typography
                      variant="h2"
                      fontWeight="bold"
                      sx={{ color: '#00D4FF' }}
                    >
                      ${marketData.vooPrice.toFixed(2)}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
                    S&P 500 (Vanguard)
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        )}

        {/* SPY Price */}
        {marketData.spyPrice && (
          <Grid item xs={12} sm={6} md={3}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card
                sx={{
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '2px solid #AF52DE',
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" fontWeight="bold">
                      SPY
                    </Typography>
                    <AttachMoney fontSize="large" sx={{ color: '#AF52DE' }} />
                  </Box>

                  <Box textAlign="center" my={2}>
                    <Typography
                      variant="h2"
                      fontWeight="bold"
                      sx={{ color: '#AF52DE' }}
                    >
                      ${marketData.spyPrice.toFixed(2)}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
                    S&P 500 (SPDR)
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        )}
      </Grid>

      {/* Covered Call Strategy Section */}
      {marketData.strategy && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Paper
            sx={{
              p: 3,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {marketData.strategy.name}
            </Typography>

            {/* Performance Banner */}
            <Box display="flex" flexWrap="wrap" gap={1.5} mb={3}>
              <Chip
                label={`Return: ${marketData.strategy.performance.return}`}
                sx={{ backgroundColor: '#34C759', color: 'white', fontWeight: 'bold' }}
              />
              <Chip
                label={`Sharpe: ${marketData.strategy.performance.sharpe}`}
                sx={{ backgroundColor: '#007AFF', color: 'white', fontWeight: 'bold' }}
              />
              <Chip
                label={`Sortino: ${marketData.strategy.performance.sortino}`}
                sx={{ backgroundColor: '#5856D6', color: 'white', fontWeight: 'bold' }}
              />
              <Chip
                label={`Max DD: ${marketData.strategy.performance.maxDrawdown}`}
                sx={{ backgroundColor: '#FF9500', color: 'white', fontWeight: 'bold' }}
              />
              <Chip
                label={marketData.strategy.performance.period}
                variant="outlined"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>

            {/* Strategy Setup */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="bold">
                {marketData.strategy.setup}
              </Typography>
            </Alert>

            {/* Live Options Data */}
            {marketData.strategy.liveOptions && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: 'New Entry (21 DTE)', data: marketData.strategy.liveOptions.newEntry },
                  { label: 'Roll Target (30 DTE)', data: marketData.strategy.liveOptions.roll }
                ].map(({ label, data }) => (
                  <Grid item xs={12} sm={6} key={label}>
                    <Paper sx={{ p: 2, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>{label}</Typography>
                      {data && (
                        <Box>
                          <Typography variant="body2">
                            Expiration: {new Date(data.expiration + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {' '}({data.dte}d)
                          </Typography>
                          {data.strike != null ? (
                            <>
                              <Typography variant="body2">Strike: ${data.strike}</Typography>
                              {data.delta != null && (
                                <Typography variant="body2">Delta: {data.delta.toFixed(3)}</Typography>
                              )}
                              {data.midPrice != null && (
                                <Typography variant="body2">Mid: ${data.midPrice.toFixed(2)}</Typography>
                              )}
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">Live pricing unavailable</Typography>
                          )}
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Daily Checklist - Priority-ordered rules */}
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 3 }}>
              Daily Management Checklist
            </Typography>
            <Box sx={{ mb: 3 }}>
              {marketData.strategy.rules.map((rule) => (
                <Paper
                  key={rule.priority}
                  sx={{
                    p: 2,
                    mb: 1.5,
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                    <Chip
                      label={`#${rule.priority}`}
                      size="small"
                      sx={{
                        backgroundColor: '#007AFF',
                        color: 'white',
                        fontWeight: 'bold',
                        minWidth: 36
                      }}
                    />
                    <Typography variant="subtitle1" fontWeight="bold">
                      {rule.name}
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Trigger:</Typography>
                      <Typography variant="body2">{rule.trigger}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Action:</Typography>
                      <Typography variant="body2">{rule.action}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>

            {/* Parameters Table */}
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Strategy Parameters
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 3, background: 'rgba(255, 255, 255, 0.02)' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Parameter</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(marketData.strategy.parameters).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell>{parameterLabels[key] || key}</TableCell>
                      <TableCell>{formatParamValue(key, value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Design Decisions - Collapsible */}
            <Button
              variant="outlined"
              onClick={() => setShowDesignDecisions(!showDesignDecisions)}
              endIcon={showDesignDecisions ? <ExpandLess /> : <ExpandMore />}
              sx={{ mb: 1 }}
            >
              Design Decisions
            </Button>
            <Collapse in={showDesignDecisions}>
              <Paper sx={{ p: 2, background: 'rgba(255, 255, 255, 0.02)' }}>
                {marketData.strategy.designDecisions.map((decision, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                    • {decision}
                  </Typography>
                ))}
              </Paper>
            </Collapse>
          </Paper>
        </motion.div>
      )}
    </Box>
  );
};

export default MarketMonitor;
