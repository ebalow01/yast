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
  CircularProgress
} from '@mui/material';
import {
  AttachMoney,
  TrendingUp,
  TrendingDown,
  ShowChart,
  Assessment
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
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
    return <ShowChart sx={{ color: '#757575' }} />;
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
    const color = strategy === 'DC' ? 'primary' : 'secondary';
    return (
      <Chip
        label={strategy}
        color={color}
        size="small"
        sx={{ fontWeight: 'bold' }}
      />
    );
  };

  const getRiskChip = (risk: number) => {
    const color = risk > 50 ? 'error' : risk > 30 ? 'warning' : 'success';
    return (
      <Chip
        label={formatPercentage(risk)}
        color={color}
        size="small"
        variant="outlined"
      />
    );
  };

  const topPerformers = data.filter(item => item.category === 'top-performers');
  const excludedTickers = data.filter(item => item.category === 'excluded');
  const benchmark = data.find(item => item.category === 'benchmark');

  const renderTable = (data: DividendData[]) => (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell><strong>Ticker</strong></TableCell>
            <TableCell align="center"><strong>Days</strong></TableCell>
            <TableCell align="center"><strong>Ex-Div</strong></TableCell>
            <TableCell align="center"><strong>B&H Return</strong></TableCell>
            <TableCell align="center"><strong>DC Return</strong></TableCell>
            <TableCell align="center"><strong>Best</strong></TableCell>
            <TableCell align="center"><strong>Best Return</strong></TableCell>
            <TableCell align="center"><strong>Final Value</strong></TableCell>
            <TableCell align="center"><strong>Win Rate</strong></TableCell>
            <TableCell align="center"><strong>Risk</strong></TableCell>
            <TableCell align="center"><strong>Median Div</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index} hover>
              <TableCell>
                <Typography variant="body2" fontWeight="bold" color="primary">
                  {item.ticker}
                </Typography>
              </TableCell>
              <TableCell align="center">{item.tradingDays}</TableCell>
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
                <Typography
                  variant="body2"
                  sx={{ color: getColorByValue(item.finalValue - 10000) }}
                >
                  {formatCurrency(item.finalValue)}
                </Typography>
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
                  {formatCurrency(item.medianDividend)}
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
            <Assessment sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              YieldMax ETF Analysis Dashboard
            </Typography>
            <Typography variant="subtitle2" sx={{ ml: 2 }}>
              {metadata.analysisDate}
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
            <Card sx={{ minWidth: 200 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AttachMoney sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="h6">Total Investment</Typography>
                </Box>
                <Typography variant="h4" color="primary">
                  {formatCurrency(metadata.startingCapital * metadata.totalTickers)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {metadata.totalTickers} ETFs × ${formatCurrency(metadata.startingCapital).replace('$', '')}
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ minWidth: 200 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUp sx={{ color: 'success.main', mr: 1 }} />
                  <Typography variant="h6">Top Performers</Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  {topPerformers.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Outperforming ETFs
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ minWidth: 200 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingDown sx={{ color: 'error.main', mr: 1 }} />
                  <Typography variant="h6">Excluded</Typography>
                </Box>
                <Typography variant="h4" color="error.main">
                  {excludedTickers.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Underperforming ETFs
                </Typography>
              </CardContent>
            </Card>
          </Box>

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
              <Tab
                label="Benchmark"
                icon={<ShowChart />}
                iconPosition="start"
              />
            </Tabs>

            <TabPanel value={selectedTab} index={0}>
              <Typography variant="h6" gutterBottom>
                Top Performing ETFs
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                ETFs that outperformed their buy-and-hold strategy using dividend capture
              </Typography>
              {renderTable(topPerformers)}
            </TabPanel>

            <TabPanel value={selectedTab} index={1}>
              <Typography variant="h6" gutterBottom>
                Excluded ETFs
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                ETFs where buy-and-hold strategy performed better than dividend capture
              </Typography>
              {renderTable(excludedTickers)}
            </TabPanel>

            <TabPanel value={selectedTab} index={2}>
              <Typography variant="h6" gutterBottom>
                Benchmark Comparison
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Performance comparison against SPY benchmark
              </Typography>
              {benchmark && renderTable([benchmark])}
            </TabPanel>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
