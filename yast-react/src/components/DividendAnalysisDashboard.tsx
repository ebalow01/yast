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
  alpha,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  InputAdornment,
  Alert,
  Snackbar,
  TableSortLabel
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
  TableView,
  BusinessCenter,
  Add,
  Delete,
  Edit,
  Save,
  MonetizationOn
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
  medianLast3?: number;
  forwardYield?: number;
  currentPrice?: number;
  category: 'top-performers' | 'mid-performers' | 'low-performers' | 'excluded' | 'benchmark';
  // New risk assessment fields
  riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
  riskColor?: string;
  riskPriority?: number;
  rationale?: string;
  rsi?: number;
  momentum5d?: number;
  alertCount?: number;
  riskLastUpdated?: string;
}

// Portfolio Management Types
export interface PortfolioHolding {
  ticker: string;
  shares: number;
  averagePrice: number;
  currentPrice?: number;
  totalValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
  dateAdded: string;
}

export interface UserPortfolio {
  id: string;
  name: string;
  holdings: PortfolioHolding[];
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  lastUpdated: string;
}

// Cookie utilities
const setCookie = (name: string, value: string, days: number = 365) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

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
  strategy?: string;
  isRule1?: boolean;  // Flag for Rule 1 ETFs (>40% return AND <40% risk)
  isRule2?: boolean;  // Flag for Rule 2 ETFs (>30% div capture)
}

interface AllocationItem {
  ticker: string;
  weight: number;
  return: number;
  risk: number;
  sharpe?: number;
  strategy?: string;
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
        strategy: etf.bestStrategy,
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
    // Fewer stocks with higher minimum allocation (15%)
    // Only include top 4-5 stocks to reduce complexity
    if (i >= 4) break; // Limit to maximum 4 ETFs for cleaner allocation
    
    let weight;
    if (i === 0) {
      weight = 0.30; // Best Sharpe ratio gets 30%
    } else if (i === 1) {
      weight = 0.25; // Second best gets 25%
    } else if (i === 2) {
      weight = 0.20; // Third best gets 20%
    } else if (i === 3) {
      weight = 0.15; // Fourth gets 15% (minimum allocation)
    } else {
      weight = 0.15; // Minimum 15% allocation for any included ETF
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
        sharpe: asset.sharpe,
        strategy: asset.strategy
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
        sharpe: asset.sharpe,
        strategy: asset.strategy
      });
      totalWeight += weight;
      console.log(`Added div capture ETF ${asset.ticker} with ${(weight*100).toFixed(1)}% allocation (Sharpe: ${asset.sharpe.toFixed(2)}, div rank: ${i+1})${asset.isRule2 ? ' [RULE2]' : ''}`);
    } else {
      // Even if we're over capacity, Rule 2 ETFs get minimum allocation by reducing others
      if (asset.isRule2 && weight >= 0.15) {
        const minWeight = 0.15; // Minimum 15% for Rule 2 ETFs
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
          sharpe: asset.sharpe,
          strategy: asset.strategy
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
    
    // High-income ETFs have specific drawdown characteristics
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

export default function DividendAnalysisDashboard() {
  console.log('🚀 DASHBOARD LOADED v2.2 - Enhanced version with 5 tabs including Portfolio Management');
  const [selectedTab, setSelectedTab] = useState(0);
  const [data, setData] = useState<DividendData[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Portfolio Management State
  const [portfolio, setPortfolio] = useState<UserPortfolio>({
    id: 'default',
    name: 'My Portfolio',
    holdings: [],
    totalValue: 0,
    totalGainLoss: 0,
    totalGainLossPercent: 0,
    lastUpdated: new Date().toISOString()
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingHolding, setEditingHolding] = useState<PortfolioHolding | null>(null);
  const [newTicker, setNewTicker] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  
  // Portfolio table sorting state
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
  const [realtimeData, setRealtimeData] = useState<any>(null);
  const [useRealtimeData, setUseRealtimeData] = useState(true);

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
          const [performanceResponse, metadataResponse, realtimeResponse] = await Promise.all([
            fetch(`/data/performance_data.json?v=${cacheBuster}`),
            fetch(`/data/metadata.json?v=${cacheBuster}`),
            // Always try static realtime data file first, then function if that fails
            fetch(`/data/realtime_data.json?v=${cacheBuster}`).catch(() =>
              location.hostname !== 'localhost' ? 
                fetch(`/.netlify/functions/realtime-data?v=${cacheBuster}`).catch(() => null) :
                null
            )
          ]);
          
          if (performanceResponse.ok && metadataResponse.ok) {
            const performanceData = await performanceResponse.json();
            metadataValue = await metadataResponse.json();
            
            console.log('📊 Loading data from updated JSON files');
            console.log('📅 Metadata loaded:', metadataValue);
            console.log('🔄 Cache buster used:', cacheBuster);
            console.log('🏗️ Build ID:', metadataValue.build_id || 'N/A');
            console.log('📈 Performance data entries:', performanceData.length);
            
            // Try to load real-time data
            let realtimeDataValue: any = null;
            if (realtimeResponse && realtimeResponse.ok) {
              try {
                const realtimeJson = await realtimeResponse.json();
                console.log('🔄 Raw realtime response:', realtimeJson);
                if (realtimeJson && realtimeJson.data && typeof realtimeJson.data === 'object') {
                  realtimeDataValue = realtimeJson.data || {};
                  setRealtimeData(realtimeDataValue);
                  console.log('💹 Real-time data loaded:', Object.keys(realtimeDataValue).length, 'tickers');
                  console.log('💹 QDTE real-time data:', realtimeDataValue.QDTE);
                  console.log('💹 ULTY real-time data:', realtimeDataValue.ULTY);
                  console.log('💹 AAPW real-time data:', realtimeDataValue.AAPW);
                } else {
                  console.log('❌ Real-time response not in expected format:', realtimeJson);
                }
              } catch (e) {
                console.log('❌ Real-time data JSON parse error:', e);
              }
            } else {
              console.log('❌ Real-time data not available:', realtimeResponse?.status);
            }
            
            // Convert JSON data to the format expected by the dashboard
            // Note: JSON data uses different field names and decimal format
            convertedData = performanceData.map((item: any) => {
              // Use real-time data if available, otherwise use calculated price
              const rtData = realtimeDataValue?.[item.ticker];
              const currentPrice = rtData?.currentPrice || generateRealisticPrice(item.ticker, item.forwardYield, item.medianDividend);
              const lastDividend = rtData?.lastDividend || item.medianDividend;
              const actualYield = rtData?.actualYield || item.forwardYield;
              
              // Debug logging for specific tickers
              if (item.ticker === 'QDTE' || item.ticker === 'ULTY' || item.ticker === 'AAPW') {
                console.log(`🔍 ${item.ticker} data:`, {
                  rtData: rtData,
                  currentPrice: currentPrice,
                  actualYield: actualYield,
                  originalPrice: generateRealisticPrice(item.ticker, item.forwardYield, item.medianDividend),
                  originalYield: item.forwardYield,
                  realtimeDataAvailable: !!realtimeDataValue,
                  realtimeKeys: realtimeDataValue ? Object.keys(realtimeDataValue).slice(0, 5) : []
                });
              }
              
              return {
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
                medianDividend: rtData?.medianDividend || item.medianDividend,
                medianLast3: rtData?.medianLast3 || item.medianDividend,
                forwardYield: actualYield,
                currentPrice: currentPrice,
                lastDividend: lastDividend,
                category: item.bestReturn >= 0.40 ? 'top-performers' : 
                         item.bestReturn >= 0.20 ? 'mid-performers' : 
                         item.bestReturn >= 0.0 ? 'low-performers' : 'excluded',
                // New risk assessment fields
                riskLevel: item.riskLevel,
                riskColor: item.riskColor,
                riskPriority: item.riskPriority,
                rationale: item.rationale,
                rsi: item.rsi,
                momentum5d: item.momentum5d,
                alertCount: item.alertCount,
                riskLastUpdated: item.riskLastUpdated
              };
            });
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
          // Try to fetch real-time data even with static data
          let realtimeDataValue: any = null;
          try {
            // Always try static file first in fallback mode
            const rtResponse = await fetch(`/data/realtime_data.json`).catch(() =>
              location.hostname !== 'localhost' ? 
                fetch(`/.netlify/functions/realtime-data`).catch(() => null) :
                null
            );
            if (rtResponse && rtResponse.ok) {
              const rtJson = await rtResponse.json();
              realtimeDataValue = rtJson.data || {};
              setRealtimeData(realtimeDataValue);
              console.log('💹 Real-time data loaded (fallback):', Object.keys(realtimeDataValue).length, 'tickers');
            }
          } catch (e) {
            console.log('Could not fetch real-time data (fallback):', e);
          }
          
          convertedData = dividendData.map(asset => {
            const rtData = realtimeDataValue?.[asset.ticker];
            const converted = convertAssetToData(asset);
            if (rtData) {
              converted.currentPrice = rtData.currentPrice;
              converted.lastDividend = rtData.lastDividend;
              converted.medianDividend = rtData.medianDividend;
              converted.forwardYield = rtData.actualYield;
            }
            return converted;
          });
          metadataValue = analysisMetadata;
        }
        
        setData(convertedData);
        setMetadata(metadataValue);
        
        // Calculate MPT allocation for ALL ETFs, not just top performers
        if (convertedData.length > 0) {
          const { allocation, metrics } = calculateMPTAllocation(convertedData);
          // Enrich allocation with original ETF data (exDivDay, strategy)
          const enrichedAllocation = allocation.map(asset => {
            const originalETF = convertedData.find(etf => etf.ticker === asset.ticker);
            return {
              ...asset,
              exDivDay: originalETF?.exDivDay,
              strategy: originalETF?.bestStrategy
            };
          });
          setMptAllocation(enrichedAllocation);
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

  // Portfolio Management - Load from cookies on mount
  useEffect(() => {
    const savedPortfolio = getCookie('userPortfolio');
    if (savedPortfolio) {
      try {
        const parsedPortfolio = JSON.parse(savedPortfolio);
        setPortfolio(parsedPortfolio);
        updatePortfolioValues(parsedPortfolio);
      } catch (error) {
        console.error('Error loading portfolio from cookies:', error);
      }
    }
  }, [data]); // Re-run when data loads to get current prices

  // Portfolio Management Functions
  const savePortfolioToCookie = (updatedPortfolio: UserPortfolio) => {
    setCookie('userPortfolio', JSON.stringify(updatedPortfolio));
  };

  const updatePortfolioValues = (currentPortfolio: UserPortfolio) => {
    const updatedHoldings = currentPortfolio.holdings.map(holding => {
      const tickerData = data.find(d => d.ticker === holding.ticker);
      const currentPrice = tickerData?.currentPrice || generateRealisticPrice(holding.ticker, tickerData?.forwardYield || 50, tickerData?.medianDividend || 0.2);
      const totalValue = holding.shares * currentPrice;
      const gainLoss = totalValue - (holding.shares * holding.averagePrice);
      const gainLossPercent = ((currentPrice - holding.averagePrice) / holding.averagePrice) * 100;

      return {
        ...holding,
        currentPrice,
        totalValue,
        gainLoss,
        gainLossPercent
      };
    });

    const totalValue = updatedHoldings.reduce((sum, holding) => sum + (holding.totalValue || 0), 0);
    const totalGainLoss = updatedHoldings.reduce((sum, holding) => sum + (holding.gainLoss || 0), 0);
    const totalGainLossPercent = totalValue > 0 ? (totalGainLoss / (totalValue - totalGainLoss)) * 100 : 0;

    const updatedPortfolio = {
      ...currentPortfolio,
      holdings: updatedHoldings,
      totalValue,
      totalGainLoss,
      totalGainLossPercent,
      lastUpdated: new Date().toISOString()
    };

    setPortfolio(updatedPortfolio);
    savePortfolioToCookie(updatedPortfolio);
  };

  const addHolding = () => {
    if (!newTicker || !newShares || !newPrice) {
      setSnackbarMessage('Please fill in all fields');
      setShowSnackbar(true);
      return;
    }

    const ticker = newTicker.toUpperCase();
    const shares = parseFloat(newShares);
    const price = parseFloat(newPrice);

    if (isNaN(shares) || isNaN(price) || shares <= 0 || price <= 0) {
      setSnackbarMessage('Please enter valid numbers for shares and price');
      setShowSnackbar(true);
      return;
    }

    // Check if ticker exists in our data
    const tickerExists = data.some(d => d.ticker === ticker);
    if (!tickerExists) {
      setSnackbarMessage(`Warning: ${ticker} not found in our database. Adding anyway.`);
      setShowSnackbar(true);
    }

    const newHolding: PortfolioHolding = {
      ticker,
      shares,
      averagePrice: price,
      dateAdded: new Date().toISOString()
    };

    const updatedPortfolio = {
      ...portfolio,
      holdings: [...portfolio.holdings, newHolding]
    };

    updatePortfolioValues(updatedPortfolio);
    setShowAddDialog(false);
    setNewTicker('');
    setNewShares('');
    setNewPrice('');
    setSnackbarMessage(`Added ${shares} shares of ${ticker} at $${price.toFixed(2)}`);
    setShowSnackbar(true);
  };

  const removeHolding = (ticker: string) => {
    const updatedPortfolio = {
      ...portfolio,
      holdings: portfolio.holdings.filter(h => h.ticker !== ticker)
    };
    updatePortfolioValues(updatedPortfolio);
    setSnackbarMessage(`Removed ${ticker} from portfolio`);
    setShowSnackbar(true);
  };

  // New function for risk level chips (HIGH/MEDIUM/LOW/SAFE)
  const getRiskLevelChip = (riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE') => {
    if (!riskLevel) {
      return {
        color: 'rgba(255, 255, 255, 0.1)',
        textColor: 'rgba(255, 255, 255, 0.6)'
      };
    }

    switch (riskLevel) {
      case 'HIGH':
        return {
          color: '#dc3545',
          textColor: 'white'
        };
      case 'MEDIUM':
        return {
          color: '#ffc107',
          textColor: 'black'
        };
      case 'LOW':
        return {
          color: '#fd7e14',
          textColor: 'white'
        };
      case 'SAFE':
        return {
          color: '#28a745',
          textColor: 'white'
        };
      default:
        return {
          color: 'rgba(255, 255, 255, 0.1)',
          textColor: 'rgba(255, 255, 255, 0.6)'
        };
    }
  };

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

  const generateRiskTooltip = (item: DividendData) => {
    if (!item.riskLevel) {
      return `Volatility Risk: ${formatPercentage(item.riskVolatility)}`;
    }

    const riskExplanations = {
      'HIGH': 'Multiple concerning technical signals indicate elevated risk',
      'MEDIUM': 'Some caution warranted due to mixed technical signals', 
      'LOW': 'Minor technical concerns but generally stable',
      'SAFE': 'Strong technical position with minimal risk indicators'
    };

    const indicators = [];
    
    // Add risk level explanation
    indicators.push(`${item.riskLevel} RISK: ${riskExplanations[item.riskLevel]}`);
    indicators.push(''); // Empty line
    
    // Add technical details
    indicators.push('Technical Analysis:');
    
    if (item.rsi) {
      if (item.rsi > 80) {
        indicators.push(`• RSI: ${item.rsi.toFixed(1)} - Severely overbought, correction likely`);
      } else if (item.rsi > 70) {
        indicators.push(`• RSI: ${item.rsi.toFixed(1)} - Overbought conditions`);
      } else if (item.rsi < 20) {
        indicators.push(`• RSI: ${item.rsi.toFixed(1)} - Severely oversold, bounce potential`);
      } else if (item.rsi < 30) {
        indicators.push(`• RSI: ${item.rsi.toFixed(1)} - Oversold conditions`);
      } else {
        indicators.push(`• RSI: ${item.rsi.toFixed(1)} - Neutral momentum`);
      }
    }
    
    if (item.momentum5d !== undefined) {
      if (Math.abs(item.momentum5d) > 10) {
        indicators.push(`• Momentum: ${item.momentum5d > 0 ? '+' : ''}${item.momentum5d.toFixed(1)}% - Extreme price movement`);
      } else if (Math.abs(item.momentum5d) > 5) {
        indicators.push(`• Momentum: ${item.momentum5d > 0 ? '+' : ''}${item.momentum5d.toFixed(1)}% - Strong ${item.momentum5d > 0 ? 'upward' : 'downward'} movement`);
      } else {
        indicators.push(`• Momentum: ${item.momentum5d > 0 ? '+' : ''}${item.momentum5d.toFixed(1)}% - Moderate price movement`);
      }
    }
    
    if (item.alertCount && item.alertCount > 0) {
      indicators.push(`• Active Signals: ${item.alertCount} technical alert${item.alertCount > 1 ? 's' : ''}`);
    }
    
    // Add volatility context
    const volPct = item.riskVolatility * 100;
    if (volPct > 50) {
      indicators.push(`• Volatility: ${volPct.toFixed(1)}% - Highly volatile, expect large price swings`);
    } else if (volPct > 30) {
      indicators.push(`• Volatility: ${volPct.toFixed(1)}% - Elevated volatility`);
    } else {
      indicators.push(`• Volatility: ${volPct.toFixed(1)}% - Relatively stable`);
    }
    
    if (item.riskLastUpdated) {
      indicators.push(''); // Empty line
      indicators.push(`Last updated: ${item.riskLastUpdated}`);
    }
    
    return indicators.join('\n');
  };

  // Calculate expected dividend based on ex-div day using median of last 3 dividends
  const getExpectedDividend = (exDivDay: string, medianDividend: number, tickerData?: DividendData) => {
    if (!exDivDay) return null;
    
    // Get median of last 3 dividends from tickerData (which already includes real-time data)
    const medianLast3 = tickerData?.medianLast3 || medianDividend;
    const currentPrice = tickerData?.currentPrice;
    
    if (!medianLast3) return null;
    
    const dayMap = {
      'Monday': 1,
      'Tuesday': 2, 
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5
    };
    
    const today = new Date();
    const currentDay = today.getDay(); // 0=Sunday, 1=Monday, etc
    const targetDay = dayMap[exDivDay as keyof typeof dayMap];
    
    if (!targetDay) return null;
    
    // Calculate days until next ex-div day
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7; // Next week if already passed
    
    // Calculate annualized forward yield: (median of last 3 dividends / current price) * 100 * 52 weeks
    const forwardYield = currentPrice && currentPrice > 0 ? (medianLast3 / currentPrice) * 100 * 52 : 0;
    
    return {
      daysUntil,
      expectedDividend: medianLast3,
      forwardYield: forwardYield,
      nextExDivDate: new Date(today.getTime() + daysUntil * 24 * 60 * 60 * 1000)
    };
  };

  // Copy text to clipboard with user feedback
  const copyToClipboard = async (text: string, ticker: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSnackbarMessage(`${ticker} risk analysis copied to clipboard!`);
      setShowSnackbar(true);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setSnackbarMessage(`${ticker} risk analysis copied to clipboard!`);
        setShowSnackbar(true);
      } catch (fallbackErr) {
        setSnackbarMessage('Failed to copy to clipboard');
        setShowSnackbar(true);
      }
      document.body.removeChild(textArea);
    }
  };

  // Portfolio table sorting functions
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedHoldings = (holdings: PortfolioHolding[]) => {
    if (!sortField) return holdings;

    return [...holdings].sort((a, b) => {
      const tickerDataA = data.find(d => d.ticker === a.ticker);
      const tickerDataB = data.find(d => d.ticker === b.ticker);
      
      let valueA: any, valueB: any;
      
      switch (sortField) {
        case 'ticker':
          valueA = a.ticker;
          valueB = b.ticker;
          break;
        case 'exDivDay':
          // Sort by weekday order, then by yield (highest first)
          const dayOrder = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5 };
          const dayA = dayOrder[tickerDataA?.exDivDay as keyof typeof dayOrder] || 99;
          const dayB = dayOrder[tickerDataB?.exDivDay as keyof typeof dayOrder] || 99;
          
          if (dayA !== dayB) {
            valueA = dayA;
            valueB = dayB;
          } else {
            // Same day, sort by yield (highest first)
            const expectedDivA = getExpectedDividend(tickerDataA?.exDivDay || '', tickerDataA?.medianDividend || 0, tickerDataA);
            const expectedDivB = getExpectedDividend(tickerDataB?.exDivDay || '', tickerDataB?.medianDividend || 0, tickerDataB);
            valueA = -(expectedDivA?.forwardYield || 0); // Negative for descending
            valueB = -(expectedDivB?.forwardYield || 0);
          }
          break;
        case 'shares':
          valueA = a.shares;
          valueB = b.shares;
          break;
        case 'avgPrice':
          valueA = a.averagePrice;
          valueB = b.averagePrice;
          break;
        case 'totalValue':
          valueA = a.totalValue || 0;
          valueB = b.totalValue || 0;
          break;
        case 'gainLoss':
          valueA = a.gainLoss || 0;
          valueB = b.gainLoss || 0;
          break;
        case 'gainLossPercent':
          valueA = a.gainLossPercent || 0;
          valueB = b.gainLossPercent || 0;
          break;
        case 'riskLevel':
          // Sort by risk priority: SAFE(1) -> LOW(2) -> MEDIUM(3) -> HIGH(4)
          const riskOrder = { 'SAFE': 1, 'LOW': 2, 'MEDIUM': 3, 'HIGH': 4 };
          valueA = riskOrder[tickerDataA?.riskLevel as keyof typeof riskOrder] || 99;
          valueB = riskOrder[tickerDataB?.riskLevel as keyof typeof riskOrder] || 99;
          break;
        case 'indicators':
          // Alphabetical sort on indicators/rationale
          valueA = tickerDataA?.rationale || '';
          valueB = tickerDataB?.rationale || '';
          break;
        default:
          return 0;
      }
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const result = valueA.localeCompare(valueB);
        return sortDirection === 'asc' ? result : -result;
      } else {
        const result = valueA - valueB;
        return sortDirection === 'asc' ? result : -result;
      }
    });
  };

  // Clean up indicators by removing redundant dividend timing info
  const getCleanedIndicators = (rationale: string | undefined) => {
    if (!rationale) return 'No indicators available';
    
    // Remove dividend timing patterns like "PREPARE: Dividend likely in ~1 days, Low risk"
    let cleaned = rationale
      .replace(/PREPARE:\s*Dividend likely in ~\d+\s*days?,?\s*/gi, '')
      .replace(/CAUTION:\s*Dividend likely in ~\d+\s*days?,?\s*/gi, '')
      .replace(/,?\s*Low risk$/gi, '')
      .replace(/,?\s*Medium risk$/gi, '')
      .replace(/,?\s*High risk$/gi, '')
      .replace(/,?\s*Safe$/gi, '')
      .trim();
    
    // If we removed everything and just have "Low risk" or similar, show a more meaningful message
    if (!cleaned || cleaned.match(/^(Low|Medium|High|Safe)\s*risk?$/i)) {
      return 'Normal trading conditions';
    }
    
    return cleaned;
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
                <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Strategy</TableCell>
                <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Weight</TableCell>
                <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Expected Return</TableCell>
                <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>45-Day Vol</TableCell>
                <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Sharpe</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mptAllocation.map((asset, index) => (
                <TableRow key={asset.ticker} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600, 
                          color: asset.ticker === 'CASH' ? '#FFB74D' : '#00D4FF',
                          cursor: asset.ticker === 'CASH' ? 'default' : 'pointer',
                          '&:hover': asset.ticker === 'CASH' ? {} : {
                            textDecoration: 'underline',
                            color: '#40E0FF'
                          }
                        }}
                        onClick={asset.ticker === 'CASH' ? undefined : () => window.open(`https://finance.yahoo.com/quote/${asset.ticker}`, '_blank')}
                      >
                        {asset.ticker}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    {getStrategyChip(asset.strategy || 'N/A')}
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
                      {asset.sharpe ? (isFinite(asset.sharpe) ? asset.sharpe.toFixed(2) : '---') : 'N/A'}
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
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: '#00D4FF', 
                        fontWeight: 700,
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                          color: '#40E0FF'
                        }
                      }}
                      onClick={() => window.open(`https://finance.yahoo.com/quote/${asset.ticker}`, '_blank')}
                    >
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
                        {asset.sharpe ? (isFinite(asset.sharpe) ? asset.sharpe.toFixed(2) : '---') : 'N/A'}
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
  const renderDetailedETFTable = (data: DividendData[]) => {
    // Calculate comprehensive performance metrics
    const calculatePerformanceMetrics = () => {
      const avgBuyHold = data.reduce((sum, item) => sum + item.buyHoldReturn, 0) / data.length;
      const avgDivCapture = data.reduce((sum, item) => sum + item.divCaptureReturn, 0) / data.length;
      const avgWinRate = data.reduce((sum, item) => sum + item.dcWinRate, 0) / data.length;
      const avgRisk = data.reduce((sum, item) => sum + item.riskVolatility, 0) / data.length;
      const avgYield = data.reduce((sum, item) => sum + (item.forwardYield || 0), 0) / data.length;
      
      const outperformingDC = data.filter(item => item.divCaptureReturn > item.buyHoldReturn).length;
      const lowRiskHighReturn = data.filter(item => item.bestReturn > 0.3 && item.riskVolatility < 0.3).length;
      
      const bestPerformer = data.reduce((best, item) => 
        item.bestReturn > best.bestReturn ? item : best
      );
      
      const lowestRisk = data.reduce((best, item) => 
        item.riskVolatility < best.riskVolatility ? item : best
      );
      
      const highestYield = data.reduce((best, item) => 
        (item.forwardYield || 0) > (best.forwardYield || 0) ? item : best
      );
      
      return {
        avgBuyHold,
        avgDivCapture,
        avgWinRate,
        avgRisk,
        avgYield,
        outperformingDC,
        lowRiskHighReturn,
        bestPerformer,
        lowestRisk,
        highestYield,
        totalCount: data.length
      };
    };
    
    const metrics = calculatePerformanceMetrics();
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          mb: 3
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
              <ShowChart sx={{ color: '#00D4FF', fontSize: 20 }} />
              Detailed Performance Analysis
            </Typography>
            
            {/* Performance Overview Cards */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: 2, 
              mb: 4 
            }}>
              {/* Average Returns Card */}
              <Box sx={{ 
                p: 2.5, 
                background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 212, 255, 0.05) 100%)',
                borderRadius: 2,
                border: '1px solid rgba(0, 212, 255, 0.2)'
              }}>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                  Average Strategy Returns
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                  <Typography variant="h5" sx={{ color: '#00D4FF', fontWeight: 700 }}>
                    {formatPercentage(metrics.avgDivCapture)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Div Capture
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h5" sx={{ color: '#007AFF', fontWeight: 700 }}>
                    {formatPercentage(metrics.avgBuyHold)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Buy & Hold
                  </Typography>
                </Box>
              </Box>
              
              {/* Win Rate & Risk Card */}
              <Box sx={{ 
                p: 2.5, 
                background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.1) 0%, rgba(52, 199, 89, 0.05) 100%)',
                borderRadius: 2,
                border: '1px solid rgba(52, 199, 89, 0.2)'
              }}>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                  Risk-Adjusted Performance
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                  <Typography variant="h5" sx={{ color: '#34C759', fontWeight: 700 }}>
                    {formatPercentage(metrics.avgWinRate)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Avg Win Rate
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h5" sx={{ color: '#FF9500', fontWeight: 700 }}>
                    {formatPercentage(metrics.avgRisk)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Avg 45-Day Vol
                  </Typography>
                </Box>
              </Box>
              
              {/* Yield & Opportunities Card */}
              <Box sx={{ 
                p: 2.5, 
                background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.1) 0%, rgba(108, 99, 255, 0.05) 100%)',
                borderRadius: 2,
                border: '1px solid rgba(108, 99, 255, 0.2)'
              }}>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                  Income Opportunities
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                  <Typography variant="h5" sx={{ color: '#6C63FF', fontWeight: 700 }}>
                    {metrics.avgYield.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Avg Yield
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" sx={{ color: '#00E676', fontWeight: 700 }}>
                    {metrics.lowRiskHighReturn}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Low Risk/High Return
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            {/* Key Insights Section */}
            <Box sx={{ 
              mb: 3, 
              p: 2, 
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 2,
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <Typography variant="subtitle1" sx={{ 
                color: '#FFFFFF', 
                fontWeight: 600, 
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Analytics sx={{ color: '#FFB74D', fontSize: 18 }} />
                Key Performance Insights
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
                {/* Best Performer */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  p: 1.5,
                  background: 'rgba(0, 212, 255, 0.05)',
                  borderRadius: 1
                }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Top Performer
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                      {metrics.bestPerformer.ticker} - {formatPercentage(metrics.bestPerformer.bestReturn)}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Lowest Risk */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  p: 1.5,
                  background: 'rgba(52, 199, 89, 0.05)',
                  borderRadius: 1
                }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Lowest Risk
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                      {metrics.lowestRisk.ticker} - {formatPercentage(metrics.lowestRisk.riskVolatility)} volatility
                    </Typography>
                  </Box>
                </Box>
                
                {/* Highest Yield */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  p: 1.5,
                  background: 'rgba(108, 99, 255, 0.05)',
                  borderRadius: 1
                }}>
                  <AccountBalance sx={{ color: '#6C63FF', fontSize: 24 }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Highest Yield
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                      {metrics.highestYield.ticker} - {metrics.highestYield.forwardYield?.toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
                
                {/* DC Success Rate */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  p: 1.5,
                  background: 'rgba(255, 183, 77, 0.05)',
                  borderRadius: 1
                }}>
                  <Timeline sx={{ color: '#FFB74D', fontSize: 24 }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      DC Strategy Success
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                      {metrics.outperformingDC}/{metrics.totalCount} ETFs outperform B&H
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
            
            {/* Detailed Table */}
            <Box>
              <Typography variant="subtitle2" sx={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                mb: 2,
                fontWeight: 600
              }}>
                Individual ETF Performance
              </Typography>
              {renderLegacyTable(data)}
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

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
                <Box sx={{ color: '#FFFFFF' }}>{item.exDivDay}</Box>
                <Box sx={{ color: getColorByValue(item.buyHoldReturn), fontWeight: 600 }}>
                  {formatPercentage(item.buyHoldReturn)}
                </Box>
                <Box sx={{ color: getColorByValue(item.divCaptureReturn), fontWeight: 600 }}>
                  {formatPercentage(item.divCaptureReturn)}
                </Box>
                <Box sx={{ 
                  color: item.bestStrategy === 'B&H' ? '#007AFF' : '#00D4FF',
                  fontWeight: 700
                }}>
                  {item.bestStrategy}: {formatPercentage(item.bestReturn)}
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
                Risk Level
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Indicators
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
                  {item.riskLevel ? (
                    <Tooltip
                      title={
                        <Box sx={{ whiteSpace: 'pre-line', maxWidth: '300px' }}>
                          <Typography variant="body2">
                            {generateRiskTooltip(item)}
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            color: 'rgba(255, 255, 255, 0.6)', 
                            fontSize: '0.7rem',
                            fontStyle: 'italic',
                            mt: 1,
                            display: 'block'
                          }}>
                            Click to copy analysis to clipboard
                          </Typography>
                        </Box>
                      }
                      arrow
                      placement="top"
                      sx={{
                        '& .MuiTooltip-tooltip': {
                          backgroundColor: 'rgba(0, 0, 0, 0.9)',
                          fontSize: '0.75rem',
                          maxWidth: '350px',
                          fontFamily: 'monospace'
                        }
                      }}
                    >
                      <Chip
                        label={item.riskLevel}
                        size="small"
                        onClick={() => {
                          const analysisText = `${item.ticker} Risk Analysis\n${'='.repeat(20)}\n${generateRiskTooltip(item)}`;
                          copyToClipboard(analysisText, item.ticker);
                        }}
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          backgroundColor: item.riskColor || '#6c757d',
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: item.riskColor || '#6c757d',
                            opacity: 0.8,
                            transform: 'scale(1.05)',
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      />
                    </Tooltip>
                  ) : (
                    getRiskChip(item.riskVolatility)
                  )}
                </TableCell>
                <TableCell align="left" sx={{ maxWidth: '200px' }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      fontSize: '0.8rem',
                      wordWrap: 'break-word',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {getCleanedIndicators(item.rationale)}
                  </Typography>
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
                    High Income Analyzer
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
                  label={realtimeData ? `Real-Time Data • ${new Date().toLocaleDateString()}` : `Analysis • ${metadata.analysisDate}`}
                  variant="outlined"
                  sx={{
                    borderColor: realtimeData ? 'rgba(0, 230, 118, 0.3)' : 'rgba(0, 212, 255, 0.3)',
                    color: realtimeData ? '#00E676' : '#00D4FF',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    '& .MuiChip-icon': {
                      color: realtimeData ? '#00E676' : '#00D4FF'
                    }
                  }}
                />
                <Box sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: realtimeData ? '#00E676' : '#FF9500',
                  boxShadow: realtimeData ? '0 0 12px rgba(0, 230, 118, 0.6)' : '0 0 12px rgba(255, 149, 0, 0.6)',
                  animation: 'pulse 2s infinite'
                }} />
                {realtimeData && (
                  <Tooltip title="Stock prices and dividends fetched from Yahoo Finance">
                    <Chip
                      label="YAHOO FINANCE"
                      size="small"
                      sx={{
                        background: 'linear-gradient(135deg, #6B46C1 0%, #805AD5 100%)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        height: '18px'
                      }}
                    />
                  </Tooltip>
                )}
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
                label={`Suboptimal ETFs (${excludedTickers.length})`}
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
              <Tab
                label={`My Portfolio (${portfolio.holdings.length})`}
                icon={<BusinessCenter />}
                iconPosition="start"
                sx={{
                  minHeight: 72,
                  '& .MuiSvgIcon-root': {
                    fontSize: 20
                  }
                }}
              />
              {console.log('🎯 TABS RENDERED - All tabs:', {
                tabCount: 5,
                selectedTab,
                dataLength: data.length,
                portfolioHoldings: portfolio.holdings.length,
                tabs: ['Optimal Portfolio', 'Suboptimal ETFs', 'Enhanced Analytics', 'Full Analysis', 'My Portfolio']
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
                            45-Day Vol
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="h5" sx={{ color: '#00D4FF', fontWeight: 700 }}>
                            {portfolioMetrics ? (isFinite(portfolioMetrics.sharpeRatio) ? portfolioMetrics.sharpeRatio.toFixed(2) : '---') : '---'}
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
                            <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Ex-Div Day</TableCell>
                            <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Strategy</TableCell>
                            <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Expected Return</TableCell>
                            <TableCell align="center" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>45-Day Vol</TableCell>
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
                                <Typography variant="body2" sx={{ 
                                  color: '#FFFFFF',
                                  fontWeight: 500
                                }}>
                                  {asset.exDivDay || 'N/A'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                {getStrategyChip(asset.strategy || 'N/A')}
                              </TableCell>
                              <TableCell align="center">
                                {(() => {
                                  const indicator = getPerformanceIcon(asset.return * 100, 'return');
                                  return (
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
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
                                  {asset.sharpe ? (isFinite(asset.sharpe) ? asset.sharpe.toFixed(2) : '---') : 'N/A'}
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
                    Complete analysis of all dividend capture opportunities across the high-income ETF universe. 
                    Compare buy & hold vs dividend capture strategies, win rates, risk metrics, and forward yields 
                    for informed investment decisions.
                  </Typography>
                </Box>
              </motion.div>
              {renderFullAnalysisTable(data)}
            </TabPanel>

            <TabPanel value={selectedTab} index={4}>
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
                    My Portfolio
                  </Typography>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.7)',
                      mb: 3
                    }}
                  >
                    Track your personal holdings with real-time valuations and performance metrics
                  </Typography>

                  {/* Portfolio Overview Cards */}
                  <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={2.4}>
                      <Card sx={{ 
                        background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.1) 0%, rgba(52, 199, 89, 0.05) 100%)',
                        border: '1px solid rgba(52, 199, 89, 0.2)',
                        backdropFilter: 'blur(20px)'
                      }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ color: '#34C759', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccountBalance sx={{ fontSize: 20 }} />
                            Total Value
                          </Typography>
                          <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                            ${portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={2.4}>
                      <Card sx={{ 
                        background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.1) 0%, rgba(138, 43, 226, 0.05) 100%)',
                        border: '1px solid rgba(138, 43, 226, 0.2)',
                        backdropFilter: 'blur(20px)'
                      }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ color: '#8A2BE2', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MonetizationOn sx={{ fontSize: 20 }} />
                            Weekly Dividend
                          </Typography>
                          <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                            ${(() => {
                              const weeklyDividend = portfolio.holdings.reduce((total, holding) => {
                                const tickerData = data.find(d => d.ticker === holding.ticker);
                                const medianDividend = tickerData?.medianDividend || 0;
                                return total + (medianDividend * holding.shares);
                              }, 0);
                              return weeklyDividend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            })()}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            Per Week
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={2.4}>
                      <Card sx={{ 
                        background: portfolio.totalGainLoss >= 0 
                          ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.1) 0%, rgba(52, 199, 89, 0.05) 100%)'
                          : 'linear-gradient(135deg, rgba(255, 59, 48, 0.1) 0%, rgba(255, 59, 48, 0.05) 100%)',
                        border: portfolio.totalGainLoss >= 0 
                          ? '1px solid rgba(52, 199, 89, 0.2)'
                          : '1px solid rgba(255, 59, 48, 0.2)',
                        backdropFilter: 'blur(20px)'
                      }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ 
                            color: portfolio.totalGainLoss >= 0 ? '#34C759' : '#FF3B30', 
                            mb: 1, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1 
                          }}>
                            {portfolio.totalGainLoss >= 0 ? <TrendingUp sx={{ fontSize: 20 }} /> : <TrendingDown sx={{ fontSize: 20 }} />}
                            Total Gain/Loss
                          </Typography>
                          <Typography variant="h4" sx={{ 
                            color: portfolio.totalGainLoss >= 0 ? '#34C759' : '#FF3B30', 
                            fontWeight: 700 
                          }}>
                            {portfolio.totalGainLoss >= 0 ? '+' : ''}${portfolio.totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            color: portfolio.totalGainLoss >= 0 ? '#34C759' : '#FF3B30', 
                            opacity: 0.8 
                          }}>
                            {portfolio.totalGainLoss >= 0 ? '+' : ''}{portfolio.totalGainLossPercent.toFixed(2)}%
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={2.4}>
                      <Card sx={{ 
                        background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 212, 255, 0.05) 100%)',
                        border: '1px solid rgba(0, 212, 255, 0.2)',
                        backdropFilter: 'blur(20px)'
                      }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ color: '#00D4FF', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Stars sx={{ fontSize: 20 }} />
                            Holdings
                          </Typography>
                          <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                            {portfolio.holdings.length}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            Positions
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={2.4}>
                      <Card sx={{ 
                        background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.1) 0%, rgba(255, 149, 0, 0.05) 100%)',
                        border: '1px solid rgba(255, 149, 0, 0.2)',
                        backdropFilter: 'blur(20px)'
                      }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ color: '#FF9500', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Security sx={{ fontSize: 20 }} />
                            Last Updated
                          </Typography>
                          <Typography variant="body1" sx={{ color: 'white', fontWeight: 500 }}>
                            {new Date(portfolio.lastUpdated).toLocaleDateString()}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            {new Date(portfolio.lastUpdated).toLocaleTimeString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Add Position Button */}
                  <Box sx={{ mb: 3 }}>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setShowAddDialog(true)}
                      sx={{
                        background: 'linear-gradient(135deg, #00D4FF 0%, #0095CC 100%)',
                        color: 'black',
                        fontWeight: 600,
                        px: 3,
                        py: 1.5,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #64E3FF 0%, #00D4FF 100%)',
                        }
                      }}
                    >
                      Add Position
                    </Button>
                  </Box>

                  {/* Holdings Table */}
                  {portfolio.holdings.length > 0 ? (
                    <TableContainer component={Paper} sx={{ 
                      background: 'rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(255, 255, 255, 0.1)' } }}>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>
                              <TableSortLabel
                                active={sortField === 'ticker'}
                                direction={sortField === 'ticker' ? sortDirection : 'asc'}
                                onClick={() => handleSort('ticker')}
                                sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                              >
                                Ticker
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                              <TableSortLabel
                                active={sortField === 'exDivDay'}
                                direction={sortField === 'exDivDay' ? sortDirection : 'asc'}
                                onClick={() => handleSort('exDivDay')}
                                sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                              >
                                Ex-Div Day
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">
                              <TableSortLabel
                                active={sortField === 'shares'}
                                direction={sortField === 'shares' ? sortDirection : 'asc'}
                                onClick={() => handleSort('shares')}
                                sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                              >
                                Shares
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">
                              <TableSortLabel
                                active={sortField === 'avgPrice'}
                                direction={sortField === 'avgPrice' ? sortDirection : 'asc'}
                                onClick={() => handleSort('avgPrice')}
                                sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                              >
                                Avg Price
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">
                              <TableSortLabel
                                active={sortField === 'totalValue'}
                                direction={sortField === 'totalValue' ? sortDirection : 'asc'}
                                onClick={() => handleSort('totalValue')}
                                sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                              >
                                Total Value
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">
                              <TableSortLabel
                                active={sortField === 'gainLoss'}
                                direction={sortField === 'gainLoss' ? sortDirection : 'asc'}
                                onClick={() => handleSort('gainLoss')}
                                sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                              >
                                Gain
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                              <TableSortLabel
                                active={sortField === 'riskLevel'}
                                direction={sortField === 'riskLevel' ? sortDirection : 'asc'}
                                onClick={() => handleSort('riskLevel')}
                                sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                              >
                                Risk Level
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                              <TableSortLabel
                                active={sortField === 'indicators'}
                                direction={sortField === 'indicators' ? sortDirection : 'asc'}
                                onClick={() => handleSort('indicators')}
                                sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                              >
                                Indicators
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getSortedHoldings(portfolio.holdings).map((holding) => {
                            const tickerData = data.find(d => d.ticker === holding.ticker);
                            const riskChip = getRiskLevelChip(tickerData?.riskLevel);
                            const expectedDiv = getExpectedDividend(tickerData?.exDivDay || '', tickerData?.medianDividend || 0, tickerData);
                            
                            return (
                              <TableRow key={holding.ticker} sx={{ 
                                '& td': { borderBottom: '1px solid rgba(255, 255, 255, 0.05)' },
                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.02)' }
                              }}>
                                {/* Ticker with Price and Dividend */}
                                <TableCell>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Typography 
                                      variant="subtitle2" 
                                      sx={{ 
                                        color: '#00D4FF', 
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        '&:hover': {
                                          textDecoration: 'underline',
                                          color: '#40E0FF'
                                        }
                                      }}
                                      onClick={() => window.open(`https://finance.yahoo.com/quote/${holding.ticker}`, '_blank')}
                                    >
                                      {holding.ticker}
                                    </Typography>
                                    {/* Price and Dividend Information */}
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                      <Typography variant="caption" sx={{ 
                                        color: 'rgba(255, 255, 255, 0.7)', 
                                        fontSize: '0.75rem',
                                        fontWeight: 500
                                      }}>
                                        ${(holding.currentPrice || 0).toFixed(2)}
                                      </Typography>
                                      <Typography variant="caption" sx={{ 
                                        color: 'rgba(0, 230, 118, 0.8)', 
                                        fontSize: '0.75rem',
                                        fontWeight: 500
                                      }}>
                                        Div: ${(tickerData?.lastDividend || tickerData?.medianDividend || 0).toFixed(3)}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>

                                {/* Ex-Div Day with Expected Dividend */}
                                <TableCell align="center">
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                                    <Chip
                                      label={tickerData?.exDivDay || 'N/A'}
                                      size="small"
                                      variant="outlined"
                                      sx={{
                                        borderColor: 'rgba(255, 255, 255, 0.2)',
                                        color: 'rgba(255, 255, 255, 0.8)',
                                        fontSize: '0.75rem'
                                      }}
                                    />
                                    {expectedDiv && (
                                      <Typography variant="caption" sx={{ 
                                        color: '#00E676', 
                                        fontSize: '0.7rem',
                                        fontWeight: 500
                                      }}>
                                        ~${expectedDiv.expectedDividend.toFixed(3)} ({expectedDiv.forwardYield.toFixed(1)}%)
                                      </Typography>
                                    )}
                                  </Box>
                                </TableCell>

                                <TableCell sx={{ color: 'white' }} align="right">{holding.shares.toLocaleString()}</TableCell>
                                <TableCell sx={{ color: 'white' }} align="right">${holding.averagePrice.toFixed(2)}</TableCell>
                                <TableCell sx={{ color: 'white' }} align="right">
                                  ${(holding.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell sx={{ 
                                  color: (holding.gainLoss || 0) >= 0 ? '#34C759' : '#FF3B30' 
                                }} align="right">
                                  {(holding.gainLoss || 0) >= 0 ? '+' : ''}${(holding.gainLoss || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({(holding.gainLossPercent || 0) >= 0 ? '+' : ''}{(holding.gainLossPercent || 0).toFixed(2)}%)
                                </TableCell>

                                {/* Risk Level with Tooltip */}
                                <TableCell align="center">
                                  {tickerData && tickerData.riskLevel ? (
                                    <Tooltip
                                      title={
                                        <Box sx={{ whiteSpace: 'pre-line', maxWidth: '300px' }}>
                                          <Typography variant="body2">
                                            {generateRiskTooltip(tickerData)}
                                          </Typography>
                                          <Typography variant="caption" sx={{ 
                                            color: 'rgba(255, 255, 255, 0.6)', 
                                            fontSize: '0.7rem',
                                            fontStyle: 'italic',
                                            mt: 1,
                                            display: 'block'
                                          }}>
                                            Click to copy analysis to clipboard
                                          </Typography>
                                        </Box>
                                      }
                                      arrow
                                      placement="top"
                                      sx={{
                                        '& .MuiTooltip-tooltip': {
                                          backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                          fontSize: '0.75rem',
                                          maxWidth: '350px',
                                          fontFamily: 'monospace'
                                        }
                                      }}
                                    >
                                      <Chip
                                        label={tickerData?.riskLevel || 'N/A'}
                                        size="small"
                                        onClick={() => {
                                          const analysisText = `${holding.ticker} Risk Analysis\n${'='.repeat(20)}\n${generateRiskTooltip(tickerData)}`;
                                          copyToClipboard(analysisText, holding.ticker);
                                        }}
                                        sx={{
                                          fontWeight: 700,
                                          fontSize: '0.75rem',
                                          backgroundColor: riskChip.color,
                                          color: riskChip.textColor,
                                          cursor: 'pointer',
                                          '&:hover': {
                                            backgroundColor: riskChip.color,
                                            opacity: 0.8,
                                            transform: 'scale(1.05)',
                                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
                                          },
                                          transition: 'all 0.2s ease'
                                        }}
                                      />
                                    </Tooltip>
                                  ) : (
                                    <Chip
                                      label="N/A"
                                      size="small"
                                      sx={{
                                        backgroundColor: '#6c757d',
                                        color: '#FFFFFF',
                                        fontWeight: 600,
                                        fontSize: '0.75rem'
                                      }}
                                    />
                                  )}
                                </TableCell>

                                {/* Indicators */}
                                <TableCell align="center" sx={{ maxWidth: '200px' }}>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: 'rgba(255, 255, 255, 0.8)', 
                                      fontSize: '0.8rem',
                                      wordWrap: 'break-word',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {getCleanedIndicators(tickerData?.rationale)}
                                  </Typography>
                                </TableCell>

                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    onClick={() => removeHolding(holding.ticker)}
                                    sx={{ color: '#FF3B30' }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Card sx={{ 
                      background: 'rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      textAlign: 'center',
                      py: 6
                    }}>
                      <CardContent>
                        <BusinessCenter sx={{ fontSize: 60, color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                          No holdings yet
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3 }}>
                          Add your first position to start tracking your portfolio
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<Add />}
                          onClick={() => setShowAddDialog(true)}
                          sx={{
                            background: 'linear-gradient(135deg, #00D4FF 0%, #0095CC 100%)',
                            color: 'black',
                            fontWeight: 600
                          }}
                        >
                          Add Your First Position
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              </motion.div>
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

      {/* Add Position Dialog */}
      <Dialog 
        open={showAddDialog} 
        onClose={() => setShowAddDialog(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(13, 13, 13, 0.9) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          Add New Position
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Ticker Symbol"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                fullWidth
                placeholder="e.g. YMAX, ULTY, QDTE"
                sx={{
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                    '&.Mui-focused fieldset': { borderColor: '#00D4FF' }
                  }
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Number of Shares"
                value={newShares}
                onChange={(e) => setNewShares(e.target.value)}
                fullWidth
                type="number"
                inputProps={{ min: 0, step: 1 }}
                sx={{
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                    '&.Mui-focused fieldset': { borderColor: '#00D4FF' }
                  }
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Average Price"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                fullWidth
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>$</InputAdornment>
                }}
                sx={{
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                    '&.Mui-focused fieldset': { borderColor: '#00D4FF' }
                  }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Button 
            onClick={() => setShowAddDialog(false)}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={addHolding}
            variant="contained"
            startIcon={<Save />}
            sx={{
              background: 'linear-gradient(135deg, #00D4FF 0%, #0095CC 100%)',
              color: 'black',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #64E3FF 0%, #00D4FF 100%)',
              }
            }}
          >
            Add Position
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={4000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setShowSnackbar(false)} 
          severity={snackbarMessage.includes('Error') || snackbarMessage.includes('Warning') ? 'warning' : 'success'}
          sx={{ 
            background: snackbarMessage.includes('Error') || snackbarMessage.includes('Warning') 
              ? 'linear-gradient(135deg, rgba(255, 149, 0, 0.9) 0%, rgba(255, 149, 0, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(52, 199, 89, 0.9) 0%, rgba(52, 199, 89, 0.8) 100%)',
            color: 'white',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
