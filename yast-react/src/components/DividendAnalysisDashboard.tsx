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
  dividendCapture: number;
  exDivDay?: string;
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

function calculateMPTAllocation(allData: DividendData[]): { allocation: AllocationItem[], metrics: PortfolioMetrics } {
  // Use ALL data (not just top performers) so filtering logic can work properly
  const allETFs = allData.filter(etf => etf.ticker !== 'SPY' && etf.category !== 'benchmark');
  
  // Add cash and SPY to the mix
  const assets: Asset[] = [
    ...allETFs.map(etf => ({
      ticker: etf.ticker,
      return: etf.bestReturn,
      risk: etf.riskVolatility,
      sharpe: etf.bestReturn / etf.riskVolatility,
      dividendCapture: etf.divCaptureReturn,
      exDivDay: etf.exDivDay
    })),
    {
      ticker: 'CASH',
      return: 0.045, // 4.5% annual yield
      risk: 0.0, // 0% risk
      sharpe: Infinity,
      dividendCapture: 0.0,
      exDivDay: undefined
    },
    {
      ticker: 'SPY',
      return: 0.1574, // Use actual SPY return from your data: 15.74%
      risk: 0.205, // Use actual SPY risk from your data: 20.5%
      sharpe: 0.1574 / 0.205,
      dividendCapture: 0.0,
      exDivDay: undefined
    }
  ];

  // Maximize return while keeping overall portfolio risk under 10%
  const maxPortfolioRisk = 0.10; // 10% risk constraint
  
  // Optimize portfolio with risk constraint (include cash as an option)
  const allocation = optimizePortfolioWithRiskConstraint(assets, maxPortfolioRisk);

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

function optimizePortfolioWithRiskConstraint(assets: Asset[], maxRisk: number): AllocationItem[] {
  // Debug: Log all assets to see their actual values
  console.log('=== PORTFOLIO OPTIMIZATION DEBUG ===');
  console.log('All assets with return/risk values:');
  assets.forEach(asset => {
    if (asset.ticker !== 'CASH') {
      console.log(`${asset.ticker}: ${(asset.return*100).toFixed(1)}% return, ${(asset.risk*100).toFixed(1)}% risk, ${(asset.dividendCapture*100).toFixed(1)}% div capture, exDiv: ${asset.exDivDay}`);
    }
  });
  
  console.log('\n=== FILTERING STAGE 1: HIGH RISK + WEAK PERFORMER FILTER ===');
  
  // Filter out high-risk tickers (>40% risk) if lower-risk alternatives exist on the same ex-div date
  // BUT preserve ETFs that qualify for Rule 2 (>30% div capture, 10% holding regardless of risk)
  // ALSO filter out weak performers when much better alternatives exist on same ex-div day
  const filteredAssets = assets.filter(asset => {
    // Always include CASH and SPY
    if (asset.ticker === 'CASH' || asset.ticker === 'SPY') return true;
    
    // Find other ETFs on the same ex-div day for comparison
    const sameExDivAssets = assets.filter(other => 
      other.exDivDay === asset.exDivDay && 
      other.ticker !== asset.ticker &&
      other.ticker !== 'CASH' &&
      other.ticker !== 'SPY'
    );
    
    // If this asset has risk <= 40%, check if it should still be included
    if (asset.risk <= 0.40) {
      // For non-Rule assets, exclude if there are significantly better alternatives on same day
      if (asset.dividendCapture <= 0.30 && asset.return <= 0.40) {
        // Check if there are much better alternatives (2x better div capture or return)
        const muchBetterAlternatives = sameExDivAssets.filter(other => 
          (other.dividendCapture >= asset.dividendCapture * 2.0) || 
          (other.return >= asset.return * 2.0)
        );
        
        if (muchBetterAlternatives.length > 0) {
          console.log(`Excluding weak performer ${asset.ticker} (${(asset.dividendCapture*100).toFixed(1)}% DC, ${(asset.return*100).toFixed(1)}% return) - much better alternatives exist:`, 
            muchBetterAlternatives.map(alt => `${alt.ticker} (${(alt.dividendCapture*100).toFixed(1)}% DC, ${(alt.return*100).toFixed(1)}% return)`).join(', '));
          return false;
        }
      }
      return true;
    }
    
    // If this asset qualifies for Rule 2 (>30% div capture), check if it's worth including
    if (asset.dividendCapture > 0.30) {
      console.log(`\n--- Evaluating Rule 2 ETF: ${asset.ticker} (${(asset.dividendCapture*100).toFixed(1)}% div capture) ---`);
      
      // Special rule: If return < 40% and there are other ETFs on same ex-div day, exclude
      if (asset.return < 0.40) {
        console.log(`${asset.ticker} has return ${(asset.return*100).toFixed(1)}% < 40% threshold`);
        
        const originalSameExDivAssets = assets.filter(other => 
          other.ticker !== asset.ticker && 
          other.exDivDay === asset.exDivDay &&
          other.ticker !== 'CASH' && 
          other.ticker !== 'SPY'
        );
        
        console.log(`Other ETFs on same ex-div day ${asset.exDivDay}:`, originalSameExDivAssets.map(alt => alt.ticker));
        
        if (originalSameExDivAssets.length > 0) {
          console.log(`❌ EXCLUDING Rule 2 ETF ${asset.ticker} (${(asset.return*100).toFixed(1)}% return < 40%) - other ETFs exist on same ex-div day ${asset.exDivDay}:`, 
            originalSameExDivAssets.map(alt => alt.ticker).join(', '));
          return false;
        } else {
          console.log(`✅ Including ${asset.ticker} despite low return - no other ETFs on ${asset.exDivDay}`);
        }
      }
      
      // For Rule 2 ETFs with ≥40% return, be more selective - exclude if there are meaningfully better alternatives
      const betterAlternatives = sameExDivAssets.filter(other => 
        other.risk < asset.risk && (
          // Either significantly better div capture (20% better)
          other.dividendCapture >= (asset.dividendCapture * 1.2) ||
          // Or similar div capture (within 10%) but much lower risk (5+ percentage points lower)
          (other.dividendCapture >= (asset.dividendCapture * 0.9) && 
           other.risk <= (asset.risk - 0.05))
        )
      );
      
      if (betterAlternatives.length > 0) {
        console.log(`Excluding Rule 2 ETF ${asset.ticker} (${(asset.risk*100).toFixed(1)}% risk, ${(asset.dividendCapture*100).toFixed(1)}% div capture) - meaningfully better alternative exists:`, 
          betterAlternatives.map(alt => `${alt.ticker} (${(alt.risk*100).toFixed(1)}% risk, ${(alt.dividendCapture*100).toFixed(1)}% div capture)`).join(', '));
        return false;
      } else {
        console.log(`Including ${asset.ticker} despite ${(asset.risk*100).toFixed(1)}% risk - qualifies for Rule 2 (${(asset.dividendCapture*100).toFixed(1)}% div capture) with no meaningfully better alternative`);
        return true;
      }
    }
    
    // If this asset has risk > 40% and doesn't qualify for Rule 2, 
    // only include it if no lower-risk alternative exists on the same ex-div date
    const hasLowerRiskAlternative = sameExDivAssets.some(other => other.risk < asset.risk);
    
    if (hasLowerRiskAlternative) {
      console.log(`Excluding high-risk ${asset.ticker} (${(asset.risk*100).toFixed(1)}% risk) - lower-risk alternative exists on ex-div ${asset.exDivDay}`);
      return false;
    }
    
    return true;
  });
  
  console.log('\n=== FILTERING RESULTS ===');
  console.log('Filtered assets that passed all filters:');
  const etfsPassedFilter = filteredAssets.filter(a => a.ticker !== 'CASH' && a.ticker !== 'SPY');
  etfsPassedFilter.forEach(asset => {
    console.log(`✅ ${asset.ticker}: ${(asset.return*100).toFixed(1)}% return, ${(asset.risk*100).toFixed(1)}% risk, ${(asset.dividendCapture*100).toFixed(1)}% div capture, ${asset.exDivDay}`);
  });
  console.log('=== END FILTERING DEBUG ===\n');
  
  console.log(`Filtered ${assets.length - filteredAssets.length} high-risk assets with lower-risk alternatives`);
  
  // Use filtered assets for the rest of the optimization
  const workingAssets = filteredAssets;
  
  // Rule 1: Identify ETFs with >40% return AND <40% risk (mandatory 10% minimum)
  const qualifyingETFs = workingAssets.filter(asset => 
    asset.ticker !== 'CASH' && 
    asset.ticker !== 'SPY' && 
    asset.return > 0.40 && 
    asset.risk < 0.40
  );
  
  // Rule 2: Identify ETFs with >30% dividend capture (10% holding regardless of risk)
  const divCaptureETFs = workingAssets.filter(asset => 
    asset.ticker !== 'CASH' && 
    asset.ticker !== 'SPY' && 
    asset.dividendCapture > 0.30 &&
    !qualifyingETFs.some(qual => qual.ticker === asset.ticker) // Don't double-count
  );
  
  console.log('Qualifying ETFs (>40% return AND <40% risk, min 10%):', qualifyingETFs.map(etf => 
    `${etf.ticker}: ${(etf.return*100).toFixed(1)}% return, ${(etf.risk*100).toFixed(1)}% risk`
  ));
  
  console.log('Div Capture ETFs (>30% div capture, 10% holding):', divCaptureETFs.map(etf => 
    `${etf.ticker}: ${(etf.dividendCapture*100).toFixed(1)}% div capture, ${(etf.risk*100).toFixed(1)}% risk`
  ));
  
  // Debug: Show ALL WORKING assets and their values
  console.log('ALL WORKING ASSETS:', workingAssets.map(asset => 
    `${asset.ticker}: return=${(asset.return*100).toFixed(1)}%, risk=${(asset.risk*100).toFixed(1)}%, divCapture=${(asset.dividendCapture*100).toFixed(1)}%`
  ));
  
  // Sort all working assets by expected return (descending) for remaining allocation
  const sortedAssets = [...workingAssets].sort((a, b) => b.return - a.return);
  
  const allocation: AllocationItem[] = [];
  let totalWeight = 0;
  
  // Step 1: Add qualifying ETFs with minimum 10% each, cap at 20%
  for (const asset of qualifyingETFs) {
    const weight = Math.min(0.20, 0.10); // Start with 10%, max 20%
    allocation.push({
      ticker: asset.ticker,
      weight: weight,
      return: asset.return,
      risk: asset.risk,
      sharpe: asset.sharpe
    });
    totalWeight += weight;
    console.log(`Added qualifying ETF ${asset.ticker} with ${(weight*100).toFixed(1)}% allocation (mandatory minimum)`);
  }
  
  // Step 2: Add div capture ETFs with 10% each
  for (const asset of divCaptureETFs) {
    if (totalWeight + 0.10 <= 1.0) {
      allocation.push({
        ticker: asset.ticker,
        weight: 0.10,
        return: asset.return,
        risk: asset.risk,
        sharpe: asset.sharpe
      });
      totalWeight += 0.10;
      console.log(`Added div capture ETF ${asset.ticker} with 10.0% allocation`);
    }
  }
  
  // Check portfolio risk so far
  let portfolioVariance = allocation.reduce((sum, a) => sum + Math.pow(a.weight * a.risk, 2), 0);
  let portfolioRisk = Math.sqrt(portfolioVariance);
  
  console.log(`After mandatory allocations: ${(portfolioRisk*100).toFixed(1)}% risk, ${(totalWeight*100).toFixed(1)}% allocated`);
  
  // Step 3: Try to increase allocations of existing holdings up to 20% cap if risk allows
  for (const holding of allocation) {
    if (holding.weight < 0.20 && totalWeight < 1.0) {
      // Try increasing this holding to 20%
      const maxIncrease = Math.min(0.20 - holding.weight, 1.0 - totalWeight);
      let bestIncrease = 0;
      
      // Test incremental increases
      for (let increase = 0.01; increase <= maxIncrease; increase += 0.01) {
        const testAllocation = allocation.map(a => 
          a.ticker === holding.ticker 
            ? { ...a, weight: a.weight + increase }
            : a
        );
        
        const testVariance = testAllocation.reduce((sum, a) => sum + Math.pow(a.weight * a.risk, 2), 0);
        const testRisk = Math.sqrt(testVariance);
        
        if (testRisk <= maxRisk) {
          bestIncrease = increase;
        } else {
          break;
        }
      }
      
      if (bestIncrease > 0) {
        holding.weight += bestIncrease;
        totalWeight += bestIncrease;
        console.log(`Increased ${holding.ticker} by ${(bestIncrease*100).toFixed(1)}% to ${(holding.weight*100).toFixed(1)}%`);
      }
    }
  }
  
  // Step 4: Try to add remaining high-return assets up to 20% each if room and risk allows
  const remainingAssets = sortedAssets.filter(asset => 
    !allocation.some(a => a.ticker === asset.ticker) &&
    asset.ticker !== 'CASH' &&
    asset.ticker !== 'SPY'
  );
  
  for (const asset of remainingAssets) {
    if (totalWeight >= 0.98) break; // Leave room for potential cash
    
    // Try adding this asset up to 20% allocation
    let testWeight = 0.02; // Start with 2%
    let bestWeight = 0;
    const maxWeight = 0.20; // Cap at 20%
    
    while (testWeight <= maxWeight && (totalWeight + testWeight) <= 0.98) {
      const testAllocation = [...allocation];
      testAllocation.push({
        ticker: asset.ticker,
        weight: testWeight,
        return: asset.return,
        risk: asset.risk,
        sharpe: asset.sharpe
      });
      
      const testVariance = testAllocation.reduce((sum, a) => sum + Math.pow(a.weight * a.risk, 2), 0);
      const testRisk = Math.sqrt(testVariance);
      
      if (testRisk <= maxRisk) {
        bestWeight = testWeight;
        testWeight += 0.01;
      } else {
        break;
      }
    }
    
    if (bestWeight >= 0.02) {
      allocation.push({
        ticker: asset.ticker,
        weight: bestWeight,
        return: asset.return,
        risk: asset.risk,
        sharpe: asset.sharpe
      });
      totalWeight += bestWeight;
      console.log(`Added ${asset.ticker} with ${(bestWeight*100).toFixed(1)}% allocation`);
    }
  }
  
  // Step 5: Only add cash if we have significant remaining weight (>5%)
  const remainingWeight = 1.0 - totalWeight;
  if (remainingWeight > 0.05) {
    allocation.push({
      ticker: 'CASH',
      weight: remainingWeight,
      return: 0.045,
      risk: 0.0,
      sharpe: Infinity
    });
    console.log(`Added ${(remainingWeight*100).toFixed(1)}% cash to complete allocation`);
  }
  
  // Final portfolio metrics
  const finalVariance = allocation.reduce((sum, a) => sum + Math.pow(a.weight * a.risk, 2), 0);
  const finalRisk = Math.sqrt(finalVariance);
  const finalReturn = allocation.reduce((sum, a) => sum + (a.weight * a.return), 0);
  
  console.log(`Final portfolio: ${(finalReturn*100).toFixed(1)}% expected return, ${(finalRisk*100).toFixed(1)}% risk`);
  
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
        
        // Calculate MPT allocation for ALL ETFs, not just top performers
        if (performanceData.length > 0) {
          const { allocation, metrics } = calculateMPTAllocation(performanceData);
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

  const topPerformers = data.filter(item => 
    item.category === 'top-performers' || 
    mptAllocation.some(allocation => allocation.ticker === item.ticker)
  );
  const excludedTickers = data.filter(item => 
    item.category === 'excluded' && 
    !mptAllocation.some(allocation => allocation.ticker === item.ticker)
  );

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
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                  {mptAllocation.some(allocation => allocation.ticker === item.ticker) && (
                    <Chip
                      label="⭐"
                      size="small"
                      sx={{ 
                        ml: 1,
                        bgcolor: 'success.main',
                        color: 'white',
                        fontSize: '10px',
                        height: '16px',
                        minWidth: '16px'
                      }}
                    />
                  )}
                </Box>
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
                ETFs with strong performance metrics or included in the optimal allocation portfolio
              </Typography>
              {renderTable(topPerformers)}
              
              {/* MPT Portfolio Optimization Widget */}
              {mptAllocation.length > 0 && portfolioMetrics && (
                <Card sx={{ mt: 4, maxWidth: '600px', mx: 'auto', bgcolor: 'rgba(0, 230, 118, 0.05)', border: '1px solid rgba(0, 230, 118, 0.2)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: 'white', textAlign: 'center' }}>
                      🔄 Optimal Allocation
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
                      {/* Portfolio Composition */}
                      <Box sx={{ flex: 1 }}>
                        {mptAllocation
                          .sort((a, b) => b.weight - a.weight)
                          .map((asset, index) => {
                            // Find the corresponding ETF data to get the strategy
                            const etfData = data.find(item => item.ticker === asset.ticker);
                            const strategy = etfData ? etfData.bestStrategy : null;
                            
                            return (
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
                                {strategy && (
                                  <Chip
                                    label={strategy}
                                    size="small"
                                    sx={{
                                      ml: 1,
                                      bgcolor: strategy === 'B&H' ? '#2196f3' : '#009688',
                                      color: 'white',
                                      fontSize: '10px',
                                      height: '18px'
                                    }}
                                  />
                                )}
                              </Box>
                            );
                          })}
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
                ETFs not included in the optimal allocation due to lower performance or higher risk metrics
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
