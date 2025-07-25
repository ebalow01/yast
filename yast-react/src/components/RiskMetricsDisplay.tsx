import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ExpandMore,
  ExpandLess,
  Warning,
  Error,
  CheckCircle,
  Info,
  Assessment,
  Speed,
  Shield,
  Timeline,
  PieChart,
  ShowChart
} from '@mui/icons-material';
import type { RiskMetrics, LiquidityMetrics, EnhancedDividendData } from '../types/dividendTypes';

// Props interface for risk metrics display
interface RiskMetricsDisplayProps {
  data: EnhancedDividendData[];
  selectedAsset?: string;
  showPortfolioRisk?: boolean;
  onAssetSelect?: (ticker: string) => void;
}

// Individual risk metric card component
interface RiskMetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  format?: 'percentage' | 'decimal' | 'ratio' | 'days' | 'currency' | 'raw';
  tooltip?: string;
  icon?: React.ReactNode;
  threshold?: {
    good: number;
    warning: number;
    danger: number;
  };
}

const RiskMetricCard: React.FC<RiskMetricCardProps> = ({
  title,
  value,
  subtitle,
  color = 'primary',
  format = 'raw',
  tooltip,
  icon,
  threshold
}) => {
  const formatValue = (val: number | string, fmt: string): string => {
    if (typeof val === 'string') return val;
    
    switch (fmt) {
      case 'percentage':
        return `${(val * 100).toFixed(2)}%`;
      case 'decimal':
        return val.toFixed(4);
      case 'ratio':
        return val.toFixed(2);
      case 'days':
        return `${val.toFixed(0)} days`;
      case 'currency':
        return `$${val.toLocaleString()}`;
      default:
        return val.toString();
    }
  };

  const getColorByThreshold = (val: number | string): 'success' | 'warning' | 'error' | typeof color => {
    if (!threshold || typeof val === 'string') return color;
    
    if (val <= threshold.good) return 'success';
    if (val <= threshold.warning) return 'warning';
    return 'error';
  };

  const displayColor = threshold ? getColorByThreshold(value) : color;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
          {icon && <Box sx={{ mr: 1 }}>{icon}</Box>}
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
          {tooltip && (
            <Tooltip title={tooltip}>
              <IconButton size="small" sx={{ ml: 0.5 }}>
                <Info fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        
        <Typography
          variant="h6"
          fontWeight="bold"
          color={`${displayColor}.main`}
          sx={{ mb: 0.5 }}
        >
          {formatValue(value, format)}
        </Typography>
        
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// Value at Risk (VaR) display component
interface VaRDisplayProps {
  riskMetrics: RiskMetrics;
  compact?: boolean;
}

const VaRDisplay: React.FC<VaRDisplayProps> = ({ riskMetrics, compact = false }) => {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={`Value at Risk (95%): ${(riskMetrics.var95 * 100).toFixed(2)}%`}>
          <Chip
            label={`VaR: ${(riskMetrics.var95 * 100).toFixed(1)}%`}
            size="small"
            color={riskMetrics.var95 > 0.05 ? 'error' : riskMetrics.var95 > 0.02 ? 'warning' : 'success'}
          />
        </Tooltip>
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Value at Risk Analysis</Typography>
          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <RiskMetricCard
              title="VaR 95%"
              value={riskMetrics.var95}
              format="percentage"
              color="warning"
              icon={<Assessment />}
              tooltip="Maximum expected loss over 1 day with 95% confidence"
              threshold={{ good: 0.02, warning: 0.05, danger: 0.10 }}
            />
          </Grid>
          
          <Grid item xs={4}>
            <RiskMetricCard
              title="VaR 99%"
              value={riskMetrics.var99}
              format="percentage"
              color="error"
              icon={<Warning />}
              tooltip="Maximum expected loss over 1 day with 99% confidence"
              threshold={{ good: 0.03, warning: 0.07, danger: 0.15 }}
            />
          </Grid>
          
          <Grid item xs={4}>
            <RiskMetricCard
              title="Expected Shortfall"
              value={riskMetrics.expectedShortfall}
              format="percentage"
              color="error"
              icon={<TrendingDown />}
              tooltip="Average loss beyond VaR threshold"
            />
          </Grid>
        </Grid>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              VaR Interpretation
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              VaR estimates the potential loss in market value over a specific time period with a given confidence level.
              Lower values indicate less downside risk.
            </Alert>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Risk Category:</strong> {riskMetrics.riskCategory}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Risk Score:</strong> {riskMetrics.riskScore}/100
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

// Liquidity metrics display component
interface LiquidityDisplayProps {
  liquidityMetrics: LiquidityMetrics;
  compact?: boolean;
}

const LiquidityDisplay: React.FC<LiquidityDisplayProps> = ({ liquidityMetrics, compact = false }) => {
  if (compact) {
    return (
      <Tooltip title={`Liquidity Score: ${liquidityMetrics.liquidityScore}/100 | Daily Volume: $${(liquidityMetrics.dollarVolume / 1000000).toFixed(1)}M`}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={liquidityMetrics.liquidityCategory}
            size="small"
            color={
              liquidityMetrics.liquidityCategory === 'Excellent' ? 'success' :
              liquidityMetrics.liquidityCategory === 'Good' ? 'info' :
              liquidityMetrics.liquidityCategory === 'Fair' ? 'warning' : 'error'
            }
          />
          <LinearProgress
            variant="determinate"
            value={liquidityMetrics.liquidityScore}
            sx={{ width: 50, height: 6 }}
          />
        </Box>
      </Tooltip>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Liquidity Analysis
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <RiskMetricCard
              title="Liquidity Score"
              value={`${liquidityMetrics.liquidityScore}/100`}
              subtitle={liquidityMetrics.liquidityCategory}
              color="info"
              icon={<Speed />}
              tooltip="Composite liquidity score based on volume, spreads, and market impact"
            />
          </Grid>
          
          <Grid item xs={3}>
            <RiskMetricCard
              title="Daily Volume"
              value={liquidityMetrics.dollarVolume}
              format="currency"
              color="primary"
              icon={<ShowChart />}
              tooltip="Average daily dollar volume traded"
            />
          </Grid>
          
          <Grid item xs={3}>
            <RiskMetricCard
              title="Bid-Ask Spread"
              value={liquidityMetrics.bidAskSpreadPercent}
              format="percentage"
              color="warning"
              icon={<Timeline />}
              tooltip="Average bid-ask spread as percentage of price"
              threshold={{ good: 0.001, warning: 0.005, danger: 0.02 }}
            />
          </Grid>
          
          <Grid item xs={3}>
            <RiskMetricCard
              title="Trading Cost"
              value={liquidityMetrics.estimatedTradingCost}
              format="percentage"
              color="error"
              icon={<PieChart />}
              tooltip="Estimated total trading cost including spread and market impact"
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={liquidityMetrics.liquidityScore}
            sx={{ height: 8, borderRadius: 4 }}
            color={
              liquidityMetrics.liquidityScore > 80 ? 'success' :
              liquidityMetrics.liquidityScore > 60 ? 'info' :
              liquidityMetrics.liquidityScore > 40 ? 'warning' : 'error'
            }
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Liquidity Score: {liquidityMetrics.liquidityScore}/100
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

// Risk-return scatter plot data preparation
const prepareScatterData = (data: EnhancedDividendData[]) => {
  return data.map(asset => ({
    ticker: asset.ticker,
    return: asset.bestReturn * 100,
    risk: asset.riskVolatility * 100,
    sharpe: asset.riskMetrics.sharpeRatio,
    category: asset.category
  }));
};

// Main risk metrics display component
export const RiskMetricsDisplay: React.FC<RiskMetricsDisplayProps> = ({
  data,
  selectedAsset,
  showPortfolioRisk = false,
  onAssetSelect
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'comparison'>('overview');
  
  // Get selected asset data
  const selectedAssetData = selectedAsset 
    ? data.find(asset => asset.ticker === selectedAsset)
    : null;

  // Calculate portfolio-level risk metrics if requested
  const portfolioRiskMetrics = showPortfolioRisk ? {
    averageVaR95: data.reduce((sum, asset) => sum + asset.riskMetrics.var95, 0) / data.length,
    averageRisk: data.reduce((sum, asset) => sum + asset.riskVolatility, 0) / data.length,
    averageSharpe: data.reduce((sum, asset) => sum + asset.riskMetrics.sharpeRatio, 0) / data.length,
    highRiskCount: data.filter(asset => asset.riskMetrics.riskCategory === 'High' || asset.riskMetrics.riskCategory === 'Very High').length,
    lowLiquidityCount: data.filter(asset => asset.liquidityMetrics.liquidityCategory === 'Poor').length
  } : null;

  return (
    <Box>
      {/* Portfolio Risk Overview */}
      {showPortfolioRisk && portfolioRiskMetrics && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Portfolio Risk Overview
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <RiskMetricCard
                  title="Average VaR 95%"
                  value={portfolioRiskMetrics.averageVaR95}
                  format="percentage"
                  color="warning"
                  icon={<Assessment />}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <RiskMetricCard
                  title="Average Risk"
                  value={portfolioRiskMetrics.averageRisk}
                  format="percentage"
                  color="info"
                  icon={<Timeline />}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <RiskMetricCard
                  title="Average Sharpe"
                  value={portfolioRiskMetrics.averageSharpe}
                  format="ratio"
                  color="success"
                  icon={<TrendingUp />}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <RiskMetricCard
                  title="High Risk Assets"
                  value={portfolioRiskMetrics.highRiskCount}
                  subtitle={`out of ${data.length} total`}
                  color="error"
                  icon={<Warning />}
                />
              </Grid>
            </Grid>
            
            {portfolioRiskMetrics.highRiskCount > data.length * 0.3 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                High concentration of risky assets ({portfolioRiskMetrics.highRiskCount} assets). Consider diversification.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Asset Risk Analysis */}
      {selectedAssetData && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Risk Analysis: {selectedAssetData.ticker}
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <VaRDisplay riskMetrics={selectedAssetData.riskMetrics} />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <LiquidityDisplay liquidityMetrics={selectedAssetData.liquidityMetrics} />
            </Grid>
          </Grid>
          
          {/* Detailed Risk Metrics */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detailed Risk Metrics
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={2}>
                  <RiskMetricCard
                    title="Sharpe Ratio"
                    value={selectedAssetData.riskMetrics.sharpeRatio}
                    format="ratio"
                    color="success"
                    threshold={{ good: 1.0, warning: 0.5, danger: 0.0 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <RiskMetricCard
                    title="Sortino Ratio"
                    value={selectedAssetData.riskMetrics.sortinoRatio}
                    format="ratio"
                    color="info"
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <RiskMetricCard
                    title="Max Drawdown"
                    value={selectedAssetData.riskMetrics.maxDrawdown}
                    format="percentage"
                    color="error"
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <RiskMetricCard
                    title="Beta vs SPY"
                    value={selectedAssetData.riskMetrics.betaVsSPY}
                    format="ratio"
                    color="primary"
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <RiskMetricCard
                    title="Correlation"
                    value={selectedAssetData.riskMetrics.correlationVsSPY}
                    format="ratio"
                    color="secondary"
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <RiskMetricCard
                    title="Calmar Ratio"
                    value={selectedAssetData.riskMetrics.calmarRatio}
                    format="ratio"
                    color="warning"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Risk Comparison Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Risk Metrics Comparison
          </Typography>
          
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Ticker</strong></TableCell>
                  <TableCell align="center"><strong>Risk Category</strong></TableCell>
                  <TableCell align="center"><strong>VaR 95%</strong></TableCell>
                  <TableCell align="center"><strong>Sharpe Ratio</strong></TableCell>
                  <TableCell align="center"><strong>Max Drawdown</strong></TableCell>
                  <TableCell align="center"><strong>Liquidity</strong></TableCell>
                  <TableCell align="center"><strong>Beta</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.slice(0, 20).map((asset) => (
                  <TableRow
                    key={asset.ticker}
                    hover
                    onClick={() => onAssetSelect?.(asset.ticker)}
                    sx={{ cursor: 'pointer' }}
                    selected={selectedAsset === asset.ticker}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {asset.ticker}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Chip
                        label={asset.riskMetrics.riskCategory}
                        size="small"
                        color={
                          asset.riskMetrics.riskCategory === 'Low' ? 'success' :
                          asset.riskMetrics.riskCategory === 'Medium' ? 'info' :
                          asset.riskMetrics.riskCategory === 'High' ? 'warning' : 'error'
                        }
                      />
                    </TableCell>
                    
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        color={asset.riskMetrics.var95 > 0.05 ? 'error.main' : 'text.primary'}
                      >
                        {(asset.riskMetrics.var95 * 100).toFixed(2)}%
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        color={asset.riskMetrics.sharpeRatio > 1.0 ? 'success.main' : 'text.primary'}
                      >
                        {asset.riskMetrics.sharpeRatio.toFixed(2)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Typography variant="body2">
                        {(asset.riskMetrics.maxDrawdown * 100).toFixed(1)}%
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <LiquidityDisplay liquidityMetrics={asset.liquidityMetrics} compact />
                    </TableCell>
                    
                    <TableCell align="center">
                      <Typography variant="body2">
                        {asset.riskMetrics.betaVsSPY.toFixed(2)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RiskMetricsDisplay;