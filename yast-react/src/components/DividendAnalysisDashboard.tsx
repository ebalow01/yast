import React, { useState } from 'react';
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
  TableRow
} from '@mui/material';
import {
  AttachMoney,
  TrendingUp,
  TrendingDown,
  ShowChart,
  Assessment
} from '@mui/icons-material';
import { dividendAnalysisData, analysisMetadata } from '../data/dividendData';
import type { DividendData } from '../data/dividendData';

const darkTheme = createTheme({
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
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

const DividendAnalysisDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getPerformanceChip = (return_: number) => {
    const isPositive = return_ > 0;
    const color = return_ > 50 ? 'primary' : return_ > 25 ? 'secondary' : isPositive ? 'success' : 'error';
    
    return (
      <Chip
        label={formatPercentage(return_)}
        color={color}
        size="small"
        sx={{ fontWeight: 'bold' }}
      />
    );
  };

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

  const topPerformers = dividendAnalysisData.filter(item => item.category === 'top-performers');
  const excludedTickers = dividendAnalysisData.filter(item => item.category === 'excluded');
  const benchmark = dividendAnalysisData.find(item => item.category === 'benchmark');

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
            <TableCell align="center"><strong>DC Win %</strong></TableCell>
            <TableCell align="center"><strong>Risk %</strong></TableCell>
            <TableCell align="center"><strong>Median Div</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.ticker} hover>
              <TableCell>
                <Typography variant="body2" fontWeight="bold" color="primary">
                  {row.ticker}
                </Typography>
              </TableCell>
              <TableCell align="center">{row.tradingDays}</TableCell>
              <TableCell align="center">
                <Chip label={row.exDivDay} size="small" variant="outlined" />
              </TableCell>
              <TableCell align="center">
                {getPerformanceChip(row.buyHoldReturn)}
              </TableCell>
              <TableCell align="center">
                {getPerformanceChip(row.divCaptureReturn)}
              </TableCell>
              <TableCell align="center">
                {getStrategyChip(row.bestStrategy)}
              </TableCell>
              <TableCell align="center">
                {getPerformanceChip(row.bestReturn)}
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  {formatCurrency(row.finalValue)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2" color={row.dcWinRate > 80 ? 'success.main' : 'warning.main'}>
                  {formatPercentage(row.dcWinRate)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                {getRiskChip(row.riskVolatility)}
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2" fontWeight="bold" color="primary">
                  ${row.medianDividend.toFixed(3)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const getKeyMetrics = (data: DividendData[]) => {
    const avgReturn = data.reduce((sum, item) => sum + item.bestReturn, 0) / data.length;
    const avgRisk = data.reduce((sum, item) => sum + item.riskVolatility, 0) / data.length;
    const avgDividend = data.reduce((sum, item) => sum + item.medianDividend, 0) / data.length;
    return { avgReturn, avgRisk, avgDividend };
  };

  const topMetrics = getKeyMetrics(topPerformers);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid #333' }}>
        <Toolbar>
          <Assessment sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
            YieldMax ETF Dividend Analysis Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {analysisMetadata.analysisDate}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Key Metrics Cards */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
          <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <AttachMoney color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="primary">
                    Total Capital
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(analysisMetadata.startingCapital * analysisMetadata.totalTickers)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Starting Investment
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <TrendingUp color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="success.main">
                    Best Performer
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  YMAX
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatPercentage(99.40)} Return
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <ShowChart color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="secondary.main">
                    Avg Top 4 Return
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatPercentage(topMetrics.avgReturn)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  vs SPY {formatPercentage(11.51)}
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <TrendingDown color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="warning.main">
                    Avg Risk
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatPercentage(topMetrics.avgRisk)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  vs SPY {formatPercentage(20.6)}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Tabs */}
        <Paper sx={{ bgcolor: 'background.paper', mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            centered
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: 'primary.main'
              }
            }}
          >
            <Tab label="Top Performers (>50%)" />
            <Tab label="Excluded Tickers (<50%)" />
            <Tab label="Benchmark Comparison" />
          </Tabs>
        </Paper>

        {/* Tab Panels */}
        <TabPanel value={currentTab} index={0}>
          <Typography variant="h4" gutterBottom color="primary">
            🏆 Top Performers ({'>'}50% Returns)
          </Typography>
          {renderTable(topPerformers)}
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Typography variant="h4" gutterBottom color="secondary">
            📊 Excluded Tickers ({'<'}50% Returns)
          </Typography>
          {renderTable(excludedTickers)}
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Typography variant="h4" gutterBottom color="warning.main">
            📈 Benchmark Comparison
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    SPY Benchmark
                  </Typography>
                  {benchmark && (
                    <Box>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        Return: {getPerformanceChip(benchmark.bestReturn)}
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        Risk: {getRiskChip(benchmark.riskVolatility)}
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        Final Value: {formatCurrency(benchmark.finalValue)}
                      </Typography>
                      <Typography variant="body1">
                        Trading Days: {benchmark.tradingDays}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    YieldMax vs SPY
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    • 13 of 18 YieldMax ETFs outperformed SPY
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    • Top 4 average: {formatPercentage(topMetrics.avgReturn)}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    • YMAX delivered 8.6x SPY performance
                  </Typography>
                  <Typography variant="body1">
                    • Average dividend: ${topMetrics.avgDividend.toFixed(3)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </TabPanel>
      </Container>
    </ThemeProvider>
  );
};

export default DividendAnalysisDashboard;
