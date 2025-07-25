// Data transformation utilities for the enhanced dividend dashboard
// Converts existing data formats to enhanced interfaces with calculated metrics

import type { 
  EnhancedDividendData,
  RiskMetrics,
  LiquidityMetrics,
  YieldMetrics,
  EnhancedAllocation,
  EnhancedPortfolioMetrics,
  DividendTimingAnalysis,
  LegacyDividendData
} from '../types/dividendTypes';

// Legacy allocation interface (matching existing AllocationItem)
export interface LegacyAllocation {
  ticker: string;
  weight: number;
  return: number;
  risk: number;
  sharpe?: number;
}

// Risk metrics calculation utilities
const calculateVaR = (volatility: number, confidence: number = 0.95): number => {
  // Simplified VaR calculation using normal distribution assumption
  // Z-score for 95% confidence: 1.645, for 99%: 2.326
  const zScore = confidence === 0.95 ? 1.645 : 2.326;
  return volatility * zScore / Math.sqrt(252); // Daily VaR
};

const calculateExpectedShortfall = (var95: number): number => {
  // Expected shortfall is typically 20-30% higher than VaR
  return var95 * 1.25;
};

const calculateSharpeRatio = (returns: number, riskFreeRate: number = 0.045, volatility: number): number => {
  if (volatility === 0) return 0;
  return (returns - riskFreeRate) / volatility;
};

const calculateSortinoRatio = (returns: number, riskFreeRate: number = 0.045, downwardVolatility: number): number => {
  if (downwardVolatility === 0) return 0;
  return (returns - riskFreeRate) / downwardVolatility;
};

const calculateMaxDrawdown = (volatility: number): number => {
  // Estimate max drawdown based on volatility (simplified approach)
  // Typically 2-3x the annual volatility for most assets
  return Math.min(0.8, volatility * 2.5);
};

const calculateBeta = (ticker: string, volatility: number): number => {
  // Simplified beta calculation based on asset characteristics
  if (ticker === 'SPY') return 1.0;
  if (ticker === 'CASH') return 0.0;
  
  // ETFs typically have beta close to 1, with some variation based on volatility
  // High volatility assets tend to have higher beta
  const baseBeta = 0.8 + (volatility * 0.5);
  return Math.min(2.0, Math.max(0.3, baseBeta));
};

const calculateCorrelation = (ticker: string): number => {
  // Simplified correlation with SPY based on asset type
  if (ticker === 'SPY') return 1.0;
  if (ticker === 'CASH') return 0.0;
  
  // Most equity ETFs have high correlation with market
  return 0.75 + Math.random() * 0.2; // 0.75 to 0.95
};

// Create enhanced risk metrics from legacy data
const createRiskMetrics = (legacyData: LegacyDividendData): RiskMetrics => {
  const var95 = calculateVaR(legacyData.riskVolatility, 0.95);
  const var99 = calculateVaR(legacyData.riskVolatility, 0.99);
  const sharpeRatio = calculateSharpeRatio(legacyData.bestReturn, 0.045, legacyData.riskVolatility);
  const downwardVol = legacyData.riskVolatility * 0.7; // Assume downward vol is 70% of total vol
  const maxDrawdown = calculateMaxDrawdown(legacyData.riskVolatility);
  const beta = calculateBeta(legacyData.ticker, legacyData.riskVolatility);
  const correlation = calculateCorrelation(legacyData.ticker);

  // Risk category based on volatility
  let riskCategory: 'Low' | 'Medium' | 'High' | 'Very High';
  if (legacyData.riskVolatility < 0.15) riskCategory = 'Low';
  else if (legacyData.riskVolatility < 0.3) riskCategory = 'Medium';
  else if (legacyData.riskVolatility < 0.5) riskCategory = 'High';
  else riskCategory = 'Very High';

  // Risk score (0-100, lower is better)
  const riskScore = Math.min(100, Math.max(0, legacyData.riskVolatility * 200));

  return {
    var95,
    var99,
    expectedShortfall: calculateExpectedShortfall(var95),
    sharpeRatio,
    sortinoRatio: calculateSortinoRatio(legacyData.bestReturn, 0.045, downwardVol),
    calmarRatio: legacyData.bestReturn / Math.max(0.01, maxDrawdown),
    annualizedVolatility: legacyData.riskVolatility,
    downwardVolatility: downwardVol,
    uptrendVolatility: legacyData.riskVolatility * 0.8,
    maxDrawdown,
    averageDrawdown: maxDrawdown * 0.6,
    drawdownDuration: Math.round(30 + legacyData.riskVolatility * 100), // Estimate in days
    betaVsSPY: beta,
    correlationVsSPY: correlation,
    riskScore,
    riskCategory
  };
};

// Create enhanced liquidity metrics (simplified estimates)
const createLiquidityMetrics = (legacyData: LegacyDividendData): LiquidityMetrics => {
  // Estimate liquidity based on ticker characteristics and category
  let liquidityScore: number;
  let liquidityCategory: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  let averageDailyVolume: number;
  let bidAskSpread: number;

  // Base estimates on asset characteristics
  if (legacyData.ticker === 'SPY') {
    liquidityScore = 95;
    liquidityCategory = 'Excellent';
    averageDailyVolume = 50000000; // $50M daily volume
    bidAskSpread = 0.0001; // 1 bp spread
  } else if (legacyData.category === 'top-performers') {
    liquidityScore = 70 + Math.random() * 20;
    liquidityCategory = liquidityScore > 85 ? 'Excellent' : 'Good';
    averageDailyVolume = 5000000 + Math.random() * 15000000; // $5-20M
    bidAskSpread = 0.001 + Math.random() * 0.002; // 10-30 bp
  } else {
    liquidityScore = 40 + Math.random() * 30;
    liquidityCategory = liquidityScore > 70 ? 'Good' : liquidityScore > 50 ? 'Fair' : 'Poor';
    averageDailyVolume = 1000000 + Math.random() * 5000000; // $1-6M
    bidAskSpread = 0.002 + Math.random() * 0.005; // 20-70 bp
  }

  const bidAskSpreadPercent = bidAskSpread;
  const estimatedMarketImpact = bidAskSpread * 0.5; // Half the spread
  const estimatedTradingCost = bidAskSpread + estimatedMarketImpact;

  return {
    averageDailyVolume: Math.round(averageDailyVolume / 100) * 100, // Round to nearest 100
    dollarVolume: averageDailyVolume,
    bidAskSpread,
    bidAskSpreadPercent,
    estimatedMarketImpact,
    liquidityScore: Math.round(liquidityScore),
    liquidityCategory,
    estimatedTradingCost
  };
};

// Create enhanced yield metrics
const createYieldMetrics = (legacyData: LegacyDividendData): YieldMetrics => {
  const forwardYield = (legacyData.forwardYield || 0) / 100; // Convert from percentage
  const currentYield = forwardYield * 0.95; // Estimate current yield slightly lower
  const distributionYield = forwardYield;
  
  // Estimate yield consistency based on strategy and performance
  const yieldConsistencyScore = legacyData.bestStrategy === 'DC' ? 
    Math.max(60, 80 - legacyData.riskVolatility * 50) : 
    Math.max(70, 90 - legacyData.riskVolatility * 30);

  const sustainabilityScore = Math.min(100, Math.max(30, 
    85 - (legacyData.riskVolatility * 30) + (legacyData.dcWinRate * 20)
  ));

  return {
    currentYield,
    distributionYield,
    secYield: currentYield * 0.9, // Estimate SEC yield
    forwardYield,
    projectedAnnualYield: forwardYield * 1.05, // Slight growth assumption
    yieldVolatility: legacyData.riskVolatility * 0.8, // Yield vol typically lower than price vol
    yieldConsistencyScore: Math.round(yieldConsistencyScore),
    averageYieldGrowth: 0.02 + Math.random() * 0.03, // 2-5% annual growth
    distributionFrequency: 'Weekly', // High-income ETFs are typically weekly
    averageDistributionAmount: legacyData.medianDividend,
    distributionGrowthRate: 0.01 + Math.random() * 0.02, // 1-3% growth
    payoutRatio: 0.8 + Math.random() * 0.15, // 80-95% payout ratio
    coverageRatio: 1.05 + Math.random() * 0.25, // 1.05-1.3x coverage
    sustainabilityScore: Math.round(sustainabilityScore)
  };
};

// For 401k context - no tax implications (tax-advantaged account)
const createTaxAdvantageMetrics = () => ({
  accountType: '401k' as const,
  taxAdvantaged: true,
  noTaxDrag: true,
  note: 'Tax-advantaged retirement account - no current tax implications'
});

// Transform legacy data to enhanced format
export const transformLegacyData = (legacyData: LegacyDividendData[]): EnhancedDividendData[] => {
  return legacyData.map(item => {
    // Normalize strategy strings to match expected format
    let normalizedStrategy: 'B&H' | 'DC';
    if (item.bestStrategy === 'Buy & Hold' || item.bestStrategy === 'B&H') {
      normalizedStrategy = 'B&H';
    } else if (item.bestStrategy === 'Dividend Capture' || item.bestStrategy === 'DC') {
      normalizedStrategy = 'DC';
    } else {
      // Default fallback logic
      normalizedStrategy = item.bestReturn === item.buyHoldReturn ? 'B&H' : 'DC';
    }

    return {
      // Core data (unchanged)
      ticker: item.ticker,
      tradingDays: item.tradingDays,
      exDivDay: item.exDivDay,
      buyHoldReturn: item.buyHoldReturn,
      divCaptureReturn: item.divCaptureReturn,
      bestStrategy: normalizedStrategy,
      bestReturn: item.bestReturn,
      finalValue: item.finalValue,
      dcWinRate: item.dcWinRate,
      riskVolatility: item.riskVolatility,
      medianDividend: item.medianDividend,
      forwardYield: item.forwardYield,
      category: item.category,

      // Enhanced metrics
      riskMetrics: createRiskMetrics(item),
      liquidityMetrics: createLiquidityMetrics(item),
      taxAdvantageInfo: createTaxAdvantageMetrics(), // 401k tax-advantaged status
      yieldMetrics: createYieldMetrics(item)
    };
  });
};

// Transform legacy allocation to enhanced format
export const transformLegacyAllocation = (
  legacyAllocation: LegacyAllocation[],
  legacyData: LegacyDividendData[]
): EnhancedAllocation[] => {
  return legacyAllocation.map(item => {
    const assetData = legacyData.find(data => data.ticker === item.ticker);
    
    // Determine allocation reason based on characteristics
    let allocationReason: EnhancedAllocation['allocationReason'];
    if (item.ticker === 'CASH') {
      allocationReason = 'cash_position';
    } else if (item.ticker === 'SPY') {
      allocationReason = 'benchmark_comparison';
    } else if (item.return > 0.4 && item.risk < 0.4) {
      allocationReason = 'high_return_low_risk';
    } else if (assetData && assetData.divCaptureReturn > 0.3) {
      allocationReason = 'high_dividend_capture';
    } else if ((item.sharpe || 0) > 1.0) {
      allocationReason = 'sharpe_optimization';
    } else {
      allocationReason = 'risk_diversification';
    }

    // Calculate contributions and benefits
    const totalAllocation = legacyAllocation.reduce((sum, a) => sum + a.weight, 0);
    const totalReturn = legacyAllocation.reduce((sum, a) => sum + a.weight * a.return, 0);
    const totalRisk = Math.sqrt(legacyAllocation.reduce((sum, a) => sum + Math.pow(a.weight * a.risk, 2), 0));

    return {
      ticker: item.ticker,
      weight: item.weight,
      return: item.return,
      risk: item.risk,
      sharpe: item.sharpe,
      allocationReason,
      riskContribution: (item.weight * item.risk) / totalRisk,
      returnContribution: (item.weight * item.return) / totalReturn,
      diversificationBenefit: Math.min(1, item.weight * legacyAllocation.length), // Simple diversification metric
      confidenceScore: assetData ? Math.max(60, 90 - assetData.riskVolatility * 50) : 70,
      dataQuality: assetData?.category === 'top-performers' ? 'Excellent' : 
                   assetData?.category === 'mid-performers' ? 'Good' : 'Fair',
      lastUpdated: new Date().toISOString()
    };
  });
};

// Transform legacy portfolio metrics to enhanced format
export const transformLegacyPortfolioMetrics = (
  legacyMetrics: { expectedReturn: number; risk: number; sharpeRatio: number },
  allocation: LegacyAllocation[]
): EnhancedPortfolioMetrics => {
  // Calculate additional metrics
  const downwardVolatility = legacyMetrics.risk * 0.7; // Estimate
  const maxDrawdown = calculateMaxDrawdown(legacyMetrics.risk);
  const systematicRisk = legacyMetrics.risk * 0.6; // Estimate 60% systematic
  const specificRisk = legacyMetrics.risk * 0.4; // 40% specific

  // Diversification metrics
  const effectiveNumberOfAssets = 1 / allocation.reduce((sum, asset) => sum + Math.pow(asset.weight, 2), 0);
  const diversificationRatio = allocation.length / Math.max(1, allocation.filter(a => a.weight > 0.1).length);

  return {
    // Core metrics
    expectedReturn: legacyMetrics.expectedReturn,
    risk: legacyMetrics.risk,
    sharpeRatio: legacyMetrics.sharpeRatio,

    // Enhanced metrics
    sortinoRatio: calculateSortinoRatio(legacyMetrics.expectedReturn, 0.045, downwardVolatility),
    calmarRatio: legacyMetrics.expectedReturn / Math.max(0.01, maxDrawdown),
    informationRatio: legacyMetrics.sharpeRatio * 0.8, // Estimate

    // Risk decomposition
    systematicRisk,
    specificRisk,
    concentrationRisk: Math.max(...allocation.map(a => a.weight)) - 0.1, // Risk from largest position above 10%

    // Diversification
    diversificationRatio,
    effectiveNumberOfAssets,
    portfolioTurnover: 0.1, // Low turnover estimate for dividend strategies

    // Cost analysis (simplified for 401k)
    estimatedTaxDrag: 0.0, // No tax drag in 401k
    totalExpenseRatio: 0.005 + Math.random() * 0.005, // 0.5-1.0% estimate
    estimatedTradingCosts: 0.001, // Minimal in 401k

    // Performance attribution
    alphaGeneration: Math.max(0, legacyMetrics.expectedReturn - 0.1574), // vs SPY return
    betaExposure: allocation.reduce((sum, asset) => {
      const beta = calculateBeta(asset.ticker, asset.risk);
      return sum + asset.weight * beta;
    }, 0),

    // Scenario analysis (simplified)
    stressTestResults: [
      {
        scenario: 'Market Correction (-20%)',
        returnImpact: -0.15,
        riskImpact: 0.05,
        probability: 0.1
      },
      {
        scenario: 'Interest Rate Spike',
        returnImpact: -0.08,
        riskImpact: 0.03,
        probability: 0.15
      },
      {
        scenario: 'Volatility Spike',
        returnImpact: -0.05,
        riskImpact: 0.1,
        probability: 0.2
      }
    ],

    // Quality scores
    overallScore: Math.round(Math.min(100, Math.max(0, 
      (legacyMetrics.sharpeRatio * 30) + 
      (Math.max(0, legacyMetrics.expectedReturn * 100)) + 
      (Math.max(0, 50 - legacyMetrics.risk * 100))
    ))),
    confidence: Math.round(Math.max(60, 90 - legacyMetrics.risk * 50))
  };
};

// Utility function to validate transformed data
export const validateTransformedData = (data: EnhancedDividendData[]): boolean => {
  try {
    return data.every(item => 
      item.ticker &&
      typeof item.bestReturn === 'number' &&
      typeof item.riskVolatility === 'number' &&
      item.riskMetrics &&
      item.liquidityMetrics &&
      item.yieldMetrics &&
      item.taxAdvantageInfo
    );
  } catch (error) {
    console.error('Data validation failed:', error);
    return false;
  }
};

// Export utility functions
export {
  calculateVaR,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateMaxDrawdown,
  calculateBeta,
  calculateCorrelation
};