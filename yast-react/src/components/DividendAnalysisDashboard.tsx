import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  Paper,
  Tab,
  Tabs,
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Link,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';

export interface DividendData {
  ticker: string;
  tradingDays: number;
  exDivDay: string;
  buyHoldReturn: number;
  divCaptureReturn: number;
  bestStrategy: string;
  bestReturn: number;
  finalValue: number;
  dcWinRate: number;
  riskVolatility: number;
  medianDividend: number;
  category: 'top-performers' | 'excluded' | 'benchmark';
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00E676',
      light: '#66FFA6',
      dark: '#00C853'
    },
    secondary: {
      main: '#FF5722',
      light: '#FF8A65',
      dark: '#D84315'
    },
    background: {
      default: '#0A0A0A',
      paper: '#1A1A1A'
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B0B0'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.02em'
    },
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.01em'
    },
    h6: {
      fontWeight: 600
    }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
          border: '1px solid #333',
          borderRadius: 12
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #333',
          fontSize: '0.875rem'
        }
      }
    }
  }
});

// MPT Calculation Functions
interface Asset {
  ticker: string;
  return: number;
  risk: number;
  sharpe: number;
}

interface AllocationItem {
  ticker: string;
  weight: number;
  return: number;
  risk: number;
  sharpe?: number;
}

interface PortfolioMetrics {
  expectedReturn: number;
  risk: number;
  sharpeRatio: number;
}

function calculateMPTAllocation(topPerformers: DividendData[]): { allocation: AllocationItem[], metrics: PortfolioMetrics } {
  // Add cash and SPY to the mix
  const assets: Asset[] = [
    ...topPerformers.map(etf => ({
      ticker: etf.ticker,
      return: etf.bestReturn,
      risk: etf.riskVolatility,
      sharpe: etf.bestReturn / etf.riskVolatility
    })),
    {
      ticker: 'CASH',
      return: 0.045, // 4.5% annual yield
      risk: 0.0, // 0% risk
      sharpe: Infinity
    },
    {
      ticker: 'SPY',
      return: 0.12, // 12% annual return
      risk: 0.20, // 20% risk
      sharpe: 0.12 / 0.20
    }
  ];

  // Force 20% cash allocation
  const cashAllocation = 0.20;
  const remainingAllocation = 0.80;

  // Filter out cash for optimization of remaining 80%
  const optimizableAssets = assets.filter(asset => asset.ticker !== 'CASH');

  // Simple mean variance optimization using Sharpe ratios
  const allocation = optimizePortfolio(optimizableAssets, remainingAllocation);
  
  // Add cash allocation back
  allocation.push({
    ticker: 'CASH',
    weight: cashAllocation,
    return: 0.045,
    risk: 0.0
  });

  // Calculate portfolio metrics
  const portfolioMetrics = calculatePortfolioMetrics(allocation);

  return { allocation, metrics: portfolioMetrics };
}

function optimizePortfolio(assets: Asset[], totalAllocation: number): AllocationItem[] {
  // Sort by Sharpe ratio (descending)
  const sortedAssets = [...assets].sort((a, b) => b.sharpe - a.sharpe);
  
  // Simple allocation based on Sharpe ratios with diversification constraints
  const allocation: AllocationItem[] = [];
  let remainingWeight = totalAllocation;
  
  // Limit individual positions (max 25% each for diversification)
  const maxWeight = 0.25;
  
  for (let i = 0; i < sortedAssets.length && remainingWeight > 0.01; i++) {
    const asset = sortedAssets[i];
    
    // Calculate weight based on Sharpe ratio, but cap it
    let weight = Math.min(
      (asset.sharpe / sortedAssets.reduce((sum, a) => sum + a.sharpe, 0)) * totalAllocation,
      maxWeight,
      remainingWeight
    );
    
    // Minimum allocation of 2% if we're including it
    if (weight > 0.02) {
      allocation.push({
        ticker: asset.ticker,
        weight: weight,
        return: asset.return,
        risk: asset.risk,
        sharpe: asset.sharpe
      });
      remainingWeight -= weight;
    }
  }
  
  // Redistribute any remaining weight proportionally
  if (remainingWeight > 0.01 && allocation.length > 0) {
    const redistributionFactor = 1 + (remainingWeight / allocation.reduce((sum, a) => sum + a.weight, 0));
    allocation.forEach(asset => {
      asset.weight *= redistributionFactor;
    });
  }

  return allocation;
}

function calculatePortfolioMetrics(allocation: AllocationItem[]): PortfolioMetrics {
  const portfolioReturn = allocation.reduce((sum, asset) => sum + (asset.weight * asset.return), 0);
  
  // Simplified portfolio risk calculation (assuming some correlation)
  const portfolioVariance = allocation.reduce((sum, asset) => {
    return sum + Math.pow(asset.weight * asset.risk, 2);
  }, 0);
  const portfolioRisk = Math.sqrt(portfolioVariance);
  
  const sharpeRatio = portfolioRisk > 0 ? portfolioReturn / portfolioRisk : 0;

  return {
    expectedReturn: portfolioReturn,
    risk: portfolioRisk,
    sharpeRatio: sharpeRatio
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analysis-tabpanel-${index}`}
      aria-labelledby={`analysis-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function DividendAnalysisDashboard() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [data, setData] = useState<DividendData[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mptAllocation, setMptAllocation] = useState<any[]>([]);
  const [portfolioMetrics, setPortfolioMetrics] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load performance data
        const performanceResponse = await fetch('/data/performance_data.json');
        if (!performanceResponse.ok) throw new Error('Failed to load performance data');
        const performanceData = await performanceResponse.json();
        
        // Load metadata
        const metadataResponse = await fetch('/data/metadata.json');
        if (!metadataResponse.ok) throw new Error('Failed to load metadata');
        const metadataData = await metadataResponse.json();
        
        setData(performanceData);
        setMetadata(metadataData);
        
        // Calculate MPT allocation for top performers
        const topPerformers = performanceData.filter((item: DividendData) => item.category === 'top-performers');
        if (topPerformers.length > 0) {
          const { allocation, metrics } = calculateMPTAllocation(topPerformers);
          setMptAllocation(allocation);
          setPortfolioMetrics(metrics);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  // Helper function to format dividend amounts (with 3 decimal places)
  const formatDividend = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(amount);
  };

  // Helper function to format percentage
  const formatPercentage = (percentage: number): string => {
    return `${(percentage * 100).toFixed(2)}%`;
  };

  // Helper function to get color based on value
  const getColorByValue = (value: number): string => {
    if (value > 0) return '#4caf50';  // Green for positive
    if (value < 0) return '#f44336';  // Red for negative
    return '#757575';  // Gray for neutral
  };

  // Helper function to get appropriate icon based on return
  const getReturnIcon = (returnValue: number) => {
    if (returnValue > 0) return <TrendingUp sx={{ color: '#4caf50' }} />;
    if (returnValue < 0) return <TrendingDown sx={{ color: '#f44336' }} />;
    return <TrendingUp sx={{ color: '#757575' }} />;
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading dividend analysis data...
          </Typography>
        </Container>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error">
            Error: {error}
          </Typography>
        </Container>
      </ThemeProvider>
    );
  }

  if (!metadata) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body1">
            No data available
          </Typography>
        </Container>
      </ThemeProvider>
    );
  }

  const getStrategyChip = (strategy: string) => {
    const tooltipText = strategy === 'B&H' 
      ? 'Buy & Hold: Traditional strategy of buying the ETF and holding it for the entire period, collecting all dividends along the way.'
      : 'Dividend Capture: Strategic trading around ex-dividend dates to capture dividends while minimizing market exposure time.';
    
    return (
      <Tooltip title={tooltipText} arrow>
        <Chip
          label={strategy}
          size="small"
          sx={{ 
            fontWeight: 'bold',
            backgroundColor: strategy === 'B&H' ? '#2196f3' : '#009688',
            color: 'white',
            cursor: 'help'
          }}
        />
      </Tooltip>
    );
  };

  const getRiskChip = (risk: number) => {
    const riskPct = risk * 100;
    const isHighRisk = riskPct > 40;
    return (
      <Chip
        label={formatPercentage(risk)}
        size="small"
        variant="outlined"
        sx={{
          color: isHighRisk ? '#f44336' : '#4caf50',
          borderColor: isHighRisk ? '#f44336' : '#4caf50'
        }}
      />
    );
  };

  const topPerformers = data.filter(item => item.category === 'top-performers');
  const excludedTickers = data.filter(item => item.category === 'excluded');

  const renderTable = (data: DividendData[]) => (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell><strong>Ticker</strong></TableCell>
            <TableCell align="center"><strong>Ex-Div</strong></TableCell>
            <TableCell align="center"><strong>B&H Return</strong></TableCell>
            <TableCell align="center"><strong>DC Return</strong></TableCell>
            <TableCell align="center"><strong>Best</strong></TableCell>
            <TableCell align="center"><strong>Best Return</strong></TableCell>
            <TableCell align="center"><strong>Win Rate</strong></TableCell>
            <TableCell align="center"><strong>Risk</strong></TableCell>
            <TableCell align="center"><strong>Median Div</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index} hover>
              <TableCell>
                <Link
                  href={`https://marketchameleon.com/Overview/${item.ticker}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ textDecoration: 'none' }}
                >
                  <Typography variant="body2" fontWeight="bold" color="primary">
                    {item.ticker}
                  </Typography>
                </Link>
              </TableCell>
              <TableCell align="center">{item.exDivDay}</TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getReturnIcon(item.buyHoldReturn)}
                  <Typography
                    variant="body2"
                    sx={{ ml: 0.5, color: getColorByValue(item.buyHoldReturn) }}
                  >
                    {formatPercentage(item.buyHoldReturn)}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getReturnIcon(item.divCaptureReturn)}
                  <Typography
                    variant="body2"
                    sx={{ ml: 0.5, color: getColorByValue(item.divCaptureReturn) }}
                  >
                    {formatPercentage(item.divCaptureReturn)}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="center">
                {getStrategyChip(item.bestStrategy)}
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getReturnIcon(item.bestReturn)}
                  <Typography
                    variant="body2"
                    sx={{ ml: 0.5, color: getColorByValue(item.bestReturn) }}
                  >
                    {formatPercentage(item.bestReturn)}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2">
                  {formatPercentage(item.dcWinRate)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                {getRiskChip(item.riskVolatility)}
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2">
                  {formatDividend(item.medianDividend)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh' }}>
        <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              YieldMax ETFs - Weekly Distribution Analysis
            </Typography>
            <Typography variant="subtitle2" sx={{ ml: 2 }}>
              Last Updated: {metadata.analysisDate}
            </Typography>
          </Toolbar>
        </AppBar>        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Paper sx={{ width: '100%', mb: 2 }}>
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab
                label={`Top Performers (${topPerformers.length})`}
                icon={<TrendingUp />}
                iconPosition="start"
              />
              <Tab
                label={`Excluded (${excludedTickers.length})`}
                icon={<TrendingDown />}
                iconPosition="start"
              />
            </Tabs>

            <TabPanel value={selectedTab} index={0}>
              <Typography variant="h6" gutterBottom>
                Top Performing ETFs
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                ETFs with annualized returns above 40% and risk below 40% (best of Buy & Hold or Dividend Capture strategies)
              </Typography>
              {renderTable(topPerformers)}
              
              {/* MPT Portfolio Optimization Widget */}
              {mptAllocation.length > 0 && portfolioMetrics && (
                <Card sx={{ mt: 4, maxWidth: '600px', mx: 'auto', bgcolor: 'rgba(0, 230, 118, 0.05)', border: '1px solid rgba(0, 230, 118, 0.2)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: 'white', textAlign: 'center' }}>
                      Optimal Allocation
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
                      {/* Portfolio Composition */}
                      <Box sx={{ flex: 1 }}>
                        {mptAllocation
                          .sort((a, b) => b.weight - a.weight)
                          .map((asset, index) => (
                            <Box key={index} sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              mb: 1,
                              p: 1,
                              bgcolor: 'rgba(255, 255, 255, 0.02)',
                              borderRadius: 1
                            }}>
                              <Chip
                                label={asset.ticker}
                                size="small"
                                sx={{
                                  bgcolor: asset.ticker === 'CASH' ? 'primary.main' : 
                                           asset.ticker === 'SPY' ? 'primary.main' : 
                                           'info.main',
                                  color: 'white',
                                  fontWeight: 'bold',
                                  minWidth: '60px'
                                }}
                              />
                              <Typography sx={{ fontWeight: 'bold', ml: 1 }}>
                                {(asset.weight * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                          ))}
                      </Box>
                      
                      {/* Portfolio Metrics */}
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography><strong>Expected Return:</strong></Typography>
                            <Typography sx={{ color: 'success.main' }}>
                              {formatPercentage(portfolioMetrics.expectedReturn)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography><strong>Portfolio Risk:</strong></Typography>
                            <Typography sx={{ 
                              color: portfolioMetrics.risk > 0.15 ? 'error.main' : 'success.main' 
                            }}>
                              {formatPercentage(portfolioMetrics.risk)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography><strong>Sharpe Ratio:</strong></Typography>
                            <Typography sx={{ color: 'success.main' }}>
                              {portfolioMetrics.sharpeRatio.toFixed(2)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography><strong>Diversification:</strong></Typography>
                            <Typography sx={{ color: 'success.main' }}>
                              {mptAllocation.length} assets
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      textAlign: 'center',
                      fontStyle: 'italic',
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      pt: 2
                    }}>
                      Optimization based on Sharpe ratios, efficient frontier analysis, and mean variance optimization
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </TabPanel>

            <TabPanel value={selectedTab} index={1}>
              <Typography variant="h6" gutterBottom>
                Excluded ETFs
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                ETFs with annualized returns at or below 40% or risk at or above 40%
              </Typography>
              {renderTable(excludedTickers)}
            </TabPanel>
          </Paper>

          {/* Disclaimer */}
          <Card sx={{ mt: 4, bgcolor: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: 'warning.main' }}>
                ⚠️ Important Disclaimer
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                This analysis tool is provided for <strong>educational and entertainment purposes only</strong>. 
                The data, calculations, and strategies presented here are <strong>not investment advice</strong> and should not be 
                considered as recommendations for any financial decisions. Past performance does not guarantee future results. 
                All investments carry risk, including the potential loss of principal. You should consult with a qualified 
                financial advisor before making any investment decisions. The creator of this tool is not responsible for any 
                financial losses or decisions made based on this information.
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
