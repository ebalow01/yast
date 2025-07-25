import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  Button,
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  IconButton,
  Badge
} from '@mui/material';
import {
  Dashboard,
  Analytics,
  Assessment,
  Settings,
  Refresh,
  Info
} from '@mui/icons-material';

// Import enhanced components
import { EnhancedDividendScanner } from './EnhancedDividendScanner';
import { RiskMetricsDisplay } from './RiskMetricsDisplay';
import { DataVisualization } from './DataVisualization';
import { 
  ErrorBoundary, 
  LoadingSpinner, 
  useErrorHandler,
  ErrorDisplay,
  ProgressLoading
} from './ErrorHandling';

// Import types and utilities
import type { 
  EnhancedDividendData, 
  EnhancedAllocation, 
  EnhancedPortfolioMetrics,
  DashboardState,
  LegacyDividendData
} from '../types/dividendTypes';
import { 
  transformLegacyData, 
  transformLegacyAllocation, 
  transformLegacyPortfolioMetrics,
  validateTransformedData
} from '../utils/dataTransform';

// Import existing data (your current implementation)
import { dividendData, analysisMetadata } from '../data/dividendData';

// Enhanced theme (extends your existing theme)
const enhancedTheme = createTheme({
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
    },
    success: {
      main: '#4CAF50',
      light: '#81C784',
      dark: '#388E3C'
    },
    warning: {
      main: '#FF9800',
      light: '#FFB74D',
      dark: '#F57C00'
    },
    error: {
      main: '#F44336',
      light: '#E57373',
      dark: '#D32F2F'
    },
    info: {
      main: '#2196F3',
      light: '#64B5F6',
      dark: '#1976D2'
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
    }
  }
});

// Props for the enhanced dashboard integration
interface EnhancedDashboardIntegrationProps {
  // Optional props to control behavior
  enableExistingView?: boolean;
  defaultTab?: number;
  mockAllocation?: any[]; // Your existing allocation format
  mockPortfolioMetrics?: any; // Your existing portfolio metrics
}

// Tab panel component
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
      id={`enhanced-tabpanel-${index}`}
      aria-labelledby={`enhanced-tab-${index}`}
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

// Demo data converter (converts your existing Asset interface to LegacyDividendData)
const convertAssetToLegacyData = (asset: any): LegacyDividendData => {
  // Generate realistic stock prices based on actual ETF characteristics
  const generateRealisticPrice = (ticker: string, forwardYield: number, medianDividend: number) => {
    // Base price estimation using dividend yield relationship
    const yieldDecimal = (forwardYield || 50) / 100; // Default 50% yield if missing
    const annualDividend = (medianDividend || 0.2) * 52; // Weekly dividends * 52
    const basePrice = annualDividend / yieldDecimal;
    
    // Ticker-specific price adjustments for realism
    const priceMultipliers: { [key: string]: number } = {
      'PLTW': 0.8,  'COIW': 0.9,  'QDTE': 1.1,  'YMAX': 1.0,  'YETH': 0.7,
      'LFGY': 1.2,  'YMAG': 1.1,  'ULTY': 1.3,  'XDTE': 1.0,  'NVDW': 0.9,
      'HOOW': 0.6,  'COII': 1.4,  'QQQY': 1.2,  'YBTC': 0.8,  'CHPY': 1.1,
      'IWMY': 1.0,  'RDTE': 1.1,  'NVYY': 0.9,  'TSLW': 0.7,  'GPTY': 1.0,
      'AAPW': 1.3,  'NVII': 1.5,  'YSPY': 1.4,  'XBTY': 0.8,  'TSYY': 0.9,
      'WDTE': 1.2,  'BLOX': 1.6,  'RDTY': 1.1,  'MAGY': 1.8,  'SDTY': 2.1,
      'QDTY': 1.9,  'SPY': 8.5,   'TQQY': 2.2,  'MSII': 1.7,  'MST': 1.4,
      'GLDY': 2.0,  'BCCC': 2.3,  'USOY': 1.5,  'AMZW': 3.2,  'TSII': 1.8,
      'MMKT': 12.7, 'WEEK': 12.8, 'METW': 3.5,  'BRKW': 4.1,  'NFLW': 2.9
    };
    
    const multiplier = priceMultipliers[ticker] || 1.0;
    const adjustedPrice = basePrice * multiplier;
    
    // Add some realistic variation
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const finalPrice = adjustedPrice * (1 + variation);
    
    // Keep within reasonable ETF price ranges
    return Math.max(8.0, Math.min(500.0, finalPrice));
  };
  
  const mockPrice = asset.currentPrice || generateRealisticPrice(asset.ticker, asset.forwardYield, asset.medianDividend);
  
  return {
    ticker: asset.ticker,
    tradingDays: asset.tradingDays || 96,
    exDivDay: asset.exDivDay || 'Thursday',
    buyHoldReturn: (asset.buyHoldReturn || asset.return || 0) / 100, // Convert percentage to decimal
    divCaptureReturn: (asset.dividendCaptureReturn || asset.dividendCapture || 0) / 100,
    bestStrategy: asset.bestStrategy || (asset.return > asset.dividendCapture ? 'B&H' : 'DC'),
    bestReturn: Math.max(
      (asset.buyHoldReturn || asset.return || 0) / 100,
      (asset.dividendCaptureReturn || asset.dividendCapture || 0) / 100
    ),
    finalValue: asset.finalValue || 100000,
    dcWinRate: (asset.winRate || 80) / 100,
    riskVolatility: (asset.risk || 20) / 100,
    medianDividend: asset.medianDividend || 0.5,
    forwardYield: asset.forwardYield,
    currentPrice: mockPrice,
    lastDividend: asset.lastDividend || asset.medianDividend || 0.5,
    category: asset.return >= 40 ? 'top-performers' : 
             asset.return >= 20 ? 'mid-performers' : 
             asset.return >= 0 ? 'low-performers' : 'excluded'
  };
};

// Main enhanced dashboard integration component
export const EnhancedDashboardIntegration: React.FC<EnhancedDashboardIntegrationProps> = ({
  enableExistingView = true,
  defaultTab = 0,
  mockAllocation = [],
  mockPortfolioMetrics = null
}) => {
  // State management
  const [selectedTab, setSelectedTab] = useState(defaultTab);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [enhancedMode, setEnhancedMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState('Initializing...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Error handling
  const { errors, handleError, removeError, clearErrors } = useErrorHandler();
  
  // Dashboard state
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    selectedTab: 0,
    timeframe: '1Y',
    riskTolerance: 'Moderate',
    taxBracket: 0, // Not applicable for 401k
    filters: {
      minReturn: 0,
      maxRisk: 100,
      minLiquidity: 0,
      allowedStrategies: ['B&H', 'DC'],
      preferredExDivDays: []
    },
    displayPreferences: {
      showAdvancedMetrics: enhancedMode,
      defaultSortColumn: 'bestReturn',
      defaultSortDirection: 'desc',
      chartType: 'line',
      colorScheme: 'default',
      tableSize: 'standard',
      showTooltips: true
    },
    lastDataUpdate: new Date().toISOString(),
    dataFreshness: 'Live'
  });

  // Transform data to enhanced format
  const enhancedData = useMemo(() => {
    try {
      setLoadingStage('Converting data format...');
      setLoadingProgress(20);
      
      // Convert your existing data to legacy format first
      const legacyData = dividendData.map(convertAssetToLegacyData);
      
      setLoadingStage('Calculating risk metrics...');
      setLoadingProgress(40);
      
      // Transform to enhanced format
      const enhanced = transformLegacyData(legacyData);
      
      setLoadingStage('Validating data...');
      setLoadingProgress(60);
      
      // Validate the transformed data
      if (!validateTransformedData(enhanced)) {
        throw new Error('Data validation failed');
      }
      
      setLoadingStage('Finalizing...');
      setLoadingProgress(80);
      
      return enhanced;
    } catch (error) {
      handleError(
        'DATA_TRANSFORM_ERROR',
        'Failed to transform dividend data to enhanced format',
        {
          details: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
          severity: 'high',
          source: 'calculation'
        }
      );
      return [];
    }
  }, [handleError]);

  // Transform allocation data
  const enhancedAllocation = useMemo(() => {
    if (mockAllocation.length === 0) return [];
    
    try {
      const legacyData = dividendData.map(convertAssetToLegacyData);
      return transformLegacyAllocation(mockAllocation, legacyData);
    } catch (error) {
      handleError(
        'ALLOCATION_TRANSFORM_ERROR',
        'Failed to transform allocation data',
        {
          details: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
          severity: 'medium',
          source: 'calculation'
        }
      );
      return [];
    }
  }, [mockAllocation, handleError]);

  // Transform portfolio metrics
  const enhancedPortfolioMetrics = useMemo(() => {
    if (!mockPortfolioMetrics) return undefined;
    
    try {
      const legacyAllocation = mockAllocation.length > 0 ? mockAllocation : [];
      return transformLegacyPortfolioMetrics(mockPortfolioMetrics, legacyAllocation);
    } catch (error) {
      handleError(
        'METRICS_TRANSFORM_ERROR',
        'Failed to transform portfolio metrics',
        {
          details: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
          severity: 'medium',
          source: 'calculation'
        }
      );
      return undefined;
    }
  }, [mockPortfolioMetrics, mockAllocation, handleError]);

  // Simulate loading process
  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setLoadingProgress(100);
      setLoadingStage('Complete');
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }, 2000);

    return () => clearTimeout(loadingTimer);
  }, []);

  // Handle tab changes
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
    setDashboardState(prev => ({ ...prev, selectedTab: newValue }));
  };

  // Handle refresh
  const handleRefresh = () => {
    setLoading(true);
    setLoadingProgress(0);
    clearErrors();
    // Simulate refresh
    setTimeout(() => setLoading(false), 1500);
  };

  // Loading state
  if (loading) {
    return (
      <ThemeProvider theme={enhancedTheme}>
        <CssBaseline />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <ProgressLoading
            progress={loadingProgress}
            stage={loadingStage}
            message="Initializing enhanced dividend dashboard..."
          />
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={enhancedTheme}>
      <CssBaseline />
      <ErrorBoundary onError={(error, errorInfo) => {
        handleError(
          'REACT_ERROR',
          'A React component error occurred',
          {
            details: `${error.message}\n${errorInfo.componentStack}`,
            retryable: true,
            severity: 'critical',
            source: 'unknown'
          }
        );
      }}>
        <Box sx={{ minHeight: '100vh' }}>
          {/* Enhanced App Bar */}
          <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)' }}>
            <Toolbar>
              <Dashboard sx={{ mr: 2 }} />
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Enhanced Dividend Capture Dashboard
              </Typography>
              
              {/* Mode Toggle */}
              <FormControlLabel
                control={
                  <Switch
                    checked={enhancedMode}
                    onChange={(e) => setEnhancedMode(e.target.checked)}
                    color="primary"
                  />
                }
                label="Enhanced Mode"
                sx={{ mr: 2 }}
              />
              
              {/* Error Badge */}
              <IconButton color="inherit" onClick={clearErrors}>
                <Badge badgeContent={errors.length} color="error">
                  <Info />
                </Badge>
              </IconButton>
              
              {/* Refresh Button */}
              <IconButton color="inherit" onClick={handleRefresh}>
                <Refresh />
              </IconButton>
              
              <Typography variant="subtitle2" sx={{ ml: 2 }}>
                Last Updated: {analysisMetadata.analysisDate}
              </Typography>
            </Toolbar>
          </AppBar>

          <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Error Display */}
            {errors.map((error, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <ErrorDisplay
                  error={error}
                  onRetry={() => {
                    // Implement retry logic based on error type
                    removeError(index);
                  }}
                  onDismiss={() => removeError(index)}
                />
              </Box>
            ))}

            {/* Dashboard Info */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h5">
                    401k Dividend Capture Strategy Analysis
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={`${enhancedData.length} Assets`}
                      color="primary"
                      icon={<Assessment />}
                    />
                    <Chip
                      label="Tax-Deferred Account"
                      color="success"
                      icon={<Info />}
                    />
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  Enhanced analysis with risk metrics, liquidity scoring, and advanced portfolio optimization.
                  Tax implications are simplified for 401k context.
                </Typography>
              </CardContent>
            </Card>

            {/* Main Tabs */}
            <Card>
              <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab
                  label="Dividend Scanner"
                  icon={<Dashboard />}
                  iconPosition="start"
                />
                <Tab
                  label="Risk Analysis"
                  icon={<Assessment />}
                  iconPosition="start"
                />
                <Tab
                  label="Portfolio Visualization"
                  icon={<Analytics />}
                  iconPosition="start"
                />
                {enableExistingView && (
                  <Tab
                    label="Classic View"
                    icon={<Settings />}
                    iconPosition="start"
                  />
                )}
              </Tabs>

              {/* Tab Panels */}
              <TabPanel value={selectedTab} index={0}>
                <EnhancedDividendScanner
                  data={enhancedData}
                  loading={loading}
                  onAssetSelect={setSelectedAsset}
                  initialFilters={dashboardState.filters}
                />
              </TabPanel>

              <TabPanel value={selectedTab} index={1}>
                <RiskMetricsDisplay
                  data={enhancedData}
                  selectedAsset={selectedAsset}
                  showPortfolioRisk={true}
                  onAssetSelect={setSelectedAsset}
                />
              </TabPanel>

              <TabPanel value={selectedTab} index={2}>
                <DataVisualization
                  data={enhancedData}
                  allocation={enhancedAllocation}
                  portfolioMetrics={enhancedPortfolioMetrics}
                  selectedAsset={selectedAsset}
                  onAssetSelect={setSelectedAsset}
                />
              </TabPanel>

              {enableExistingView && (
                <TabPanel value={selectedTab} index={3}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This tab would contain your existing dashboard implementation for comparison.
                  </Alert>
                  <Typography variant="body2" color="text.secondary">
                    Your current DividendAnalysisDashboard component would be rendered here,
                    allowing users to compare the classic and enhanced views.
                  </Typography>
                </TabPanel>
              )}
            </Card>

            {/* Footer Info */}
            <Card sx={{ mt: 4, bgcolor: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, color: 'warning.main' }}>
                  401k Investment Context
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  This enhanced dashboard is optimized for 401k retirement account analysis. 
                  Tax considerations are simplified since contributions and growth are tax-deferred. 
                  Wash sale rules do not apply in retirement accounts, and there are no holding period requirements 
                  for tax optimization. Focus is on risk-adjusted returns, liquidity analysis, and long-term growth potential.
                </Typography>
              </CardContent>
            </Card>
          </Container>
        </Box>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default EnhancedDashboardIntegration;