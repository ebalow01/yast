import React, { useState, useMemo } from 'react';
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
  ButtonGroup,
  Button,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Timeline,
  PieChart,
  BarChart,
  ShowChart,
  Assessment,
  Speed,
  CompareArrows,
  Insights,
  TrendingFlat
} from '@mui/icons-material';
import type { EnhancedDividendData, EnhancedAllocation, EnhancedPortfolioMetrics } from '../types/dividendTypes';

// Props for the main data visualization component
interface DataVisualizationProps {
  data: EnhancedDividendData[];
  allocation?: EnhancedAllocation[];
  portfolioMetrics?: EnhancedPortfolioMetrics;
  selectedAsset?: string;
  onAssetSelect?: (ticker: string) => void;
}

// Risk-Return scatter plot component (text-based visualization)
interface RiskReturnScatterProps {
  data: EnhancedDividendData[];
  selectedAsset?: string;
  onAssetSelect?: (ticker: string) => void;
}

const RiskReturnScatter: React.FC<RiskReturnScatterProps> = ({
  data,
  selectedAsset,
  onAssetSelect
}) => {
  const [viewMode, setViewMode] = useState<'risk-return' | 'risk-yield' | 'return-sharpe'>('risk-return');

  const getQuadrant = (asset: EnhancedDividendData, mode: string) => {
    switch (mode) {
      case 'risk-return':
        if (asset.bestReturn > 0.3 && asset.riskVolatility < 0.3) return 'High Return, Low Risk';
        if (asset.bestReturn > 0.3 && asset.riskVolatility >= 0.3) return 'High Return, High Risk';
        if (asset.bestReturn <= 0.3 && asset.riskVolatility < 0.3) return 'Low Return, Low Risk';
        return 'Low Return, High Risk';
      case 'risk-yield':
        const assetYield = asset.yieldMetrics?.forwardYield || 0;
        if (assetYield > 0.5 && asset.riskVolatility < 0.3) return 'High Yield, Low Risk';
        if (assetYield > 0.5 && asset.riskVolatility >= 0.3) return 'High Yield, High Risk';
        if (assetYield <= 0.5 && asset.riskVolatility < 0.3) return 'Low Yield, Low Risk';
        return 'Low Yield, High Risk';
      case 'return-sharpe':
        const sharpe = asset.riskMetrics?.sharpeRatio || 0;
        if (asset.bestReturn > 0.3 && sharpe > 1.0) return 'High Return, High Sharpe';
        if (asset.bestReturn > 0.3 && sharpe <= 1.0) return 'High Return, Low Sharpe';
        if (asset.bestReturn <= 0.3 && sharpe > 1.0) return 'Low Return, High Sharpe';
        return 'Low Return, Low Sharpe';
      default:
        return 'Unknown';
    }
  };

  const quadrantData = useMemo(() => {
    const quadrants: { [key: string]: EnhancedDividendData[] } = {};
    
    data.forEach(asset => {
      const quadrant = getQuadrant(asset, viewMode);
      if (!quadrants[quadrant]) quadrants[quadrant] = [];
      quadrants[quadrant].push(asset);
    });
    
    // Sort assets within each quadrant by performance
    Object.keys(quadrants).forEach(key => {
      quadrants[key].sort((a, b) => b.bestReturn - a.bestReturn);
    });
    
    return quadrants;
  }, [data, viewMode]);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Risk-Return Analysis</Typography>
          <ButtonGroup size="small">
            <Button
              variant={viewMode === 'risk-return' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('risk-return')}
            >
              Risk vs Return
            </Button>
            <Button
              variant={viewMode === 'risk-yield' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('risk-yield')}
            >
              Risk vs Yield
            </Button>
            <Button
              variant={viewMode === 'return-sharpe' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('return-sharpe')}
            >
              Return vs Sharpe
            </Button>
          </ButtonGroup>
        </Box>

        <Grid container spacing={2}>
          {Object.entries(quadrantData).map(([quadrant, assets]) => {
            const quadrantColor = 
              quadrant.includes('High Return, Low Risk') || quadrant.includes('High Yield, Low Risk') || quadrant.includes('High Return, High Sharpe') ? 'success' :
              quadrant.includes('High Return, High Risk') || quadrant.includes('High Yield, High Risk') ? 'warning' :
              quadrant.includes('Low Return, Low Risk') || quadrant.includes('Low Yield, Low Risk') ? 'info' : 'error';

            return (
              <Grid item xs={12} md={6} key={quadrant}>
                <Paper variant="outlined" sx={{ p: 2, height: '300px', overflow: 'auto' }}>
                  <Typography variant="subtitle1" gutterBottom color={`${quadrantColor}.main`}>
                    {quadrant} ({assets.length})
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  
                  {assets.slice(0, 10).map(asset => (
                    <Box
                      key={asset.ticker}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 0.5,
                        px: 1,
                        mb: 0.5,
                        bgcolor: selectedAsset === asset.ticker ? 'action.selected' : 'transparent',
                        borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => onAssetSelect?.(asset.ticker)}
                    >
                      <Typography variant="body2" fontWeight="bold">
                        {asset.ticker}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          R: {(asset.bestReturn * 100).toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          V: {(asset.riskVolatility * 100).toFixed(1)}%
                        </Typography>
                        {asset.riskMetrics && (
                          <Typography variant="caption" color="text.secondary">
                            S: {asset.riskMetrics.sharpeRatio.toFixed(2)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                  
                  {assets.length > 10 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      +{assets.length - 10} more assets
                    </Typography>
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );
};

// Performance metrics card component
interface MetricsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'flat';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  format?: 'percentage' | 'currency' | 'ratio' | 'number';
  icon?: React.ReactNode;
  comparison?: {
    label: string;
    value: number;
    better: boolean;
  };
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  color = 'primary',
  format = 'number',
  icon,
  comparison
}) => {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'percentage':
        return `${(val * 100).toFixed(2)}%`;
      case 'currency':
        return `$${val.toLocaleString()}`;
      case 'ratio':
        return val.toFixed(2);
      default:
        return val.toString();
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp color="success" />;
      case 'down': return <TrendingDown color="error" />;
      case 'flat': return <TrendingFlat color="info" />;
      default: return null;
    }
  };

  return (
    <Card variant="outlined">
      <CardContent sx={{ textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
          {icon}
          <Typography variant="subtitle2" color="text.secondary" sx={{ ml: icon ? 1 : 0 }}>
            {title}
          </Typography>
          {getTrendIcon()}
        </Box>
        
        <Typography variant="h5" fontWeight="bold" color={`${color}.main`} sx={{ mb: 1 }}>
          {formatValue(value)}
        </Typography>
        
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
        
        {comparison && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography
              variant="caption"
              color={comparison.better ? 'success.main' : 'error.main'}
            >
              vs {comparison.label}: {formatValue(comparison.value)}
              {comparison.better ? ' ↑' : ' ↓'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Allocation visualization component
interface AllocationVisualizationProps {
  allocation: EnhancedAllocation[];
  data: EnhancedDividendData[];
}

const AllocationVisualization: React.FC<AllocationVisualizationProps> = ({
  allocation,
  data
}) => {
  const [sortBy, setSortBy] = useState<'weight' | 'return' | 'risk' | 'sharpe'>('weight');

  const sortedAllocation = useMemo(() => {
    return [...allocation].sort((a, b) => {
      switch (sortBy) {
        case 'weight': return b.weight - a.weight;
        case 'return': return b.return - a.return;
        case 'risk': return a.risk - b.risk; // Lower risk is better
        case 'sharpe': return (b.sharpe || 0) - (a.sharpe || 0);
        default: return 0;
      }
    });
  }, [allocation, sortBy]);

  const getAssetData = (ticker: string) => {
    return data.find(asset => asset.ticker === ticker);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Portfolio Allocation</Typography>
          <ButtonGroup size="small">
            <Button
              variant={sortBy === 'weight' ? 'contained' : 'outlined'}
              onClick={() => setSortBy('weight')}
            >
              Weight
            </Button>
            <Button
              variant={sortBy === 'return' ? 'contained' : 'outlined'}
              onClick={() => setSortBy('return')}
            >
              Return
            </Button>
            <Button
              variant={sortBy === 'risk' ? 'contained' : 'outlined'}
              onClick={() => setSortBy('risk')}
            >
              Risk
            </Button>
            <Button
              variant={sortBy === 'sharpe' ? 'contained' : 'outlined'}
              onClick={() => setSortBy('sharpe')}
            >
              Sharpe
            </Button>
          </ButtonGroup>
        </Box>

        <Box sx={{ mb: 3 }}>
          {sortedAllocation.map((holding, index) => {
            const assetData = getAssetData(holding.ticker);
            const maxWeight = Math.max(...allocation.map(a => a.weight));
            const barWidth = (holding.weight / maxWeight) * 100;
            
            return (
              <Box key={holding.ticker} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ minWidth: '60px' }}>
                      {holding.ticker}
                    </Typography>
                    {assetData && (
                      <Chip
                        label={assetData.bestStrategy}
                        size="small"
                        color={assetData.bestStrategy === 'DC' ? 'info' : 'primary'}
                        sx={{ fontSize: '10px', height: '20px' }}
                      />
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: '80px', textAlign: 'right' }}>
                      {(holding.weight * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" color="success.main" sx={{ minWidth: '60px', textAlign: 'right' }}>
                      {(holding.return * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" color="warning.main" sx={{ minWidth: '60px', textAlign: 'right' }}>
                      {(holding.risk * 100).toFixed(1)}%
                    </Typography>
                    {holding.sharpe && (
                      <Typography variant="caption" color="info.main" sx={{ minWidth: '40px', textAlign: 'right' }}>
                        {holding.sharpe.toFixed(2)}
                      </Typography>
                    )}
                  </Box>
                </Box>
                
                <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 8 }}>
                  <Box
                    sx={{
                      width: `${barWidth}%`,
                      bgcolor: holding.ticker === 'CASH' ? 'grey.500' : 
                              holding.ticker === 'SPY' ? 'primary.main' : 'success.main',
                      height: '100%',
                      borderRadius: 1,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Allocation Summary */}
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <Typography variant="caption" color="text.secondary">Total Assets</Typography>
            <Typography variant="body2" fontWeight="bold">{allocation.length}</Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="caption" color="text.secondary">Equity %</Typography>
            <Typography variant="body2" fontWeight="bold">
              {((1 - (allocation.find(a => a.ticker === 'CASH')?.weight || 0)) * 100).toFixed(1)}%
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="caption" color="text.secondary">Cash %</Typography>
            <Typography variant="body2" fontWeight="bold">
              {((allocation.find(a => a.ticker === 'CASH')?.weight || 0) * 100).toFixed(1)}%
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="caption" color="text.secondary">DC Strategy %</Typography>
            <Typography variant="body2" fontWeight="bold">
              {(allocation.reduce((sum, holding) => {
                const asset = getAssetData(holding.ticker);
                return sum + (asset?.bestStrategy === 'DC' ? holding.weight : 0);
              }, 0) * 100).toFixed(1)}%
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// Performance dashboard component
interface PerformanceDashboardProps {
  portfolioMetrics?: EnhancedPortfolioMetrics;
  benchmarkMetrics?: {
    return: number;
    risk: number;
    sharpe: number;
  };
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  portfolioMetrics,
  benchmarkMetrics
}) => {
  if (!portfolioMetrics) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Loading portfolio metrics...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const benchmark = benchmarkMetrics || { return: 0.1574, risk: 0.205, sharpe: 0.77 }; // SPY defaults

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Portfolio Performance Dashboard
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <MetricsCard
              title="Expected Return"
              value={portfolioMetrics.expectedReturn}
              format="percentage"
              color="success"
              icon={<TrendingUp />}
              trend={portfolioMetrics.expectedReturn > benchmark.return ? 'up' : 'down'}
              comparison={{
                label: 'SPY',
                value: benchmark.return,
                better: portfolioMetrics.expectedReturn > benchmark.return
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <MetricsCard
              title="Portfolio Risk"
              value={portfolioMetrics.risk}
              format="percentage"
              color={portfolioMetrics.risk < benchmark.risk ? 'success' : 'warning'}
              icon={<Assessment />}
              trend={portfolioMetrics.risk < benchmark.risk ? 'down' : 'up'}
              comparison={{
                label: 'SPY',
                value: benchmark.risk,
                better: portfolioMetrics.risk < benchmark.risk
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <MetricsCard
              title="Sharpe Ratio"
              value={portfolioMetrics.sharpeRatio}
              format="ratio"
              color="info"
              icon={<Speed />}
              trend={portfolioMetrics.sharpeRatio > benchmark.sharpe ? 'up' : 'down'}
              comparison={{
                label: 'SPY',
                value: benchmark.sharpe,
                better: portfolioMetrics.sharpeRatio > benchmark.sharpe
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <MetricsCard
              title="Diversification"
              value={portfolioMetrics.diversificationRatio || 1.0}
              format="ratio"
              color="primary"
              icon={<PieChart />}
              subtitle={`${portfolioMetrics.effectiveNumberOfAssets || 0} effective assets`}
            />
          </Grid>
        </Grid>

        {/* Performance Insights */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Performance Insights
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {portfolioMetrics.expectedReturn > benchmark.return && (
              <Chip
                icon={<TrendingUp />}
                label={`${((portfolioMetrics.expectedReturn - benchmark.return) * 100).toFixed(1)}% alpha vs SPY`}
                color="success"
                size="small"
              />
            )}
            
            {portfolioMetrics.risk < benchmark.risk && (
              <Chip
                icon={<CompareArrows />}
                label={`${((benchmark.risk - portfolioMetrics.risk) * 100).toFixed(1)}% lower risk`}
                color="info"
                size="small"
              />
            )}
            
            {portfolioMetrics.sharpeRatio > 1.0 && (
              <Chip
                icon={<Insights />}
                label="Excellent risk-adjusted returns"
                color="success"
                size="small"
              />
            )}
            
            {(portfolioMetrics.diversificationRatio || 0) > 1.5 && (
              <Chip
                icon={<PieChart />}
                label="Well diversified"
                color="primary"
                size="small"
              />
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// Main data visualization component
export const DataVisualization: React.FC<DataVisualizationProps> = ({
  data,
  allocation = [],
  portfolioMetrics,
  selectedAsset,
  onAssetSelect
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Performance Dashboard */}
      <PerformanceDashboard portfolioMetrics={portfolioMetrics} />
      
      {/* Portfolio Allocation */}
      {allocation.length > 0 && (
        <AllocationVisualization allocation={allocation} data={data} />
      )}
      
      {/* Risk-Return Analysis */}
      <RiskReturnScatter
        data={data}
        selectedAsset={selectedAsset}
        onAssetSelect={onAssetSelect}
      />
    </Box>
  );
};

export default DataVisualization;