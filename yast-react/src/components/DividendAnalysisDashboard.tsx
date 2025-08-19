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
  MonetizationOn,
  Refresh,
  Search,
  ContentCopy
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { dividendData, analysisMetadata, type Asset as DividendAsset } from '../data/dividendData';
// import CandlestickChart from './CandlestickChart';

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
  riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE' | 'pending';
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

function calculateMPTAllocation(allData: DividendData[], aiOutlooks?: Record<string, { sentiment: string; shortOutlook: string; fullAnalysis: string; timestamp: string }>): { allocation: AllocationItem[], metrics: PortfolioMetrics } {
  
  // Use ALL data (not just top performers) so filtering logic can work properly
  let allETFs = allData.filter(etf => etf.ticker !== 'SPY' && etf.category !== 'benchmark');
  
  // Filter out bearish ETFs if AI sentiment data is available and enabled
  if (aiOutlooks && Object.keys(aiOutlooks).length > 0) {
    const initialCount = allETFs.length;
    const excludedTickers: string[] = [];
    
    try {
      allETFs = allETFs.filter(etf => {
        const sentiment = aiOutlooks[etf.ticker]?.sentiment;
        if (sentiment && typeof sentiment === 'string') {
          const isNegative = sentiment.toLowerCase().includes('bearish');
          if (isNegative) {
            excludedTickers.push(etf.ticker);
            return false; // Exclude bearish ETFs
          }
        }
        return true; // Include neutral, bullish, or ETFs without sentiment data
      });
      
      const finalCount = allETFs.length;
    } catch (error) {
      console.warn('Error filtering bearish ETFs:', error);
      // Continue without filtering if there's an error
    }
  }
  
  
  // If no ETFs remain after filtering, return empty allocation
  if (allETFs.length === 0) {
    console.warn('⚠️ No ETFs available for allocation after filtering');
    return { 
      allocation: [], 
      metrics: {
        expectedReturn: 0,
        portfolioRisk: 0,
        sharpeRatio: 0,
        totalAllocation: 0
      }
    };
  }
  
  // Log the ETFs we're working with
  
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
    }
  }
  
  return penalty;
};

function optimizePortfolioWithRiskConstraint(assets: Asset[], maxRisk: number): AllocationItem[] {
  // Version identifier for deployment verification
  assets.forEach(asset => {
    if (asset.ticker !== 'CASH') {
    }
  });
  
  
  // Filter out high-risk tickers (>40% risk) if lower-risk alternatives exist on the same ex-div date
  // BUT preserve ETFs that qualify for Rule 2 (>30% div capture, 10% holding regardless of risk)
  // ALSO filter out weak performers when much better alternatives exist on same ex-div day
  const filteredAssets = assets.filter(asset => {
    // Always include CASH and SPY
    if (asset.ticker === 'CASH' || asset.ticker === 'SPY') return true;
    
    // ALWAYS INCLUDE Rule 1 and Rule 2 ETFs - they are protected from filtering
    if (asset.isRule1 || asset.isRule2) {
      return true;
    }
    
    // RULE 1 CHECK FIRST: ETFs with >40% return AND <40% risk are ALWAYS included
    if (asset.return > 0.40 && asset.risk < 0.40) {
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
      
      // Special rule: If there are superior ETFs on same ex-div day, exclude regardless of return threshold
      const superiorSameExDivAssets = assets.filter(other => 
        other.ticker !== asset.ticker && 
        other.exDivDay === asset.exDivDay &&
        other.ticker !== 'CASH' && 
        other.ticker !== 'SPY' &&
        other.return > asset.return // Only count superior alternatives
      );
      
      
      if (superiorSameExDivAssets.length > 0) {
        return false;
      } else {
        // SET Rule 2 flag here since no better alternatives exist
        asset.isRule2 = true;
      }
      
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
          return false;
        }
      }
      return true;
    }
    
    // THIRD: If this asset has risk > 40% and doesn't qualify for Rule 2, 
    // only include it if no lower-risk alternative exists on the same ex-div date
    const hasLowerRiskAlternative = sameExDivAssets.some(other => other.risk < asset.risk);
    
    if (hasLowerRiskAlternative) {
      return false;
    }
    
    return true;
  });
  
  const etfsPassedFilter = filteredAssets.filter(a => a.ticker !== 'CASH' && a.ticker !== 'SPY');
  etfsPassedFilter.forEach(asset => {
  });
  
  
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
      }
    }
  }
  
  // Check portfolio risk so far
  let portfolioVariance = allocation.reduce((sum, a) => sum + Math.pow(a.weight * a.risk, 2), 0);
  let portfolioRisk = Math.sqrt(portfolioVariance);
  
  
  // Step 3: Enhanced allocation using efficient frontier analysis and Sharpe optimization
  
  // Calculate target portfolio return based on best available assets
  const topAssets = workingAssets
    .filter(asset => asset.ticker !== 'CASH' && asset.ticker !== 'SPY')
    .sort((a, b) => b.sharpe - a.sharpe)
    .slice(0, 8); // Top 8 by Sharpe ratio
  
  const targetReturn = topAssets.length > 0 ? 
    topAssets.reduce((sum, asset) => sum + asset.return, 0) / topAssets.length * 0.8 : // 80% of average top return
    0.30; // Fallback to 30% target
  
  
  // Try to increase allocations of existing holdings using Sharpe-weighted optimization
  for (const holding of allocation) {
    if (holding.weight < 0.20 && totalWeight < 1.0) {
      // Calculate optimal increase based on Sharpe ratio and risk constraints
      const maxIncrease = Math.min(0.20 - holding.weight, 1.0 - totalWeight);
      let optimalIncrease = 0;
      let maxSharpe = 0;
      
      // Test incremental increases with Sharpe optimization
      for (let increase = 0.01; increase <= maxIncrease; increase += 0.01) {
        const testAllocation = allocation.map(a => 
          a.ticker === holding.ticker 
            ? { ...a, weight: a.weight + increase }
            : a
        );
        
        const testMetrics = calculatePortfolioMetrics(testAllocation);
        
        // Accept if risk constraint met AND Sharpe ratio improved
        if (testMetrics.risk <= maxRisk && testMetrics.sharpeRatio > maxSharpe) {
          optimalIncrease = increase;
          maxSharpe = testMetrics.sharpeRatio;
        }
      }
      
      if (optimalIncrease > 0) {
        holding.weight += optimalIncrease;
        totalWeight += optimalIncrease;
      }
    }
  }
  
  // Step 4: Enhanced asset selection using mean variance optimization with proper weight differentiation
  const remainingAssets = sortedAssets.filter(asset => 
    !allocation.some(a => a.ticker === asset.ticker) &&
    asset.ticker !== 'CASH' &&
    asset.ticker !== 'SPY'
  );
  
  // Sort by risk-adjusted return (Sharpe ratio) for better selection
  const sharpeOptimizedAssets = remainingAssets.sort((a, b) => b.sharpe - a.sharpe);
  
  
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
  }
  
  // Final portfolio optimization and metrics
  const finalMetrics = calculatePortfolioMetrics(allocation);
  const finalReturn = finalMetrics.expectedReturn;
  const finalRisk = finalMetrics.risk;
  const finalSharpe = finalMetrics.sharpeRatio;
  
  allocation.forEach(asset => {
  });
  
  // Additional portfolio efficiency metrics
  const returnToRiskRatio = finalRisk > 0 ? finalReturn / finalRisk : 0;
  const diversificationRatio = allocation.length / Math.max(1, allocation.filter(a => a.weight > 0.10).length);
  
  
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
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  
  // Cookie banner state
  const [showCookieBanner, setShowCookieBanner] = useState(() => {
    return !localStorage.getItem('cookieAccepted');
  });
  
  // Candlestick chart tooltip state
  const [candlestickTooltip, setCandlestickTooltip] = useState<{
    open: boolean;
    ticker: string;
    anchorEl: HTMLElement | null;
  }>({
    open: false,
    ticker: '',
    anchorEl: null
  });
  
  // Portfolio table sorting state
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Quick Analysis state
  const [quickAnalysisOpen, setQuickAnalysisOpen] = useState(false);
  const [quickTicker, setQuickTicker] = useState('');
  const [quickAnalysisResult, setQuickAnalysisResult] = useState('');
  const [quickAnalysisLoading, setQuickAnalysisLoading] = useState(false);

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
            
            
            // Debug risk level data
            const riskLevels = performanceData.map((item: any) => item.riskLevel).filter((rl: any) => rl);
            
            // Try to load real-time data
            let realtimeDataValue: any = null;
            if (realtimeResponse && realtimeResponse.ok) {
              try {
                const realtimeJson = await realtimeResponse.json();
                if (realtimeJson && realtimeJson.data && typeof realtimeJson.data === 'object') {
                  realtimeDataValue = realtimeJson.data || {};
                  setRealtimeData(realtimeDataValue);
                } else {
                }
              } catch (e) {
              }
            } else {
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
                riskLevel: (item.riskLevel && typeof item.riskLevel === 'string' && item.riskLevel.toUpperCase() !== 'PENDING') ? item.riskLevel : 'pending', // Convert PENDING to pending
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
            throw new Error('JSON files not found, falling back to static data');
          }
        } catch (jsonError) {
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
            }
          } catch (e) {
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
        
        // Portfolio calculation moved to separate useEffect to include AI filtering
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Auto-refresh portfolio with AI filtering once data and AI outlooks are loaded
  useEffect(() => {
    if (data.length > 0 && Object.keys(aiOutlooks).length > 0 && !loading) {
      try {
        const { allocation, metrics } = calculateMPTAllocation(data, aiOutlooks);
        if (allocation && allocation.length > 0) {
          const enrichedAllocation = allocation.map(asset => {
            const originalETF = data.find(etf => etf.ticker === asset.ticker);
            return {
              ...asset,
              exDivDay: originalETF?.exDivDay,
              strategy: originalETF?.bestStrategy
            };
          });
          setMptAllocation(enrichedAllocation);
          setPortfolioMetrics(metrics);
        } else {
          console.warn('⚠️ No allocation generated - all ETFs may be filtered out');
        }
      } catch (error) {
        console.error('Error during portfolio auto-refresh:', error);
      }
    }
    // Remove data and aiOutlooks from dependencies to avoid circular updates
  }, [loading]);

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
    } else if (data.length > 0) {
      // Initialize with sample portfolio if no saved portfolio exists
      const sampleHoldings: PortfolioHolding[] = [
        {
          ticker: 'YMAX',
          shares: 100,
          averagePrice: 25.50,
          dateAdded: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week ago
        },
        {
          ticker: 'QDTE',
          shares: 50,
          averagePrice: 18.75,
          dateAdded: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() // 2 weeks ago
        },
        {
          ticker: 'ULTY',
          shares: 75,
          averagePrice: 12.30,
          dateAdded: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString() // 3 weeks ago
        }
      ];

      const samplePortfolio: UserPortfolio = {
        id: 'sample',
        name: 'My Portfolio',
        holdings: sampleHoldings,
        totalValue: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        lastUpdated: new Date().toISOString()
      };

      updatePortfolioValues(samplePortfolio);
      
      // Auto-refresh AI analysis for sample portfolio holdings after a short delay
      setTimeout(() => {
        const tickers = sampleHoldings.map(h => h.ticker);
        refreshAiAnalysis(tickers);
      }, 2000);
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

  // Cookie banner handler
  const handleAcceptCookies = () => {
    localStorage.setItem('cookieAccepted', 'true');
    setShowCookieBanner(false);
  };

  // Candlestick tooltip handlers
  const handlePriceHover = (event: React.MouseEvent<HTMLElement>, ticker: string) => {
    setCandlestickTooltip({
      open: true,
      ticker: ticker,
      anchorEl: event.currentTarget
    });
  };

  const handlePriceLeave = () => {
    setCandlestickTooltip({
      open: false,
      ticker: '',
      anchorEl: null
    });
  };

  // State for managing two-step screenshot process
  const [waitingForScreenshot, setWaitingForScreenshot] = useState<string | null>(null);
  
  // State for storing AI outlooks
  const [aiOutlooks, setAiOutlooks] = useState<Record<string, { sentiment: string; shortOutlook: string; fullAnalysis: string; timestamp: string }>>(() => {
    const saved = localStorage.getItem('aiOutlooks');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Handle backward compatibility with old structure
      const converted: Record<string, { sentiment: string; shortOutlook: string; fullAnalysis: string; timestamp: string }> = {};
      for (const [ticker, data] of Object.entries(parsed)) {
        const oldData = data as any;
        if (oldData.analysis && !oldData.shortOutlook) {
          // Old structure - convert to new structure
          converted[ticker] = {
            sentiment: 'Neutral',
            shortOutlook: oldData.analysis,
            fullAnalysis: oldData.analysis,
            timestamp: oldData.timestamp
          };
        } else {
          // New structure already - ensure sentiment field exists
          converted[ticker] = {
            sentiment: (data as any).sentiment || 'Neutral',
            shortOutlook: (data as any).shortOutlook,
            fullAnalysis: (data as any).fullAnalysis,
            timestamp: (data as any).timestamp
          };
        }
      }
      return converted;
    }
    return {};
  });

  // AI Analysis function - Step 1: Open chart
  const analyzeWithClaude = async (ticker: string) => {
    try {
      // If we're already waiting for a screenshot, this is step 2
      if (waitingForScreenshot === ticker) {
        setAiAnalysisLoading(ticker);
        
        // Create file input for screenshot upload
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        // Wait for user to select screenshot
        const file = await new Promise<File | null>((resolve) => {
          fileInput.onchange = (e: any) => {
            const file = e.target.files[0];
            document.body.removeChild(fileInput);
            resolve(file);
          };
          fileInput.click();
        });

        if (!file) {
          setAiAnalysisLoading(null);
          setWaitingForScreenshot(null);
          return;
        }

        // Convert image to base64
        const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Get stock data for the analysis
        const stockData = data.find(d => d.ticker === ticker);
        if (!stockData) {
          throw new Error('Stock data not found');
        }

        // Prepare the prompt for image analysis
        const prompt = `Analyze this ${ticker} candlestick chart screenshot for trading opportunities:

STOCK FUNDAMENTALS:
Ticker: ${ticker}
Current Price: $${stockData.currentPrice?.toFixed(2) || 'N/A'}
Risk Level: ${stockData.riskLevel || 'Unknown'}
Volatility: ${stockData.riskVolatility ? (stockData.riskVolatility * 100).toFixed(1) + '%' : 'N/A'}
Median Dividend: $${stockData.medianDividend?.toFixed(3) || 'N/A'}
Forward Yield: ${stockData.forwardYield ? stockData.forwardYield.toFixed(2) + '%' : 'N/A'}
Best Strategy Return: ${stockData.bestReturn?.toFixed(2) || 'N/A'}%
Win Rate: ${stockData.dcWinRate?.toFixed(1) || 'N/A'}%
Current Rationale: ${stockData.rationale || 'None'}

CHART ANALYSIS REQUEST:
Please analyze the candlestick chart image and provide:

1. **Pattern Recognition**: Identify any candlestick patterns (doji, hammer, engulfing, hanging man, shooting star, etc.)
2. **Support & Resistance**: Key levels visible on the chart
3. **Trend Analysis**: Current trend direction and strength
4. **Volume Analysis**: Volume patterns and their significance
5. **Entry/Exit Points**: Specific price levels for trades based on chart patterns
6. **Risk Management**: Stop-loss and take-profit recommendations
7. **Short-term Outlook**: 1-week technical forecast
8. **Dividend Timing**: Best timing for dividend capture based on chart patterns

Focus on actionable insights from the visual chart patterns and price action.`;

      // Call our Netlify function with image and prompt
      const response = await fetch('/.netlify/functions/claude-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          image: base64Image
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed: ${response.status}`);
      }

      const result = await response.json();
      const analysis = result.analysis;
      
      // Extract just the short-term outlook content
      let shortOutlook = '';
      
      // Try to find short-term outlook section
      const shortTermMatch = analysis.match(/(?:short[- ]?term outlook|1[- ]?week[^:]*?)[:.\s]*(.*?)(?:\n\n|\n\d+\.|$)/is);
      if (shortTermMatch) {
        shortOutlook = shortTermMatch[1].trim();
      } else {
        // Try to find any outlook or forecast
        const outlookMatch = analysis.match(/(?:outlook|forecast|expect|anticipate)[:\s]*(.*?)(?:\.\s|$)/i);
        if (outlookMatch) {
          shortOutlook = outlookMatch[1].trim();
        } else {
          // Look for bullish/bearish sentiment
          const sentimentMatch = analysis.match(/(?:bullish|bearish|neutral|positive|negative)\s+(?:outlook|momentum|trend|bias).*?([^.]+\.)/i);
          shortOutlook = sentimentMatch ? sentimentMatch[0].trim() : 'Analysis pending';
        }
      }
      
      // Clean up the outlook - remove "Based on" phrases
      shortOutlook = shortOutlook
        .replace(/^based on.*?chart[,\s]*/i, '')
        .replace(/^based on.*?analysis[,\s]*/i, '')
        .replace(/^the candlestick.*?shows?[,\s]*/i, '')
        .replace(/^the chart.*?indicates?[,\s]*/i, '')
        .trim();
      
      // Capitalize first letter
      if (shortOutlook) {
        shortOutlook = shortOutlook.charAt(0).toUpperCase() + shortOutlook.slice(1);
      }
      
      // Save both short outlook and full analysis with timestamp
      const newOutlook = {
        sentiment: 'Neutral', // Default for legacy analysis
        shortOutlook: shortOutlook || 'Analysis pending',
        fullAnalysis: analysis,
        timestamp: new Date().toLocaleString()
      };
      
      setAiOutlooks(currentOutlooks => {
        const updatedOutlooks = {
          ...currentOutlooks,
          [ticker]: newOutlook
        };
        localStorage.setItem('aiOutlooks', JSON.stringify(updatedOutlooks));
        return updatedOutlooks;
      });
      
      setAiAnalysisResult(analysis);
      setShowAiModal(true);
      setSnackbarMessage(`AI analysis complete for ${ticker}`);
      setShowSnackbar(true);
      setWaitingForScreenshot(null);

      } else {
        // Step 1: Open chart and set waiting state
        const chartUrl = `https://finance.yahoo.com/quote/${ticker}/chart?interval=30m&range=5d`;
        window.open(chartUrl, '_blank', 'width=1200,height=800');
        setWaitingForScreenshot(ticker);
        setSnackbarMessage(`Chart opened. Take a screenshot, then click the robot button again to upload it.`);
        setShowSnackbar(true);
      }

    } catch (error) {
      console.error('AI Analysis error:', error);
      setSnackbarMessage(`AI Analysis failed: ${error.message}`);
      setShowSnackbar(true);
      setWaitingForScreenshot(null);
    } finally {
      setAiAnalysisLoading(null);
    }
  };

  // Real Polygon API analysis function
  const analyzeWithPolygon = async (ticker: string) => {
    try {
      setAiAnalysisLoading(ticker);
      
      // Fetch real data from Polygon API via serverless function
      // This ensures API keys stay secure on the server side
      const requestBody = { ticker };
      
      const polygonResponse = await fetch('/.netlify/functions/polygon-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      const responseText = await polygonResponse.text();
      
      if (!polygonResponse.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        throw new Error(errorData.error || `Polygon API error: ${polygonResponse.status}`);
      }
      
      const polygonData = JSON.parse(responseText);
      if (!polygonData.results || polygonData.results.length === 0) {
        throw new Error('No data available from Polygon API');
      }

      // Process the real 15-minute market data
      const results = polygonData.results;
      const latest = results[results.length - 1];
      
      // For 15-minute data, calculate recent performance
      const currentPrice = latest.c;
      const oneDayAgo = results[results.length - 26] || results[0]; // ~26 15-min bars = 1 trading day
      const twoDaysAgo = results[results.length - 52] || results[0]; // ~52 15-min bars = 2 trading days
      
      const dailyChange = oneDayAgo ? ((currentPrice - oneDayAgo.c) / oneDayAgo.c) * 100 : 0;
      const twoDayChange = twoDaysAgo ? ((currentPrice - twoDaysAgo.c) / twoDaysAgo.c) * 100 : 0;

      // Calculate traditional RSI using Wilder's smoothing (exponentially weighted moving average)
      let rsi = 0;
      if (results.length >= 15) { // Need 15 bars: 1 + 14 periods
        const prices = results.slice(-Math.min(results.length, 50)).map((r: any) => r.c); // Use up to 50 bars for better smoothing
        const changes = [];
        
        // Calculate price changes
        for (let i = 1; i < prices.length; i++) {
          changes.push(prices[i] - prices[i - 1]);
        }
        
        // Initial simple averages for first 14 periods
        let gains = 0;
        let losses = 0;
        
        for (let i = 0; i < 14; i++) {
          if (changes[i] > 0) {
            gains += changes[i];
          } else {
            losses += Math.abs(changes[i]);
          }
        }
        
        let avgGain = gains / 14;
        let avgLoss = losses / 14;
        
        // Apply Wilder's smoothing for subsequent periods
        for (let i = 14; i < changes.length; i++) {
          const gain = changes[i] > 0 ? changes[i] : 0;
          const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
          
          // Wilder's smoothing: new_avg = ((old_avg * 13) + current_value) / 14
          avgGain = ((avgGain * 13) + gain) / 14;
          avgLoss = ((avgLoss * 13) + loss) / 14;
        }
        
        // Calculate RSI
        if (avgLoss > 0) {
          const rs = avgGain / avgLoss;
          rsi = 100 - (100 / (1 + rs));
        } else {
          rsi = 100; // All gains, no losses
        }
      }

      // Calculate SMAs with 15-minute data (shorter periods for intraday)
      const sma20 = results.length >= 20 ? 
        results.slice(-20).reduce((sum: number, r: any) => sum + r.c, 0) / 20 : currentPrice; // ~5 hour SMA
      const sma50 = results.length >= 50 ? 
        results.slice(-50).reduce((sum: number, r: any) => sum + r.c, 0) / 50 : currentPrice; // ~12.5 hour SMA

      // Get latest trading session high/low
      const recentBars = results.slice(-26); // Last trading day
      const sessionHigh = Math.max(...recentBars.map((r: any) => r.h));
      const sessionLow = Math.min(...recentBars.map((r: any) => r.l));

      // Enhanced technical analysis preprocessing (like Claude does)
      
      // Fibonacci retracement levels
      const range = sessionHigh - sessionLow;
      const fib236 = sessionLow + (range * 0.236);
      const fib382 = sessionLow + (range * 0.382);
      const fib50 = sessionLow + (range * 0.5);
      const fib618 = sessionLow + (range * 0.618);

      // Identify key support and resistance from recent price action
      const supportResistanceBars = results.slice(-30);
      const highs = supportResistanceBars.map((r: any) => r.h);
      const lows = supportResistanceBars.map((r: any) => r.l);

      // Find most tested levels (price areas hit multiple times)
      const priceHits: Record<number, number> = {};
      highs.concat(lows).forEach(price => {
        const roundedPrice = Math.round(price * 4) / 4; // Round to nearest quarter
        priceHits[roundedPrice] = (priceHits[roundedPrice] || 0) + 1;
      });

      const significantLevels = Object.entries(priceHits)
        .filter(([price, hits]) => hits >= 2)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 6)
        .map(([price, hits]) => {
          const level = parseFloat(price);
          const type = level > currentPrice ? 'RESISTANCE' : 'SUPPORT';
          return `$${level.toFixed(2)} (${hits} hits) - ${type}`;
        });

      // Candlestick pattern analysis - only during regular trading hours (9:30 AM - 4:00 PM EST)
      // Filter bars to only include regular trading hours
      const tradingHoursBars = results.filter((bar: any) => {
        const timestamp = bar.t;
        if (!timestamp) return false;
        
        try {
          // Convert to Eastern Time using more robust approach
          const dtUtc = new Date(timestamp);
          
          // Get individual components in EST timezone
          const estHour = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            hour: 'numeric',
            hour12: false
          }).format(dtUtc);
          
          const estMinute = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            minute: 'numeric'
          }).format(dtUtc);
          
          const estWeekday = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            weekday: 'short'
          }).format(dtUtc);
          
          const hour = parseInt(estHour, 10);
          const minute = parseInt(estMinute, 10);
          
          // Check if during regular trading hours (9:30 AM - 4:00 PM EST)
          // Also check if it's a weekday (exclude weekends)
          const isWeekday = !['Sat', 'Sun'].includes(estWeekday);
          const isRegularHours = (hour === 9 && minute >= 30) || 
                                 (hour >= 10 && hour < 16) || 
                                 (hour === 16 && minute === 0); // Include 4:00 PM bar
          
          return isWeekday && isRegularHours;
        } catch (error) {
          console.warn('Error filtering trading hours for bar:', bar.t, error);
          return true; // Include bar if filtering fails
        }
      });

      // Log filtering results for debugging
      console.log(`🕯️ Found ${tradingHoursBars.length} bars during regular trading hours (out of ${results.length} total)`);

      // Use last 20 trading hours bars, but focus on most recent 10 for pattern analysis
      const patternBars = tradingHoursBars.slice(-20);
      // Focus on the most recent bars for pattern analysis (last 10 bars instead of all 20)
      const recentPatternBars = patternBars.slice(-10);
      let totalPatternPoints = 0;
      let patternCount = 0;
      const candlestickAnalysis: string[] = [];

      recentPatternBars.forEach((bar: any) => {
        const bodySize = Math.abs(bar.c - bar.o);
        const totalRange = bar.h - bar.l;
        const upperWick = bar.h - Math.max(bar.o, bar.c);
        const lowerWick = Math.min(bar.o, bar.c) - bar.l;
        
        let pattern = "";
        let points = 0;
        
        if (bodySize < 0.03) {
          pattern += "DOJI ";
          points += 1;
        }
        if (lowerWick > bodySize * 2) {
          pattern += "HAMMER ";
          if (bar.c > bar.o) points += 2; // Only bullish hammers get points
        }
        
        // Only include bars that score points
        if (points > 0) {
          const direction = bar.c > bar.o ? "BULLISH" : "BEARISH";
          // Convert UTC to ET (Eastern Time)
          const utcDate = new Date(bar.t);
          // Format date in ET timezone
          const etString = utcDate.toLocaleString("en-US", {
            timeZone: "America/New_York",
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          // Convert MM/DD/YYYY, HH:MM to YYYY-MM-DD HH:MM ET
          const [date, time] = etString.split(', ');
          const [month, day, year] = date.split('/');
          const datetime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time} ET`;
          totalPatternPoints += points;
          patternCount++;
          
          candlestickAnalysis.push(`${datetime}: ${direction} ${pattern.trim()} | Body: ${bodySize.toFixed(2)} | Range: ${totalRange.toFixed(2)} [+${points}pts]`);
        }
      });

      // Calculate pattern strength score (0-10 scale) with proper formula
      let patternStrength = 0;
      if (patternCount > 0) {
        // Numerator: total pattern points scored
        const numerator = totalPatternPoints;
        // Denominator: 5 points * number of patterns detected (maximum possible score)
        const denominator = 5 * patternCount;
        
        // Calculate strength as ratio, then scale to 0-10
        patternStrength = (numerator / denominator) * 10;
        patternStrength = Math.round(patternStrength * 10) / 10; // Round to 1 decimal
      }

      // Take only the most recent 5 pattern bars that scored points
      const recentPatterns = candlestickAnalysis.slice(-5);

      // Volume analysis  
      const avgVolume = results.slice(-20).reduce((sum: number, bar: any) => sum + bar.v, 0) / 20;
      const latestVolume = latest.v;
      const volumeRatio = latestVolume / avgVolume;
      const volumeStatus = volumeRatio > 1.5 ? 'HIGH' : volumeRatio < 0.5 ? 'LOW' : 'NORMAL';

      // Create enhanced data summary with comprehensive preprocessing
      const dataSummary = `COMPREHENSIVE TECHNICAL ANALYSIS for ${ticker}:

== PRICE DATA ==
- Current Price: $${currentPrice.toFixed(2)}
- Daily Change: ${dailyChange > 0 ? '+' : ''}${dailyChange.toFixed(2)}%
- 2-Day Change: ${twoDayChange > 0 ? '+' : ''}${twoDayChange.toFixed(2)}%
- Session High: $${sessionHigh.toFixed(2)}
- Session Low: $${sessionLow.toFixed(2)}
- RSI (14-period): ${rsi.toFixed(1)}
- Price vs 20-period SMA: ${currentPrice > sma20 ? 'above' : 'below'} ($${sma20.toFixed(2)})
- Price vs 50-period SMA: ${currentPrice > sma50 ? 'above' : 'below'} ($${sma50.toFixed(2)})

== FIBONACCI RETRACEMENT LEVELS ==
- 23.6% Retracement: $${fib236.toFixed(2)}
- 38.2% Retracement: $${fib382.toFixed(2)}
- 50.0% Retracement: $${fib50.toFixed(2)}
- 61.8% Retracement: $${fib618.toFixed(2)}

== KEY SUPPORT/RESISTANCE LEVELS (most tested) ==
${significantLevels.join('\n')}

== RECENT CANDLESTICK PATTERNS (Bars with signals) ==
${recentPatterns.length > 0 ? recentPatterns.join('\n') : 'No significant patterns in recent bars'}
Pattern Strength Score: ${patternStrength.toFixed(1)}/10

== VOLUME ANALYSIS ==
- Latest Volume: ${latestVolume.toLocaleString()}
- 20-Bar Average: ${Math.round(avgVolume).toLocaleString()}
- Volume Ratio: ${volumeRatio.toFixed(2)}x average (${volumeStatus})

Data points: ${results.length} 15-minute bars (${Math.floor(results.length/26)} trading days)`;

      // Use our existing claude-analysis Netlify function
      const response = await fetch('/.netlify/functions/claude-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: `Analyze this real market data for ${ticker}:

${dataSummary}

Please provide a comprehensive technical analysis with SPECIFIC PRICE TARGETS:

CRITICAL: Your sentiment rating MUST align with your price targets. If you predict higher prices, you cannot be bearish. If you predict lower prices, you cannot be bullish.

SENTIMENT RATING - Use this exact format:
SENTIMENT: [Bullish 5/5 | Bullish 4/5 | Bullish 3/5 | Bullish 2/5 | Bullish 1/5 | Neutral | Bearish 1/5 | Bearish 2/5 | Bearish 3/5 | Bearish 4/5 | Bearish 5/5]

SENTIMENT LOGIC CHECK:
Before assigning your rating, complete this logic check:

If 1-week AND 2-week targets are ABOVE current price → Must be Bullish (1/5 to 5/5)
If 1-week AND 2-week targets are BELOW current price → Must be Bearish (1/5 to 5/5)
If targets are mixed (one up, one down) → Must be Neutral or weak rating (1/5)
Rate strength based on: RSI extremes, distance from SMAs, pattern strength, volume

Enhanced Rating Guidelines:

Bullish 5/5: RSI >70 OR <20 with strong reversal patterns + targets >5% above current
Bullish 4/5: RSI 60-70 OR 20-30 with reversal signals + targets 3-5% above current
Bullish 3/5: RSI 50-60 OR 30-40 with some positive signals + targets 1-3% above current
Bullish 2/5: RSI 40-50 with weak bullish signals + targets barely above current
Bullish 1/5: Mixed signals but slight upside bias + targets <1% above current
Neutral: Truly mixed signals with targets around current price
Bearish 1/5: Mixed signals but slight downside bias + targets <1% below current
Bearish 2/5: RSI 50-60 with weak bearish signals + targets barely below current
Bearish 3/5: RSI 40-50 OR 60-70 with negative signals + targets 1-3% below current
Bearish 4/5: RSI 30-40 OR 70-80 with strong bearish signals + targets 3-5% below current
Bearish 5/5: RSI <30 OR >80 with breakdown patterns + targets >5% below current

IMPORTANT: Extreme RSI readings (<20 or >80) can be bullish if showing reversal patterns, or bearish if showing continuation. Context matters more than the number alone.

1. **Short-term outlook** (1-2 weeks): Expected price range with specific dollar amounts

2. **Candlestick Pattern Analysis**: 
   - Identify specific candlestick patterns (doji, hammer, shooting star, engulfing, etc.)
   - Note any reversal or continuation patterns in the recent 15-minute bars
   - Analyze the significance of wicks/shadows and body sizes
   - Comment on volume confirmation with candlestick patterns

3. **Technical pattern analysis** based on price movement and chart patterns

4. **RSI interpretation** (current reading: ${rsi.toFixed(1)})

5. **Moving average analysis** (price vs SMA 20/50)

6. **Risk assessment**: 
   - SPECIFIC price level where you should cut losses (exact $ amount)
   - SPECIFIC price level that signals danger (exact $ amount)
   - Maximum acceptable loss as specific dollar amount from current price

7. **Trading recommendations**:
   - EXACT entry price if buying (specific $ amount)
   - EXACT exit price for profit-taking (specific $ amount) 
   - EXACT stop-loss price (specific $ amount)
   - Target price for 1-week, 2-week timeframes

DO NOT use vague terms like "wait for RSI" or "SMA crossings". Give me actual dollar amounts and specific price levels based on the current price of $${currentPrice.toFixed(2)}.

FINAL CONSISTENCY CHECK:
Before submitting, verify:
- Does my sentiment rating match my price targets?
- Does my reasoning support both the rating AND the targets?
- Have I explained any apparent contradictions (like oversold bounces in downtrends)?`
        })
      });

      if (!response.ok) {
        throw new Error(`Claude analysis failed: ${response.status}`);
      }

      const result = await response.json();
      const fullAnalysis = result.analysis;
      
      // Extract sentiment classification from the response (now includes rating like "Bullish 4/5")
      const sentimentMatch = fullAnalysis.match(/SENTIMENT:\s*\[?([^\]]+)\]?/i);
      let sentiment = 'Neutral';
      if (sentimentMatch) {
        sentiment = sentimentMatch[1].trim();
      }
      
      // Extract short outlook from the real analysis
      const outlookMatch = fullAnalysis.match(/1\.\s*\*\*Short-term outlook[^:]*:\*\*\s*([^.]*\.?[^1-9]*)/i);
      let shortOutlook = `${ticker} analysis: RSI ${rsi.toFixed(1)}, price $${currentPrice.toFixed(2)} (${dailyChange > 0 ? '+' : ''}${dailyChange.toFixed(1)}% daily)`;
      
      if (outlookMatch) {
        shortOutlook = outlookMatch[1].replace(/\n.*$/s, '').trim();
        shortOutlook = shortOutlook.replace(/^\s*-?\s*/, '').replace(/\*\*/g, '');
        if (shortOutlook.length > 100) {
          shortOutlook = shortOutlook.substring(0, 97) + '...';
        }
      }

      const analysisData = {
        ticker,
        timestamp: new Date().toISOString(),
        sentiment,
        shortOutlook,
        fullAnalysis,
        dataSummary
      };
      
      // Save the analysis result
      const newOutlook = {
        sentiment: analysisData.sentiment || 'Neutral',
        shortOutlook: analysisData.shortOutlook || 'Analysis pending',
        fullAnalysis: analysisData.fullAnalysis,
        timestamp: new Date().toLocaleString()
      };
      
      setAiOutlooks(currentOutlooks => {
        const updatedOutlooks = {
          ...currentOutlooks,
          [ticker]: newOutlook
        };
        localStorage.setItem('aiOutlooks', JSON.stringify(updatedOutlooks));
        return updatedOutlooks;
      });
      
      setSnackbarMessage(`✅ ${ticker} analysis completed with Polygon data!`);
      setShowSnackbar(true);
      
      // Return the analysis result for Quick Analysis
      return newOutlook;

    } catch (error) {
      console.error('Polygon Analysis error:', error);
      setSnackbarMessage(`Polygon Analysis failed: ${error.message}`);
      setShowSnackbar(true);
    } finally {
      setAiAnalysisLoading(null);
    }
  };

  // Quick Analysis function
  const performQuickAnalysis = async (ticker: string) => {
    if (!ticker || ticker.trim() === '') {
      setSnackbarMessage('❌ Please enter a ticker symbol');
      setShowSnackbar(true);
      return;
    }

    setQuickAnalysisLoading(true);
    setQuickAnalysisResult('');
    const upperTicker = ticker.toUpperCase().trim();

    try {
      // Call analyzeWithPolygon and wait for the complete analysis
      const analysisResult = await analyzeWithPolygon(upperTicker);
      
      if (analysisResult && analysisResult.fullAnalysis) {
        setQuickAnalysisResult(analysisResult.fullAnalysis);
      } else {
        setQuickAnalysisResult('Analysis completed but no detailed results available.');
      }
    } catch (error) {
      console.error('Quick analysis error:', error);
      setQuickAnalysisResult(`Analysis failed: ${error.message}`);
    } finally {
      setQuickAnalysisLoading(false);
    }
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSnackbarMessage('✅ Analysis copied to clipboard!');
      setShowSnackbar(true);
    } catch (error) {
      console.error('Copy failed:', error);
      setSnackbarMessage('❌ Failed to copy to clipboard');
      setShowSnackbar(true);
    }
  };

  // Function to refresh AI analysis for multiple tickers
  const refreshAiAnalysis = async (tickers: string[]) => {
    
    // Validate and filter tickers
    const validTickers = tickers.filter(ticker => {
      const isValid = typeof ticker === 'string' && ticker.length > 0 && ticker !== 'CASH' && /^[A-Z]{2,5}$/.test(ticker);
      if (!isValid) {
        console.warn(`🚨 Invalid ticker filtered out: "${ticker}" (type: ${typeof ticker})`);
      }
      return isValid;
    });
    
    
    if (validTickers.length === 0) {
      setSnackbarMessage('❌ No valid tickers to analyze');
      setShowSnackbar(true);
      return;
    }
    
    const refreshButton = document.activeElement as HTMLElement;
    if (refreshButton) refreshButton.blur(); // Remove focus to prevent stuck hover
    
    // Set "Refreshing..." status for all tickers being processed
    setAiOutlooks(currentOutlooks => {
      const refreshingOutlooks = { ...currentOutlooks };
      validTickers.forEach(ticker => {
        refreshingOutlooks[ticker] = {
          sentiment: 'Refreshing...',
          shortOutlook: 'Analysis in progress',
          fullAnalysis: 'Please wait while we analyze this ticker...',
          timestamp: new Date().toLocaleString()
        };
      });
      return refreshingOutlooks;
    });
    
    setSnackbarMessage(`🔄 Refreshing AI analysis for ${validTickers.length} ETFs...`);
    setShowSnackbar(true);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process tickers sequentially to avoid rate limits
    for (const ticker of validTickers) {
      try {
        await analyzeWithPolygon(ticker);
        successCount++;
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to analyze ${ticker}:`, error);
        errorCount++;
        
        // Set error status for failed ticker
        setAiOutlooks(currentOutlooks => {
          const errorOutlooks = { ...currentOutlooks };
          errorOutlooks[ticker] = {
            sentiment: 'Error',
            shortOutlook: 'Analysis failed',
            fullAnalysis: `Failed to analyze ${ticker}: ${error.message}`,
            timestamp: new Date().toLocaleString()
          };
          localStorage.setItem('aiOutlooks', JSON.stringify(errorOutlooks));
          return errorOutlooks;
        });
      }
    }
    
    const message = successCount > 0 
      ? `✅ Refreshed ${successCount} ETF${successCount !== 1 ? 's' : ''}${errorCount > 0 ? `, ${errorCount} failed` : ''}` 
      : `❌ Failed to refresh AI analysis`;
      
    setSnackbarMessage(message);
    setShowSnackbar(true);
  };

  // New function for risk level chips (HIGH/MEDIUM/LOW/SAFE/pending)
  const getRiskLevelChip = (riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE' | 'pending' | string) => {
    if (!riskLevel || riskLevel === 'pending') {
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
    if (!item.riskLevel || item.riskLevel === 'pending') {
      return `Risk Analysis: Pending\nVolatility Risk: ${formatPercentage(item.riskVolatility)}`;
    }

    const riskExplanations = {
      'HIGH': 'Multiple concerning technical signals indicate elevated risk',
      'MEDIUM': 'Some caution warranted due to mixed technical signals', 
      'LOW': 'Minor technical concerns but generally stable',
      'SAFE': 'Strong technical position with minimal risk indicators',
      'pending': 'Risk analysis data not yet available'
    };

    const indicators = [];
    let signalsToDisplay = null;
    
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
    
    // Categorize and display signals with appropriate context
    if (item.rationale && item.rationale !== 'Normal trading conditions') {
      const warningSignals = [];
      const opportunitySignals = [];
      const neutralSignals = [];
      
      // Parse different rationale formats
      if (item.rationale.includes('SIGNALS:')) {
        const signalsSection = item.rationale.split('SIGNALS:')[1];
        if (signalsSection) {
          const signals = signalsSection.split(',').map(s => s.trim());
          signals.forEach(signal => {
            if (signal) {
              if (signal.includes('RSI Overbought') || signal.includes('Down trend') || signal.includes('Consecutive Down')) {
                warningSignals.push(signal);
              } else if (signal.includes('Oversold') || signal.includes('Below BB Lower')) {
                opportunitySignals.push(signal);
              } else {
                neutralSignals.push(signal);
              }
            }
          });
        }
      } else {
        // Handle other formats
        if (item.rationale.includes('WATCH:') && item.rationale.includes('potential entry opportunity')) {
          opportunitySignals.push(item.rationale.replace('WATCH: ', ''));
        } else if (item.rationale.includes('PREPARE:')) {
          neutralSignals.push(item.rationale.replace('PREPARE: ', 'Dividend timing: ') + '');
        } else if (item.rationale.includes('CAUTION:')) {
          warningSignals.push(item.rationale.replace('CAUTION: ', ''));
        } else if (item.rationale.includes('OPPORTUNITY:')) {
          opportunitySignals.push(item.rationale.replace('OPPORTUNITY: ', ''));
        }
        
        // Handle compound rationales (e.g., WATCH + OPPORTUNITY)
        if (item.rationale.includes('|')) {
          const parts = item.rationale.split('|').map(s => s.trim());
          parts.forEach(part => {
            if (part.includes('OPPORTUNITY:')) {
              opportunitySignals.push(part.replace('OPPORTUNITY: ', ''));
            }
          });
        }
      }
      
      // Store signals for later display (moved to end)
      signalsToDisplay = { warningSignals, opportunitySignals, neutralSignals };
    } else {
      signalsToDisplay = null;
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
    
    // Display signals at the end (moved from earlier)
    if (item.rationale && item.rationale !== 'Normal trading conditions' && signalsToDisplay) {
      const { warningSignals, opportunitySignals, neutralSignals } = signalsToDisplay;
      
      if (warningSignals.length > 0) {
        indicators.push('');
        indicators.push('⚠️ Risk Factors:');
        warningSignals.forEach(signal => indicators.push(`  - ${signal}`));
      }
      
      if (opportunitySignals.length > 0) {
        indicators.push('');
        indicators.push('🎯 Opportunities:');
        opportunitySignals.forEach(signal => indicators.push(`  - ${signal}`));
      }
      
      // Show informational items separately (not counted as alerts)
      if (neutralSignals.length > 0) {
        indicators.push('');
        indicators.push('ℹ️ Additional Information:');
        neutralSignals.forEach(signal => indicators.push(`  - ${signal}`));
      }
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
  const copyAnalysisToClipboard = async (text: string, ticker: string) => {
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
        case 'volatility':
          // Sort by volatility (risk volatility percentage)
          valueA = tickerDataA?.riskVolatility || 0;
          valueB = tickerDataB?.riskVolatility || 0;
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
      
      const bestPerformer = data.length > 0 ? data.reduce((current, item) => 
        item.bestReturn > current.bestReturn ? item : current
      ) : null;
      
      const lowestRisk = data.length > 0 ? data.reduce((current, item) => 
        item.riskVolatility < current.riskVolatility ? item : current
      ) : null;
      
      const highestYield = data.length > 0 ? data.reduce((current, item) => 
        (item.forwardYield || 0) > (current.forwardYield || 0) ? item : current
      ) : null;
      
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
                      {metrics.bestPerformer ? `${metrics.bestPerformer.ticker} - ${formatPercentage(metrics.bestPerformer.bestReturn)}` : 'N/A'}
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
                      {metrics.lowestRisk ? `${metrics.lowestRisk.ticker} - ${formatPercentage(metrics.lowestRisk.riskVolatility)} volatility` : 'N/A'}
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
                      {metrics.highestYield ? `${metrics.highestYield.ticker} - ${metrics.highestYield.forwardYield?.toFixed(1)}%` : 'N/A'}
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
                Yield
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AI Analysis
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
                        label={item.riskLevel || 'pending'}
                        size="small"
                        onClick={() => {
                          const analysisText = `${item.ticker} Risk Analysis\n${'='.repeat(20)}\n${generateRiskTooltip(item)}`;
                          copyAnalysisToClipboard(analysisText, item.ticker);
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
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    {aiOutlooks[item.ticker] ? (
                      <Box
                        onClick={() => {
                          setAiAnalysisResult(aiOutlooks[item.ticker].fullAnalysis);
                          setShowAiModal(true);
                        }}
                        sx={{
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 0.5,
                          p: 1,
                          borderRadius: 2,
                          backgroundColor: 'rgba(0, 212, 255, 0.08)',
                          border: '1px solid rgba(0, 212, 255, 0.2)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 212, 255, 0.15)',
                            border: '1px solid rgba(0, 212, 255, 0.4)',
                            transform: 'scale(1.02)'
                          }
                        }}
                      >
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: aiOutlooks[item.ticker].sentiment?.includes('Bullish') ? '#4CAF50' :
                                   aiOutlooks[item.ticker].sentiment?.includes('Bearish') ? '#F44336' :
                                   aiOutlooks[item.ticker].sentiment === 'Neutral' ? '#FFC107' : '#00D4FF',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            textAlign: 'center',
                            maxWidth: '120px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {aiOutlooks[item.ticker].sentiment || 'Neutral'}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '0.65rem',
                            textAlign: 'center'
                          }}
                        >
                          Click for details
                        </Typography>
                      </Box>
                    ) : (
                      <Button
                        variant="text"
                        size="small"
                        sx={{
                          minWidth: 'auto',
                          padding: '4px 6px',
                          fontSize: '1rem',
                          height: '24px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                          }
                        }}
                        onClick={() => analyzeWithPolygon(item.ticker)}
                        disabled={aiAnalysisLoading === item.ticker || item.ticker === 'CASH'}
                      >
                        🤖
                      </Button>
                    )}
                  </Box>
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
              
              {/* Quick Analysis Button */}
              <Button
                variant="outlined"
                startIcon={<Search />}
                onClick={() => setQuickAnalysisOpen(true)}
                sx={{
                  borderColor: '#00D4FF',
                  color: '#00D4FF',
                  '&:hover': {
                    borderColor: '#ffffff',
                    color: '#ffffff',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)'
                  }
                }}
              >
                Quick Analysis
              </Button>
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
              {/* Full Analysis tab hidden - no longer needed
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
              /> */}
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
                        <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                          <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={() => {
                              const tickers = mptAllocation.map(item => item.ticker).filter(ticker => ticker !== 'CASH');
                              refreshAiAnalysis(tickers);
                            }}
                            sx={{
                              borderColor: '#00D4FF',
                              color: '#00D4FF',
                              '&:hover': {
                                borderColor: '#ffffff',
                                color: '#ffffff',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)'
                              }
                            }}
                          >
                            Refresh AI
                          </Button>
                          {/* Refresh Portfolio button hidden - auto-refreshes on load now
                          <Button
                            variant="outlined"
                            startIcon={<AccountBalance />}
                            onClick={() => {
                              const { allocation, metrics } = calculateMPTAllocation(data, aiOutlooks);
                              const enrichedAllocation = allocation.map(asset => {
                                const originalETF = data.find(etf => etf.ticker === asset.ticker);
                                return {
                                  ...asset,
                                  exDivDay: originalETF?.exDivDay,
                                  strategy: originalETF?.bestStrategy
                                };
                              });
                              setMptAllocation(enrichedAllocation);
                              setPortfolioMetrics(metrics);
                              setSnackbarMessage('✅ Portfolio updated with AI sentiment filtering!');
                              setShowSnackbar(true);
                            }}
                            sx={{
                              borderColor: '#34C759',
                              color: '#34C759',
                              '&:hover': {
                                borderColor: '#ffffff',
                                color: '#ffffff',
                                backgroundColor: 'rgba(52, 199, 89, 0.1)'
                              }
                            }}
                          >
                            Refresh Portfolio
                          </Button> */}
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
                <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
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
                  {/* Refresh AI button hidden - too many ETFs to refresh at once
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={() => refreshAiAnalysis(excludedTickers.map(item => item.ticker).filter(ticker => ticker !== 'CASH'))}
                    sx={{
                      borderColor: '#6C63FF',
                      color: '#6C63FF',
                      '&:hover': {
                        borderColor: '#ffffff',
                        color: '#ffffff',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                  >
                    Refresh AI
                  </Button> */}
                </Box>
              </motion.div>
              {renderLegacyTable(excludedTickers)}
            </TabPanel>

            {/* Full Analysis tab panel hidden - no longer needed
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
            </TabPanel> */}

            <TabPanel value={selectedTab} index={2}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
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
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Refresh />}
                      onClick={() => refreshAiAnalysis(portfolio.holdings.map(h => h.ticker).filter(ticker => ticker !== 'CASH'))}
                      sx={{
                        borderColor: '#00D4FF',
                        color: '#00D4FF',
                        '&:hover': {
                          borderColor: '#ffffff',
                          color: '#ffffff',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)'
                        }
                      }}
                    >
                      Refresh AI
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        localStorage.removeItem('aiOutlooks');
                        setAiOutlooks({});
                        setSnackbarMessage('🗑️ Cleared AI data cache - click Refresh AI');
                        setShowSnackbar(true);
                      }}
                      sx={{
                        borderColor: '#FF3B30',
                        color: '#FF3B30',
                        minWidth: 'auto',
                        px: 1,
                        '&:hover': {
                          borderColor: '#ffffff',
                          color: '#ffffff',
                          backgroundColor: 'rgba(255, 59, 48, 0.1)'
                        }
                      }}
                    >
                      🐛 Clear Cache
                    </Button>
                  </Box>
                </Box>

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
                              const annualizedYield = portfolio.totalValue > 0 ? (weeklyDividend / portfolio.totalValue * 52 * 100) : 0;
                              return `${weeklyDividend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${annualizedYield.toFixed(1)}%)`;
                            })()}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            Per Week (Annualized Yield)
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
                                active={sortField === 'volatility'}
                                direction={sortField === 'volatility' ? sortDirection : 'asc'}
                                onClick={() => handleSort('volatility')}
                                sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                              >
                                45-Day Volatility
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">AI Outlook</TableCell>
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
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          color: 'rgba(255, 255, 255, 0.7)', 
                                          fontSize: '0.75rem',
                                          fontWeight: 500,
                                          cursor: 'pointer',
                                          '&:hover': {
                                            color: '#00D4FF',
                                            textDecoration: 'underline'
                                          }
                                        }}
                                        onMouseEnter={() => {}} // Disabled hover chart
                                        onMouseLeave={handlePriceLeave}
                                        onClick={() => {
                                          // Open Yahoo Finance chart in new window
                                          window.open(`https://finance.yahoo.com/quote/${holding.ticker}/chart?interval=30m&range=5d`, '_blank');
                                          setSnackbarMessage(`Opened ${holding.ticker} chart in new window`);
                                          setShowSnackbar(true);
                                        }}
                                      >
                                        ${(holding.currentPrice || 0).toFixed(2)}
                                      </Typography>
                                      <Button
                                        size="small"
                                        variant="text"
                                        sx={{
                                          minWidth: 'auto',
                                          padding: '4px 6px',
                                          fontSize: '1rem',
                                          height: '24px',
                                          backgroundColor: waitingForScreenshot === holding.ticker ? 'rgba(255, 183, 77, 0.2)' : 'transparent',
                                          border: waitingForScreenshot === holding.ticker ? '1px solid rgba(255, 183, 77, 0.5)' : 'none',
                                          '&:hover': {
                                            backgroundColor: waitingForScreenshot === holding.ticker ? 'rgba(255, 183, 77, 0.3)' : 'rgba(255, 255, 255, 0.1)'
                                          }
                                        }}
                                        onClick={() => analyzeWithPolygon(holding.ticker)}
                                        disabled={aiAnalysisLoading === holding.ticker || holding.ticker === 'CASH'}
                                      >
                                        {waitingForScreenshot === holding.ticker ? '📸' : '🤖'}
                                      </Button>
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
                                        label={tickerData?.riskLevel || 'pending'}
                                        size="small"
                                        onClick={() => {
                                          const analysisText = `${holding.ticker} Risk Analysis\n${'='.repeat(20)}\n${generateRiskTooltip(tickerData)}`;
                                          copyAnalysisToClipboard(analysisText, holding.ticker);
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

                                {/* 45-Day Volatility */}
                                <TableCell align="center">
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: 'white', 
                                      fontWeight: 600,
                                      fontSize: '0.9rem'
                                    }}
                                  >
                                    {tickerData?.riskVolatility ? `${(tickerData.riskVolatility * 100).toFixed(1)}%` : 'N/A'}
                                  </Typography>
                                </TableCell>

                                {/* AI Outlook */}
                                <TableCell align="center">
                                  {(() => {
                                    const aiData = aiOutlooks[holding.ticker];
                                    
                                    if (!aiData) {
                                      return (
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            color: 'rgba(255, 255, 255, 0.3)',
                                            fontSize: '0.75rem'
                                          }}
                                        >
                                          No analysis yet
                                        </Typography>
                                      );
                                    }

                                    // Extract just the sentiment - be very aggressive about it
                                    let displaySentiment = 'Unknown';
                                    
                                    // First try to extract from sentiment field (which might have full text)
                                    let sentimentText = aiData.sentiment || aiData.shortOutlook || '';
                                    
                                    // Handle special states first
                                    if (sentimentText.includes('Refreshing')) {
                                      displaySentiment = 'Refreshing...';
                                    } else if (sentimentText.includes('Error')) {
                                      displaySentiment = 'Error';
                                    } else {
                                      // Extract just the sentiment part using regex patterns (now handles "Bullish 4/5" format)
                                      const sentimentPatterns = [
                                        /^(Bullish \d\/5|Bearish \d\/5|Neutral)/i,
                                        /(Bullish \d\/5|Bearish \d\/5|Neutral)/i,
                                        // Fallback patterns for old format
                                        /^(Cautiously Bullish|Strong Bullish|Bullish|Cautiously Bearish|Strong Bearish|Bearish|Neutral)/i,
                                        /(Cautiously Bullish|Strong Bullish|Bullish|Cautiously Bearish|Strong Bearish|Bearish|Neutral)/i
                                      ];
                                      
                                      for (const pattern of sentimentPatterns) {
                                        const match = sentimentText.match(pattern);
                                        if (match) {
                                          displaySentiment = match[1].trim();
                                          break;
                                        }
                                      }
                                      
                                      // If still no match, do keyword-based extraction
                                      if (displaySentiment === 'Unknown') {
                                        const lowerText = sentimentText.toLowerCase();
                                        if (lowerText.includes('cautiously') && lowerText.includes('bullish')) {
                                          displaySentiment = 'Cautiously Bullish';
                                        } else if (lowerText.includes('cautiously') && lowerText.includes('bearish')) {
                                          displaySentiment = 'Cautiously Bearish';
                                        } else if (lowerText.includes('strong') && lowerText.includes('bullish')) {
                                          displaySentiment = 'Strong Bullish';
                                        } else if (lowerText.includes('strong') && lowerText.includes('bearish')) {
                                          displaySentiment = 'Strong Bearish';
                                        } else if (lowerText.includes('bullish')) {
                                          displaySentiment = 'Bullish';
                                        } else if (lowerText.includes('bearish')) {
                                          displaySentiment = 'Bearish';
                                        } else if (lowerText.includes('neutral')) {
                                          displaySentiment = 'Neutral';
                                        }
                                      }
                                    }
                                    

                                    return (
                                      <Box 
                                        sx={{ 
                                          cursor: 'pointer',
                                          '&:hover': {
                                            opacity: 0.8
                                          }
                                        }}
                                        onClick={() => {
                                          setAiAnalysisResult(aiData.fullAnalysis);
                                          setShowAiModal(true);
                                        }}
                                      >
                                        <Typography 
                                          variant="body2" 
                                          sx={{ 
                                            color: (() => {
                                              if (displaySentiment === 'Refreshing...') return '#00D4FF';
                                              if (displaySentiment === 'Error') return '#FF3B30';
                                              
                                              // Handle new rating format "Bullish X/5" or "Bearish X/5"
                                              if (displaySentiment.includes('Bullish')) {
                                                const ratingMatch = displaySentiment.match(/(\d)\/5/);
                                                if (ratingMatch) {
                                                  const rating = parseInt(ratingMatch[1]);
                                                  if (rating >= 4) return '#00C853'; // Strong green for 4-5
                                                  if (rating >= 2) return '#4CAF50'; // Medium green for 2-3
                                                  return '#66BB6A'; // Light green for 1
                                                }
                                                return '#4CAF50'; // Default green
                                              }
                                              
                                              if (displaySentiment.includes('Bearish')) {
                                                const ratingMatch = displaySentiment.match(/(\d)\/5/);
                                                if (ratingMatch) {
                                                  const rating = parseInt(ratingMatch[1]);
                                                  if (rating >= 4) return '#D32F2F'; // Strong red for 4-5
                                                  if (rating >= 2) return '#F44336'; // Medium red for 2-3
                                                  return '#EF5350'; // Light red for 1
                                                }
                                                return '#F44336'; // Default red
                                              }
                                              
                                              if (displaySentiment.toLowerCase().includes('neutral')) return '#FFC107';
                                              return '#00D4FF';
                                            })(),
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                            textAlign: 'center',
                                            mb: 0.5
                                          }}
                                        >
                                          {displaySentiment}
                                        </Typography>
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            fontSize: '0.65rem',
                                            textAlign: 'center'
                                          }}
                                        >
                                          Click for details
                                        </Typography>
                                      </Box>
                                    );
                                  })()}
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
              </motion.div>
            </TabPanel>
          </Paper>

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
          </motion.div>
        </Container>
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

      {/* Candlestick Chart Tooltip */}
      <Tooltip
        title={
          candlestickTooltip.ticker ? (
            <div>Chart for {candlestickTooltip.ticker} (temporarily disabled)</div>
          ) : null
        }
        open={candlestickTooltip.open}
        anchorEl={candlestickTooltip.anchorEl}
        placement="top"
        arrow
        enterDelay={500}
        leaveDelay={200}
        PopperProps={{
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, -10],
              },
            },
          ],
        }}
        sx={{
          '& .MuiTooltip-tooltip': {
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: 0,
            maxWidth: 'none',
            fontSize: '0.75rem'
          }
        }}
      />

      {/* Cookie Banner */}
      {showCookieBanner && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderBottom: 'none',
            p: 2,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', flex: 1, minWidth: '300px' }}>
            This site uses cookies to store your portfolio data locally in your browser. No data is shared with third parties.
          </Typography>
          <Button
            variant="contained"
            onClick={handleAcceptCookies}
            sx={{
              background: 'linear-gradient(135deg, #00D4FF 0%, #0095CC 100%)',
              color: 'black',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                background: 'linear-gradient(135deg, #40E0FF 0%, #00B8E6 100%)',
              }
            }}
          >
            Got it
          </Button>
        </Box>
      )}

      {/* Quick Analysis Modal */}
      <Dialog
        open={quickAnalysisOpen}
        onClose={() => setQuickAnalysisOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(30, 30, 30, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
          color: '#00D4FF',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Search />
          Quick AI Analysis
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Enter Ticker Symbol"
              value={quickTicker}
              onChange={(e) => setQuickTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !quickAnalysisLoading) {
                  performQuickAnalysis(quickTicker);
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&:hover fieldset': { borderColor: '#00D4FF' },
                  '&.Mui-focused fieldset': { borderColor: '#00D4FF' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
              }}
              InputProps={{
                endAdornment: (
                  <Button
                    variant="contained"
                    onClick={() => performQuickAnalysis(quickTicker)}
                    disabled={quickAnalysisLoading || !quickTicker.trim()}
                    sx={{
                      ml: 1,
                      background: 'linear-gradient(135deg, #00D4FF 0%, #6C63FF 100%)',
                      minWidth: 'auto',
                      px: 2
                    }}
                  >
                    {quickAnalysisLoading ? 'Analyzing...' : 'Analyze'}
                  </Button>
                )
              }}
            />
          </Box>
          
          {quickAnalysisResult && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#00D4FF' }}>
                  Analysis Result
                </Typography>
                <Button
                  startIcon={<ContentCopy />}
                  onClick={() => copyToClipboard(quickAnalysisResult)}
                  size="small"
                  sx={{
                    color: '#34C759',
                    '&:hover': { backgroundColor: 'rgba(52, 199, 89, 0.1)' }
                  }}
                >
                  Copy
                </Button>
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.9)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  lineHeight: 1.5
                }}
              >
                {quickAnalysisResult}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => {
              setQuickAnalysisOpen(false);
              setQuickTicker('');
              setQuickAnalysisResult('');
            }}
            sx={{
              color: '#00D4FF',
              fontWeight: 600,
              '&:hover': { backgroundColor: 'rgba(0, 212, 255, 0.1)' }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Analysis Modal */}
      <Dialog
        open={showAiModal}
        onClose={() => setShowAiModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#00D4FF', 
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pb: 1
        }}>
          🤖 AI Market Analysis
        </DialogTitle>
        <DialogContent>
          {aiAnalysisResult ? (
            <Typography 
              variant="body1" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.9)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap'
              }}
            >
              {aiAnalysisResult}
            </Typography>
          ) : (
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              No analysis available
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setShowAiModal(false)}
            sx={{
              color: '#00D4FF',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'rgba(0, 212, 255, 0.1)'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </ThemeProvider>
  );
}
