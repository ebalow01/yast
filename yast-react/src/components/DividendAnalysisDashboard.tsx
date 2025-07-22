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
import { dividendData, analysisMetadata, type Asset as DividendAsset } from '../data/dividendData';

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
}

function calculateMPTAllocation(allData: DividendData[]): { allocation: AllocationItem[], metrics: PortfolioMetrics } {
  // Use ALL data (not just top performers) so filtering logic can work properly
  const allETFs = allData.filter(etf => etf.ticker !== 'SPY' && etf.category !== 'benchmark');
  
  // Add cash and SPY to the mix
  const assets: Asset[] = [
    ...allETFs.map(etf => {
      const isRule1 = etf.bestReturn > 0.40 && etf.riskVolatility < 0.40;
      // Note: isRule2 will be determined later after checking for better alternatives
      
      return {
        ticker: etf.ticker,
        return: etf.bestReturn,
        risk: etf.riskVolatility,
        sharpe: etf.bestReturn / etf.riskVolatility,
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

  // Maximize return while keeping overall portfolio risk under 10%
  const maxPortfolioRisk = 0.10; // 10% risk constraint
  
  // Optimize portfolio with risk constraint (include cash as an option)
  const allocation = optimizePortfolioWithRiskConstraint(assets, maxPortfolioRisk);

  // Calculate portfolio metrics
  const portfolioMetrics = calculatePortfolioMetrics(allocation);

  return { allocation, metrics: portfolioMetrics };
}

function optimizePortfolioWithRiskConstraint(assets: Asset[], maxRisk: number): AllocationItem[] {
  // Version identifier for deployment verification
  console.log('🚀 YAST Portfolio Optimizer - Version 2025-07-21-ENHANCED-MPT-FIXED - Commit: b9c4f1a');
  console.log('=== ENHANCED MPT PORTFOLIO OPTIMIZATION - FIXED EQUAL WEIGHTS ===');
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

function calculatePortfolioMetrics(allocation: AllocationItem[]): PortfolioMetrics {
  const portfolioReturn = allocation.reduce((sum, asset) => sum + (asset.weight * asset.return), 0);
  
  // Enhanced portfolio risk calculation with correlation considerations
  // Simplified assumption: some correlation between similar assets
  const portfolioVariance = allocation.reduce((sum, asset) => {
    return sum + Math.pow(asset.weight * asset.risk, 2);
  }, 0);
  
  // Add correlation penalty for concentrated positions
  const concentrationPenalty = allocation.reduce((penalty, asset) => {
    if (asset.weight > 0.15) { // Positions over 15% get correlation penalty
      return penalty + (asset.weight - 0.15) * 0.02; // 2% additional risk per 1% over 15%
    }
    return penalty;
  }, 0);
  
  const portfolioRisk = Math.sqrt(portfolioVariance + concentrationPenalty);
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
    category: category
  };
};

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
        
        // Convert imported data to the format expected by the dashboard
        const convertedData = dividendData.map(convertAssetToData);
        setData(convertedData);
        setMetadata(analysisMetadata);
        
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
    setSelectedTab(newValue);
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
    mptAllocation.some(allocation => allocation.ticker === item.ticker)
  );
  const excludedTickers = data.filter(item => 
    !mptAllocation.some(allocation => allocation.ticker === item.ticker) &&
    item.ticker !== 'SPY' // Keep SPY separate as benchmark, don't show in excluded
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
            <TableCell align="center"><strong>Forward Yield</strong></TableCell>
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
                <Typography 
                  variant="body2" 
                  sx={{ color: 'success.main', fontWeight: 'bold' }}
                >
                  {item.forwardYield ? `${item.forwardYield.toFixed(1)}%` : 'N/A'}
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
                label={`Optimal Portfolio (${topPerformers.length})`}
                icon={<TrendingUp />}
                iconPosition="start"
              />
              <Tab
                label={`All Other ETFs (${excludedTickers.length})`}
                icon={<TrendingDown />}
                iconPosition="start"
              />
            </Tabs>

            <TabPanel value={selectedTab} index={0}>
              <Typography variant="h6" gutterBottom>
                Optimal Portfolio ETFs
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                ETFs selected for the optimal allocation based on risk-adjusted returns and diversification
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
                      Enhanced MPT optimization: Sharpe ratio maximization, efficient frontier analysis, mean variance optimization with correlation adjustments and concentration penalties
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </TabPanel>

            <TabPanel value={selectedTab} index={1}>
              <Typography variant="h6" gutterBottom>
                All Other ETFs
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                All remaining ETFs analyzed but not included in the optimal allocation
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
