import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Tooltip,
  IconButton,
  Collapse,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  AccountBalance,
  Warning,
  CheckCircle,
  Error,
  Info,
  TrendingUp,
  TrendingDown,
  Assessment,
  PieChart,
  Receipt,
  Calendar,
  ExpandMore,
  ExpandLess,
  Calculate,
  Timeline
} from '@mui/icons-material';
import { 
  EnhancedDividendData, 
  TaxMetrics, 
  WashSaleIndicator,
  EnhancedAllocation 
} from '../types/dividendTypes';

// Tax tracking dashboard props
interface TaxTrackingDashboardProps {
  data: EnhancedDividendData[];
  allocation?: EnhancedAllocation[];
  investmentAmount?: number;
  taxBracket?: number;
  onTaxOptimizationSuggestion?: (suggestion: TaxOptimizationSuggestion) => void;
}

// Tax optimization suggestion interface
export interface TaxOptimizationSuggestion {
  type: 'wash_sale_avoidance' | 'holding_period_optimization' | 'tax_loss_harvesting' | 'bracket_management';
  ticker: string;
  description: string;
  potentialSavings: number;
  implementationSteps: string[];
  urgency: 'low' | 'medium' | 'high';
}

// Tax bracket definitions for 2024
const TAX_BRACKETS_2024 = {
  ordinary: [
    { min: 0, max: 11000, rate: 0.10 },
    { min: 11000, max: 44725, rate: 0.12 },
    { min: 44725, max: 95375, rate: 0.22 },
    { min: 95375, max: 182050, rate: 0.24 },
    { min: 182050, max: 231250, rate: 0.32 },
    { min: 231250, max: 578100, rate: 0.35 },
    { min: 578100, max: Infinity, rate: 0.37 }
  ],
  capitalGains: [
    { min: 0, max: 44625, rate: 0.00 },
    { min: 44625, max: 492300, rate: 0.15 },
    { min: 492300, max: Infinity, rate: 0.20 }
  ]
};

// Tax efficiency calculator utility
const calculateTaxEfficiency = (
  grossReturn: number,
  dividendPercent: number,
  capitalGainsPercent: number,
  ordinaryTaxRate: number,
  capitalGainsTaxRate: number,
  qualifiedDividendRate: number = 0.8
): number => {
  const dividendIncome = grossReturn * dividendPercent;
  const capitalGainsIncome = grossReturn * capitalGainsPercent;
  
  const qualifiedDividendTax = dividendIncome * qualifiedDividendRate * capitalGainsTaxRate;
  const ordinaryDividendTax = dividendIncome * (1 - qualifiedDividendRate) * ordinaryTaxRate;
  const capitalGainsTax = capitalGainsIncome * capitalGainsTaxRate;
  
  const totalTax = qualifiedDividendTax + ordinaryDividendTax + capitalGainsTax;
  const afterTaxReturn = grossReturn - totalTax;
  
  return afterTaxReturn / grossReturn;
};

// Wash sale risk analyzer
const analyzeWashSaleRisk = (
  ticker: string,
  strategy: 'B&H' | 'DC',
  volatility: number,
  correlatedAssets: string[] = []
): WashSaleIndicator[] => {
  const indicators: WashSaleIndicator[] = [];
  
  // High volatility increases wash sale risk
  if (volatility > 0.3) {
    indicators.push({
      date: new Date().toISOString().split('T')[0],
      riskLevel: 'High',
      reason: 'High volatility increases likelihood of losses and subsequent repurchases',
      impactOnReturns: -0.02 // Estimated 2% impact
    });
  }
  
  // Dividend capture strategy has inherent wash sale risk
  if (strategy === 'DC') {
    indicators.push({
      date: new Date().toISOString().split('T')[0],
      riskLevel: 'Medium',
      reason: 'Dividend capture strategy involves frequent trading around ex-dividend dates',
      impactOnReturns: -0.015 // Estimated 1.5% impact
    });
  }
  
  // Correlated assets increase wash sale risk
  if (correlatedAssets.length > 0) {
    indicators.push({
      date: new Date().toISOString().split('T')[0],
      riskLevel: 'Medium',
      reason: `Substantially identical securities: ${correlatedAssets.join(', ')}`,
      impactOnReturns: -0.01 // Estimated 1% impact
    });
  }
  
  return indicators;
};

// Tax metrics card component
interface TaxMetricCardProps {
  title: string;
  value: number | string;
  format?: 'percentage' | 'currency' | 'ratio' | 'days';
  color?: 'success' | 'warning' | 'error' | 'info' | 'primary';
  icon?: React.ReactNode;
  tooltip?: string;
  comparison?: {
    label: string;
    value: number;
    format?: string;
  };
}

const TaxMetricCard: React.FC<TaxMetricCardProps> = ({
  title,
  value,
  format = 'percentage',
  color = 'primary',
  icon,
  tooltip,
  comparison
}) => {
  const formatValue = (val: number | string, fmt: string): string => {
    if (typeof val === 'string') return val;
    
    switch (fmt) {
      case 'percentage':
        return `${(val * 100).toFixed(2)}%`;
      case 'currency':
        return `$${val.toLocaleString()}`;
      case 'ratio':
        return val.toFixed(2);
      case 'days':
        return `${val} days`;
      default:
        return val.toString();
    }
  };

  return (
    <Card variant="outlined">
      <CardContent sx={{ textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
          {icon}
          <Typography variant="subtitle2" color="text.secondary" sx={{ ml: 1 }}>
            {title}
          </Typography>
          {tooltip && (
            <Tooltip title={tooltip}>
              <IconButton size="small">
                <Info fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        
        <Typography variant="h6" fontWeight="bold" color={`${color}.main`}>
          {formatValue(value, format)}
        </Typography>
        
        {comparison && (
          <Typography variant="caption" color="text.secondary">
            vs {comparison.label}: {formatValue(comparison.value, comparison.format || format)}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// Wash sale risk display component
const WashSaleRiskDisplay: React.FC<{ indicators: WashSaleIndicator[] }> = ({ indicators }) => {
  const [expanded, setExpanded] = useState(false);
  
  const overallRisk = indicators.length === 0 ? 'Low' :
    indicators.some(i => i.riskLevel === 'High') ? 'High' :
    indicators.some(i => i.riskLevel === 'Medium') ? 'Medium' : 'Low';
    
  const totalImpact = indicators.reduce((sum, indicator) => sum + Math.abs(indicator.impactOnReturns), 0);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Wash Sale Risk Analysis</Typography>
          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
          <Chip
            label={`${overallRisk} Risk`}
            color={
              overallRisk === 'Low' ? 'success' :
              overallRisk === 'Medium' ? 'warning' : 'error'
            }
            icon={
              overallRisk === 'Low' ? <CheckCircle /> :
              overallRisk === 'Medium' ? <Warning /> : <Error />
            }
          />
          
          <Typography variant="body2" color="text.secondary">
            Estimated Impact: {(totalImpact * 100).toFixed(1)}% of returns
          </Typography>
        </Box>
        
        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            {indicators.length === 0 ? (
              <Alert severity="success">
                No significant wash sale risk indicators detected.
              </Alert>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Risk Level</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Impact</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {indicators.map((indicator, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip
                          label={indicator.riskLevel}
                          size="small"
                          color={
                            indicator.riskLevel === 'Low' ? 'success' :
                            indicator.riskLevel === 'Medium' ? 'warning' : 'error'
                          }
                        />
                      </TableCell>
                      <TableCell>{indicator.reason}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={indicator.impactOnReturns < 0 ? 'error.main' : 'success.main'}
                        >
                          {(indicator.impactOnReturns * 100).toFixed(1)}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

// Main tax tracking dashboard component
export const TaxTrackingDashboard: React.FC<TaxTrackingDashboardProps> = ({
  data,
  allocation = [],
  investmentAmount = 10000,
  taxBracket = 0.22,
  onTaxOptimizationSuggestion
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [customTaxBracket, setCustomTaxBracket] = useState(taxBracket);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);

  // Calculate portfolio-level tax metrics
  const portfolioTaxMetrics = useMemo(() => {
    if (allocation.length === 0) return null;
    
    let totalGrossReturn = 0;
    let totalAfterTaxReturn = 0;
    let totalTaxableIncome = 0;
    let totalTaxDrag = 0;
    let qualifiedDividendTotal = 0;
    let ordinaryIncomeTotal = 0;
    
    allocation.forEach(holding => {
      const assetData = data.find(asset => asset.ticker === holding.ticker);
      if (!assetData) return;
      
      const holdingValue = investmentAmount * holding.weight;
      const grossReturn = holdingValue * holding.return;
      const afterTaxReturn = holdingValue * assetData.taxMetrics.afterTaxReturn;
      
      totalGrossReturn += grossReturn;
      totalAfterTaxReturn += afterTaxReturn;
      totalTaxableIncome += assetData.taxMetrics.estimatedTaxableIncome * (holdingValue / 10000);
      
      qualifiedDividendTotal += grossReturn * assetData.taxMetrics.qualifiedDividendPercent;
      ordinaryIncomeTotal += grossReturn * assetData.taxMetrics.ordinaryIncomePercent;
    });
    
    totalTaxDrag = (totalGrossReturn - totalAfterTaxReturn) / totalGrossReturn;
    
    return {
      totalGrossReturn,
      totalAfterTaxReturn,
      totalTaxableIncome,
      totalTaxDrag,
      qualifiedDividendPercent: qualifiedDividendTotal / totalGrossReturn,
      ordinaryIncomePercent: ordinaryIncomeTotal / totalGrossReturn,
      taxEfficiencyRatio: totalAfterTaxReturn / totalGrossReturn
    };
  }, [allocation, data, investmentAmount]);

  // Generate tax optimization suggestions
  const taxOptimizationSuggestions = useMemo(() => {
    const suggestions: TaxOptimizationSuggestion[] = [];
    
    // Check for high tax drag assets
    data.forEach(asset => {
      if (asset.taxMetrics.taxEfficiencyRatio < 0.7) {
        suggestions.push({
          type: 'bracket_management',
          ticker: asset.ticker,
          description: `${asset.ticker} has low tax efficiency (${(asset.taxMetrics.taxEfficiencyRatio * 100).toFixed(1)}%). Consider tax-advantaged accounts.`,
          potentialSavings: (1 - asset.taxMetrics.taxEfficiencyRatio) * asset.bestReturn * 0.3,
          implementationSteps: [
            'Consider holding in tax-advantaged account (IRA/401k)',
            'Evaluate tax-loss harvesting opportunities',
            'Review dividend timing strategies'
          ],
          urgency: asset.taxMetrics.taxEfficiencyRatio < 0.5 ? 'high' : 'medium'
        });
      }
      
      // Check for wash sale risks
      const washSaleIndicators = analyzeWashSaleRisk(
        asset.ticker,
        asset.bestStrategy,
        asset.riskVolatility
      );
      
      if (washSaleIndicators.some(indicator => indicator.riskLevel === 'High')) {
        suggestions.push({
          type: 'wash_sale_avoidance',
          ticker: asset.ticker,
          description: `${asset.ticker} has high wash sale risk due to volatility and trading strategy.`,
          potentialSavings: Math.abs(washSaleIndicators.reduce((sum, ind) => sum + ind.impactOnReturns, 0)) * asset.bestReturn,
          implementationSteps: [
            'Extend holding periods beyond 30 days',
            'Avoid repurchasing within wash sale window',
            'Consider substantially different alternatives'
          ],
          urgency: 'high'
        });
      }
    });
    
    return suggestions.sort((a, b) => 
      (b.urgency === 'high' ? 2 : b.urgency === 'medium' ? 1 : 0) -
      (a.urgency === 'high' ? 2 : a.urgency === 'medium' ? 1 : 0)
    );
  }, [data]);

  const selectedAssetData = selectedAsset ? data.find(asset => asset.ticker === selectedAsset) : null;

  return (
    <Box>
      {/* Tax Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Tax Configuration
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Investment Amount"
                type="number"
                value={investmentAmount}
                disabled
                InputProps={{ startAdornment: '$' }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Tax Bracket</InputLabel>
                <Select
                  value={customTaxBracket}
                  label="Tax Bracket"
                  onChange={(e) => setCustomTaxBracket(Number(e.target.value))}
                >
                  <MenuItem value={0.10}>10%</MenuItem>
                  <MenuItem value={0.12}>12%</MenuItem>
                  <MenuItem value={0.22}>22%</MenuItem>
                  <MenuItem value={0.24}>24%</MenuItem>
                  <MenuItem value={0.32}>32%</MenuItem>
                  <MenuItem value={0.35}>35%</MenuItem>
                  <MenuItem value={0.37}>37%</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showAdvancedAnalysis}
                    onChange={(e) => setShowAdvancedAnalysis(e.target.checked)}
                  />
                }
                label="Advanced Analysis"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Portfolio Tax Overview */}
      {portfolioTaxMetrics && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Portfolio Tax Impact
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TaxMetricCard
                  title="Tax Efficiency"
                  value={portfolioTaxMetrics.taxEfficiencyRatio}
                  format="percentage"
                  color={portfolioTaxMetrics.taxEfficiencyRatio > 0.8 ? 'success' : 
                         portfolioTaxMetrics.taxEfficiencyRatio > 0.6 ? 'warning' : 'error'}
                  icon={<Assessment />}
                  tooltip="After-tax return as percentage of gross return"
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TaxMetricCard
                  title="Tax Drag"
                  value={portfolioTaxMetrics.totalTaxDrag}
                  format="percentage"
                  color="error"
                  icon={<TrendingDown />}
                  tooltip="Percentage of returns lost to taxes"
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TaxMetricCard
                  title="Qualified Dividends"
                  value={portfolioTaxMetrics.qualifiedDividendPercent}
                  format="percentage"
                  color="success"
                  icon={<CheckCircle />}
                  tooltip="Percentage of dividends eligible for preferential tax rates"
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TaxMetricCard
                  title="Est. Tax Liability"
                  value={portfolioTaxMetrics.totalTaxableIncome * customTaxBracket}
                  format="currency"
                  color="warning"
                  icon={<Receipt />}
                  tooltip="Estimated annual tax liability on dividends"
                />
              </Grid>
            </Grid>
            
            {portfolioTaxMetrics.totalTaxDrag > 0.2 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                High tax drag detected ({(portfolioTaxMetrics.totalTaxDrag * 100).toFixed(1)}%). 
                Consider tax-advantaged accounts or more tax-efficient investments.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
          <Tab label="Asset Tax Analysis" />
          <Tab label="Optimization Suggestions" />
          <Tab label="Wash Sale Risks" />
          <Tab label="Tax Calendar" />
        </Tabs>
      </Paper>

      {/* Asset Tax Analysis Tab */}
      {selectedTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Individual Asset Tax Analysis
            </Typography>
            
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Ticker</strong></TableCell>
                    <TableCell align="center"><strong>Tax Efficiency</strong></TableCell>
                    <TableCell align="center"><strong>After-Tax Return</strong></TableCell>
                    <TableCell align="center"><strong>Qualified Dividends</strong></TableCell>
                    <TableCell align="center"><strong>Tax Drag</strong></TableCell>
                    <TableCell align="center"><strong>1099 Estimate</strong></TableCell>
                    <TableCell align="center"><strong>Wash Sale Risk</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.slice(0, 20).map((asset) => {
                    const washSaleIndicators = analyzeWashSaleRisk(
                      asset.ticker,
                      asset.bestStrategy,
                      asset.riskVolatility
                    );
                    const washSaleRisk = washSaleIndicators.length === 0 ? 'Low' :
                      washSaleIndicators.some(i => i.riskLevel === 'High') ? 'High' : 'Medium';
                    
                    return (
                      <TableRow
                        key={asset.ticker}
                        hover
                        onClick={() => setSelectedAsset(selectedAsset === asset.ticker ? null : asset.ticker)}
                        sx={{ cursor: 'pointer' }}
                        selected={selectedAsset === asset.ticker}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {asset.ticker}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            {asset.taxMetrics.taxEfficiencyRatio > 0.8 ? <CheckCircle color="success" /> :
                             asset.taxMetrics.taxEfficiencyRatio > 0.6 ? <Warning color="warning" /> :
                             <Error color="error" />}
                            <Typography variant="body2">
                              {(asset.taxMetrics.taxEfficiencyRatio * 100).toFixed(1)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            color={asset.taxMetrics.afterTaxReturn > 0 ? 'success.main' : 'error.main'}
                          >
                            {(asset.taxMetrics.afterTaxReturn * 100).toFixed(2)}%
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="center">
                          <Typography variant="body2">
                            {(asset.taxMetrics.qualifiedDividendPercent * 100).toFixed(0)}%
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            color="error.main"
                          >
                            {((1 - asset.taxMetrics.taxEfficiencyRatio) * 100).toFixed(1)}%
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="center">
                          <Typography variant="body2">
                            ${asset.taxMetrics.estimatedTaxableIncome.toFixed(0)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="center">
                          <Chip
                            label={washSaleRisk}
                            size="small"
                            color={
                              washSaleRisk === 'Low' ? 'success' :
                              washSaleRisk === 'Medium' ? 'warning' : 'error'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Optimization Suggestions Tab */}
      {selectedTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Tax Optimization Suggestions
          </Typography>
          
          {taxOptimizationSuggestions.length === 0 ? (
            <Alert severity="success">
              No immediate tax optimization opportunities identified. Your portfolio appears well-optimized from a tax perspective.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {taxOptimizationSuggestions.map((suggestion, index) => (
                <Grid item xs={12} key={index}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderColor: suggestion.urgency === 'high' ? 'error.main' :
                                  suggestion.urgency === 'medium' ? 'warning.main' : 'info.main'
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6">
                          {suggestion.ticker} - {suggestion.type.replace(/_/g, ' ').toUpperCase()}
                        </Typography>
                        <Chip
                          label={`${suggestion.urgency.toUpperCase()} PRIORITY`}
                          color={suggestion.urgency === 'high' ? 'error' :
                                 suggestion.urgency === 'medium' ? 'warning' : 'info'}
                        />
                      </Box>
                      
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {suggestion.description}
                      </Typography>
                      
                      <Typography variant="body2" color="success.main" fontWeight="bold" sx={{ mb: 2 }}>
                        Potential Savings: {(suggestion.potentialSavings * 100).toFixed(2)}%
                      </Typography>
                      
                      <Typography variant="subtitle2" gutterBottom>
                        Implementation Steps:
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        {suggestion.implementationSteps.map((step, stepIndex) => (
                          <Typography component="li" variant="body2" key={stepIndex}>
                            {step}
                          </Typography>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Wash Sale Risks Tab */}
      {selectedTab === 2 && selectedAssetData && (
        <WashSaleRiskDisplay
          indicators={analyzeWashSaleRisk(
            selectedAssetData.ticker,
            selectedAssetData.bestStrategy,
            selectedAssetData.riskVolatility
          )}
        />
      )}

      {/* Selected Asset Details */}
      {selectedAssetData && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Detailed Tax Analysis: {selectedAssetData.ticker}
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TaxMetricCard
                  title="Tax Efficiency Ratio"
                  value={selectedAssetData.taxMetrics.taxEfficiencyRatio}
                  format="percentage"
                  color={selectedAssetData.taxMetrics.taxEfficiencyRatio > 0.8 ? 'success' : 'warning'}
                  icon={<Assessment />}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TaxMetricCard
                  title="After-Tax Return"
                  value={selectedAssetData.taxMetrics.afterTaxReturn}
                  format="percentage"
                  color="info"
                  icon={<TrendingUp />}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TaxMetricCard
                  title="Optimal Holding Period"
                  value={selectedAssetData.taxMetrics.taxOptimizedHoldingPeriod}
                  format="days"
                  color="primary"
                  icon={<Calendar />}
                />
              </Grid>
            </Grid>
            
            <WashSaleRiskDisplay
              indicators={analyzeWashSaleRisk(
                selectedAssetData.ticker,
                selectedAssetData.bestStrategy,
                selectedAssetData.riskVolatility
              )}
            />
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default TaxTrackingDashboard;