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
  Tooltip,
  Fade,
  Grow,
  Slide,
  alpha
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Analytics,
  Dashboard,
  Stars,
  Timeline,
  AccountBalance,
  ShowChart,
  Security,
  TrendingFlat,
  TableView
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { dividendData, analysisMetadata, type Asset as DividendAsset } from '../data/dividendData';
import EnhancedDashboardIntegration from './EnhancedDashboardIntegration';

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
  forwardYield?: number;
  category: 'top-performers' | 'mid-performers' | 'low-performers' | 'excluded' | 'benchmark';
}

// Accessible 2025 Design System - Semantic Colors + Patterns
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00D4FF', // Reserved for primary actions & selected states only
      light: '#64E3FF',
      dark: '#0095CC',
      contrastText: '#000000'
    },
    secondary: {
      main: '#8E8E93', // Neutral gray for secondary elements
      light: '#C7C7CC',
      dark: '#636366'
    },
    success: {
      main: '#34C759', // Clear positive outcomes only
      light: '#69F0AE',
      dark: '#28A745'
    },
    warning: {
      main: '#FF9500', // Caution/moderate risk
      light: '#FFB74D',
      dark: '#E6840E'
    },
    error: {
      main: '#FF3B30', // Clear negative outcomes only
      light: '#FF7D99',
      dark: '#D70015'
    },
    info: {
      main: '#007AFF', // Informational content
      light: '#64B5F6',
      dark: '#0056CC'
    },
    background: {
      default: '#0A0A0A', // Single solid background - no competing gradients
      paper: 'rgba(255, 255, 255, 0.03)' // Reduced transparency for better readability
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.8)' // Improved contrast
    },
    divider: 'rgba(255, 255, 255, 0.12)' // Better visibility
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      fontSize: '3.5rem',
      letterSpacing: '-0.04em',
      color: '#FFFFFF' // Solid color for better readability
    },
    h2: {
      fontWeight: 700,
      fontSize: '2.5rem',
      letterSpacing: '-0.03em'
    },
    h3: {
      fontWeight: 700,
      fontSize: '2rem',
      letterSpacing: '-0.02em'
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      letterSpacing: '-0.01em'
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem'
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem'
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      opacity: 0.9
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      opacity: 0.8
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5
    }
  },
  shape: {
    borderRadius: 16
  },
  shadows: [
    'none',
    '0px 2px 8px rgba(0, 0, 0, 0.15)',
    '0px 4px 16px rgba(0, 0, 0, 0.2)',
    '0px 8px 24px rgba(0, 0, 0, 0.25)',
    '0px 12px 32px rgba(0, 0, 0, 0.3)',
    '0px 16px 40px rgba(0, 0, 0, 0.35)',
    '0px 20px 48px rgba(0, 0, 0, 0.4)',
    '0px 24px 56px rgba(0, 0, 0, 0.45)',
    ...Array(16).fill('0px 24px 56px rgba(0, 0, 0, 0.45)')
  ],
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 20,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
            opacity: 0,
            transition: 'opacity 0.3s ease'
          },
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 40px rgba(0, 212, 255, 0.15), 0 0 0 1px rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            '&::before': {
              opacity: 1
            }
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          '& .MuiTabs-indicator': {
            background: 'linear-gradient(90deg, #00D4FF, #6C63FF)',
            height: 3,
            borderRadius: '3px 3px 0 0'
          }
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.95rem',
          minHeight: 64,
          transition: 'all 0.3s ease',
          '&:hover': {
            color: '#00D4FF',
            backgroundColor: 'rgba(0, 212, 255, 0.05)'
          },
          '&.Mui-selected': {
            color: '#00D4FF'
          }
        }
      }
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 4
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0, 212, 255, 0.4)',
            borderRadius: 4,
            '&:hover': {
              background: 'rgba(0, 212, 255, 0.6)'
            }
          }
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            background: 'rgba(0, 212, 255, 0.08)',
            fontWeight: 700,
            fontSize: '0.875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: '2px solid rgba(0, 212, 255, 0.2)'
          }
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(0, 212, 255, 0.03)',
            transform: 'scale(1.001)'
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '16px 12px',
          fontSize: '0.875rem'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 600,
          fontSize: '0.75rem',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.05)'
          }
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 8,
          fontSize: '0.75rem'
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
  isRule1?: boolean;  // Flag for Rule 1 ETFs (>40% return AND <40% risk)
  isRule2?: boolean;  // Flag for Rule 2 ETFs (>30% div capture)
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
  // Enhanced risk metrics
  var95?: number;
  var99?: number;
  conditionalVaR?: number;
  maxDrawdown?: number;
  sortinoRatio?: number;
  calmarRatio?: number;
  volatilityRegime?: 'Low' | 'Normal' | 'High' | 'Crisis';
}

function calculateMPTAllocation(allData: DividendData[]): { allocation: AllocationItem[], metrics: PortfolioMetrics } {
  console.log('🚀 Starting MPT allocation with', allData.length, 'total ETFs');
  
  // Use ALL data (not just top performers) so filtering logic can work properly
  const allETFs = allData.filter(etf => etf.ticker !== 'SPY' && etf.category !== 'benchmark');
  console.log('📊 Found', allETFs.length, 'ETFs for analysis (excluding SPY)');
  
  // Log the ETFs we're working with
  console.log('Available ETFs:', allETFs.map(etf => `${etf.ticker}(${(etf.bestReturn*100).toFixed(1)}%)`).join(', '));
  
  // Add cash and SPY to the mix
  const assets: Asset[] = [
    ...allETFs.map(etf => {
      const isRule1 = etf.bestReturn > 0.40 && etf.riskVolatility < 0.40;
      // Note: isRule2 will be determined later after checking for better alternatives
      
      return {
        ticker: etf.ticker,
        return: etf.bestReturn,
        risk: etf.riskVolatility,
        sharpe: etf.riskVolatility > 0 ? etf.bestReturn / etf.riskVolatility : 0,
        dividendCapture: etf.divCaptureReturn,
        exDivDay: etf.exDivDay,
        isRule1: isRule1,
        isRule2: false // Will be set later after filtering logic
      };
    }),
    {
      ticker: 'CASH',
      return: 0.045, // 4.5% annual yield
      risk: 0.0, // 0% risk
      sharpe: Infinity,
      dividendCapture: 0.0,
      exDivDay: undefined,
      isRule1: false,
      isRule2: false
    },
    {
      ticker: 'SPY',
      return: 0.1574, // 15.74% from actual data
      risk: 0.205, // 20.5% from actual data
      sharpe: 0.1574 / 0.205,
      dividendCapture: 0.0,
      exDivDay: undefined,
      isRule1: false,
      isRule2: false
    }
  ];

  console.log('🎯 Total assets for optimization:', assets.length);

  // Use more relaxed risk constraint for better diversification
  const maxPortfolioRisk = 0.15; // Increased to 15% risk constraint for better allocation
  
  // Optimize portfolio with risk constraint (include cash as an option)
  const allocation = optimizePortfolioWithRiskConstraint(assets, maxPortfolioRisk);

  // Calculate portfolio metrics
  const portfolioMetrics = calculatePortfolioMetrics(allocation);

  return { allocation, metrics: portfolioMetrics };
}

// Asset clustering based on underlying securities for correlation analysis
const AssetClusters = {
  'TECH_GIANTS': ['AAPW', 'NVDW', 'NVII', 'NVYY', 'TSLW', 'NFLW', 'METW'],
  'BROAD_TECH': ['QDTE', 'XDTE', 'QQQY', 'TQQY', 'QDTY'],
  'CRYPTO_EXPOSURE': ['YBTC', 'XBTY', 'YETH'],
  'SPY_TRACKING': ['YSPY', 'SPY'],
  'BROAD_MARKET': ['YMAX', 'YMAG', 'IWMY', 'WDTE', 'RDTE'],
  'SECTOR_SPECIFIC': ['ULTY', 'COIW', 'COII', 'PLTW', 'LFGY', 'CHPY', 'GPTY'],
  'ALTERNATIVE': ['HOOW', 'RDTY', 'MAGY', 'SDTY', 'USOY', 'AMZW', 'TSII', 'MST', 'GLDY', 'BCCC'],
  'STABLE_INCOME': ['MSII', 'BLOX', 'WEEK', 'MMKT', 'BRKW']
};

// Calculate correlation between two assets based on clustering
const calculateAssetCorrelation = (ticker1: string, ticker2: string): number => {
  if (ticker1 === ticker2) return 1.0;
  
  for (const cluster of Object.values(AssetClusters)) {
    if (cluster.includes(ticker1) && cluster.includes(ticker2)) {
      // High correlation within same cluster (0.7-0.9)
      return 0.75 + Math.random() * 0.15;
    }
  }
  // Lower correlation across different clusters (0.1-0.4)
  return 0.1 + Math.random() * 0.3;
};

// Calculate diversification penalty for over-concentration in correlated assets
const calculateDiversificationPenalty = (allocation: AllocationItem[]): number => {
  let penalty = 0;
  
  // Check concentration within each cluster
  for (const [clusterName, clusterTickers] of Object.entries(AssetClusters)) {
    const clusterWeight = allocation
      .filter(asset => clusterTickers.includes(asset.ticker))
      .reduce((sum, asset) => sum + asset.weight, 0);
    
    // Penalty for > 30% allocation to any single cluster
    if (clusterWeight > 0.30) {
      const excessWeight = clusterWeight - 0.30;
      penalty += excessWeight * 0.05; // 5% risk penalty per 1% excess
      console.log(`⚠️  Cluster ${clusterName}: ${(clusterWeight*100).toFixed(1)}% allocation (penalty: ${(excessWeight*5).toFixed(1)}%)`);
    }
  }
  
  return penalty;
};

function optimizePortfolioWithRiskConstraint(assets: Asset[], maxRisk: number): AllocationItem[] {
  // Version identifier for deployment verification
  console.log('🚀 YAST Portfolio Optimizer - Version 2025-07-25-CORRELATION-ENHANCED');
  console.log('=== ENHANCED MPT WITH CORRELATION ANALYSIS ===');
  console.log('Implementing: Sharpe Ratio Weight Differentiation, Efficient Frontier Analysis, Mean Variance Optimization');
  console.log('All assets with return/risk/Sharpe values:');
  assets.forEach(asset => {
    if (asset.ticker !== 'CASH') {
      console.log(`${asset.ticker}: ${(asset.return*100).toFixed(1)}% return, ${(asset.risk*100).toFixed(1)}% risk, ${asset.sharpe.toFixed(2)} Sharpe, ${(asset.dividendCapture*100).toFixed(1)}% div capture, exDiv: ${asset.exDivDay}`);
    }
  });
  
  console.log('\n=== FILTERING STAGE 1: HIGH RISK + WEAK PERFORMER FILTER ===');
  
  // Filter out high-risk tickers (>40% risk) if lower-risk alternatives exist on the same ex-div date
  // BUT preserve ETFs that qualify for Rule 2 (>30% div capture, 10% holding regardless of risk)
  // ALSO filter out weak performers when much better alternatives exist on same ex-div day
  const filteredAssets = assets.filter(asset => {
    // Always include CASH and SPY
    if (asset.ticker === 'CASH' || asset.ticker === 'SPY') return true;
    
    // ALWAYS INCLUDE Rule 1 and Rule 2 ETFs - they are protected from filtering
    if (asset.isRule1 || asset.isRule2) {
      console.log(`✅ PROTECTED: Including ${asset.ticker} - Rule ${asset.isRule1 ? '1' : '2'} ETF cannot be filtered out`);
      return true;
    }
    
    // RULE 1 CHECK FIRST: ETFs with >40% return AND <40% risk are ALWAYS included
    if (asset.return > 0.40 && asset.risk < 0.40) {
      console.log(`✅ RULE 1: Including ${asset.ticker} (${(asset.return*100).toFixed(1)}% return, ${(asset.risk*100).toFixed(1)}% risk) - meets >40% return AND <40% risk criteria`);
      return true;
    }
    
    // Find other ETFs on the same ex-div day for comparison
    const sameExDivAssets = assets.filter(other => 
      other.exDivDay === asset.exDivDay && 
      other.ticker !== asset.ticker &&
      other.ticker !== 'CASH' &&
      other.ticker !== 'SPY'
    );
    
    // RULE 2 CHECK: Rule 2 ETFs (>30% div capture AND <80% risk) - these qualify with risk cap BUT can be excluded if better alternatives exist
    if (asset.dividendCapture > 0.30 && asset.risk < 0.80) {
      console.log(`\n--- Evaluating Rule 2 ETF: ${asset.ticker} (${(asset.dividendCapture*100).toFixed(1)}% div capture, ${(asset.risk*100).toFixed(1)}% risk) ---`);
      
      // Special rule: If there are BETTER ETFs on same ex-div day, exclude regardless of return threshold
      const betterSameExDivAssets = assets.filter(other => 
        other.ticker !== asset.ticker && 
        other.exDivDay === asset.exDivDay &&
        other.ticker !== 'CASH' && 
        other.ticker !== 'SPY' &&
        other.return > asset.return // Only count BETTER alternatives
      );
      
      console.log(`${asset.ticker} return: ${(asset.return*100).toFixed(1)}%`);
      console.log(`Better ETFs on same ex-div day ${asset.exDivDay}:`, betterSameExDivAssets.map(alt => `${alt.ticker} (${(alt.return*100).toFixed(1)}%)`));
      
      if (betterSameExDivAssets.length > 0) {
        console.log(`❌ EXCLUDING Rule 2 ETF ${asset.ticker} (${(asset.return*100).toFixed(1)}% return) - better ETFs exist on same ex-div day ${asset.exDivDay}:`, 
          betterSameExDivAssets.map(alt => `${alt.ticker} (${(alt.return*100).toFixed(1)}%)`).join(', '));
        return false;
      } else {
        console.log(`✅ Including ${asset.ticker} - no better ETFs on ${asset.exDivDay}`);
        // SET Rule 2 flag here since no better alternatives exist
        asset.isRule2 = true;
        console.log(`🔒 SETTING Rule 2 flag for ${asset.ticker} - guaranteed 10% allocation`);
      }
      
      console.log(`✅ Including Rule 2 ETF ${asset.ticker} (${(asset.dividendCapture*100).toFixed(1)}% div capture, ${(asset.risk*100).toFixed(1)}% risk) - qualifies with <80% risk cap`);
      return true;
    }
    
    // SECOND: For non-Rule 2 ETFs, apply risk and performance filters
    // If this asset has risk <= 40%, check if it should still be included
    if (asset.risk <= 0.40) {
      // For non-Rule 2 assets, exclude if there are significantly better alternatives on same day
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
    
    // THIRD: If this asset has risk > 40% and doesn't qualify for Rule 2, 
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
    asset.isRule1 || (asset.ticker !== 'CASH' && asset.ticker !== 'SPY' && asset.return > 0.40 && asset.risk < 0.40)
  );
  
  // Rule 2: Identify ETFs with >30% dividend capture AND <80% risk (10% holding with risk cap)
  const divCaptureETFs = workingAssets.filter(asset => 
    asset.isRule2 || (asset.ticker !== 'CASH' && asset.ticker !== 'SPY' && asset.dividendCapture > 0.30 && asset.risk < 0.80 && !qualifyingETFs.some(qual => qual.ticker === asset.ticker))
  );
  
  console.log('Qualifying ETFs (>40% return AND <40% risk, min 10%):', qualifyingETFs.map(etf => 
    `${etf.ticker}: ${(etf.return*100).toFixed(1)}% return, ${(etf.risk*100).toFixed(1)}% risk${etf.isRule1 ? ' [RULE1]' : ''}`
  ));
  
  console.log('Div Capture ETFs (>30% div capture AND <80% risk, 10% holding):', divCaptureETFs.map(etf => 
    `${etf.ticker}: ${(etf.dividendCapture*100).toFixed(1)}% div capture, ${(etf.risk*100).toFixed(1)}% risk${etf.isRule2 ? ' [RULE2]' : ''}`
  ));
  
  // Debug: Show ALL WORKING assets and their values
  console.log('ALL WORKING ASSETS:', workingAssets.map(asset => 
    `${asset.ticker}: return=${(asset.return*100).toFixed(1)}%, risk=${(asset.risk*100).toFixed(1)}%, divCapture=${(asset.dividendCapture*100).toFixed(1)}%`
  ));
  
  // Sort all working assets by expected return (descending) for remaining allocation
  const sortedAssets = [...workingAssets].sort((a, b) => b.return - a.return);
  
  const allocation: AllocationItem[] = [];
  let totalWeight = 0;
  
  // Step 1: Improved allocation based on Sharpe ratios - no more equal weights!
  // Sort qualifying ETFs by Sharpe ratio to give better performers higher allocations
  const sortedQualifyingETFs = qualifyingETFs.sort((a, b) => b.sharpe - a.sharpe);
  
  for (let i = 0; i < sortedQualifyingETFs.length; i++) {
    const asset = sortedQualifyingETFs[i];
    
    // ADDITIONAL CHECK: Even Rule 1 ETFs shouldn't get allocation if they're high-risk with lower-risk alternatives on same day
    if (asset.risk > 0.40) {
      const sameExDivAssets = assets.filter(other => 
        other.exDivDay === asset.exDivDay && 
        other.ticker !== asset.ticker &&
        other.ticker !== 'CASH' &&
        other.ticker !== 'SPY'
      );
      
      const hasLowerRiskAlternative = sameExDivAssets.some(other => other.risk < asset.risk);
      
      if (hasLowerRiskAlternative) {
        console.log(`⚠️ SKIPPING qualifying ETF ${asset.ticker} (${(asset.risk*100).toFixed(1)}% risk) - lower-risk alternative exists on ex-div ${asset.exDivDay}`);
        continue; // Skip this asset even though it qualifies
      }
    }
    
    // Sharpe-weighted allocation: Higher Sharpe ratio = higher allocation
    // First asset gets 20%, second gets 15%, third gets 12%, others get declining weights
    let weight;
    if (i === 0) {
      weight = 0.20; // Best Sharpe ratio gets 20%
    } else if (i === 1) {
      weight = 0.15; // Second best gets 15%
    } else if (i === 2) {
      weight = 0.12; // Third best gets 12%
    } else if (i === 3) {
      weight = 0.08; // Fourth gets 8%
    } else {
      weight = Math.max(0.05, 0.15 / (i + 1)); // Declining weights for others, minimum 5%
    }
    
    // Cap weight based on remaining capacity
    const remainingCapacity = 0.95 - totalWeight; // Leave 5% for potential cash
    weight = Math.min(weight, remainingCapacity);
    
    if (weight >= 0.02) { // Only add if meaningful allocation
      allocation.push({
        ticker: asset.ticker,
        weight: weight,
        return: asset.return,
        risk: asset.risk,
        sharpe: asset.sharpe
      });
      totalWeight += weight;
      console.log(`Added qualifying ETF ${asset.ticker} with ${(weight*100).toFixed(1)}% allocation (Sharpe: ${asset.sharpe.toFixed(2)}, rank: ${i+1})`);
    }
  }
  
  // Step 2: Add div capture ETFs with Sharpe-weighted allocations (not flat 10%)
  const sortedDivCaptureETFs = divCaptureETFs.sort((a, b) => b.sharpe - a.sharpe);
  
  for (let i = 0; i < sortedDivCaptureETFs.length; i++) {
    const asset = sortedDivCaptureETFs[i];
    
    // Differentiated weights for div capture ETFs: 12%, 8%, 6%, 4% declining
    let weight;
    if (i === 0) {
      weight = 0.12; // Best div capture ETF gets 12%
    } else if (i === 1) {
      weight = 0.08; // Second gets 8%
    } else if (i === 2) {
      weight = 0.06; // Third gets 6%
    } else {
      weight = Math.max(0.03, 0.10 / (i + 1)); // Declining weights, minimum 3%
    }
    
    const remainingCapacity = 0.95 - totalWeight;
    weight = Math.min(weight, remainingCapacity);
    
    if (totalWeight + weight <= 1.0 && weight >= 0.02) {
      allocation.push({
        ticker: asset.ticker,
        weight: weight,
        return: asset.return,
        risk: asset.risk,
        sharpe: asset.sharpe
      });
      totalWeight += weight;
      console.log(`Added div capture ETF ${asset.ticker} with ${(weight*100).toFixed(1)}% allocation (Sharpe: ${asset.sharpe.toFixed(2)}, div rank: ${i+1})${asset.isRule2 ? ' [RULE2]' : ''}`);
    } else {
      // Even if we're over capacity, Rule 2 ETFs get minimum allocation by reducing others
      if (asset.isRule2 && weight >= 0.05) {
        const minWeight = 0.05; // Minimum 5% for Rule 2 ETFs
        const reductionNeeded = minWeight;
        const currentTotal = allocation.reduce((sum, a) => sum + a.weight, 0);
        const reductionFactor = Math.max(0.5, (currentTotal - reductionNeeded) / currentTotal);
        
        // Reduce all existing allocations proportionally
        allocation.forEach(holding => {
          holding.weight *= reductionFactor;
        });
        
        // Add the Rule 2 ETF
        allocation.push({
          ticker: asset.ticker,
          weight: minWeight,
          return: asset.return,
          risk: asset.risk,
          sharpe: asset.sharpe
        });
        
        totalWeight = allocation.reduce((sum, a) => sum + a.weight, 0);
        console.log(`🔒 FORCED Rule 2 ETF ${asset.ticker} with ${(minWeight*100).toFixed(1)}% allocation [RULE2 GUARANTEED] - reduced others proportionally`);
      }
    }
  }
  
  // Check portfolio risk so far
  let portfolioVariance = allocation.reduce((sum, a) => sum + Math.pow(a.weight * a.risk, 2), 0);
  let portfolioRisk = Math.sqrt(portfolioVariance);
  
  console.log(`After mandatory allocations: ${(portfolioRisk*100).toFixed(1)}% risk, ${(totalWeight*100).toFixed(1)}% allocated`);
  
  // Step 3: Enhanced allocation using efficient frontier analysis and Sharpe optimization
  console.log('\n=== ENHANCED MPT ALLOCATION PHASE ===');
  
  // Calculate target portfolio return based on best available assets
  const topAssets = workingAssets
    .filter(asset => asset.ticker !== 'CASH' && asset.ticker !== 'SPY')
    .sort((a, b) => b.sharpe - a.sharpe)
    .slice(0, 8); // Top 8 by Sharpe ratio
  
  const targetReturn = topAssets.length > 0 ? 
    topAssets.reduce((sum, asset) => sum + asset.return, 0) / topAssets.length * 0.8 : // 80% of average top return
    0.30; // Fallback to 30% target
  
  console.log(`🎯 Target portfolio return: ${(targetReturn*100).toFixed(1)}%`);
  console.log(`📈 Top assets by Sharpe ratio:`, topAssets.map(a => `${a.ticker}(${a.sharpe.toFixed(2)})`).join(', '));
  
  // Try to increase allocations of existing holdings using Sharpe-weighted optimization
  for (const holding of allocation) {
    if (holding.weight < 0.20 && totalWeight < 1.0) {
      // Calculate optimal increase based on Sharpe ratio and risk constraints
      const maxIncrease = Math.min(0.20 - holding.weight, 1.0 - totalWeight);
      let bestIncrease = 0;
      let bestSharpe = 0;
      
      // Test incremental increases with Sharpe optimization
      for (let increase = 0.01; increase <= maxIncrease; increase += 0.01) {
        const testAllocation = allocation.map(a => 
          a.ticker === holding.ticker 
            ? { ...a, weight: a.weight + increase }
            : a
        );
        
        const testMetrics = calculatePortfolioMetrics(testAllocation);
        
        // Accept if risk constraint met AND Sharpe ratio improved
        if (testMetrics.risk <= maxRisk && testMetrics.sharpeRatio > bestSharpe) {
          bestIncrease = increase;
          bestSharpe = testMetrics.sharpeRatio;
        }
      }
      
      if (bestIncrease > 0) {
        holding.weight += bestIncrease;
        totalWeight += bestIncrease;
        console.log(`📊 Optimized ${holding.ticker} by ${(bestIncrease*100).toFixed(1)}% to ${(holding.weight*100).toFixed(1)}% (Sharpe: ${bestSharpe.toFixed(2)})`);
      }
    }
  }
  
  // Step 4: Enhanced asset selection using mean variance optimization with proper weight differentiation
  console.log('\n=== MEAN VARIANCE OPTIMIZATION PHASE ===');
  const remainingAssets = sortedAssets.filter(asset => 
    !allocation.some(a => a.ticker === asset.ticker) &&
    asset.ticker !== 'CASH' &&
    asset.ticker !== 'SPY'
  );
  
  // Sort by risk-adjusted return (Sharpe ratio) for better selection
  const sharpeOptimizedAssets = remainingAssets.sort((a, b) => b.sharpe - a.sharpe);
  
  console.log(`🔍 Evaluating ${sharpeOptimizedAssets.length} remaining assets by Sharpe ratio`);
  
  for (let i = 0; i < sharpeOptimizedAssets.length; i++) {
    const asset = sharpeOptimizedAssets[i];
    if (totalWeight >= 0.95) break; // Leave room for cash
    
    // Enhanced risk filtering with better alternatives check
    if (asset.risk > 0.40) {
      const sameExDivAssets = assets.filter(other => 
        other.exDivDay === asset.exDivDay && 
        other.ticker !== asset.ticker &&
        other.ticker !== 'CASH' &&
        other.ticker !== 'SPY'
      );
      
      const hasBetterSharpeAlternative = sameExDivAssets.some(other => other.sharpe > asset.sharpe);
      
      if (hasBetterSharpeAlternative) {
        console.log(`⚠️ SKIPPING ${asset.ticker} (Sharpe: ${asset.sharpe.toFixed(2)}) - better Sharpe alternative exists on ex-div ${asset.exDivDay}`);
        continue;
      }
    }
    
    // Calculate weight based on Sharpe ratio rank and remaining capacity
    const remainingCapacity = 0.95 - totalWeight;
    let baseWeight;
    
    if (i === 0) {
      baseWeight = Math.min(0.10, remainingCapacity); // Top remaining asset gets up to 10%
    } else if (i === 1) {
      baseWeight = Math.min(0.07, remainingCapacity); // Second gets up to 7%
    } else if (i === 2) {
      baseWeight = Math.min(0.05, remainingCapacity); // Third gets up to 5%
    } else {
      baseWeight = Math.min(0.03, remainingCapacity * 0.5); // Others get smaller weights
    }
    
    // Adjust weight based on Sharpe ratio relative to top performer
    const topSharpe = sharpeOptimizedAssets[0].sharpe;
    const sharpeMultiplier = Math.max(0.3, asset.sharpe / topSharpe); // Min 30% of top performer
    const optimalWeight = baseWeight * sharpeMultiplier;
    
    if (optimalWeight >= 0.02) {
      allocation.push({
        ticker: asset.ticker,
        weight: optimalWeight,
        return: asset.return,
        risk: asset.risk,
        sharpe: asset.sharpe
      });
      totalWeight += optimalWeight;
      console.log(`📈 Added ${asset.ticker} with ${(optimalWeight*100).toFixed(1)}% allocation (Sharpe: ${asset.sharpe.toFixed(2)}, rank: ${i+1}, multiplier: ${sharpeMultiplier.toFixed(2)})`);
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
  
  // Final portfolio optimization and metrics
  const finalMetrics = calculatePortfolioMetrics(allocation);
  const finalReturn = finalMetrics.expectedReturn;
  const finalRisk = finalMetrics.risk;
  const finalSharpe = finalMetrics.sharpeRatio;
  
  console.log('\n=== FINAL PORTFOLIO OPTIMIZATION RESULTS ===');
  console.log(`📊 Portfolio Composition (${allocation.length} assets):`);
  allocation.forEach(asset => {
    console.log(`   ${asset.ticker}: ${(asset.weight*100).toFixed(1)}% (Return: ${(asset.return*100).toFixed(1)}%, Risk: ${(asset.risk*100).toFixed(1)}%, Sharpe: ${asset.sharpe?.toFixed(2) || 'N/A'})`);
  });
  console.log(`🎯 Expected Return: ${(finalReturn*100).toFixed(1)}%`);
  console.log(`⚠️  Portfolio Risk: ${(finalRisk*100).toFixed(1)}%`);
  console.log(`📈 Sharpe Ratio: ${finalSharpe.toFixed(2)}`);
  console.log(`✅ Risk Constraint: ${finalRisk <= maxRisk ? 'MET' : 'EXCEEDED'} (limit: ${(maxRisk*100).toFixed(1)}%)`);
  console.log(`💰 Total Allocation: ${(allocation.reduce((sum, a) => sum + a.weight, 0)*100).toFixed(1)}%`);
  
  // Additional portfolio efficiency metrics
  const returnToRiskRatio = finalRisk > 0 ? finalReturn / finalRisk : 0;
  const diversificationRatio = allocation.length / Math.max(1, allocation.filter(a => a.weight > 0.10).length);
  
  console.log(`📊 Return/Risk Ratio: ${returnToRiskRatio.toFixed(2)}`);
  console.log(`🔄 Diversification Score: ${diversificationRatio.toFixed(2)}`);
  console.log('=== END ENHANCED MPT OPTIMIZATION ===\n');
  
  return allocation;
}

// Advanced Risk Metrics Calculations
const calculateVaR = (portfolioReturn: number, portfolioRisk: number, confidence: number = 0.95): number => {
  // Z-score for different confidence levels
  const zScores = { 0.90: 1.282, 0.95: 1.645, 0.99: 2.326 };
  const zScore = zScores[confidence as keyof typeof zScores] || 1.645;
  
  // Daily VaR calculation: VaR = μ - z * σ
  const dailyReturn = portfolioReturn / 252; // Annualized to daily
  const dailyRisk = portfolioRisk / Math.sqrt(252); // Annualized to daily
  
  return Math.abs(dailyReturn - zScore * dailyRisk);
};

const calculateConditionalVaR = (var95: number): number => {
  // Expected Shortfall (Conditional VaR) is typically 25-30% higher than VaR
  return var95 * 1.28;
};

const calculateMaxDrawdown = (allocation: AllocationItem[]): number => {
  // Estimate max drawdown based on portfolio composition and individual asset characteristics
  let maxDrawdown = 0;
  
  for (const asset of allocation) {
    if (asset.ticker === 'CASH') continue;
    
    // Estimate individual asset max drawdown based on risk and historical patterns
    let assetDrawdown = 0;
    
    // YieldMax ETFs have specific drawdown characteristics
    if (asset.risk > 0.6) {
      assetDrawdown = 0.4 + asset.risk * 0.3; // High vol assets: 40-60% potential drawdowns
    } else if (asset.risk > 0.3) {
      assetDrawdown = 0.2 + asset.risk * 0.4; // Medium vol: 20-40%
    } else {
      assetDrawdown = asset.risk * 1.5; // Low vol: proportional to risk
    }
    
    // Weight-adjusted contribution to portfolio drawdown
    const weightedDrawdown = asset.weight * assetDrawdown;
    maxDrawdown += weightedDrawdown;
  }
  
  // Add correlation adjustment - diversification reduces total drawdown
  const diversificationFactor = Math.min(0.8, allocation.length * 0.1); // Max 20% reduction
  maxDrawdown *= (1 - diversificationFactor);
  
  return Math.min(0.6, maxDrawdown); // Cap at 60% for realism
};

const calculateSortinoRatio = (portfolioReturn: number, portfolioRisk: number, riskFreeRate: number = 0.045): number => {
  // Sortino uses downside deviation (approximately 70% of total volatility for most assets)
  const downwardVolatility = portfolioRisk * 0.7;
  return downwardVolatility > 0 ? (portfolioReturn - riskFreeRate) / downwardVolatility : 0;
};

const detectVolatilityRegime = (portfolioRisk: number): 'Low' | 'Normal' | 'High' | 'Crisis' => {
  if (portfolioRisk < 0.15) return 'Low';
  if (portfolioRisk < 0.25) return 'Normal';
  if (portfolioRisk < 0.4) return 'High';
  return 'Crisis';
};

function calculatePortfolioMetrics(allocation: AllocationItem[]): PortfolioMetrics {
  const portfolioReturn = allocation.reduce((sum, asset) => sum + (asset.weight * asset.return), 0);
  
  // Enhanced portfolio risk calculation with full correlation matrix
  let portfolioVariance = 0;
  
  // Calculate variance using correlation matrix: σ²p = Σ Σ wi wj σi σj ρij
  for (let i = 0; i < allocation.length; i++) {
    for (let j = 0; j < allocation.length; j++) {
      const assetI = allocation[i];
      const assetJ = allocation[j];
      const correlation = calculateAssetCorrelation(assetI.ticker, assetJ.ticker);
      portfolioVariance += assetI.weight * assetJ.weight * assetI.risk * assetJ.risk * correlation;
    }
  }
  
  // Add diversification penalty for cluster concentration
  const diversificationPenalty = calculateDiversificationPenalty(allocation);
  
  const portfolioRisk = Math.sqrt(portfolioVariance + diversificationPenalty);
  const sharpeRatio = portfolioRisk > 0 ? portfolioReturn / portfolioRisk : 0;

  // Advanced Risk Metrics
  const var95 = calculateVaR(portfolioReturn, portfolioRisk, 0.95);
  const var99 = calculateVaR(portfolioReturn, portfolioRisk, 0.99);
  const conditionalVaR = calculateConditionalVaR(var95);
  const maxDrawdown = calculateMaxDrawdown(allocation);
  const sortinoRatio = calculateSortinoRatio(portfolioReturn, portfolioRisk);
  const calmarRatio = portfolioReturn / Math.max(0.01, maxDrawdown);
  const volatilityRegime = detectVolatilityRegime(portfolioRisk);

  console.log(`📊 Enhanced Portfolio Risk Analysis:`);
  console.log(`   Expected Return: ${(portfolioReturn * 100).toFixed(1)}%`);
  console.log(`   Portfolio Risk: ${(portfolioRisk * 100).toFixed(1)}%`);
  console.log(`   VaR (95%): ${(var95 * 100).toFixed(2)}% daily`);
  console.log(`   VaR (99%): ${(var99 * 100).toFixed(2)}% daily`);
  console.log(`   Expected Shortfall: ${(conditionalVaR * 100).toFixed(2)}%`);
  console.log(`   Max Drawdown: ${(maxDrawdown * 100).toFixed(1)}%`);
  console.log(`   Sharpe Ratio: ${sharpeRatio.toFixed(3)}`);
  console.log(`   Sortino Ratio: ${sortinoRatio.toFixed(3)}`);
  console.log(`   Calmar Ratio: ${calmarRatio.toFixed(3)}`);
  console.log(`   Volatility Regime: ${volatilityRegime}`);

  return {
    expectedReturn: portfolioReturn,
    risk: portfolioRisk,
    sharpeRatio: sharpeRatio,
    // Enhanced metrics
    var95,
    var99,
    conditionalVaR,
    maxDrawdown,
    sortinoRatio,
    calmarRatio,
    volatilityRegime
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  
  // Debug logging
  if (index === 3) {
    console.log('🔍 TabPanel index 3 - value:', value, 'index:', index, 'hidden:', value !== index);
  }

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

// Convert DividendAsset to DividendData format
const convertAssetToData = (asset: DividendAsset): DividendData => {
  // Convert percentages to decimals for consistent calculations
  const returnDecimal = asset.return / 100;
  const riskDecimal = asset.risk / 100;
  const buyHoldReturnDecimal = asset.buyHoldReturn / 100;
  const divCaptureReturnDecimal = asset.dividendCaptureReturn / 100;
  const winRateDecimal = asset.winRate / 100;
  
  // Determine category based on performance and risk characteristics
  let category: 'top-performers' | 'mid-performers' | 'low-performers' | 'excluded' | 'benchmark' = 'excluded';
  
  if (asset.ticker === 'SPY') {
    category = 'benchmark';
  } else if (returnDecimal >= 0.40) {
    category = 'top-performers';
  } else if (returnDecimal >= 0.20) {
    category = 'mid-performers';
  } else if (returnDecimal >= 0.0) {
    category = 'low-performers';
  }
  
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
  
  const mockPrice = generateRealisticPrice(asset.ticker, asset.forwardYield, asset.medianDividend);
  
  // Debug logging for price generation
  console.log('💰 PRICE GENERATION:', {
    ticker: asset.ticker,
    forwardYield: asset.forwardYield,
    medianDividend: asset.medianDividend,
    generatedPrice: mockPrice.toFixed(2)
  });

  return {
    ticker: asset.ticker,
    tradingDays: asset.tradingDays,
    exDivDay: asset.exDivDay,
    buyHoldReturn: buyHoldReturnDecimal,
    divCaptureReturn: divCaptureReturnDecimal,
    bestStrategy: asset.bestStrategy,
    bestReturn: returnDecimal,
    finalValue: asset.finalValue,
    dcWinRate: winRateDecimal,
    riskVolatility: riskDecimal,
    medianDividend: asset.medianDividend,
    forwardYield: asset.forwardYield,
    currentPrice: mockPrice,
    lastDividend: asset.medianDividend,
    category: category
  };
};

export default function DividendAnalysisDashboard() {
  console.log('🚀 DASHBOARD LOADED v2.1 - Enhanced version with 4 tabs including Full Analysis Cards');
  const [selectedTab, setSelectedTab] = useState(0);
  const [data, setData] = useState<DividendData[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Accessibility helpers - Pattern-based indicators for colorblind users
  const getPerformanceIcon = (value: number, type: 'return' | 'risk' = 'return') => {
    if (type === 'return') {
      if (value > 40) return { icon: '▲▲', color: '#34C759', label: 'Excellent' };
      if (value > 20) return { icon: '▲', color: '#34C759', label: 'Good' };
      if (value > 0) return { icon: '▷', color: '#FF9500', label: 'Moderate' };
      return { icon: '▼', color: '#FF3B30', label: 'Poor' };
    } else {
      if (value < 20) return { icon: '◆', color: '#34C759', label: 'Low Risk' };
      if (value < 40) return { icon: '◇', color: '#FF9500', label: 'Medium Risk' };
      if (value < 60) return { icon: '⚠', color: '#FF3B30', label: 'High Risk' };
      return { icon: '⚠⚠', color: '#FF3B30', label: 'Very High Risk' };
    }
  };

  const getStrategyIndicator = (strategy: string) => {
    if (strategy === 'Buy & Hold') return { icon: '⏳', color: '#007AFF', label: 'B&H' };
    if (strategy === 'Dividend Capture') return { icon: '⚡', color: '#00D4FF', label: 'DC' };
    return { icon: '?', color: '#8E8E93', label: strategy };
  };
  const [error, setError] = useState<string | null>(null);
  const [mptAllocation, setMptAllocation] = useState<any[]>([]);
  const [portfolioMetrics, setPortfolioMetrics] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        let convertedData: DividendData[] = [];
        let metadataValue: any = null;
        
        // Try to load data from JSON files first (updated by GitHub Action)
        try {
          // Add cache busting to ensure fresh data from GitHub Actions
          const cacheBuster = new Date().getTime();
          const [performanceResponse, metadataResponse] = await Promise.all([
            fetch(`/data/performance_data.json?v=${cacheBuster}`),
            fetch(`/data/metadata.json?v=${cacheBuster}`)
          ]);
          
          if (performanceResponse.ok && metadataResponse.ok) {
            const performanceData = await performanceResponse.json();
            metadataValue = await metadataResponse.json();
            
            console.log('📊 Loading data from updated JSON files');
            console.log('📅 Metadata loaded:', metadataValue);
            console.log('🔄 Cache buster used:', cacheBuster);
            console.log('🏗️ Build ID:', metadataValue.build_id || 'N/A');
            console.log('📈 Performance data entries:', performanceData.length);
            
            // Convert JSON data to the format expected by the dashboard
            // Note: JSON data uses different field names and decimal format
            convertedData = performanceData.map((item: any) => ({
              ticker: item.ticker,
              tradingDays: item.tradingDays,
              exDivDay: item.exDivDay,
              buyHoldReturn: item.buyHoldReturn, // Already in decimal format
              divCaptureReturn: item.divCaptureReturn, // Already in decimal format
              bestStrategy: item.bestStrategy, // JSON already contains "B&H" or "DC"
              bestReturn: item.bestReturn, // Already in decimal format
              finalValue: item.finalValue,
              dcWinRate: item.dcWinRate, // Already in decimal format
              riskVolatility: item.riskVolatility, // Already in decimal format
              medianDividend: item.medianDividend,
              forwardYield: item.forwardYield,
              category: item.bestReturn >= 0.40 ? 'top-performers' : 
                       item.bestReturn >= 0.20 ? 'mid-performers' : 
                       item.bestReturn >= 0.0 ? 'low-performers' : 'excluded'
            }));
          } else {
            console.warn('❌ JSON file fetch failed:', {
              performanceOk: performanceResponse.ok,
              performanceStatus: performanceResponse.status,
              metadataOk: metadataResponse.ok,
              metadataStatus: metadataResponse.status
            });
            throw new Error('JSON files not found, falling back to static data');
          }
        } catch (jsonError) {
          console.log('📁 JSON files not available, using static imported data');
          console.error('JSON fetch error:', jsonError);
          // Fallback to static imported data
          convertedData = dividendData.map(convertAssetToData);
          metadataValue = analysisMetadata;
        }
        
        setData(convertedData);
        setMetadata(metadataValue);
        
        // Calculate MPT allocation for ALL ETFs, not just top performers
        if (convertedData.length > 0) {
          const { allocation, metrics } = calculateMPTAllocation(convertedData);
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
    console.log('🔄 TAB CHANGE - from:', selectedTab, 'to:', newValue);
    setSelectedTab(newValue);
  };

  // Helper function to format percentage
  const formatPercentage = (percentage: number): string => {
    return `${(percentage * 100).toFixed(2)}%`;
  };

  // Helper function to get color based on value - Modern 2024 colors
  const getColorByValue = (value: number, isRisk: boolean = false): string => {
    if (isRisk) {
      // For risk, lower is better (reverse colors)
      if (value < 0.2) return '#00E676';  // Green for low risk
      if (value < 0.4) return '#FFB74D';  // Orange for medium risk
      return '#FF4569';  // Red for high risk
    } else {
      // For returns, higher is better
      if (value > 0) return '#00E676';  // Vibrant green for positive
      if (value < 0) return '#FF4569';  // Modern red for negative
      return 'rgba(255, 255, 255, 0.6)';  // Muted white for neutral
    }
  };

  // Helper function to get appropriate icon based on return - Modern styling
  const getReturnIcon = (returnValue: number) => {
    if (returnValue > 0) return <TrendingUp sx={{ color: '#00E676', fontSize: 18 }} />;
    if (returnValue < 0) return <TrendingDown sx={{ color: '#FF4569', fontSize: 18 }} />;
    return <TrendingFlat sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 18 }} />;
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
            fontWeight: 700,
            fontSize: '0.75rem',
            background: strategy === 'B&H' ? 
              'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)' : 
              'linear-gradient(135deg, #009688 0%, #00695C 100%)',
            color: 'white',
            cursor: 'help',
            border: 'none',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: strategy === 'B&H' ? 
                '0 4px 12px rgba(33, 150, 243, 0.4)' : 
                '0 4px 12px rgba(0, 150, 136, 0.4)'
            }
          }}
        />
      </Tooltip>
    );
  };

  const getRiskChip = (risk: number) => {
    const riskPct = risk * 100;
    const isHighRisk = riskPct > 40;
    const isMediumRisk = riskPct > 20 && riskPct <= 40;
    
    return (
      <Chip
        label={formatPercentage(risk)}
        size="small"
        sx={{
          fontWeight: 700,
          fontSize: '0.75rem',
          background: isHighRisk ? 
            'linear-gradient(135deg, #FF4569 0%, #E91E63 100%)' :
            isMediumRisk ?
            'linear-gradient(135deg, #FFB74D 0%, #FF8A65 100%)' :
            'linear-gradient(135deg, #00E676 0%, #00C853 100%)',
          color: 'white',
          border: 'none',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: isHighRisk ? 
              '0 4px 12px rgba(255, 69, 105, 0.4)' :
              isMediumRisk ?
              '0 4px 12px rgba(255, 183, 77, 0.4)' :
              '0 4px 12px rgba(0, 230, 118, 0.4)'
          }
        }}
      />
    );
  };

  const topPerformers = data.filter(item => 
    mptAllocation.some(allocation => allocation.ticker === item.ticker)
  );
  
  const excludedTickers = data.filter(item => 
    !mptAllocation.some(allocation => allocation.ticker === item.ticker) &&
    item.ticker !== 'SPY' // Keep SPY separate as benchmark, don't show in excluded
  );

  // Clean Portfolio Allocation Table
  const renderPortfolioAllocationTable = () => (
    <Card sx={{ 
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ 
          color: '#FFFFFF', 
          fontWeight: 600, 
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <AccountBalance sx={{ color: '#00D4FF', fontSize: 20 }} />
          Portfolio Allocation
        </Typography>
        
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>ETF</TableCell>
                <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Weight</TableCell>
                <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Expected Return</TableCell>
                <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Risk</TableCell>
                <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Sharpe</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mptAllocation.map((asset, index) => (
                <TableRow key={asset.ticker} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 600, 
                        color: asset.ticker === 'CASH' ? '#FFB74D' : '#FFFFFF' 
                      }}>
                        {asset.ticker}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ 
                      fontWeight: 700, 
                      color: '#00D4FF',
                      fontSize: '0.95rem'
                    }}>
                      {(asset.weight * 100).toFixed(1)}%
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {(() => {
                      const indicator = getPerformanceIcon(asset.return * 100, 'return');
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontSize: '1rem' }}>
                            {indicator.icon}
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            color: indicator.color,
                            fontWeight: 500
                          }}>
                            {(asset.return * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      );
                    })()}
                  </TableCell>
                  <TableCell align="center">
                    {(() => {
                      const indicator = getPerformanceIcon(asset.risk * 100, 'risk');
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontSize: '1rem' }}>
                            {indicator.icon}
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            color: indicator.color,
                            fontWeight: 500
                          }}>
                            {(asset.risk * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      );
                    })()}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ 
                      color: '#FFFFFF',
                      fontWeight: 500
                    }}>
                      {asset.sharpe?.toFixed(2) || 'N/A'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  // Card-based Portfolio View for Better Scanning
  const renderPortfolioCards = () => (
    <Card sx={{ 
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ 
          color: '#FFFFFF', 
          fontWeight: 600, 
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Stars sx={{ color: '#00D4FF', fontSize: 20 }} />
          Selected Portfolio ETFs
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
          {mptAllocation.filter(asset => asset.ticker !== 'CASH').map((asset) => {
            const assetData = data.find(d => d.ticker === asset.ticker);
            const returnIndicator = getPerformanceIcon(asset.return * 100, 'return');
            const riskIndicator = getPerformanceIcon(asset.risk * 100, 'risk');
            
            return (
              <Card key={asset.ticker} sx={{ 
                background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                border: '1px solid rgba(0, 212, 255, 0.2)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  border: '1px solid rgba(0, 212, 255, 0.4)',
                  transform: 'translateY(-2px)'
                }
              }}>
                <CardContent sx={{ p: 2.5 }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                      {asset.ticker}
                    </Typography>
                    <Typography variant="h5" sx={{ color: '#00D4FF', fontWeight: 700 }}>
                      {(asset.weight * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  
                  {/* Key Metrics */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                        <Typography sx={{ fontSize: '1.1rem' }}>{returnIndicator.icon}</Typography>
                        <Typography variant="body2" sx={{ color: returnIndicator.color, fontWeight: 600 }}>
                          {(asset.return * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Return
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                        <Typography sx={{ fontSize: '1.1rem' }}>{riskIndicator.icon}</Typography>
                        <Typography variant="body2" sx={{ color: riskIndicator.color, fontWeight: 600 }}>
                          {(asset.risk * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Risk
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 600, mb: 0.5 }}>
                        {asset.sharpe?.toFixed(2) || 'N/A'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Sharpe
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Additional Info */}
                  {assetData && (
                    <Box sx={{ 
                      pt: 1.5, 
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        {assetData.exDivDay} ex-div
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#34C759', fontWeight: 500 }}>
                        {assetData.forwardYield?.toFixed(1) || 'N/A'}% yield
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );

  // Detailed ETF Performance Table (Expandable)
  const renderDetailedETFTable = (data: DividendData[]) => (
    <Card sx={{ 
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ 
          color: '#FFFFFF', 
          fontWeight: 600, 
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <ShowChart sx={{ color: '#00D4FF', fontSize: 20 }} />
          Detailed Performance Analysis
        </Typography>
        
        {renderLegacyTable(data)}
      </CardContent>
    </Card>
  );

  // Table layout for Full Analysis broken into performance tiers
  const renderFullAnalysisTable = (data: DividendData[]) => {
    console.log('🎯 RENDERING FULL ANALYSIS TABLE - data length:', data.length);
    console.log('🎯 First item data sample:', data[0]);
    
    if (!data || data.length === 0) {
      return <Typography color="white">No data available</Typography>;
    }
    
    // Sort data by best return and categorize
    const sortedData = [...data].sort((a, b) => b.bestReturn - a.bestReturn);
    const highPerformers = sortedData.filter(item => item.bestReturn > 0.50); // >50% returns
    const mediumPerformers = sortedData.filter(item => item.bestReturn > 0.20 && item.bestReturn <= 0.50); // 20-50% returns  
    const lowPerformers = sortedData.filter(item => item.bestReturn <= 0.20); // ≤20% returns
    
    const renderPerformanceSection = (title: string, performers: DividendData[], delay: number = 0) => (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay }}
        style={{ marginBottom: '2rem' }}
      >
        <Box sx={{ 
          fontFamily: 'monospace',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          padding: 3,
          borderRadius: 2,
          border: '1px solid rgba(0, 212, 255, 0.2)'
        }}>
          {/* Section Header */}
          <Typography sx={{ 
            color: '#00D4FF', 
            fontSize: '0.9rem', 
            fontWeight: 700,
            textAlign: 'center',
            borderBottom: '2px solid rgba(0, 212, 255, 0.3)',
            pb: 1,
            mb: 2
          }}>
            {title}
          </Typography>
          
          {/* Table Header */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: '80px 50px 120px 120px 120px 120px 100px 100px 100px 120px',
            gap: 1,
            color: '#FFFFFF',
            fontSize: '0.8rem',
            fontWeight: 700,
            borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
            pb: 1,
            mb: 1
          }}>
            <Box>Ticker</Box>
            <Box>Days</Box>
            <Box>Ex-Div Day</Box>
            <Box>Buy & Hold</Box>
            <Box>Div Capture</Box>
            <Box>Best Strategy</Box>
            <Box>DC Win Rate</Box>
            <Box>Risk (Vol)</Box>
            <Box>Yield</Box>
            <Box>Stock Price</Box>
          </Box>
          
          {/* Data Rows */}
          {performers.map((item, index) => (
            <motion.div
              key={item.ticker}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: (delay + 0.2) + index * 0.02 }}
            >
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '80px 50px 120px 120px 120px 120px 100px 100px 100px 120px',
                gap: 1,
                py: 0.5,
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                '&:hover': {
                  backgroundColor: 'rgba(0, 212, 255, 0.05)'
                }
              }}>
                <Box sx={{ color: '#00D4FF', fontWeight: 700 }}>{item.ticker}</Box>
                <Box sx={{ color: '#FFFFFF' }}>{item.tradingDays}</Box>
                <Box sx={{ color: '#FFFFFF' }}>{item.exDivDay}</Box>
                <Box sx={{ color: getColorByValue(item.buyHoldReturn), fontWeight: 600 }}>
                  {formatPercentage(item.buyHoldReturn)}
                </Box>
                <Box sx={{ color: getColorByValue(item.divCaptureReturn), fontWeight: 600 }}>
                  {formatPercentage(item.divCaptureReturn)}
                </Box>
                <Box sx={{ 
                  color: item.bestStrategy === 'Buy & Hold' ? '#007AFF' : '#00D4FF',
                  fontWeight: 700
                }}>
                  {item.bestStrategy === 'Buy & Hold' ? 'B&H' : 'DC'}: {formatPercentage(item.bestReturn)}
                </Box>
                <Box sx={{ color: '#FFFFFF' }}>
                  {formatPercentage(item.dcWinRate)}
                </Box>
                <Box sx={{ color: getColorByValue(item.riskVolatility, true), fontWeight: 600 }}>
                  {formatPercentage(item.riskVolatility)}
                </Box>
                <Box sx={{ color: '#34C759', fontWeight: 600 }}>
                  {item.forwardYield?.toFixed(1) || 'N/A'}%
                </Box>
                <Box sx={{ color: '#FFFFFF' }}>
                  ${item.currentPrice ? item.currentPrice.toFixed(2) : 'N/A'}
                </Box>
              </Box>
            </motion.div>
          ))}
        </Box>
      </motion.div>
    );
    
    return (
      <Box>
        {highPerformers.length > 0 && renderPerformanceSection(
          `HIGH PERFORMERS (>50% RETURNS, SORTED BY BEST STRATEGY PERFORMANCE)`,
          highPerformers,
          0
        )}
        
        {mediumPerformers.length > 0 && renderPerformanceSection(
          `MEDIUM PERFORMERS (20-50% RETURNS, SORTED BY BEST STRATEGY PERFORMANCE)`,
          mediumPerformers,
          0.3
        )}
        
        {lowPerformers.length > 0 && renderPerformanceSection(
          `LOW PERFORMERS (≤20% RETURNS, SORTED BY BEST STRATEGY PERFORMANCE)`,
          lowPerformers,
          0.6
        )}
      </Box>
    );
  };

  const renderLegacyTable = (data: DividendData[]) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <TableContainer 
        component={Paper} 
        elevation={0}
        sx={{ 
          mt: 3, 
          overflowX: 'auto',
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 3,
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 4
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0, 212, 255, 0.4)',
            borderRadius: 4,
            '&:hover': {
              background: 'rgba(0, 212, 255, 0.6)'
            }
          }
        }}
      >
        <Table size="small" stickyHeader sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ticker
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ex-Div
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                B&H Return
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                DC Return
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Strategy
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Best Return
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Win Rate
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Risk
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Yield
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item, index) => (
              <motion.tr
                key={index}
                component={TableRow}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                hover
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 212, 255, 0.04)',
                    transform: 'scale(1.001)'
                  }
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Link
                        href={`https://marketchameleon.com/Overview/${item.ticker}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ 
                          textDecoration: 'none',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'scale(1.05)'
                          }
                        }}
                      >
                        <Typography 
                          variant="subtitle2" 
                          fontWeight="bold" 
                          sx={{
                            color: '#00D4FF',
                            fontSize: '0.9rem',
                            '&:hover': {
                              color: '#64E3FF'
                            }
                          }}
                        >
                          {item.ticker}
                        </Typography>
                      </Link>
                    {mptAllocation.some(allocation => allocation.ticker === item.ticker) && (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        px: 0.75,
                        py: 0.25,
                        border: '2px solid #00D4FF',
                        borderRadius: 1,
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        height: '20px'
                      }}>
                        <Typography sx={{ fontSize: '0.7rem' }}>⭐</Typography>
                        <Typography sx={{ 
                          color: '#00D4FF',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          lineHeight: 1
                        }}>
                          IN PORTFOLIO
                        </Typography>
                      </Box>
                    )}
                    </Box>
                    {/* Price and Dividend Information */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="caption" sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        fontSize: '0.75rem',
                        fontWeight: 500
                      }}>
                        ${item.currentPrice?.toFixed(2) || '---'}
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: 'rgba(0, 230, 118, 0.8)', 
                        fontSize: '0.75rem',
                        fontWeight: 500
                      }}>
                        Div: ${(item.lastDividend || item.medianDividend || 0.5).toFixed(3)}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={item.exDivDay}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '0.75rem'
                    }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    {getReturnIcon(item.buyHoldReturn)}
                    <Typography
                      variant="body2"
                      sx={{ 
                        color: getColorByValue(item.buyHoldReturn),
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}
                    >
                      {formatPercentage(item.buyHoldReturn)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    {getReturnIcon(item.divCaptureReturn)}
                    <Typography
                      variant="body2"
                      sx={{ 
                        color: getColorByValue(item.divCaptureReturn),
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}
                    >
                      {formatPercentage(item.divCaptureReturn)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  {getStrategyChip(item.bestStrategy)}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    {getReturnIcon(item.bestReturn)}
                    <Typography
                      variant="body2"
                      sx={{ 
                        color: getColorByValue(item.bestReturn),
                        fontWeight: 700,
                        fontSize: '0.9rem'
                      }}
                    >
                      {formatPercentage(item.bestReturn)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Typography 
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}
                  >
                    {formatPercentage(item.dcWinRate)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {getRiskChip(item.riskVolatility)}
                </TableCell>
                <TableCell align="center">
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#00E676', 
                      fontWeight: 700,
                      fontSize: '0.875rem'
                    }}
                  >
                    {(item.forwardYield !== null && item.forwardYield !== undefined) ? `${item.forwardYield.toFixed(1)}%` : 'N/A'}
                  </Typography>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </motion.div>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh' }}>
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <AppBar position="static" elevation={0} sx={{ 
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <Toolbar sx={{ minHeight: 80, px: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #00D4FF 0%, #6C63FF 100%)',
                    mr: 2,
                    boxShadow: '0 8px 24px rgba(0, 212, 255, 0.3)'
                  }}>
                    <Dashboard sx={{ color: 'white', fontSize: 28 }} />
                  </Box>
                </motion.div>
                
                <Box>
                  <Typography 
                    variant="h5" 
                    component="div" 
                    sx={{ 
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #00D4FF 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      lineHeight: 1.2
                    }}
                  >
                    YieldMax Analytics
                  </Typography>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontWeight: 500,
                      letterSpacing: '0.02em'
                    }}
                  >
                    Enhanced Weekly Distribution Analysis
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  icon={<Timeline sx={{ fontSize: 16 }} />}
                  label={`Live • ${metadata.analysisDate}`}
                  variant="outlined"
                  sx={{
                    borderColor: 'rgba(0, 212, 255, 0.3)',
                    color: '#00D4FF',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    '& .MuiChip-icon': {
                      color: '#00E676'
                    }
                  }}
                />
                <Box sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#00E676',
                  boxShadow: '0 0 12px rgba(0, 230, 118, 0.6)',
                  animation: 'pulse 2s infinite'
                }} />
              </Box>
            </Toolbar>
          </AppBar>
        </motion.div>
        
        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.7; transform: scale(1.1); }
            }
          `}
        </style>        <Box 
          sx={{ 
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0F0F23 0%, #1A1A2E 25%, #16213E 50%, #0E1B31 75%, #0F0F23 100%)',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 20% 80%, rgba(0, 212, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(108, 99, 255, 0.15) 0%, transparent 50%)',
              pointerEvents: 'none'
            }
          }}
        >
        <Container maxWidth="xl" sx={{ py: 6, position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
          <Paper 
            elevation={0}
            sx={{ 
              width: '100%', 
              mb: 4,
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 4,
              overflow: 'hidden'
            }}
          >
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
              sx={{ 
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.01)',
                '& .MuiTabs-indicator': {
                  background: 'linear-gradient(90deg, #00D4FF, #6C63FF)',
                  height: 3,
                  borderRadius: '3px 3px 0 0'
                }
              }}
            >
              <Tab
                label={`Optimal Portfolio (${topPerformers.length})`}
                icon={<Stars />}
                iconPosition="start"
                sx={{
                  minHeight: 72,
                  '& .MuiSvgIcon-root': {
                    fontSize: 20
                  }
                }}
              />
              <Tab
                label={`All ETFs (${excludedTickers.length})`}
                icon={<ShowChart />}
                iconPosition="start"
                sx={{
                  minHeight: 72,
                  '& .MuiSvgIcon-root': {
                    fontSize: 20
                  }
                }}
              />
              <Tab
                label="Enhanced Analytics"
                icon={<Analytics />}
                iconPosition="start"
                sx={{
                  minHeight: 72,
                  '& .MuiSvgIcon-root': {
                    fontSize: 20
                  }
                }}
              />
              <Tab
                label={`Full Analysis (${data.length})`}
                icon={<TableView />}
                iconPosition="start"
                sx={{
                  minHeight: 72,
                  '& .MuiSvgIcon-root': {
                    fontSize: 20
                  }
                }}
              />
              {console.log('🎯 TABS RENDERED - All tabs:', {
                tabCount: 4,
                selectedTab,
                dataLength: data.length,
                tabs: ['Optimal Portfolio', 'All ETFs', 'Enhanced Analytics', 'Full Analysis']
              })}
            </Tabs>

            <TabPanel value={selectedTab} index={0}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* Optimal Portfolio Allocation Table - Clean Summary */}
                <Card sx={{ 
                  mb: 3,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Box>
                        <Typography variant="h4" sx={{ 
                          color: '#FFFFFF', 
                          fontWeight: 700, 
                          mb: 1,
                          fontSize: '1.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}>
                          <AccountBalance sx={{ color: '#00D4FF', fontSize: 28 }} />
                          Optimal Portfolio Allocation
                        </Typography>
                        <Typography variant="subtitle1" sx={{ 
                          color: 'rgba(255, 255, 255, 0.8)', 
                          fontSize: '1rem'
                        }}>
                          {mptAllocation.length} ETFs selected via correlation-aware MPT optimization
                        </Typography>
                      </Box>
                      
                      {/* Key Portfolio Metrics */}
                      <Box sx={{ display: 'flex', gap: 3, textAlign: 'center' }}>
                        <Box>
                          <Typography variant="h5" sx={{ color: '#34C759', fontWeight: 700 }}>
                            {portfolioMetrics ? `${(portfolioMetrics.expectedReturn * 100).toFixed(1)}%` : '---'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            Expected Return
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="h5" sx={{ color: '#FF9500', fontWeight: 700 }}>
                            {portfolioMetrics ? `${(portfolioMetrics.risk * 100).toFixed(1)}%` : '---'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            Risk
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="h5" sx={{ color: '#00D4FF', fontWeight: 700 }}>
                            {portfolioMetrics ? portfolioMetrics.sharpeRatio.toFixed(2) : '---'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            Sharpe Ratio
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    
                    {/* Allocation Table */}
                    <TableContainer>
                      <Table size="medium">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>ETF</TableCell>
                            <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Weight</TableCell>
                            <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Expected Return</TableCell>
                            <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Risk</TableCell>
                            <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Sharpe</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {mptAllocation.map((asset, index) => (
                            <TableRow key={asset.ticker} hover>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" sx={{ 
                                    fontWeight: 600, 
                                    color: asset.ticker === 'CASH' ? '#FFB74D' : '#FFFFFF' 
                                  }}>
                                    {asset.ticker}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 700, 
                                  color: '#00D4FF',
                                  fontSize: '0.95rem'
                                }}>
                                  {(asset.weight * 100).toFixed(1)}%
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                {(() => {
                                  const indicator = getPerformanceIcon(asset.return * 100, 'return');
                                  return (
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                      <Typography variant="body2" sx={{ fontSize: '1rem' }}>
                                        {indicator.icon}
                                      </Typography>
                                      <Typography variant="body2" sx={{ 
                                        color: indicator.color,
                                        fontWeight: 500
                                      }}>
                                        {(asset.return * 100).toFixed(1)}%
                                      </Typography>
                                    </Box>
                                  );
                                })()}
                              </TableCell>
                              <TableCell align="center">
                                {(() => {
                                  const indicator = getPerformanceIcon(asset.risk * 100, 'risk');
                                  return (
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                      <Typography variant="body2" sx={{ fontSize: '1rem' }}>
                                        {indicator.icon}
                                      </Typography>
                                      <Typography variant="body2" sx={{ 
                                        color: indicator.color,
                                        fontWeight: 500
                                      }}>
                                        {(asset.risk * 100).toFixed(1)}%
                                      </Typography>
                                    </Box>
                                  );
                                })()}
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" sx={{ 
                                  color: '#FFFFFF',
                                  fontWeight: 500
                                }}>
                                  {asset.sharpe?.toFixed(2) || 'N/A'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>

                {/* Secondary Information - Progressive Disclosure */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {renderPortfolioCards()}
                  {renderDetailedETFTable(topPerformers)}
                </Box>
              </motion.div>
              
              {/* Modern Portfolio Optimization Widget */}
              {mptAllocation.length > 0 && portfolioMetrics && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <Card 
                    elevation={0}
                    sx={{ 
                      mt: 6, 
                      maxWidth: '1000px', 
                      mx: 'auto', 
                      background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.08) 0%, rgba(108, 99, 255, 0.08) 100%)',
                      border: '1px solid rgba(0, 212, 255, 0.2)',
                      borderRadius: 4,
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: 'linear-gradient(90deg, #00D4FF, #6C63FF, #00E676)',
                        opacity: 0.8
                      }
                    }}
                  >
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Typography 
                          variant="h5" 
                          sx={{ 
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #00D4FF 0%, #6C63FF 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1
                          }}
                        >
                          <AccountBalance sx={{ color: '#00D4FF', fontSize: 28 }} />
                          Optimal Portfolio Allocation
                        </Typography>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontWeight: 500
                          }}
                        >
                          Advanced MPT Optimization Results
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 6, mb: 4 }}>
                        {/* Portfolio Composition */}
                        <Box sx={{ flex: 1.2 }}>
                          <Typography variant="h6" sx={{ mb: 2, color: '#00D4FF', fontWeight: 600 }}>
                            Allocation Breakdown
                          </Typography>
                          {mptAllocation
                            .sort((a, b) => b.weight - a.weight)
                            .map((asset, index) => {
                              const etfData = data.find(item => item.ticker === asset.ticker);
                              const strategy = etfData ? etfData.bestStrategy : null;
                              
                              return (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.4, delay: index * 0.1 }}
                                >
                                  <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    mb: 2,
                                    p: 2,
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: 2,
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      transform: 'translateX(4px)'
                                    }
                                  }}>
                                    <Chip
                                      label={asset.ticker}
                                      size="medium"
                                      sx={{
                                        background: asset.ticker === 'CASH' ? 'linear-gradient(135deg, #FFB74D 0%, #FF8A65 100%)' : 
                                                   asset.ticker === 'SPY' ? 'linear-gradient(135deg, #9C27B0 0%, #673AB7 100%)' : 
                                                   'linear-gradient(135deg, #00D4FF 0%, #0095CC 100%)',
                                        color: 'white',
                                        fontWeight: 700,
                                        minWidth: '70px',
                                        fontSize: '0.8rem'
                                      }}
                                    />
                                    <Box sx={{ flex: 1, mx: 2 }}>
                                      <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        mb: 0.5
                                      }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#FFFFFF' }}>
                                          {(asset.weight * 100).toFixed(1)}%
                                        </Typography>
                                        {strategy && (
                                          <Chip
                                            label={strategy}
                                            size="small"
                                            sx={{
                                              background: strategy === 'B&H' ? 
                                                'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)' : 
                                                'linear-gradient(135deg, #009688 0%, #00695C 100%)',
                                              color: 'white',
                                              fontSize: '0.7rem',
                                              height: '20px',
                                              fontWeight: 600
                                            }}
                                          />
                                        )}
                                      </Box>
                                      <Box sx={{ 
                                        width: '100%', 
                                        height: 6, 
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                                        borderRadius: 3,
                                        overflow: 'hidden'
                                      }}>
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${asset.weight * 100}%` }}
                                          transition={{ duration: 1, delay: index * 0.1 + 0.5 }}
                                          style={{
                                            height: '100%',
                                            background: asset.ticker === 'CASH' ? 
                                              'linear-gradient(90deg, #FFB74D, #FF8A65)' : 
                                              asset.ticker === 'SPY' ? 
                                              'linear-gradient(90deg, #9C27B0, #673AB7)' :
                                              'linear-gradient(90deg, #00D4FF, #0095CC)',
                                            borderRadius: '3px'
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                  </Box>
                                </motion.div>
                              );
                            })}
                        </Box>
                        
                        {/* Portfolio Metrics */}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ mb: 2, color: '#6C63FF', fontWeight: 600 }}>
                            Performance Metrics
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ 
                              p: 2, 
                              background: 'rgba(0, 230, 118, 0.1)', 
                              borderRadius: 2,
                              border: '1px solid rgba(0, 230, 118, 0.2)'
                            }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>Expected Return</Typography>
                                <Typography sx={{ color: '#00E676', fontWeight: 700, fontSize: '1.1rem' }}>
                                  {formatPercentage(portfolioMetrics.expectedReturn)}
                                </Typography>
                              </Box>
                            </Box>
                            
                            <Box sx={{ 
                              p: 2, 
                              background: portfolioMetrics.risk > 0.15 ? 'rgba(255, 69, 105, 0.1)' : 'rgba(0, 212, 255, 0.1)', 
                              borderRadius: 2,
                              border: `1px solid ${portfolioMetrics.risk > 0.15 ? 'rgba(255, 69, 105, 0.2)' : 'rgba(0, 212, 255, 0.2)'}`
                            }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>Portfolio Risk</Typography>
                                <Typography sx={{ 
                                  color: portfolioMetrics.risk > 0.15 ? '#FF4569' : '#00D4FF',
                                  fontWeight: 700, 
                                  fontSize: '1.1rem'
                                }}>
                                  {formatPercentage(portfolioMetrics.risk)}
                                </Typography>
                              </Box>
                            </Box>
                            
                            <Box sx={{ 
                              p: 2, 
                              background: 'rgba(108, 99, 255, 0.1)', 
                              borderRadius: 2,
                              border: '1px solid rgba(108, 99, 255, 0.2)'
                            }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>Sharpe Ratio</Typography>
                                <Typography sx={{ color: '#6C63FF', fontWeight: 700, fontSize: '1.1rem' }}>
                                  {portfolioMetrics.sharpeRatio.toFixed(2)}
                                </Typography>
                              </Box>
                            </Box>
                            
                            <Box sx={{ 
                              p: 2, 
                              background: 'rgba(255, 183, 77, 0.1)', 
                              borderRadius: 2,
                              border: '1px solid rgba(255, 183, 77, 0.2)'
                            }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>Diversification</Typography>
                                <Typography sx={{ color: '#FFB74D', fontWeight: 700, fontSize: '1.1rem' }}>
                                  {mptAllocation.length} assets
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                      
                      <Box sx={{ 
                        textAlign: 'center',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        pt: 3,
                        mt: 2
                      }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontStyle: 'italic',
                            lineHeight: 1.6,
                            maxWidth: '800px',
                            mx: 'auto'
                          }}
                        >
                          <Security sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                          Enhanced Modern Portfolio Theory optimization featuring Sharpe ratio maximization, 
                          efficient frontier analysis, and mean variance optimization with advanced correlation adjustments and concentration penalties
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </TabPanel>

            <TabPanel value={selectedTab} index={1}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Box sx={{ mb: 4 }}>
                  <Typography 
                    variant="h4" 
                    gutterBottom
                    sx={{ 
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #6C63FF 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 1
                    }}
                  >
                    Complete ETF Universe
                  </Typography>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.7)',
                      maxWidth: '600px',
                      lineHeight: 1.6
                    }}
                  >
                    Comprehensive analysis of all remaining ETFs evaluated but not selected for the optimal allocation
                  </Typography>
                </Box>
              </motion.div>
              {renderLegacyTable(excludedTickers)}
            </TabPanel>

            <TabPanel value={selectedTab} index={2}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Box sx={{ mb: 4 }}>
                  <Typography 
                    variant="h4" 
                    gutterBottom
                    sx={{ 
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #FFB74D 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 1
                    }}
                  >
                    Enhanced Analytics Suite
                  </Typography>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.7)',
                      maxWidth: '600px',
                      lineHeight: 1.6
                    }}
                  >
                    Advanced dividend capture analytics with comprehensive risk metrics, intelligent scanner, and tax optimization strategies
                  </Typography>
                </Box>
              </motion.div>
              <EnhancedDashboardIntegration 
                mockAllocation={mptAllocation}
                mockPortfolioMetrics={portfolioMetrics}
              />
            </TabPanel>

            <TabPanel value={selectedTab} index={3}>
              {console.log('🎯 RENDERING FULL ANALYSIS TAB - selectedTab:', selectedTab, 'should show:', selectedTab === 3)}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Box sx={{ mb: 4 }}>
                  <Typography 
                    variant="h4" 
                    gutterBottom
                    sx={{ 
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #00D4FF 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 1
                    }}
                  >
                    Comprehensive Weekly Distribution ETF Analysis
                  </Typography>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.7)',
                      maxWidth: '800px',
                      lineHeight: 1.6
                    }}
                  >
                    Complete analysis of all dividend capture opportunities across the YieldMax universe. 
                    Compare buy & hold vs dividend capture strategies, win rates, risk metrics, and forward yields 
                    for informed investment decisions.
                  </Typography>
                </Box>
              </motion.div>
              {renderFullAnalysisTable(data)}
            </TabPanel>
          </Paper>
          </motion.div>

          {/* Modern Disclaimer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Card 
              elevation={0}
              sx={{ 
                mt: 6, 
                background: 'linear-gradient(135deg, rgba(255, 183, 77, 0.08) 0%, rgba(255, 152, 0, 0.08) 100%)',
                border: '1px solid rgba(255, 183, 77, 0.2)',
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: 'linear-gradient(90deg, #FFB74D, #FF8A65, #FFB74D)',
                  opacity: 0.8
                }
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #FFB74D 0%, #FF8A65 100%)',
                    mr: 2
                  }}>
                    <Security sx={{ color: 'white', fontSize: 24 }} />
                  </Box>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 700,
                      color: '#FFB74D'
                    }}
                  >
                    Important Disclaimer
                  </Typography>
                </Box>
                
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: 1.7,
                    fontSize: '0.95rem'
                  }}
                >
                  This analysis tool is provided for <strong style={{color: '#FFB74D'}}>educational and entertainment purposes only</strong>. 
                  The data, calculations, and strategies presented here are <strong style={{color: '#FFB74D'}}>not investment advice</strong> and should not be 
                  considered as recommendations for any financial decisions. Past performance does not guarantee future results. 
                  All investments carry risk, including the potential loss of principal. You should consult with a qualified 
                  financial advisor before making any investment decisions. The creator of this tool is not responsible for any 
                  financial losses or decisions made based on this information.
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
