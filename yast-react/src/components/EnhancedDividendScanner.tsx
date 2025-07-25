import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  IconButton,
  Badge,
  LinearProgress,
  Alert,
  Collapse,
  Grid,
  Switch,
  FormControlLabel,
  InputAdornment
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  FilterList,
  ExpandMore,
  ExpandLess,
  Info,
  Warning,
  CheckCircle,
  Cancel,
  Search,
  Timeline
} from '@mui/icons-material';
import type { 
  EnhancedDividendData, 
  DashboardFilters, 
  RiskMetrics,
  YieldMetrics,
  LiquidityMetrics 
} from '../types/dividendTypes';

// Props interface for the enhanced dividend scanner
interface EnhancedDividendScannerProps {
  data: EnhancedDividendData[];
  loading?: boolean;
  onAssetSelect?: (ticker: string) => void;
  initialFilters?: Partial<DashboardFilters>;
}

// Default filter values
const defaultFilters: DashboardFilters = {
  minReturn: 0,
  maxRisk: 100,
  minLiquidity: 0,
  excludeHighTaxImpact: false,
  onlyQualifiedDividends: false,
  allowedStrategies: ['B&H', 'DC'],
  preferredExDivDays: []
};

export const EnhancedDividendScanner: React.FC<EnhancedDividendScannerProps> = ({
  data,
  loading = false,
  onAssetSelect,
  initialFilters = {}
}) => {
  const [filters, setFilters] = useState<DashboardFilters>({
    ...defaultFilters,
    ...initialFilters
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState<string>('bestReturn');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  // Filter and sort data based on current filters
  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(asset => {
      // Basic filters
      if (asset.bestReturn < filters.minReturn / 100) return false;
      if (asset.riskVolatility > filters.maxRisk / 100) return false;
      if (asset.liquidityMetrics.liquidityScore < filters.minLiquidity) return false;
      
      // Strategy filter
      if (!filters.allowedStrategies.includes(asset.bestStrategy)) return false;
      
      // Search query
      if (searchQuery && !asset.ticker.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Tax impact filter
      if (filters.excludeHighTaxImpact && asset.taxMetrics.taxEfficiencyRatio < 0.8) {
        return false;
      }
      
      // Qualified dividends filter
      if (filters.onlyQualifiedDividends && asset.taxMetrics.qualifiedDividendPercent < 0.8) {
        return false;
      }
      
      // Ex-dividend day preferences
      if (filters.preferredExDivDays && filters.preferredExDivDays.length > 0) {
        if (!filters.preferredExDivDays.includes(asset.exDivDay)) return false;
      }
      
      return true;
    });

    // Sort data
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'bestReturn':
          aValue = a.bestReturn;
          bValue = b.bestReturn;
          break;
        case 'riskVolatility':
          aValue = a.riskVolatility;
          bValue = b.riskVolatility;
          break;
        case 'yieldMetrics.forwardYield':
          aValue = a.yieldMetrics.forwardYield;
          bValue = b.yieldMetrics.forwardYield;
          break;
        case 'riskMetrics.sharpeRatio':
          aValue = a.riskMetrics.sharpeRatio;
          bValue = b.riskMetrics.sharpeRatio;
          break;
        case 'liquidityMetrics.liquidityScore':
          aValue = a.liquidityMetrics.liquidityScore;
          bValue = b.liquidityMetrics.liquidityScore;
          break;
        default:
          aValue = a.ticker;
          bValue = b.ticker;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [data, filters, searchQuery, sortField, sortDirection]);

  // Handle asset selection
  const handleAssetClick = (ticker: string) => {
    setSelectedAsset(selectedAsset === ticker ? null : ticker);
    if (onAssetSelect) {
      onAssetSelect(ticker);
    }
  };

  // Helper function to format percentage
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // Helper function to get risk color
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return '#4caf50';
      case 'Medium': return '#ff9800';
      case 'High': return '#f44336';
      case 'Very High': return '#d32f2f';
      default: return '#757575';
    }
  };

  // Helper function to get liquidity color
  const getLiquidityColor = (category: string) => {
    switch (category) {
      case 'Excellent': return '#4caf50';
      case 'Good': return '#8bc34a';
      case 'Fair': return '#ff9800';
      case 'Poor': return '#f44336';
      default: return '#757575';
    }
  };

  // Render risk metrics chip
  const renderRiskChip = (riskMetrics: RiskMetrics) => (
    <Tooltip title={`VaR 95%: ${formatPercentage(riskMetrics.var95)} | Sharpe: ${riskMetrics.sharpeRatio.toFixed(2)}`}>
      <Chip
        label={riskMetrics.riskCategory}
        size="small"
        sx={{
          backgroundColor: getRiskColor(riskMetrics.riskCategory),
          color: 'white',
          fontWeight: 'bold'
        }}
      />
    </Tooltip>
  );

  // Render yield metrics
  const renderYieldMetrics = (yieldMetrics: YieldMetrics) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography variant="body2" fontWeight="bold" color="success.main">
        {formatPercentage(yieldMetrics.forwardYield)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Sustainability: {yieldMetrics.sustainabilityScore}/100
      </Typography>
    </Box>
  );

  // Render liquidity indicator
  const renderLiquidityIndicator = (liquidityMetrics: LiquidityMetrics) => (
    <Tooltip title={`Daily Volume: $${(liquidityMetrics.dollarVolume / 1000000).toFixed(1)}M | Spread: ${formatPercentage(liquidityMetrics.bidAskSpreadPercent)}`}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={liquidityMetrics.liquidityCategory}
          size="small"
          sx={{
            backgroundColor: getLiquidityColor(liquidityMetrics.liquidityCategory),
            color: 'white',
            fontSize: '10px'
          }}
        />
        <LinearProgress
          variant="determinate"
          value={liquidityMetrics.liquidityScore}
          sx={{ width: 40, height: 4 }}
        />
      </Box>
    </Tooltip>
  );

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Enhanced Dividend Scanner
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Advanced screening with risk metrics, tax efficiency, and liquidity analysis
          </Typography>
        </Box>

        {/* Search and Filter Controls */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search tickers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Min Return %"
              type="number"
              value={filters.minReturn}
              onChange={(e) => setFilters({
                ...filters,
                minReturn: parseFloat(e.target.value) || 0
              })}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Max Risk %"
              type="number"
              value={filters.maxRisk}
              onChange={(e) => setFilters({
                ...filters,
                maxRisk: parseFloat(e.target.value) || 100
              })}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Min Liquidity"
              type="number"
              value={filters.minLiquidity}
              onChange={(e) => setFilters({
                ...filters,
                minLiquidity: parseFloat(e.target.value) || 0
              })}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <IconButton
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              color="primary"
            >
              <Badge badgeContent={showAdvancedFilters ? 'ON' : 'OFF'} color="primary">
                <FilterList />
              </Badge>
            </IconButton>
          </Grid>
        </Grid>

        {/* Advanced Filters */}
        <Collapse in={showAdvancedFilters}>
          <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Advanced Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.excludeHighTaxImpact}
                      onChange={(e) => setFilters({
                        ...filters,
                        excludeHighTaxImpact: e.target.checked
                      })}
                    />
                  }
                  label="Exclude High Tax Impact"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.onlyQualifiedDividends}
                      onChange={(e) => setFilters({
                        ...filters,
                        onlyQualifiedDividends: e.target.checked
                      })}
                    />
                  }
                  label="Only Qualified Dividends"
                />
              </Grid>
            </Grid>
          </Card>
        </Collapse>

        {/* Results Summary */}
        <Alert severity="info" sx={{ mb: 2 }}>
          Found {filteredAndSortedData.length} assets matching your criteria out of {data.length} total
        </Alert>

        {/* Results Table */}
        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Ticker</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Strategy</strong>
                </TableCell>
                <TableCell 
                  align="center" 
                  onClick={() => {
                    setSortField('bestReturn');
                    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  <strong>Return</strong>
                  {sortField === 'bestReturn' && (
                    sortDirection === 'asc' ? <TrendingUp /> : <TrendingDown />
                  )}
                </TableCell>
                <TableCell align="center">
                  <strong>Risk</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Yield</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Liquidity</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Tax Efficiency</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Ex-Div</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <LinearProgress />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Loading dividend data...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedData.map((asset) => (
                  <TableRow
                    key={asset.ticker}
                    hover
                    selected={selectedAsset === asset.ticker}
                    onClick={() => handleAssetClick(asset.ticker)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {asset.ticker}
                        </Typography>
                        {asset.category === 'top-performers' && (
                          <Chip label="⭐" size="small" color="success" />
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Chip
                        label={asset.bestStrategy}
                        size="small"
                        color={asset.bestStrategy === 'DC' ? 'info' : 'primary'}
                      />
                    </TableCell>
                    
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        {asset.bestReturn > 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={asset.bestReturn > 0 ? 'success.main' : 'error.main'}
                        >
                          {formatPercentage(asset.bestReturn)}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell align="center">
                      {renderRiskChip(asset.riskMetrics)}
                    </TableCell>
                    
                    <TableCell align="center">
                      {renderYieldMetrics(asset.yieldMetrics)}
                    </TableCell>
                    
                    <TableCell align="center">
                      {renderLiquidityIndicator(asset.liquidityMetrics)}
                    </TableCell>
                    
                    <TableCell align="center">
                      <Tooltip title={`Tax Efficiency: ${formatPercentage(asset.taxMetrics.taxEfficiencyRatio)} | After-tax Return: ${formatPercentage(asset.taxMetrics.afterTaxReturn)}`}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {asset.taxMetrics.taxEfficiencyRatio > 0.8 ? (
                            <CheckCircle color="success" />
                          ) : asset.taxMetrics.taxEfficiencyRatio > 0.6 ? (
                            <Warning color="warning" />
                          ) : (
                            <Cancel color="error" />
                          )}
                          <Typography variant="caption" sx={{ ml: 0.5 }}>
                            {formatPercentage(asset.taxMetrics.taxEfficiencyRatio)}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Typography variant="body2">
                        {asset.exDivDay}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Quick Stats */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Avg Return
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {filteredAndSortedData.length > 0 
                ? formatPercentage(filteredAndSortedData.reduce((sum, asset) => sum + asset.bestReturn, 0) / filteredAndSortedData.length)
                : 'N/A'
              }
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="caption" color="text.secondary">
              Avg Risk
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {filteredAndSortedData.length > 0 
                ? formatPercentage(filteredAndSortedData.reduce((sum, asset) => sum + asset.riskVolatility, 0) / filteredAndSortedData.length)
                : 'N/A'
              }
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="caption" color="text.secondary">
              High Liquidity
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {filteredAndSortedData.filter(asset => asset.liquidityMetrics.liquidityCategory === 'Excellent' || asset.liquidityMetrics.liquidityCategory === 'Good').length}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="caption" color="text.secondary">
              Tax Efficient
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {filteredAndSortedData.filter(asset => asset.taxMetrics.taxEfficiencyRatio > 0.8).length}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default EnhancedDividendScanner;