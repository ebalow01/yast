import React, { useState, useEffect, useMemo } from 'react';
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
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  TableSortLabel,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Dashboard,
  Stars,
  Security,
  TrendingFlat,
  BusinessCenter,
  Add,
  Delete,
  MonetizationOn,
  Refresh,
  SmartToy,
  Clear,
  Analytics,
  ContentCopy,
  Insights
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { dividendData, analysisMetadata, type Asset as DividendAsset } from '../data/dividendData';
import MarketMonitor from './MarketMonitor';

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
  dateAdded: string;
}

export interface UserPortfolio {
  id: string;
  name: string;
  holdings: PortfolioHolding[];
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
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
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
          // Mobile touch optimization
          '@media (max-width: 900px)': {
            minHeight: 56,
            fontSize: '0.875rem',
            minWidth: 'auto',
            padding: '12px 16px',
          },
          '@media (max-width: 600px)': {
            minHeight: 48,
            fontSize: '0.8rem',
            padding: '8px 12px',
          },
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
          overflowX: 'auto',
          overflowY: 'visible',
          // Mobile-specific enhancements
          '@media (max-width: 900px)': {
            borderRadius: 12,
            margin: '0 -8px', // Extend to screen edges on mobile
            border: 'none',
            background: 'rgba(255, 255, 255, 0.03)',
          },
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
          fontSize: '0.875rem',
          // Mobile-specific adjustments
          '@media (max-width: 900px)': {
            padding: '12px 8px',
            fontSize: '0.8rem',
            minWidth: '120px', // Ensure minimum width for readability
            '&:first-of-type': {
              paddingLeft: '16px',
              position: 'sticky',
              left: 0,
              backgroundColor: 'rgba(10, 10, 10, 0.95)',
              zIndex: 1,
            },
          },
          '@media (max-width: 600px)': {
            padding: '10px 6px',
            fontSize: '0.75rem',
            minWidth: '100px',
          },
        },
        head: {
          '@media (max-width: 900px)': {
            '&:first-of-type': {
              position: 'sticky',
              left: 0,
              backgroundColor: 'rgba(0, 212, 255, 0.12)',
              zIndex: 2,
            },
          },
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
    },
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          // Prevent iOS Safari zoom on input focus
          WebkitTextSizeAdjust: '100%',
          // Prevent horizontal scrolling and fix background
          overflowX: 'hidden',
          backgroundColor: '#0A0A0A !important',
        },
        body: {
          // Lock background color to prevent changes on scroll
          backgroundColor: '#0A0A0A !important',
          backgroundAttachment: 'fixed',
          overflowX: 'hidden',
          // Prevent bounce scrolling on iOS that can cause background color changes
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
          minHeight: '100vh',
          // Additional iOS fixes
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
        },
        '#root': {
          backgroundColor: '#0A0A0A !important',
          minHeight: '100vh',
          overflowX: 'hidden',
        },
        // Ensure all scrollable containers maintain background
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0, 212, 255, 0.4) rgba(255, 255, 255, 0.05)',
        },
        // Fix for webkit scrollbars
        '*::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '*::-webkit-scrollbar-track': {
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '4px',
        },
        '*::-webkit-scrollbar-thumb': {
          background: 'rgba(0, 212, 255, 0.4)',
          borderRadius: '4px',
          '&:hover': {
            background: 'rgba(0, 212, 255, 0.6)',
          },
        },
      }
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            paddingLeft: '8px',
            paddingRight: '8px',
            paddingTop: '16px',
            paddingBottom: '16px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: '44px', // iOS minimum touch target
          '@media (max-width: 600px)': {
            minHeight: '48px', // Larger touch targets on mobile
            fontSize: '0.875rem',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: '44px',
          minHeight: '44px',
          '@media (max-width: 600px)': {
            minWidth: '48px',
            minHeight: '48px',
          },
        },
      },
    },
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

function calculateMPTAllocation(allData: DividendData[], aiOutlooks?: Record<string, { sentiment: string; shortOutlook: string; fullAnalysis: string; timestamp: string }>, polygonData?: any): { allocation: AllocationItem[], metrics: PortfolioMetrics } {
  
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
  
  // Filter out NAV death spirals (NAV performance worse than -50% over 12 weeks)
  const preNavCount = allETFs.length;
  const navDeathSpirals: string[] = [];
  
  allETFs = allETFs.filter(etf => {
    // Check if we have NAV performance data from polygon
    const polygonNavData = polygonData?.[etf.ticker];
    const navPerformance = polygonNavData?.navPerformance;
    if (navPerformance != null && navPerformance < -50) {
      navDeathSpirals.push(etf.ticker);
      return false; // Exclude NAV death spirals
    }
    return true; // Include ETFs with good or unknown NAV performance
  });
  
  if (navDeathSpirals.length > 0) {
    console.log(`🚫 Excluded ${navDeathSpirals.length} NAV death spirals (< -50%):`, navDeathSpirals);
  }
  
  // Debug NAV filtering for troubleshooting
  console.log(`NAV filtering debug: ${preNavCount} ETFs before NAV filter, ${allETFs.length} after`);
  allETFs.forEach(etf => {
    const polygonNavData = polygonData?.[etf.ticker];
    const navPerformance = polygonNavData?.navPerformance;
    if (etf.ticker === 'PLTW' || etf.ticker === 'HOOW') {
      console.log(`${etf.ticker}: NAV=${navPerformance}, excluded=${navPerformance != null && navPerformance < -50}`);
    }
  });
  
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
      return: 0.05, // ~5% money market rate
      risk: 0.001, // Minimal risk for cash
      sharpe: 50, // Very high Sharpe ratio for cash
      dividendCapture: 0.0,
      exDivDay: undefined,
      isRule1: false,
      isRule2: false
    },
    {
      ticker: 'SPY',
      return: 0.0, // Will be set from live data
      risk: 0.1, // Default moderate risk
      sharpe: 0,
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
  
  // Use only live data - no hardcoded price multipliers
  const multiplier = 1.0;
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
  const [polygonData, setPolygonData] = useState<any>({});
  const [polygonLoading, setPolygonLoading] = useState(false);
  
  // Portfolio Management State with localStorage persistence
  const [portfolio, setPortfolio] = useState<UserPortfolio>(() => {
    try {
      const savedPortfolio = localStorage.getItem('userPortfolio');
      if (savedPortfolio) {
        return JSON.parse(savedPortfolio);
      }
    } catch (error) {
      console.error('Failed to load portfolio from localStorage:', error);
    }
    // Default portfolio if nothing in localStorage
    return {
      id: 'default',
      name: 'My Portfolio',
      holdings: [],
      lastUpdated: new Date().toISOString()
    };
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [isBulkRefreshing, setIsBulkRefreshing] = useState(false);
  const [portfolioUpdateTrigger, setPortfolioUpdateTrigger] = useState(0);
  
  // Cookie banner state
  const [showCookieBanner, setShowCookieBanner] = useState(() => {
    return !localStorage.getItem('cookieAccepted');
  });


  // AI Authentication state
  const [isAiAuthenticated, setIsAiAuthenticated] = useState(() => {
    return localStorage.getItem('aiAuthenticated') === 'true';
  });
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authPassword, setAuthPassword] = useState('');

  // Position state tracking for return threshold hysteresis (prevents flapping)
  const [activeHighReturnTickers, setActiveHighReturnTickers] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('activeHighReturnTickers');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (error) {
      console.error('Failed to load active high return tickers:', error);
      return new Set();
    }
  });

  // Portfolio table sorting state
  const [sortField, setSortField] = useState<string>('totalReturn');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');


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
  const [realtimeData, setRealtimeData] = useState<any>(null);

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

  // Load yfinance dividend data asynchronously after main data loads
  useEffect(() => {
    const loadPolygonData = async () => {
      if (data.length > 0 && !loading) {
        const tickers = data.map(item => item.ticker);
        setPolygonLoading(true);
        try {
          // Fetching market data asynchronously
          const polygonResponse = await fetch('/.netlify/functions/polygon-batch-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tickers })
          });
          
          if (polygonResponse.ok) {
            const polygonResults = await polygonResponse.json();
            console.log(`Market data loaded for ${Object.keys(polygonResults).length} tickers`);
            console.log('Tickers requested:', tickers);
            console.log('yfinance response keys:', Object.keys(polygonResults));
            
            // Log NVDW data if available
            if (polygonResults.NVDW) {
              console.log('NVDW Full Data:', polygonResults.NVDW);
            } else {
              console.log('NVDW not found in response');
            }
            
            // Log YETH data if available
            if (polygonResults.YETH) {
              console.log('YETH Full Data:', polygonResults.YETH);
            } else {
              console.log('YETH not found in response');
            }
            
            // Log HOOW data if available
            if (polygonResults.HOOW) {
              console.log('HOOW Full Data:', polygonResults.HOOW);
            } else {
              console.log('HOOW not found in response');
            }
            
            // Log PLTW data if available
            if (polygonResults.PLTW) {
              console.log('PLTW Full Data:', polygonResults.PLTW);
            } else {
              console.log('PLTW not found in response');
            }
            
            setPolygonData(polygonResults);
          } else {
            console.error('Failed to fetch yfinance data:', polygonResponse.statusText);
          }
        } catch (error) {
          console.error('Error fetching yfinance data:', error);
        } finally {
          setPolygonLoading(false);
        }
      }
    };

    loadPolygonData();
  }, [data, loading]);

  // Save portfolio to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('userPortfolio', JSON.stringify(portfolio));
    } catch (error) {
      console.error('Failed to save portfolio to localStorage:', error);
    }
  }, [portfolio]);

  // Save active high return tickers to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('activeHighReturnTickers', JSON.stringify(Array.from(activeHighReturnTickers)));
    } catch (error) {
      console.error('Failed to save active high return tickers:', error);
    }
  }, [activeHighReturnTickers]);

  // Auto-refresh portfolio with AI filtering once data and AI outlooks are loaded
  useEffect(() => {
    if (data.length > 0 && Object.keys(aiOutlooks).length > 0 && !loading) {
      try {
        const { allocation, metrics } = calculateMPTAllocation(data, aiOutlooks, polygonData);
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
        } else {
          console.warn('⚠️ No allocation generated - all ETFs may be filtered out');
        }
      } catch (error) {
        console.error('Error during portfolio auto-refresh:', error);
      }
    }
    // Remove data and aiOutlooks from dependencies to avoid circular updates
  }, [loading, polygonData]);

  // Portfolio Management - Initialize sample data if portfolio is empty and data is loaded
  useEffect(() => {
    if (portfolio.holdings.length === 0 && data.length > 0) {
      // Initialize with sample portfolio if no saved portfolio exists
      const sampleHoldings: PortfolioHolding[] = [
        {
          ticker: 'YMAX',
          shares: 100,
          averagePrice: 0, // Will use live price data
          dateAdded: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week ago
        },
        {
          ticker: 'QDTE',
          shares: 50,
          averagePrice: 0, // Will use live price data
          dateAdded: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() // 2 weeks ago
        },
        {
          ticker: 'ULTY',
          shares: 75,
          averagePrice: 0, // Will use live price data
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
        refreshAiAnalysisForTickers(tickers);
      }, 2000);
    }
  }, [data]); // Re-run when data loads to get current prices

  // Auto-load cached AI analysis for all tickers (no auth required)
  useEffect(() => {
    if (data.length > 0) {
      // Check cache for all available tickers automatically
      const loadCachedAnalyses = async () => {
        console.log('Auto-loading cached AI analyses for all available tickers...');
        
        for (const item of data) {
          // Only check cache if we don't already have analysis for this ticker
          if (!aiOutlooks[item.ticker]) {
            try {
              await checkAiCache(item.ticker, false); // Don't show modal
            } catch (error) {
              console.log(`No cached analysis found for ${item.ticker}`);
            }
          }
        }
      };
      
      // Small delay to ensure other effects have completed
      setTimeout(loadCachedAnalyses, 500);
    }
  }, [data]); // Re-run when data changes

  // Portfolio Management Functions

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
  };


  const addHolding = () => {
    if (!newTicker) {
      setSnackbarMessage('Please enter a ticker symbol');
      setShowSnackbar(true);
      return;
    }

    const ticker = newTicker.toUpperCase();

    // Check if ticker exists in our data
    const tickerExists = data.some(d => d.ticker === ticker);
    if (!tickerExists) {
      setSnackbarMessage(`Warning: ${ticker} not found in our database. Adding anyway.`);
      setShowSnackbar(true);
    }

    // Check if ticker is already in portfolio
    const existingHolding = portfolio.holdings.find(h => h.ticker === ticker);
    if (existingHolding) {
      setSnackbarMessage(`${ticker} is already in your portfolio`);
      setShowSnackbar(true);
      return;
    }

    const newHolding: PortfolioHolding = {
      ticker,
      shares: 0, // Default value since we're not tracking shares anymore
      averagePrice: 0, // Default value since we're not tracking price anymore
      dateAdded: new Date().toISOString()
    };

    const updatedPortfolio = {
      ...portfolio,
      holdings: [...portfolio.holdings, newHolding]
    };

    updatePortfolioValues(updatedPortfolio);
    setShowAddDialog(false);
    setNewTicker('');
    setSnackbarMessage(`Added ${ticker} to portfolio`);
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

  // AI Authentication handlers
  const handleAuthSubmit = () => {
    // Simple password check - you should change this password
    if (authPassword === 'yast2024') {
      localStorage.setItem('aiAuthenticated', 'true');
      setIsAiAuthenticated(true);
      setShowAuthDialog(false);
      setAuthPassword('');
    } else {
      setSnackbarMessage('❌ Invalid password. AI features require authorization.');
      setShowSnackbar(true);
      setAuthPassword('');
    }
  };

  const promptForAuth = () => {
    setShowAuthDialog(true);
  };

  const checkAiAuth = () => {
    if (!isAiAuthenticated) {
      promptForAuth();
      return false;
    }
    return true;
  };

  const handleCopyAiAnalysis = () => {
    if (aiAnalysisResult) {
      navigator.clipboard.writeText(aiAnalysisResult).then(() => {
        setSnackbarMessage('✓ AI analysis copied to clipboard');
        setShowSnackbar(true);
      }).catch((err) => {
        console.error('Failed to copy:', err);
        setSnackbarMessage('Failed to copy to clipboard');
        setShowSnackbar(true);
      });
    }
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

  const extractSentimentRating = (fullAnalysis: string) => {
    if (!fullAnalysis) return { rating: 'N/A', color: '#00D4FF' };
    
    // Find all occurrences of "FINAL SENTIMENT RATING:" and get the one with actual content
    const sentimentMatches = [...fullAnalysis.matchAll(/FINAL SENTIMENT RATING:\s*([^`\n]*)/gi)];
    
    let rating = '';
    
    // Try each match to find one with actual sentiment content
    for (const match of sentimentMatches) {
      const candidateRating = match[1].trim();
      
      // Skip empty, asterisk-only, or non-alphabetic ratings
      if (candidateRating && candidateRating !== '**' && candidateRating !== '***' && candidateRating.match(/[A-Za-z]/)) {
        rating = candidateRating;
        break;
      }
    }
    
    // If no good match found, try alternative patterns
    if (!rating) {
      // Try to find sentiment directly stated after any FINAL SENTIMENT RATING
      const directMatch = fullAnalysis.match(/FINAL SENTIMENT RATING:\s*[^a-zA-Z]*([A-Z\s]*(?:BULLISH|BEARISH|NEUTRAL)[A-Z\s]*)/i);
      if (directMatch) {
        rating = directMatch[1].trim();
        console.log(`Found direct sentiment: "${rating}"`);
      }
    }
    
    // Normalize and determine color based on rating
    if (rating && rating.toLowerCase().includes('bullish')) {
        // Clean up bullish rating - remove extra characters
        const cleanRating = rating.replace(/[*]+/g, '').trim();
        // Handle STRONG BULLISH, WEAK BULLISH, or just BULLISH
        let normalizedRating = cleanRating;
        if (cleanRating.toLowerCase().includes('strong')) {
          normalizedRating = 'STRONG Bullish';
        } else if (cleanRating.toLowerCase().includes('weak')) {
          normalizedRating = 'WEAK Bullish';
        } else {
          normalizedRating = 'Bullish';
        }
        return { rating: normalizedRating, color: '#34C759' }; // Green for bullish
      } else if (rating.toLowerCase().includes('bearish')) {
        // Clean up bearish rating - remove extra characters
        const cleanRating = rating.replace(/[*]+/g, '').trim();
        // Handle STRONG BEARISH, WEAK BEARISH, or just BEARISH
        let normalizedRating = cleanRating;
        if (cleanRating.toLowerCase().includes('strong')) {
          normalizedRating = 'STRONG Bearish';
        } else if (cleanRating.toLowerCase().includes('weak')) {
          normalizedRating = 'WEAK Bearish';
        } else {
          normalizedRating = 'Bearish';
        }
        return { rating: normalizedRating, color: '#FF3B30' }; // Red for bearish
      } else {
        // Clean up neutral rating - remove extra characters
        const cleanRating = rating.replace(/[*]+/g, '').trim();
        return { rating: cleanRating, color: '#00D4FF' }; // Blue for neutral/other
      }
    
    // Fallback: look for simple bullish/bearish patterns
    const simpleBullish = fullAnalysis.match(/(\d+\/5\s+bullish)/i);
    const simpleBearish = fullAnalysis.match(/(\d+\/5\s+bearish)/i);
    
    if (simpleBullish) {
      const normalizedRating = simpleBullish[1].replace(/bullish/gi, 'Bullish');
      return { rating: normalizedRating, color: '#34C759' };
    } else if (simpleBearish) {
      const normalizedRating = simpleBearish[1].replace(/bearish/gi, 'Bearish');
      return { rating: normalizedRating, color: '#FF3B30' };
    }
    
    // Final fallback
    return { rating: 'Analysis Available', color: '#00D4FF' };
  };

  // Modern Portfolio Theory allocation calculation
  const calculateMPTAllocations = (assets) => {
    // No longer reserving cash allocation - users can manage cash themselves
    
    // Calculate risk-adjusted scores for all assets
    const assetsWithScores = assets.map(asset => {
      
      const sharpe = asset.sharpeRatio || 0;
      const totalReturn = asset.calculatedTotalReturn || 0;
      const volatility = asset.volatility || 20;
      
      // MPT score: Use Sharpe ratio as primary metric (risk-adjusted returns)
      // Pure MPT approach - Sharpe ratio is the definitive measure
      const riskAdjustedScore = sharpe;
      return { ...asset, riskAdjustedScore };
    });
    
    // Calculate total score for all assets
    const totalScore = assetsWithScores.reduce((sum, asset) => sum + Math.max(0, asset.riskAdjustedScore), 0);
    
    // Allocate 100% among assets
    const totalAllocation = 100;
    
    // First pass: calculate raw allocations
    let rawAllocations = assetsWithScores.map(asset => {
      if (totalScore === 0) {
        // Equal weight if no valid scores
        return { ...asset, rawAllocation: totalAllocation / assetsWithScores.length };
      }
      
      const proportionalWeight = Math.max(0, asset.riskAdjustedScore) / totalScore;
      const allocation = proportionalWeight * totalAllocation;
      
      return { ...asset, rawAllocation: allocation };
    });
    
    // Second pass: round to nearest 5% increments
    let roundedAllocations = rawAllocations.map(asset => {
      const rounded = Math.round(asset.rawAllocation / 5) * 5;
      return { ...asset, mptAllocation: Math.max(5, rounded) }; // Minimum 5%
    });
    
    // Third pass: adjust to ensure exactly 100% total
    let currentTotal = roundedAllocations.reduce((sum, asset) => sum + asset.mptAllocation, 0);
    
    if (currentTotal !== 100) {
      const difference = 100 - currentTotal;
      
      if (difference > 0) {
        // Need to add percentage - find best performer with room to grow
        const eligibleToIncrease = roundedAllocations
          .filter(asset => asset.mptAllocation < 15)
          .sort((a, b) => (b.rawAllocation || 0) - (a.rawAllocation || 0));
          
        if (eligibleToIncrease.length > 0) {
          const bestAsset = eligibleToIncrease[0];
          const increaseAmount = Math.min(difference, 15 - bestAsset.mptAllocation);
          bestAsset.mptAllocation += increaseAmount;
          
          // If still short, distribute remaining among other assets
          let remainingDiff = difference - increaseAmount;
          if (remainingDiff > 0) {
            for (let asset of eligibleToIncrease.slice(1)) {
              if (remainingDiff <= 0) break;
              const canAdd = Math.min(remainingDiff, 15 - asset.mptAllocation);
              asset.mptAllocation += canAdd;
              remainingDiff -= canAdd; // Update remaining difference
            }
          }
        }
      } else {
        // Need to reduce percentage - find worst performer above 5%
        const eligibleToDecrease = roundedAllocations
          .filter(asset => asset.mptAllocation > 5)
          .sort((a, b) => (a.rawAllocation || 0) - (b.rawAllocation || 0));
          
        if (eligibleToDecrease.length > 0) {
          const worstAsset = eligibleToDecrease[0];
          const decreaseAmount = Math.min(Math.abs(difference), worstAsset.mptAllocation - 5);
          worstAsset.mptAllocation -= decreaseAmount;
          
          // If still over, distribute remaining reduction among other assets
          let remainingDiff = Math.abs(difference) - decreaseAmount;
          if (remainingDiff > 0) {
            for (let asset of eligibleToDecrease.slice(1)) {
              if (remainingDiff <= 0) break;
              const canReduce = Math.min(remainingDiff, asset.mptAllocation - 5);
              asset.mptAllocation -= canReduce;
              remainingDiff -= canReduce; // Update remaining difference
            }
          }
        }
      }
    }

    // Final verification: ensure allocations sum to exactly 100%
    const finalTotal = roundedAllocations.reduce((sum, asset) => sum + asset.mptAllocation, 0);
    console.log(`MPT Allocation Total: ${finalTotal}% (should be 100%)`);

    if (Math.abs(finalTotal - 100) > 0.1) {
      console.warn(`⚠️ MPT allocations sum to ${finalTotal}%, not 100%!`);
      roundedAllocations.forEach(asset => {
        console.log(`  ${asset.ticker}: ${asset.mptAllocation}%`);
      });
    }

    return roundedAllocations;
  };

  // Calculate optimal portfolio based on total return and AI sentiments
  const optimalPortfolioData = useMemo(() => {
    // First, filter out bearish tickers from all data
    const nonBearishTickers = data.filter(item => {
      if (aiOutlooks[item.ticker]?.fullAnalysis) {
        const sentiment = extractSentimentRating(aiOutlooks[item.ticker].fullAnalysis);
        const isBearish = sentiment.rating.toLowerCase().includes('bearish');
        
        // Debug logging for sentiment classification
        console.log(`Ticker ${item.ticker}: sentiment="${sentiment.rating}", isBearish=${isBearish}`);
        
        return !isBearish;
      }
      return true; // Include tickers without AI analysis
    });
    
    // Filter out NAV death spirals (NAV performance worse than -50% over 12 weeks)
    const navDeathSpirals: string[] = [];
    const nonDeathSpiralTickers = nonBearishTickers.filter(item => {
      const polygonNavData = polygonData?.[item.ticker];
      const navPerformance = polygonNavData?.navPerformance;
      if (navPerformance != null && navPerformance < -50) {
        navDeathSpirals.push(item.ticker);
        return false; // Exclude NAV death spirals
      }
      return true; // Include ETFs with good or unknown NAV performance
    });
    
    if (navDeathSpirals.length > 0) {
      console.log(`🚫 Excluded ${navDeathSpirals.length} NAV death spirals (< -50%):`, navDeathSpirals);
    }
    
    // Filter out dividend death spirals (dividend erosion worse than -40%)
    const divDeathSpirals: string[] = [];
    const nonDivDeathSpiralTickers = nonDeathSpiralTickers.filter(item => {
      const polygonDivData = polygonData?.[item.ticker];
      const divErosion = polygonDivData?.divErosion;
      if (divErosion != null && divErosion < -40) {
        divDeathSpirals.push(item.ticker);
        return false; // Exclude dividend death spirals
      }
      return true; // Include ETFs with good or unknown dividend erosion
    });
    
    if (divDeathSpirals.length > 0) {
      console.log(`💸 Excluded ${divDeathSpirals.length} dividend death spirals (< -40%):`, divDeathSpirals);
    }
    
    // Filter out tickers without 12-week NAV performance data or dividend history (less than 12 weeks old)
    const tickersWithNavData: string[] = [];
    const tickersWithComplete12WeekData = nonDivDeathSpiralTickers.filter(item => {
      const navPerformance = polygonData[item.ticker]?.navPerformance;
      const divErosion = polygonData[item.ticker]?.divErosion;

      // Exclude if missing NAV data OR dividend erosion data (both indicate < 12 weeks old)
      if (navPerformance == null || divErosion == null) {
        tickersWithNavData.push(item.ticker);
        return false; // Exclude tickers without complete 12-week data
      }
      return true;
    });

    if (tickersWithNavData.length > 0) {
      console.log(`📅 Excluded ${tickersWithNavData.length} tickers without complete 12-week data (< 12 weeks old):`, tickersWithNavData);
    }

    // Calculate total return for each ticker and sort by it
    // Total return = dividend income + price change (NAV). Div erosion excluded since
    // dividendReturn12Week already reflects the current dividend level.
    const tickersWithTotalReturn = tickersWithComplete12WeekData.map(item => {
      const forwardYield = polygonData[item.ticker]?.forwardYield || 0;
      const navPerformance = polygonData[item.ticker]?.navPerformance || 0;
      // Use 12-week scaled dividend return or calculate it
      const dividendReturn12Week = polygonData[item.ticker]?.dividendReturn12Week ?? (forwardYield * (12/52));
      const totalReturn = dividendReturn12Week + navPerformance;
      const volatility = polygonData[item.ticker]?.volatility14Day || 20; // Default 20% if missing
      const sharpeRatio = polygonData[item.ticker]?.sharpeRatio || 0;

      return {
        ...item,
        calculatedTotalReturn: totalReturn,
        volatility: volatility,
        sharpeRatio: sharpeRatio
      };
    }).sort((a, b) => b.calculatedTotalReturn - a.calculatedTotalReturn);

    // Filter criteria: 12-week return > 5% AND positive NAV variance
    const RETURN_THRESHOLD = 5;

    // Filter tickers with return > threshold AND positive NAV performance
    const qualifiedTickers = tickersWithTotalReturn.filter(item => {
      const navPerformance = polygonData[item.ticker]?.navPerformance || 0;
      return item.calculatedTotalReturn > RETURN_THRESHOLD && navPerformance > 0;
    });

    const finalOptimal = qualifiedTickers;

    console.log(`📈 Optimal portfolio: ${finalOptimal.length} tickers with >${RETURN_THRESHOLD}% 12wk return AND positive NAV variance`);
    console.log(`Qualified tickers:`, finalOptimal.map(item => {
      const navPerf = polygonData[item.ticker]?.navPerformance || 0;
      return `${item.ticker} (Return: ${item.calculatedTotalReturn.toFixed(1)}%, NAV: ${navPerf.toFixed(1)}%)`;
    }));
    
    // Remove CASH from optimal portfolio display - users can manage cash allocation themselves
    
    // Calculate MPT-based allocation percentages
    const portfolioWithAllocations = calculateMPTAllocations(finalOptimal);
    
    console.log('Optimal portfolio with MPT allocations:',
               portfolioWithAllocations.map(t => `${t.ticker}: Return ${t.calculatedTotalReturn.toFixed(2)}%, Allocation ${t.mptAllocation.toFixed(1)}%`));
    return portfolioWithAllocations;
  }, [data, aiOutlooks, polygonData, portfolioUpdateTrigger]);

  // Calculate categorized excluded tickers based on optimal portfolio
  const excludedTickersData = useMemo(() => {
    console.log('Calculating excluded tickers...');
    const optimalTickers = optimalPortfolioData.map(item => item.ticker);
    const excluded = data.filter(item => !optimalTickers.includes(item.ticker));
    
    // Categorize excluded tickers
    const navDeathSpirals: string[] = [];
    const divDeathSpirals: string[] = [];
    const bearishSentiment: string[] = [];
    const bullishExcluded: string[] = [];
    const otherExcluded: string[] = [];
    
    excluded.forEach(item => {
      const polygonNavData = polygonData?.[item.ticker];
      const navPerformance = polygonNavData?.navPerformance;
      const divErosion = polygonNavData?.divErosion;
      
      // Check for NAV death spiral
      if (navPerformance != null && navPerformance < -50) {
        navDeathSpirals.push(item.ticker);
        return;
      }
      
      // Check for div death spiral
      if (divErosion != null && divErosion < -40) {
        divDeathSpirals.push(item.ticker);
        return;
      }
      
      // Check for bearish sentiment
      if (aiOutlooks[item.ticker]?.fullAnalysis) {
        const sentiment = extractSentimentRating(aiOutlooks[item.ticker].fullAnalysis);
        const isBearish = sentiment.rating.toLowerCase().includes('bearish');
        if (isBearish) {
          bearishSentiment.push(item.ticker);
          return;
        }
        
        // If not bearish and has AI analysis, check if bullish
        const isBullish = sentiment.rating.toLowerCase().includes('bullish');
        if (isBullish) {
          bullishExcluded.push(item.ticker);
          return;
        }
      }
      
      // Everything else
      otherExcluded.push(item.ticker);
    });
    
    console.log('Excluded tickers breakdown:');
    console.log('- NAV death spirals:', navDeathSpirals);
    console.log('- Div death spirals:', divDeathSpirals);
    console.log('- Bearish sentiment:', bearishSentiment);
    console.log('- Bullish excluded:', bullishExcluded);
    console.log('- Other excluded:', otherExcluded);
    
    return {
      all: excluded,
      navDeathSpirals,
      divDeathSpirals,
      bearishSentiment,
      bullishExcluded,
      otherExcluded
    };
  }, [data, optimalPortfolioData, polygonData, aiOutlooks, portfolioUpdateTrigger]);

  // Table sorting function
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to desc for most fields
    }
  };

  // Generic sorting function for table data
  const sortTableData = (data: any[], field: string, direction: 'asc' | 'desc') => {
    return [...data].sort((a, b) => {
      let aValue, bValue;
      
      switch (field) {
        case 'ticker':
          aValue = a.ticker;
          bValue = b.ticker;
          break;
        case 'price':
          aValue = polygonData[a.ticker]?.price || 0;
          bValue = polygonData[b.ticker]?.price || 0;
          break;
        case 'medianDiv':
          aValue = polygonData[a.ticker]?.medianDividend || 0;
          bValue = polygonData[b.ticker]?.medianDividend || 0;
          break;
        case 'forwardYield':
          aValue = polygonData[a.ticker]?.forwardYield || 0;
          bValue = polygonData[b.ticker]?.forwardYield || 0;
          break;
        case 'nav':
          aValue = polygonData[a.ticker]?.navPerformance || 0;
          bValue = polygonData[b.ticker]?.navPerformance || 0;
          break;
        case 'divErosion':
          aValue = polygonData[a.ticker]?.divErosion || 0;
          bValue = polygonData[b.ticker]?.divErosion || 0;
          break;
        case 'totalReturn':
          // Total return = dividend income + NAV change (no divErosion)
          const aForwardYield = polygonData[a.ticker]?.forwardYield || 0;
          const aDividendReturn12Week = polygonData[a.ticker]?.dividendReturn12Week ?? (aForwardYield * (12/52));
          const aNav = polygonData[a.ticker]?.navPerformance || 0;
          aValue = aDividendReturn12Week + aNav;

          const bForwardYield = polygonData[b.ticker]?.forwardYield || 0;
          const bDividendReturn12Week = polygonData[b.ticker]?.dividendReturn12Week ?? (bForwardYield * (12/52));
          const bNav = polygonData[b.ticker]?.navPerformance || 0;
          bValue = bDividendReturn12Week + bNav;
          break;
        case 'volatility':
          aValue = polygonData[a.ticker]?.volatility14Day || 0;
          bValue = polygonData[b.ticker]?.volatility14Day || 0;
          break;
        case 'sharpe':
          aValue = polygonData[a.ticker]?.sharpeRatio || 0;
          bValue = polygonData[b.ticker]?.sharpeRatio || 0;
          break;
        case 'mptAllocation':
          aValue = a.mptAllocation || 0;
          bValue = b.mptAllocation || 0;
          break;
        case 'aiSentiment':
          const aSentiment = aiOutlooks[a.ticker] ? extractSentimentRating(aiOutlooks[a.ticker].fullAnalysis).rating : 'zzz';
          const bSentiment = aiOutlooks[b.ticker] ? extractSentimentRating(aiOutlooks[b.ticker].fullAnalysis).rating : 'zzz';
          aValue = aSentiment;
          bValue = bSentiment;
          break;
        default:
          return 0;
      }
      
      // Handle string vs number comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return direction === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
    });
  };

  // Sorted data for each tab
  const sortedOptimalData = useMemo(() => {
    return sortTableData(optimalPortfolioData, sortField, sortDirection);
  }, [optimalPortfolioData, sortField, sortDirection, polygonData, aiOutlooks]);

  const sortedExcludedData = useMemo(() => {
    // Filter out tickers with no recent price (invalid/delisted symbols)
    const validExcluded = excludedTickersData.all.filter(item => polygonData[item.ticker]?.price != null);
    return sortTableData(validExcluded, sortField, sortDirection);
  }, [excludedTickersData, sortField, sortDirection, polygonData, aiOutlooks]);

  const sortedBullishExcludedData = useMemo(() => {
    const bullishExcludedETFs = data.filter(item =>
      excludedTickersData.bullishExcluded.includes(item.ticker) &&
      polygonData[item.ticker]?.price != null
    );
    return sortTableData(bullishExcludedETFs, sortField, sortDirection);
  }, [excludedTickersData, data, sortField, sortDirection, polygonData, aiOutlooks]);

  const sortedPortfolioData = useMemo(() => {
    return sortTableData(portfolio.holdings, sortField, sortDirection);
  }, [portfolio.holdings, sortField, sortDirection, polygonData, aiOutlooks]);

  // Helper function to create Yahoo Finance link
  const getYahooFinanceUrl = (ticker: string) => {
    return `https://finance.yahoo.com/quote/${ticker}`;
  };

  // Helper function to format dividend day
  const formatDivDay = (exDivDay: string) => {
    if (!exDivDay) return '';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Find the day index
    const dayIndex = dayNames.findIndex(day => exDivDay.toLowerCase().includes(day.toLowerCase()));
    if (dayIndex !== -1) {
      return days[dayIndex];
    }
    
    // Fallback - try to extract first 3 characters if it's already abbreviated
    if (exDivDay.length >= 3) {
      return exDivDay.substring(0, 3);
    }
    
    return exDivDay;
  };

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
Expected Dividend: $${stockData.medianDividend?.toFixed(3) || 'N/A'}
Forward Yield: ${stockData.forwardYield ? stockData.forwardYield.toFixed(2) + '%' : 'N/A'}
Best Strategy Return: ${stockData.bestReturn ? (stockData.bestReturn * 100).toFixed(2) + '%' : 'N/A'}
Win Rate: ${stockData.dcWinRate ? (stockData.dcWinRate * 100).toFixed(1) + '%' : 'N/A'}
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
      
      // Trigger portfolio recalculation
      setPortfolioUpdateTrigger(prev => prev + 1);
      
      if (showModal && !isBulkRefreshing) {
        setAiAnalysisResult(analysis);
        setShowAiModal(true);
        setSnackbarMessage(`AI analysis complete for ${ticker}`);
        setShowSnackbar(true);
      }
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

  // Check cache for AI analysis (no auth required)
  const checkAiCache = async (ticker: string, showModal: boolean = true): Promise<boolean> => {
    const cacheKey = `ai_cache_${ticker}`;
    const cacheExpiry = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    
    try {
      setAiAnalysisLoading(ticker);
      
      // Step 1: Check server cache first
      try {
        const serverCacheResponse = await fetch(`/.netlify/functions/ai-cache?ticker=${ticker}`);
        
        if (!serverCacheResponse.ok) {
          console.warn(`Server cache error for ${ticker}: ${serverCacheResponse.status} ${serverCacheResponse.statusText}`);
          throw new Error(`Server cache error: ${serverCacheResponse.status}`);
        }
        
        const serverCacheData = await serverCacheResponse.json();
        
        if (serverCacheData && serverCacheData.data) {
          const { data, timestamp } = serverCacheData;
          const age = Date.now() - timestamp;
          const { fullAnalysis, shortOutlook, sentiment } = data;
          
          // Update state with server cached data
          const newOutlook = {
            sentiment: sentiment || 'Neutral',
            shortOutlook: shortOutlook || 'Analysis cached',
            fullAnalysis: fullAnalysis || '',
            timestamp: new Date(timestamp).toISOString()
          };
          
          setAiOutlooks(currentOutlooks => {
            const updatedOutlooks = {
              ...currentOutlooks,
              [ticker]: newOutlook
            };
            localStorage.setItem('aiOutlooks', JSON.stringify(updatedOutlooks));
            return updatedOutlooks;
          });
          
          // Also cache in localStorage for faster subsequent access
          const localCacheData = {
            data,
            timestamp
          };
          localStorage.setItem(cacheKey, JSON.stringify(localCacheData));
          
          // Trigger portfolio recalculation
          setPortfolioUpdateTrigger(prev => prev + 1);
          
          if (showModal) {
            setAiAnalysisResult(fullAnalysis);
            setShowAiModal(true);
            setSnackbarMessage(`AI analysis loaded from server cache (${Math.round(age / 60000)} min old)`);
            setShowSnackbar(true);
          }
          
          setAiAnalysisLoading(null);
          return true; // Cache hit
        }
      } catch (error) {
        console.log('Server cache unavailable, checking localStorage:', error.message);
        
        // Log more details about the server error
        if (serverCacheResponse) {
          console.log('Server cache response status:', serverCacheResponse.status);
          console.log('Server cache response statusText:', serverCacheResponse.statusText);
          try {
            const errorText = await serverCacheResponse.text();
            console.log('Server cache error body:', errorText);
          } catch (e) {
            console.log('Could not read error response body');
          }
        }
      }
      
      // Step 2: Check localStorage cache as fallback
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          const age = Date.now() - timestamp;
          
          // Check if cache is still valid (less than 2 hours old)
          if (age < cacheExpiry) {
            
            // Use cached data
            const { fullAnalysis, shortOutlook, sentiment } = data;
            
            // Update state with cached data
            const newOutlook = {
              sentiment: sentiment || 'Neutral',
              shortOutlook: shortOutlook || 'Analysis cached',
              fullAnalysis: fullAnalysis || '',
              timestamp: new Date(timestamp).toISOString()
            };
            
            setAiOutlooks(currentOutlooks => {
              const updatedOutlooks = {
                ...currentOutlooks,
                [ticker]: newOutlook
              };
              localStorage.setItem('aiOutlooks', JSON.stringify(updatedOutlooks));
              return updatedOutlooks;
            });
            
            // Trigger portfolio recalculation
            setPortfolioUpdateTrigger(prev => prev + 1);
            
            if (showModal) {
              setAiAnalysisResult(fullAnalysis);
              setShowAiModal(true);
              setSnackbarMessage(`AI analysis loaded from local cache (${Math.round(age / 60000)} min old)`);
              setShowSnackbar(true);
            }
            
            setAiAnalysisLoading(null);
            return true; // Cache hit
          } else {
          }
        } catch (error) {
          console.error('Error parsing cached data:', error);
          localStorage.removeItem(cacheKey); // Remove corrupted cache
        }
      }
      
      setAiAnalysisLoading(null);
      return false; // No cache hit
      
    } catch (error) {
      console.error('Cache check error:', error);
      setAiAnalysisLoading(null);
      return false;
    }
  };

  // Real Polygon API analysis function
  const analyzeWithPolygon = async (ticker: string, showModal: boolean = true, forceRefresh: boolean = false) => {
    // Always check cache first (no auth required)
    if (!forceRefresh) {
      const cacheHit = await checkAiCache(ticker, showModal);
      if (cacheHit) return; // Exit if we found cached data
    }
    
    // Only require auth for fresh API calls
    if (!checkAiAuth()) return;
    
    try {
      setAiAnalysisLoading(ticker);
      
      // Fetch real data from Polygon API via serverless function
      // This ensures API keys stay secure on the server side
      const requestBody = { ticker };
      
      const polygonResponse = await fetch('/.netlify/functions/polygon-analysis', {
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
      
      const enhancedAnalysisData = JSON.parse(responseText);
      if (!enhancedAnalysisData.techData || !enhancedAnalysisData.fullAnalysis) {
        throw new Error('No enhanced analysis data available');
      }

      // Use the enhanced technical analysis data from our new function
      const techData = enhancedAnalysisData.techData;
      const fullAnalysis = enhancedAnalysisData.fullAnalysis;
      const shortOutlook = enhancedAnalysisData.shortOutlook;
      const dataSummary = enhancedAnalysisData.dataSummary;
      
      // Extract key values for backwards compatibility
      const currentPrice = techData.current_price;
      const dailyChange = techData.daily_change;
      const twoDayChange = techData.two_day_change;

      // Extract additional values for backwards compatibility
      const rsi = techData.rsi;

      // Extract additional technical data for backwards compatibility
      const sma20 = techData.sma20;
      const sma50 = techData.sma50;
      const sessionHigh = techData.session_high;
      const sessionLow = techData.session_low;

      // Use enhanced technical data from server-side processing
      const vwap = techData.vwap || 0;
      const vwapDeviation = techData.vwap_deviation || 0;
      const vwapSlope = techData.vwap_slope || "N/A";
      const volumeAboveVwapPct = techData.volume_above_vwap_pct || 0;
      const institutionalSentiment = techData.institutional_sentiment || "N/A";
      
      const bbUpper = techData.bb_upper || 0;
      const bbLower = techData.bb_lower || 0;
      const bbPosition = techData.bb_position || "N/A";
      
      const macdLine = techData.macd_line || 0;
      const macdSignal = techData.macd_signal || 0;
      const macdHistogram = techData.macd_histogram || 0;
      const macdStatus = techData.macd_status || "N/A";
      
      const obv = techData.obv || 0;
      const obvTrend = techData.obv_trend || "N/A";
      
      const stochK = techData.stoch_k || 0;
      const stochD = techData.stoch_d || 0;
      const stochFastK = techData.stoch_fast_k || 0;
      const stochStatus = techData.stoch_status || "N/A";
      const stochType = techData.stoch_type || "N/A";

      // Use enhanced technical data from server-side processing
      const atr = techData.atr || 0;
      const atrTrend = techData.atr_trend || "N/A";
      const volatilityExpansion = techData.volatility_expansion || false;
      
      const fib236 = techData.fib_236 || 0;
      const fib382 = techData.fib_382 || 0;
      const fib50 = techData.fib_50 || 0;
      const fib618 = techData.fib_618 || 0;

      const significantLevels = techData.significant_levels || [];
      const recentPatterns = techData.recent_patterns || [];
      const patternStrength = techData.pattern_strength || 0;
      
      const latestVolume = techData.latest_volume || 0;
      const avgVolume = techData.avg_volume || 0;
      const volumeRatio = techData.volume_ratio || 1;
      const volumeStatus = techData.volume_status || "Normal";

      // Extract sentiment from analysis
      let sentiment = 'Neutral';
      const sentimentMatch = fullAnalysis.match(/^(Bullish|Bearish|Neutral)/i);
      if (sentimentMatch) {
        sentiment = sentimentMatch[1].trim();
      } else {
        // Fallback sentiment detection
        if (fullAnalysis.toLowerCase().includes('bullish')) {
          sentiment = 'Bullish';
        } else if (fullAnalysis.toLowerCase().includes('bearish')) {
          sentiment = 'Bearish';
        }
      }
      
      // shortOutlook is already extracted by our enhanced function
      // No need to re-process it

      const analysisData = {
        ticker,
        timestamp: new Date().toISOString(),
        sentiment,
        shortOutlook,
        fullAnalysis,
        dataSummary
      };
      
      // Cache the fresh data in both server and localStorage
      const cacheKey = `ai_cache_${ticker}`;
      const cacheData = {
        data: analysisData,
        timestamp: Date.now()
      };
      
      // Store in server cache first
      try {
        await fetch(`/.netlify/functions/ai-cache?ticker=${ticker}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cacheData)
        });
        console.log(`Stored AI analysis in server cache for ${ticker}`);
      } catch (error) {
        console.warn('Failed to store in server cache:', error);
      }
      
      // Store in localStorage as backup
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log(`Stored AI analysis in local cache for ${ticker}`);
      } catch (error) {
        console.warn('Failed to store in local cache:', error);
      }
      
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
      
      // Trigger portfolio recalculation
      setPortfolioUpdateTrigger(prev => prev + 1);
      
      if (showModal && !isBulkRefreshing) {
        setAiAnalysisResult(fullAnalysis);
        setShowAiModal(true);
        setSnackbarMessage(`AI analysis complete for ${ticker}`);
        setShowSnackbar(true);
      }
      setWaitingForScreenshot(null);

    } catch (error) {
      console.error('Polygon Analysis error:', error);
      setSnackbarMessage(`Polygon Analysis failed: ${error.message}`);
      setShowSnackbar(true);
      setWaitingForScreenshot(null);
    } finally {
      setAiAnalysisLoading(null);
    }
  };

  // Refresh AI analyses for specific list of tickers
  const refreshAiAnalysisForTickers = async (tickers: string[]) => {
    if (!checkAiAuth()) return;
    
    if (tickers.length === 0) {
      setSnackbarMessage('No tickers to refresh');
      setShowSnackbar(true);
      return;
    }

    setIsRefreshingAll(true);
    setIsBulkRefreshing(true);
    setSnackbarMessage(`Refreshing AI analysis for ${tickers.length} tickers...`);
    setShowSnackbar(true);

    try {
      // Process all tickers sequentially to avoid overwhelming the APIs
      for (const ticker of tickers) {
        try {
          await analyzeWithPolygon(ticker, false, true);
          // Small delay between requests to be respectful to APIs
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Failed to refresh ${ticker}:`, error);
          // Continue with other tickers even if one fails
        }
      }
      
      setSnackbarMessage(`Successfully refreshed AI analysis for all tickers`);
      setShowSnackbar(true);
    } catch (error) {
      console.error('Bulk refresh error:', error);
      setSnackbarMessage(`Refresh completed with some errors`);
      setShowSnackbar(true);
    } finally {
      setIsRefreshingAll(false);
      setIsBulkRefreshing(false);
      setShowAiModal(false); // Close AI modal when refresh completes
    }
  };

  // Bulk refresh all AI analyses for portfolio holdings
  const refreshAllAiAnalyses = async () => {
    if (portfolio.holdings.length === 0) {
      setSnackbarMessage('No tickers in portfolio to refresh');
      setShowSnackbar(true);
      return;
    }

    setIsRefreshingAll(true);
    setIsBulkRefreshing(true);
    setSnackbarMessage(`Refreshing AI analysis for ${portfolio.holdings.length} tickers...`);
    setShowSnackbar(true);

    try {
      // Process all tickers sequentially to avoid overwhelming the APIs
      for (const holding of portfolio.holdings) {
        try {
          await analyzeWithPolygon(holding.ticker, false, true);
          // Small delay between requests to be respectful to APIs
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Failed to refresh ${holding.ticker}:`, error);
          // Continue with other tickers even if one fails
        }
      }
      
      setSnackbarMessage(`Successfully refreshed AI analysis for all tickers`);
      setShowSnackbar(true);
    } catch (error) {
      console.error('Bulk refresh error:', error);
      setSnackbarMessage(`Refresh completed with some errors`);
      setShowSnackbar(true);
    } finally {
      setIsRefreshingAll(false);
      setIsBulkRefreshing(false);
      setShowAiModal(false); // Close AI modal when refresh completes
    }
  };

  // Clear all AI analyses function
  const clearAllAiAnalyses = async () => {
    try {
      // Clear local state and localStorage
      setAiOutlooks({});
      localStorage.removeItem('aiOutlooks');
      
      // Clear all localStorage AI cache entries
      const keys = Object.keys(localStorage);
      const aiCacheKeys = keys.filter(key => key.startsWith('ai_cache_'));
      aiCacheKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Cleared localStorage cache: ${key}`);
      });
      
      // Clear server cache for all tickers that have been analyzed
      const clearServerCache = async (ticker: string) => {
        try {
          await fetch(`/.netlify/functions/ai-cache?ticker=${ticker}`, {
            method: 'DELETE'
          });
          console.log(`Cleared server cache for ${ticker}`);
        } catch (error) {
          console.warn(`Failed to clear server cache for ${ticker}:`, error);
        }
      };
      
      // Get all tickers from current portfolio and excluded tickers
      const allTickers = new Set<string>();
      
      // Add portfolio holdings
      portfolio.holdings.forEach(holding => allTickers.add(holding.ticker));
      
      // Add excluded tickers from current data
      excludedTickersData.forEach(item => allTickers.add(item.ticker));
      
      // Add all tickers from main data
      data.forEach(item => allTickers.add(item.ticker));
      
      // Add any tickers from aiOutlooks that might not be in current portfolio
      Object.keys(aiOutlooks).forEach(ticker => allTickers.add(ticker));
      
      // Extract tickers from localStorage cache keys
      aiCacheKeys.forEach(key => {
        const ticker = key.replace('ai_cache_', '');
        allTickers.add(ticker);
      });
      
      // Clear server cache for all known tickers
      const clearPromises = Array.from(allTickers).map(clearServerCache);
      await Promise.allSettled(clearPromises);
      
      setPortfolioUpdateTrigger(prev => prev + 1);
      setSnackbarMessage(`✅ All AI analyses cleared (${allTickers.size} tickers) - cache cleared for all users`);
      setShowSnackbar(true);
      
      console.log(`Cleared AI cache for ${allTickers.size} tickers:`, Array.from(allTickers).sort());
      
    } catch (error) {
      console.error('Error clearing AI analyses:', error);
      setSnackbarMessage('⚠️ AI analyses cleared locally, but some server cache may remain');
      setShowSnackbar(true);
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

  const renderTrendIcon = (sentiment: string) => {
    if (sentiment.toLowerCase().includes('bullish')) {
      return <TrendingUp sx={{ color: '#34C759', fontSize: 18 }} />;
    } else if (sentiment.toLowerCase().includes('bearish')) {
      return <TrendingDown sx={{ color: '#FF3B30', fontSize: 18 }} />;
    }
    return <TrendingFlat sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 18 }} />;
  };

  // Portfolio Management Functions
  const addToPortfolio = (ticker: string) => {
    // Check if ticker already exists
    const exists = portfolio.holdings.find(h => h.ticker.toUpperCase() === ticker.toUpperCase());
    if (exists) {
      setSnackbarMessage(`${ticker} is already in your watch list`);
      setShowSnackbar(true);
      return;
    }

    const newHolding: PortfolioHolding = {
      ticker: ticker.toUpperCase(),
      dateAdded: new Date().toISOString().split('T')[0]
    };
    
    setPortfolio(prev => ({
      ...prev,
      holdings: [...prev.holdings, newHolding],
      lastUpdated: new Date().toLocaleString()
    }));
    
    setSnackbarMessage(`Added ${ticker} to watch list`);
    setShowSnackbar(true);
  };

  const removeFromPortfolio = (ticker: string) => {
    setPortfolio(prev => ({
      ...prev,
      holdings: prev.holdings.filter(h => h.ticker !== ticker),
      lastUpdated: new Date().toLocaleString()
    }));
    
    setSnackbarMessage(`Removed ${ticker} from watch list`);
    setShowSnackbar(true);
  };

  const editPortfolioHolding = (ticker: string, newShares: number, newPrice: number, dateAdded: string) => {
    setPortfolio(prev => {
      const updatedHoldings = prev.holdings.map(holding => {
        if (holding.ticker === ticker) {
          return {
            ...holding,
            shares: newShares,
            averagePrice: newPrice,
            dateAdded
          };
        }
        return holding;
      });
      
      const newTotalValue = updatedHoldings.reduce((total, holding) => 
        total + (holding.shares * holding.averagePrice), 0
      );
      
      return {
        ...prev,
        holdings: updatedHoldings,
        totalValue: newTotalValue,
        lastUpdated: new Date().toLocaleString()
      };
    });
    
    setSnackbarMessage(`Updated ${ticker} position`);
    setShowSnackbar(true);
  };


  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading dividend data...
          </Typography>
        </Container>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error">
            Error: {error}
          </Typography>
        </Container>
      </ThemeProvider>
    );
  }

  if (data.length === 0) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h6">
            No data available
          </Typography>
        </Container>
      </ThemeProvider>
    );
  }

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
                      color: '#FFFFFF',
                      letterSpacing: '-0.02em'
                    }}
                  >
                    High Income ETFs - Enhanced Analysis
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    AI-Powered Dividend Capture & Risk Analysis
                  </Typography>
                </Box>
              </Box>
            </Toolbar>
          </AppBar>

          <Container 
            maxWidth="xl" 
            sx={{ 
              py: { xs: 2, sm: 3, md: 4 },
              px: { xs: 1, sm: 2, md: 3 }
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              gap: { xs: 2, sm: 3 }, 
              flexDirection: { xs: 'column', lg: 'row' } 
            }}>
              {/* Main Content */}
              <Box sx={{ flexGrow: 1 }}>

                {/* Main Dashboard Tabs */}
                <Paper 
                  elevation={3}
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
                    onChange={(event, newValue) => setSelectedTab(newValue)}
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
                      label={`Optimal Portfolio`}
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
                      label="Excluded ETFs"
                      icon={<Security />}
                      iconPosition="start"
                      sx={{
                        minHeight: 72,
                        '& .MuiSvgIcon-root': {
                          fontSize: 20
                        }
                      }}
                    />
                    <Tab
                      label={`AI Bullish Excluded (${excludedTickersData.bullishExcluded?.length || 0})`}
                      icon={<TrendingUp />}
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
                    <Tab
                      label="Market Monitor"
                      icon={<Insights />}
                      iconPosition="start"
                      sx={{
                        minHeight: 72,
                        '& .MuiSvgIcon-root': {
                          fontSize: 20
                        }
                      }}
                    />
                  </Tabs>

                  {/* Tab Panels */}
                  {selectedTab === 0 && (
                    <Box sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box>
                          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                            Optimal Portfolio Allocation
                            {polygonLoading && (
                              <Chip
                                label="Loading live data..."
                                size="small"
                                sx={{ ml: 2, backgroundColor: 'rgba(0, 212, 255, 0.2)', color: '#00D4FF' }}
                              />
                            )}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          startIcon={isRefreshingAll ? <CircularProgress size={16} /> : <Refresh />}
                          onClick={() => {
                            const optimalTickers = optimalPortfolioData
                              .filter(item => item.ticker !== 'CASH')
                              .map(item => item.ticker);
                            refreshAiAnalysisForTickers(optimalTickers);
                          }}
                          disabled={isRefreshingAll}
                          sx={{ 
                            color: '#00D4FF',
                            borderColor: '#00D4FF',
                            '&:hover': {
                              borderColor: '#0056CC',
                              backgroundColor: 'rgba(0, 212, 255, 0.1)'
                            },
                            '&:disabled': {
                              borderColor: 'rgba(255, 255, 255, 0.3)',
                              color: 'rgba(255, 255, 255, 0.3)'
                            }
                          }}
                        >
                          {isRefreshingAll ? 'Refreshing...' : 'AI Refresh'}
                        </Button>
                      </Box>
                      
                      <TableContainer component={Paper} sx={{ 
                        background: 'rgba(255, 255, 255, 0.05)',
                        maxWidth: '100%',
                        overflowX: 'auto'
                      }}>
                        <Table size="small" sx={{ 
                          minWidth: 800,
                          '& .MuiTableCell-root': { 
                            padding: '6px 4px',
                            fontSize: '0.8rem'
                          }
                        }}>
                          <TableHead>
                            <TableRow>
                              <TableCell>
                                <Tooltip title="ETF ticker symbol - the abbreviated code used to identify the ETF on stock exchanges">
                                  <TableSortLabel
                                    active={sortField === 'ticker'}
                                    direction={sortField === 'ticker' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('ticker')}
                                  >
                                    ETF
                                  </TableSortLabel>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Tooltip title="Current ETF share price in USD - the market price per share">
                                  <TableSortLabel
                                    active={sortField === 'price'}
                                    direction={sortField === 'price' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('price')}
                                  >
                                    Price
                                  </TableSortLabel>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Tooltip title="Expected next dividend payment - the projected amount per share for the upcoming dividend">
                                  <TableSortLabel
                                    active={sortField === 'medianDiv'}
                                    direction={sortField === 'medianDiv' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('medianDiv')}
                                  >
                                    <Box>Exp<br/>Div</Box>
                                  </TableSortLabel>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Tooltip title="Forward yield - annualized dividend rate as % of current price, calculated from recent dividends">
                                  <TableSortLabel
                                    active={sortField === 'forwardYield'}
                                    direction={sortField === 'forwardYield' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('forwardYield')}
                                  >
                                    <Box>Fwd<br/>Yld</Box>
                                  </TableSortLabel>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Tooltip title="Net Asset Value 12-week performance - how much the ETF's underlying assets have gained/lost in value over 12 weeks">
                                  <TableSortLabel
                                    active={sortField === 'nav'}
                                    direction={sortField === 'nav' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('nav')}
                                  >
                                    <Box>NAV<br/><span style={{ fontSize: '0.7rem', opacity: 0.6 }}>12wk</span></Box>
                                  </TableSortLabel>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Tooltip title="Dividend variation - how much dividends have changed over time. Negative means dividends are declining">
                                  <TableSortLabel
                                    active={sortField === 'divErosion'}
                                    direction={sortField === 'divErosion' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('divErosion')}
                                  >
                                    <Box>Div<br/><span style={{ fontSize: '0.7rem', opacity: 0.6 }}>var</span></Box>
                                  </TableSortLabel>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Tooltip title="12-week expected return - sum of dividend return (12-week) + NAV performance (12-week)">
                                  <TableSortLabel
                                    active={sortField === 'totalReturn'}
                                    direction={sortField === 'totalReturn' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('totalReturn')}
                                  >
                                    <Box>12wk<br/>Ret</Box>
                                  </TableSortLabel>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Tooltip title="14-day volatility - annualized price volatility based on recent 14 days of trading">
                                  <TableSortLabel
                                    active={sortField === 'volatility'}
                                    direction={sortField === 'volatility' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('volatility')}
                                  >
                                    <Box>Vol<br/><span style={{ fontSize: '0.7rem', opacity: 0.6 }}>14d</span></Box>
                                  </TableSortLabel>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Tooltip title="Sharpe ratio - risk-adjusted return calculated as (total return - 2% risk-free rate) / volatility">
                                  <TableSortLabel
                                    active={sortField === 'sharpe'}
                                    direction={sortField === 'sharpe' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('sharpe')}
                                  >
                                    Shrp
                                  </TableSortLabel>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Tooltip title="Modern Portfolio Theory allocation - optimized portfolio weight based on Sharpe ratio, rounded to 5% increments">
                                  <TableSortLabel
                                    active={sortField === 'mptAllocation'}
                                    direction={sortField === 'mptAllocation' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('mptAllocation')}
                                  >
                                    MPT
                                  </TableSortLabel>
                                </Tooltip>
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="AI sentiment evaluation - Claude's analysis of the ETF's outlook based on recent performance and market conditions">
                                  <TableSortLabel
                                    active={sortField === 'aiSentiment'}
                                    direction={sortField === 'aiSentiment' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('aiSentiment')}
                                  >
                                    AI Eval
                                  </TableSortLabel>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {sortedOptimalData.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <a 
                                    href={getYahooFinanceUrl(item.ticker)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: '#00D4FF',
                                      textDecoration: 'none',
                                      fontWeight: 600,
                                      '&:hover': {
                                        textDecoration: 'underline'
                                      }
                                    }}
                                  >
                                    {item.ticker}
                                  </a>
                                </TableCell>
                                <TableCell>
                                  {item.ticker === 'CASH' ? '$1.00' : `$${polygonData[item.ticker]?.price?.toFixed(2) || '-'}`}
                                </TableCell>
                                <TableCell>
                                  {item.ticker === 'CASH' ? 
                                    'N/A' : 
                                    <Box>
                                      <Box>${polygonData[item.ticker]?.medianDividend?.toFixed(2) || '-'}</Box>
                                      {item.exDivDay && (
                                        <Box sx={{ 
                                          fontSize: '0.7rem', 
                                          color: 'rgba(255, 255, 255, 0.6)',
                                          fontWeight: 500,
                                          lineHeight: 1
                                        }}>
                                          {formatDivDay(item.exDivDay)}
                                        </Box>
                                      )}
                                    </Box>
                                  }
                                </TableCell>
                                <TableCell>
                                  {item.ticker === 'CASH' ? '5.00%' : `${polygonData[item.ticker]?.forwardYield?.toFixed(2) || '-'}%`}
                                </TableCell>
                                <TableCell>
                                  {item.ticker === 'CASH' ? '0.0%' : `${polygonData[item.ticker]?.navPerformance?.toFixed(1) || '-'}%`}
                                </TableCell>
                                <TableCell>
                                  {item.ticker === 'CASH' ? '0.0%' : (() => {
                                    const divErosion = polygonData[item.ticker]?.divErosion;
                                    if (divErosion != null) {
                                      const color = divErosion >= 0 ? '#34C759' : '#FF3B30'; // Green for positive, red for negative
                                      return <span style={{ color }}>{divErosion >= 0 ? '+' : ''}{divErosion.toFixed(1)}%</span>;
                                    }
                                    return '-';
                                  })()}
                                </TableCell>
                                <TableCell>
                                  {item.ticker === 'CASH' ? '5.0%' : (() => {
                                    const fwdYield = polygonData[item.ticker]?.forwardYield;
                                    const navPerf = polygonData[item.ticker]?.navPerformance;
                                    const divErosion = polygonData[item.ticker]?.divErosion || 0;
                                    if (fwdYield != null && navPerf != null) {
                                      const dividendReturn12Week = fwdYield * (12/52);
                                      return `${(dividendReturn12Week + navPerf).toFixed(1)}%`;
                                    }
                                    return '-';
                                  })()}
                                </TableCell>
                                <TableCell>
                                  {item.ticker === 'CASH' ? '0.1%' : `${polygonData[item.ticker]?.volatility14Day?.toFixed(1) || '-'}%`}
                                </TableCell>
                                <TableCell>
                                  {item.ticker === 'CASH' ? '2.00' : `${polygonData[item.ticker]?.sharpeRatio?.toFixed(2) || '-'}`}
                                </TableCell>
                                <TableCell>
                                  {item.mptAllocation ? `${item.mptAllocation.toFixed(1)}%` : '-'}
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                                    {item.ticker === 'CASH' ? (
                                      <Box sx={{ 
                                        padding: '8px 12px', 
                                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                        border: '1px solid #4CAF50',
                                        borderRadius: '4px',
                                        color: '#4CAF50',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                      }}>
                                        STABLE
                                      </Box>
                                    ) : (
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => analyzeWithPolygon(item.ticker, false)}
                                        disabled={aiAnalysisLoading === item.ticker || isRefreshingAll}
                                        startIcon={(aiAnalysisLoading === item.ticker || isRefreshingAll) ? <CircularProgress size={16} /> : <SmartToy />}
                                        sx={{
                                          color: '#00D4FF',
                                          borderColor: '#00D4FF',
                                          '&:hover': {
                                            borderColor: '#00A8CC',
                                            backgroundColor: 'rgba(0, 212, 255, 0.1)'
                                          }
                                        }}
                                      >
                                        {(aiAnalysisLoading === item.ticker || isRefreshingAll) ? 'Refreshing...' : 'AI'}
                                      </Button>
                                    )}
                                    {aiOutlooks[item.ticker] && (() => {
                                      const sentiment = extractSentimentRating(aiOutlooks[item.ticker].fullAnalysis);
                                      return (
                                        <Chip
                                          label={sentiment.rating}
                                          size="small"
                                          onClick={() => {
                                            setAiAnalysisResult(aiOutlooks[item.ticker].fullAnalysis);
                                            setShowAiModal(true);
                                          }}
                                          sx={{
                                            backgroundColor: `${sentiment.color}20`, // 20% opacity
                                            color: sentiment.color,
                                            border: `1px solid ${sentiment.color}`,
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            '&:hover': {
                                              backgroundColor: `${sentiment.color}30` // 30% opacity on hover
                                            }
                                          }}
                                        />
                                      );
                                    })()}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {selectedTab === 1 && (() => {
                    // Use the shared excluded tickers data
                    const excludedData = excludedTickersData.all;
                    console.log('Showing Excluded Tickers tab');
                    console.log('excludedData:', excludedData.map(t => t.ticker));
                    
                    return (
                      <Box sx={{ p: 3 }}>
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="h6">
                            Excluded ETFs
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            {excludedTickersData.all?.length || 0} assets excluded from optimal portfolio (requires &gt;5% 12wk return AND positive NAV variance)
                          </Typography>
                        </Box>
                        
                        {excludedData.length === 0 ? (
                          <Card sx={{ 
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            textAlign: 'center',
                            py: 4
                          }}>
                            <CardContent>
                              <Security sx={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
                              <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                                No Excluded ETFs
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                All available ETFs are included in the optimal portfolio
                              </Typography>
                            </CardContent>
                          </Card>
                        ) : (
                          <TableContainer component={Paper} sx={{ 
                            background: 'rgba(255, 255, 255, 0.05)',
                            maxWidth: '100%',
                            overflowX: 'auto'
                          }}>
                            <Table size="small" sx={{ 
                              minWidth: 800,
                              '& .MuiTableCell-root': { 
                                padding: '6px 4px',
                                fontSize: '0.8rem'
                              }
                            }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell rowSpan={2}>
                                    <TableSortLabel
                                      active={sortField === 'ticker'}
                                      direction={sortField === 'ticker' ? sortDirection : 'asc'}
                                      onClick={() => handleSort('ticker')}
                                    >
                                      Ticker
                                    </TableSortLabel>
                                  </TableCell>
                                  <TableCell rowSpan={2}>
                                    <TableSortLabel
                                      active={sortField === 'price'}
                                      direction={sortField === 'price' ? sortDirection : 'asc'}
                                      onClick={() => handleSort('price')}
                                    >
                                      Price
                                    </TableSortLabel>
                                  </TableCell>
                                  <TableCell rowSpan={2}>
                                    <TableSortLabel
                                      active={sortField === 'medianDiv'}
                                      direction={sortField === 'medianDiv' ? sortDirection : 'asc'}
                                      onClick={() => handleSort('medianDiv')}
                                    >
                                      Expected Div
                                    </TableSortLabel>
                                  </TableCell>
                                  <TableCell rowSpan={2}>
                                    <TableSortLabel
                                      active={sortField === 'forwardYield'}
                                      direction={sortField === 'forwardYield' ? sortDirection : 'asc'}
                                      onClick={() => handleSort('forwardYield')}
                                    >
                                      Fwd Yield
                                    </TableSortLabel>
                                  </TableCell>
                                  <TableCell align="center" colSpan={2} sx={{ borderBottom: '1px solid #444', fontSize: '0.9rem', fontWeight: 600 }}>
                                    Variance (Annualized)
                                  </TableCell>
                                  <TableCell rowSpan={2}>
                                    <TableSortLabel
                                      active={sortField === 'totalReturn'}
                                      direction={sortField === 'totalReturn' ? sortDirection : 'asc'}
                                      onClick={() => handleSort('totalReturn')}
                                    >
                                      12wk Ret
                                    </TableSortLabel>
                                  </TableCell>
                                  <TableCell rowSpan={2}>
                                    <TableSortLabel
                                      active={sortField === 'volatility'}
                                      direction={sortField === 'volatility' ? sortDirection : 'asc'}
                                      onClick={() => handleSort('volatility')}
                                    >
                                      Vol <span style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.7 }}>14d</span>
                                    </TableSortLabel>
                                  </TableCell>
                                  <TableCell rowSpan={2}>
                                    <TableSortLabel
                                      active={sortField === 'sharpe'}
                                      direction={sortField === 'sharpe' ? sortDirection : 'asc'}
                                      onClick={() => handleSort('sharpe')}
                                    >
                                      Shrp Ratio
                                    </TableSortLabel>
                                  </TableCell>
                                  <TableCell rowSpan={2} align="center">
                                    <TableSortLabel
                                      active={sortField === 'aiSentiment'}
                                      direction={sortField === 'aiSentiment' ? sortDirection : 'asc'}
                                      onClick={() => handleSort('aiSentiment')}
                                    >
                                      AI Eval Evaluation
                                    </TableSortLabel>
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>
                                    <TableSortLabel
                                      active={sortField === 'nav'}
                                      direction={sortField === 'nav' ? sortDirection : 'asc'}
                                      onClick={() => handleSort('nav')}
                                    >
                                      NAV
                                    </TableSortLabel>
                                  </TableCell>
                                  <TableCell>
                                    <TableSortLabel
                                      active={sortField === 'divErosion'}
                                      direction={sortField === 'divErosion' ? sortDirection : 'asc'}
                                      onClick={() => handleSort('divErosion')}
                                    >
                                      Div
                                    </TableSortLabel>
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {sortedExcludedData.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                  <a 
                                    href={getYahooFinanceUrl(item.ticker)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: '#00D4FF',
                                      textDecoration: 'none',
                                      fontWeight: 600,
                                      '&:hover': {
                                        textDecoration: 'underline'
                                      }
                                    }}
                                  >
                                    {item.ticker}
                                  </a>
                                </TableCell>
                                    <TableCell>${polygonData[item.ticker]?.price?.toFixed(2) || '-'}</TableCell>
                                    <TableCell>
                                      <Box>
                                        <Box>${polygonData[item.ticker]?.medianDividend?.toFixed(2) || '-'}</Box>
                                        {item.exDivDay && (
                                          <Box sx={{ 
                                            fontSize: '0.7rem', 
                                            color: 'rgba(255, 255, 255, 0.6)',
                                            fontWeight: 500,
                                            lineHeight: 1
                                          }}>
                                            {formatDivDay(item.exDivDay)}
                                          </Box>
                                        )}
                                      </Box>
                                    </TableCell>
                                    <TableCell>{polygonData[item.ticker]?.forwardYield?.toFixed(2) || '-'}%</TableCell>
                                    <TableCell>{polygonData[item.ticker]?.navPerformance?.toFixed(1) || '-'}%</TableCell>
                                    <TableCell>
                                      {(() => {
                                        const divErosion = polygonData[item.ticker]?.divErosion;
                                        if (divErosion != null) {
                                          const color = divErosion >= 0 ? '#34C759' : '#FF3B30';
                                          return <span style={{ color }}>{divErosion >= 0 ? '+' : ''}{divErosion.toFixed(1)}%</span>;
                                        }
                                        return '-';
                                      })()}
                                    </TableCell>
                                    <TableCell>
                                      {(() => {
                                        const fwdYield = polygonData[item.ticker]?.forwardYield;
                                        const navPerf = polygonData[item.ticker]?.navPerformance;
                                        const divErosion = polygonData[item.ticker]?.divErosion || 0;
                                        if (fwdYield != null && navPerf != null) {
                                          const dividendReturn12Week = fwdYield * (12/52);
                                          return `${(dividendReturn12Week + navPerf).toFixed(1)}%`;
                                        }
                                        return '-';
                                      })()}
                                    </TableCell>
                                    <TableCell>{polygonData[item.ticker]?.volatility14Day?.toFixed(1) || '-'}%</TableCell>
                                    <TableCell>{polygonData[item.ticker]?.sharpeRatio?.toFixed(2) || '-'}</TableCell>
                                    <TableCell align="center">
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                                        <Button
                                          variant="outlined"
                                          size="small"
                                          onClick={() => analyzeWithPolygon(item.ticker, false)}
                                          disabled={aiAnalysisLoading === item.ticker || isRefreshingAll}
                                          startIcon={(aiAnalysisLoading === item.ticker || isRefreshingAll) ? <CircularProgress size={16} /> : <SmartToy />}
                                          sx={{
                                            color: '#00D4FF',
                                            borderColor: '#00D4FF',
                                            '&:hover': {
                                              borderColor: '#00A8CC',
                                              backgroundColor: 'rgba(0, 212, 255, 0.1)'
                                            }
                                          }}
                                        >
                                          {(aiAnalysisLoading === item.ticker || isRefreshingAll) ? 'Refreshing...' : 'AI'}
                                        </Button>
                                        {aiOutlooks[item.ticker] && (() => {
                                          const sentiment = extractSentimentRating(aiOutlooks[item.ticker].fullAnalysis);
                                          return (
                                            <Chip
                                              label={sentiment.rating}
                                              size="small"
                                              onClick={() => {
                                                setAiAnalysisResult(aiOutlooks[item.ticker].fullAnalysis);
                                                setShowAiModal(true);
                                              }}
                                              sx={{
                                                backgroundColor: `${sentiment.color}20`, // 20% opacity
                                                color: sentiment.color,
                                                border: `1px solid ${sentiment.color}`,
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                '&:hover': {
                                                  backgroundColor: `${sentiment.color}30` // 30% opacity on hover
                                                }
                                              }}
                                            />
                                          );
                                        })()}
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Box>
                    );
                  })()}

                  {selectedTab === 2 && (
                    <Box sx={{ p: 3 }}>
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="h6">
                          AI Bullish Excluded ETFs
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          {excludedTickersData.bullishExcluded?.length || 0} AI-bullish ETFs excluded from optimal portfolio (did not meet &gt;5% return or positive NAV criteria)
                        </Typography>
                      </Box>
                      
                      {sortedBullishExcludedData.length === 0 ? (
                        <Card sx={{
                          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)',
                          border: '1px solid rgba(76, 175, 80, 0.2)',
                          textAlign: 'center',
                          py: 4
                        }}>
                          <CardContent>
                            <TrendingUp sx={{ fontSize: 48, color: 'rgba(76, 175, 80, 0.6)', mb: 2 }} />
                            <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                              No AI Bullish Excluded ETFs
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              All bullish ETFs are either included in the optimal portfolio or excluded for other reasons
                            </Typography>
                          </CardContent>
                        </Card>
                      ) : (
                        <TableContainer component={Paper} sx={{ backgroundColor: '#1e1e1e', mt: 2 }}>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortField === 'ticker'}
                                    direction={sortField === 'ticker' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('ticker')}
                                  >
                                    Ticker
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortField === 'price'}
                                    direction={sortField === 'price' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('price')}
                                  >
                                    Price
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortField === 'forwardYield'}
                                    direction={sortField === 'forwardYield' ? sortDirection : 'desc'}
                                    onClick={() => handleSort('forwardYield')}
                                  >
                                    Yield
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortField === 'navPerformance'}
                                    direction={sortField === 'navPerformance' ? sortDirection : 'desc'}
                                    onClick={() => handleSort('navPerformance')}
                                  >
                                    <Box>NAV<br/><span style={{ fontSize: '0.7rem', opacity: 0.6 }}>perf</span></Box>
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortField === 'divErosion'}
                                    direction={sortField === 'divErosion' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('divErosion')}
                                  >
                                    <Box>Div<br/><span style={{ fontSize: '0.7rem', opacity: 0.6 }}>var</span></Box>
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortField === 'totalReturn'}
                                    direction={sortField === 'totalReturn' ? sortDirection : 'desc'}
                                    onClick={() => handleSort('totalReturn')}
                                  >
                                    <Box>12wk<br/><span style={{ fontSize: '0.7rem', opacity: 0.6 }}>return</span></Box>
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>AI Sentiment</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {sortedBullishExcludedData.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                  <a 
                                    href={getYahooFinanceUrl(item.ticker)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: '#00D4FF',
                                      textDecoration: 'none',
                                      fontWeight: 600,
                                      '&:hover': {
                                        textDecoration: 'underline'
                                      }
                                    }}
                                  >
                                    {item.ticker}
                                  </a>
                                </TableCell>
                                  <TableCell>${polygonData[item.ticker]?.price?.toFixed(2) || '-'}</TableCell>
                                  <TableCell>{polygonData[item.ticker]?.forwardYield?.toFixed(1) || '-'}%</TableCell>
                                  <TableCell>{polygonData[item.ticker]?.navPerformance?.toFixed(1) || '-'}%</TableCell>
                                  <TableCell>
                                    {(() => {
                                      const divErosion = polygonData[item.ticker]?.divErosion;
                                      if (divErosion != null) {
                                        const color = divErosion >= 0 ? '#34C759' : '#FF3B30';
                                        return <span style={{ color }}>{divErosion >= 0 ? '+' : ''}{divErosion.toFixed(1)}%</span>;
                                      }
                                      return '-';
                                    })()}
                                  </TableCell>
                                  <TableCell>
                                    {(() => {
                                      const fwdYield = polygonData[item.ticker]?.forwardYield;
                                      const navPerf = polygonData[item.ticker]?.navPerformance;
                                      const divErosion = polygonData[item.ticker]?.divErosion || 0;
                                      if (fwdYield != null && navPerf != null) {
                                        const dividendReturn12Week = fwdYield * (12/52);
                                        return `${(dividendReturn12Week + navPerf).toFixed(1)}%`;
                                      }
                                      return '-';
                                    })()}
                                  </TableCell>
                                  <TableCell>
                                    <Box>
                                      {aiOutlooks[item.ticker] && (() => {
                                        const rating = extractSentimentRating(aiOutlooks[item.ticker].fullAnalysis);
                                        return (
                                          <Chip
                                            label={rating.rating}
                                            size="small"
                                            sx={{
                                              backgroundColor: rating.color,
                                              color: '#000',
                                              fontWeight: 'bold',
                                              fontSize: '0.7rem'
                                            }}
                                          />
                                        );
                                      })()}
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Box>
                  )}

                  {selectedTab === 3 && (
                    <Box sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6">
                          My Portfolio ({portfolio.holdings.length} positions)
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Button
                            variant="outlined"
                            startIcon={isRefreshingAll ? <CircularProgress size={16} /> : <Refresh />}
                            onClick={refreshAllAiAnalyses}
                            disabled={isRefreshingAll || portfolio.holdings.length === 0}
                            sx={{ 
                              color: '#00D4FF',
                              borderColor: '#00D4FF',
                              '&:hover': {
                                borderColor: '#0056CC',
                                backgroundColor: 'rgba(0, 212, 255, 0.1)'
                              },
                              '&:disabled': {
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                                color: 'rgba(255, 255, 255, 0.3)'
                              }
                            }}
                          >
                            {isRefreshingAll ? 'Refreshing...' : 'AI Refresh'}
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<Clear />}
                            onClick={clearAllAiAnalyses}
                            disabled={Object.keys(aiOutlooks).length === 0}
                            sx={{ 
                              color: '#FF9500',
                              borderColor: '#FF9500',
                              '&:hover': {
                                borderColor: '#FF7A00',
                                backgroundColor: 'rgba(255, 149, 0, 0.1)'
                              },
                              '&:disabled': {
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                                color: 'rgba(255, 255, 255, 0.3)'
                              }
                            }}
                          >
                            Clear AI
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setShowAddDialog(true)}
                            sx={{ 
                              background: 'linear-gradient(135deg, #00D4FF 0%, #6C63FF 100%)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #0056CC 0%, #5A52D0 100%)',
                              }
                            }}
                          >
                            Add Position
                          </Button>
                        </Box>
                      </Box>

                      {portfolio.holdings.length === 0 ? (
                        <Card sx={{ 
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          textAlign: 'center',
                          py: 4
                        }}>
                          <CardContent>
                            <BusinessCenter sx={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
                            <Typography variant="h6" sx={{ mb: 1 }}>
                              No positions yet
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                              Start building your portfolio by adding your first position
                            </Typography>
                            <Button
                              variant="outlined"
                              startIcon={<Add />}
                              onClick={() => setShowAddDialog(true)}
                              sx={{ 
                                borderColor: '#00D4FF',
                                color: '#00D4FF',
                                '&:hover': {
                                  borderColor: '#0056CC',
                                  backgroundColor: 'rgba(0, 212, 255, 0.1)'
                                }
                              }}
                            >
                              Add Your First Position
                            </Button>
                          </CardContent>
                        </Card>
                      ) : (
                        <TableContainer component={Paper} sx={{ 
                          background: 'rgba(255, 255, 255, 0.05)',
                          maxWidth: '100%',
                          overflowX: 'auto'
                        }}>
                          <Table size="small" sx={{ 
                            minWidth: 800,
                            '& .MuiTableCell-root': { 
                              padding: '6px 4px',
                              fontSize: '0.8rem'
                            }
                          }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortField === 'ticker'}
                                    direction={sortField === 'ticker' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('ticker')}
                                  >
                                    Ticker
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortField === 'price'}
                                    direction={sortField === 'price' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('price')}
                                  >
                                    Price
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortField === 'medianDiv'}
                                    direction={sortField === 'medianDiv' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('medianDiv')}
                                  >
                                    Expected Div
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortField === 'forwardYield'}
                                    direction={sortField === 'forwardYield' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('forwardYield')}
                                  >
                                    Fwd Yield
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortField === 'nav'}
                                    direction={sortField === 'nav' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('nav')}
                                  >
                                    NAV
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortField === 'totalReturn'}
                                    direction={sortField === 'totalReturn' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('totalReturn')}
                                  >
                                    12wk Ret
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortField === 'volatility'}
                                    direction={sortField === 'volatility' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('volatility')}
                                  >
                                    Vol <span style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.7 }}>14d</span>
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortField === 'sharpe'}
                                    direction={sortField === 'sharpe' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('sharpe')}
                                  >
                                    Shrp Ratio
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell align="center">
                                  <TableSortLabel
                                    active={sortField === 'aiSentiment'}
                                    direction={sortField === 'aiSentiment' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('aiSentiment')}
                                  >
                                    AI Eval Evaluation
                                  </TableSortLabel>
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {sortedPortfolioData.map((holding, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <MonetizationOn sx={{ color: '#00D4FF', fontSize: 20 }} />
                                      <a 
                                        href={getYahooFinanceUrl(holding.ticker)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: '#00D4FF',
                                          textDecoration: 'none',
                                          fontWeight: 600
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                      >
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                          {holding.ticker}
                                        </Typography>
                                      </a>
                                    </Box>
                                  </TableCell>
                                  <TableCell>${polygonData[holding.ticker]?.price?.toFixed(2) || '-'}</TableCell>
                                  <TableCell>
                                    <Box>
                                      <Box>${polygonData[holding.ticker]?.medianDividend?.toFixed(2) || '-'}</Box>
                                      {data.find(d => d.ticker === holding.ticker)?.exDivDay && (
                                        <Box sx={{ 
                                          fontSize: '0.7rem', 
                                          color: 'rgba(255, 255, 255, 0.6)',
                                          fontWeight: 500,
                                          lineHeight: 1
                                        }}>
                                          {formatDivDay(data.find(d => d.ticker === holding.ticker)?.exDivDay || '')}
                                        </Box>
                                      )}
                                    </Box>
                                  </TableCell>
                                  <TableCell>{polygonData[holding.ticker]?.forwardYield?.toFixed(2) || '-'}%</TableCell>
                                  <TableCell>{polygonData[holding.ticker]?.navPerformance?.toFixed(1) || '-'}%</TableCell>
                                  <TableCell>
                                    {(() => {
                                      const fwdYield = polygonData[holding.ticker]?.forwardYield;
                                      const navPerf = polygonData[holding.ticker]?.navPerformance;
                                      if (fwdYield != null && navPerf != null) {
                                        return `${(fwdYield + navPerf).toFixed(1)}%`;
                                      }
                                      return '-';
                                    })()}
                                  </TableCell>
                                  <TableCell>{polygonData[holding.ticker]?.volatility14Day?.toFixed(1) || '-'}%</TableCell>
                                  <TableCell>{polygonData[holding.ticker]?.sharpeRatio?.toFixed(2) || '-'}</TableCell>
                                  <TableCell align="center">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => analyzeWithPolygon(holding.ticker, false)}
                                        disabled={aiAnalysisLoading === holding.ticker || isRefreshingAll}
                                        startIcon={(aiAnalysisLoading === holding.ticker || isRefreshingAll) ? <CircularProgress size={16} /> : <SmartToy />}
                                        sx={{
                                          color: '#00D4FF',
                                          borderColor: '#00D4FF',
                                          '&:hover': {
                                            borderColor: '#00A8CC',
                                            backgroundColor: 'rgba(0, 212, 255, 0.1)'
                                          }
                                        }}
                                      >
                                        {(aiAnalysisLoading === holding.ticker || isRefreshingAll) ? 'Refreshing...' : 'AI'}
                                      </Button>
                                      {aiOutlooks[holding.ticker] && (() => {
                                        const sentiment = extractSentimentRating(aiOutlooks[holding.ticker].fullAnalysis);
                                        return (
                                          <Chip
                                            label={sentiment.rating}
                                            size="small"
                                            onClick={() => {
                                              setAiAnalysisResult(aiOutlooks[holding.ticker].fullAnalysis);
                                              setShowAiModal(true);
                                            }}
                                            sx={{
                                              backgroundColor: `${sentiment.color}20`, // 20% opacity
                                              color: sentiment.color,
                                              border: `1px solid ${sentiment.color}`,
                                              cursor: 'pointer',
                                              fontWeight: 600,
                                              '&:hover': {
                                                backgroundColor: `${sentiment.color}30` // 30% opacity on hover
                                              }
                                            }}
                                          />
                                        );
                                      })()}
                                      <IconButton 
                                        size="small" 
                                        onClick={() => removeFromPortfolio(holding.ticker)}
                                        sx={{ color: '#FF3B30', ml: 1 }}
                                      >
                                        <Delete />
                                      </IconButton>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}

                    </Box>
                  )}

                  {selectedTab === 4 && (
                    <Box sx={{ p: 3 }}>
                      <MarketMonitor />
                    </Box>
                  )}

                </Paper>
              </Box>
            </Box>

            {/* Financial Disclaimer - Static Footer */}
            <Box sx={{
              mt: 4,
              p: 3,
              background: 'rgba(255, 149, 0, 0.05)',
              borderTop: '1px solid rgba(255, 149, 0, 0.2)',
              textAlign: 'center'
            }}>
              <Typography variant="caption" sx={{
                fontSize: '0.75rem',
                color: 'rgba(255, 149, 0, 0.9)',
                fontWeight: 600,
                display: 'block',
                mb: 1
              }}>
                ⚠️ IMPORTANT DISCLAIMER
              </Typography>
              <Typography variant="caption" sx={{
                fontSize: '0.7rem',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: 1.4,
                display: 'block'
              }}>
                This information is not financial advice and is for entertainment purposes only. 
                Past performance does not guarantee future results. 
                Always consult a qualified financial advisor before making investment decisions.
              </Typography>
            </Box>
          </Container>
        </motion.div>
      </Box>

      {/* Add Position Dialog */}
      <Dialog 
        open={showAddDialog} 
        onClose={() => {
          setShowAddDialog(false);
          setNewTicker('');
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }
        }}
      >
        <DialogTitle>
          Add Ticker to Watch List
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="ETF Symbol"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              fullWidth
              disabled={false}
              placeholder="e.g., AAPL, MSFT, SPY"
              helperText="Add a ticker to your watch list for AI analysis"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => {
              setShowAddDialog(false);
              setNewTicker('');
            }}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              if (newTicker.trim()) {
                // Add new ticker to watch list
                addToPortfolio(newTicker.trim());
                
                setShowAddDialog(false);
                setNewTicker('');
              } else {
                setSnackbarMessage('Please enter a ticker symbol');
                setShowSnackbar(true);
              }
            }}
            variant="contained"
            sx={{ 
              background: 'linear-gradient(135deg, #00D4FF 0%, #6C63FF 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0056CC 0%, #5A52D0 100%)',
              }
            }}
            disabled={!newTicker}
          >
Add Position
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
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <SmartToy sx={{ color: '#00D4FF' }} />
          AI Market Analysis
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {aiAnalysisResult ? (
            <Box sx={{ 
              fontFamily: 'monospace', 
              fontSize: '0.9rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              color: 'rgba(255, 255, 255, 0.9)',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              padding: 2,
              borderRadius: 1,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              maxHeight: '60vh',
              overflow: 'auto'
            }}>
              {aiAnalysisResult}
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No analysis available
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', p: 2, gap: 1 }}>
          <Button
            onClick={handleCopyAiAnalysis}
            variant="contained"
            startIcon={<ContentCopy />}
            disabled={!aiAnalysisResult}
            sx={{
              background: 'linear-gradient(135deg, #00D4FF 0%, #00A8CC 100%)',
              color: '#000000',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #00A8CC 0%, #008BA3 100%)',
              },
              '&:disabled': {
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            Copy
          </Button>
          <Button
            onClick={() => setShowAiModal(false)}
            variant="outlined"
            sx={{
              color: '#00D4FF',
              borderColor: '#00D4FF',
              '&:hover': {
                borderColor: '#00A8CC',
                backgroundColor: 'rgba(0, 212, 255, 0.1)'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Authentication Dialog */}
      <Dialog 
        open={showAuthDialog} 
        onClose={() => setShowAuthDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 149, 0, 0.3)',
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(255, 149, 0, 0.2)',
          color: 'rgba(255, 149, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          🔒 AI Authentication Required
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255, 255, 255, 0.8)' }}>
            AI analysis features require authentication to manage API costs. Please enter the password to continue.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Password"
            type="password"
            variant="outlined"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAuthSubmit();
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(255, 149, 0, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 149, 0, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgba(255, 149, 0, 0.7)',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 149, 0, 0.7)',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255, 149, 0, 0.2)', p: 2, gap: 1 }}>
          <Button 
            onClick={() => {
              setShowAuthDialog(false);
              setAuthPassword('');
            }}
            variant="outlined"
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAuthSubmit}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #FF9500 0%, #FFB74D 100%)',
              color: '#000000',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #E6840E 0%, #FFA726 100%)',
              }
            }}
          >
            Authenticate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSnackbar(false)}
        message={snackbarMessage}
        sx={{
          '& .MuiSnackbarContent-root': {
            backgroundColor: 'rgba(0, 212, 255, 0.9)',
            color: '#000000'
          }
        }}
      />

      {/* Cookie Banner */}
      {showCookieBanner && (
        <Box sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          p: 2,
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="body2" sx={{ 
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.875rem',
              mb: 0.5
            }}>
              🍪 We use cookies for analytics and to improve your experience
            </Typography>
            <Typography variant="caption" sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.75rem'
            }}>
              By continuing to use this site, you consent to our use of cookies.
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={handleAcceptCookies}
            sx={{
              background: 'linear-gradient(135deg, #00D4FF 0%, #6C63FF 100%)',
              color: '#000000',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #00A8CC 0%, #5A52D5 100%)',
              }
            }}
          >
            Accept
          </Button>
        </Box>
      )}
    </ThemeProvider>
  );
}
